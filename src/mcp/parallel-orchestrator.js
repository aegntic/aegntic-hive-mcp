/**
 * Parallel MCP Orchestrator with Batchtools Optimization
 * Manages parallel MCP operations with intelligent batching and performance optimization
 */

const EventEmitter = require('events');

class ParallelMCPOrchestrator extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      maxConcurrentOperations: config.maxConcurrentOperations || 10,
      batchSize: config.batchSize || 5,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 30000,
      operationTimeout: config.operationTimeout || 30000,
      enableMetrics: config.enableMetrics !== false,
      ...config
    };
    
    // Internal state
    this.activeOperations = new Map();
    this.operationQueue = [];
    this.circuitBreakers = new Map();
    this.metrics = {
      totalOperations: 0,
      successfulOperations: 0,
      failedOperations: 0,
      averageResponseTime: 0,
      concurrentPeak: 0,
      batchesProcessed: 0,
      circuitBreakerTrips: 0,
      retryAttempts: 0
    };
    
    // Performance tracking
    this.performanceHistory = [];
    this.batchProcessor = null;
    this.healthCheckInterval = null;
    
    this.initialize();
  }
  
  initialize() {
    this.startBatchProcessor();
    this.startHealthMonitoring();
    this.emit('orchestrator:initialized', { config: this.config });
  }
  
  /**
   * Execute MCP operation with parallel optimization
   */
  async executeMCPOperation(operationConfig) {
    const operationId = this.generateOperationId();
    const startTime = Date.now();
    
    try {
      // Validate operation configuration
      this.validateOperationConfig(operationConfig);
      
      // Check circuit breaker
      if (this.isCircuitBreakerOpen(operationConfig.serverName)) {
        throw new Error(`Circuit breaker open for server: ${operationConfig.serverName}`);
      }
      
      // Create operation context
      const operation = {
        id: operationId,
        config: operationConfig,
        startTime,
        status: 'pending',
        retryCount: 0,
        timeout: setTimeout(() => {
          this.handleOperationTimeout(operationId);
        }, this.config.operationTimeout)
      };
      
      // Queue or execute immediately based on concurrency
      if (this.activeOperations.size >= this.config.maxConcurrentOperations) {
        this.operationQueue.push(operation);
        this.emit('operation:queued', { operationId, queueSize: this.operationQueue.length });
      } else {
        await this.executeOperation(operation);
      }
      
      return operation.result;
      
    } catch (error) {
      this.handleOperationError(operationId, error);
      throw error;
    }
  }
  
  /**
   * Execute multiple MCP operations in parallel with intelligent batching
   */
  async executeBatchOperations(operations) {
    const batchId = this.generateBatchId();
    const startTime = Date.now();
    
    this.emit('batch:started', { batchId, operationCount: operations.length });
    
    try {
      // Group operations by server for optimal batching
      const serverGroups = this.groupOperationsByServer(operations);
      
      // Execute each server group in parallel
      const serverPromises = Object.entries(serverGroups).map(([serverName, serverOps]) =>
        this.executeServerBatch(serverName, serverOps, batchId)
      );
      
      const results = await Promise.allSettled(serverPromises);
      
      // Process results and handle failures
      const processedResults = this.processBatchResults(results, batchId);
      
      // Update metrics
      this.metrics.batchesProcessed++;
      const duration = Date.now() - startTime;
      this.updatePerformanceMetrics(duration, operations.length);
      
      this.emit('batch:completed', {
        batchId,
        duration,
        totalOperations: operations.length,
        successfulOperations: processedResults.successful.length,
        failedOperations: processedResults.failed.length
      });
      
      return processedResults;
      
    } catch (error) {
      this.emit('batch:failed', { batchId, error: error.message });
      throw error;
    }
  }
  
  /**
   * Execute operations for a specific server with concurrency control
   */
  async executeServerBatch(serverName, operations, batchId) {
    const serverStartTime = Date.now();
    const concurrencyLimit = Math.min(this.config.batchSize, operations.length);
    
    this.emit('server_batch:started', {
      batchId,
      serverName,
      operationCount: operations.length,
      concurrencyLimit
    });
    
    // Execute operations in controlled batches
    const results = [];
    for (let i = 0; i < operations.length; i += concurrencyLimit) {
      const batch = operations.slice(i, i + concurrencyLimit);
      const batchPromises = batch.map(operation => this.executeOperationWithRetry(operation));
      
      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
      
      // Brief pause between batches to prevent overwhelming
      if (i + concurrencyLimit < operations.length) {
        await this.sleep(100);
      }
    }
    
    const duration = Date.now() - serverStartTime;
    this.emit('server_batch:completed', {
      batchId,
      serverName,
      duration,
      results: results.length
    });
    
    return { serverName, results, duration };
  }
  
  /**
   * Execute single operation with retry logic
   */
  async executeOperationWithRetry(operation) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        if (attempt > 0) {
          this.metrics.retryAttempts++;
          await this.sleep(this.config.retryDelay * Math.pow(2, attempt - 1));
          this.emit('operation:retry', {
            operationId: operation.id,
            attempt,
            maxAttempts: this.config.retryAttempts
          });
        }
        
        const result = await this.executeOperation(operation);
        
        // Reset circuit breaker on success
        this.resetCircuitBreaker(operation.config.serverName);
        
        return { status: 'fulfilled', value: result };
        
      } catch (error) {
        lastError = error;
        this.recordOperationFailure(operation.config.serverName);
        
        // Don't retry on certain errors
        if (this.isNonRetryableError(error)) {
          break;
        }
      }
    }
    
    return { status: 'rejected', reason: lastError };
  }
  
  /**
   * Execute individual operation
   */
  async executeOperation(operation) {
    const operationId = operation.id;
    const startTime = Date.now();
    
    this.activeOperations.set(operationId, operation);
    operation.status = 'running';
    
    // Update peak concurrency tracking
    if (this.activeOperations.size > this.metrics.concurrentPeak) {
      this.metrics.concurrentPeak = this.activeOperations.size;
    }
    
    this.emit('operation:started', {
      operationId,
      serverName: operation.config.serverName,
      toolName: operation.config.toolName,
      activeOperations: this.activeOperations.size
    });
    
    try {
      // Execute the actual MCP operation
      const result = await this.performMCPCall(operation.config);
      
      // Clean up
      clearTimeout(operation.timeout);
      this.activeOperations.delete(operationId);
      operation.status = 'completed';
      operation.result = result;
      
      // Update metrics
      this.metrics.totalOperations++;
      this.metrics.successfulOperations++;
      const duration = Date.now() - startTime;
      this.updateAverageResponseTime(duration);
      
      this.emit('operation:completed', {
        operationId,
        duration,
        serverName: operation.config.serverName,
        success: true
      });
      
      // Process next queued operation
      this.processNextQueuedOperation();
      
      return result;
      
    } catch (error) {
      this.handleOperationError(operationId, error);
      throw error;
    }
  }
  
  /**
   * Perform the actual MCP call (to be implemented with specific MCP SDK)
   */
  async performMCPCall(config) {
    const { serverName, toolName, arguments: args, resourceUri } = config;
    
    try {
      // Simulate MCP call - replace with actual MCP SDK implementation
      if (resourceUri) {
        // Resource access
        return await this.accessMCPResource(serverName, resourceUri);
      } else {
        // Tool execution
        return await this.executeMCPTool(serverName, toolName, args);
      }
    } catch (error) {
      throw new Error(`MCP call failed: ${error.message}`);
    }
  }
  
  /**
   * Execute MCP tool (placeholder - integrate with actual MCP SDK)
   */
  async executeMCPTool(serverName, toolName, args) {
    // This would integrate with the actual MCP SDK
    // For now, return a simulated response
    await this.sleep(Math.random() * 100 + 50); // Simulate network delay
    
    return {
      success: true,
      serverName,
      toolName,
      arguments: args,
      result: `Tool ${toolName} executed successfully on ${serverName}`,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Access MCP resource (placeholder - integrate with actual MCP SDK)
   */
  async accessMCPResource(serverName, resourceUri) {
    // This would integrate with the actual MCP SDK
    // For now, return a simulated response
    await this.sleep(Math.random() * 150 + 25); // Simulate network delay
    
    return {
      success: true,
      serverName,
      resourceUri,
      content: `Resource content from ${resourceUri}`,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Group operations by server for optimal batching
   */
  groupOperationsByServer(operations) {
    const groups = {};
    
    operations.forEach(operation => {
      const serverName = operation.serverName;
      if (!groups[serverName]) {
        groups[serverName] = [];
      }
      groups[serverName].push({
        id: this.generateOperationId(),
        config: operation,
        startTime: Date.now(),
        status: 'pending',
        retryCount: 0
      });
    });
    
    return groups;
  }
  
  /**
   * Process batch results and categorize
   */
  processBatchResults(results, batchId) {
    const processed = {
      successful: [],
      failed: [],
      serverResults: {}
    };
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const serverResult = result.value;
        processed.serverResults[serverResult.serverName] = serverResult;
        
        serverResult.results.forEach(opResult => {
          if (opResult.status === 'fulfilled') {
            processed.successful.push(opResult.value);
          } else {
            processed.failed.push({
              error: opResult.reason,
              operation: opResult.operation
            });
          }
        });
      } else {
        processed.failed.push({
          error: result.reason,
          serverError: true
        });
      }
    });
    
    return processed;
  }
  
  /**
   * Circuit breaker implementation
   */
  isCircuitBreakerOpen(serverName) {
    const breaker = this.circuitBreakers.get(serverName);
    if (!breaker) return false;
    
    if (breaker.state === 'open') {
      if (Date.now() - breaker.lastFailTime > this.config.circuitBreakerTimeout) {
        breaker.state = 'half-open';
        breaker.failureCount = 0;
        this.emit('circuit_breaker:half_open', { serverName });
        return false;
      }
      return true;
    }
    
    return false;
  }
  
  recordOperationFailure(serverName) {
    let breaker = this.circuitBreakers.get(serverName);
    if (!breaker) {
      breaker = { state: 'closed', failureCount: 0, lastFailTime: 0 };
      this.circuitBreakers.set(serverName, breaker);
    }
    
    breaker.failureCount++;
    breaker.lastFailTime = Date.now();
    
    if (breaker.failureCount >= this.config.circuitBreakerThreshold) {
      breaker.state = 'open';
      this.metrics.circuitBreakerTrips++;
      this.emit('circuit_breaker:opened', {
        serverName,
        failureCount: breaker.failureCount
      });
    }
  }
  
  resetCircuitBreaker(serverName) {
    const breaker = this.circuitBreakers.get(serverName);
    if (breaker && breaker.state !== 'closed') {
      breaker.state = 'closed';
      breaker.failureCount = 0;
      this.emit('circuit_breaker:closed', { serverName });
    }
  }
  
  /**
   * Error handling
   */
  handleOperationError(operationId, error) {
    const operation = this.activeOperations.get(operationId);
    if (operation) {
      clearTimeout(operation.timeout);
      this.activeOperations.delete(operationId);
      operation.status = 'failed';
      operation.error = error;
    }
    
    this.metrics.totalOperations++;
    this.metrics.failedOperations++;
    
    this.emit('operation:failed', {
      operationId,
      error: error.message,
      serverName: operation?.config?.serverName
    });
    
    // Process next queued operation
    this.processNextQueuedOperation();
  }
  
  handleOperationTimeout(operationId) {
    const error = new Error(`Operation timeout after ${this.config.operationTimeout}ms`);
    this.handleOperationError(operationId, error);
  }
  
  /**
   * Queue management
   */
  processNextQueuedOperation() {
    if (this.operationQueue.length > 0 && this.activeOperations.size < this.config.maxConcurrentOperations) {
      const nextOperation = this.operationQueue.shift();
      this.executeOperation(nextOperation).catch(error => {
        this.emit('operation:failed', {
          operationId: nextOperation.id,
          error: error.message
        });
      });
    }
  }
  
  /**
   * Metrics and monitoring
   */
  updateAverageResponseTime(duration) {
    const totalOps = this.metrics.totalOperations;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalOps - 1) + duration) / totalOps;
  }
  
  updatePerformanceMetrics(duration, operationCount) {
    this.performanceHistory.push({
      timestamp: Date.now(),
      duration,
      operationCount,
      throughput: operationCount / (duration / 1000)
    });
    
    // Keep only last 100 entries
    if (this.performanceHistory.length > 100) {
      this.performanceHistory.shift();
    }
  }
  
  /**
   * Health monitoring
   */
  startHealthMonitoring() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }
  
  performHealthCheck() {
    const health = {
      status: 'healthy',
      activeOperations: this.activeOperations.size,
      queuedOperations: this.operationQueue.length,
      circuitBreakers: Array.from(this.circuitBreakers.entries()).map(([server, breaker]) => ({
        server,
        state: breaker.state,
        failureCount: breaker.failureCount
      })),
      metrics: { ...this.metrics },
      performance: this.getPerformanceStats(),
      timestamp: new Date().toISOString()
    };
    
    // Determine overall health
    if (this.activeOperations.size >= this.config.maxConcurrentOperations * 0.8) {
      health.status = 'degraded';
      health.reason = 'High concurrency utilization';
    }
    
    if (Array.from(this.circuitBreakers.values()).some(breaker => breaker.state === 'open')) {
      health.status = 'degraded';
      health.reason = 'Circuit breaker(s) open';
    }
    
    this.emit('health:check', health);
  }
  
  getPerformanceStats() {
    if (this.performanceHistory.length === 0) {
      return { avgThroughput: 0, maxThroughput: 0, minThroughput: 0 };
    }
    
    const throughputs = this.performanceHistory.map(h => h.throughput);
    return {
      avgThroughput: throughputs.reduce((a, b) => a + b, 0) / throughputs.length,
      maxThroughput: Math.max(...throughputs),
      minThroughput: Math.min(...throughputs)
    };
  }
  
  /**
   * Batch processing
   */
  startBatchProcessor() {
    this.batchProcessor = setInterval(() => {
      this.processPendingBatches();
    }, 1000);
  }
  
  processPendingBatches() {
    // Process any queued operations in batches
    if (this.operationQueue.length > 0) {
      const availableSlots = this.config.maxConcurrentOperations - this.activeOperations.size;
      if (availableSlots > 0) {
        const batchSize = Math.min(availableSlots, this.config.batchSize, this.operationQueue.length);
        const batch = this.operationQueue.splice(0, batchSize);
        
        batch.forEach(operation => {
          this.executeOperation(operation).catch(error => {
            this.emit('operation:failed', {
              operationId: operation.id,
              error: error.message
            });
          });
        });
      }
    }
  }
  
  /**
   * Utility functions
   */
  validateOperationConfig(config) {
    if (!config.serverName) {
      throw new Error('Server name is required for MCP operations');
    }
    
    if (!config.toolName && !config.resourceUri) {
      throw new Error('Either toolName or resourceUri must be specified');
    }
  }
  
  isNonRetryableError(error) {
    const nonRetryablePatterns = [
      'Authentication failed',
      'Invalid tool name',
      'Invalid arguments',
      'Permission denied'
    ];
    
    return nonRetryablePatterns.some(pattern => 
      error.message.toLowerCase().includes(pattern.toLowerCase())
    );
  }
  
  generateOperationId() {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Public API methods
   */
  getMetrics() {
    return {
      ...this.metrics,
      performance: this.getPerformanceStats(),
      activeOperations: this.activeOperations.size,
      queuedOperations: this.operationQueue.length,
      circuitBreakers: Object.fromEntries(this.circuitBreakers)
    };
  }
  
  getHealth() {
    const health = {
      status: 'healthy',
      activeOperations: this.activeOperations.size,
      queuedOperations: this.operationQueue.length,
      metrics: this.getMetrics(),
      timestamp: new Date().toISOString()
    };
    
    // Determine health status
    if (this.activeOperations.size >= this.config.maxConcurrentOperations * 0.9) {
      health.status = 'degraded';
      health.warnings = ['High concurrency utilization'];
    }
    
    const openBreakers = Array.from(this.circuitBreakers.values()).filter(b => b.state === 'open').length;
    if (openBreakers > 0) {
      health.status = 'degraded';
      health.warnings = health.warnings || [];
      health.warnings.push(`${openBreakers} circuit breaker(s) open`);
    }
    
    return health;
  }
  
  /**
   * Cleanup
   */
  shutdown() {
    if (this.batchProcessor) {
      clearInterval(this.batchProcessor);
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Cancel active operations
    this.activeOperations.forEach(operation => {
      if (operation.timeout) {
        clearTimeout(operation.timeout);
      }
    });
    
    this.activeOperations.clear();
    this.operationQueue.length = 0;
    
    this.emit('orchestrator:shutdown');
  }
}

module.exports = ParallelMCPOrchestrator;