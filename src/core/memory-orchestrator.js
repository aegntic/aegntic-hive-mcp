/**
 * Memory Orchestrator for Aegntic Hive-Mind
 * Coordinates between Graphiti (long-term strategic) and short-term operational memory
 * Implements sophisticated dual-memory architecture with seamless integration
 * horizon-beta strategic design
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class MemoryOrchestrator extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.config = {
      promotionThreshold: options.promotionThreshold || 0.7,
      correlationThreshold: options.correlationThreshold || 0.6,
      memoryFusionEnabled: options.memoryFusionEnabled !== false,
      temporalDecayRate: options.temporalDecayRate || 0.95,
      maxPromotionQueueSize: options.maxPromotionQueueSize || 100,
      correlationCacheSize: options.correlationCacheSize || 1000,
      ...options
    };
    
    // Memory components (to be injected)
    this.graphitiAdapter = null;
    this.shortTermMemory = null;
    this.memoryBridge = null;
    
    // State management
    this.state = 'initializing';
    this.startTime = Date.now();
    
    // Memory statistics
    this.stats = {
      queries: {
        total: 0,
        strategic: 0,
        operational: 0,
        fused: 0,
        avgResponseTime: 0
      },
      promotions: {
        total: 0,
        successful: 0,
        failed: 0,
        pending: 0
      },
      correlations: {
        discovered: 0,
        cached: 0,
        utilized: 0
      },
      performance: {
        hitRatioStrategic: 0,
        hitRatioOperational: 0,
        fusionEffectiveness: 0,
        memoryPressure: 0
      }
    };
    
    // Promotion queue for important short-term memories
    this.promotionQueue = [];
    this.promotionProcessing = false;
    
    // Correlation cache
    this.correlationCache = new Map();
    this.correlationCacheOrder = [];
    
    // Memory fusion cache
    this.fusionCache = new Map();
    
    console.log('[MemoryOrchestrator] Initializing dual-memory orchestration system...');
  }
  
  async initialize(components = {}) {
    try {
      console.log('[MemoryOrchestrator] Starting initialization...');
      
      // Inject memory components
      this.graphitiAdapter = components.graphitiAdapter;
      this.shortTermMemory = components.shortTermMemory;
      this.memoryBridge = components.memoryBridge;
      
      // Validate components
      if (!this.graphitiAdapter || !this.shortTermMemory || !this.memoryBridge) {
        throw new Error('Missing required memory components');
      }
      
      // Initialize components
      await this.graphitiAdapter.initialize();
      await this.shortTermMemory.initialize();
      await this.memoryBridge.initialize({
        graphitiAdapter: this.graphitiAdapter,
        shortTermMemory: this.shortTermMemory
      });
      
      // Setup event listeners
      this.setupEventHandlers();
      
      // Start background processes
      this.startPromotionProcessor();
      this.startCorrelationAnalyzer();
      this.startMemoryOptimizer();
      
      this.state = 'operational';
      console.log('[MemoryOrchestrator] Initialization complete');
      
      this.emit('initialized', {
        components: ['graphiti', 'short-term', 'bridge'],
        capabilities: this.getCapabilities()
      });
      
      return true;
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Initialization failed:', error);
      this.state = 'error';
      throw error;
    }
  }
  
  setupEventHandlers() {
    // Short-term memory events
    this.shortTermMemory.on('importance-threshold-reached', (memory) => {
      this.queueForPromotion(memory);
    });
    
    this.shortTermMemory.on('pattern-detected', (pattern) => {
      this.recordPattern(pattern);
    });
    
    // Graphiti adapter events
    this.graphitiAdapter.on('knowledge-updated', (update) => {
      this.handleKnowledgeUpdate(update);
    });
    
    this.graphitiAdapter.on('relationship-discovered', (relationship) => {
      this.handleRelationshipDiscovery(relationship);
    });
    
    // Memory bridge events
    this.memoryBridge.on('correlation-found', (correlation) => {
      this.cacheCorrelation(correlation);
    });
    
    this.memoryBridge.on('translation-complete', (result) => {
      this.handleTranslationResult(result);
    });
  }
  
  // Core memory operations
  
  async store(data, options = {}) {
    try {
      const startTime = Date.now();
      
      // Determine memory layer based on importance and type
      const importance = this.calculateImportance(data, options);
      const isStrategic = importance > this.config.promotionThreshold || options.strategic;
      
      let result;
      
      if (isStrategic) {
        // Store in long-term strategic memory (Graphiti)
        result = await this.storeStrategic(data, options);
        this.stats.queries.strategic++;
      } else {
        // Store in short-term operational memory
        result = await this.storeOperational(data, options);
        this.stats.queries.operational++;
        
        // Queue for potential promotion
        if (importance > this.config.promotionThreshold * 0.7) {
          this.queueForPromotion({
            data,
            importance,
            timestamp: Date.now(),
            context: options.context
          });
        }
      }
      
      // Update statistics
      this.updateResponseTime(Date.now() - startTime);
      this.stats.queries.total++;
      
      this.emit('memory-stored', {
        type: isStrategic ? 'strategic' : 'operational',
        importance,
        id: result.id
      });
      
      return result;
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Store operation failed:', error);
      throw error;
    }
  }
  
  async retrieve(query, options = {}) {
    try {
      const startTime = Date.now();
      
      // Determine retrieval strategy
      const strategy = this.determineRetrievalStrategy(query, options);
      
      let results;
      
      switch (strategy) {
        case 'strategic':
          results = await this.retrieveStrategic(query, options);
          this.stats.queries.strategic++;
          break;
          
        case 'operational':
          results = await this.retrieveOperational(query, options);
          this.stats.queries.operational++;
          break;
          
        case 'fused':
          results = await this.retrieveFused(query, options);
          this.stats.queries.fused++;
          break;
          
        default:
          // Try both and merge
          results = await this.retrieveHybrid(query, options);
      }
      
      // Apply temporal weighting
      if (options.temporalWeight) {
        results = this.applyTemporalWeighting(results, options);
      }
      
      // Update statistics
      this.updateResponseTime(Date.now() - startTime);
      this.stats.queries.total++;
      
      return results;
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Retrieve operation failed:', error);
      throw error;
    }
  }
  
  async storeStrategic(data, options = {}) {
    try {
      // Transform data for Graphiti knowledge graph
      const graphData = await this.memoryBridge.transformToGraph(data, options);
      
      // Store in Graphiti
      const result = await this.graphitiAdapter.addMemory({
        name: graphData.name || `Strategic-${Date.now()}`,
        content: graphData.content,
        entities: graphData.entities,
        relationships: graphData.relationships,
        metadata: {
          ...graphData.metadata,
          source: 'memory-orchestrator',
          timestamp: Date.now(),
          importance: data.importance || 0.8
        }
      });
      
      // Update correlations
      if (graphData.correlations) {
        for (const correlation of graphData.correlations) {
          this.cacheCorrelation(correlation);
        }
      }
      
      return {
        id: result.id,
        type: 'strategic',
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Strategic store failed:', error);
      throw error;
    }
  }
  
  async storeOperational(data, options = {}) {
    try {
      // Store in short-term memory with metadata
      const result = await this.shortTermMemory.store({
        ...data,
        metadata: {
          ...data.metadata,
          timestamp: Date.now(),
          ttl: options.ttl || 3600000, // 1 hour default
          importance: this.calculateImportance(data, options),
          accessCount: 0,
          lastAccessed: Date.now()
        }
      });
      
      // Check for patterns
      const patterns = await this.shortTermMemory.detectPatterns(data);
      if (patterns.length > 0) {
        this.handlePatternDetection(patterns);
      }
      
      return {
        id: result.id,
        type: 'operational',
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Operational store failed:', error);
      throw error;
    }
  }
  
  async retrieveStrategic(query, options = {}) {
    try {
      // Search Graphiti knowledge graph
      const results = await this.graphitiAdapter.search({
        query: query.text || query,
        filters: options.filters,
        limit: options.limit || 10,
        includeRelationships: true
      });
      
      // Enhance with correlations
      if (this.config.memoryFusionEnabled) {
        const enhanced = await this.enhanceWithCorrelations(results, query);
        return enhanced;
      }
      
      return results;
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Strategic retrieval failed:', error);
      return [];
    }
  }
  
  async retrieveOperational(query, options = {}) {
    try {
      // Search short-term memory
      const results = await this.shortTermMemory.search({
        query: query.text || query,
        filters: options.filters,
        limit: options.limit || 20,
        includeContext: true
      });
      
      // Update access patterns
      for (const result of results) {
        await this.shortTermMemory.updateAccessPattern(result.id);
      }
      
      return results;
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Operational retrieval failed:', error);
      return [];
    }
  }
  
  async retrieveFused(query, options = {}) {
    try {
      // Check fusion cache
      const cacheKey = this.getFusionCacheKey(query, options);
      if (this.fusionCache.has(cacheKey)) {
        const cached = this.fusionCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
          return cached.results;
        }
      }
      
      // Retrieve from both memory layers
      const [strategic, operational] = await Promise.all([
        this.retrieveStrategic(query, options),
        this.retrieveOperational(query, options)
      ]);
      
      // Fuse results using memory bridge
      const fused = await this.memoryBridge.fuseResults({
        strategic,
        operational,
        query,
        options,
        weights: {
          strategic: options.strategicWeight || 0.6,
          operational: options.operationalWeight || 0.4
        }
      });
      
      // Cache fusion results
      this.fusionCache.set(cacheKey, {
        results: fused,
        timestamp: Date.now()
      });
      
      // Clean cache if too large
      if (this.fusionCache.size > 100) {
        const oldestKey = this.fusionCache.keys().next().value;
        this.fusionCache.delete(oldestKey);
      }
      
      this.stats.performance.fusionEffectiveness = 
        (this.stats.performance.fusionEffectiveness * 0.9) + (fused.quality || 0.8) * 0.1;
      
      return fused;
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Fused retrieval failed:', error);
      return await this.retrieveHybrid(query, options);
    }
  }
  
  async retrieveHybrid(query, options = {}) {
    try {
      // Parallel retrieval from both layers
      const [strategic, operational] = await Promise.all([
        this.retrieveStrategic(query, { ...options, limit: Math.floor((options.limit || 10) / 2) }),
        this.retrieveOperational(query, { ...options, limit: Math.floor((options.limit || 10) / 2) })
      ]);
      
      // Simple merge with deduplication
      const merged = this.mergeResults(strategic, operational);
      
      return merged;
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Hybrid retrieval failed:', error);
      return [];
    }
  }
  
  // Memory promotion and correlation
  
  queueForPromotion(memory) {
    // Add to promotion queue
    this.promotionQueue.push({
      ...memory,
      queuedAt: Date.now()
    });
    
    // Limit queue size
    if (this.promotionQueue.length > this.config.maxPromotionQueueSize) {
      // Remove oldest low-importance items
      this.promotionQueue.sort((a, b) => b.importance - a.importance);
      this.promotionQueue = this.promotionQueue.slice(0, this.config.maxPromotionQueueSize);
    }
    
    this.stats.promotions.pending = this.promotionQueue.length;
  }
  
  startPromotionProcessor() {
    setInterval(async () => {
      if (this.promotionProcessing || this.promotionQueue.length === 0) return;
      
      this.promotionProcessing = true;
      
      try {
        // Process top candidates
        const candidates = this.promotionQueue.splice(0, 5);
        
        for (const candidate of candidates) {
          // Re-evaluate importance with temporal decay
          const age = Date.now() - candidate.timestamp;
          const decayFactor = Math.pow(this.config.temporalDecayRate, age / 3600000);
          const adjustedImportance = candidate.importance * decayFactor;
          
          if (adjustedImportance > this.config.promotionThreshold) {
            try {
              await this.promoteToStrategic(candidate);
              this.stats.promotions.successful++;
            } catch (error) {
              console.error('[MemoryOrchestrator] Promotion failed:', error);
              this.stats.promotions.failed++;
            }
          }
        }
        
        this.stats.promotions.pending = this.promotionQueue.length;
        
      } finally {
        this.promotionProcessing = false;
      }
      
    }, 30000); // Process every 30 seconds
  }
  
  async promoteToStrategic(memory) {
    try {
      // Transform operational memory to strategic format
      const transformed = await this.memoryBridge.promoteMemory(memory);
      
      // Store in strategic memory
      await this.storeStrategic(transformed, {
        strategic: true,
        source: 'promotion',
        originalId: memory.id
      });
      
      // Remove from operational memory (optional)
      if (memory.id && this.config.removeOnPromotion) {
        await this.shortTermMemory.remove(memory.id);
      }
      
      this.stats.promotions.total++;
      
      this.emit('memory-promoted', {
        originalId: memory.id,
        importance: memory.importance,
        type: transformed.type
      });
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Memory promotion failed:', error);
      throw error;
    }
  }
  
  startCorrelationAnalyzer() {
    setInterval(async () => {
      try {
        // Analyze patterns across both memory layers
        const patterns = await this.analyzeCorrelations();
        
        for (const pattern of patterns) {
          if (pattern.confidence > this.config.correlationThreshold) {
            this.cacheCorrelation(pattern);
            this.stats.correlations.discovered++;
            
            this.emit('correlation-discovered', pattern);
          }
        }
        
      } catch (error) {
        console.error('[MemoryOrchestrator] Correlation analysis failed:', error);
      }
      
    }, 60000); // Analyze every minute
  }
  
  async analyzeCorrelations() {
    try {
      // Get recent patterns from both layers
      const [strategicPatterns, operationalPatterns] = await Promise.all([
        this.graphitiAdapter.getRecentPatterns(100),
        this.shortTermMemory.getRecentPatterns(100)
      ]);
      
      // Use memory bridge to find correlations
      const correlations = await this.memoryBridge.findCorrelations({
        strategic: strategicPatterns,
        operational: operationalPatterns,
        threshold: this.config.correlationThreshold
      });
      
      return correlations;
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Correlation analysis error:', error);
      return [];
    }
  }
  
  cacheCorrelation(correlation) {
    const key = this.getCorrelationKey(correlation);
    
    // Add to cache with timestamp
    this.correlationCache.set(key, {
      ...correlation,
      timestamp: Date.now(),
      usageCount: 0
    });
    
    // Track order for LRU
    this.correlationCacheOrder.push(key);
    
    // Limit cache size
    if (this.correlationCache.size > this.config.correlationCacheSize) {
      const oldestKey = this.correlationCacheOrder.shift();
      this.correlationCache.delete(oldestKey);
    }
    
    this.stats.correlations.cached = this.correlationCache.size;
  }
  
  async enhanceWithCorrelations(results, query) {
    try {
      const enhanced = [...results];
      
      // Find relevant correlations
      for (const result of results) {
        const correlations = this.findRelevantCorrelations(result);
        
        for (const correlation of correlations) {
          // Retrieve correlated data
          const correlated = await this.retrieveCorrelated(correlation);
          
          // Add to enhanced results
          enhanced.push(...correlated);
          
          // Update correlation usage
          correlation.usageCount++;
          this.stats.correlations.utilized++;
        }
      }
      
      // Deduplicate and rank
      return this.rankResults(this.deduplicateResults(enhanced), query);
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Correlation enhancement failed:', error);
      return results;
    }
  }
  
  // Memory optimization
  
  startMemoryOptimizer() {
    setInterval(async () => {
      try {
        // Calculate memory pressure
        const pressure = await this.calculateMemoryPressure();
        this.stats.performance.memoryPressure = pressure;
        
        if (pressure > 0.8) {
          // High pressure - trigger optimization
          await this.optimizeMemory();
        }
        
        // Update hit ratios
        await this.updateHitRatios();
        
        // Clean old correlations
        this.cleanCorrelationCache();
        
      } catch (error) {
        console.error('[MemoryOrchestrator] Memory optimization failed:', error);
      }
      
    }, 120000); // Optimize every 2 minutes
  }
  
  async calculateMemoryPressure() {
    try {
      const [strategicUsage, operationalUsage] = await Promise.all([
        this.graphitiAdapter.getMemoryUsage(),
        this.shortTermMemory.getMemoryUsage()
      ]);
      
      const totalUsage = (strategicUsage.percentage + operationalUsage.percentage) / 2;
      const queuePressure = this.promotionQueue.length / this.config.maxPromotionQueueSize;
      
      return (totalUsage * 0.7) + (queuePressure * 0.3);
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Memory pressure calculation failed:', error);
      return 0;
    }
  }
  
  async optimizeMemory() {
    try {
      console.log('[MemoryOrchestrator] Running memory optimization...');
      
      // Compress strategic memory
      await this.graphitiAdapter.compress();
      
      // Clean operational memory
      await this.shortTermMemory.cleanup({
        maxAge: 3600000, // 1 hour
        minImportance: 0.3
      });
      
      // Process pending promotions
      await this.processPendingPromotions();
      
      // Clear fusion cache
      this.fusionCache.clear();
      
      console.log('[MemoryOrchestrator] Memory optimization complete');
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Memory optimization error:', error);
    }
  }
  
  async updateHitRatios() {
    try {
      const [strategicStats, operationalStats] = await Promise.all([
        this.graphitiAdapter.getStatistics(),
        this.shortTermMemory.getStatistics()
      ]);
      
      this.stats.performance.hitRatioStrategic = strategicStats.hitRatio || 0;
      this.stats.performance.hitRatioOperational = operationalStats.hitRatio || 0;
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Hit ratio update failed:', error);
    }
  }
  
  cleanCorrelationCache() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [key, correlation] of this.correlationCache) {
      if (now - correlation.timestamp > maxAge && correlation.usageCount === 0) {
        this.correlationCache.delete(key);
        const index = this.correlationCacheOrder.indexOf(key);
        if (index > -1) {
          this.correlationCacheOrder.splice(index, 1);
        }
      }
    }
    
    this.stats.correlations.cached = this.correlationCache.size;
  }
  
  // Helper methods
  
  calculateImportance(data, options = {}) {
    let importance = options.importance || 0.5;
    
    // Adjust based on data characteristics
    if (data.type === 'pattern') importance += 0.2;
    if (data.type === 'decision') importance += 0.15;
    if (data.type === 'error') importance += 0.1;
    if (data.relationships && data.relationships.length > 3) importance += 0.1;
    if (data.confidence && data.confidence > 0.8) importance += 0.1;
    
    // Adjust based on context
    if (options.context) {
      if (options.context.critical) importance += 0.3;
      if (options.context.userInitiated) importance += 0.2;
      if (options.context.systemGenerated) importance -= 0.1;
    }
    
    return Math.min(1.0, Math.max(0, importance));
  }
  
  determineRetrievalStrategy(query, options = {}) {
    // Explicit strategy
    if (options.strategy) return options.strategy;
    
    // Based on query characteristics
    if (query.temporal && query.temporal === 'recent') return 'operational';
    if (query.type === 'relationship' || query.type === 'pattern') return 'strategic';
    if (query.requiresContext) return 'fused';
    
    // Based on options
    if (options.depth === 'shallow') return 'operational';
    if (options.depth === 'deep') return 'strategic';
    
    // Default to fused for best results
    return this.config.memoryFusionEnabled ? 'fused' : 'hybrid';
  }
  
  applyTemporalWeighting(results, options = {}) {
    const now = Date.now();
    const decayRate = options.temporalDecayRate || this.config.temporalDecayRate;
    
    return results.map(result => {
      const age = now - (result.timestamp || now);
      const weight = Math.pow(decayRate, age / 3600000);
      
      return {
        ...result,
        score: (result.score || 1.0) * weight,
        temporalWeight: weight
      };
    }).sort((a, b) => b.score - a.score);
  }
  
  mergeResults(strategic, operational) {
    const merged = [...strategic, ...operational];
    const seen = new Set();
    
    return merged.filter(item => {
      const key = item.id || JSON.stringify(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  deduplicateResults(results) {
    const seen = new Set();
    return results.filter(item => {
      const key = item.id || JSON.stringify(item.content || item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  rankResults(results, query) {
    // Simple relevance ranking
    return results.sort((a, b) => {
      const scoreA = this.calculateRelevance(a, query);
      const scoreB = this.calculateRelevance(b, query);
      return scoreB - scoreA;
    });
  }
  
  calculateRelevance(result, query) {
    let score = result.score || 0.5;
    
    // Boost based on recency
    if (result.timestamp) {
      const age = Date.now() - result.timestamp;
      score *= Math.pow(0.99, age / 3600000);
    }
    
    // Boost based on access patterns
    if (result.accessCount) {
      score *= Math.log10(result.accessCount + 1);
    }
    
    // Boost based on importance
    if (result.importance) {
      score *= (1 + result.importance);
    }
    
    return score;
  }
  
  getFusionCacheKey(query, options) {
    const queryStr = typeof query === 'string' ? query : JSON.stringify(query);
    const optionsStr = JSON.stringify({
      filters: options.filters,
      limit: options.limit,
      strategy: options.strategy
    });
    
    return crypto.createHash('md5').update(`${queryStr}:${optionsStr}`).digest('hex');
  }
  
  getCorrelationKey(correlation) {
    return `${correlation.source}:${correlation.target}:${correlation.type}`;
  }
  
  findRelevantCorrelations(result) {
    const relevant = [];
    
    for (const [key, correlation] of this.correlationCache) {
      if (correlation.source === result.id || 
          (result.entities && result.entities.includes(correlation.source))) {
        relevant.push(correlation);
      }
    }
    
    return relevant;
  }
  
  async retrieveCorrelated(correlation) {
    try {
      // Retrieve from appropriate memory layer
      if (correlation.layer === 'strategic') {
        return await this.retrieveStrategic({ id: correlation.target }, { limit: 3 });
      } else {
        return await this.retrieveOperational({ id: correlation.target }, { limit: 3 });
      }
    } catch (error) {
      console.error('[MemoryOrchestrator] Correlated retrieval failed:', error);
      return [];
    }
  }
  
  async processPendingPromotions() {
    const batch = this.promotionQueue.splice(0, 10);
    
    for (const item of batch) {
      try {
        await this.promoteToStrategic(item);
      } catch (error) {
        // Re-queue if failed
        this.promotionQueue.push(item);
      }
    }
  }
  
  updateResponseTime(responseTime) {
    if (this.stats.queries.avgResponseTime === 0) {
      this.stats.queries.avgResponseTime = responseTime;
    } else {
      this.stats.queries.avgResponseTime = 
        (this.stats.queries.avgResponseTime * 0.9) + (responseTime * 0.1);
    }
  }
  
  handlePatternDetection(patterns) {
    for (const pattern of patterns) {
      this.emit('pattern-detected', pattern);
      
      // Queue important patterns for promotion
      if (pattern.confidence > 0.7) {
        this.queueForPromotion({
          data: pattern,
          importance: pattern.confidence,
          timestamp: Date.now(),
          type: 'pattern'
        });
      }
    }
  }
  
  handleKnowledgeUpdate(update) {
    // Invalidate relevant fusion cache entries
    for (const [key, cached] of this.fusionCache) {
      if (cached.results.some(r => r.id === update.entityId)) {
        this.fusionCache.delete(key);
      }
    }
    
    this.emit('knowledge-updated', update);
  }
  
  handleRelationshipDiscovery(relationship) {
    // Cache as correlation
    this.cacheCorrelation({
      source: relationship.from,
      target: relationship.to,
      type: relationship.type,
      confidence: relationship.confidence || 0.8,
      layer: 'strategic'
    });
    
    this.emit('relationship-discovered', relationship);
  }
  
  handleTranslationResult(result) {
    if (result.success) {
      this.stats.performance.fusionEffectiveness = 
        (this.stats.performance.fusionEffectiveness * 0.95) + 0.05;
    }
  }
  
  // Public API methods
  
  getCapabilities() {
    return {
      dualMemory: true,
      memoryFusion: this.config.memoryFusionEnabled,
      autoPromotion: true,
      correlationAnalysis: true,
      temporalWeighting: true,
      patternRecognition: true,
      semanticSearch: true,
      knowledgeGraphs: true
    };
  }
  
  getStatistics() {
    return {
      ...this.stats,
      state: this.state,
      uptime: Date.now() - this.startTime,
      memoryDistribution: {
        strategic: this.stats.queries.strategic,
        operational: this.stats.queries.operational,
        fused: this.stats.queries.fused
      },
      efficiency: {
        promotionRate: this.stats.promotions.total / Math.max(1, this.stats.queries.operational),
        correlationUtilization: this.stats.correlations.utilized / Math.max(1, this.stats.correlations.discovered),
        fusionUsage: this.stats.queries.fused / Math.max(1, this.stats.queries.total)
      }
    };
  }
  
  async healthCheck() {
    try {
      const [graphitiHealth, shortTermHealth, bridgeHealth] = await Promise.all([
        this.graphitiAdapter.healthCheck(),
        this.shortTermMemory.healthCheck(),
        this.memoryBridge.healthCheck()
      ]);
      
      return {
        status: 'healthy',
        components: {
          graphiti: graphitiHealth,
          shortTerm: shortTermHealth,
          bridge: bridgeHealth
        },
        stats: this.getStatistics()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        stats: this.getStatistics()
      };
    }
  }
  
  async shutdown() {
    console.log('[MemoryOrchestrator] Shutting down...');
    
    try {
      this.state = 'shutting-down';
      
      // Process remaining promotions
      await this.processPendingPromotions();
      
      // Shutdown components
      if (this.memoryBridge) await this.memoryBridge.shutdown();
      if (this.shortTermMemory) await this.shortTermMemory.shutdown();
      if (this.graphitiAdapter) await this.graphitiAdapter.shutdown();
      
      this.state = 'shutdown';
      console.log('[MemoryOrchestrator] Shutdown complete');
      
    } catch (error) {
      console.error('[MemoryOrchestrator] Shutdown error:', error);
    }
  }
}

module.exports = MemoryOrchestrator;