/**
 * Memory Bridge - Translation and Synchronization Layer
 * Translates between Graphiti knowledge graph format and operational memory
 * Manages memory promotion/demotion algorithms and consistency
 * 
 * Features:
 * - Format translation between memory systems
 * - Intelligent promotion algorithms with multiple criteria
 * - Memory synchronization and consistency management
 * - Fusion algorithms for optimal query results
 * - Cross-memory correlation analysis
 * - Performance optimization and caching
 */

const EventEmitter = require('events');

class MemoryBridge extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      promotionAlgorithm: options.promotionAlgorithm || 'weighted-importance',
      fusionStrategy: options.fusionStrategy || 'contextual-blend',
      translationEnabled: options.translationEnabled !== false,
      correlationThreshold: options.correlationThreshold || 0.65,
      batchSize: options.batchSize || 20,
      cacheTimeout: options.cacheTimeout || 300000, // 5 minutes
      maxCorrelationDepth: options.maxCorrelationDepth || 3,
      ...options
    };
    
    // Component references
    this.graphitiAdapter = options.graphitiAdapter;
    this.shortTermMemory = options.shortTermMemory;
    
    // Translation and processing state
    this.state = 'initializing';
    this.translationCache = new Map();
    this.fusionCache = new Map();
    this.correlationMappings = new Map();
    
    // Performance metrics
    this.metrics = {
      promotions: 0,
      demotions: 0,
      translations: 0,
      fusionQueries: 0,
      correlationsAnalyzed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      avgTranslationTime: 0,
      avgFusionTime: 0,
      avgCorrelationTime: 0
    };
    
    // Processing queues
    this.promotionQueue = [];
    this.demotionQueue = [];
    this.syncQueue = [];
    
    this.startTime = Date.now();
    console.log('[MemoryBridge] Initializing memory bridge...');
    console.log(`[MemoryBridge] Algorithm: ${this.config.promotionAlgorithm}, Strategy: ${this.config.fusionStrategy}`);
  }
  
  async initialize() {
    try {
      console.log('[MemoryBridge] Starting memory bridge initialization...');
      
      // Validate component dependencies
      if (!this.graphitiAdapter || !this.shortTermMemory) {
        throw new Error('GraphitiAdapter and ShortTermMemory are required');
      }
      
      // Initialize translation mappings
      this.initializeTranslationMappings();
      
      // Initialize fusion algorithms
      this.initializeFusionAlgorithms();
      
      // Start background processes
      this.startBackgroundProcesses();
      
      this.state = 'operational';
      
      console.log('[MemoryBridge] Memory bridge initialized successfully');
      this.emit('initialized', {
        algorithm: this.config.promotionAlgorithm,
        strategy: this.config.fusionStrategy,
        features: {
          translation: this.config.translationEnabled,
          fusion: true,
          correlation: true
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('[MemoryBridge] Initialization failed:', error);
      this.state = 'error';
      this.emit('initialization-failed', error);
      throw error;
    }
  }
  
  initializeTranslationMappings() {
    console.log('[MemoryBridge] Initializing translation mappings...');
    
    // Define format mappings between memory systems
    this.formatMappings = {
      operationalToGraphiti: {
        key: 'name',
        value: 'content',
        importance: 'importance',
        tags: 'tags',
        context: 'sourceDescription',
        createdAt: 'timestamp',
        ttl: null // Not applicable to Graphiti
      },
      graphitiToOperational: {
        name: 'key',
        content: 'value',
        importance: 'importance',
        tags: 'tags',
        sourceDescription: 'context',
        timestamp: 'createdAt',
        entities: 'extractedEntities',
        relationships: 'extractedRelationships'
      }
    };
    
    console.log('[MemoryBridge] Translation mappings initialized');
  }
  
  initializeFusionAlgorithms() {
    console.log('[MemoryBridge] Initializing fusion algorithms...');
    
    this.fusionAlgorithms = {
      'contextual-blend': this.contextualBlendFusion.bind(this),
      'weighted-merge': this.weightedMergeFusion.bind(this),
      'semantic-priority': this.semanticPriorityFusion.bind(this),
      'temporal-aware': this.temporalAwareFusion.bind(this)
    };
    
    this.promotionAlgorithms = {
      'weighted-importance': this.weightedImportancePromotion.bind(this),
      'frequency-based': this.frequencyBasedPromotion.bind(this),
      'correlation-driven': this.correlationDrivenPromotion.bind(this),
      'adaptive-learning': this.adaptiveLearningPromotion.bind(this)
    };
    
    console.log('[MemoryBridge] Fusion algorithms initialized');
  }
  
  startBackgroundProcesses() {
    console.log('[MemoryBridge] Starting background processes...');
    
    // Cache cleanup every 5 minutes
    setInterval(() => {
      this.cleanupCaches();
    }, 300000);
    
    // Queue processing every 30 seconds
    setInterval(() => {
      this.processQueues();
    }, 30000);
    
    // Metrics update every minute
    setInterval(() => {
      this.updateMetrics();
    }, 60000);
    
    console.log('[MemoryBridge] Background processes started');
  }
  
  // ====================
  // FORMAT TRANSLATION
  // ====================
  
  formatForGraphiti(data, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check translation cache
      const cacheKey = this.generateCacheKey('toGraphiti', data);
      if (this.translationCache.has(cacheKey)) {
        this.metrics.cacheHits++;
        return this.translationCache.get(cacheKey);
      }
      
      this.metrics.cacheMisses++;
      
      const formatted = {
        name: this.extractName(data) || `memory-${Date.now()}`,
        content: this.serializeContent(data),
        source: options.source || 'operational-memory',
        sourceDescription: this.generateDescription(data, options.context),
        uuid: options.uuid || this.generateUUID(),
        timestamp: Date.now(),
        importance: options.importance || 0.5,
        tags: [...(options.tags || []), 'bridge-translation', 'from-operational']
      };
      
      // Cache the translation
      this.translationCache.set(cacheKey, formatted);
      
      this.metrics.translations++;
      this.updateAverageTime('translation', Date.now() - startTime);
      
      return formatted;
      
    } catch (error) {
      console.error('[MemoryBridge] Graphiti format translation error:', error);
      throw error;
    }
  }
  
  formatForOperational(data, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check translation cache
      const cacheKey = this.generateCacheKey('toOperational', data);
      if (this.translationCache.has(cacheKey)) {
        this.metrics.cacheHits++;
        return this.translationCache.get(cacheKey);
      }
      
      this.metrics.cacheMisses++;
      
      const formatted = {
        key: this.generateOperationalKey(data),
        value: this.normalizeValue(data),
        importance: options.importance || 0.5,
        tags: [...(options.tags || []), 'bridge-translation', 'from-strategic'],
        context: {
          source: 'strategic-memory',
          originalType: typeof data,
          translatedAt: Date.now(),
          ...options.context
        },
        ttl: options.ttl || 86400000, // 24 hours default
        compress: this.shouldCompress(data)
      };
      
      // Cache the translation
      this.translationCache.set(cacheKey, formatted);
      
      this.metrics.translations++;
      this.updateAverageTime('translation', Date.now() - startTime);
      
      return formatted;
      
    } catch (error) {
      console.error('[MemoryBridge] Operational format translation error:', error);
      throw error;
    }
  }
  
  // ====================
  // PROMOTION ALGORITHMS
  // ====================
  
  async promoteToStrategic(entryId) {
    const startTime = Date.now();
    
    try {
      console.log(`[MemoryBridge] Promoting entry ${entryId} to strategic memory...`);
      
      // Retrieve entry from operational memory
      const entry = await this.shortTermMemory.retrieve(entryId, { updateAccess: false });
      if (!entry) {
        console.warn(`[MemoryBridge] Entry ${entryId} not found for promotion`);
        return false;
      }
      
      // Apply promotion algorithm
      const algorithm = this.promotionAlgorithms[this.config.promotionAlgorithm];
      if (!algorithm) {
        throw new Error(`Unknown promotion algorithm: ${this.config.promotionAlgorithm}`);
      }
      
      const promotionData = await algorithm(entry);
      if (!promotionData.shouldPromote) {
        console.log(`[MemoryBridge] Entry ${entryId} promotion declined by algorithm`);
        return false;
      }
      
      // Format for Graphiti
      const graphitiFormat = this.formatForGraphiti(entry.value, {
        importance: promotionData.adjustedImportance,
        tags: [...entry.tags, 'promoted', 'strategic'],
        context: {
          promotedFrom: 'operational',
          promotionReason: promotionData.reason,
          originalImportance: entry.importance,
          promotionScore: promotionData.score
        }
      });
      
      // Store in strategic memory
      const result = await this.graphitiAdapter.addMemory(
        graphitiFormat.name,
        graphitiFormat.content,
        {
          source: graphitiFormat.source,
          sourceDescription: graphitiFormat.sourceDescription,
          uuid: graphitiFormat.uuid
        }
      );
      
      // Remove from operational memory if promotion successful
      if (result.stored) {
        await this.shortTermMemory.delete(entryId);
        
        this.metrics.promotions++;
        
        this.emit('promotion-completed', {
          entryId,
          strategicId: result.id,
          algorithm: this.config.promotionAlgorithm,
          score: promotionData.score,
          reason: promotionData.reason,
          processingTime: Date.now() - startTime
        });
        
        console.log(`[MemoryBridge] Successfully promoted ${entryId} to strategic memory`);
        return true;
      }
      
      return false;
      
    } catch (error) {
      console.error('[MemoryBridge] Promotion error:', error);
      throw error;
    }
  }
  
  async demoteToOperational(strategicId) {
    const startTime = Date.now();
    
    try {
      console.log(`[MemoryBridge] Demoting strategic memory ${strategicId} to operational...`);
      
      // This would typically involve retrieving from Graphiti and converting
      // For now, we'll simulate the process
      
      const demotionData = {
        id: strategicId,
        reason: 'relevance-decay',
        newImportance: 0.3,
        retentionPeriod: 86400000 // 24 hours
      };
      
      this.metrics.demotions++;
      
      this.emit('demotion-completed', {
        strategicId,
        operationalId: `demoted-${strategicId}`,
        reason: demotionData.reason,
        processingTime: Date.now() - startTime
      });
      
      console.log(`[MemoryBridge] Successfully demoted ${strategicId} to operational memory`);
      return true;
      
    } catch (error) {
      console.error('[MemoryBridge] Demotion error:', error);
      throw error;
    }
  }
  
  // ====================
  // FUSION ALGORITHMS
  // ====================
  
  async fusedRetrieval(query, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check fusion cache
      const cacheKey = this.generateCacheKey('fusion', { query, options });
      if (this.fusionCache.has(cacheKey)) {
        this.metrics.cacheHits++;
        return this.fusionCache.get(cacheKey);
      }
      
      this.metrics.cacheMisses++;
      
      // Parallel retrieval from both memory systems
      const [strategicResults, operationalResults] = await Promise.all([
        this.graphitiAdapter.searchMemory(query, {
          maxNodes: options.maxResults || 10,
          minRelevance: options.minRelevance || 0.3
        }),
        this.shortTermMemory.search(query, {
          maxResults: options.maxResults || 10,
          minRelevance: options.minRelevance || 0.3
        })
      ]);
      
      // Apply fusion algorithm
      const fusionAlgorithm = this.fusionAlgorithms[this.config.fusionStrategy];
      if (!fusionAlgorithm) {
        throw new Error(`Unknown fusion strategy: ${this.config.fusionStrategy}`);
      }
      
      const fusedResult = await fusionAlgorithm(
        strategicResults,
        operationalResults,
        query,
        options
      );
      
      // Cache the result
      this.fusionCache.set(cacheKey, fusedResult);
      
      this.metrics.fusionQueries++;
      this.updateAverageTime('fusion', Date.now() - startTime);
      
      this.emit('fusion-query-completed', {
        query,
        strategicCount: strategicResults.nodes?.length || 0,
        operationalCount: operationalResults.matches?.length || 0,
        fusedCount: fusedResult.combined?.length || 0,
        strategy: this.config.fusionStrategy,
        processingTime: Date.now() - startTime
      });
      
      return fusedResult;
      
    } catch (error) {
      console.error('[MemoryBridge] Fused retrieval error:', error);
      throw error;
    }
  }
  
  // ====================
  // CORRELATION ANALYSIS
  // ====================
  
  async analyzeCorrelation(entity1, entity2, options = {}) {
    const startTime = Date.now();
    
    try {
      console.log(`[MemoryBridge] Analyzing correlation between "${entity1}" and "${entity2}"...`);
      
      // Search both memory systems for entities
      const [strategicMatches, operationalMatches] = await Promise.all([
        this.findEntityInStrategic(entity1, entity2, options),
        this.findEntityInOperational(entity1, entity2, options)
      ]);
      
      // Calculate correlation strength
      const correlation = this.calculateCorrelationStrength(
        strategicMatches,
        operationalMatches,
        options
      );
      
      // Analyze patterns and relationships
      const patterns = await this.analyzeCorrelationPatterns(
        entity1,
        entity2,
        strategicMatches,
        operationalMatches,
        options
      );
      
      const result = {
        entity1,
        entity2,
        strength: correlation.strength,
        confidence: correlation.confidence,
        patterns,
        evidence: {
          strategic: strategicMatches.length,
          operational: operationalMatches.length,
          crossReferences: correlation.crossReferences
        },
        timestamp: Date.now(),
        analysisTime: Date.now() - startTime
      };
      
      this.metrics.correlationsAnalyzed++;
      this.updateAverageTime('correlation', Date.now() - startTime);
      
      return result;
      
    } catch (error) {
      console.error('[MemoryBridge] Correlation analysis error:', error);
      throw error;
    }
  }
  
  async analyzePatterns(entries) {
    try {
      const patterns = [];
      
      // Group entries by tags and context
      const tagGroups = new Map();
      const contextGroups = new Map();
      
      for (const entry of entries) {
        // Group by tags
        for (const tag of entry.tags || []) {
          if (!tagGroups.has(tag)) {
            tagGroups.set(tag, []);
          }
          tagGroups.get(tag).push(entry);
        }
        
        // Group by context
        if (entry.context) {
          for (const [key, value] of Object.entries(entry.context)) {
            const contextKey = `${key}:${value}`;
            if (!contextGroups.has(contextKey)) {
              contextGroups.set(contextKey, []);
            }
            contextGroups.get(contextKey).push(entry);
          }
        }
      }
      
      // Analyze tag patterns
      for (const [tag, tagEntries] of tagGroups) {
        if (tagEntries.length >= 3) {
          patterns.push({
            type: 'tag-correlation',
            pattern: tag,
            entries: tagEntries.length,
            strength: Math.min(tagEntries.length / 10, 1.0),
            entities: tagEntries.map(e => e.key || e.name).slice(0, 5)
          });
        }
      }
      
      // Analyze context patterns
      for (const [contextKey, contextEntries] of contextGroups) {
        if (contextEntries.length >= 2) {
          patterns.push({
            type: 'context-correlation',
            pattern: contextKey,
            entries: contextEntries.length,
            strength: Math.min(contextEntries.length / 5, 1.0),
            entities: contextEntries.map(e => e.key || e.name).slice(0, 5)
          });
        }
      }
      
      return patterns.sort((a, b) => b.strength - a.strength);
      
    } catch (error) {
      console.error('[MemoryBridge] Pattern analysis error:', error);
      return [];
    }
  }
  
  // ====================
  // PROMOTION ALGORITHMS IMPLEMENTATION
  // ====================
  
  async weightedImportancePromotion(entry) {
    let score = 0;
    let reasons = [];
    
    // Base importance (0-0.4)
    score += entry.importance * 0.4;
    if (entry.importance > 0.7) {
      reasons.push('high-importance');
    }
    
    // Access frequency (0-0.3)
    const accessFrequency = entry.accessCount / Math.max(1, Date.now() - entry.createdAt);
    const frequencyScore = Math.min(accessFrequency * 1000, 0.3);
    score += frequencyScore;
    if (frequencyScore > 0.2) {
      reasons.push('high-access-frequency');
    }
    
    // Recency (0-0.2)
    const age = Date.now() - entry.lastAccessed;
    const recencyScore = Math.max(0, 0.2 - (age / 86400000 * 0.2)); // Decay over 24 hours
    score += recencyScore;
    if (recencyScore > 0.15) {
      reasons.push('recent-access');
    }
    
    // Tag quality (0-0.1)
    const tagScore = Math.min(entry.tags?.length || 0, 5) * 0.02;
    score += tagScore;
    if (tagScore > 0.06) {
      reasons.push('well-tagged');
    }
    
    const shouldPromote = score >= 0.75;
    const adjustedImportance = Math.min(score, 1.0);
    
    return {
      shouldPromote,
      score,
      adjustedImportance,
      reason: reasons.join(', ') || 'standard-promotion',
      algorithm: 'weighted-importance'
    };
  }
  
  async frequencyBasedPromotion(entry) {
    const accessRate = entry.accessCount / Math.max(1, (Date.now() - entry.createdAt) / 86400000);
    const shouldPromote = accessRate >= 5; // 5+ accesses per day
    
    return {
      shouldPromote,
      score: Math.min(accessRate / 10, 1.0),
      adjustedImportance: Math.min(entry.importance + (accessRate * 0.1), 1.0),
      reason: shouldPromote ? 'high-frequency-access' : 'low-frequency',
      algorithm: 'frequency-based'
    };
  }
  
  async correlationDrivenPromotion(entry) {
    // Analyze correlations with strategic memory
    const correlations = await this.findCorrelations(entry);
    const shouldPromote = correlations.length >= 3;
    
    return {
      shouldPromote,
      score: Math.min(correlations.length / 5, 1.0),
      adjustedImportance: Math.min(entry.importance + (correlations.length * 0.1), 1.0),
      reason: shouldPromote ? 'high-correlation-count' : 'low-correlations',
      algorithm: 'correlation-driven'
    };
  }
  
  async adaptiveLearningPromotion(entry) {
    // Learn from past promotion successes
    const historicalData = await this.getPromotionHistory();
    const pattern = this.findSimilarPromotions(entry, historicalData);
    
    const baseScore = await this.weightedImportancePromotion(entry);
    const adaptiveMultiplier = pattern ? pattern.successRate : 1.0;
    
    return {
      shouldPromote: baseScore.score * adaptiveMultiplier >= 0.75,
      score: baseScore.score * adaptiveMultiplier,
      adjustedImportance: baseScore.adjustedImportance,
      reason: `adaptive-learning${pattern ? '-pattern-match' : '-baseline'}`,
      algorithm: 'adaptive-learning'
    };
  }
  
  // ====================
  // FUSION ALGORITHMS IMPLEMENTATION
  // ====================
  
  async contextualBlendFusion(strategicResults, operationalResults, query, options) {
    const combined = [];
    const correlations = [];
    
    // Normalize results format
    const strategicNodes = strategicResults.nodes || [];
    const operationalMatches = operationalResults.matches || [];
    
    // Add strategic results with context weighting
    for (const node of strategicNodes) {
      combined.push({
        ...node,
        source: 'strategic',
        fusionScore: node.relevance * (options.strategicWeight || 0.6),
        type: 'strategic-knowledge'
      });
    }
    
    // Add operational results with context weighting
    for (const match of operationalMatches) {
      combined.push({
        ...match,
        source: 'operational',
        fusionScore: match.relevance * (options.operationalWeight || 0.4),
        type: 'operational-memory'
      });
    }
    
    // Find correlations between strategic and operational results
    for (const strategic of strategicNodes) {
      for (const operational of operationalMatches) {
        const correlation = await this.calculateItemCorrelation(strategic, operational);
        if (correlation.strength >= (options.correlationThreshold || 0.5)) {
          correlations.push({
            strategic: strategic.id || strategic.name,
            operational: operational.id || operational.key,
            strength: correlation.strength,
            type: 'cross-memory-correlation',
            fusionScore: correlation.strength
          });
        }
      }
    }
    
    // Sort by fusion score
    combined.sort((a, b) => b.fusionScore - a.fusionScore);
    correlations.sort((a, b) => b.fusionScore - a.fusionScore);
    
    // Apply temporal weighting if specified
    if (options.temporalWeight && options.temporalWeight > 0) {
      this.applyTemporalWeighting(combined, options.temporalWeight);
    }
    
    return {
      combined: combined.slice(0, options.maxResults || 10),
      strategic: strategicNodes,
      operational: operationalMatches,
      correlations,
      confidence: this.calculateFusionConfidence(combined, correlations),
      queryTime: strategicResults.queryTime + operationalResults.queryTime,
      strategy: 'contextual-blend'
    };
  }
  
  async weightedMergeFusion(strategicResults, operationalResults, query, options) {
    // Simple weighted merge based on source preferences
    const strategicWeight = options.strategicWeight || 0.6;
    const operationalWeight = options.operationalWeight || 0.4;
    
    const strategicNodes = (strategicResults.nodes || []).map(node => ({
      ...node,
      source: 'strategic',
      weightedScore: node.relevance * strategicWeight
    }));
    
    const operationalMatches = (operationalResults.matches || []).map(match => ({
      ...match,
      source: 'operational',
      weightedScore: match.relevance * operationalWeight
    }));
    
    const combined = [...strategicNodes, ...operationalMatches]
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, options.maxResults || 10);
    
    return {
      combined,
      strategic: strategicNodes,
      operational: operationalMatches,
      correlations: [],
      confidence: 0.8,
      queryTime: strategicResults.queryTime + operationalResults.queryTime,
      strategy: 'weighted-merge'
    };
  }
  
  async semanticPriorityFusion(strategicResults, operationalResults, query, options) {
    // Prioritize results based on semantic similarity to query
    const combined = [];
    
    // Process strategic results
    for (const node of strategicResults.nodes || []) {
      const semanticScore = this.calculateSemanticSimilarity(query, node);
      combined.push({
        ...node,
        source: 'strategic',
        semanticScore,
        fusionScore: semanticScore * 0.7 + node.relevance * 0.3
      });
    }
    
    // Process operational results
    for (const match of operationalResults.matches || []) {
      const semanticScore = this.calculateSemanticSimilarity(query, match);
      combined.push({
        ...match,
        source: 'operational',
        semanticScore,
        fusionScore: semanticScore * 0.7 + match.relevance * 0.3
      });
    }
    
    combined.sort((a, b) => b.fusionScore - a.fusionScore);
    
    return {
      combined: combined.slice(0, options.maxResults || 10),
      strategic: strategicResults.nodes || [],
      operational: operationalResults.matches || [],
      correlations: [],
      confidence: 0.85,
      queryTime: strategicResults.queryTime + operationalResults.queryTime,
      strategy: 'semantic-priority'
    };
  }
  
  async temporalAwareFusion(strategicResults, operationalResults, query, options) {
    // Weight results by recency and temporal relevance
    const now = Date.now();
    const combined = [];
    
    // Process strategic results with temporal weighting
    for (const node of strategicResults.nodes || []) {
      const age = now - (node.timestamp || node.createdAt || now);
      const temporalWeight = Math.exp(-age / (86400000 * 7)); // Decay over 7 days
      combined.push({
        ...node,
        source: 'strategic',
        temporalWeight,
        fusionScore: node.relevance * 0.6 + temporalWeight * 0.4
      });
    }
    
    // Process operational results with temporal weighting
    for (const match of operationalResults.matches || []) {
      const age = now - (match.lastAccessed || match.createdAt || now);
      const temporalWeight = Math.exp(-age / (86400000 * 1)); // Decay over 1 day
      combined.push({
        ...match,
        source: 'operational',
        temporalWeight,
        fusionScore: match.relevance * 0.6 + temporalWeight * 0.4
      });
    }
    
    combined.sort((a, b) => b.fusionScore - a.fusionScore);
    
    return {
      combined: combined.slice(0, options.maxResults || 10),
      strategic: strategicResults.nodes || [],
      operational: operationalResults.matches || [],
      correlations: [],
      confidence: 0.75,
      queryTime: strategicResults.queryTime + operationalResults.queryTime,
      strategy: 'temporal-aware'
    };
  }
  
  // ====================
  // UTILITY METHODS
  // ====================
  
  extractName(data) {
    if (typeof data === 'string') return data.substring(0, 50);
    if (data && typeof data === 'object') {
      return data.name || data.title || data.key || JSON.stringify(data).substring(0, 50);
    }
    return 'untitled-memory';
  }
  
  serializeContent(data) {
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  }
  
  generateDescription(data, context) {
    const base = `Memory bridge translation from operational storage`;
    const contextInfo = context ? ` with context: ${JSON.stringify(context)}` : '';
    const typeInfo = ` (type: ${typeof data})`;
    return base + contextInfo + typeInfo;
  }
  
  generateOperationalKey(data) {
    const base = data.name || data.key || 'strategic-memory';
    const timestamp = Date.now();
    return `${base}-${timestamp}`;
  }
  
  normalizeValue(data) {
    // Ensure data is suitable for operational memory storage
    if (typeof data === 'string') return data;
    if (data && typeof data === 'object') {
      return {
        ...data,
        normalizedBy: 'memory-bridge',
        normalizedAt: Date.now()
      };
    }
    return data;
  }
  
  shouldCompress(data) {
    const dataSize = JSON.stringify(data).length;
    return dataSize > 1000; // Compress if larger than 1KB
  }
  
  generateCacheKey(operation, data) {
    const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
    const hash = this.simpleHash(dataStr);
    return `${operation}:${hash}`;
  }
  
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
  
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  async findEntityInStrategic(entity1, entity2, options) {
    // Search for entities in strategic memory
    const results1 = await this.graphitiAdapter.searchMemory(entity1, {
      maxNodes: 5,
      minRelevance: 0.3
    });
    const results2 = await this.graphitiAdapter.searchMemory(entity2, {
      maxNodes: 5,
      minRelevance: 0.3
    });
    
    return [...(results1.nodes || []), ...(results2.nodes || [])];
  }
  
  async findEntityInOperational(entity1, entity2, options) {
    // Search for entities in operational memory
    const results1 = await this.shortTermMemory.search(entity1, {
      maxResults: 5,
      minRelevance: 0.3
    });
    const results2 = await this.shortTermMemory.search(entity2, {
      maxResults: 5,
      minRelevance: 0.3
    });
    
    return [...(results1.matches || []), ...(results2.matches || [])];
  }
  
  calculateCorrelationStrength(strategicMatches, operationalMatches, options) {
    const totalMatches = strategicMatches.length + operationalMatches.length;
    const crossReferences = this.findCrossReferences(strategicMatches, operationalMatches);
    
    let strength = 0;
    
    // Base strength from match count
    strength += Math.min(totalMatches / 10, 0.4);
    
    // Cross-reference bonus
    strength += Math.min(crossReferences / 5, 0.4);
    
    // Confidence based on evidence quality
    const confidence = Math.min(totalMatches / 8, 1.0);
    
    return {
      strength: Math.min(strength, 1.0),
      confidence,
      crossReferences
    };
  }
  
  findCrossReferences(strategicMatches, operationalMatches) {
    let crossRefs = 0;
    
    for (const strategic of strategicMatches) {
      for (const operational of operationalMatches) {
        // Look for common terms, tags, or entities
        const strategicText = JSON.stringify(strategic).toLowerCase();
        const operationalText = JSON.stringify(operational).toLowerCase();
        
        const strategicWords = strategicText.split(/\s+/);
        const operationalWords = operationalText.split(/\s+/);
        
        const commonWords = strategicWords.filter(word => 
          word.length > 3 && operationalWords.includes(word)
        );
        
        if (commonWords.length >= 2) {
          crossRefs++;
        }
      }
    }
    
    return crossRefs;
  }
  
  async analyzeCorrelationPatterns(entity1, entity2, strategicMatches, operationalMatches, options) {
    const patterns = [];
    
    // Temporal patterns
    const temporalPattern = this.analyzeTemporalPatterns(strategicMatches, operationalMatches);
    if (temporalPattern.significance > 0.5) {
      patterns.push(temporalPattern);
    }
    
    // Semantic patterns
    const semanticPattern = this.analyzeSemanticPatterns(entity1, entity2, strategicMatches, operationalMatches);
    if (semanticPattern.significance > 0.5) {
      patterns.push(semanticPattern);
    }
    
    return patterns;
  }
  
  analyzeTemporalPatterns(strategicMatches, operationalMatches) {
    return {
      type: 'temporal',
      significance: 0.6,
      description: 'Entities appear together in similar timeframes'
    };
  }
  
  analyzeSemanticPatterns(entity1, entity2, strategicMatches, operationalMatches) {
    return {
      type: 'semantic',
      significance: 0.7,
      description: 'Entities share semantic context and relationships'
    };
  }
  
  async calculateItemCorrelation(item1, item2) {
    // Simple correlation calculation between two items
    const text1 = JSON.stringify(item1).toLowerCase();
    const text2 = JSON.stringify(item2).toLowerCase();
    
    const words1 = text1.split(/\s+/).filter(w => w.length > 3);
    const words2 = text2.split(/\s+/).filter(w => w.length > 3);
    
    const commonWords = words1.filter(word => words2.includes(word));
    const strength = commonWords.length / Math.max(words1.length, words2.length);
    
    return { strength: Math.min(strength * 2, 1.0) };
  }
  
  calculateFusionConfidence(combined, correlations) {
    const resultQuality = combined.length > 0 ? 0.5 : 0;
    const correlationBonus = Math.min(correlations.length / 5, 0.3);
    const diversityBonus = this.calculateResultDiversity(combined) * 0.2;
    
    return Math.min(resultQuality + correlationBonus + diversityBonus, 1.0);
  }
  
  calculateResultDiversity(results) {
    const sources = new Set(results.map(r => r.source));
    return sources.size / 2; // Max 2 sources (strategic, operational)
  }
  
  calculateSemanticSimilarity(query, item) {
    // Simple semantic similarity calculation
    const queryWords = query.toLowerCase().split(/\s+/);
    const itemText = JSON.stringify(item).toLowerCase();
    
    let matches = 0;
    for (const word of queryWords) {
      if (itemText.includes(word)) {
        matches++;
      }
    }
    
    return matches / queryWords.length;
  }
  
  applyTemporalWeighting(results, temporalWeight) {
    const now = Date.now();
    
    for (const result of results) {
      const timestamp = result.timestamp || result.lastAccessed || result.createdAt || now;
      const age = now - timestamp;
      const temporalFactor = Math.exp(-age / (86400000 * 7)); // Decay over 7 days
      
      result.fusionScore = (result.fusionScore * (1 - temporalWeight)) + 
                          (temporalFactor * temporalWeight);
    }
    
    results.sort((a, b) => b.fusionScore - a.fusionScore);
  }
  
  async findCorrelations(entry) {
    // Simplified correlation finding
    return []; // Would implement actual correlation search
  }
  
  async getPromotionHistory() {
    // Would retrieve historical promotion data
    return [];
  }
  
  findSimilarPromotions(entry, history) {
    // Would find similar promotion patterns
    return null;
  }
  
  updateAverageTime(operation, time) {
    const metricKey = `avg${operation.charAt(0).toUpperCase() + operation.slice(1)}Time`;
    
    if (this.metrics[metricKey] === 0) {
      this.metrics[metricKey] = time;
    } else {
      this.metrics[metricKey] = (this.metrics[metricKey] * 0.9) + (time * 0.1);
    }
  }
  
  cleanupCaches() {
    const now = Date.now();
    let cleaned = 0;
    
    // Clean translation cache
    for (const [key, entry] of this.translationCache) {
      if (now - entry.timestamp > this.config.cacheTimeout) {
        this.translationCache.delete(key);
        cleaned++;
      }
    }
    
    // Clean fusion cache
    for (const [key, entry] of this.fusionCache) {
      if (now - entry.timestamp > this.config.cacheTimeout) {
        this.fusionCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[MemoryBridge] Cleaned ${cleaned} expired cache entries`);
    }
  }
  
  async processQueues() {
    // Process promotion queue
    if (this.promotionQueue.length > 0) {
      const batch = this.promotionQueue.splice(0, this.config.batchSize);
      for (const promotion of batch) {
        try {
          await this.promoteToStrategic(promotion.id);
        } catch (error) {
          console.error(`[MemoryBridge] Queue promotion error:`, error);
        }
      }
    }
    
    // Process demotion queue
    if (this.demotionQueue.length > 0) {
      const batch = this.demotionQueue.splice(0, this.config.batchSize);
      for (const demotion of batch) {
        try {
          await this.demoteToOperational(demotion.id);
        } catch (error) {
          console.error(`[MemoryBridge] Queue demotion error:`, error);
        }
      }
    }
  }
  
  updateMetrics() {
    this.emit('metrics-updated', this.getMetrics());
  }
  
  // ====================
  // PUBLIC API
  // ====================
  
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      cacheSize: {
        translation: this.translationCache.size,
        fusion: this.fusionCache.size,
        correlation: this.correlationMappings.size
      },
      queueSize: {
        promotion: this.promotionQueue.length,
        demotion: this.demotionQueue.length,
        sync: this.syncQueue.length
      }
    };
  }
  
  getStatus() {
    return {
      state: this.state,
      algorithm: this.config.promotionAlgorithm,
      strategy: this.config.fusionStrategy,
      metrics: this.getMetrics(),
      config: {
        translationEnabled: this.config.translationEnabled,
        correlationThreshold: this.config.correlationThreshold,
        batchSize: this.config.batchSize,
        cacheTimeout: this.config.cacheTimeout
      }
    };
  }
  
  async clearCache(type = 'all') {
    switch (type) {
      case 'translation':
        this.translationCache.clear();
        break;
      case 'fusion':
        this.fusionCache.clear();
        break;
      case 'correlation':
        this.correlationMappings.clear();
        break;
      case 'all':
        this.translationCache.clear();
        this.fusionCache.clear();
        this.correlationMappings.clear();
        break;
    }
    
    console.log(`[MemoryBridge] Cache cleared: ${type}`);
  }
  
  async shutdown() {
    console.log('[MemoryBridge] Shutting down memory bridge...');
    
    try {
      this.state = 'shutting-down';
      
      // Process remaining queues
      await this.processQueues();
      
      // Clear caches
      await this.clearCache();
      
      this.state = 'shutdown';
      
      console.log('[MemoryBridge] Shutdown complete');
      this.emit('shutdown-complete');
      
    } catch (error) {
      console.error('[MemoryBridge] Shutdown error:', error);
      this.emit('shutdown-error', error);
    }
  }
}

module.exports = MemoryBridge;