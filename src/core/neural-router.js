/**
 * Neural Router for aegntic-hive-mcp
 * Intelligent request routing with AI-powered decision making
 * Part of Custom Configuration Routing (CCR) system
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');

class NeuralRouter extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.configurations = new Map();
    this.routingHistory = [];
    this.performanceMetrics = new Map();
    this.learningEnabled = options.learningEnabled !== false;
    this.adaptationRate = options.adaptationRate || 0.1;
    this.confidenceThreshold = options.confidenceThreshold || 0.7;
    
    // Weights for routing decision
    this.weights = {
      fileType: 0.3,
      keywords: 0.25,
      patterns: 0.2,
      complexity: 0.15,
      performance: 0.1
    };
    
    // Performance tracking
    this.stats = {
      totalRequests: 0,
      routingAccuracy: 0,
      avgResponseTime: 0,
      configurationUsage: new Map(),
      errorCount: 0
    };
    
    this.initialize();
  }
  
  async initialize() {
    console.log('[NeuralRouter] Initializing neural routing system...');
    
    try {
      // Load configurations
      await this.loadConfigurations();
      
      // Load historical data if available
      await this.loadHistoricalData();
      
      // Start performance monitoring
      setInterval(() => this.updatePerformanceMetrics(), 60000); // Every minute
      
      console.log(`[NeuralRouter] Initialized with ${this.configurations.size} configurations`);
      this.emit('initialized');
      
    } catch (error) {
      console.error('[NeuralRouter] Initialization failed:', error);
      throw error;
    }
  }
  
  async loadConfigurations() {
    const configDir = path.join(__dirname, '../../config');
    
    try {
      // Load CCR configuration
      const ccrPath = path.join(configDir, 'ccr.json');
      const ccrData = await fs.readFile(ccrPath, 'utf8');
      const ccrConfig = JSON.parse(ccrData);
      
      // Register each configuration
      for (const [name, config] of Object.entries(ccrConfig.configurations)) {
        this.registerConfiguration(name, config);
      }
      
      // Load CCHeavy configuration
      const ccheavyPath = path.join(configDir, 'ccheavy.json');
      const ccheavyData = await fs.readFile(ccheavyPath, 'utf8');
      const ccheavyConfig = JSON.parse(ccheavyData);
      
      // Register ccheavy as a special high-performance configuration
      this.registerConfiguration('ccheavy', {
        name: 'Claude Code Heavy',
        priority: 'critical',
        features: ccheavyConfig.features,
        performance: ccheavyConfig.optimizations.performance,
        triggers: {
          keywords: ['performance', 'optimization', 'heavy', 'intensive', 'batch'],
          patterns: ['code generation', 'data processing', 'bulk operations'],
          complexity: ccheavyConfig.thresholds.complexity
        }
      });
      
    } catch (error) {
      console.error('[NeuralRouter] Failed to load configurations:', error);
      // Create default configuration
      this.createDefaultConfiguration();
    }
  }
  
  registerConfiguration(name, config) {
    const enhancedConfig = {
      ...config,
      id: name,
      registeredAt: Date.now(),
      usageCount: 0,
      successRate: 1.0,
      avgResponseTime: 0,
      complexity: config.triggers?.complexity || 0.5
    };
    
    this.configurations.set(name, enhancedConfig);
    this.stats.configurationUsage.set(name, 0);
    
    console.log(`[NeuralRouter] Registered configuration: ${name}`);
  }
  
  createDefaultConfiguration() {
    this.registerConfiguration('default', {
      name: 'Default Configuration',
      priority: 'medium',
      features: {
        basicProcessing: true
      },
      performance: {
        timeout: 30000,
        concurrency: 2
      },
      triggers: {
        keywords: [],
        patterns: [],
        fileTypes: []
      }
    });
  }
  
  async route(request) {
    this.stats.totalRequests++;
    const startTime = Date.now();
    
    try {
      // Analyze request
      const analysis = this.analyzeRequest(request);
      
      // Find best configuration
      const selectedConfig = this.selectConfiguration(analysis);
      
      // Record routing decision
      const routingDecision = {
        timestamp: Date.now(),
        request: {
          type: request.type,
          content: request.content?.substring(0, 100) || '',
          complexity: analysis.complexity
        },
        selectedConfig: selectedConfig.id,
        confidence: analysis.confidence,
        factors: analysis.factors,
        responseTime: null // Will be updated when response is received
      };
      
      this.routingHistory.push(routingDecision);
      
      // Update usage statistics
      this.stats.configurationUsage.set(
        selectedConfig.id, 
        (this.stats.configurationUsage.get(selectedConfig.id) || 0) + 1
      );
      
      selectedConfig.usageCount++;
      
      console.log(`[NeuralRouter] Routed to ${selectedConfig.id} (confidence: ${analysis.confidence.toFixed(2)})`);
      
      return {
        configuration: selectedConfig,
        analysis,
        routingDecision
      };
      
    } catch (error) {
      this.stats.errorCount++;
      console.error('[NeuralRouter] Routing error:', error);
      
      // Fallback to default configuration
      return {
        configuration: this.configurations.get('default') || this.configurations.values().next().value,
        analysis: { confidence: 0, factors: {}, complexity: 0.5 },
        error: error.message
      };
    }
  }
  
  analyzeRequest(request) {
    const factors = {
      fileType: this.analyzeFileType(request),
      keywords: this.analyzeKeywords(request),
      patterns: this.analyzePatterns(request),
      complexity: this.analyzeComplexity(request),
      performance: this.analyzePerformanceRequirements(request)
    };
    
    // Calculate overall confidence
    let confidence = 0;
    let totalWeight = 0;
    
    for (const [factor, score] of Object.entries(factors)) {
      const weight = this.weights[factor] || 0;
      confidence += score * weight;
      totalWeight += weight;
    }
    
    confidence = totalWeight > 0 ? confidence / totalWeight : 0;
    
    return {
      factors,
      confidence,
      complexity: factors.complexity
    };
  }
  
  analyzeFileType(request) {
    if (!request.fileType && !request.content) return 0;
    
    const fileType = request.fileType || this.extractFileType(request.content);
    if (!fileType) return 0;
    
    // Score based on how well configurations handle this file type
    let bestScore = 0;
    for (const config of this.configurations.values()) {
      if (config.triggers?.fileTypes?.includes(fileType)) {
        bestScore = Math.max(bestScore, 1.0);
      }
    }
    
    return bestScore;
  }
  
  analyzeKeywords(request) {
    if (!request.content) return 0;
    
    const content = request.content.toLowerCase();
    let bestScore = 0;
    
    for (const config of this.configurations.values()) {
      if (!config.triggers?.keywords) continue;
      
      let matches = 0;
      const keywords = config.triggers.keywords;
      
      for (const keyword of keywords) {
        if (content.includes(keyword.toLowerCase())) {
          matches++;
        }
      }
      
      const score = keywords.length > 0 ? matches / keywords.length : 0;
      bestScore = Math.max(bestScore, score);
    }
    
    return bestScore;
  }
  
  analyzePatterns(request) {
    if (!request.content) return 0;
    
    const content = request.content.toLowerCase();
    let bestScore = 0;
    
    for (const config of this.configurations.values()) {
      if (!config.triggers?.patterns) continue;
      
      let matches = 0;
      const patterns = config.triggers.patterns;
      
      for (const pattern of patterns) {
        if (content.includes(pattern.toLowerCase())) {
          matches++;
        }
      }
      
      const score = patterns.length > 0 ? matches / patterns.length : 0;
      bestScore = Math.max(bestScore, score);
    }
    
    return bestScore;
  }
  
  analyzeComplexity(request) {
    if (!request.content) return 0.5;
    
    const content = request.content;
    let complexity = 0;
    
    // Simple heuristics for complexity
    complexity += Math.min(content.length / 10000, 0.3); // Length factor
    complexity += (content.match(/\\b(function|class|import|export)\\b/g) || []).length * 0.1; // Code indicators
    complexity += (content.match(/[{}\\[\\]]/g) || []).length * 0.01; // Structure indicators
    
    return Math.min(complexity, 1.0);
  }
  
  analyzePerformanceRequirements(request) {
    if (!request.content) return 0.5;
    
    const content = request.content.toLowerCase();
    const performanceKeywords = [
      'fast', 'quick', 'optimize', 'performance', 'speed', 'efficient',
      'batch', 'bulk', 'large', 'heavy', 'intensive'
    ];
    
    let matches = 0;
    for (const keyword of performanceKeywords) {
      if (content.includes(keyword)) matches++;
    }
    
    return Math.min(matches / performanceKeywords.length * 2, 1.0);
  }
  
  selectConfiguration(analysis) {
    let bestConfig = null;
    let bestScore = -1;
    
    for (const config of this.configurations.values()) {
      let score = 0;
      
      // Factor in analysis confidence
      score += analysis.confidence * 0.4;
      
      // Factor in configuration success rate
      score += config.successRate * 0.3;
      
      // Factor in performance (inverse of response time)
      if (config.avgResponseTime > 0) {
        score += (1 / Math.max(config.avgResponseTime / 1000, 1)) * 0.2;
      } else {
        score += 0.2; // Default for new configurations
      }
      
      // Priority boost
      const priorityBoost = {
        'critical': 0.3,
        'high': 0.2,
        'medium': 0.1,
        'low': 0.0
      };
      score += priorityBoost[config.priority] || 0;
      
      // Complexity matching
      if (config.triggers?.complexity) {
        const complexityMatch = 1 - Math.abs(config.triggers.complexity - analysis.complexity);
        score += complexityMatch * 0.1;
      }
      
      if (score > bestScore) {
        bestScore = score;
        bestConfig = config;
      }
    }
    
    // Fallback to default or first available
    return bestConfig || this.configurations.get('default') || this.configurations.values().next().value;
  }
  
  extractFileType(content) {
    // Simple file type detection based on content
    if (content.includes('function') || content.includes('const') || content.includes('let')) {
      return '.js';
    }
    if (content.includes('def ') || content.includes('import ')) {
      return '.py';
    }
    if (content.includes('public class') || content.includes('import java')) {
      return '.java';
    }
    return null;
  }
  
  recordPerformance(routingDecisionId, responseTime, success) {
    // Find the routing decision
    const decision = this.routingHistory.find(d => d.timestamp === routingDecisionId);
    if (!decision) return;
    
    decision.responseTime = responseTime;
    decision.success = success;
    
    // Update configuration performance
    const config = this.configurations.get(decision.selectedConfig);
    if (config) {
      // Update average response time (exponential moving average)
      if (config.avgResponseTime === 0) {
        config.avgResponseTime = responseTime;
      } else {
        config.avgResponseTime = (config.avgResponseTime * 0.9) + (responseTime * 0.1);
      }
      
      // Update success rate
      const totalAttempts = config.usageCount;
      const successCount = Math.round(config.successRate * (totalAttempts - 1)) + (success ? 1 : 0);
      config.successRate = successCount / totalAttempts;
    }
    
    // Learn from this routing decision if enabled
    if (this.learningEnabled) {
      this.adaptWeights(decision, success);
    }
  }
  
  adaptWeights(decision, success) {
    if (!decision.factors) return;
    
    const adjustment = success ? this.adaptationRate : -this.adaptationRate;
    
    // Adjust weights based on which factors were most important for this decision
    for (const [factor, score] of Object.entries(decision.factors)) {
      if (score > 0.5) { // Only adjust weights for significant factors
        this.weights[factor] = Math.max(0.05, Math.min(0.5, this.weights[factor] + adjustment * score));
      }
    }
    
    // Normalize weights
    const totalWeight = Object.values(this.weights).reduce((sum, w) => sum + w, 0);
    for (const factor in this.weights) {
      this.weights[factor] /= totalWeight;
    }
  }
  
  updatePerformanceMetrics() {
    const recentHistory = this.routingHistory.slice(-100); // Last 100 decisions
    
    if (recentHistory.length === 0) return;
    
    // Calculate routing accuracy
    const successfulDecisions = recentHistory.filter(d => d.success === true).length;
    this.stats.routingAccuracy = successfulDecisions / recentHistory.length;
    
    // Calculate average response time
    const decisionsWithTime = recentHistory.filter(d => d.responseTime !== null);
    if (decisionsWithTime.length > 0) {
      this.stats.avgResponseTime = decisionsWithTime.reduce((sum, d) => sum + d.responseTime, 0) / decisionsWithTime.length;
    }
    
    // Log performance metrics
    console.log('[NeuralRouter] Performance Update:', {
      totalRequests: this.stats.totalRequests,
      routingAccuracy: (this.stats.routingAccuracy * 100).toFixed(1) + '%',
      avgResponseTime: Math.round(this.stats.avgResponseTime) + 'ms',
      errorCount: this.stats.errorCount,
      configurationsActive: this.configurations.size
    });
  }
  
  async loadHistoricalData() {
    try {
      const historyPath = path.join(__dirname, '../data/routing-history.json');
      const data = await fs.readFile(historyPath, 'utf8');
      const history = JSON.parse(data);
      
      this.routingHistory = history.routingHistory || [];
      this.weights = { ...this.weights, ...history.weights };
      
      console.log(`[NeuralRouter] Loaded ${this.routingHistory.length} historical routing decisions`);
    } catch (error) {
      // No historical data available, start fresh
      console.log('[NeuralRouter] No historical data found, starting fresh');
    }
  }
  
  async saveHistoricalData() {
    try {
      const historyPath = path.join(__dirname, '../data/routing-history.json');
      const data = {
        routingHistory: this.routingHistory.slice(-1000), // Keep last 1000 decisions
        weights: this.weights,
        stats: this.stats,
        savedAt: Date.now()
      };
      
      await fs.writeFile(historyPath, JSON.stringify(data, null, 2));
      console.log('[NeuralRouter] Historical data saved');
    } catch (error) {
      console.error('[NeuralRouter] Failed to save historical data:', error);
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      configurations: Array.from(this.configurations.values()).map(config => ({
        id: config.id,
        name: config.name,
        usageCount: config.usageCount,
        successRate: Math.round(config.successRate * 100),
        avgResponseTime: Math.round(config.avgResponseTime)
      })),
      weights: this.weights,
      historySize: this.routingHistory.length
    };
  }
  
  async shutdown() {
    console.log('[NeuralRouter] Shutting down...');
    await this.saveHistoricalData();
    console.log('[NeuralRouter] Shutdown complete');
  }
}

module.exports = NeuralRouter;