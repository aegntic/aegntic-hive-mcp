/**
 * Integrated MCP Manager - Main orchestration system
 * Combines all MCP components with intelligent coordination and batchtools optimization
 */

const EventEmitter = require('events');
const ParallelMCPOrchestrator = require('./parallel-orchestrator');
const SecureAuthManager = require('./secure-auth-manager');
const MCPConnector = require('./mcp-connector');
const { ValidationLayer } = require('./validation-layer');
const MonitoringSystem = require('./monitoring-system');

class IntegratedMCPManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      // Core configuration
      enableParallelProcessing: config.enableParallelProcessing !== false,
      enableSecureAuth: config.enableSecureAuth !== false,
      enableValidation: config.enableValidation !== false,
      enableMonitoring: config.enableMonitoring !== false,
      
      // Performance settings
      maxConcurrentOperations: config.maxConcurrentOperations || 10,
      batchSize: config.batchSize || 5,
      operationTimeout: config.operationTimeout || 30000,
      
      // Security settings
      encryptCredentials: config.encryptCredentials !== false,
      auditLogging: config.auditLogging !== false,
      
      // Monitoring settings
      metricsRetentionDays: config.metricsRetentionDays || 7,
      alertingEnabled: config.alertingEnabled !== false,
      
      // Integration settings
      autoReconnect: config.autoReconnect !== false,
      healthCheckInterval: config.healthCheckInterval || 30000,
      
      ...config
    };
    
    // Component instances
    this.orchestrator = null;
    this.authManager = null;
    this.connector = null;
    this.validator = null;
    this.monitor = null;
    
    // Server configurations
    this.serverConfigs = new Map();
    this.serverCapabilities = new Map();
    
    // Internal state
    this.isInitialized = false;
    this.shutdownInProgress = false;
    
    // Event handlers
    this.setupEventHandlers();
  }
  
  /**
   * Initialize the integrated MCP system
   */
  async initialize() {
    try {
      this.emit('mcp_manager:initializing');
      
      // Initialize core components in parallel for maximum efficiency
      await Promise.all([
        this.initializeOrchestrator(),
        this.initializeAuthManager(),
        this.initializeConnector(),
        this.initializeValidator(),
        this.initializeMonitoring()
      ]);
      
      // Setup cross-component integration
      this.integrateComponents();
      
      this.isInitialized = true;
      this.emit('mcp_manager:initialized', {
        components: this.getComponentStatus(),
        config: this.config
      });
      
      return true;
      
    } catch (error) {
      this.emit('mcp_manager:initialization_failed', { error: error.message });
      throw new Error(`MCP Manager initialization failed: ${error.message}`);
    }
  }
  
  /**
   * Initialize parallel orchestrator
   */
  async initializeOrchestrator() {
    if (!this.config.enableParallelProcessing) return;
    
    this.orchestrator = new ParallelMCPOrchestrator({
      maxConcurrentOperations: this.config.maxConcurrentOperations,
      batchSize: this.config.batchSize,
      operationTimeout: this.config.operationTimeout,
      retryAttempts: this.config.retryAttempts || 3,
      circuitBreakerThreshold: this.config.circuitBreakerThreshold || 5,
      enableMetrics: true
    });
    
    // Replace placeholder MCP calls with real connector calls
    this.orchestrator.performMCPCall = this.performMCPCall.bind(this);
    
    await this.orchestrator.initialize();
  }
  
  /**
   * Initialize secure authentication manager
   */
  async initializeAuthManager() {
    if (!this.config.enableSecureAuth) return;
    
    this.authManager = new SecureAuthManager({
      encryptionAlgorithm: 'aes-256-gcm',
      storageEncryption: this.config.encryptCredentials,
      auditLogging: this.config.auditLogging,
      tokenRefreshThreshold: 300000, // 5 minutes
      maxRetries: 3
    });
    
    await this.authManager.initialize();
  }
  
  /**
   * Initialize MCP connector
   */
  async initializeConnector() {
    this.connector = new MCPConnector({
      connectionTimeout: this.config.operationTimeout,
      enableHeartbeat: true,
      heartbeatInterval: this.config.healthCheckInterval,
      maxReconnectAttempts: this.config.autoReconnect ? 3 : 0,
      validateResponses: this.config.enableValidation
    });
    
    await this.connector.initialize();
  }
  
  /**
   * Initialize validation layer
   */
  async initializeValidator() {
    if (!this.config.enableValidation) return;
    
    this.validator = new ValidationLayer({
      enableStrictValidation: true,
      enableSanitization: true,
      enableSchemaValidation: true,
      maxResponseSize: 10 * 1024 * 1024, // 10MB
      enableContentFiltering: true
    });
    
    await this.validator.initialize();
  }
  
  /**
   * Initialize monitoring system
   */
  async initializeMonitoring() {
    if (!this.config.enableMonitoring) return;
    
    this.monitor = new MonitoringSystem({
      metricsRetentionDays: this.config.metricsRetentionDays,
      alertingEnabled: this.config.alertingEnabled,
      healthCheckInterval: this.config.healthCheckInterval,
      enableRealTimeMetrics: true,
      enableDashboard: true
    });
    
    await this.monitor.initialize();
  }
  
  /**
   * Setup cross-component integration and event handling
   */
  integrateComponents() {
    // Orchestrator events
    if (this.orchestrator) {
      this.orchestrator.on('operation:started', (data) => {
        this.monitor?.recordOperation({ ...data, type: 'operation_start' });
      });
      
      this.orchestrator.on('operation:completed', (data) => {
        this.monitor?.recordOperation({ ...data, success: true });
      });
      
      this.orchestrator.on('operation:failed', (data) => {
        this.monitor?.recordOperation({ ...data, success: false });
      });
      
      this.orchestrator.on('circuit_breaker:opened', (data) => {
        this.monitor?.recordConnection({ ...data, event: 'circuit_breaker_trip' });
      });
    }
    
    // Connector events
    if (this.connector) {
      this.connector.on('connection:established', (data) => {
        this.monitor?.recordConnection({ ...data, event: 'established', success: true });
      });
      
      this.connector.on('connection:failed', (data) => {
        this.monitor?.recordConnection({ ...data, event: 'failed', success: false });
      });
      
      this.connector.on('tool:executed', (data) => {
        this.monitor?.recordOperation({ ...data, type: 'tool', success: true });
      });
      
      this.connector.on('resource:accessed', (data) => {
        this.monitor?.recordOperation({ ...data, type: 'resource', success: true });
      });
    }
    
    // Auth manager events
    if (this.authManager) {
      this.authManager.on('authentication:success', (data) => {
        this.monitor?.recordOperation({ ...data, type: 'auth', success: true });
      });
      
      this.authManager.on('authentication:failed', (data) => {
        this.monitor?.recordOperation({ ...data, type: 'auth', success: false });
      });
      
      this.authManager.on('security:violation', (data) => {
        this.monitor?.recordOperation({ ...data, type: 'security_violation', success: false });
      });
    }
    
    // Validator events
    if (this.validator) {
      this.validator.on('validation:failed', (data) => {
        this.monitor?.recordOperation({ ...data, type: 'validation', success: false });
      });
      
      this.validator.on('security:sensitive_data_detected', (data) => {
        this.monitor?.recordOperation({ ...data, type: 'security_violation', success: false });
      });
    }
  }
  
  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Handle system shutdown gracefully
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }
  
  /**
   * Register MCP server configuration
   */
  async registerServer(serverConfig) {
    const { name, command, args, env, cwd, transport } = serverConfig;
    
    if (!name || !command) {
      throw new Error('Server name and command are required');
    }
    
    try {
      // Store server configuration
      this.serverConfigs.set(name, serverConfig);
      
      // Connect to server
      const connection = await this.connector.connect({
        name,
        command,
        args,
        env,
        cwd,
        transport
      });
      
      // Discover server capabilities
      const [tools, resources] = await Promise.all([
        this.connector.listTools(name),
        this.connector.listResources(name)
      ]);
      
      this.serverCapabilities.set(name, {
        tools: tools.tools || [],
        resources: resources.resources || [],
        connected: true,
        registeredAt: Date.now()
      });
      
      this.emit('server:registered', {
        serverName: name,
        capabilities: this.serverCapabilities.get(name)
      });
      
      return {
        success: true,
        serverName: name,
        capabilities: this.serverCapabilities.get(name)
      };
      
    } catch (error) {
      this.emit('server:registration_failed', { serverName: name, error: error.message });
      throw new Error(`Failed to register server ${name}: ${error.message}`);
    }
  }
  
  /**
   * Execute MCP tool with full integrated pipeline
   */
  async executeTool(serverName, toolName, args = {}, options = {}) {
    if (!this.isInitialized) {
      throw new Error('MCP Manager not initialized');
    }
    
    try {
      // Prepare operation configuration
      const operationConfig = {
        serverName,
        toolName,
        arguments: args,
        options
      };
      
      // Use orchestrator for parallel processing if available
      if (this.orchestrator) {
        const result = await this.orchestrator.executeMCPOperation(operationConfig);
        
        // Validate response if validator is available
        if (this.validator && result.success) {
          const validated = await this.validator.validateToolResponse(result.result, {
            serverName,
            toolName
          });
          return validated.response;
        }
        
        return result;
      } else {
        // Direct execution fallback
        return await this.performMCPCall(operationConfig);
      }
      
    } catch (error) {
      this.emit('tool:execution_failed', {
        serverName,
        toolName,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Access MCP resource with full integrated pipeline
   */
  async accessResource(serverName, resourceUri, options = {}) {
    if (!this.isInitialized) {
      throw new Error('MCP Manager not initialized');
    }
    
    try {
      // Prepare operation configuration
      const operationConfig = {
        serverName,
        resourceUri,
        options
      };
      
      // Use orchestrator for parallel processing if available
      if (this.orchestrator) {
        const result = await this.orchestrator.executeMCPOperation(operationConfig);
        
        // Validate response if validator is available
        if (this.validator && result.success) {
          const validated = await this.validator.validateResourceResponse(result.result, {
            serverName,
            resourceUri
          });
          return validated.response;
        }
        
        return result;
      } else {
        // Direct execution fallback
        return await this.performMCPCall(operationConfig);
      }
      
    } catch (error) {
      this.emit('resource:access_failed', {
        serverName,
        resourceUri,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Execute batch operations with parallel processing
   */
  async executeBatch(operations, options = {}) {
    if (!this.isInitialized) {
      throw new Error('MCP Manager not initialized');
    }
    
    if (!this.orchestrator) {
      throw new Error('Parallel processing not enabled');
    }
    
    try {
      const result = await this.orchestrator.executeBatchOperations(operations);
      
      // Validate batch results if validator is available
      if (this.validator) {
        const validatedResults = {
          successful: [],
          failed: result.failed
        };
        
        for (const successResult of result.successful) {
          try {
            const validated = await this.validator.validateToolResponse(successResult, {
              batch: true
            });
            validatedResults.successful.push(validated.response);
          } catch (validationError) {
            validatedResults.failed.push({
              error: validationError,
              originalResult: successResult
            });
          }
        }
        
        return validatedResults;
      }
      
      return result;
      
    } catch (error) {
      this.emit('batch:execution_failed', {
        operationCount: operations.length,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Perform actual MCP call through connector
   */
  async performMCPCall(config) {
    const { serverName, toolName, arguments: args, resourceUri } = config;
    
    try {
      // Get authentication headers if auth manager is available
      let authHeaders = {};
      if (this.authManager) {
        try {
          authHeaders = await this.authManager.getAuthHeaders(serverName);
        } catch (authError) {
          // Attempt authentication if no valid headers
          await this.authManager.authenticate(serverName);
          authHeaders = await this.authManager.getAuthHeaders(serverName);
        }
      }
      
      // Execute operation through connector
      if (resourceUri) {
        return await this.connector.accessResource(serverName, resourceUri);
      } else {
        return await this.connector.executeTool(serverName, toolName, args);
      }
      
    } catch (error) {
      throw new Error(`MCP call failed: ${error.message}`);
    }
  }
  
  /**
   * Get system health status
   */
  getHealthStatus() {
    if (!this.isInitialized) {
      return { status: 'not_initialized' };
    }
    
    const health = {
      status: 'healthy',
      components: this.getComponentStatus(),
      servers: this.getServerStatus(),
      metrics: this.monitor?.getMetrics() || {},
      timestamp: Date.now()
    };
    
    // Determine overall health
    const componentStatuses = Object.values(health.components);
    const serverStatuses = Object.values(health.servers);
    
    if (componentStatuses.some(status => status === 'error') || 
        serverStatuses.some(server => server.status === 'disconnected')) {
      health.status = 'degraded';
    }
    
    if (this.monitor) {
      const monitorHealth = this.monitor.getHealthStatus();
      if (monitorHealth.status === 'critical' || monitorHealth.status === 'unhealthy') {
        health.status = monitorHealth.status;
      }
    }
    
    return health;
  }
  
  /**
   * Get component status
   */
  getComponentStatus() {
    return {
      orchestrator: this.orchestrator ? 'active' : 'disabled',
      authManager: this.authManager ? 'active' : 'disabled',
      connector: this.connector ? 'active' : 'disabled',
      validator: this.validator ? 'active' : 'disabled',
      monitor: this.monitor ? 'active' : 'disabled'
    };
  }
  
  /**
   * Get server status
   */
  getServerStatus() {
    const status = {};
    
    for (const [name, capabilities] of this.serverCapabilities) {
      status[name] = {
        connected: capabilities.connected,
        toolCount: capabilities.tools.length,
        resourceCount: capabilities.resources.length,
        registeredAt: capabilities.registeredAt,
        status: this.connector?.getConnectionStatus(name) || { status: 'unknown' }
      };
    }
    
    return status;
  }
  
  /**
   * Get comprehensive metrics
   */
  getMetrics() {
    const metrics = {
      system: this.getHealthStatus(),
      components: {}
    };
    
    if (this.orchestrator) {
      metrics.components.orchestrator = this.orchestrator.getMetrics();
    }
    
    if (this.authManager) {
      metrics.components.authManager = this.authManager.getSecurityMetrics();
    }
    
    if (this.connector) {
      metrics.components.connector = this.connector.getMetrics();
    }
    
    if (this.validator) {
      metrics.components.validator = this.validator.getMetrics();
    }
    
    if (this.monitor) {
      metrics.components.monitor = this.monitor.getDashboard();
    }
    
    return metrics;
  }
  
  /**
   * Get real-time dashboard
   */
  getDashboard() {
    if (!this.monitor) {
      return {
        error: 'Monitoring not enabled',
        basicStatus: this.getHealthStatus()
      };
    }
    
    const dashboard = this.monitor.getDashboard();
    
    // Enhance with component-specific data
    dashboard.components = this.getComponentStatus();
    dashboard.servers = this.getServerStatus();
    dashboard.capabilities = Object.fromEntries(this.serverCapabilities);
    
    return dashboard;
  }
  
  /**
   * Store credentials for server authentication
   */
  async storeCredentials(serverName, credentials) {
    if (!this.authManager) {
      throw new Error('Authentication manager not enabled');
    }
    
    return await this.authManager.storeCredentials(serverName, credentials);
  }
  
  /**
   * Update system configuration
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    
    // Update component configurations
    if (this.orchestrator && newConfig.maxConcurrentOperations) {
      this.orchestrator.config.maxConcurrentOperations = newConfig.maxConcurrentOperations;
    }
    
    if (this.monitor && newConfig.alertingEnabled !== undefined) {
      this.monitor.updateConfig({ alertingEnabled: newConfig.alertingEnabled });
    }
    
    this.emit('mcp_manager:config_updated', { config: this.config });
  }
  
  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.shutdownInProgress) return;
    
    this.shutdownInProgress = true;
    this.emit('mcp_manager:shutdown_started');
    
    try {
      // Shutdown components in reverse order of initialization
      const shutdownPromises = [];
      
      if (this.monitor) {
        shutdownPromises.push(this.monitor.shutdown());
      }
      
      if (this.validator) {
        shutdownPromises.push(this.validator.shutdown());
      }
      
      if (this.connector) {
        shutdownPromises.push(this.connector.shutdown());
      }
      
      if (this.authManager) {
        shutdownPromises.push(this.authManager.shutdown());
      }
      
      if (this.orchestrator) {
        shutdownPromises.push(this.orchestrator.shutdown());
      }
      
      await Promise.allSettled(shutdownPromises);
      
      this.emit('mcp_manager:shutdown_completed');
      
    } catch (error) {
      this.emit('mcp_manager:shutdown_failed', { error: error.message });
    }
  }
}

module.exports = IntegratedMCPManager;