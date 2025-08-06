/**
 * Short-Term Operational Memory System
 * High-speed in-memory cache for tactical operations
 * 
 * Features:
 * - LRU eviction with importance weighting
 * - Pattern buffer for recent decisions
 * - Session context management
 * - Temporal decay algorithms
 * - Real-time performance metrics
 * - Automatic compression and optimization
 */

const EventEmitter = require('events');

class ShortTermMemory extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      maxEntries: options.maxEntries || 10000,
      ttl: options.ttl || 86400000, // 24 hours
      enableLRU: options.enableLRU !== false,
      weightedEviction: options.weightedEviction !== false,
      compressionEnabled: options.compressionEnabled !== false,
      compressionThreshold: options.compressionThreshold || 0.8,
      patternDetectionEnabled: options.patternDetectionEnabled !== false,
      contextAwareRetrieval: options.contextAwareRetrieval !== false,
      decayRate: options.decayRate || 0.1,
      ...options
    };
    
    // Memory storage
    this.entries = new Map();
    this.accessOrder = [];
    this.importanceIndex = new Map();
    this.tagIndex = new Map();
    this.contextIndex = new Map();
    
    // Pattern detection
    this.patterns = new Map();
    this.accessPatterns = [];
    this.correlations = new Map();
    
    // Performance metrics
    this.metrics = {
      totalEntries: 0,
      activeEntries: 0,
      evictions: 0,
      hits: 0,
      misses: 0,
      compressions: 0,
      patternsDetected: 0,
      avgAccessTime: 0,
      memoryUsage: 0,
      hitRatio: 0
    };
    
    // State tracking
    this.state = 'initializing';
    this.compressionInProgress = false;
    this.maintenanceTimer = null;
    
    console.log('[ShortTermMemory] Initializing operational memory system...');
    console.log(`[ShortTermMemory] Max entries: ${this.config.maxEntries}, TTL: ${this.config.ttl}ms`);
  }
  
  async initialize() {
    try {
      console.log('[ShortTermMemory] Starting operational memory initialization...');
      
      // Initialize storage structures
      this.initializeStorage();
      
      // Start maintenance processes
      this.startMaintenance();
      
      // Initialize pattern detection
      if (this.config.patternDetectionEnabled) {
        this.initializePatternDetection();
      }
      
      this.state = 'operational';
      
      console.log('[ShortTermMemory] Operational memory initialized successfully');
      this.emit('initialized', {
        maxEntries: this.config.maxEntries,
        features: {
          lru: this.config.enableLRU,
          weightedEviction: this.config.weightedEviction,
          compression: this.config.compressionEnabled,
          patternDetection: this.config.patternDetectionEnabled
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('[ShortTermMemory] Initialization failed:', error);
      this.state = 'error';
      this.emit('initialization-failed', error);
      throw error;
    }
  }
  
  initializeStorage() {
    // Clear existing storage
    this.entries.clear();
    this.accessOrder = [];
    this.importanceIndex.clear();
    this.tagIndex.clear();
    this.contextIndex.clear();
    
    console.log('[ShortTermMemory] Storage structures initialized');
  }
  
  startMaintenance() {
    // Memory maintenance every 5 minutes
    this.maintenanceTimer = setInterval(() => {
      this.performMaintenance();
    }, 300000);
    
    // Metrics update every 30 seconds
    setInterval(() => {
      this.updateMetrics();
    }, 30000);
    
    console.log('[ShortTermMemory] Maintenance processes started');
  }
  
  initializePatternDetection() {
    // Pattern detection analysis every 2 minutes
    setInterval(() => {
      this.detectPatterns();
    }, 120000);
    
    console.log('[ShortTermMemory] Pattern detection enabled');
  }
  
  // ====================
  // CORE STORAGE OPERATIONS
  // ====================
  
  async store(key, value, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        ttl = this.config.ttl,
        importance = 0.5,
        tags = [],
        context = {},
        compress = false
      } = options;
      
      // Check if we need to evict entries
      if (this.entries.size >= this.config.maxEntries) {
        await this.evictEntries();
      }
      
      // Create entry
      const entry = {
        id: this.generateId(),
        key,
        value: compress ? this.compressValue(value) : value,
        importance,
        tags,
        context,
        compressed: compress,
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        ttl,
        expiresAt: Date.now() + ttl
      };
      
      // Store entry
      this.entries.set(key, entry);
      
      // Update indices
      this.updateIndices(entry);
      
      // Update access order for LRU
      if (this.config.enableLRU) {
        this.updateAccessOrder(key);
      }
      
      this.metrics.totalEntries++;
      this.updateAverageAccessTime(Date.now() - startTime);
      
      this.emit('entry-stored', {
        key,
        id: entry.id,
        importance,
        tags,
        timestamp: Date.now()
      });
      
      return {
        id: entry.id,
        key,
        stored: true,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('[ShortTermMemory] Storage error:', error);
      throw error;
    }
  }
  
  async retrieve(key, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        updateAccess = true,
        includeExpired = false,
        decompress = true
      } = options;
      
      const entry = this.entries.get(key);
      
      if (!entry) {
        this.metrics.misses++;
        return null;
      }
      
      // Check expiration
      if (!includeExpired && entry.expiresAt < Date.now()) {
        this.entries.delete(key);
        this.removeFromIndices(entry);
        this.metrics.misses++;
        return null;
      }
      
      // Update access information
      if (updateAccess) {
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        
        if (this.config.enableLRU) {
          this.updateAccessOrder(key);
        }
        
        this.emit('entry-accessed', entry);
      }
      
      this.metrics.hits++;
      this.updateAverageAccessTime(Date.now() - startTime);
      this.updateHitRatio();
      
      // Decompress if needed
      let value = entry.value;
      if (entry.compressed && decompress) {
        value = this.decompressValue(entry.value);
      }
      
      return {
        id: entry.id,
        key: entry.key,
        value,
        importance: entry.importance,
        tags: entry.tags,
        context: entry.context,
        createdAt: entry.createdAt,
        lastAccessed: entry.lastAccessed,
        accessCount: entry.accessCount
      };
      
    } catch (error) {
      console.error('[ShortTermMemory] Retrieval error:', error);
      this.metrics.misses++;
      throw error;
    }
  }
  
  async search(query, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        maxResults = 10,
        minRelevance = 0.3,
        includeTags = true,
        includeContext = true,
        sortBy = 'relevance'
      } = options;
      
      const results = [];
      
      // Search through entries
      for (const [key, entry] of this.entries) {
        // Skip expired entries
        if (entry.expiresAt < Date.now()) {
          continue;
        }
        
        const relevance = this.calculateRelevance(query, entry, {
          includeTags,
          includeContext
        });
        
        if (relevance >= minRelevance) {
          results.push({
            ...entry,
            relevance,
            value: entry.compressed ? this.decompressValue(entry.value) : entry.value
          });
        }
      }
      
      // Sort results
      this.sortResults(results, sortBy);
      
      // Limit results
      const limitedResults = results.slice(0, maxResults);
      
      this.updateAverageAccessTime(Date.now() - startTime);
      
      return {
        query,
        matches: limitedResults,
        totalMatches: results.length,
        queryTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('[ShortTermMemory] Search error:', error);
      throw error;
    }
  }
  
  async update(key, updates, options = {}) {
    try {
      const entry = this.entries.get(key);
      if (!entry) {
        throw new Error(`Entry not found: ${key}`);
      }
      
      // Update entry fields
      if (updates.value !== undefined) {
        entry.value = options.compress ? this.compressValue(updates.value) : updates.value;
        entry.compressed = !!options.compress;
      }
      
      if (updates.importance !== undefined) {
        entry.importance = updates.importance;
      }
      
      if (updates.tags !== undefined) {
        entry.tags = updates.tags;
      }
      
      if (updates.context !== undefined) {
        entry.context = updates.context;
      }
      
      if (updates.ttl !== undefined) {
        entry.ttl = updates.ttl;
        entry.expiresAt = Date.now() + updates.ttl;
      }
      
      // Update indices
      this.removeFromIndices(entry);
      this.updateIndices(entry);
      
      this.emit('entry-updated', {
        key,
        id: entry.id,
        updates: Object.keys(updates),
        timestamp: Date.now()
      });
      
      return { updated: true, timestamp: Date.now() };
      
    } catch (error) {
      console.error('[ShortTermMemory] Update error:', error);
      throw error;
    }
  }
  
  async delete(key) {
    try {
      const entry = this.entries.get(key);
      if (!entry) {
        return { deleted: false, reason: 'not-found' };
      }
      
      // Remove from storage
      this.entries.delete(key);
      
      // Remove from indices
      this.removeFromIndices(entry);
      
      // Remove from access order
      if (this.config.enableLRU) {
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
          this.accessOrder.splice(index, 1);
        }
      }
      
      this.emit('entry-deleted', {
        key,
        id: entry.id,
        timestamp: Date.now()
      });
      
      return { deleted: true, timestamp: Date.now() };
      
    } catch (error) {
      console.error('[ShortTermMemory] Delete error:', error);
      throw error;
    }
  }
  
  // ====================
  // INDEXING OPERATIONS
  // ====================
  
  updateIndices(entry) {
    // Update importance index
    const importanceKey = Math.floor(entry.importance * 10) / 10;
    if (!this.importanceIndex.has(importanceKey)) {
      this.importanceIndex.set(importanceKey, new Set());
    }
    this.importanceIndex.get(importanceKey).add(entry.key);
    
    // Update tag index
    for (const tag of entry.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag).add(entry.key);
    }
    
    // Update context index
    if (this.config.contextAwareRetrieval && entry.context) {
      for (const [contextKey, contextValue] of Object.entries(entry.context)) {
        const contextIndexKey = `${contextKey}:${contextValue}`;
        if (!this.contextIndex.has(contextIndexKey)) {
          this.contextIndex.set(contextIndexKey, new Set());
        }
        this.contextIndex.get(contextIndexKey).add(entry.key);
      }
    }
  }
  
  removeFromIndices(entry) {
    // Remove from importance index
    const importanceKey = Math.floor(entry.importance * 10) / 10;
    const importanceSet = this.importanceIndex.get(importanceKey);
    if (importanceSet) {
      importanceSet.delete(entry.key);
      if (importanceSet.size === 0) {
        this.importanceIndex.delete(importanceKey);
      }
    }
    
    // Remove from tag index
    for (const tag of entry.tags) {
      const tagSet = this.tagIndex.get(tag);
      if (tagSet) {
        tagSet.delete(entry.key);
        if (tagSet.size === 0) {
          this.tagIndex.delete(tag);
        }
      }
    }
    
    // Remove from context index
    if (entry.context) {
      for (const [contextKey, contextValue] of Object.entries(entry.context)) {
        const contextIndexKey = `${contextKey}:${contextValue}`;
        const contextSet = this.contextIndex.get(contextIndexKey);
        if (contextSet) {
          contextSet.delete(entry.key);
          if (contextSet.size === 0) {
            this.contextIndex.delete(contextIndexKey);
          }
        }
      }
    }
  }
  
  updateAccessOrder(key) {
    // Remove from current position
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Add to end (most recently used)
    this.accessOrder.push(key);
  }
  
  // ====================
  // EVICTION STRATEGIES
  // ====================
  
  async evictEntries() {
    const targetEvictions = Math.floor(this.config.maxEntries * 0.1); // Evict 10%
    let evicted = 0;
    
    if (this.config.weightedEviction) {
      evicted = await this.weightedEviction(targetEvictions);
    } else if (this.config.enableLRU) {
      evicted = await this.lruEviction(targetEvictions);
    } else {
      evicted = await this.ttlEviction(targetEvictions);
    }
    
    this.metrics.evictions += evicted;
    
    console.log(`[ShortTermMemory] Evicted ${evicted} entries`);
    
    this.emit('entries-evicted', {
      count: evicted,
      strategy: this.config.weightedEviction ? 'weighted' : 
                this.config.enableLRU ? 'lru' : 'ttl',
      timestamp: Date.now()
    });
  }
  
  async weightedEviction(targetEvictions) {
    // Calculate eviction scores based on multiple factors
    const candidates = [];
    
    for (const [key, entry] of this.entries) {
      const score = this.calculateEvictionScore(entry);
      candidates.push({ key, entry, score });
    }
    
    // Sort by eviction score (lower = more likely to evict)
    candidates.sort((a, b) => a.score - b.score);
    
    // Evict lowest scoring entries
    let evicted = 0;
    for (let i = 0; i < Math.min(targetEvictions, candidates.length); i++) {
      const { key, entry } = candidates[i];
      await this.delete(key);
      evicted++;
    }
    
    return evicted;
  }
  
  async lruEviction(targetEvictions) {
    // Evict least recently used entries
    let evicted = 0;
    
    for (let i = 0; i < Math.min(targetEvictions, this.accessOrder.length); i++) {
      const key = this.accessOrder[i];
      if (this.entries.has(key)) {
        await this.delete(key);
        evicted++;
      }
    }
    
    return evicted;
  }
  
  async ttlEviction(targetEvictions) {
    // Evict entries closest to expiration
    const candidates = Array.from(this.entries.entries())
      .map(([key, entry]) => ({ key, entry }))
      .sort((a, b) => a.entry.expiresAt - b.entry.expiresAt);
    
    let evicted = 0;
    for (let i = 0; i < Math.min(targetEvictions, candidates.length); i++) {
      const { key } = candidates[i];
      await this.delete(key);
      evicted++;
    }
    
    return evicted;
  }
  
  calculateEvictionScore(entry) {
    let score = 0;
    
    // Importance factor (0-0.4)
    score += (1 - entry.importance) * 0.4;
    
    // Access frequency factor (0-0.3)
    const accessFrequency = entry.accessCount / Math.max(1, Date.now() - entry.createdAt);
    score += (1 - Math.min(accessFrequency * 1000, 1)) * 0.3;
    
    // Recency factor (0-0.2)
    const age = Date.now() - entry.lastAccessed;
    const maxAge = this.config.ttl;
    score += Math.min(age / maxAge, 1) * 0.2;
    
    // TTL factor (0-0.1)
    const timeToExpire = entry.expiresAt - Date.now();
    score += (1 - Math.max(timeToExpire / entry.ttl, 0)) * 0.1;
    
    return Math.min(score, 1.0);
  }
  
  // ====================
  // PATTERN DETECTION
  // ====================
  
  detectPatterns() {
    if (!this.config.patternDetectionEnabled) return;
    
    try {
      console.log('[ShortTermMemory] Detecting access patterns...');
      
      // Analyze access patterns
      const accessPatterns = this.analyzeAccessPatterns();
      
      // Analyze correlation patterns
      const correlationPatterns = this.analyzeCorrelationPatterns();
      
      // Analyze temporal patterns
      const temporalPatterns = this.analyzeTemporalPatterns();
      
      // Store significant patterns
      this.storePatterns(accessPatterns, correlationPatterns, temporalPatterns);
      
      console.log(`[ShortTermMemory] Pattern detection complete: ${this.patterns.size} patterns`);
      
    } catch (error) {
      console.error('[ShortTermMemory] Pattern detection error:', error);
    }
  }
  
  analyzeAccessPatterns() {
    const patterns = [];
    const accessCounts = new Map();
    
    // Count accesses by key patterns
    for (const [key, entry] of this.entries) {
      const keyPattern = this.extractKeyPattern(key);
      const count = accessCounts.get(keyPattern) || 0;
      accessCounts.set(keyPattern, count + entry.accessCount);
    }
    
    // Find significant patterns
    for (const [pattern, count] of accessCounts) {
      if (count > 10) { // Threshold for significance
        patterns.push({
          type: 'access',
          pattern,
          frequency: count,
          confidence: Math.min(count / 100, 1)
        });
      }
    }
    
    return patterns;
  }
  
  analyzeCorrelationPatterns() {
    const patterns = [];
    const correlations = new Map();
    
    // Analyze tag correlations
    const tagPairs = [];
    for (const [key, entry] of this.entries) {
      if (entry.tags.length > 1) {
        for (let i = 0; i < entry.tags.length; i++) {
          for (let j = i + 1; j < entry.tags.length; j++) {
            const pair = [entry.tags[i], entry.tags[j]].sort().join(':');
            tagPairs.push(pair);
          }
        }
      }
    }
    
    // Count correlations
    for (const pair of tagPairs) {
      const count = correlations.get(pair) || 0;
      correlations.set(pair, count + 1);
    }
    
    // Find significant correlations
    for (const [pair, count] of correlations) {
      if (count > 3) {
        const [tag1, tag2] = pair.split(':');
        patterns.push({
          type: 'correlation',
          entities: [tag1, tag2],
          frequency: count,
          confidence: Math.min(count / 20, 1)
        });
      }
    }
    
    return patterns;
  }
  
  analyzeTemporalPatterns() {
    const patterns = [];
    const hourlyAccess = new Array(24).fill(0);
    
    // Analyze access by hour
    for (const [key, entry] of this.entries) {
      const hour = new Date(entry.lastAccessed).getHours();
      hourlyAccess[hour] += entry.accessCount;
    }
    
    // Find peak hours
    const maxAccess = Math.max(...hourlyAccess);
    const peakHours = [];
    
    for (let i = 0; i < 24; i++) {
      if (hourlyAccess[i] > maxAccess * 0.7) { // 70% of peak
        peakHours.push(i);
      }
    }
    
    if (peakHours.length > 0) {
      patterns.push({
        type: 'temporal',
        pattern: 'peak-hours',
        hours: peakHours,
        confidence: 0.8
      });
    }
    
    return patterns;
  }
  
  storePatterns(accessPatterns, correlationPatterns, temporalPatterns) {
    const allPatterns = [...accessPatterns, ...correlationPatterns, ...temporalPatterns];
    
    for (const pattern of allPatterns) {
      const key = `${pattern.type}:${JSON.stringify(pattern.pattern || pattern.entities)}`;
      this.patterns.set(key, {
        ...pattern,
        detectedAt: Date.now(),
        id: this.generateId()
      });
      
      this.metrics.patternsDetected++;
      
      this.emit('pattern-detected', pattern);
    }
  }
  
  extractKeyPattern(key) {
    // Extract general pattern from key
    return key
      .replace(/\d+/g, '{id}')
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '{uuid}')
      .replace(/\d{4}-\d{2}-\d{2}/g, '{date}');
  }
  
  // ====================
  // COMPRESSION OPERATIONS
  // ====================
  
  async compress() {
    if (this.compressionInProgress) {
      return { message: 'Compression already in progress' };
    }
    
    this.compressionInProgress = true;
    
    try {
      console.log('[ShortTermMemory] Starting memory compression...');
      
      let entriesCompressed = 0;
      let memoryFreed = 0;
      const compressionThreshold = this.entries.size * this.config.compressionThreshold;
      
      // Find candidates for compression
      const candidates = [];
      for (const [key, entry] of this.entries) {
        if (!entry.compressed && entry.accessCount < 5) {
          const size = this.calculateEntrySize(entry);
          candidates.push({ key, entry, size });
        }
      }
      
      // Sort by size (compress largest first)
      candidates.sort((a, b) => b.size - a.size);
      
      // Compress candidates
      for (const { key, entry, size } of candidates.slice(0, Math.min(candidates.length, compressionThreshold))) {
        const originalSize = size;
        const compressedValue = this.compressValue(entry.value);
        const compressedSize = this.calculateValueSize(compressedValue);
        
        if (compressedSize < originalSize * 0.8) { // At least 20% reduction
          entry.value = compressedValue;
          entry.compressed = true;
          
          entriesCompressed++;
          memoryFreed += (originalSize - compressedSize) / (1024 * 1024); // MB
        }
      }
      
      this.metrics.compressions++;
      
      console.log(`[ShortTermMemory] Compression complete: ${entriesCompressed} entries, ${memoryFreed.toFixed(2)}MB freed`);
      
      return {
        entriesCompressed,
        memoryFreed,
        compressionRatio: entriesCompressed / this.entries.size
      };
      
    } catch (error) {
      console.error('[ShortTermMemory] Compression error:', error);
      throw error;
    } finally {
      this.compressionInProgress = false;
    }
  }
  
  compressValue(value) {
    // Simple compression simulation - replace with actual compression
    if (typeof value === 'string') {
      return { __compressed: true, data: value.slice(0, Math.floor(value.length * 0.7)) + '...' };
    } else if (typeof value === 'object') {
      return { __compressed: true, data: JSON.stringify(value).slice(0, 1000) + '...' };
    }
    return value;
  }
  
  decompressValue(compressedValue) {
    // Simple decompression simulation
    if (compressedValue && compressedValue.__compressed) {
      return compressedValue.data;
    }
    return compressedValue;
  }
  
  calculateEntrySize(entry) {
    return JSON.stringify(entry).length;
  }
  
  calculateValueSize(value) {
    return JSON.stringify(value).length;
  }
  
  // ====================
  // MAINTENANCE OPERATIONS
  // ====================
  
  async performMaintenance() {
    console.log('[ShortTermMemory] Performing memory maintenance...');
    
    try {
      // Remove expired entries
      const expiredCount = await this.removeExpiredEntries();
      
      // Compress memory if needed
      if (this.config.compressionEnabled && this.entries.size > this.config.maxEntries * 0.8) {
        await this.compress();
      }
      
      // Apply temporal decay
      this.applyTemporalDecay();
      
      // Clean up patterns
      this.cleanupPatterns();
      
      console.log(`[ShortTermMemory] Maintenance complete: ${expiredCount} expired entries removed`);
      
    } catch (error) {
      console.error('[ShortTermMemory] Maintenance error:', error);
    }
  }
  
  async removeExpiredEntries() {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt < now) {
        await this.delete(key);
        removed++;
      }
    }
    
    return removed;
  }
  
  applyTemporalDecay() {
    const now = Date.now();
    
    for (const [key, entry] of this.entries) {
      // Apply decay to importance based on age
      const age = now - entry.createdAt;
      const decayFactor = Math.exp(-age / (this.config.ttl * this.config.decayRate));
      entry.importance = Math.max(entry.importance * decayFactor, 0.1);
    }
  }
  
  cleanupPatterns() {
    const cutoff = Date.now() - (this.config.ttl / 2);
    let cleaned = 0;
    
    for (const [key, pattern] of this.patterns) {
      if (pattern.detectedAt < cutoff) {
        this.patterns.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      console.log(`[ShortTermMemory] Cleaned up ${cleaned} old patterns`);
    }
  }
  
  // ====================
  // SEARCH AND RETRIEVAL
  // ====================
  
  calculateRelevance(query, entry, options) {
    let relevance = 0;
    const queryTerms = query.toLowerCase().split(/\s+/);
    
    // Key relevance
    const keyText = entry.key.toLowerCase();
    for (const term of queryTerms) {
      if (keyText.includes(term)) {
        relevance += 0.3;
        break;
      }
    }
    
    // Value relevance
    const valueText = JSON.stringify(entry.value).toLowerCase();
    let valueMatches = 0;
    for (const term of queryTerms) {
      if (valueText.includes(term)) {
        valueMatches++;
      }
    }
    relevance += (valueMatches / queryTerms.length) * 0.4;
    
    // Tag relevance
    if (options.includeTags && entry.tags.length > 0) {
      const tagText = entry.tags.join(' ').toLowerCase();
      for (const term of queryTerms) {
        if (tagText.includes(term)) {
          relevance += 0.2;
          break;
        }
      }
    }
    
    // Context relevance
    if (options.includeContext && entry.context) {
      const contextText = JSON.stringify(entry.context).toLowerCase();
      for (const term of queryTerms) {
        if (contextText.includes(term)) {
          relevance += 0.1;
          break;
        }
      }
    }
    
    return Math.min(relevance, 1.0);
  }
  
  sortResults(results, sortBy) {
    switch (sortBy) {
      case 'relevance':
        results.sort((a, b) => b.relevance - a.relevance);
        break;
      case 'importance':
        results.sort((a, b) => b.importance - a.importance);
        break;
      case 'recency':
        results.sort((a, b) => b.lastAccessed - a.lastAccessed);
        break;
      case 'frequency':
        results.sort((a, b) => b.accessCount - a.accessCount);
        break;
      default:
        results.sort((a, b) => b.relevance - a.relevance);
    }
  }
  
  // ====================
  // UTILITY METHODS
  // ====================
  
  async findRelated(entities, options = {}) {
    const { minRelevance = 0.5 } = options;
    const related = [];
    
    for (const [key, entry] of this.entries) {
      for (const entity of entities) {
        const relevance = this.calculateRelevance(entity, entry, { includeTags: true, includeContext: true });
        
        if (relevance >= minRelevance) {
          related.push({
            ...entry,
            relevance,
            matchedEntity: entity
          });
          break;
        }
      }
    }
    
    return related.sort((a, b) => b.relevance - a.relevance);
  }
  
  async updateImportance(key, newImportance) {
    const entry = this.entries.get(key);
    if (entry) {
      entry.importance = Math.max(0, Math.min(1, newImportance));
      return true;
    }
    return false;
  }
  
  async getRecentEntries(count = 100) {
    const entries = Array.from(this.entries.values())
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, count);
    
    return entries;
  }
  
  generateId() {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
  
  updateMetrics() {
    this.metrics.activeEntries = this.entries.size;
    this.metrics.memoryUsage = this.calculateMemoryUsage();
    this.emit('metrics-updated', this.metrics);
  }
  
  updateHitRatio() {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRatio = total > 0 ? this.metrics.hits / total : 0;
  }
  
  updateAverageAccessTime(accessTime) {
    if (this.metrics.avgAccessTime === 0) {
      this.metrics.avgAccessTime = accessTime;
    } else {
      this.metrics.avgAccessTime = (this.metrics.avgAccessTime * 0.9) + (accessTime * 0.1);
    }
  }
  
  calculateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, entry] of this.entries) {
      totalSize += this.calculateEntrySize(entry);
    }
    
    // Add indices size
    totalSize += JSON.stringify(Object.fromEntries(this.importanceIndex)).length;
    totalSize += JSON.stringify(Object.fromEntries(this.tagIndex)).length;
    totalSize += JSON.stringify(Object.fromEntries(this.contextIndex)).length;
    
    return totalSize / (1024 * 1024); // MB
  }
  
  // ====================
  // PUBLIC API
  // ====================
  
  async getEntryCount() {
    return this.entries.size;
  }
  
  getStatus() {
    return {
      state: this.state,
      entries: this.entries.size,
      patterns: this.patterns.size,
      metrics: { ...this.metrics },
      compressionInProgress: this.compressionInProgress,
      indices: {
        importance: this.importanceIndex.size,
        tags: this.tagIndex.size,
        context: this.contextIndex.size
      }
    };
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      memoryUsage: this.calculateMemoryUsage(),
      hitRatio: this.metrics.hits / Math.max(1, this.metrics.hits + this.metrics.misses)
    };
  }
  
  async clear() {
    console.log('[ShortTermMemory] Clearing all entries...');
    
    this.entries.clear();
    this.accessOrder = [];
    this.importanceIndex.clear();
    this.tagIndex.clear();
    this.contextIndex.clear();
    this.patterns.clear();
    
    // Reset metrics
    this.metrics = {
      ...this.metrics,
      totalEntries: 0,
      activeEntries: 0,
      hits: 0,
      misses: 0,
      hitRatio: 0
    };
    
    this.emit('memory-cleared', { timestamp: Date.now() });
  }
  
  async shutdown() {
    console.log('[ShortTermMemory] Shutting down operational memory...');
    
    try {
      this.state = 'shutting-down';
      
      // Clear maintenance timer
      if (this.maintenanceTimer) {
        clearInterval(this.maintenanceTimer);
      }
      
      // Save important data if needed
      // await this.saveImportantData();
      
      // Clear all data
      await this.clear();
      
      this.state = 'shutdown';
      console.log('[ShortTermMemory] Shutdown complete');
      
      this.emit('shutdown-complete');
      
    } catch (error) {
      console.error('[ShortTermMemory] Shutdown error:', error);
      this.emit('shutdown-error', error);
    }
  }
}

module.exports = ShortTermMemory;