/**
 * MCP Connector - Real MCP SDK Integration
 * Bridges ParallelMCPOrchestrator with actual MCP protocol implementation
 */

const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const { SSEClientTransport } = require('@modelcontextprotocol/sdk/client/sse.js');
const { WebSocketClientTransport } = require('@modelcontextprotocol/sdk/client/websocket.js');
const EventEmitter = require('events');
const { spawn } = require('child_process');

class MCPConnector extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      connectionTimeout: config.connectionTimeout || 30000,
      heartbeatInterval: config.heartbeatInterval || 30000,
      maxReconnectAttempts: config.maxReconnectAttempts || 3,
      reconnectDelay: config.reconnectDelay || 2000,
      enableHeartbeat: config.enableHeartbeat !== false,
      validateResponses: config.validateResponses !== false,
      ...config
    };
    
    // Active MCP client connections
    this.connections = new Map();
    this.connectionStatuses = new Map();
    this.heartbeatTimers = new Map();
    this.reconnectAttempts = new Map();
    
    // Metrics tracking
    this.metrics = {
      connectionsEstablished: 0,
      connectionsFailed: 0,
      toolCallsExecuted: 0,
      resourcesAccessed: 0,
      errorsEncountered: 0,
      averageResponseTime: 0,
      lastHeartbeat: new Map()
    };
    
    this.initialize();
  }
  
  async initialize() {
    this.emit('connector:initialized', { config: this.config });
  }
  
  /**
   * Connect to MCP server
   */
  async connect(serverConfig) {
    const { name, transport, command, args, env = {}, cwd } = serverConfig;
    
    try {
      // Check if already connected
      if (this.connections.has(name)) {
        const status = this.connectionStatuses.get(name);
        if (status === 'connected') {
          return this.connections.get(name);
        }
      }
      
      this.connectionStatuses.set(name, 'connecting');
      this.emit('connection:connecting', { serverName: name });
      
      // Create appropriate transport
      let clientTransport;
      switch (transport?.type || 'stdio') {
        case 'stdio':
          clientTransport = await this.createStdioTransport(command, args, { env, cwd });
          break;
        case 'sse':
          clientTransport = new SSEClientTransport(new URL(transport.url));
          break;
        case 'websocket':
          clientTransport = new WebSocketClientTransport(new URL(transport.url));
          break;
        default:
          throw new Error(`Unsupported transport type: ${transport.type}`);
      }
      
      // Create MCP client
      const client = new Client({
        name: `aegntic-hive-${name}`,
        version: '1.0.0'
      }, {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          sampling: {}
        }
      });
      
      // Connect with timeout
      await Promise.race([
        client.connect(clientTransport),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), this.config.connectionTimeout)
        )
      ]);
      
      // Store connection
      this.connections.set(name, client);
      this.connectionStatuses.set(name, 'connected');
      this.metrics.connectionsEstablished++;
      
      // Setup heartbeat monitoring
      if (this.config.enableHeartbeat) {
        this.setupHeartbeat(name, client);
      }
      
      // Setup error handlers
      this.setupErrorHandlers(name, client, clientTransport);
      
      this.emit('connection:established', {
        serverName: name,
        capabilities: await client.listTools()
      });
      
      return client;
      
    } catch (error) {
      this.connectionStatuses.set(name, 'failed');
      this.metrics.connectionsFailed++;
      
      this.emit('connection:failed', {
        serverName: name,
        error: error.message
      });
      
      throw new Error(`Failed to connect to MCP server ${name}: ${error.message}`);
    }
  }
  
  /**
   * Create stdio transport with process management
   */
  async createStdioTransport(command, args = [], options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...options.env },
        cwd: options.cwd
      });
      
      process.on('error', reject);
      
      // Give the process time to start
      setTimeout(() => {
        const transport = new StdioClientTransport({
          stdin: process.stdin,
          stdout: process.stdout
        });
        resolve(transport);
      }, 1000);
    });
  }
  
  /**
   * Execute MCP tool call
   */
  async executeTool(serverName, toolName, args = {}) {
    const startTime = Date.now();
    
    try {
      const client = await this.ensureConnection(serverName);
      
      this.emit('tool:executing', { serverName, toolName, args });
      
      const result = await client.callTool({
        name: toolName,
        arguments: args
      });
      
      // Validate response if enabled
      if (this.config.validateResponses) {
        this.validateToolResponse(result);
      }
      
      // Update metrics
      this.metrics.toolCallsExecuted++;
      const duration = Date.now() - startTime;
      this.updateAverageResponseTime(duration);
      
      this.emit('tool:executed', {
        serverName,
        toolName,
        duration,
        success: true
      });
      
      return {
        success: true,
        result: result.content,
        metadata: {
          serverName,
          toolName,
          duration,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      this.metrics.errorsEncountered++;
      
      this.emit('tool:failed', {
        serverName,
        toolName,
        error: error.message
      });
      
      throw new Error(`Tool execution failed on ${serverName}.${toolName}: ${error.message}`);
    }
  }
  
  /**
   * Access MCP resource
   */
  async accessResource(serverName, resourceUri) {
    const startTime = Date.now();
    
    try {
      const client = await this.ensureConnection(serverName);
      
      this.emit('resource:accessing', { serverName, resourceUri });
      
      const result = await client.readResource({ uri: resourceUri });
      
      // Validate response if enabled
      if (this.config.validateResponses) {
        this.validateResourceResponse(result);
      }
      
      // Update metrics
      this.metrics.resourcesAccessed++;
      const duration = Date.now() - startTime;
      this.updateAverageResponseTime(duration);
      
      this.emit('resource:accessed', {
        serverName,
        resourceUri,
        duration,
        success: true
      });
      
      return {
        success: true,
        content: result.contents,
        metadata: {
          serverName,
          resourceUri,
          duration,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      this.metrics.errorsEncountered++;
      
      this.emit('resource:failed', {
        serverName,
        resourceUri,
        error: error.message
      });
      
      throw new Error(`Resource access failed on ${serverName}: ${error.message}`);
    }
  }
  
  /**
   * List available tools from server
   */
  async listTools(serverName) {
    try {
      const client = await this.ensureConnection(serverName);
      const tools = await client.listTools();
      
      return {
        success: true,
        tools: tools.tools || [],
        serverName,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`Failed to list tools from ${serverName}: ${error.message}`);
    }
  }
  
  /**
   * List available resources from server
   */
  async listResources(serverName) {
    try {
      const client = await this.ensureConnection(serverName);
      const resources = await client.listResources();
      
      return {
        success: true,
        resources: resources.resources || [],
        serverName,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      throw new Error(`Failed to list resources from ${serverName}: ${error.message}`);
    }
  }
  
  /**
   * Ensure connection is active, reconnect if necessary
   */
  async ensureConnection(serverName) {
    let client = this.connections.get(serverName);
    const status = this.connectionStatuses.get(serverName);
    
    if (!client || status !== 'connected') {
      throw new Error(`No active connection to server: ${serverName}`);
    }
    
    // Test connection with a heartbeat
    try {
      if (this.config.enableHeartbeat) {
        await this.performHeartbeat(serverName, client);
      }
      return client;
    } catch (error) {
      // Connection is broken, attempt reconnection
      this.emit('connection:lost', { serverName, error: error.message });
      await this.attemptReconnection(serverName);
      return this.connections.get(serverName);
    }
  }
  
  /**
   * Setup heartbeat monitoring
   */
  setupHeartbeat(serverName, client) {
    const heartbeatTimer = setInterval(async () => {
      try {
        await this.performHeartbeat(serverName, client);
        this.metrics.lastHeartbeat.set(serverName, Date.now());
      } catch (error) {
        this.emit('heartbeat:failed', { serverName, error: error.message });
        await this.attemptReconnection(serverName);
      }
    }, this.config.heartbeatInterval);
    
    this.heartbeatTimers.set(serverName, heartbeatTimer);
  }
  
  /**
   * Perform heartbeat check
   */
  async performHeartbeat(serverName, client) {
    try {
      // Use ping if available, otherwise list tools as heartbeat
      if (client.ping) {
        await client.ping();
      } else {
        await client.listTools();
      }
    } catch (error) {
      throw new Error(`Heartbeat failed for ${serverName}: ${error.message}`);
    }
  }
  
  /**
   * Setup error handlers for client
   */
  setupErrorHandlers(serverName, client, transport) {
    const handleError = (error) => {
      this.connectionStatuses.set(serverName, 'error');
      this.emit('connection:error', { serverName, error: error.message });
    };
    
    const handleDisconnect = () => {
      this.connectionStatuses.set(serverName, 'disconnected');
      this.emit('connection:disconnected', { serverName });
      this.attemptReconnection(serverName);
    };
    
    client.on('error', handleError);
    transport.on('error', handleError);
    transport.on('close', handleDisconnect);
  }
  
  /**
   * Attempt to reconnect to server
   */
  async attemptReconnection(serverName) {
    const attempts = this.reconnectAttempts.get(serverName) || 0;
    
    if (attempts >= this.config.maxReconnectAttempts) {
      this.emit('reconnection:failed', { 
        serverName, 
        maxAttemptsReached: true 
      });
      return;
    }
    
    this.reconnectAttempts.set(serverName, attempts + 1);
    this.connectionStatuses.set(serverName, 'reconnecting');
    
    this.emit('reconnection:attempting', { 
      serverName, 
      attempt: attempts + 1, 
      maxAttempts: this.config.maxReconnectAttempts 
    });
    
    try {
      // Wait before reconnecting
      await this.sleep(this.config.reconnectDelay * (attempts + 1));
      
      // Get original server config (would need to be stored)
      const serverConfig = this.getServerConfig(serverName);
      if (!serverConfig) {
        throw new Error(`No stored configuration for server: ${serverName}`);
      }
      
      await this.connect(serverConfig);
      
      // Reset reconnect attempts on success
      this.reconnectAttempts.set(serverName, 0);
      
      this.emit('reconnection:successful', { serverName });
      
    } catch (error) {
      this.emit('reconnection:failed', { 
        serverName, 
        attempt: attempts + 1, 
        error: error.message 
      });
    }
  }
  
  /**
   * Response validation
   */
  validateToolResponse(response) {
    if (!response) {
      throw new Error('Empty tool response');
    }
    
    if (!response.content) {
      throw new Error('Tool response missing content');
    }
    
    // Additional validation based on MCP spec
    if (response.isError && !response.content.some(c => c.type === 'text')) {
      throw new Error('Error response must contain text content');
    }
  }
  
  validateResourceResponse(response) {
    if (!response) {
      throw new Error('Empty resource response');
    }
    
    if (!response.contents || !Array.isArray(response.contents)) {
      throw new Error('Resource response must contain contents array');
    }
  }
  
  /**
   * Metrics and monitoring
   */
  updateAverageResponseTime(duration) {
    const totalCalls = this.metrics.toolCallsExecuted + this.metrics.resourcesAccessed;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalCalls - 1) + duration) / totalCalls;
  }
  
  getConnectionStatus(serverName) {
    return {
      status: this.connectionStatuses.get(serverName) || 'disconnected',
      connected: this.connectionStatuses.get(serverName) === 'connected',
      lastHeartbeat: this.metrics.lastHeartbeat.get(serverName),
      reconnectAttempts: this.reconnectAttempts.get(serverName) || 0
    };
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      activeConnections: Array.from(this.connections.keys()).length,
      connectionStatuses: Object.fromEntries(this.connectionStatuses),
      lastHeartbeats: Object.fromEntries(this.metrics.lastHeartbeat)
    };
  }
  
  /**
   * Server configuration management
   */
  getServerConfig(serverName) {
    // This would be implemented to retrieve stored server configurations
    // For now, return null to indicate no stored config
    return null;
  }
  
  /**
   * Utility functions
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Bulk operations support
   */
  async executeBulkTools(operations) {
    const results = [];
    
    for (const operation of operations) {
      try {
        const result = await this.executeTool(
          operation.serverName,
          operation.toolName,
          operation.arguments
        );
        results.push({ status: 'fulfilled', value: result });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }
    }
    
    return results;
  }
  
  async accessBulkResources(operations) {
    const results = [];
    
    for (const operation of operations) {
      try {
        const result = await this.accessResource(
          operation.serverName,
          operation.resourceUri
        );
        results.push({ status: 'fulfilled', value: result });
      } catch (error) {
        results.push({ status: 'rejected', reason: error });
      }
    }
    
    return results;
  }
  
  /**
   * Health check
   */
  async performHealthCheck() {
    const health = {
      status: 'healthy',
      connections: {},
      metrics: this.getMetrics(),
      timestamp: new Date().toISOString()
    };
    
    // Check each connection
    for (const [serverName, client] of this.connections) {
      try {
        await this.performHeartbeat(serverName, client);
        health.connections[serverName] = {
          status: 'healthy',
          lastCheck: Date.now()
        };
      } catch (error) {
        health.connections[serverName] = {
          status: 'unhealthy',
          error: error.message,
          lastCheck: Date.now()
        };
        health.status = 'degraded';
      }
    }
    
    return health;
  }
  
  /**
   * Cleanup and shutdown
   */
  async shutdown() {
    // Clear heartbeat timers
    for (const timer of this.heartbeatTimers.values()) {
      clearInterval(timer);
    }
    this.heartbeatTimers.clear();
    
    // Close all connections
    const closePromises = Array.from(this.connections.entries()).map(async ([name, client]) => {
      try {
        await client.close();
        this.emit('connection:closed', { serverName: name });
      } catch (error) {
        this.emit('connection:close_error', { serverName: name, error: error.message });
      }
    });
    
    await Promise.allSettled(closePromises);
    
    // Clear internal state
    this.connections.clear();
    this.connectionStatuses.clear();
    this.reconnectAttempts.clear();
    
    this.emit('connector:shutdown');
  }
}

module.exports = MCPConnector;