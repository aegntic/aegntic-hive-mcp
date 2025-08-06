/**
 * MCP Bridge for Serena Integration
 * Connects aegntic-hive-mcp with Serena semantic code analysis
 * Part of Phase 1 implementation with CCR routing
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const crypto = require('crypto');

class MCPBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.serenaEndpoint = options.serenaEndpoint || 'ws://localhost:9102';
    this.reconnectDelay = options.reconnectDelay || 5000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    this.heartbeatInterval = options.heartbeatInterval || 30000;
    
    // Connection state
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.lastHeartbeat = null;
    this.connectionId = crypto.randomUUID();
    
    // Message handling
    this.pendingRequests = new Map();
    this.requestTimeout = options.requestTimeout || 30000;
    
    // Super-hub integration
    this.superHub = options.superHub;
    this.patternEngine = options.patternEngine;
    
    // Semantic analysis capabilities
    this.capabilities = {
      codeAnalysis: true,
      semanticSearch: true,
      patternDetection: true,
      qualityAssessment: true,
      refactoringRecommendations: true,
      architecturalInsights: true
    };
    
    // Statistics
    this.stats = {
      requestsSent: 0,
      responsesReceived: 0,
      errorsEncountered: 0,
      analysisPerformed: 0,
      patternsDetected: 0,
      averageResponseTime: 0,
      connectionUptime: 0,
      lastConnected: null
    };
    
    console.log('[MCPBridge] Initializing Serena integration bridge...');
    this.initialize();
  }
  
  async initialize() {
    try {
      // Connect to Serena
      await this.connect();
      
      // Start heartbeat
      this.startHeartbeat();
      
      // Register with super-hub if available
      if (this.superHub) {
        this.registerWithSuperHub();
      }
      
      console.log('[MCPBridge] Serena integration bridge initialized');
      this.emit('initialized');
      
    } catch (error) {
      console.error('[MCPBridge] Initialization failed:', error);
      this.scheduleReconnect();
    }
  }
  
  async connect() {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[MCPBridge] Connecting to Serena: ${this.serenaEndpoint}`);
        
        this.ws = new WebSocket(this.serenaEndpoint, {
          headers: {
            'X-Client-ID': this.connectionId,
            'X-Client-Type': 'aegntic-mcp-bridge',
            'X-Protocol-Version': '1.0'
          }
        });
        
        this.ws.on('open', () => {
          console.log('[MCPBridge] Connected to Serena');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.stats.lastConnected = Date.now();
          this.stats.connectionUptime = Date.now();
          
          // Send handshake
          this.sendHandshake();
          
          this.emit('connected');
          resolve();
        });
        
        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });
        
        this.ws.on('close', (code, reason) => {
          console.log(`[MCPBridge] Disconnected from Serena: ${code} ${reason}`);
          this.connected = false;
          this.ws = null;
          
          this.emit('disconnected', { code, reason });
          this.scheduleReconnect();
        });
        
        this.ws.on('error', (error) => {
          console.error('[MCPBridge] WebSocket error:', error);
          this.stats.errorsEncountered++;
          this.emit('error', error);
          
          if (!this.connected) {
            reject(error);
          }
        });
        
        this.ws.on('pong', () => {
          this.lastHeartbeat = Date.now();
        });
        
      } catch (error) {
        console.error('[MCPBridge] Connection failed:', error);
        reject(error);
      }
    });
  }
  
  sendHandshake() {
    const handshake = {
      type: 'handshake',
      clientId: this.connectionId,
      clientType: 'aegntic-mcp-bridge',
      protocolVersion: '1.0',
      capabilities: this.capabilities,
      timestamp: Date.now()
    };
    
    this.sendMessage(handshake);
  }
  
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[MCPBridge] Max reconnection attempts reached');
      this.emit('max-reconnects-reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`[MCPBridge] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (!this.connected) {
        this.connect().catch(error => {
          console.error('[MCPBridge] Reconnect failed:', error);
        });
      }
    }, delay);
  }
  
  startHeartbeat() {
    setInterval(() => {
      if (this.connected && this.ws) {
        this.ws.ping();
        
        // Check if heartbeat response is overdue
        if (this.lastHeartbeat && Date.now() - this.lastHeartbeat > this.heartbeatInterval * 2) {
          console.warn('[MCPBridge] Heartbeat timeout, reconnecting...');
          this.ws.close();
        }
      }
    }, this.heartbeatInterval);
  }
  
  registerWithSuperHub() {
    if (!this.superHub) return;
    
    try {
      // Register as a specialized node in the super-hub
      this.superHub.on('initialized', () => {
        // Register this bridge as a semantic analysis node
        const nodeInfo = {
          type: 'serena-bridge',
          capabilities: this.capabilities,
          performance: {
            averageResponseTime: this.stats.averageResponseTime,
            successRate: this.calculateSuccessRate(),
            availability: this.connected ? 1.0 : 0.0
          }
        };
        
        // This would typically send a registration message via WebSocket
        console.log('[MCPBridge] Registered with SuperHub as semantic analysis node');
      });
      
      // Listen for semantic analysis requests from super-hub
      this.superHub.on('semantic-analysis-request', async (request) => {
        try {
          const result = await this.analyzeCode(request.code, request.options);
          this.superHub.emit('semantic-analysis-response', {
            requestId: request.id,
            result,
            success: true
          });
        } catch (error) {
          this.superHub.emit('semantic-analysis-response', {
            requestId: request.id,
            error: error.message,
            success: false
          });
        }
      });
      
    } catch (error) {
      console.error('[MCPBridge] SuperHub registration failed:', error);
    }
  }
  
  sendMessage(message) {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected to Serena');
    }
    
    try {
      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      this.stats.requestsSent++;
      return true;
    } catch (error) {
      console.error('[MCPBridge] Failed to send message:', error);
      this.stats.errorsEncountered++;
      throw error;
    }
  }
  
  async sendRequest(request, timeout = this.requestTimeout) {
    const requestId = crypto.randomUUID();
    const message = {
      ...request,
      id: requestId,
      timestamp: Date.now()
    };
    
    return new Promise((resolve, reject) => {
      // Set timeout
      const timeoutId = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error(`Request timeout: ${requestId}`));
      }, timeout);
      
      // Store pending request
      this.pendingRequests.set(requestId, {
        resolve,
        reject,
        timeoutId,
        startTime: Date.now()
      });
      
      // Send request
      try {
        this.sendMessage(message);
      } catch (error) {
        clearTimeout(timeoutId);
        this.pendingRequests.delete(requestId);
        reject(error);
      }
    });
  }
  
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());
      
      // Update response statistics
      this.stats.responsesReceived++;
      
      switch (message.type) {
        case 'handshake_response':
          this.handleHandshakeResponse(message);
          break;
          
        case 'response':
          this.handleResponse(message);
          break;
          
        case 'analysis_result':
          this.handleAnalysisResult(message);
          break;
          
        case 'pattern_detected':
          this.handlePatternDetected(message);
          break;
          
        case 'error':
          this.handleError(message);
          break;
          
        case 'heartbeat':
          this.handleHeartbeat(message);
          break;
          
        default:
          console.warn(`[MCPBridge] Unknown message type: ${message.type}`);
      }
      
    } catch (error) {
      console.error('[MCPBridge] Message handling error:', error);
      this.stats.errorsEncountered++;
    }
  }
  
  handleHandshakeResponse(message) {
    console.log('[MCPBridge] Handshake successful:', message.serverInfo);
    
    // Update capabilities based on server response
    if (message.serverCapabilities) {
      this.capabilities = {
        ...this.capabilities,
        ...message.serverCapabilities
      };
    }
    
    this.emit('handshake-complete', message);
  }
  
  handleResponse(message) {
    const pending = this.pendingRequests.get(message.id);
    
    if (pending) {
      clearTimeout(pending.timeoutId);
      this.pendingRequests.delete(message.id);
      
      // Update response time statistics
      const responseTime = Date.now() - pending.startTime;
      this.updateResponseTimeStats(responseTime);
      
      if (message.success) {
        pending.resolve(message.data);
      } else {
        pending.reject(new Error(message.error || 'Request failed'));
      }
    } else {
      console.warn(`[MCPBridge] Received response for unknown request: ${message.id}`);
    }
  }
  
  handleAnalysisResult(message) {
    this.stats.analysisPerformed++;
    
    // Record patterns if pattern engine is available
    if (this.patternEngine && message.patterns) {
      for (const pattern of message.patterns) {
        this.patternEngine.recordPattern({
          type: 'semantic-pattern',
          data: pattern,
          source: 'serena-analysis',
          confidence: pattern.confidence || 0.7
        });
      }
    }
    
    this.emit('analysis-result', message);
  }
  
  handlePatternDetected(message) {
    this.stats.patternsDetected++;
    
    // Forward pattern to pattern engine
    if (this.patternEngine) {
      this.patternEngine.recordPattern({
        type: 'serena-pattern',
        data: message.pattern,
        source: 'serena-detection',
        confidence: message.pattern.confidence || 0.8,
        impact: message.pattern.impact || 'unknown'
      });
    }
    
    // Forward to super-hub for collective intelligence
    if (this.superHub) {
      this.superHub.emit('pattern-detection', {
        source: 'serena-bridge',
        pattern: message.pattern,
        timestamp: Date.now()
      });
    }
    
    this.emit('pattern-detected', message);
  }
  
  handleError(message) {
    console.error('[MCPBridge] Serena error:', message.error);
    this.stats.errorsEncountered++;
    
    // Handle pending request error
    if (message.id) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeoutId);
        this.pendingRequests.delete(message.id);
        pending.reject(new Error(message.error));
      }
    }
    
    this.emit('serena-error', message);
  }
  
  handleHeartbeat(message) {
    this.lastHeartbeat = Date.now();
    
    // Respond to heartbeat
    this.sendMessage({
      type: 'heartbeat_response',
      timestamp: Date.now(),
      clientId: this.connectionId
    });
  }
  
  // Public API methods
  
  async analyzeCode(code, options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to Serena');
    }
    
    const request = {
      type: 'analyze_code',
      data: {
        code,
        options: {
          includePatterns: true,
          includeMetrics: true,
          includeRecommendations: true,
          includeArchitecture: true,
          ...options
        }
      }
    };
    
    try {
      const result = await this.sendRequest(request);
      this.stats.analysisPerformed++;
      
      return {
        analysis: result.analysis,
        patterns: result.patterns || [],
        metrics: result.metrics || {},
        recommendations: result.recommendations || [],
        architecture: result.architecture || {},
        confidence: result.confidence || 0.8,
        processingTime: result.processingTime || 0
      };
      
    } catch (error) {
      console.error('[MCPBridge] Code analysis failed:', error);
      throw error;
    }
  }
  
  async searchSemantics(query, codebase, options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to Serena');
    }
    
    const request = {
      type: 'semantic_search',
      data: {
        query,
        codebase,
        options: {
          maxResults: 10,
          includeContext: true,
          similarityThreshold: 0.7,
          ...options
        }
      }
    };
    
    try {
      const result = await this.sendRequest(request);
      
      return {
        results: result.results || [],
        totalMatches: result.totalMatches || 0,
        processingTime: result.processingTime || 0,
        confidence: result.confidence || 0.8
      };
      
    } catch (error) {
      console.error('[MCPBridge] Semantic search failed:', error);
      throw error;
    }
  }
  
  async detectPatterns(code, options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to Serena');
    }
    
    const request = {
      type: 'detect_patterns',
      data: {
        code,
        options: {
          includeAntiPatterns: true,
          includeDesignPatterns: true,
          includePerformancePatterns: true,
          confidenceThreshold: 0.6,
          ...options
        }
      }
    };
    
    try {
      const result = await this.sendRequest(request);
      this.stats.patternsDetected += result.patterns?.length || 0;
      
      return {
        patterns: result.patterns || [],
        antiPatterns: result.antiPatterns || [],
        designPatterns: result.designPatterns || [],
        confidence: result.confidence || 0.8,
        processingTime: result.processingTime || 0
      };
      
    } catch (error) {
      console.error('[MCPBridge] Pattern detection failed:', error);
      throw error;
    }
  }
  
  async assessQuality(code, options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to Serena');
    }
    
    const request = {
      type: 'assess_quality',
      data: {
        code,
        options: {
          includeMetrics: true,
          includeRecommendations: true,
          includeComplexityAnalysis: true,
          ...options
        }
      }
    };
    
    try {
      const result = await this.sendRequest(request);
      
      return {
        qualityScore: result.qualityScore || 0,
        metrics: result.metrics || {},
        recommendations: result.recommendations || [],
        complexityAnalysis: result.complexityAnalysis || {},
        issues: result.issues || [],
        confidence: result.confidence || 0.8,
        processingTime: result.processingTime || 0
      };
      
    } catch (error) {
      console.error('[MCPBridge] Quality assessment failed:', error);
      throw error;
    }
  }
  
  async getRefactoringRecommendations(code, options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to Serena');
    }
    
    const request = {
      type: 'refactoring_recommendations',
      data: {
        code,
        options: {
          includeExamples: true,
          prioritizeImpact: true,
          includeRisk: true,
          ...options
        }
      }
    };
    
    try {
      const result = await this.sendRequest(request);
      
      return {
        recommendations: result.recommendations || [],
        prioritizedList: result.prioritizedList || [],
        examples: result.examples || {},
        riskAssessment: result.riskAssessment || {},
        confidence: result.confidence || 0.8,
        processingTime: result.processingTime || 0
      };
      
    } catch (error) {
      console.error('[MCPBridge] Refactoring recommendations failed:', error);
      throw error;
    }
  }
  
  async analyzeArchitecture(codebase, options = {}) {
    if (!this.connected) {
      throw new Error('Not connected to Serena');
    }
    
    const request = {
      type: 'analyze_architecture',
      data: {
        codebase,
        options: {
          includeVisualization: true,
          includeDependencies: true,
          includeRecommendations: true,
          includeComplexityMetrics: true,
          ...options
        }
      }
    };
    
    try {
      const result = await this.sendRequest(request);
      
      return {
        architecture: result.architecture || {},
        dependencies: result.dependencies || [],
        visualization: result.visualization || {},
        recommendations: result.recommendations || [],
        complexityMetrics: result.complexityMetrics || {},
        confidence: result.confidence || 0.8,
        processingTime: result.processingTime || 0
      };
      
    } catch (error) {
      console.error('[MCPBridge] Architecture analysis failed:', error);
      throw error;
    }
  }
  
  // CCR Integration methods
  
  async analyzeForRouting(request) {
    try {
      if (!this.connected) {
        console.warn('[MCPBridge] Not connected to Serena, skipping semantic analysis');
        return null;
      }
      
      const semanticAnalysis = await this.analyzeCode(request.content || '', {
        lightweight: true,
        includeComplexity: true,
        includePatterns: false // Skip heavy pattern detection for routing
      });
      
      return {
        complexity: semanticAnalysis.metrics?.complexity || 0.5,
        codeQuality: semanticAnalysis.metrics?.quality || 0.8,
        semanticPatterns: semanticAnalysis.patterns || [],
        recommendations: {
          useHighPerformance: semanticAnalysis.metrics?.complexity > 0.7,
          enableCaching: semanticAnalysis.metrics?.repeatability > 0.6,
          useParallel: semanticAnalysis.metrics?.parallelizable || false
        },
        confidence: semanticAnalysis.confidence || 0.7
      };
      
    } catch (error) {
      console.error('[MCPBridge] Routing analysis failed:', error);
      return null;
    }
  }
  
  // Statistics and monitoring
  
  updateResponseTimeStats(responseTime) {
    if (this.stats.averageResponseTime === 0) {
      this.stats.averageResponseTime = responseTime;
    } else {
      // Exponential moving average
      this.stats.averageResponseTime = (this.stats.averageResponseTime * 0.9) + (responseTime * 0.1);
    }
  }
  
  calculateSuccessRate() {
    const totalRequests = this.stats.requestsSent;
    const errors = this.stats.errorsEncountered;
    
    if (totalRequests === 0) return 1.0;
    
    return Math.max(0, (totalRequests - errors) / totalRequests);
  }
  
  getStats() {
    return {
      ...this.stats,
      connected: this.connected,
      pendingRequests: this.pendingRequests.size,
      capabilities: this.capabilities,
      successRate: Math.round(this.calculateSuccessRate() * 100),
      uptime: this.stats.lastConnected ? Date.now() - this.stats.connectionUptime : 0,
      reconnectAttempts: this.reconnectAttempts
    };
  }
  
  getCapabilities() {
    return {
      ...this.capabilities,
      connected: this.connected,
      averageResponseTime: Math.round(this.stats.averageResponseTime),
      successRate: this.calculateSuccessRate()
    };
  }
  
  // Health check
  
  async healthCheck() {
    if (!this.connected) {
      return {
        status: 'disconnected',
        error: 'Not connected to Serena'
      };
    }
    
    try {
      const startTime = Date.now();
      await this.sendRequest({
        type: 'health_check'
      }, 5000); // 5 second timeout
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime,
        connected: true,
        capabilities: this.capabilities,
        stats: this.getStats()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        connected: this.connected
      };
    }
  }
  
  async shutdown() {
    console.log('[MCPBridge] Shutting down Serena bridge...');
    
    try {
      // Send disconnect message
      if (this.connected && this.ws) {
        this.sendMessage({
          type: 'disconnect',
          reason: 'shutdown',
          timestamp: Date.now()
        });
      }
      
      // Close WebSocket connection
      if (this.ws) {
        this.ws.close();
      }
      
      // Clear pending requests
      for (const [requestId, pending] of this.pendingRequests) {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error('Bridge shutting down'));
      }
      this.pendingRequests.clear();
      
      this.connected = false;
      
      console.log('[MCPBridge] Serena bridge shutdown complete');
      this.emit('shutdown');
      
    } catch (error) {
      console.error('[MCPBridge] Shutdown error:', error);
    }
  }
}

module.exports = MCPBridge;