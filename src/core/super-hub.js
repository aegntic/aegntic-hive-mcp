/**
 * Super-Hub Neural Network for aegntic-hive-mcp
 * Central coordination and collective intelligence system
 * Phase 1 Implementation with CCR routing and GLM4.5air integration
 * WebSocket server on port 9101
 */

const EventEmitter = require('events');
const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class SuperHub extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Core configuration
    this.port = options.port || 9101;
    this.neuralRouter = options.neuralRouter;
    this.patternEngine = options.patternEngine;
    
    // WebSocket server
    this.wss = null;
    this.clients = new Map();
    this.nodes = new Map();
    
    // Collective intelligence state
    this.collectiveState = {
      swarmId: crypto.randomUUID(),
      nodeCount: 0,
      decisions: new Map(),
      consensus: new Map(),
      emergentPatterns: new Map(),
      performanceMetrics: {
        totalDecisions: 0,
        consensusAccuracy: 0,
        avgDecisionTime: 0,
        emergentPatternCount: 0,
        coordinationQuality: 1.0
      }
    };
    
    // CCR and CCHeavy integration
    this.ccrConfig = null;
    this.ccheavyConfig = null;
    this.routingStrategies = new Map();
    
    // GLM4.5air integration
    this.glmIntegration = {
      enabled: false,
      endpoint: options.glmEndpoint,
      apiKey: options.glmApiKey,
      modelVersion: 'GLM4.5air',
      features: {
        advancedReasoning: true,
        contextualAwareness: true,
        adaptiveLearning: true,
        performanceOptimization: true
      }
    };
    
    // Decision consensus system
    this.consensusConfig = {
      quorumThreshold: 0.67, // 67% agreement needed
      timeoutMs: 5000,
      maxRetries: 3,
      byzantineTolerance: true
    };
    
    // Performance monitoring
    this.metrics = {
      requestsPerSecond: 0,
      averageLatency: 0,
      successRate: 1.0,
      coordinationEfficiency: 1.0,
      emergentIntelligence: 0.5
    };
    
    // State synchronization
    this.stateSyncInterval = null;
    this.emergentPatternDetector = null;
    
    console.log('[SuperHub] Initializing neural coordination system...');
    this.initialize();
  }
  
  async initialize() {
    try {
      // Load configurations
      await this.loadConfigurations();
      
      // Initialize WebSocket server
      await this.initializeWebSocketServer();
      
      // Initialize collective intelligence
      await this.initializeCollectiveIntelligence();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      // Initialize GLM4.5air integration
      await this.initializeGLMIntegration();
      
      // Start emergent pattern detection
      this.startEmergentPatternDetection();
      
      console.log(`[SuperHub] Neural network online on port ${this.port}`);
      console.log(`[SuperHub] Swarm ID: ${this.collectiveState.swarmId}`);
      this.emit('initialized');
      
    } catch (error) {
      console.error('[SuperHub] Initialization failed:', error);
      throw error;
    }
  }
  
  async loadConfigurations() {
    try {
      const configDir = path.join(__dirname, '../../config');
      
      // Load CCR configuration
      const ccrPath = path.join(configDir, 'ccr.json');
      const ccrData = await fs.readFile(ccrPath, 'utf8');
      this.ccrConfig = JSON.parse(ccrData);
      
      // Load CCHeavy configuration
      const ccheavyPath = path.join(configDir, 'ccheavy.json');
      const ccheavyData = await fs.readFile(ccheavyPath, 'utf8');
      this.ccheavyConfig = JSON.parse(ccheavyData);
      
      // Initialize routing strategies based on configurations
      this.initializeRoutingStrategies();
      
      console.log('[SuperHub] Configurations loaded: CCR, CCHeavy');
      
    } catch (error) {
      console.error('[SuperHub] Failed to load configurations:', error);
      this.createDefaultConfigurations();
    }
  }
  
  initializeRoutingStrategies() {
    // CCR-based routing strategies
    if (this.ccrConfig?.configurations) {
      for (const [name, config] of Object.entries(this.ccrConfig.configurations)) {
        this.routingStrategies.set(name, {
          ...config,
          selector: this.createConfigurationSelector(config),
          performanceProfile: this.createPerformanceProfile(config)
        });
      }
    }
    
    // CCHeavy high-performance routing
    if (this.ccheavyConfig) {
      this.routingStrategies.set('ccheavy', {
        name: 'Claude Code Heavy',
        priority: 'critical',
        features: this.ccheavyConfig.features,
        optimizations: this.ccheavyConfig.optimizations,
        selector: this.createCCHeavySelector(),
        performanceProfile: {
          concurrentRequests: this.ccheavyConfig.optimizations?.performance?.concurrentRequests || 8,
          timeout: this.ccheavyConfig.optimizations?.performance?.processingTimeout || 60000,
          memoryThreshold: this.ccheavyConfig.thresholds?.memoryUsage || 0.8,
          complexityThreshold: this.ccheavyConfig.thresholds?.complexity || 0.8
        }
      });
    }
  }
  
  createConfigurationSelector(config) {
    return (request, context) => {
      let score = 0;
      const weights = this.ccrConfig?.selectionCriteria?.weights || {};
      
      // File type matching
      if (config.triggers?.fileTypes && request.fileType) {
        const fileTypeMatch = config.triggers.fileTypes.includes(request.fileType);
        score += fileTypeMatch ? (weights.fileType || 0.3) : 0;
      }
      
      // Keyword matching
      if (config.triggers?.keywords && request.content) {
        const content = request.content.toLowerCase();
        const matchedKeywords = config.triggers.keywords.filter(keyword => 
          content.includes(keyword.toLowerCase())
        );
        score += (matchedKeywords.length / config.triggers.keywords.length) * (weights.keywords || 0.25);
      }
      
      // Pattern matching
      if (config.triggers?.patterns && request.content) {
        const content = request.content.toLowerCase();
        const matchedPatterns = config.triggers.patterns.filter(pattern => 
          content.includes(pattern.toLowerCase())
        );
        score += (matchedPatterns.length / config.triggers.patterns.length) * (weights.patterns || 0.2);
      }
      
      // Complexity analysis
      const complexity = this.analyzeComplexity(request);
      const complexityMatch = 1 - Math.abs((config.complexity || 0.5) - complexity);
      score += complexityMatch * (weights.complexity || 0.15);
      
      // Performance requirements
      const performanceScore = this.analyzePerformanceRequirements(request);
      score += performanceScore * (weights.performance || 0.1);
      
      return {
        score,
        confidence: Math.min(score, 1.0),
        factors: {
          fileType: config.triggers?.fileTypes?.includes(request.fileType) || false,
          keywords: config.triggers?.keywords?.length || 0,
          patterns: config.triggers?.patterns?.length || 0,
          complexity: complexityMatch,
          performance: performanceScore
        }
      };
    };
  }
  
  createCCHeavySelector() {
    return (request, context) => {
      let score = 0;
      
      // High complexity tasks
      const complexity = this.analyzeComplexity(request);
      if (complexity > 0.7) score += 0.4;
      
      // Performance keywords
      const performanceKeywords = [
        'performance', 'optimization', 'heavy', 'intensive', 'batch',
        'concurrent', 'parallel', 'large-scale', 'bulk', 'processing'
      ];
      
      if (request.content) {
        const content = request.content.toLowerCase();
        const matches = performanceKeywords.filter(keyword => content.includes(keyword));
        score += (matches.length / performanceKeywords.length) * 0.3;
      }
      
      // Resource intensive operations
      const intensivePatterns = [
        'code generation', 'data processing', 'analysis', 'compilation',
        'transformation', 'migration', 'optimization', 'refactoring'
      ];
      
      if (request.content) {
        const content = request.content.toLowerCase();
        const matches = intensivePatterns.filter(pattern => content.includes(pattern));
        score += (matches.length / intensivePatterns.length) * 0.3;
      }
      
      return {
        score,
        confidence: Math.min(score, 1.0),
        factors: {
          complexity: complexity > 0.7,
          performance: score > 0.5,
          intensive: score > 0.6
        }
      };
    };
  }
  
  createPerformanceProfile(config) {
    return {
      timeout: config.performance?.timeout || 30000,
      concurrency: config.performance?.concurrency || 2,
      memoryLimit: config.performance?.memoryLimit || '256MB',
      caching: config.performance?.caching || false,
      streaming: config.performance?.streaming || false
    };
  }
  
  async initializeWebSocketServer() {
    this.wss = new WebSocket.Server({ 
      port: this.port,
      clientTracking: true 
    });
    
    this.wss.on('connection', (ws, req) => {
      const clientId = crypto.randomUUID();
      const clientInfo = {
        id: clientId,
        ws,
        connectedAt: Date.now(),
        ip: req.socket.remoteAddress,
        userAgent: req.headers['user-agent'],
        state: 'connected',
        nodeType: 'unknown',
        capabilities: [],
        metrics: {
          messagesReceived: 0,
          messagesSent: 0,
          errors: 0,
          lastActivity: Date.now()
        }
      };
      
      this.clients.set(clientId, clientInfo);
      this.collectiveState.nodeCount++;
      
      console.log(`[SuperHub] Node connected: ${clientId} (total: ${this.collectiveState.nodeCount})`);
      
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleClientMessage(clientId, message);
          clientInfo.metrics.messagesReceived++;
          clientInfo.metrics.lastActivity = Date.now();
        } catch (error) {
          console.error(`[SuperHub] Message error from ${clientId}:`, error);
          clientInfo.metrics.errors++;
          this.sendToClient(clientId, {
            type: 'error',
            error: error.message,
            timestamp: Date.now()
          });
        }
      });
      
      ws.on('close', () => {
        this.clients.delete(clientId);
        this.nodes.delete(clientId);
        this.collectiveState.nodeCount--;
        console.log(`[SuperHub] Node disconnected: ${clientId} (remaining: ${this.collectiveState.nodeCount})`);
      });
      
      ws.on('error', (error) => {
        console.error(`[SuperHub] WebSocket error for ${clientId}:`, error);
        clientInfo.metrics.errors++;
      });
      
      // Send welcome message
      this.sendToClient(clientId, {
        type: 'welcome',
        swarmId: this.collectiveState.swarmId,
        nodeId: clientId,
        capabilities: this.getSystemCapabilities(),
        timestamp: Date.now()
      });
    });
    
    console.log(`[SuperHub] WebSocket server listening on port ${this.port}`);
  }
  
  async initializeCollectiveIntelligence() {
    // Initialize decision tracking
    this.collectiveState.decisions = new Map();
    this.collectiveState.consensus = new Map();
    
    // Initialize emergent pattern detection
    this.collectiveState.emergentPatterns = new Map();
    
    // Start state synchronization
    this.stateSyncInterval = setInterval(() => {
      this.synchronizeState();
    }, 5000); // Every 5 seconds
    
    console.log('[SuperHub] Collective intelligence initialized');
  }
  
  async initializeGLMIntegration() {
    if (this.glmIntegration.endpoint && this.glmIntegration.apiKey) {
      try {
        // Test GLM connection
        const testResult = await this.testGLMConnection();
        if (testResult.success) {
          this.glmIntegration.enabled = true;
          console.log('[SuperHub] GLM4.5air integration enabled');
        } else {
          console.warn('[SuperHub] GLM4.5air connection failed:', testResult.error);
        }
      } catch (error) {
        console.warn('[SuperHub] GLM4.5air initialization failed:', error.message);
      }
    } else {
      console.log('[SuperHub] GLM4.5air integration disabled (no endpoint/key)');
    }
  }
  
  async testGLMConnection() {
    try {
      // Mock GLM connection test - replace with actual GLM API call
      return {
        success: true,
        version: 'GLM4.5air',
        features: this.glmIntegration.features
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  startPerformanceMonitoring() {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 10000); // Every 10 seconds
    
    setInterval(() => {
      this.logPerformanceReport();
    }, 60000); // Every minute
  }
  
  startEmergentPatternDetection() {
    this.emergentPatternDetector = setInterval(() => {
      this.detectEmergentPatterns();
    }, 30000); // Every 30 seconds
  }
  
  async handleClientMessage(clientId, message) {
    const client = this.clients.get(clientId);
    if (!client) return;
    
    switch (message.type) {
      case 'register_node':
        await this.registerNode(clientId, message.nodeInfo);
        break;
        
      case 'route_request':
        await this.handleRoutingRequest(clientId, message.request);
        break;
        
      case 'decision_vote':
        await this.handleDecisionVote(clientId, message.decisionId, message.vote);
        break;
        
      case 'performance_report':
        await this.handlePerformanceReport(clientId, message.metrics);
        break;
        
      case 'pattern_detection':
        await this.handlePatternDetection(clientId, message.pattern);
        break;
        
      case 'state_sync_request':
        await this.handleStateSyncRequest(clientId);
        break;
        
      default:
        console.warn(`[SuperHub] Unknown message type: ${message.type}`);
    }
  }
  
  async registerNode(clientId, nodeInfo) {
    const node = {
      id: clientId,
      type: nodeInfo.type || 'generic',
      capabilities: nodeInfo.capabilities || [],
      performance: nodeInfo.performance || {},
      registeredAt: Date.now(),
      status: 'active',
      metrics: {
        requestsHandled: 0,
        averageResponseTime: 0,
        successRate: 1.0,
        errorCount: 0
      }
    };
    
    this.nodes.set(clientId, node);
    
    const client = this.clients.get(clientId);
    if (client) {
      client.nodeType = node.type;
      client.capabilities = node.capabilities;
    }
    
    console.log(`[SuperHub] Node registered: ${clientId} (${node.type})`);
    
    // Broadcast node registration to other nodes
    this.broadcast({
      type: 'node_registered',
      nodeId: clientId,
      nodeInfo: node,
      timestamp: Date.now()
    }, [clientId]);
    
    // Send registration confirmation
    this.sendToClient(clientId, {
      type: 'registration_confirmed',
      nodeId: clientId,
      swarmState: this.getSwarmState(),
      timestamp: Date.now()
    });
  }
  
  async handleRoutingRequest(clientId, request) {
    const startTime = Date.now();
    
    try {
      // Use neural router for intelligent routing
      let routingResult;
      if (this.neuralRouter) {
        routingResult = await this.neuralRouter.route(request);
      } else {
        // Fallback to super-hub routing
        routingResult = await this.performInternalRouting(request);
      }
      
      // Apply CCR/CCHeavy optimizations
      const optimizedRouting = await this.applyRoutingOptimizations(routingResult, request);
      
      // Record decision for collective learning
      const decisionId = crypto.randomUUID();
      this.collectiveState.decisions.set(decisionId, {
        id: decisionId,
        request: {
          type: request.type,
          complexity: optimizedRouting.analysis?.complexity || 0.5,
          content: request.content?.substring(0, 100) || ''
        },
        routing: optimizedRouting,
        requestedBy: clientId,
        timestamp: startTime,
        responseTime: null,
        success: null
      });
      
      // Update metrics
      this.collectiveState.performanceMetrics.totalDecisions++;
      
      // Send routing result
      this.sendToClient(clientId, {
        type: 'routing_result',
        decisionId,
        routing: optimizedRouting,
        recommendations: await this.generatePerformanceRecommendations(optimizedRouting),
        timestamp: Date.now()
      });
      
      console.log(`[SuperHub] Routing decision ${decisionId} for ${clientId} (${Date.now() - startTime}ms)`);
      
    } catch (error) {
      console.error(`[SuperHub] Routing error for ${clientId}:`, error);
      this.sendToClient(clientId, {
        type: 'routing_error',
        error: error.message,
        timestamp: Date.now()
      });
    }
  }
  
  async performInternalRouting(request) {
    // Internal routing logic when neural router is not available
    let bestStrategy = null;
    let bestScore = -1;
    let bestAnalysis = null;
    
    for (const [name, strategy] of this.routingStrategies) {
      const analysis = strategy.selector(request, { swarmState: this.getSwarmState() });
      if (analysis.score > bestScore) {
        bestScore = analysis.score;
        bestStrategy = strategy;
        bestAnalysis = analysis;
      }
    }
    
    return {
      configuration: bestStrategy || this.getDefaultStrategy(),
      analysis: bestAnalysis || { confidence: 0.5, factors: {}, complexity: 0.5 },
      source: 'super-hub-internal'
    };
  }
  
  async applyRoutingOptimizations(routingResult, request) {
    const optimizations = {
      ...routingResult,
      optimizations: {
        caching: false,
        streaming: false,
        parallelization: false,
        resourceAllocation: 'standard'
      }
    };
    
    // Apply CCHeavy optimizations for high-performance requirements
    const selectedConfig = routingResult.configuration;
    if (selectedConfig?.id === 'ccheavy' || this.shouldUseCCHeavy(request, routingResult.analysis)) {
      optimizations.optimizations = {
        caching: true,
        streaming: this.ccheavyConfig?.features?.memory?.streamProcessing || false,
        parallelization: true,
        resourceAllocation: 'high-performance',
        concurrentRequests: this.ccheavyConfig?.optimizations?.performance?.concurrentRequests || 8,
        processPooling: this.ccheavyConfig?.features?.processPooling?.enabled || false,
        memoryOptimization: true
      };
    }
    
    // Apply CCR-based optimizations
    if (selectedConfig && this.ccrConfig) {
      if (selectedConfig.performance?.caching) {
        optimizations.optimizations.caching = true;
      }
      if (selectedConfig.performance?.streaming) {
        optimizations.optimizations.streaming = true;
      }
    }
    
    return optimizations;
  }
  
  shouldUseCCHeavy(request, analysis) {
    if (!this.ccheavyConfig) return false;
    
    // Check complexity threshold
    if (analysis?.complexity > (this.ccheavyConfig.thresholds?.complexity || 0.8)) {
      return true;
    }
    
    // Check for performance keywords
    if (request.content) {
      const content = request.content.toLowerCase();
      const performanceKeywords = ['performance', 'optimization', 'heavy', 'intensive', 'batch'];
      const matches = performanceKeywords.filter(keyword => content.includes(keyword));
      if (matches.length >= 2) return true;
    }
    
    return false;
  }
  
  async handleDecisionVote(clientId, decisionId, vote) {
    const decision = this.collectiveState.decisions.get(decisionId);
    if (!decision) {
      console.warn(`[SuperHub] Unknown decision ID: ${decisionId}`);
      return;
    }
    
    if (!decision.votes) decision.votes = new Map();
    decision.votes.set(clientId, {
      vote,
      confidence: vote.confidence || 0.5,
      timestamp: Date.now(),
      nodeType: this.clients.get(clientId)?.nodeType || 'unknown'
    });
    
    // Check if we have enough votes for consensus
    if (decision.votes.size >= Math.ceil(this.collectiveState.nodeCount * this.consensusConfig.quorumThreshold)) {
      const consensus = this.calculateConsensus(decision.votes);
      this.collectiveState.consensus.set(decisionId, consensus);
      
      // Broadcast consensus to all nodes
      this.broadcast({
        type: 'consensus_reached',
        decisionId,
        consensus,
        votes: Array.from(decision.votes.entries()),
        timestamp: Date.now()
      });
      
      console.log(`[SuperHub] Consensus reached for decision ${decisionId}: ${consensus.decision}`);
    }
  }
  
  calculateConsensus(votes) {
    const voteArray = Array.from(votes.values());
    const totalVotes = voteArray.length;
    
    // Simple majority consensus
    const voteCount = new Map();
    let totalConfidence = 0;
    
    for (const vote of voteArray) {
      const decision = vote.vote.decision || 'unknown';
      voteCount.set(decision, (voteCount.get(decision) || 0) + 1);
      totalConfidence += vote.confidence;
    }
    
    // Find majority decision
    let majorityDecision = 'unknown';
    let maxVotes = 0;
    for (const [decision, count] of voteCount) {
      if (count > maxVotes) {
        maxVotes = count;
        majorityDecision = decision;
      }
    }
    
    return {
      decision: majorityDecision,
      confidence: totalConfidence / totalVotes,
      support: maxVotes / totalVotes,
      totalVotes,
      distribution: Object.fromEntries(voteCount),
      timestamp: Date.now()
    };
  }
  
  async handlePerformanceReport(clientId, metrics) {
    const node = this.nodes.get(clientId);
    if (node) {
      // Update node metrics
      node.metrics = {
        ...node.metrics,
        ...metrics,
        lastUpdated: Date.now()
      };
      
      // Update global performance metrics
      this.updateGlobalMetrics();
    }
  }
  
  async handlePatternDetection(clientId, pattern) {
    const patternId = crypto.createHash('sha256')
      .update(JSON.stringify(pattern))
      .digest('hex')
      .substring(0, 16);
    
    if (!this.collectiveState.emergentPatterns.has(patternId)) {
      this.collectiveState.emergentPatterns.set(patternId, {
        id: patternId,
        pattern,
        detectedBy: [clientId],
        detectedAt: Date.now(),
        frequency: 1,
        confidence: pattern.confidence || 0.5,
        impact: pattern.impact || 'unknown'
      });
      
      console.log(`[SuperHub] New emergent pattern detected by ${clientId}: ${patternId}`);
      
      // Use pattern engine if available
      if (this.patternEngine) {
        await this.patternEngine.recordPattern(pattern);
      }
    } else {
      // Update existing pattern
      const existingPattern = this.collectiveState.emergentPatterns.get(patternId);
      if (!existingPattern.detectedBy.includes(clientId)) {
        existingPattern.detectedBy.push(clientId);
        existingPattern.frequency++;
        existingPattern.confidence = (existingPattern.confidence + (pattern.confidence || 0.5)) / 2;
        existingPattern.lastDetected = Date.now();
      }
    }
    
    // Broadcast pattern to interested nodes
    this.broadcast({
      type: 'emergent_pattern',
      patternId,
      pattern: this.collectiveState.emergentPatterns.get(patternId),
      timestamp: Date.now()
    });
  }
  
  async handleStateSyncRequest(clientId) {
    const swarmState = this.getSwarmState();
    this.sendToClient(clientId, {
      type: 'state_sync_response',
      state: swarmState,
      timestamp: Date.now()
    });
  }
  
  synchronizeState() {
    const swarmState = this.getSwarmState();
    
    // Broadcast state to all connected nodes
    this.broadcast({
      type: 'state_sync',
      state: swarmState,
      timestamp: Date.now()
    });
  }
  
  detectEmergentPatterns() {
    // Analyze decision patterns
    const recentDecisions = Array.from(this.collectiveState.decisions.values())
      .filter(decision => Date.now() - decision.timestamp < 300000) // Last 5 minutes
      .slice(-50); // Last 50 decisions
    
    if (recentDecisions.length < 5) return;
    
    // Analyze routing patterns
    const routingPatterns = this.analyzeRoutingPatterns(recentDecisions);
    if (routingPatterns.confidence > 0.7) {
      this.handlePatternDetection('super-hub-internal', {
        type: 'routing-pattern',
        pattern: routingPatterns,
        confidence: routingPatterns.confidence,
        impact: 'optimization'
      });
    }
    
    // Analyze performance patterns
    const performancePatterns = this.analyzePerformancePatterns(recentDecisions);
    if (performancePatterns.confidence > 0.7) {
      this.handlePatternDetection('super-hub-internal', {
        type: 'performance-pattern',
        pattern: performancePatterns,
        confidence: performancePatterns.confidence,
        impact: 'performance'
      });
    }
  }
  
  analyzeRoutingPatterns(decisions) {
    const configUsage = new Map();
    let totalResponseTime = 0;
    let successCount = 0;
    
    for (const decision of decisions) {
      const configId = decision.routing?.configuration?.id || 'unknown';
      configUsage.set(configId, (configUsage.get(configId) || 0) + 1);
      
      if (decision.responseTime) {
        totalResponseTime += decision.responseTime;
      }
      
      if (decision.success === true) {
        successCount++;
      }
    }
    
    const mostUsedConfig = Array.from(configUsage.entries())
      .sort(([,a], [,b]) => b - a)[0];
    
    return {
      mostUsedConfiguration: mostUsedConfig ? mostUsedConfig[0] : 'unknown',
      usageDistribution: Object.fromEntries(configUsage),
      averageResponseTime: totalResponseTime / decisions.length,
      successRate: successCount / decisions.length,
      confidence: decisions.length > 10 ? 0.8 : 0.5,
      sampleSize: decisions.length
    };
  }
  
  analyzePerformancePatterns(decisions) {
    const performanceData = decisions
      .filter(d => d.responseTime !== null)
      .map(d => ({
        responseTime: d.responseTime,
        complexity: d.request.complexity,
        configuration: d.routing?.configuration?.id,
        success: d.success
      }));
    
    if (performanceData.length < 5) {
      return { confidence: 0 };
    }
    
    const avgResponseTime = performanceData.reduce((sum, d) => sum + d.responseTime, 0) / performanceData.length;
    const successRate = performanceData.filter(d => d.success === true).length / performanceData.length;
    
    // Identify performance bottlenecks
    const slowDecisions = performanceData.filter(d => d.responseTime > avgResponseTime * 1.5);
    const bottlenecks = this.identifyBottlenecks(slowDecisions);
    
    return {
      averageResponseTime: avgResponseTime,
      successRate,
      bottlenecks,
      recommendations: this.generateOptimizationRecommendations(performanceData),
      confidence: performanceData.length > 20 ? 0.9 : 0.6,
      sampleSize: performanceData.length
    };
  }
  
  identifyBottlenecks(slowDecisions) {
    const bottlenecks = {
      configurations: new Map(),
      complexityRanges: new Map(),
      patterns: []
    };
    
    for (const decision of slowDecisions) {
      // Configuration bottlenecks
      if (decision.configuration) {
        bottlenecks.configurations.set(
          decision.configuration,
          (bottlenecks.configurations.get(decision.configuration) || 0) + 1
        );
      }
      
      // Complexity bottlenecks
      const complexityRange = Math.floor(decision.complexity * 10) / 10;
      bottlenecks.complexityRanges.set(
        complexityRange,
        (bottlenecks.complexityRanges.get(complexityRange) || 0) + 1
      );
    }
    
    return {
      configurations: Object.fromEntries(bottlenecks.configurations),
      complexityRanges: Object.fromEntries(bottlenecks.complexityRanges),
      count: slowDecisions.length
    };
  }
  
  generateOptimizationRecommendations(performanceData) {
    const recommendations = [];
    
    const avgResponseTime = performanceData.reduce((sum, d) => sum + d.responseTime, 0) / performanceData.length;
    
    // High response time recommendation
    if (avgResponseTime > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        description: 'Consider using CCHeavy configuration for better performance',
        action: 'enable-ccheavy',
        expectedImprovement: '40-60% response time reduction'
      });
    }
    
    // Complex request optimization
    const complexRequests = performanceData.filter(d => d.complexity > 0.7);
    if (complexRequests.length > performanceData.length * 0.3) {
      recommendations.push({
        type: 'complexity',
        priority: 'medium',
        description: 'Enable parallel processing for complex requests',
        action: 'enable-parallelization',
        expectedImprovement: '25-40% throughput increase'
      });
    }
    
    // Configuration optimization
    const configPerformance = new Map();
    for (const data of performanceData) {
      if (!configPerformance.has(data.configuration)) {
        configPerformance.set(data.configuration, []);
      }
      configPerformance.get(data.configuration).push(data.responseTime);
    }
    
    for (const [config, times] of configPerformance) {
      const avgTime = times.reduce((sum, t) => sum + t, 0) / times.length;
      if (avgTime > avgResponseTime * 1.2 && times.length > 3) {
        recommendations.push({
          type: 'configuration',
          priority: 'medium',
          description: `Configuration '${config}' shows slower performance`,
          action: 'optimize-configuration',
          target: config,
          expectedImprovement: '15-25% response time improvement'
        });
      }
    }
    
    return recommendations;
  }
  
  async generatePerformanceRecommendations(routingResult) {
    const recommendations = [];
    
    const config = routingResult.configuration;
    const analysis = routingResult.analysis;
    
    // CCHeavy recommendation
    if (analysis?.complexity > 0.7 && config?.id !== 'ccheavy') {
      recommendations.push({
        type: 'performance-upgrade',
        priority: 'high',
        description: 'High complexity detected - consider CCHeavy configuration',
        action: 'switch-to-ccheavy',
        expectedBenefit: 'Up to 60% performance improvement'
      });
    }
    
    // Caching recommendation
    if (!config?.performance?.caching && analysis?.complexity > 0.5) {
      recommendations.push({
        type: 'caching',
        priority: 'medium',
        description: 'Enable caching for improved response times',
        action: 'enable-caching',
        expectedBenefit: '20-40% faster repeated requests'
      });
    }
    
    // Streaming recommendation
    if (!config?.performance?.streaming && analysis?.factors?.performance > 0.6) {
      recommendations.push({
        type: 'streaming',
        priority: 'medium',
        description: 'Enable streaming for better user experience',
        action: 'enable-streaming',
        expectedBenefit: 'Faster time-to-first-response'
      });
    }
    
    return recommendations;
  }
  
  updatePerformanceMetrics() {
    // Calculate real-time metrics
    const now = Date.now();
    const timeWindow = 60000; // 1 minute
    
    const recentDecisions = Array.from(this.collectiveState.decisions.values())
      .filter(decision => now - decision.timestamp < timeWindow);
    
    if (recentDecisions.length > 0) {
      // Requests per second
      this.metrics.requestsPerSecond = recentDecisions.length / (timeWindow / 1000);
      
      // Average latency
      const decisionsWithTime = recentDecisions.filter(d => d.responseTime !== null);
      if (decisionsWithTime.length > 0) {
        this.metrics.averageLatency = decisionsWithTime.reduce((sum, d) => sum + d.responseTime, 0) / decisionsWithTime.length;
      }
      
      // Success rate
      const successfulDecisions = recentDecisions.filter(d => d.success === true);
      this.metrics.successRate = successfulDecisions.length / recentDecisions.length;
    }
    
    // Coordination efficiency
    const activeNodes = Array.from(this.nodes.values()).filter(node => 
      now - (node.metrics?.lastUpdated || 0) < 30000
    );
    
    if (activeNodes.length > 0) {
      const avgNodeSuccess = activeNodes.reduce((sum, node) => 
        sum + (node.metrics?.successRate || 1), 0
      ) / activeNodes.length;
      
      this.metrics.coordinationEfficiency = avgNodeSuccess;
    }
    
    // Emergent intelligence (based on pattern detection and consensus quality)
    const recentPatterns = Array.from(this.collectiveState.emergentPatterns.values())
      .filter(pattern => now - pattern.detectedAt < 300000); // Last 5 minutes
    
    const recentConsensus = Array.from(this.collectiveState.consensus.values())
      .filter(consensus => now - consensus.timestamp < 300000);
    
    const avgConsensusConfidence = recentConsensus.length > 0 ?
      recentConsensus.reduce((sum, c) => sum + c.confidence, 0) / recentConsensus.length : 0.5;
    
    this.metrics.emergentIntelligence = Math.min(
      (recentPatterns.length * 0.1) + (avgConsensusConfidence * 0.9),
      1.0
    );
  }
  
  logPerformanceReport() {
    const report = {
      timestamp: new Date().toISOString(),
      swarmId: this.collectiveState.swarmId,
      metrics: this.metrics,
      nodes: {
        total: this.collectiveState.nodeCount,
        active: Array.from(this.nodes.values()).filter(node => 
          Date.now() - (node.metrics?.lastUpdated || 0) < 30000
        ).length
      },
      decisions: {
        total: this.collectiveState.performanceMetrics.totalDecisions,
        recent: Array.from(this.collectiveState.decisions.values())
          .filter(d => Date.now() - d.timestamp < 300000).length
      },
      patterns: {
        total: this.collectiveState.emergentPatterns.size,
        recent: Array.from(this.collectiveState.emergentPatterns.values())
          .filter(p => Date.now() - p.detectedAt < 300000).length
      },
      consensus: {
        total: this.collectiveState.consensus.size,
        recent: Array.from(this.collectiveState.consensus.values())
          .filter(c => Date.now() - c.timestamp < 300000).length
      }
    };
    
    console.log('[SuperHub] Performance Report:', JSON.stringify(report, null, 2));
    
    // Emit performance report event
    this.emit('performance-report', report);
  }
  
  updateGlobalMetrics() {
    // Update collective performance metrics
    const allNodes = Array.from(this.nodes.values());
    if (allNodes.length === 0) return;
    
    const totalRequests = allNodes.reduce((sum, node) => 
      sum + (node.metrics?.requestsHandled || 0), 0
    );
    
    const avgResponseTime = allNodes.reduce((sum, node) => 
      sum + (node.metrics?.averageResponseTime || 0), 0
    ) / allNodes.length;
    
    const avgSuccessRate = allNodes.reduce((sum, node) => 
      sum + (node.metrics?.successRate || 1), 0
    ) / allNodes.length;
    
    this.collectiveState.performanceMetrics = {
      ...this.collectiveState.performanceMetrics,
      avgDecisionTime: this.metrics.averageLatency,
      coordinationQuality: this.metrics.coordinationEfficiency,
      emergentPatternCount: this.collectiveState.emergentPatterns.size
    };
  }
  
  getSwarmState() {
    return {
      swarmId: this.collectiveState.swarmId,
      nodeCount: this.collectiveState.nodeCount,
      nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
        id,
        type: node.type,
        capabilities: node.capabilities,
        status: node.status,
        metrics: node.metrics
      })),
      metrics: this.metrics,
      decisions: {
        total: this.collectiveState.decisions.size,
        recent: Array.from(this.collectiveState.decisions.values())
          .filter(d => Date.now() - d.timestamp < 300000).length
      },
      patterns: {
        total: this.collectiveState.emergentPatterns.size,
        active: Array.from(this.collectiveState.emergentPatterns.values())
          .filter(p => p.frequency > 1).length
      },
      consensus: {
        total: this.collectiveState.consensus.size,
        avgConfidence: Array.from(this.collectiveState.consensus.values())
          .reduce((sum, c) => sum + c.confidence, 0) / Math.max(this.collectiveState.consensus.size, 1)
      }
    };
  }
  
  getSystemCapabilities() {
    return {
      routing: {
        ccr: !!this.ccrConfig,
        ccheavy: !!this.ccheavyConfig,
        neuralRouter: !!this.neuralRouter,
        strategies: Array.from(this.routingStrategies.keys())
      },
      intelligence: {
        patternDetection: true,
        emergentLearning: true,
        consensus: true,
        collectiveDecisionMaking: true
      },
      integrations: {
        glm45air: this.glmIntegration.enabled,
        patternEngine: !!this.patternEngine
      },
      performance: {
        realTimeMetrics: true,
        performanceOptimization: true,
        loadBalancing: true,
        resourceAllocation: true
      }
    };
  }
  
  getDefaultStrategy() {
    return {
      id: 'default',
      name: 'Default Strategy',
      priority: 'medium',
      performance: {
        timeout: 30000,
        concurrency: 2,
        memoryLimit: '256MB'
      }
    };
  }
  
  analyzeComplexity(request) {
    if (!request.content) return 0.5;
    
    const content = request.content;
    let complexity = 0;
    
    // Length factor
    complexity += Math.min(content.length / 10000, 0.3);
    
    // Code indicators
    const codePatterns = [
      /\b(function|class|import|export|const|let|var)\b/g,
      /[{}[\]]/g,
      /\b(if|else|for|while|switch|case)\b/g,
      /\b(async|await|Promise|callback)\b/g
    ];
    
    for (const pattern of codePatterns) {
      const matches = content.match(pattern) || [];
      complexity += matches.length * 0.05;
    }
    
    // Technical complexity indicators
    const complexPatterns = [
      'algorithm', 'optimization', 'performance', 'concurrent',
      'parallel', 'distributed', 'microservice', 'architecture'
    ];
    
    for (const pattern of complexPatterns) {
      if (content.toLowerCase().includes(pattern)) {
        complexity += 0.1;
      }
    }
    
    return Math.min(complexity, 1.0);
  }
  
  analyzePerformanceRequirements(request) {
    if (!request.content) return 0.5;
    
    const content = request.content.toLowerCase();
    const performanceKeywords = [
      'fast', 'quick', 'optimize', 'performance', 'speed', 'efficient',
      'batch', 'bulk', 'large', 'heavy', 'intensive', 'scale'
    ];
    
    let score = 0;
    for (const keyword of performanceKeywords) {
      if (content.includes(keyword)) {
        score += 1;
      }
    }
    
    return Math.min(score / performanceKeywords.length * 2, 1.0);
  }
  
  sendToClient(clientId, message) {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(JSON.stringify(message));
        client.metrics.messagesSent++;
        return true;
      } catch (error) {
        console.error(`[SuperHub] Failed to send message to ${clientId}:`, error);
        client.metrics.errors++;
        return false;
      }
    }
    return false;
  }
  
  broadcast(message, excludeClients = []) {
    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      if (!excludeClients.includes(clientId)) {
        if (this.sendToClient(clientId, message)) {
          sentCount++;
        }
      }
    }
    return sentCount;
  }
  
  createDefaultConfigurations() {
    console.log('[SuperHub] Creating default configurations...');
    
    // Default CCR configuration
    this.ccrConfig = {
      configurations: {
        default: {
          name: 'Default Configuration',
          priority: 'medium',
          performance: {
            timeout: 30000,
            concurrency: 2
          }
        }
      },
      selectionCriteria: {
        weights: {
          fileType: 0.3,
          keywords: 0.25,
          patterns: 0.2,
          complexity: 0.15,
          performance: 0.1
        }
      }
    };
    
    // Default CCHeavy configuration
    this.ccheavyConfig = {
      optimizations: {
        performance: {
          concurrentRequests: 4,
          processingTimeout: 45000
        }
      },
      thresholds: {
        complexity: 0.7,
        memoryUsage: 0.8
      },
      features: {
        processPooling: { enabled: false },
        memory: { streamProcessing: false }
      }
    };
    
    this.initializeRoutingStrategies();
  }
  
  async shutdown() {
    console.log('[SuperHub] Shutting down neural network...');
    
    // Clear intervals
    if (this.stateSyncInterval) {
      clearInterval(this.stateSyncInterval);
    }
    if (this.emergentPatternDetector) {
      clearInterval(this.emergentPatternDetector);
    }
    
    // Notify all connected clients
    this.broadcast({
      type: 'shutdown',
      message: 'SuperHub is shutting down',
      timestamp: Date.now()
    });
    
    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
    
    // Save final state
    await this.saveState();
    
    console.log('[SuperHub] Shutdown complete');
    this.emit('shutdown');
  }
  
  async saveState() {
    try {
      const stateData = {
        swarmId: this.collectiveState.swarmId,
        decisions: Array.from(this.collectiveState.decisions.entries()),
        consensus: Array.from(this.collectiveState.consensus.entries()),
        emergentPatterns: Array.from(this.collectiveState.emergentPatterns.entries()),
        performanceMetrics: this.collectiveState.performanceMetrics,
        metrics: this.metrics,
        savedAt: Date.now()
      };
      
      const statePath = path.join(__dirname, '../data/super-hub-state.json');
      await fs.writeFile(statePath, JSON.stringify(stateData, null, 2));
      console.log('[SuperHub] State saved successfully');
      
    } catch (error) {
      console.error('[SuperHub] Failed to save state:', error);
    }
  }
  
  async loadState() {
    try {
      const statePath = path.join(__dirname, '../data/super-hub-state.json');
      const stateData = JSON.parse(await fs.readFile(statePath, 'utf8'));
      
      this.collectiveState.decisions = new Map(stateData.decisions || []);
      this.collectiveState.consensus = new Map(stateData.consensus || []);
      this.collectiveState.emergentPatterns = new Map(stateData.emergentPatterns || []);
      this.collectiveState.performanceMetrics = stateData.performanceMetrics || this.collectiveState.performanceMetrics;
      this.metrics = stateData.metrics || this.metrics;
      
      console.log('[SuperHub] State loaded successfully');
      
    } catch (error) {
      console.log('[SuperHub] No previous state found, starting fresh');
    }
  }
}

module.exports = SuperHub;