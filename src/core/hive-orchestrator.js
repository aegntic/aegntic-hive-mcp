/**
 * Aegntic Hive-Mind Orchestrator
 * Main coordination system for Phase 1 implementation
 * Integrates SuperHub, PatternEngine, NeuralRouter, Serena Bridge, and Dual-Memory Architecture
 * horizon-beta strategic coordination with CCR routing and GLM4.5air
 * 
 * ENHANCED WITH DUAL-MEMORY SYSTEM:
 * - Memory-aware routing decisions based on historical patterns
 * - Automatic learning from past interactions and outcomes
 * - Pattern-based optimization using strategic and operational memory
 * - Memory persistence across sessions for continuous improvement
 * - Cross-memory correlation analysis for enhanced decision making
 */

const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;

// Core components
const SuperHub = require('./super-hub');
const PatternEngine = require('./pattern-engine');
const NeuralRouter = require('./neural-router');

// Dual-Memory Architecture
const MemoryOrchestrator = require('./memory-orchestrator');

// Serena integration
const MCPBridge = require('../integrations/serena/mcp-bridge');
const SemanticAdapter = require('../integrations/serena/semantic-adapter');

class HiveOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.config = {
      port: options.port || 9100,
      superHubPort: options.superHubPort || 9101,
      serenaPort: options.serenaPort || 9102,
      enableGLM4Air: options.enableGLM4Air !== false,
      enableSerena: options.enableSerena !== false,
      performanceMode: options.performanceMode || 'ccheavy',
      ...options
    };
    
    // Component instances
    this.superHub = null;
    this.patternEngine = null;
    this.neuralRouter = null;
    this.mcpBridge = null;
    this.semanticAdapter = null;
    this.memoryOrchestrator = null;
    
    // System state
    this.state = 'initializing';
    this.startTime = Date.now();
    this.components = new Map();
    this.healthStatus = new Map();
    
    // Performance metrics
    this.metrics = {
      requestsProcessed: 0,
      avgResponseTime: 0,
      errorRate: 0,
      accuracyRate: 0,
      uptime: 0,
      componentsActive: 0,
      lastHealthCheck: null
    };
    
    // CCR and CCHeavy configurations
    this.ccrConfig = null;
    this.ccheavyConfig = null;
    
    console.log('[HiveOrchestrator] Initializing Aegntic Hive-Mind system...');
    console.log(`[HiveOrchestrator] Performance mode: ${this.config.performanceMode}`);
    console.log(`[HiveOrchestrator] GLM4.5air integration: ${this.config.enableGLM4Air ? 'enabled' : 'disabled'}`);
    console.log(`[HiveOrchestrator] Serena integration: ${this.config.enableSerena ? 'enabled' : 'disabled'}`);
  }
  
  async initialize() {
    try {
      console.log('[HiveOrchestrator] Starting Phase 1 initialization...');
      this.state = 'initializing';
      
      // Load configurations
      await this.loadConfigurations();
      
      // Initialize core components in dependency order
      await this.initializePatternEngine();
      await this.initializeNeuralRouter();
      await this.initializeMemoryOrchestrator();
      await this.initializeSuperHub();
      
      // Initialize integrations
      if (this.config.enableSerena) {
        await this.initializeSerenaIntegration();
      }
      
      // Setup cross-component communication
      await this.setupCommunication();
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      // Mark as operational
      this.state = 'operational';
      
      console.log('[HiveOrchestrator] Phase 1 initialization complete');
      console.log(`[HiveOrchestrator] System operational with ${this.components.size} active components`);
      
      this.emit('initialized', {
        components: Array.from(this.components.keys()),
        metrics: this.getMetrics(),
        timestamp: Date.now()
      });
      
      return true;
      
    } catch (error) {
      console.error('[HiveOrchestrator] Initialization failed:', error);
      this.state = 'error';
      this.emit('initialization-failed', error);
      throw error;
    }
  }
  
  async loadConfigurations() {
    try {
      // Load CCR configuration
      const ccrPath = path.join(__dirname, '../../config/ccr.json');
      const ccrData = await fs.readFile(ccrPath, 'utf8');
      this.ccrConfig = JSON.parse(ccrData);
      console.log('[HiveOrchestrator] CCR configuration loaded');
      
      // Load CCHeavy configuration
      const ccheavyPath = path.join(__dirname, '../../config/ccheavy.json');
      const ccheavyData = await fs.readFile(ccheavyPath, 'utf8');
      this.ccheavyConfig = JSON.parse(ccheavyData);
      console.log('[HiveOrchestrator] CCHeavy configuration loaded');
      
      // Validate performance thresholds
      this.validatePerformanceThresholds();
      
    } catch (error) {
      console.error('[HiveOrchestrator] Configuration loading failed:', error);
      throw new Error(`Configuration loading failed: ${error.message}`);
    }
  }
  
  validatePerformanceThresholds() {
    const required = this.ccheavyConfig.thresholds;
    
    if (required.responseTime > 5000) {
      console.warn('[HiveOrchestrator] Response time threshold exceeds 5s target');
    }
    
    if (required.complexity < 0.85) {
      console.warn('[HiveOrchestrator] Complexity threshold below 85% accuracy target');
    }
    
    console.log('[HiveOrchestrator] Performance thresholds validated');
  }
  
  async initializePatternEngine() {
    try {
      console.log('[HiveOrchestrator] Initializing PatternEngine...');
      
      this.patternEngine = new PatternEngine({
        ccrConfig: this.ccrConfig,
        ccheavyConfig: this.ccheavyConfig,
        enableGLM4Air: this.config.enableGLM4Air
      });
      
      await this.patternEngine.initialize();
      
      this.components.set('pattern-engine', {
        instance: this.patternEngine,
        status: 'active',
        startTime: Date.now(),
        healthCheck: () => this.patternEngine.getStats()
      });
      
      console.log('[HiveOrchestrator] PatternEngine initialized');
      
    } catch (error) {
      console.error('[HiveOrchestrator] PatternEngine initialization failed:', error);
      throw error;
    }
  }
  
  async initializeNeuralRouter() {
    try {
      console.log('[HiveOrchestrator] Initializing NeuralRouter...');
      
      this.neuralRouter = new NeuralRouter({
        ccrConfig: this.ccrConfig,
        ccheavyConfig: this.ccheavyConfig,
        patternEngine: this.patternEngine,
        enableGLM4Air: this.config.enableGLM4Air
      });
      
      await this.neuralRouter.initialize();
      
      this.components.set('neural-router', {
        instance: this.neuralRouter,
        status: 'active',
        startTime: Date.now(),
        healthCheck: () => this.neuralRouter.getStats()
      });
      
      console.log('[HiveOrchestrator] NeuralRouter initialized');
      
    } catch (error) {
      console.error('[HiveOrchestrator] NeuralRouter initialization failed:', error);
      throw error;
    }
  }
  
  async initializeMemoryOrchestrator() {
    try {
      console.log('[HiveOrchestrator] Initializing MemoryOrchestrator...');
      
      this.memoryOrchestrator = new MemoryOrchestrator({
        promotionThreshold: 0.75,
        retentionPeriod: 86400000, // 24 hours
        fusionWeights: {
          strategic: 0.6,
          operational: 0.4,
          temporal: 0.2
        },
        correlationThreshold: 0.65,
        maxOperationalEntries: 10000,
        compressionInterval: 3600000, // 1 hour
        enableAutoPromotion: true,
        enablePatternLearning: true
      });
      
      await this.memoryOrchestrator.initialize();
      
      this.components.set('memory-orchestrator', {
        instance: this.memoryOrchestrator,
        status: 'active',
        startTime: Date.now(),
        healthCheck: () => this.memoryOrchestrator.getStatus()
      });
      
      console.log('[HiveOrchestrator] MemoryOrchestrator initialized');
      
    } catch (error) {
      console.error('[HiveOrchestrator] MemoryOrchestrator initialization failed:', error);
      throw error;
    }
  }
  
  async initializeSuperHub() {
    try {
      console.log('[HiveOrchestrator] Initializing SuperHub...');
      
      this.superHub = new SuperHub({
        port: this.config.superHubPort,
        patternEngine: this.patternEngine,
        neuralRouter: this.neuralRouter,
        ccrConfig: this.ccrConfig,
        ccheavyConfig: this.ccheavyConfig,
        enableGLM4Air: this.config.enableGLM4Air
      });
      
      await this.superHub.initialize();
      
      this.components.set('super-hub', {
        instance: this.superHub,
        status: 'active',
        startTime: Date.now(),
        healthCheck: () => this.superHub.getStats()
      });
      
      console.log(`[HiveOrchestrator] SuperHub initialized on port ${this.config.superHubPort}`);
      
    } catch (error) {
      console.error('[HiveOrchestrator] SuperHub initialization failed:', error);
      throw error;
    }
  }
  
  async initializeSerenaIntegration() {
    try {
      console.log('[HiveOrchestrator] Initializing Serena integration...');
      
      // Initialize MCP Bridge
      this.mcpBridge = new MCPBridge({
        serenaEndpoint: `ws://localhost:${this.config.serenaPort}`,
        superHub: this.superHub,
        patternEngine: this.patternEngine,
        reconnectDelay: 5000,
        maxReconnectAttempts: 10
      });
      
      // Initialize Semantic Adapter
      this.semanticAdapter = new SemanticAdapter({
        mcpBridge: this.mcpBridge,
        ccrConfig: this.ccrConfig,
        ccheavyConfig: this.ccheavyConfig,
        enableFallback: true
      });
      
      await this.semanticAdapter.initialize();
      
      this.components.set('mcp-bridge', {
        instance: this.mcpBridge,
        status: 'active',
        startTime: Date.now(),
        healthCheck: () => this.mcpBridge.healthCheck()
      });
      
      this.components.set('semantic-adapter', {
        instance: this.semanticAdapter,
        status: 'active',
        startTime: Date.now(),
        healthCheck: () => this.semanticAdapter.getStats()
      });
      
      console.log('[HiveOrchestrator] Serena integration initialized');
      
    } catch (error) {
      console.warn('[HiveOrchestrator] Serena integration failed, continuing without it:', error);
      // Continue without Serena integration
    }
  }
  
  async setupCommunication() {
    try {
      console.log('[HiveOrchestrator] Setting up cross-component communication...');
      
      // PatternEngine -> NeuralRouter communication
      this.patternEngine.on('pattern-learned', (pattern) => {
        if (this.neuralRouter) {
          this.neuralRouter.updateFromPattern(pattern);
        }
      });
      
      this.patternEngine.on('anti-pattern-detected', (antiPattern) => {
        if (this.neuralRouter) {
          this.neuralRouter.avoidPattern(antiPattern);
        }
      });
      
      // NeuralRouter -> SuperHub communication
      this.neuralRouter.on('routing-decision', (decision) => {
        if (this.superHub) {
          this.superHub.recordRoutingDecision(decision);
        }
      });
      
      this.neuralRouter.on('performance-metrics', (metrics) => {
        this.updateMetrics(metrics);
      });
      
      // SuperHub -> PatternEngine communication
      this.superHub.on('collective-decision', (decision) => {
        if (this.patternEngine) {
          this.patternEngine.recordCollectiveDecision(decision);
        }
      });
      
      this.superHub.on('node-performance', (nodeStats) => {
        if (this.patternEngine) {
          this.patternEngine.updateNodePerformance(nodeStats);
        }
      });
      
      // Serena integration communication
      if (this.mcpBridge && this.semanticAdapter) {
        this.mcpBridge.on('analysis-result', (result) => {
          if (this.patternEngine) {
            this.patternEngine.recordSemanticAnalysis(result);
          }
        });
        
        this.semanticAdapter.on('routing-recommendation', (recommendation) => {
          if (this.neuralRouter) {
            this.neuralRouter.applySemanticRecommendation(recommendation);
          }
        });
      }
      
      // ====================
      // MEMORY SYSTEM COMMUNICATION
      // ====================
      
      if (this.memoryOrchestrator) {
        console.log('[HiveOrchestrator] Setting up memory system communication...');
        
        // Memory -> PatternEngine: Learn from memory patterns
        this.memoryOrchestrator.on('pattern-detected', (pattern) => {
          if (this.patternEngine) {
            this.patternEngine.recordMemoryPattern(pattern);
          }
        });
        
        this.memoryOrchestrator.on('correlation-discovered', (correlation) => {
          if (this.patternEngine) {
            this.patternEngine.recordCorrelation(correlation);
          }
        });
        
        // Memory -> NeuralRouter: Update routing based on memory insights
        this.memoryOrchestrator.on('memory-promoted', (promotion) => {
          if (this.neuralRouter) {
            this.neuralRouter.updateFromMemoryPromotion(promotion);
          }
        });
        
        this.memoryOrchestrator.on('strategic-update', (update) => {
          if (this.neuralRouter) {
            this.neuralRouter.incorporateStrategicUpdate(update);
          }
        });
        
        // Memory -> SuperHub: Share strategic insights with collective intelligence
        this.memoryOrchestrator.on('strategic-correlation', (correlation) => {
          if (this.superHub) {
            this.superHub.incorporateStrategicInsight(correlation);
          }
        });
        
        this.memoryOrchestrator.on('operational-pattern', (pattern) => {
          if (this.superHub) {
            this.superHub.recordOperationalPattern(pattern);
          }
        });
        
        // PatternEngine -> Memory: Store significant patterns
        this.patternEngine.on('pattern-learned', async (pattern) => {
          if (this.memoryOrchestrator && pattern.importance > 0.7) {
            try {
              await this.memoryOrchestrator.store({
                type: 'learned-pattern',
                pattern: pattern,
                source: 'pattern-engine',
                confidence: pattern.confidence || 0.8
              }, {
                importance: pattern.importance,
                tags: ['pattern', 'learned', pattern.type],
                forceStrategic: pattern.importance > 0.85
              });
            } catch (error) {
              console.warn('[HiveOrchestrator] Failed to store pattern in memory:', error);
            }
          }
        });
        
        // NeuralRouter -> Memory: Store routing decisions and outcomes
        this.neuralRouter.on('routing-decision', async (decision) => {
          if (this.memoryOrchestrator && decision.confidence > 0.6) {
            try {
              await this.memoryOrchestrator.store({
                type: 'routing-decision',
                decision: decision,
                timestamp: Date.now(),
                context: {
                  systemLoad: this.getCurrentSystemLoad(),
                  activeComponents: this.metrics.componentsActive
                }
              }, {
                importance: decision.confidence * 0.7,
                tags: ['routing', 'decision', decision.strategy],
                context: {
                  processor: decision.selectedProcessor,
                  confidence: decision.confidence
                }
              });
            } catch (error) {
              console.warn('[HiveOrchestrator] Failed to store routing decision in memory:', error);
            }
          }
        });
        
        // SuperHub -> Memory: Store collective intelligence decisions
        this.superHub.on('collective-decision', async (decision) => {
          if (this.memoryOrchestrator) {
            try {
              await this.memoryOrchestrator.store({
                type: 'collective-decision',
                decision: decision,
                participants: decision.participants || [],
                consensus: decision.consensus || 0.5,
                outcome: decision.outcome
              }, {
                importance: 0.8, // Collective decisions are important
                tags: ['collective', 'decision', 'consensus'],
                forceStrategic: decision.consensus > 0.8,
                context: {
                  participants: decision.participants?.length || 0,
                  consensus: decision.consensus
                }
              });
            } catch (error) {
              console.warn('[HiveOrchestrator] Failed to store collective decision in memory:', error);
            }
          }
        });
        
        // Memory metrics integration
        this.memoryOrchestrator.on('metrics-updated', (memoryMetrics) => {
          this.updateMetrics({
            memoryOperations: memoryMetrics.totalQueries,
            memoryPromotions: memoryMetrics.promotions,
            memoryCorrelations: memoryMetrics.correlationsFound,
            memoryHitRatio: memoryMetrics.hitRatio.fused
          });
        });
        
        console.log('[HiveOrchestrator] Memory system communication established');
      }
      
      console.log('[HiveOrchestrator] Cross-component communication established');
      
    } catch (error) {
      console.error('[HiveOrchestrator] Communication setup failed:', error);
      throw error;
    }
  }
  
  startHealthMonitoring() {
    console.log('[HiveOrchestrator] Starting health monitoring...');
    
    // Health check every 30 seconds
    setInterval(() => {
      this.performHealthCheck();
    }, 30000);
    
    // Performance metrics update every 10 seconds
    setInterval(() => {
      this.updateSystemMetrics();
    }, 10000);
    
    console.log('[HiveOrchestrator] Health monitoring started');
  }
  
  async performHealthCheck() {
    try {
      const healthResults = new Map();
      
      for (const [name, component] of this.components) {
        try {
          const health = await component.healthCheck();
          healthResults.set(name, {
            status: health.status || 'unknown',
            lastCheck: Date.now(),
            details: health
          });
        } catch (error) {
          healthResults.set(name, {
            status: 'error',
            lastCheck: Date.now(),
            error: error.message
          });
        }
      }
      
      this.healthStatus = healthResults;
      this.metrics.lastHealthCheck = Date.now();
      
      // Check critical thresholds
      this.checkCriticalThresholds();
      
      this.emit('health-check-complete', {
        results: Object.fromEntries(healthResults),
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('[HiveOrchestrator] Health check failed:', error);
    }
  }
  
  checkCriticalThresholds() {
    const thresholds = this.ccheavyConfig.thresholds;
    
    // Check response time
    if (this.metrics.avgResponseTime > thresholds.responseTime) {
      console.warn(`[HiveOrchestrator] Response time ${this.metrics.avgResponseTime}ms exceeds threshold ${thresholds.responseTime}ms`);
      this.emit('threshold-exceeded', {
        metric: 'responseTime',
        value: this.metrics.avgResponseTime,
        threshold: thresholds.responseTime
      });
    }
    
    // Check accuracy rate  
    if (this.metrics.accuracyRate < thresholds.complexity) {
      console.warn(`[HiveOrchestrator] Accuracy rate ${this.metrics.accuracyRate} below threshold ${thresholds.complexity}`);
      this.emit('threshold-exceeded', {
        metric: 'accuracy',
        value: this.metrics.accuracyRate,
        threshold: thresholds.complexity
      });
    }
    
    // Check error rate
    if (this.metrics.errorRate > thresholds.errorRate) {
      console.warn(`[HiveOrchestrator] Error rate ${this.metrics.errorRate} exceeds threshold ${thresholds.errorRate}`);
      this.emit('threshold-exceeded', {
        metric: 'errorRate',
        value: this.metrics.errorRate,
        threshold: thresholds.errorRate
      });
    }
  }
  
  updateSystemMetrics() {
    try {
      // Calculate uptime
      this.metrics.uptime = Date.now() - this.startTime;
      
      // Count active components
      this.metrics.componentsActive = Array.from(this.healthStatus.values())
        .filter(health => health.status === 'healthy' || health.status === 'active').length;
      
      // Aggregate metrics from components
      let totalResponseTime = 0;
      let totalAccuracy = 0;
      let totalErrors = 0;
      let totalRequests = 0;
      let componentCount = 0;
      
      for (const [name, component] of this.components) {
        try {
          const stats = component.healthCheck();
          if (stats && typeof stats === 'object') {
            if (stats.averageResponseTime) {
              totalResponseTime += stats.averageResponseTime;
              componentCount++;
            }
            if (stats.accuracy) {
              totalAccuracy += stats.accuracy;
            }
            if (stats.errors) {
              totalErrors += stats.errors;
            }
            if (stats.requests) {
              totalRequests += stats.requests;
            }
          }
        } catch (error) {
          // Skip component if stats unavailable
        }
      }
      
      // Calculate averages
      if (componentCount > 0) {
        this.metrics.avgResponseTime = totalResponseTime / componentCount;
        this.metrics.accuracyRate = totalAccuracy / componentCount;
      }
      
      if (totalRequests > 0) {
        this.metrics.errorRate = totalErrors / totalRequests;
      }
      
      this.metrics.requestsProcessed = totalRequests;
      
    } catch (error) {
      console.error('[HiveOrchestrator] Metrics update failed:', error);
    }
  }
  
  updateMetrics(newMetrics) {
    if (newMetrics && typeof newMetrics === 'object') {
      Object.assign(this.metrics, newMetrics);
    }
  }
  
  // Public API methods
  
  async processRequest(request) {
    try {
      const startTime = Date.now();
      
      if (this.state !== 'operational') {
        throw new Error(`System not operational: ${this.state}`);
      }
      
      // Memory-aware routing: retrieve relevant historical context
      let memoryContext = null;
      if (this.memoryOrchestrator) {
        try {
          memoryContext = await this.memoryOrchestrator.retrieve(
            this.extractQueryFromRequest(request),
            {
              strategy: 'fusion',
              maxResults: 5,
              minRelevance: 0.3,
              includeContext: true
            }
          );
        } catch (error) {
          console.warn('[HiveOrchestrator] Memory retrieval warning:', error);
        }
      }
      
      // Enhanced routing with memory context
      const routing = await this.neuralRouter.routeRequest(request, {
        memoryContext: memoryContext,
        historicalPatterns: memoryContext?.results || []
      });
      
      // Apply memory-based routing optimization
      if (memoryContext && memoryContext.results.length > 0) {
        routing.memoryEnhanced = true;
        routing.historicalSuccessRate = this.calculateHistoricalSuccessRate(memoryContext.results);
        
        // Adjust routing confidence based on historical success
        if (routing.historicalSuccessRate > 0.8) {
          routing.confidence = Math.min(routing.confidence * 1.2, 1.0);
        }
      }
      
      // Use SuperHub for collective intelligence if needed
      let result;
      if (routing.useCollectiveIntelligence) {
        result = await this.superHub.processWithCollectiveIntelligence(request, routing);
      } else {
        result = await this.processDirectly(request, routing);
      }
      
      // Learn from this interaction: store request/response pattern
      const processingTime = Date.now() - startTime;
      const success = result && !result.error;
      
      if (this.memoryOrchestrator) {
        try {
          await this.storeInteractionLearning(request, result, routing, processingTime, success);
        } catch (error) {
          console.warn('[HiveOrchestrator] Memory learning warning:', error);
        }
      }
      
      // Record performance
      this.recordRequestMetrics(processingTime, success);
      
      return {
        result,
        routing,
        memoryContext: memoryContext ? {
          resultsFound: memoryContext.results.length,
          historicalSuccessRate: routing.historicalSuccessRate || 0
        } : null,
        processingTime,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('[HiveOrchestrator] Request processing failed:', error);
      this.recordRequestMetrics(Date.now() - (Date.now() - 1000), false);
      throw error;
    }
  }
  
  async processDirectly(request, routing) {
    // Direct processing based on routing decision
    const processor = routing.selectedProcessor;
    
    switch (processor) {
      case 'pattern-engine':
        return await this.patternEngine.processRequest(request);
        
      case 'semantic-adapter':
        if (this.semanticAdapter) {
          return await this.semanticAdapter.analyzeRequest(request);
        }
        break;
        
      default:
        // Use neural router as fallback
        return await this.neuralRouter.processRequest(request);
    }
  }
  
  recordRequestMetrics(processingTime, success) {
    this.metrics.requestsProcessed++;
    
    // Update average response time
    if (this.metrics.avgResponseTime === 0) {
      this.metrics.avgResponseTime = processingTime;
    } else {
      this.metrics.avgResponseTime = (this.metrics.avgResponseTime * 0.9) + (processingTime * 0.1);
    }
    
    // Update error rate
    if (!success) {
      const errors = this.metrics.requestsProcessed * this.metrics.errorRate + 1;
      this.metrics.errorRate = errors / this.metrics.requestsProcessed;
    } else {
      // Recalculate accuracy
      this.metrics.accuracyRate = Math.min(1.0, this.metrics.accuracyRate + 0.01);
    }
  }
  
  // ====================
  // MEMORY INTEGRATION HELPERS
  // ====================
  
  extractQueryFromRequest(request) {
    try {
      // Extract searchable query from various request formats
      if (typeof request === 'string') {
        return request.substring(0, 200); // Limit query length
      }
      
      if (request && typeof request === 'object') {
        // Try common query fields
        const queryFields = ['query', 'prompt', 'message', 'content', 'text', 'input'];
        
        for (const field of queryFields) {
          if (request[field] && typeof request[field] === 'string') {
            return request[field].substring(0, 200);
          }
        }
        
        // Try nested query fields
        if (request.data && typeof request.data === 'object') {
          for (const field of queryFields) {
            if (request.data[field] && typeof request.data[field] === 'string') {
              return request.data[field].substring(0, 200);
            }
          }
        }
        
        // Fallback: stringify the request and extract meaningful content
        const requestStr = JSON.stringify(request);
        return requestStr.substring(0, 200);
      }
      
      return 'unknown-request-format';
      
    } catch (error) {
      console.warn('[HiveOrchestrator] Query extraction error:', error);
      return 'extraction-error';
    }
  }
  
  calculateHistoricalSuccessRate(memoryResults) {
    try {
      if (!memoryResults || !Array.isArray(memoryResults) || memoryResults.length === 0) {
        return 0.5; // Default neutral success rate
      }
      
      let totalInteractions = 0;
      let successfulInteractions = 0;
      
      for (const result of memoryResults) {
        // Check for interaction history in the memory result
        if (result.value && typeof result.value === 'object') {
          const interaction = result.value;
          
          // Look for success indicators
          if (interaction.success !== undefined) {
            totalInteractions++;
            if (interaction.success) {
              successfulInteractions++;
            }
          } else if (interaction.processingTime !== undefined) {
            // Infer success from processing time and presence of result
            totalInteractions++;
            if (interaction.result && !interaction.error && interaction.processingTime < 10000) {
              successfulInteractions++;
            }
          } else if (interaction.confidence !== undefined) {
            // Use confidence as success indicator
            totalInteractions++;
            if (interaction.confidence > 0.6) {
              successfulInteractions++;
            }
          }
        }
        
        // Check result metadata for success patterns
        if (result.importance && result.accessCount) {
          totalInteractions++;
          // High importance + frequent access suggests success
          if (result.importance > 0.7 && result.accessCount > 2) {
            successfulInteractions++;
          }
        }
      }
      
      if (totalInteractions === 0) {
        // No clear success/failure data, analyze relevance scores
        const avgRelevance = memoryResults.reduce((sum, result) => {
          return sum + (result.relevance || 0.5);
        }, 0) / memoryResults.length;
        
        return Math.min(Math.max(avgRelevance, 0.3), 0.9);
      }
      
      const successRate = successfulInteractions / totalInteractions;
      
      // Apply confidence adjustment based on sample size
      const confidenceAdjustment = Math.min(totalInteractions / 10, 1); // Full confidence at 10+ samples
      const adjustedSuccessRate = (successRate * confidenceAdjustment) + (0.5 * (1 - confidenceAdjustment));
      
      return Math.min(Math.max(adjustedSuccessRate, 0.1), 0.95);
      
    } catch (error) {
      console.warn('[HiveOrchestrator] Historical success rate calculation error:', error);
      return 0.5; // Default neutral rate on error
    }
  }
  
  async storeInteractionLearning(request, result, routing, processingTime, success) {
    try {
      if (!this.memoryOrchestrator) return;
      
      // Create learning entry from the interaction
      const learningData = {
        type: 'interaction-pattern',
        query: this.extractQueryFromRequest(request),
        routing: {
          selectedProcessor: routing.selectedProcessor,
          confidence: routing.confidence,
          useCollectiveIntelligence: routing.useCollectiveIntelligence,
          memoryEnhanced: routing.memoryEnhanced || false,
          historicalSuccessRate: routing.historicalSuccessRate || 0
        },
        outcome: {
          success: success,
          processingTime: processingTime,
          hasResult: !!result,
          hasError: !!(result && result.error),
          timestamp: Date.now()
        },
        performance: {
          responseTime: processingTime,
          accuracy: success ? 1 : 0,
          systemLoad: this.getCurrentSystemLoad()
        },
        context: {
          componentsActive: this.metrics.componentsActive,
          totalRequests: this.metrics.requestsProcessed,
          avgResponseTime: this.metrics.avgResponseTime,
          errorRate: this.metrics.errorRate
        }
      };
      
      // Store in operational memory with high importance if successful or notable
      const importance = this.calculateLearningImportance(learningData);
      
      await this.memoryOrchestrator.store(learningData, {
        type: 'interaction-learning',
        importance: importance,
        tags: [
          'interaction',
          'learning',
          'routing',
          success ? 'success' : 'failure',
          routing.selectedProcessor || 'unknown-processor'
        ],
        context: {
          processor: routing.selectedProcessor,
          success: success,
          responseTime: processingTime,
          timestamp: Date.now()
        }
      });
      
      // If this was a particularly good or bad interaction, store additional correlation data
      if (importance > 0.8 || importance < 0.3) {
        await this.storePatternCorrelation(learningData, importance > 0.8 ? 'success' : 'failure');
      }
      
    } catch (error) {
      console.warn('[HiveOrchestrator] Interaction learning storage error:', error);
      // Don't throw - this is non-critical functionality
    }
  }
  
  calculateLearningImportance(learningData) {
    let importance = 0.5; // Base importance
    
    // Success/failure weight (0.3)
    if (learningData.outcome.success) {
      importance += 0.15;
    } else {
      importance += 0.3; // Failures are more important to learn from
    }
    
    // Processing time weight (0.2)
    const timeScore = Math.max(0, 1 - (learningData.outcome.processingTime / 10000)); // Normalize to 10s max
    importance += timeScore * 0.2;
    
    // Routing confidence weight (0.2)
    importance += (learningData.routing.confidence || 0.5) * 0.2;
    
    // Memory enhancement bonus (0.1)
    if (learningData.routing.memoryEnhanced) {
      importance += 0.1;
    }
    
    // Historical success rate weight (0.2)
    const historicalRate = learningData.routing.historicalSuccessRate || 0.5;
    // High success rate with failure = very important to learn
    // Low success rate with success = important to learn
    const historicalBonus = Math.abs(historicalRate - (learningData.outcome.success ? 1 : 0)) * 0.2;
    importance += historicalBonus;
    
    return Math.min(Math.max(importance, 0.1), 1.0);
  }
  
  async storePatternCorrelation(learningData, outcomeType) {
    try {
      const correlationData = {
        type: 'routing-correlation',
        processor: learningData.routing.selectedProcessor,
        outcome: outcomeType,
        patterns: {
          confidence: learningData.routing.confidence,
          memoryEnhanced: learningData.routing.memoryEnhanced,
          processingTime: learningData.outcome.processingTime,
          systemLoad: learningData.performance.systemLoad
        },
        context: learningData.context,
        discoveredAt: Date.now()
      };
      
      await this.memoryOrchestrator.store(correlationData, {
        type: 'pattern-correlation',
        importance: 0.8,
        tags: ['correlation', 'pattern', outcomeType, learningData.routing.selectedProcessor],
        context: {
          pattern: 'routing-correlation',
          processor: learningData.routing.selectedProcessor,
          outcome: outcomeType
        }
      });
      
    } catch (error) {
      console.warn('[HiveOrchestrator] Pattern correlation storage error:', error);
    }
  }
  
  getCurrentSystemLoad() {
    // Simple system load calculation based on current metrics
    const responseTimeLoad = Math.min(this.metrics.avgResponseTime / 5000, 1); // Normalize to 5s
    const errorRateLoad = this.metrics.errorRate;
    const componentLoad = 1 - (this.metrics.componentsActive / this.components.size);
    
    return (responseTimeLoad + errorRateLoad + componentLoad) / 3;
  }
  
  getStatus() {
    const baseStatus = {
      state: this.state,
      uptime: Date.now() - this.startTime,
      components: Object.fromEntries(
        Array.from(this.components.entries()).map(([name, comp]) => [
          name, 
          {
            status: comp.status,
            uptime: Date.now() - comp.startTime
          }
        ])
      ),
      health: Object.fromEntries(this.healthStatus),
      metrics: this.getMetrics(),
      configuration: {
        performanceMode: this.config.performanceMode,
        glm4AirEnabled: this.config.enableGLM4Air,
        serenaEnabled: this.config.enableSerena,
        ports: {
          main: this.config.port,
          superHub: this.config.superHubPort,
          serena: this.config.serenaPort
        }
      }
    };

    // Add memory system status if available
    if (this.memoryOrchestrator) {
      try {
        const memoryStatus = this.memoryOrchestrator.getStatus();
        baseStatus.memory = {
          state: memoryStatus.state,
          components: {
            graphiti: memoryStatus.components.graphiti?.state || 'not-initialized',
            shortTerm: memoryStatus.components.shortTerm?.state || 'not-initialized',
            bridge: memoryStatus.components.bridge?.state || 'not-initialized'
          },
          distribution: memoryStatus.metrics?.memoryDistribution || {
            strategic: 0,
            operational: 0,
            pending: 0
          },
          promotionQueue: memoryStatus.metrics?.promotionQueue || 0,
          correlationCache: memoryStatus.metrics?.correlationCache || 0,
          hitRatios: memoryStatus.metrics?.hitRatio || {
            strategic: 0,
            operational: 0,
            fused: 0
          },
          config: {
            promotionThreshold: memoryStatus.config?.promotionThreshold || 0.75,
            retentionPeriod: memoryStatus.config?.retentionPeriod || 86400000,
            fusionWeights: memoryStatus.config?.fusionWeights || {}
          }
        };
      } catch (error) {
        console.warn('[HiveOrchestrator] Failed to get memory status:', error);
        baseStatus.memory = { 
          state: 'error', 
          error: error.message,
          components: {
            graphiti: 'error',
            shortTerm: 'error',
            bridge: 'error'
          }
        };
      }
    } else {
      baseStatus.memory = {
        state: 'not-initialized',
        components: {
          graphiti: 'not-initialized',
          shortTerm: 'not-initialized',
          bridge: 'not-initialized'
        }
      };
    }

    return baseStatus;
  }
  
  getMetrics() {
    const baseMetrics = {
      ...this.metrics,
      performanceTargets: {
        responseTime: '<5s',
        accuracy: '>85%',
        uptime: '99.9%',
        concurrentRequests: 8
      },
      currentPerformance: {
        responseTimeMs: Math.round(this.metrics.avgResponseTime),
        accuracyPercent: Math.round(this.metrics.accuracyRate * 100),
        uptimePercent: this.calculateUptimePercentage(),
        activeComponents: this.metrics.componentsActive
      }
    };

    // Add memory system metrics if available
    if (this.memoryOrchestrator) {
      try {
        const memoryMetrics = this.memoryOrchestrator.getMetrics();
        baseMetrics.memory = {
          // Core memory metrics
          totalQueries: memoryMetrics.totalQueries || 0,
          avgQueryTime: Math.round(memoryMetrics.avgQueryTime || 0),
          promotions: memoryMetrics.promotions || 0,
          demotions: memoryMetrics.demotions || 0,
          fusionQueries: memoryMetrics.fusionQueries || 0,
          correlationsFound: memoryMetrics.correlationsFound || 0,
          
          // Memory distribution
          distribution: {
            strategic: memoryMetrics.memoryDistribution?.strategic || 0,
            operational: memoryMetrics.memoryDistribution?.operational || 0,
            pending: memoryMetrics.memoryDistribution?.pending || 0,
            total: (memoryMetrics.memoryDistribution?.strategic || 0) + 
                   (memoryMetrics.memoryDistribution?.operational || 0)
          },
          
          // Hit ratios and performance
          hitRatios: {
            strategic: Math.round((memoryMetrics.hitRatio?.strategic || 0) * 100),
            operational: Math.round((memoryMetrics.hitRatio?.operational || 0) * 100),
            fused: Math.round((memoryMetrics.hitRatio?.fused || 0) * 100),
            overall: Math.round(((memoryMetrics.hitRatio?.strategic || 0) + 
                               (memoryMetrics.hitRatio?.operational || 0) + 
                               (memoryMetrics.hitRatio?.fused || 0)) / 3 * 100)
          },
          
          // Cache and queue status
          queues: {
            promotionQueue: memoryMetrics.promotionQueue || 0,
            correlationCache: memoryMetrics.correlationCache || 0
          },
          
          // Component-specific metrics
          components: {
            graphiti: this.getGraphitiMetrics(),
            shortTerm: this.getShortTermMetrics(),
            bridge: this.getBridgeMetrics()
          },
          
          // Memory efficiency metrics
          efficiency: {
            promotionRate: memoryMetrics.totalQueries > 0 ? 
                          Math.round((memoryMetrics.promotions / memoryMetrics.totalQueries) * 100) : 0,
            correlationRate: memoryMetrics.totalQueries > 0 ?
                            Math.round((memoryMetrics.correlationsFound / memoryMetrics.totalQueries) * 100) : 0,
            fusionUsage: memoryMetrics.totalQueries > 0 ?
                        Math.round((memoryMetrics.fusionQueries / memoryMetrics.totalQueries) * 100) : 0
          },
          
          // System health indicators
          health: {
            memoryPressure: this.calculateMemoryPressure(memoryMetrics),
            promotionEfficiency: this.calculatePromotionEfficiency(memoryMetrics),
            correlationQuality: this.calculateCorrelationQuality(memoryMetrics),
            overallHealth: this.calculateMemoryHealth(memoryMetrics)
          },
          
          // Uptime and availability
          uptime: memoryMetrics.uptime || 0,
          state: memoryMetrics.state || 'unknown'
        };
      } catch (error) {
        console.warn('[HiveOrchestrator] Failed to get memory metrics:', error);
        baseMetrics.memory = {
          error: error.message,
          state: 'error',
          distribution: { strategic: 0, operational: 0, pending: 0, total: 0 },
          hitRatios: { strategic: 0, operational: 0, fused: 0, overall: 0 }
        };
      }
    } else {
      baseMetrics.memory = {
        state: 'not-initialized',
        distribution: { strategic: 0, operational: 0, pending: 0, total: 0 },
        hitRatios: { strategic: 0, operational: 0, fused: 0, overall: 0 }
      };
    }

    return baseMetrics;
  }
  
  // ====================
  // MEMORY METRICS HELPERS
  // ====================
  
  getGraphitiMetrics() {
    try {
      if (this.memoryOrchestrator?.graphitiAdapter) {
        const graphitiMetrics = this.memoryOrchestrator.graphitiAdapter.getMetrics();
        return {
          entitiesCreated: graphitiMetrics.entitiesCreated || 0,
          relationshipsCreated: graphitiMetrics.relationshipsCreated || 0,
          searchQueries: graphitiMetrics.searchQueries || 0,
          avgResponseTime: Math.round(graphitiMetrics.avgResponseTime || 0),
          cacheSize: graphitiMetrics.cacheSize || 0,
          entityCount: graphitiMetrics.entityCount || 0,
          relationshipCount: graphitiMetrics.relationshipCount || 0,
          uptime: graphitiMetrics.uptime || 0,
          errors: graphitiMetrics.errors || 0
        };
      }
    } catch (error) {
      console.warn('[HiveOrchestrator] Failed to get Graphiti metrics:', error);
    }
    
    return { state: 'not-available' };
  }
  
  getShortTermMetrics() {
    try {
      if (this.memoryOrchestrator?.shortTermMemory) {
        const shortTermMetrics = this.memoryOrchestrator.shortTermMemory.getMetrics();
        return {
          totalEntries: shortTermMetrics.totalEntries || 0,
          activeEntries: shortTermMetrics.activeEntries || 0,
          evictions: shortTermMetrics.evictions || 0,
          hits: shortTermMetrics.hits || 0,
          misses: shortTermMetrics.misses || 0,
          compressions: shortTermMetrics.compressions || 0,
          patternsDetected: shortTermMetrics.patternsDetected || 0,
          avgAccessTime: Math.round(shortTermMetrics.avgAccessTime || 0),
          memoryUsage: Math.round((shortTermMetrics.memoryUsage || 0) * 100) / 100, // MB
          hitRatio: Math.round((shortTermMetrics.hitRatio || 0) * 100)
        };
      }
    } catch (error) {
      console.warn('[HiveOrchestrator] Failed to get short-term metrics:', error);
    }
    
    return { state: 'not-available' };
  }
  
  getBridgeMetrics() {
    try {
      if (this.memoryOrchestrator?.memoryBridge) {
        const bridgeMetrics = this.memoryOrchestrator.memoryBridge.getMetrics();
        return {
          promotionsCompleted: bridgeMetrics.promotionsCompleted || 0,
          fusionQueries: bridgeMetrics.fusionQueries || 0,
          correlationAnalyses: bridgeMetrics.correlationAnalyses || 0,
          translationOperations: bridgeMetrics.translationOperations || 0,
          avgPromotionTime: Math.round(bridgeMetrics.avgPromotionTime || 0),
          avgFusionTime: Math.round(bridgeMetrics.avgFusionTime || 0),
          successRate: Math.round((bridgeMetrics.successRate || 0) * 100)
        };
      }
    } catch (error) {
      console.warn('[HiveOrchestrator] Failed to get bridge metrics:', error);
    }
    
    return { state: 'not-available' };
  }
  
  calculateMemoryPressure(memoryMetrics) {
    // Calculate memory pressure based on multiple factors
    let pressure = 0;
    
    // Queue pressure (0-0.4)
    const promotionQueueSize = memoryMetrics.promotionQueue || 0;
    pressure += Math.min(promotionQueueSize / 100, 0.4); // Normalize to 100 max
    
    // Hit ratio pressure (0-0.3) - inverse relationship
    const avgHitRatio = ((memoryMetrics.hitRatio?.strategic || 0) + 
                        (memoryMetrics.hitRatio?.operational || 0) + 
                        (memoryMetrics.hitRatio?.fused || 0)) / 3;
    pressure += (1 - avgHitRatio) * 0.3;
    
    // Response time pressure (0-0.3)
    const avgQueryTime = memoryMetrics.avgQueryTime || 0;
    pressure += Math.min(avgQueryTime / 5000, 0.3); // Normalize to 5s max
    
    // Scale to percentage
    return Math.round(Math.min(pressure, 1.0) * 100);
  }
  
  calculatePromotionEfficiency(memoryMetrics) {
    // Calculate how efficiently the promotion system is working
    const totalQueries = memoryMetrics.totalQueries || 0;
    const promotions = memoryMetrics.promotions || 0;
    const pendingPromotions = memoryMetrics.promotionQueue || 0;
    
    if (totalQueries === 0) return 100; // No data yet
    
    // Ideal promotion rate is around 10-20% of queries
    const promotionRate = promotions / totalQueries;
    const idealRate = 0.15; // 15%
    
    // Efficiency decreases if too many pending or if rate is far from ideal
    const rateDifference = Math.abs(promotionRate - idealRate);
    const pendingPressure = Math.min(pendingPromotions / 50, 1); // Normalize to 50 max
    
    const efficiency = Math.max(0, 1 - rateDifference - (pendingPressure * 0.3));
    return Math.round(efficiency * 100);
  }
  
  calculateCorrelationQuality(memoryMetrics) {
    // Calculate the quality of correlations being discovered
    const totalQueries = memoryMetrics.totalQueries || 0;
    const correlationsFound = memoryMetrics.correlationsFound || 0;
    const correlationCache = memoryMetrics.correlationCache || 0;
    
    if (totalQueries === 0) return 100; // No data yet
    
    // Quality based on discovery rate and cache utilization
    const discoveryRate = correlationsFound / totalQueries;
    const cacheUtilization = Math.min(correlationCache / 100, 1); // Normalize to 100 max
    
    // Good correlation quality: moderate discovery rate (not too low, not too high)
    const idealDiscoveryRate = 0.05; // 5%
    const discoveryScore = Math.max(0, 1 - Math.abs(discoveryRate - idealDiscoveryRate) * 10);
    const cacheScore = cacheUtilization;
    
    const quality = (discoveryScore * 0.7) + (cacheScore * 0.3);
    return Math.round(quality * 100);
  }
  
  calculateMemoryHealth(memoryMetrics) {
    // Overall memory system health score
    const pressure = this.calculateMemoryPressure(memoryMetrics) / 100;
    const promotionEfficiency = this.calculatePromotionEfficiency(memoryMetrics) / 100;
    const correlationQuality = this.calculateCorrelationQuality(memoryMetrics) / 100;
    
    // Average hit ratio across all memory types
    const avgHitRatio = ((memoryMetrics.hitRatio?.strategic || 0) + 
                        (memoryMetrics.hitRatio?.operational || 0) + 
                        (memoryMetrics.hitRatio?.fused || 0)) / 3;
    
    // System state factor
    const stateMultiplier = memoryMetrics.state === 'operational' ? 1.0 : 0.5;
    
    // Weighted health calculation
    const healthScore = (
      (1 - pressure) * 0.25 + // Lower pressure = better health
      promotionEfficiency * 0.25 +
      correlationQuality * 0.2 +
      avgHitRatio * 0.3
    ) * stateMultiplier;
    
    return Math.round(Math.max(0, Math.min(1, healthScore)) * 100);
  }

  calculateUptimePercentage() {
    if (this.metrics.uptime === 0) return 100;
    
    // Calculate based on healthy component ratio and system errors
    const componentHealth = this.metrics.componentsActive / this.components.size;
    const errorImpact = Math.max(0, 1 - (this.metrics.errorRate * 10));
    
    return Math.round((componentHealth * errorImpact) * 100);
  }
  
  async getComponentStats(componentName) {
    const component = this.components.get(componentName);
    if (!component) {
      throw new Error(`Component not found: ${componentName}`);
    }
    
    try {
      return await component.healthCheck();
    } catch (error) {
      return {
        error: error.message,
        status: 'error'
      };
    }
  }
  
  async shutdown() {
    console.log('[HiveOrchestrator] Shutting down Aegntic Hive-Mind system...');
    
    try {
      this.state = 'shutting-down';
      
      // First, gracefully shutdown the memory system if initialized
      if (this.memoryOrchestrator) {
        try {
          console.log('[HiveOrchestrator] Shutting down dual-memory system...');
          await this.memoryOrchestrator.shutdown();
          console.log('[HiveOrchestrator] Memory system shutdown complete');
        } catch (error) {
          console.error('[HiveOrchestrator] Memory system shutdown error:', error);
          // Continue with other shutdowns even if memory fails
        }
      }
      
      // Shutdown core components in reverse initialization order
      const shutdownOrder = [
        'semantic-adapter',
        'mcp-bridge', 
        'super-hub',
        'neural-router',
        'pattern-engine'
      ];
      
      for (const componentName of shutdownOrder) {
        const component = this.components.get(componentName);
        if (component && component.instance && typeof component.instance.shutdown === 'function') {
          try {
            console.log(`[HiveOrchestrator] Shutting down ${componentName}...`);
            await component.instance.shutdown();
            console.log(`[HiveOrchestrator] ${componentName} shutdown complete`);
          } catch (error) {
            console.error(`[HiveOrchestrator] ${componentName} shutdown error:`, error);
            // Continue with other shutdowns even if one fails
          }
        }
      }
      
      // Clear component references
      this.components.clear();
      
      // Clear memory orchestrator reference
      this.memoryOrchestrator = null;
      
      // Final state update
      this.state = 'shutdown';
      
      console.log('[HiveOrchestrator] System shutdown complete');
      this.emit('shutdown-complete', {
        timestamp: Date.now(),
        componentsShutdown: shutdownOrder.length + (this.memoryOrchestrator ? 1 : 0),
        finalState: 'shutdown'
      });
      
    } catch (error) {
      console.error('[HiveOrchestrator] Critical shutdown error:', error);
      this.state = 'shutdown-error';
      this.emit('shutdown-error', {
        error: error.message,
        timestamp: Date.now(),
        criticalFailure: true
      });
      throw error; // Re-throw for calling code to handle
    }
  }
}

module.exports = HiveOrchestrator;