/**
 * Graphiti Integration Adapter
 * Connects to Graphiti MCP server for knowledge graph operations
 * Provides strategic long-term memory capabilities
 * 
 * Features:
 * - Entity and relationship creation/management
 * - Semantic search and retrieval
 * - Knowledge graph operations
 * - Automatic entity detection
 * - Cross-reference analysis
 */

const EventEmitter = require('events');
const { spawn } = require('child_process');
const WebSocket = require('ws');

class GraphitiAdapter extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.config = {
      groupId: options.groupId || 'aegntic-hive-strategic',
      mcpCommand: options.mcpCommand || 'uv',
      mcpArgs: options.mcpArgs || ['run', 'python', '-m', 'graphiti_service'],
      mcpCwd: options.mcpCwd || process.cwd(),
      reconnectDelay: options.reconnectDelay || 5000,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      requestTimeout: options.requestTimeout || 30000,
      enableEntityDetection: options.enableEntityDetection !== false,
      enableRelationshipMapping: options.enableRelationshipMapping !== false,
      enableSemanticSearch: options.enableSemanticSearch !== false,
      batchSize: options.batchSize || 50,
      ...options
    };
    
    // MCP connection
    this.mcpProcess = null;
    this.mcpConnection = null;
    this.reconnectAttempts = 0;
    this.connected = false;
    
    // Request tracking
    this.pendingRequests = new Map();
    this.requestId = 0;
    
    // State tracking
    this.state = 'initializing';
    this.metrics = {
      entitiesCreated: 0,
      relationshipsCreated: 0,
      searchQueries: 0,
      memoryOperations: 0,
      avgResponseTime: 0,
      errors: 0,
      uptime: 0
    };
    
    // Knowledge tracking
    this.knowledgeCache = new Map();
    this.entityIndex = new Map();
    this.relationshipIndex = new Map();
    
    this.startTime = Date.now();
    console.log('[GraphitiAdapter] Initializing Graphiti knowledge graph adapter...');
  }
  
  async initialize() {
    try {
      console.log('[GraphitiAdapter] Starting Graphiti MCP connection...');
      
      // Start MCP process
      await this.startMCPProcess();
      
      // Establish connection
      await this.establishConnection();
      
      // Initialize knowledge base
      await this.initializeKnowledgeBase();
      
      this.state = 'operational';
      console.log('[GraphitiAdapter] Graphiti adapter initialized successfully');
      
      this.emit('initialized', {
        groupId: this.config.groupId,
        features: {
          entityDetection: this.config.enableEntityDetection,
          relationshipMapping: this.config.enableRelationshipMapping,
          semanticSearch: this.config.enableSemanticSearch
        }
      });
      
      return true;
      
    } catch (error) {
      console.error('[GraphitiAdapter] Initialization failed:', error);
      this.state = 'error';
      this.emit('initialization-failed', error);
      throw error;
    }
  }
  
  async startMCPProcess() {
    return new Promise((resolve, reject) => {
      console.log(`[GraphitiAdapter] Starting MCP process: ${this.config.mcpCommand} ${this.config.mcpArgs.join(' ')}`);
      
      this.mcpProcess = spawn(this.config.mcpCommand, this.config.mcpArgs, {
        cwd: this.config.mcpCwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          GRAPHITI_GROUP_ID: this.config.groupId
        }
      });
      
      let started = false;
      const timeout = setTimeout(() => {
        if (!started) {
          reject(new Error('MCP process start timeout'));
        }
      }, 10000);
      
      this.mcpProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[GraphitiAdapter] MCP stdout:', output);
        
        // Look for ready signal
        if (output.includes('graphiti ready') || output.includes('server started')) {
          if (!started) {
            started = true;
            clearTimeout(timeout);
            resolve();
          }
        }
      });
      
      this.mcpProcess.stderr.on('data', (data) => {
        const error = data.toString();
        console.error('[GraphitiAdapter] MCP stderr:', error);
        
        if (!started && error.includes('error')) {
          clearTimeout(timeout);
          reject(new Error(`MCP process error: ${error}`));
        }
      });
      
      this.mcpProcess.on('error', (error) => {
        console.error('[GraphitiAdapter] MCP process error:', error);
        if (!started) {
          clearTimeout(timeout);
          reject(error);
        }
      });
      
      this.mcpProcess.on('exit', (code, signal) => {
        console.log(`[GraphitiAdapter] MCP process exited with code ${code}, signal ${signal}`);
        this.handleMCPDisconnection();
      });
    });
  }
  
  async establishConnection() {
    // For now, simulate connection since we're integrating with MCP
    // In a real implementation, this would connect to the MCP server
    return new Promise((resolve) => {
      setTimeout(() => {
        this.connected = true;
        this.setupHeartbeat();
        resolve();
      }, 1000);
    });
  }
  
  setupHeartbeat() {
    setInterval(() => {
      if (this.connected && this.state === 'operational') {
        this.metrics.uptime = Date.now() - this.startTime;
      }
    }, 5000);
  }
  
  async initializeKnowledgeBase() {
    console.log('[GraphitiAdapter] Initializing knowledge base...');
    
    try {
      // Initialize group if not exists
      await this.initializeGroup();
      
      // Load existing entities and relationships
      await this.loadExistingKnowledge();
      
      console.log(`[GraphitiAdapter] Knowledge base initialized with ${this.entityIndex.size} entities`);
      
    } catch (error) {
      console.warn('[GraphitiAdapter] Knowledge base initialization warning:', error);
      // Continue anyway - we can create new knowledge
    }
  }
  
  async initializeGroup() {
    // Simulate group initialization
    console.log(`[GraphitiAdapter] Initializing group: ${this.config.groupId}`);
    
    // In real implementation, this would call Graphiti MCP
    const groupInfo = {
      groupId: this.config.groupId,
      created: Date.now(),
      entities: 0,
      relationships: 0
    };
    
    this.knowledgeCache.set('group-info', groupInfo);
    return groupInfo;
  }
  
  async loadExistingKnowledge() {
    // Simulate loading existing knowledge
    console.log('[GraphitiAdapter] Loading existing knowledge...');
    
    // In real implementation, this would query Graphiti for existing data
    const existingData = {
      entities: [],
      relationships: [],
      patterns: []
    };
    
    return existingData;
  }
  
  // ====================
  // CORE MEMORY OPERATIONS
  // ====================
  
  async addMemory(name, content, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        source = 'strategic',
        sourceDescription = '',
        uuid,
        tags = [],
        importance = 0.8
      } = options;
      
      // Extract entities and relationships from content
      const analysis = await this.analyzeContent(content);
      
      // Create episode in knowledge graph
      const episode = {
        name,
        content,
        source,
        sourceDescription,
        uuid: uuid || this.generateUUID(),
        timestamp: Date.now(),
        entities: analysis.entities,
        relationships: analysis.relationships,
        tags,
        importance
      };
      
      // Store in knowledge graph
      const result = await this.storeEpisode(episode);
      
      // Update indices
      this.updateIndices(episode);
      
      this.metrics.memoryOperations++;
      this.updateAverageResponseTime(Date.now() - startTime);
      
      this.emit('memory-added', {
        id: result.id,
        entities: analysis.entities.length,
        relationships: analysis.relationships.length,
        timestamp: Date.now()
      });
      
      return result;
      
    } catch (error) {
      console.error('[GraphitiAdapter] Add memory error:', error);
      this.metrics.errors++;
      throw error;
    }
  }
  
  async searchMemory(query, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        maxNodes = 10,
        minRelevance = 0.3,
        searchType = 'semantic',
        includeRelationships = true,
        groupIds = [this.config.groupId]
      } = options;
      
      let results;
      
      switch (searchType) {
        case 'entity':
          results = await this.searchEntities(query, { maxNodes, minRelevance, groupIds });
          break;
        case 'relationship':
          results = await this.searchRelationships(query, { maxNodes, minRelevance, groupIds });
          break;
        case 'semantic':
        default:
          results = await this.semanticSearch(query, { 
            maxNodes, 
            minRelevance, 
            includeRelationships,
            groupIds 
          });
      }
      
      this.metrics.searchQueries++;
      this.updateAverageResponseTime(Date.now() - startTime);
      
      return {
        query,
        nodes: results.nodes || [],
        relationships: results.relationships || [],
        totalResults: results.totalResults || 0,
        queryTime: Date.now() - startTime,
        searchType
      };
      
    } catch (error) {
      console.error('[GraphitiAdapter] Search memory error:', error);
      this.metrics.errors++;
      throw error;
    }
  }
  
  async createEntity(name, type, properties = {}) {
    try {
      const entity = {
        id: this.generateUUID(),
        name,
        type,
        properties: {
          ...properties,
          createdAt: Date.now(),
          groupId: this.config.groupId
        }
      };
      
      // Store entity in knowledge graph
      await this.storeEntity(entity);
      
      // Update index
      this.entityIndex.set(entity.id, entity);
      
      this.metrics.entitiesCreated++;
      
      this.emit('entity-created', entity);
      
      return entity;
      
    } catch (error) {
      console.error('[GraphitiAdapter] Create entity error:', error);
      this.metrics.errors++;
      throw error;
    }
  }
  
  async createRelationship(fromEntity, toEntity, relationshipType, properties = {}) {
    try {
      const relationship = {
        id: this.generateUUID(),
        from: fromEntity,
        to: toEntity,
        type: relationshipType,
        properties: {
          ...properties,
          createdAt: Date.now(),
          groupId: this.config.groupId
        }
      };
      
      // Store relationship in knowledge graph
      await this.storeRelationship(relationship);
      
      // Update index
      this.relationshipIndex.set(relationship.id, relationship);
      
      this.metrics.relationshipsCreated++;
      
      this.emit('relationship-created', relationship);
      
      return relationship;
      
    } catch (error) {
      console.error('[GraphitiAdapter] Create relationship error:', error);
      this.metrics.errors++;
      throw error;
    }
  }
  
  // ====================
  // CONTENT ANALYSIS
  // ====================
  
  async analyzeContent(content) {
    if (!this.config.enableEntityDetection) {
      return { entities: [], relationships: [] };
    }
    
    try {
      // Simulate content analysis - in real implementation, this would use NLP
      const entities = this.extractEntities(content);
      const relationships = this.extractRelationships(content, entities);
      
      return {
        entities,
        relationships,
        confidence: 0.8
      };
      
    } catch (error) {
      console.error('[GraphitiAdapter] Content analysis error:', error);
      return { entities: [], relationships: [] };
    }
  }
  
  extractEntities(content) {
    // Simplified entity extraction - replace with proper NLP
    const entities = [];
    
    // Technical terms
    const techPatterns = [
      /\b(API|SDK|MCP|WebSocket|HTTP|JSON|XML|REST|GraphQL)\b/gi,
      /\b(Node\.js|Python|JavaScript|TypeScript|React|Vue|Angular)\b/gi,
      /\b(database|MongoDB|PostgreSQL|MySQL|SQLite|Redis)\b/gi,
      /\b(server|client|endpoint|service|middleware)\b/gi
    ];
    
    for (const pattern of techPatterns) {
      const matches = content.match(pattern) || [];
      for (const match of matches) {
        if (!entities.find(e => e.name.toLowerCase() === match.toLowerCase())) {
          entities.push({
            name: match,
            type: 'technical-concept',
            confidence: 0.8
          });
        }
      }
    }
    
    // Business terms
    const businessPatterns = [
      /\b(user|customer|client|admin|manager|developer)\b/gi,
      /\b(project|product|feature|requirement|specification)\b/gi,
      /\b(performance|optimization|scalability|security)\b/gi
    ];
    
    for (const pattern of businessPatterns) {
      const matches = content.match(pattern) || [];
      for (const match of matches) {
        if (!entities.find(e => e.name.toLowerCase() === match.toLowerCase())) {
          entities.push({
            name: match,
            type: 'business-concept',
            confidence: 0.7
          });
        }
      }
    }
    
    return entities.slice(0, 10); // Limit to top 10 entities
  }
  
  extractRelationships(content, entities) {
    const relationships = [];
    
    if (entities.length < 2) return relationships;
    
    // Simple relationship patterns
    const relationshipPatterns = [
      { pattern: /(\w+)\s+uses?\s+(\w+)/gi, type: 'uses' },
      { pattern: /(\w+)\s+requires?\s+(\w+)/gi, type: 'requires' },
      { pattern: /(\w+)\s+connects?\s+to\s+(\w+)/gi, type: 'connects-to' },
      { pattern: /(\w+)\s+depends?\s+on\s+(\w+)/gi, type: 'depends-on' },
      { pattern: /(\w+)\s+integrates?\s+with\s+(\w+)/gi, type: 'integrates-with' }
    ];
    
    for (const { pattern, type } of relationshipPatterns) {
      const matches = Array.from(content.matchAll(pattern));
      
      for (const match of matches) {
        const [, from, to] = match;
        
        const fromEntity = entities.find(e => 
          e.name.toLowerCase().includes(from.toLowerCase())
        );
        const toEntity = entities.find(e => 
          e.name.toLowerCase().includes(to.toLowerCase())
        );
        
        if (fromEntity && toEntity && fromEntity !== toEntity) {
          relationships.push({
            from: fromEntity.name,
            to: toEntity.name,
            type,
            confidence: 0.6
          });
        }
      }
    }
    
    return relationships.slice(0, 5); // Limit to top 5 relationships
  }
  
  // ====================
  // SEARCH OPERATIONS
  // ====================
  
  async semanticSearch(query, options) {
    // Simulate semantic search - replace with actual Graphiti call
    const results = {
      nodes: [],
      relationships: [],
      totalResults: 0
    };
    
    // Search entities
    for (const [id, entity] of this.entityIndex) {
      const relevance = this.calculateRelevance(query, entity.name + ' ' + JSON.stringify(entity.properties));
      
      if (relevance >= options.minRelevance) {
        results.nodes.push({
          id,
          ...entity,
          relevance
        });
      }
    }
    
    // Search relationships if requested
    if (options.includeRelationships) {
      for (const [id, relationship] of this.relationshipIndex) {
        const relevance = this.calculateRelevance(query, relationship.type + ' ' + relationship.from + ' ' + relationship.to);
        
        if (relevance >= options.minRelevance) {
          results.relationships.push({
            id,
            ...relationship,
            relevance
          });
        }
      }
    }
    
    // Sort by relevance
    results.nodes.sort((a, b) => b.relevance - a.relevance);
    results.relationships.sort((a, b) => b.relevance - a.relevance);
    
    // Limit results
    results.nodes = results.nodes.slice(0, options.maxNodes);
    results.relationships = results.relationships.slice(0, options.maxNodes);
    
    results.totalResults = results.nodes.length + results.relationships.length;
    
    return results;
  }
  
  async searchEntities(query, options) {
    const results = { nodes: [], totalResults: 0 };
    
    for (const [id, entity] of this.entityIndex) {
      const relevance = this.calculateRelevance(query, entity.name);
      
      if (relevance >= options.minRelevance) {
        results.nodes.push({
          id,
          ...entity,
          relevance
        });
      }
    }
    
    results.nodes.sort((a, b) => b.relevance - a.relevance);
    results.nodes = results.nodes.slice(0, options.maxNodes);
    results.totalResults = results.nodes.length;
    
    return results;
  }
  
  async searchRelationships(query, options) {
    const results = { relationships: [], totalResults: 0 };
    
    for (const [id, relationship] of this.relationshipIndex) {
      const relevance = this.calculateRelevance(query, relationship.type);
      
      if (relevance >= options.minRelevance) {
        results.relationships.push({
          id,
          ...relationship,
          relevance
        });
      }
    }
    
    results.relationships.sort((a, b) => b.relevance - a.relevance);
    results.relationships = results.relationships.slice(0, options.maxNodes);
    results.totalResults = results.relationships.length;
    
    return results;
  }
  
  calculateRelevance(query, text) {
    // Simple relevance calculation - replace with proper semantic similarity
    const queryTerms = query.toLowerCase().split(/\s+/);
    const textTerms = text.toLowerCase().split(/\s+/);
    
    let matches = 0;
    for (const queryTerm of queryTerms) {
      for (const textTerm of textTerms) {
        if (textTerm.includes(queryTerm) || queryTerm.includes(textTerm)) {
          matches++;
          break;
        }
      }
    }
    
    return matches / queryTerms.length;
  }
  
  // ====================
  // STORAGE OPERATIONS
  // ====================
  
  async storeEpisode(episode) {
    // Simulate storing episode in Graphiti
    const id = episode.uuid || this.generateUUID();
    
    this.knowledgeCache.set(`episode:${id}`, episode);
    
    // Create entities and relationships
    for (const entity of episode.entities || []) {
      await this.createEntity(entity.name, entity.type, {
        episodeId: id,
        confidence: entity.confidence
      });
    }
    
    for (const relationship of episode.relationships || []) {
      await this.createRelationship(
        relationship.from,
        relationship.to,
        relationship.type,
        {
          episodeId: id,
          confidence: relationship.confidence
        }
      );
    }
    
    return { id, stored: true, timestamp: Date.now() };
  }
  
  async storeEntity(entity) {
    // Simulate storing entity in Graphiti
    this.knowledgeCache.set(`entity:${entity.id}`, entity);
    return { id: entity.id, stored: true };
  }
  
  async storeRelationship(relationship) {
    // Simulate storing relationship in Graphiti
    this.knowledgeCache.set(`relationship:${relationship.id}`, relationship);
    return { id: relationship.id, stored: true };
  }
  
  // ====================
  // UTILITY METHODS
  // ====================
  
  updateIndices(episode) {
    // Update entity index
    for (const entity of episode.entities || []) {
      if (!this.entityIndex.has(entity.name)) {
        this.entityIndex.set(entity.name, {
          name: entity.name,
          type: entity.type,
          episodes: [episode.uuid],
          lastSeen: Date.now()
        });
      } else {
        const existing = this.entityIndex.get(entity.name);
        existing.episodes.push(episode.uuid);
        existing.lastSeen = Date.now();
      }
    }
    
    // Update relationship index
    for (const relationship of episode.relationships || []) {
      const key = `${relationship.from}:${relationship.type}:${relationship.to}`;
      if (!this.relationshipIndex.has(key)) {
        this.relationshipIndex.set(key, {
          ...relationship,
          episodes: [episode.uuid],
          lastSeen: Date.now()
        });
      } else {
        const existing = this.relationshipIndex.get(key);
        existing.episodes.push(episode.uuid);
        existing.lastSeen = Date.now();
      }
    }
  }
  
  updateAverageResponseTime(responseTime) {
    if (this.metrics.avgResponseTime === 0) {
      this.metrics.avgResponseTime = responseTime;
    } else {
      this.metrics.avgResponseTime = (this.metrics.avgResponseTime * 0.9) + (responseTime * 0.1);
    }
  }
  
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  handleMCPDisconnection() {
    this.connected = false;
    this.state = 'disconnected';
    
    this.emit('disconnected');
    
    // Attempt reconnection
    if (this.reconnectAttempts < this.config.maxReconnectAttempts) {
      setTimeout(() => {
        this.attemptReconnection();
      }, this.config.reconnectDelay);
    }
  }
  
  async attemptReconnection() {
    this.reconnectAttempts++;
    console.log(`[GraphitiAdapter] Attempting reconnection ${this.reconnectAttempts}/${this.config.maxReconnectAttempts}...`);
    
    try {
      await this.startMCPProcess();
      await this.establishConnection();
      
      this.reconnectAttempts = 0;
      this.state = 'operational';
      console.log('[GraphitiAdapter] Reconnection successful');
      
      this.emit('reconnected');
      
    } catch (error) {
      console.error('[GraphitiAdapter] Reconnection failed:', error);
      
      if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
        this.state = 'error';
        console.error('[GraphitiAdapter] Max reconnection attempts reached');
        this.emit('reconnection-failed');
      }
    }
  }
  
  // ====================
  // PUBLIC API
  // ====================
  
  async getMemoryCount() {
    const episodes = Array.from(this.knowledgeCache.keys()).filter(key => key.startsWith('episode:')).length;
    return episodes;
  }
  
  getStatus() {
    return {
      state: this.state,
      connected: this.connected,
      groupId: this.config.groupId,
      metrics: { ...this.metrics },
      indices: {
        entities: this.entityIndex.size,
        relationships: this.relationshipIndex.size
      },
      cache: this.knowledgeCache.size
    };
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      uptime: Date.now() - this.startTime,
      cacheSize: this.knowledgeCache.size,
      entityCount: this.entityIndex.size,
      relationshipCount: this.relationshipIndex.size
    };
  }
  
  async shutdown() {
    console.log('[GraphitiAdapter] Shutting down Graphiti adapter...');
    
    try {
      this.state = 'shutting-down';
      
      // Close MCP process
      if (this.mcpProcess) {
        this.mcpProcess.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise((resolve) => {
          const timeout = setTimeout(resolve, 5000);
          this.mcpProcess.on('exit', () => {
            clearTimeout(timeout);
            resolve();
          });
        });
      }
      
      // Clear data
      this.knowledgeCache.clear();
      this.entityIndex.clear();
      this.relationshipIndex.clear();
      
      this.state = 'shutdown';
      console.log('[GraphitiAdapter] Shutdown complete');
      
      this.emit('shutdown-complete');
      
    } catch (error) {
      console.error('[GraphitiAdapter] Shutdown error:', error);
      this.emit('shutdown-error', error);
    }
  }
}

module.exports = GraphitiAdapter;