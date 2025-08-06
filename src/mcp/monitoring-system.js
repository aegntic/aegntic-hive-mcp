/**
 * MCP Operations Monitoring System
 * Comprehensive monitoring, metrics collection, and alerting for MCP operations
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class MonitoringSystem extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      metricsRetentionDays: config.metricsRetentionDays || 7,
      alertingEnabled: config.alertingEnabled !== false,
      alertThresholds: {
        errorRate: config.errorRate || 10, // percentage
        responseTime: config.responseTime || 5000, // milliseconds
        circuitBreakerTrips: config.circuitBreakerTrips || 3,
        connectionFailures: config.connectionFailures || 5,
        queueSize: config.queueSize || 100
      },
      samplingRate: config.samplingRate || 1.0, // 1.0 = 100% sampling
      exportInterval: config.exportInterval || 60000, // 1 minute
      healthCheckInterval: config.healthCheckInterval || 30000, // 30 seconds
      storageLocation: config.storageLocation || './monitoring-data',
      enableRealTimeMetrics: config.enableRealTimeMetrics !== false,
      enableDashboard: config.enableDashboard !== false,
      ...config
    };
    
    // Real-time metrics
    this.realTimeMetrics = {
      // Performance metrics
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      
      // Connection metrics
      activeConnections: 0,
      connectionAttempts: 0,
      connectionFailures: 0,
      circuitBreakerTrips: 0,
      
      // Queue metrics
      queueSize: 0,
      maxQueueSize: 0,
      queueWaitTime: 0,
      
      // Error metrics
      errorsByType: {},
      errorsByServer: {},
      criticalErrors: 0,
      
      // Resource utilization
      memoryUsage: 0,
      cpuUsage: 0,
      networkLatency: {},
      
      // Business metrics
      toolCallsPerMinute: 0,
      resourceAccessesPerMinute: 0,
      batchOperationsPerMinute: 0
    };
    
    // Historical data storage
    this.historicalData = {
      requestTimeseries: [],
      errorTimeseries: [],
      performanceTimeseries: [],
      alertHistory: []
    };
    
    // Alert state management
    this.alertStates = new Map();
    this.suppressionRules = new Map();
    
    // Monitoring intervals
    this.exportTimer = null;
    this.healthCheckTimer = null;
    this.metricsCleanupTimer = null;
    
    this.initialize();
  }
  
  async initialize() {
    try {
      // Create storage directory
      await this.ensureStorageDirectory();
      
      // Start monitoring intervals
      this.startExportTimer();
      this.startHealthCheckTimer();
      this.startMetricsCleanup();
      
      // Load historical data
      await this.loadHistoricalData();
      
      this.emit('monitoring:initialized', { config: this.config });
      
    } catch (error) {
      this.emit('monitoring:initialization_failed', { error: error.message });
    }
  }
  
  /**
   * Record MCP operation metrics
   */
  recordOperation(operationData) {
    const { type, serverName, duration, success, error, metadata = {} } = operationData;
    
    // Apply sampling
    if (Math.random() > this.config.samplingRate) {
      return;
    }
    
    const timestamp = Date.now();
    
    // Update real-time metrics
    this.realTimeMetrics.totalRequests++;
    
    if (success) {
      this.realTimeMetrics.successfulRequests++;
      this.updateResponseTimeMetrics(duration);
    } else {
      this.realTimeMetrics.failedRequests++;
      this.recordError(error, serverName, type);
    }
    
    // Record in time series
    this.historicalData.requestTimeseries.push({
      timestamp,
      type,
      serverName,
      duration,
      success,
      error: error?.message,
      metadata
    });
    
    // Performance monitoring
    this.recordPerformanceMetrics({
      timestamp,
      responseTime: duration,
      serverName,
      operationType: type
    });
    
    // Check alert conditions
    this.checkAlertConditions();
    
    this.emit('metrics:operation_recorded', operationData);
  }
  
  /**
   * Record connection metrics
   */
  recordConnection(connectionData) {
    const { serverName, event, success, error, metadata = {} } = connectionData;
    const timestamp = Date.now();
    
    switch (event) {
      case 'attempt':
        this.realTimeMetrics.connectionAttempts++;
        break;
      case 'established':
        if (success) {
          this.realTimeMetrics.activeConnections++;
        }
        break;
      case 'failed':
        this.realTimeMetrics.connectionFailures++;
        this.recordError(error, serverName, 'connection');
        break;
      case 'closed':
        this.realTimeMetrics.activeConnections = Math.max(0, this.realTimeMetrics.activeConnections - 1);
        break;
      case 'circuit_breaker_trip':
        this.realTimeMetrics.circuitBreakerTrips++;
        break;
    }
    
    // Record historical data
    this.historicalData.requestTimeseries.push({
      timestamp,
      type: 'connection',
      serverName,
      event,
      success,
      error: error?.message,
      metadata
    });
    
    this.emit('metrics:connection_recorded', connectionData);
  }
  
  /**
   * Record queue metrics
   */
  recordQueue(queueData) {
    const { queueSize, waitTime, serverName } = queueData;
    
    this.realTimeMetrics.queueSize = queueSize;
    this.realTimeMetrics.maxQueueSize = Math.max(this.realTimeMetrics.maxQueueSize, queueSize);
    
    if (waitTime !== undefined) {
      this.realTimeMetrics.queueWaitTime = waitTime;
    }
    
    // Check queue size alerts
    if (queueSize > this.config.alertThresholds.queueSize) {
      this.triggerAlert('queue_size_high', {
        currentSize: queueSize,
        threshold: this.config.alertThresholds.queueSize,
        serverName
      });
    }
    
    this.emit('metrics:queue_recorded', queueData);
  }
  
  /**
   * Record system resource metrics
   */
  recordSystemMetrics(systemData) {
    const { memoryUsage, cpuUsage, networkLatency = {} } = systemData;
    
    this.realTimeMetrics.memoryUsage = memoryUsage;
    this.realTimeMetrics.cpuUsage = cpuUsage;
    this.realTimeMetrics.networkLatency = { ...this.realTimeMetrics.networkLatency, ...networkLatency };
    
    // Record performance timeseries
    this.historicalData.performanceTimeseries.push({
      timestamp: Date.now(),
      memoryUsage,
      cpuUsage,
      networkLatency
    });
    
    this.emit('metrics:system_recorded', systemData);
  }
  
  /**
   * Update response time metrics
   */
  updateResponseTimeMetrics(duration) {
    const total = this.realTimeMetrics.totalRequests;
    this.realTimeMetrics.averageResponseTime = 
      (this.realTimeMetrics.averageResponseTime * (total - 1) + duration) / total;
    
    this.realTimeMetrics.maxResponseTime = Math.max(this.realTimeMetrics.maxResponseTime, duration);
    this.realTimeMetrics.minResponseTime = Math.min(this.realTimeMetrics.minResponseTime, duration);
    
    // Check response time alerts
    if (duration > this.config.alertThresholds.responseTime) {
      this.triggerAlert('response_time_high', {
        responseTime: duration,
        threshold: this.config.alertThresholds.responseTime
      });
    }
  }
  
  /**
   * Record error information
   */
  recordError(error, serverName, operationType) {
    if (!error) return;
    
    const errorType = error.name || 'UnknownError';
    const errorMessage = error.message || 'Unknown error';
    
    // Update error counters
    this.realTimeMetrics.errorsByType[errorType] = (this.realTimeMetrics.errorsByType[errorType] || 0) + 1;
    this.realTimeMetrics.errorsByServer[serverName] = (this.realTimeMetrics.errorsByServer[serverName] || 0) + 1;
    
    // Check if critical error
    const criticalErrorPatterns = [
      'Authentication',
      'Authorization',
      'Security',
      'Critical',
      'Fatal'
    ];
    
    if (criticalErrorPatterns.some(pattern => errorMessage.includes(pattern))) {
      this.realTimeMetrics.criticalErrors++;
    }
    
    // Record in error timeseries
    this.historicalData.errorTimeseries.push({
      timestamp: Date.now(),
      errorType,
      errorMessage,
      serverName,
      operationType,
      stack: error.stack
    });
    
    this.emit('metrics:error_recorded', {
      error: errorMessage,
      type: errorType,
      serverName,
      operationType
    });
  }
  
  /**
   * Record performance metrics
   */
  recordPerformanceMetrics(performanceData) {
    this.historicalData.performanceTimeseries.push(performanceData);
    
    // Keep only recent data
    const retentionTime = this.config.metricsRetentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionTime;
    
    this.historicalData.performanceTimeseries = this.historicalData.performanceTimeseries
      .filter(data => data.timestamp > cutoffTime);
  }
  
  /**
   * Calculate business metrics
   */
  calculateBusinessMetrics() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Filter recent operations
    const recentRequests = this.historicalData.requestTimeseries
      .filter(req => req.timestamp > oneMinuteAgo);
    
    this.realTimeMetrics.toolCallsPerMinute = recentRequests
      .filter(req => req.type === 'tool').length;
    
    this.realTimeMetrics.resourceAccessesPerMinute = recentRequests
      .filter(req => req.type === 'resource').length;
    
    this.realTimeMetrics.batchOperationsPerMinute = recentRequests
      .filter(req => req.type === 'batch').length;
  }
  
  /**
   * Alert management
   */
  checkAlertConditions() {
    if (!this.config.alertingEnabled) return;
    
    const currentErrorRate = this.calculateErrorRate();
    
    // Error rate alert
    if (currentErrorRate > this.config.alertThresholds.errorRate) {
      this.triggerAlert('error_rate_high', {
        currentRate: currentErrorRate,
        threshold: this.config.alertThresholds.errorRate
      });
    }
    
    // Circuit breaker alerts
    if (this.realTimeMetrics.circuitBreakerTrips > this.config.alertThresholds.circuitBreakerTrips) {
      this.triggerAlert('circuit_breaker_trips', {
        trips: this.realTimeMetrics.circuitBreakerTrips,
        threshold: this.config.alertThresholds.circuitBreakerTrips
      });
    }
    
    // Connection failure alerts
    const recentConnectionFailures = this.calculateRecentConnectionFailures();
    if (recentConnectionFailures > this.config.alertThresholds.connectionFailures) {
      this.triggerAlert('connection_failures_high', {
        failures: recentConnectionFailures,
        threshold: this.config.alertThresholds.connectionFailures
      });
    }
  }
  
  /**
   * Trigger alert
   */
  triggerAlert(alertType, data) {
    const alertId = `${alertType}_${Date.now()}`;
    const alert = {
      id: alertId,
      type: alertType,
      severity: this.getAlertSeverity(alertType),
      timestamp: Date.now(),
      data,
      resolved: false
    };
    
    // Check suppression rules
    if (this.isAlertSuppressed(alertType, data)) {
      return;
    }
    
    // Store alert
    this.historicalData.alertHistory.push(alert);
    this.alertStates.set(alertId, alert);
    
    this.emit('alert:triggered', alert);
    
    // Auto-resolve certain alerts after a timeout
    this.scheduleAlertAutoResolve(alertId, alertType);
  }
  
  /**
   * Resolve alert
   */
  resolveAlert(alertId, resolution) {
    const alert = this.alertStates.get(alertId);
    if (alert && !alert.resolved) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      alert.resolution = resolution;
      
      this.emit('alert:resolved', alert);
    }
  }
  
  /**
   * Get alert severity
   */
  getAlertSeverity(alertType) {
    const severityMap = {
      'error_rate_high': 'high',
      'response_time_high': 'medium',
      'queue_size_high': 'medium',
      'circuit_breaker_trips': 'high',
      'connection_failures_high': 'high',
      'critical_error': 'critical'
    };
    
    return severityMap[alertType] || 'low';
  }
  
  /**
   * Check if alert is suppressed
   */
  isAlertSuppressed(alertType, data) {
    const suppressionKey = `${alertType}_${JSON.stringify(data)}`;
    const suppression = this.suppressionRules.get(suppressionKey);
    
    if (suppression && Date.now() < suppression.expiresAt) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Schedule alert auto-resolve
   */
  scheduleAlertAutoResolve(alertId, alertType) {
    const autoResolveTypes = ['response_time_high', 'queue_size_high'];
    
    if (autoResolveTypes.includes(alertType)) {
      setTimeout(() => {
        this.resolveAlert(alertId, 'auto-resolved');
      }, 300000); // 5 minutes
    }
  }
  
  /**
   * Metrics calculations
   */
  calculateErrorRate() {
    if (this.realTimeMetrics.totalRequests === 0) return 0;
    
    return (this.realTimeMetrics.failedRequests / this.realTimeMetrics.totalRequests) * 100;
  }
  
  calculateRecentConnectionFailures() {
    const oneHourAgo = Date.now() - 3600000;
    
    return this.historicalData.requestTimeseries
      .filter(req => 
        req.timestamp > oneHourAgo && 
        req.type === 'connection' && 
        req.event === 'failed'
      ).length;
  }
  
  /**
   * Generate dashboard data
   */
  generateDashboard() {
    this.calculateBusinessMetrics();
    
    const dashboard = {
      overview: {
        status: this.getSystemHealthStatus(),
        totalRequests: this.realTimeMetrics.totalRequests,
        successRate: this.calculateSuccessRate(),
        averageResponseTime: Math.round(this.realTimeMetrics.averageResponseTime),
        activeConnections: this.realTimeMetrics.activeConnections,
        queueSize: this.realTimeMetrics.queueSize
      },
      performance: {
        responseTimeStats: {
          average: Math.round(this.realTimeMetrics.averageResponseTime),
          max: this.realTimeMetrics.maxResponseTime,
          min: this.realTimeMetrics.minResponseTime === Infinity ? 0 : this.realTimeMetrics.minResponseTime
        },
        throughput: {
          toolCallsPerMinute: this.realTimeMetrics.toolCallsPerMinute,
          resourceAccessesPerMinute: this.realTimeMetrics.resourceAccessesPerMinute,
          batchOperationsPerMinute: this.realTimeMetrics.batchOperationsPerMinute
        },
        systemResources: {
          memoryUsage: this.realTimeMetrics.memoryUsage,
          cpuUsage: this.realTimeMetrics.cpuUsage
        }
      },
      errors: {
        errorRate: this.calculateErrorRate(),
        errorsByType: this.realTimeMetrics.errorsByType,
        errorsByServer: this.realTimeMetrics.errorsByServer,
        criticalErrors: this.realTimeMetrics.criticalErrors
      },
      connections: {
        active: this.realTimeMetrics.activeConnections,
        attempts: this.realTimeMetrics.connectionAttempts,
        failures: this.realTimeMetrics.connectionFailures,
        circuitBreakerTrips: this.realTimeMetrics.circuitBreakerTrips
      },
      alerts: {
        active: Array.from(this.alertStates.values()).filter(alert => !alert.resolved),
        recent: this.historicalData.alertHistory.slice(-10),
        totalTriggered: this.historicalData.alertHistory.length
      },
      timestamp: Date.now()
    };
    
    return dashboard;
  }
  
  /**
   * Calculate success rate
   */
  calculateSuccessRate() {
    if (this.realTimeMetrics.totalRequests === 0) return 100;
    
    return ((this.realTimeMetrics.successfulRequests / this.realTimeMetrics.totalRequests) * 100).toFixed(2);
  }
  
  /**
   * Get system health status
   */
  getSystemHealthStatus() {
    const errorRate = this.calculateErrorRate();
    const avgResponseTime = this.realTimeMetrics.averageResponseTime;
    const activeAlerts = Array.from(this.alertStates.values()).filter(alert => !alert.resolved);
    
    if (activeAlerts.some(alert => alert.severity === 'critical')) {
      return 'critical';
    }
    
    if (errorRate > 20 || avgResponseTime > 10000) {
      return 'unhealthy';
    }
    
    if (errorRate > 5 || avgResponseTime > 5000 || activeAlerts.length > 0) {
      return 'degraded';
    }
    
    return 'healthy';
  }
  
  /**
   * Data export and persistence
   */
  async exportMetrics() {
    try {
      const exportData = {
        timestamp: Date.now(),
        realTimeMetrics: this.realTimeMetrics,
        dashboard: this.generateDashboard()
      };
      
      const filename = `metrics_${new Date().toISOString().split('T')[0]}.json`;
      const filepath = path.join(this.config.storageLocation, filename);
      
      await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));
      
      this.emit('monitoring:metrics_exported', { filepath });
      
    } catch (error) {
      this.emit('monitoring:export_failed', { error: error.message });
    }
  }
  
  /**
   * Timer management
   */
  startExportTimer() {
    this.exportTimer = setInterval(() => {
      this.exportMetrics();
    }, this.config.exportInterval);
  }
  
  startHealthCheckTimer() {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }
  
  startMetricsCleanup() {
    this.metricsCleanupTimer = setInterval(() => {
      this.cleanupHistoricalData();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }
  
  performHealthCheck() {
    const health = {
      status: this.getSystemHealthStatus(),
      timestamp: Date.now(),
      metrics: this.generateDashboard()
    };
    
    this.emit('monitoring:health_check', health);
  }
  
  /**
   * Data management
   */
  async ensureStorageDirectory() {
    try {
      await fs.mkdir(this.config.storageLocation, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
  
  async loadHistoricalData() {
    try {
      const files = await fs.readdir(this.config.storageLocation);
      const metricsFiles = files.filter(file => file.startsWith('metrics_') && file.endsWith('.json'));
      
      // Load latest metrics file
      if (metricsFiles.length > 0) {
        const latestFile = metricsFiles.sort().pop();
        const filepath = path.join(this.config.storageLocation, latestFile);
        const data = JSON.parse(await fs.readFile(filepath, 'utf8'));
        
        // Restore some metrics (but not all, to allow for fresh start)
        if (data.realTimeMetrics) {
          this.realTimeMetrics.errorsByType = data.realTimeMetrics.errorsByType || {};
          this.realTimeMetrics.errorsByServer = data.realTimeMetrics.errorsByServer || {};
        }
      }
    } catch (error) {
      // Ignore errors during historical data loading
      this.emit('monitoring:historical_load_failed', { error: error.message });
    }
  }
  
  cleanupHistoricalData() {
    const retentionTime = this.config.metricsRetentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = Date.now() - retentionTime;
    
    // Cleanup timeseries data
    this.historicalData.requestTimeseries = this.historicalData.requestTimeseries
      .filter(data => data.timestamp > cutoffTime);
    
    this.historicalData.errorTimeseries = this.historicalData.errorTimeseries
      .filter(data => data.timestamp > cutoffTime);
    
    this.historicalData.performanceTimeseries = this.historicalData.performanceTimeseries
      .filter(data => data.timestamp > cutoffTime);
    
    this.historicalData.alertHistory = this.historicalData.alertHistory
      .filter(alert => alert.timestamp > cutoffTime);
    
    this.emit('monitoring:cleanup_completed', {
      retainedRequests: this.historicalData.requestTimeseries.length,
      retainedErrors: this.historicalData.errorTimeseries.length,
      retainedAlerts: this.historicalData.alertHistory.length
    });
  }
  
  /**
   * Public API methods
   */
  getMetrics() {
    return this.realTimeMetrics;
  }
  
  getDashboard() {
    return this.generateDashboard();
  }
  
  getAlerts(includeResolved = false) {
    const alerts = Array.from(this.alertStates.values());
    return includeResolved ? alerts : alerts.filter(alert => !alert.resolved);
  }
  
  getHealthStatus() {
    return {
      status: this.getSystemHealthStatus(),
      timestamp: Date.now(),
      details: this.generateDashboard()
    };
  }
  
  /**
   * Configuration management
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('monitoring:config_updated', { config: this.config });
  }
  
  addSuppressionRule(alertType, data, durationMs) {
    const suppressionKey = `${alertType}_${JSON.stringify(data)}`;
    this.suppressionRules.set(suppressionKey, {
      expiresAt: Date.now() + durationMs
    });
  }
  
  /**
   * Shutdown
   */
  async shutdown() {
    // Clear timers
    if (this.exportTimer) clearInterval(this.exportTimer);
    if (this.healthCheckTimer) clearInterval(this.healthCheckTimer);
    if (this.metricsCleanupTimer) clearInterval(this.metricsCleanupTimer);
    
    // Final export
    await this.exportMetrics();
    
    this.emit('monitoring:shutdown');
  }
}

module.exports = MonitoringSystem;