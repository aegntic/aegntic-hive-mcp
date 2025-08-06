/**
 * Pattern Engine for aegntic-hive-mcp
 * Advanced learning and adaptation system
 * Integrates with CCR routing and super-hub coordination
 */

const EventEmitter = require('events');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class PatternEngine extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.learningRate = options.learningRate || 0.1;
    this.adaptationThreshold = options.adaptationThreshold || 0.7;
    this.patternRetentionDays = options.patternRetentionDays || 30;
    this.maxPatterns = options.maxPatterns || 10000;
    
    // Pattern storage
    this.patterns = new Map();
    this.routingPatterns = new Map();
    this.performancePatterns = new Map();
    this.emergentPatterns = new Map();
    this.antiPatterns = new Map(); // Patterns that lead to poor performance
    
    // Learning models
    this.routingModel = {
      weights: new Map(),
      biases: new Map(),
      accuracy: 0.5,
      trainingData: [],
      lastTrained: null
    };
    
    this.performanceModel = {
      thresholds: new Map(),
      correlations: new Map(),
      predictions: new Map(),
      accuracy: 0.5,
      lastUpdated: null
    };
    
    // Statistics
    this.stats = {
      patternsLearned: 0,
      routingDecisionsImproved: 0,
      performancePredictionsCorrect: 0,
      adaptationsMade: 0,
      averageAccuracy: 0.5,
      lastLearningSession: null
    };
    
    // Feedback system
    this.feedbackQueue = [];
    this.feedbackProcessor = null;
    
    // CCR integration
    this.ccrConfig = null;
    this.ccheavyConfig = null;
    
    console.log('[PatternEngine] Initializing learning and adaptation system...');
    this.initialize();
  }
  
  async initialize() {
    try {
      // Load existing patterns
      await this.loadPatterns();
      
      // Load CCR configurations
      await this.loadConfigurations();
      
      // Initialize learning models
      this.initializeLearningModels();
      
      // Start feedback processing
      this.startFeedbackProcessing();
      
      // Start periodic learning updates
      this.startPeriodicLearning();
      
      console.log(`[PatternEngine] Initialized with ${this.patterns.size} patterns`);
      this.emit('initialized');
      
    } catch (error) {
      console.error('[PatternEngine] Initialization failed:', error);
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
      
      console.log('[PatternEngine] CCR and CCHeavy configurations loaded');
      
    } catch (error) {
      console.warn('[PatternEngine] Failed to load configurations:', error.message);
    }
  }
  
  initializeLearningModels() {
    // Initialize routing model weights based on CCR configuration
    if (this.ccrConfig?.selectionCriteria?.weights) {
      for (const [factor, weight] of Object.entries(this.ccrConfig.selectionCriteria.weights)) {
        this.routingModel.weights.set(factor, weight);
      }
    } else {
      // Default weights
      this.routingModel.weights.set('fileType', 0.3);
      this.routingModel.weights.set('keywords', 0.25);
      this.routingModel.weights.set('patterns', 0.2);
      this.routingModel.weights.set('complexity', 0.15);
      this.routingModel.weights.set('performance', 0.1);
    }
    
    // Initialize performance model thresholds based on CCHeavy configuration
    if (this.ccheavyConfig?.thresholds) {
      for (const [metric, threshold] of Object.entries(this.ccheavyConfig.thresholds)) {
        this.performanceModel.thresholds.set(metric, threshold);
      }
    }
    
    console.log('[PatternEngine] Learning models initialized');
  }
  
  startFeedbackProcessing() {
    this.feedbackProcessor = setInterval(() => {
      this.processFeedbackQueue();
    }, 5000); // Process feedback every 5 seconds
  }
  
  startPeriodicLearning() {
    // Run learning updates every 10 minutes
    setInterval(() => {
      this.runLearningUpdate();
    }, 600000);
    
    // Run pattern cleanup every hour
    setInterval(() => {
      this.cleanupOldPatterns();
    }, 3600000);
    
    // Run model retraining every 4 hours
    setInterval(() => {
      this.retrainModels();
    }, 14400000);
  }
  
  async recordPattern(pattern) {
    const patternId = this.generatePatternId(pattern);
    const timestamp = Date.now();
    
    const patternRecord = {
      id: patternId,
      type: pattern.type || 'unknown',
      data: pattern.data || pattern,
      confidence: pattern.confidence || 0.5,
      impact: pattern.impact || 'neutral',
      source: pattern.source || 'unknown',
      timestamp,
      frequency: 1,
      lastSeen: timestamp,
      outcomes: [],
      correlations: new Map(),
      adaptations: []
    };
    
    if (this.patterns.has(patternId)) {
      // Update existing pattern
      const existing = this.patterns.get(patternId);
      existing.frequency++;
      existing.lastSeen = timestamp;
      existing.confidence = this.updateConfidence(existing.confidence, pattern.confidence || 0.5);
      
      // Store in specific pattern type map
      this.categorizePattern(existing);
    } else {
      // New pattern
      this.patterns.set(patternId, patternRecord);
      this.stats.patternsLearned++;
      
      // Store in specific pattern type map
      this.categorizePattern(patternRecord);
      
      console.log(`[PatternEngine] New pattern recorded: ${patternRecord.type} (${patternId})`);
    }
    
    this.emit('pattern-recorded', patternRecord);
    return patternRecord;
  }
  
  categorizePattern(pattern) {
    switch (pattern.type) {
      case 'routing-pattern':
      case 'routing':
        this.routingPatterns.set(pattern.id, pattern);
        break;
        
      case 'performance-pattern':
      case 'performance':
        this.performancePatterns.set(pattern.id, pattern);
        break;
        
      case 'emergent-pattern':
      case 'emergent':
        this.emergentPatterns.set(pattern.id, pattern);
        break;
        
      case 'anti-pattern':
        this.antiPatterns.set(pattern.id, pattern);
        break;
    }
  }
  
  async recordFeedback(decisionId, outcome) {
    this.feedbackQueue.push({
      decisionId,
      outcome,
      timestamp: Date.now(),
      processed: false
    });
    
    // Immediate processing for critical feedback
    if (outcome.critical) {
      await this.processFeedback({ decisionId, outcome, timestamp: Date.now() });
    }
  }
  
  async processFeedbackQueue() {
    if (this.feedbackQueue.length === 0) return;
    
    const unprocessed = this.feedbackQueue.filter(f => !f.processed);
    
    for (const feedback of unprocessed.slice(0, 10)) { // Process up to 10 at a time
      await this.processFeedback(feedback);
      feedback.processed = true;
    }
    
    // Clean up processed feedback older than 1 hour
    const cutoff = Date.now() - 3600000;
    this.feedbackQueue = this.feedbackQueue.filter(f => !f.processed || f.timestamp > cutoff);
  }
  
  async processFeedback(feedback) {
    try {
      const { decisionId, outcome } = feedback;
      
      // Update routing model based on feedback
      if (outcome.routingCorrect !== undefined) {
        await this.updateRoutingModel(decisionId, outcome);
      }
      
      // Update performance predictions
      if (outcome.performanceActual !== undefined) {
        await this.updatePerformanceModel(decisionId, outcome);
      }
      
      // Learn from patterns in the outcome
      if (outcome.patterns) {
        for (const pattern of outcome.patterns) {
          await this.recordPattern({
            ...pattern,
            source: 'feedback',
            outcome: outcome.success ? 'positive' : 'negative'
          });
        }
      }
      
      // Adapt weights if needed
      if (outcome.success === false && outcome.confidence > 0.7) {
        await this.adaptToFailure(decisionId, outcome);
      }
      
      this.emit('feedback-processed', feedback);
      
    } catch (error) {
      console.error('[PatternEngine] Feedback processing error:', error);
    }
  }
  
  async updateRoutingModel(decisionId, outcome) {
    const trainingPoint = {
      decisionId,
      correct: outcome.routingCorrect,
      factors: outcome.factors || {},
      selectedConfig: outcome.selectedConfig,
      optimalConfig: outcome.optimalConfig,
      timestamp: Date.now()
    };
    
    this.routingModel.trainingData.push(trainingPoint);
    
    // Update routing accuracy
    const recentData = this.routingModel.trainingData.slice(-100);
    const correctDecisions = recentData.filter(d => d.correct).length;
    this.routingModel.accuracy = correctDecisions / recentData.length;
    
    // Adapt weights based on feedback
    if (!outcome.routingCorrect && outcome.factors) {
      await this.adaptRoutingWeights(outcome.factors, outcome.selectedConfig, outcome.optimalConfig);
    }
    
    if (this.routingModel.accuracy > this.stats.averageAccuracy) {
      this.stats.routingDecisionsImproved++;
    }
  }
  
  async adaptRoutingWeights(factors, selectedConfig, optimalConfig) {
    if (!optimalConfig || selectedConfig === optimalConfig) return;
    
    // Decrease weights for factors that led to wrong decision
    for (const [factor, score] of Object.entries(factors)) {
      if (score > 0.5) { // Factor was significant in wrong decision
        const currentWeight = this.routingModel.weights.get(factor) || 0;
        const newWeight = Math.max(0.05, currentWeight * (1 - this.learningRate));
        this.routingModel.weights.set(factor, newWeight);
      }
    }
    
    // Normalize weights
    this.normalizeWeights();
    
    this.stats.adaptationsMade++;
    console.log(`[PatternEngine] Adapted routing weights for ${selectedConfig} -> ${optimalConfig}`);
    
    this.emit('weights-adapted', {
      factors,
      selectedConfig,
      optimalConfig,
      newWeights: Object.fromEntries(this.routingModel.weights)
    });
  }
  
  normalizeWeights() {
    const weights = Array.from(this.routingModel.weights.values());
    const total = weights.reduce((sum, w) => sum + w, 0);
    
    if (total > 0) {
      for (const [factor, weight] of this.routingModel.weights) {
        this.routingModel.weights.set(factor, weight / total);
      }
    }
  }
  
  async updatePerformanceModel(decisionId, outcome) {
    const { performancePredicted, performanceActual } = outcome;
    
    const predictionError = Math.abs(performancePredicted - performanceActual) / performanceActual;
    const accurate = predictionError < 0.2; // Within 20% is considered accurate
    
    if (accurate) {
      this.stats.performancePredictionsCorrect++;
    }
    
    // Update performance correlations
    if (outcome.factors) {
      for (const [factor, score] of Object.entries(outcome.factors)) {
        if (!this.performanceModel.correlations.has(factor)) {
          this.performanceModel.correlations.set(factor, []);
        }
        
        this.performanceModel.correlations.get(factor).push({
          score,
          actualPerformance: performanceActual,
          timestamp: Date.now()
        });
        
        // Keep only recent correlations
        const correlations = this.performanceModel.correlations.get(factor);
        if (correlations.length > 100) {
          correlations.splice(0, correlations.length - 100);
        }
      }
    }
    
    // Update performance model accuracy
    const recentPredictions = Array.from(this.performanceModel.predictions.values())
      .filter(p => Date.now() - p.timestamp < 3600000) // Last hour
      .slice(-50);
    
    if (recentPredictions.length > 0) {
      const accuratePredictions = recentPredictions.filter(p => 
        Math.abs(p.predicted - p.actual) / p.actual < 0.2
      ).length;
      
      this.performanceModel.accuracy = accuratePredictions / recentPredictions.length;
    }
    
    this.performanceModel.lastUpdated = Date.now();
  }
  
  async adaptToFailure(decisionId, outcome) {
    // Record as anti-pattern if confidence was high but result was poor
    const antiPattern = {
      type: 'anti-pattern',
      data: {
        decisionId,
        factors: outcome.factors,
        selectedConfig: outcome.selectedConfig,
        failure: outcome.failure || 'unknown',
        confidence: outcome.confidence
      },
      impact: 'negative',
      source: 'failure-adaptation',
      confidence: outcome.confidence
    };
    
    await this.recordPattern(antiPattern);
    
    // Adapt system to avoid similar failures
    if (outcome.factors) {
      // Reduce confidence in factors that led to failure
      for (const [factor, score] of Object.entries(outcome.factors)) {
        if (score > 0.7) { // High influence factors
          const currentWeight = this.routingModel.weights.get(factor) || 0;
          const reduction = this.learningRate * outcome.confidence;
          const newWeight = Math.max(0.05, currentWeight - reduction);
          this.routingModel.weights.set(factor, newWeight);
        }
      }
      
      this.normalizeWeights();
    }
    
    console.log(`[PatternEngine] Adapted to failure: ${outcome.failure} (decision: ${decisionId})`);
  }
  
  async predictRouting(request) {
    try {
      const factors = this.analyzeRequest(request);
      const predictions = new Map();
      
      // Get available configurations (from CCR config)
      const configurations = this.ccrConfig?.configurations || {};
      
      for (const [configId, config] of Object.entries(configurations)) {
        const score = this.calculateConfigurationScore(factors, config);
        predictions.set(configId, {
          score,
          confidence: this.calculatePredictionConfidence(factors, config),
          expectedPerformance: await this.predictPerformance(factors, config),
          factors: this.getRelevantFactors(factors, config)
        });
      }
      
      // Add CCHeavy prediction
      if (this.ccheavyConfig) {
        const ccheavyScore = this.calculateCCHeavyScore(factors);
        predictions.set('ccheavy', {
          score: ccheavyScore.score,
          confidence: ccheavyScore.confidence,
          expectedPerformance: await this.predictCCHeavyPerformance(factors),
          factors: ccheavyScore.factors
        });
      }
      
      // Sort by score
      const sortedPredictions = Array.from(predictions.entries())
        .sort(([,a], [,b]) => b.score - a.score);
      
      const topPrediction = sortedPredictions[0];
      
      return {
        recommended: topPrediction ? topPrediction[0] : 'default',
        confidence: topPrediction ? topPrediction[1].confidence : 0.5,
        alternatives: sortedPredictions.slice(1, 4), // Top 3 alternatives
        factors,
        modelAccuracy: this.routingModel.accuracy,
        predictions: Object.fromEntries(predictions)
      };
      
    } catch (error) {
      console.error('[PatternEngine] Routing prediction error:', error);
      return {
        recommended: 'default',
        confidence: 0.1,
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
      performance: this.analyzePerformanceNeeds(request),
      context: this.analyzeContext(request)
    };
    
    return factors;
  }
  
  analyzeFileType(request) {
    if (!request.fileType && !request.content) return { score: 0, details: {} };
    
    const fileType = request.fileType || this.extractFileType(request.content);
    
    return {
      score: fileType ? 1.0 : 0,
      fileType,
      details: {
        extension: fileType,
        category: this.categorizeFileType(fileType)
      }
    };
  }
  
  analyzeKeywords(request) {
    if (!request.content) return { score: 0, matches: [] };
    
    const content = request.content.toLowerCase();
    const allMatches = [];
    
    // Check against all configuration keywords
    if (this.ccrConfig?.configurations) {
      for (const [configId, config] of Object.entries(this.ccrConfig.configurations)) {
        if (config.triggers?.keywords) {
          const matches = config.triggers.keywords.filter(keyword => 
            content.includes(keyword.toLowerCase())
          );
          
          if (matches.length > 0) {
            allMatches.push({
              config: configId,
              matches,
              score: matches.length / config.triggers.keywords.length
            });
          }
        }
      }
    }
    
    const bestMatch = allMatches.reduce((best, current) => 
      current.score > best.score ? current : best, { score: 0 }
    );
    
    return {
      score: bestMatch.score,
      matches: allMatches,
      bestConfig: bestMatch.config,
      keywords: bestMatch.matches || []
    };
  }
  
  analyzePatterns(request) {
    if (!request.content) return { score: 0, patterns: [] };
    
    const content = request.content.toLowerCase();
    const detectedPatterns = [];
    
    // Check learned patterns
    for (const [patternId, pattern] of this.patterns) {
      if (pattern.type === 'routing-pattern' && this.matchesPattern(content, pattern)) {
        detectedPatterns.push({
          id: patternId,
          type: pattern.type,
          confidence: pattern.confidence,
          frequency: pattern.frequency,
          match: true
        });
      }
    }
    
    // Check configuration patterns
    if (this.ccrConfig?.configurations) {
      for (const [configId, config] of Object.entries(this.ccrConfig.configurations)) {
        if (config.triggers?.patterns) {
          const matches = config.triggers.patterns.filter(pattern => 
            content.includes(pattern.toLowerCase())
          );
          
          if (matches.length > 0) {
            detectedPatterns.push({
              config: configId,
              patterns: matches,
              score: matches.length / config.triggers.patterns.length,
              type: 'config-pattern'
            });
          }
        }
      }
    }
    
    const totalScore = detectedPatterns.reduce((sum, p) => sum + (p.score || p.confidence || 0), 0);
    
    return {
      score: Math.min(totalScore, 1.0),
      patterns: detectedPatterns,
      count: detectedPatterns.length
    };
  }
  
  analyzeComplexity(request) {
    if (!request.content) return { score: 0.5, factors: {} };
    
    const content = request.content;
    const factors = {
      length: Math.min(content.length / 10000, 1.0),
      codeComplexity: this.calculateCodeComplexity(content),
      structuralComplexity: this.calculateStructuralComplexity(content),
      conceptualComplexity: this.calculateConceptualComplexity(content)
    };
    
    const weights = { length: 0.2, codeComplexity: 0.3, structuralComplexity: 0.3, conceptualComplexity: 0.2 };
    const score = Object.entries(factors).reduce((sum, [factor, value]) => 
      sum + (value * weights[factor]), 0
    );
    
    return {
      score: Math.min(score, 1.0),
      factors,
      category: this.categorizeComplexity(score)
    };
  }
  
  analyzePerformanceNeeds(request) {
    if (!request.content) return { score: 0.5, indicators: [] };
    
    const content = request.content.toLowerCase();
    const performanceKeywords = [
      { word: 'fast', weight: 1.0 },
      { word: 'quick', weight: 0.8 },
      { word: 'optimize', weight: 1.2 },
      { word: 'performance', weight: 1.5 },
      { word: 'speed', weight: 1.0 },
      { word: 'efficient', weight: 1.1 },
      { word: 'batch', weight: 1.3 },
      { word: 'bulk', weight: 1.2 },
      { word: 'large', weight: 0.9 },
      { word: 'heavy', weight: 1.4 },
      { word: 'intensive', weight: 1.3 },
      { word: 'scale', weight: 1.1 },
      { word: 'concurrent', weight: 1.4 },
      { word: 'parallel', weight: 1.5 }
    ];
    
    const indicators = [];
    let totalScore = 0;
    
    for (const { word, weight } of performanceKeywords) {
      if (content.includes(word)) {
        indicators.push({ word, weight, found: true });
        totalScore += weight;
      }
    }
    
    const normalizedScore = Math.min(totalScore / performanceKeywords.length, 1.0);
    
    return {
      score: normalizedScore,
      indicators,
      category: normalizedScore > 0.7 ? 'high' : normalizedScore > 0.4 ? 'medium' : 'low',
      ccheavyRecommended: normalizedScore > 0.6
    };
  }
  
  analyzeContext(request) {
    const context = {
      timestamp: Date.now(),
      source: request.source || 'unknown',
      priority: request.priority || 'medium',
      environment: request.environment || 'production'
    };
    
    // Analyze current system load
    context.systemLoad = this.getCurrentSystemLoad();
    
    // Analyze historical patterns for similar requests
    context.historicalPattern = this.findHistoricalPattern(request);
    
    return {
      score: 0.5, // Context analysis score
      details: context
    };
  }
  
  calculateConfigurationScore(factors, config) {
    let score = 0;
    const weights = this.routingModel.weights;
    
    // File type matching
    if (config.triggers?.fileTypes && factors.fileType?.fileType) {
      const match = config.triggers.fileTypes.includes(factors.fileType.fileType);
      score += match ? (weights.get('fileType') || 0.3) : 0;
    }
    
    // Keyword matching
    if (factors.keywords?.bestConfig === config.id || 
        (factors.keywords?.matches || []).some(m => m.config === config.id)) {
      score += factors.keywords.score * (weights.get('keywords') || 0.25);
    }
    
    // Pattern matching
    const patternMatches = (factors.patterns?.patterns || [])
      .filter(p => p.config === config.id);
    if (patternMatches.length > 0) {
      const avgPatternScore = patternMatches.reduce((sum, p) => sum + p.score, 0) / patternMatches.length;
      score += avgPatternScore * (weights.get('patterns') || 0.2);
    }
    
    // Complexity matching
    const configComplexity = config.complexity || 0.5;
    const complexityMatch = 1 - Math.abs(configComplexity - factors.complexity.score);
    score += complexityMatch * (weights.get('complexity') || 0.15);
    
    // Performance matching
    const performanceMatch = this.calculatePerformanceMatch(factors.performance, config);
    score += performanceMatch * (weights.get('performance') || 0.1);
    
    return Math.min(score, 1.0);
  }
  
  calculateCCHeavyScore(factors) {
    let score = 0;
    const factorDetails = {
      complexity: false,
      performance: false,
      keywords: false,
      patterns: false
    };
    
    // High complexity preference
    if (factors.complexity.score > 0.7) {
      score += 0.4;
      factorDetails.complexity = true;
    }
    
    // High performance requirements
    if (factors.performance.score > 0.6) {
      score += 0.3;
      factorDetails.performance = true;
    }
    
    // Performance keywords
    if (factors.performance.ccheavyRecommended) {
      score += 0.2;
      factorDetails.keywords = true;
    }
    
    // Intensive patterns
    const intensivePatterns = (factors.patterns?.patterns || [])
      .filter(p => p.type === 'intensive' || p.confidence > 0.8);
    if (intensivePatterns.length > 0) {
      score += 0.1;
      factorDetails.patterns = true;
    }
    
    return {
      score: Math.min(score, 1.0),
      confidence: score > 0.5 ? 0.8 : 0.5,
      factors: factorDetails
    };
  }
  
  calculatePredictionConfidence(factors, config) {
    let confidence = 0.5;
    
    // Historical accuracy for this configuration
    const configHistory = this.routingModel.trainingData
      .filter(d => d.selectedConfig === config.id)
      .slice(-20); // Recent decisions
    
    if (configHistory.length > 0) {
      const successRate = configHistory.filter(d => d.correct).length / configHistory.length;
      confidence = (confidence + successRate) / 2;
    }
    
    // Pattern confidence
    const relevantPatterns = (factors.patterns?.patterns || [])
      .filter(p => p.config === config.id);
    
    if (relevantPatterns.length > 0) {
      const avgPatternConfidence = relevantPatterns.reduce((sum, p) => 
        sum + (p.confidence || 0.5), 0) / relevantPatterns.length;
      confidence = (confidence + avgPatternConfidence) / 2;
    }
    
    // Model accuracy adjustment
    confidence = confidence * this.routingModel.accuracy;
    
    return Math.min(Math.max(confidence, 0.1), 0.95);
  }
  
  async predictPerformance(factors, config) {
    try {
      const basePerformance = {
        responseTime: config.performance?.timeout || 30000,
        throughput: config.performance?.concurrency || 2,
        reliability: 0.95
      };
      
      // Adjust based on complexity
      const complexityFactor = 1 + (factors.complexity.score * 0.5);
      basePerformance.responseTime *= complexityFactor;
      basePerformance.throughput /= Math.sqrt(complexityFactor);
      
      // Adjust based on performance requirements
      if (factors.performance.score > 0.8) {
        basePerformance.responseTime *= 0.8; // Performance optimization expected
        basePerformance.reliability += 0.02;
      }
      
      // Historical correlation adjustments
      const correlations = this.performanceModel.correlations;
      for (const [factor, data] of correlations) {
        if (factors[factor] && data.length > 0) {
          const recentData = data.slice(-20);
          const avgPerformance = recentData.reduce((sum, d) => sum + d.actualPerformance, 0) / recentData.length;
          const correlation = this.calculateCorrelation(recentData);
          
          if (correlation > 0.5) {
            basePerformance.responseTime = (basePerformance.responseTime + avgPerformance) / 2;
          }
        }
      }
      
      return {
        expectedResponseTime: Math.round(basePerformance.responseTime),
        expectedThroughput: Math.round(basePerformance.throughput * 10) / 10,
        reliability: Math.round(basePerformance.reliability * 100) / 100,
        confidence: this.performanceModel.accuracy
      };
      
    } catch (error) {
      console.error('[PatternEngine] Performance prediction error:', error);
      return {
        expectedResponseTime: 30000,
        expectedThroughput: 2,
        reliability: 0.95,
        confidence: 0.5
      };
    }
  }
  
  async predictCCHeavyPerformance(factors) {
    const ccheavyConfig = this.ccheavyConfig?.optimizations?.performance || {};
    
    const basePerformance = {
      responseTime: ccheavyConfig.processingTimeout || 60000,
      throughput: ccheavyConfig.concurrentRequests || 8,
      reliability: 0.98
    };
    
    // CCHeavy performs better with high complexity
    if (factors.complexity.score > 0.7) {
      basePerformance.responseTime *= 0.6; // Significant improvement
      basePerformance.throughput *= 1.5;
    }
    
    // Performance optimization benefits
    if (factors.performance.score > 0.8) {
      basePerformance.responseTime *= 0.4; // Major improvement
      basePerformance.throughput *= 2;
      basePerformance.reliability += 0.01;
    }
    
    return {
      expectedResponseTime: Math.round(basePerformance.responseTime),
      expectedThroughput: Math.round(basePerformance.throughput * 10) / 10,
      reliability: Math.round(basePerformance.reliability * 100) / 100,
      confidence: 0.85, // CCHeavy has consistent performance
      optimizations: {
        parallelProcessing: true,
        caching: this.ccheavyConfig?.features?.caching?.multilevel || false,
        processPooling: this.ccheavyConfig?.features?.processPooling?.enabled || false
      }
    };
  }
  
  async runLearningUpdate() {
    console.log('[PatternEngine] Running learning update...');
    
    try {
      // Update model accuracy
      this.updateModelAccuracy();
      
      // Identify new patterns
      await this.identifyNewPatterns();
      
      // Update correlations
      this.updateCorrelations();
      
      // Adapt weights based on recent performance
      await this.adaptWeightsFromPerformance();
      
      this.stats.lastLearningSession = Date.now();
      this.stats.averageAccuracy = (this.routingModel.accuracy + this.performanceModel.accuracy) / 2;
      
      console.log(`[PatternEngine] Learning update complete. Accuracy: ${(this.stats.averageAccuracy * 100).toFixed(1)}%`);
      
      this.emit('learning-update', {
        accuracy: this.stats.averageAccuracy,
        patterns: this.patterns.size,
        adaptations: this.stats.adaptationsMade
      });
      
    } catch (error) {
      console.error('[PatternEngine] Learning update failed:', error);
    }
  }
  
  updateModelAccuracy() {
    // Calculate routing model accuracy
    const recentRoutingData = this.routingModel.trainingData.slice(-100);
    if (recentRoutingData.length > 0) {
      const correct = recentRoutingData.filter(d => d.correct).length;
      this.routingModel.accuracy = correct / recentRoutingData.length;
    }
    
    // Update performance model accuracy
    const recentPredictions = Array.from(this.performanceModel.predictions.values())
      .filter(p => Date.now() - p.timestamp < 3600000) // Last hour
      .slice(-50);
    
    if (recentPredictions.length > 0) {
      const accurate = recentPredictions.filter(p => 
        Math.abs(p.predicted - p.actual) / p.actual < 0.2
      ).length;
      
      this.performanceModel.accuracy = accurate / recentPredictions.length;
    }
  }
  
  async identifyNewPatterns() {
    // Analyze recent decisions for new patterns
    const recentDecisions = this.routingModel.trainingData.slice(-50);
    
    // Group by configuration
    const configGroups = new Map();
    for (const decision of recentDecisions) {
      if (!configGroups.has(decision.selectedConfig)) {
        configGroups.set(decision.selectedConfig, []);
      }
      configGroups.get(decision.selectedConfig).push(decision);
    }
    
    // Look for patterns in each configuration group
    for (const [config, decisions] of configGroups) {
      if (decisions.length >= 5) {
        const pattern = this.extractDecisionPattern(config, decisions);
        if (pattern.confidence > 0.7) {
          await this.recordPattern({
            type: 'routing-pattern',
            data: pattern,
            confidence: pattern.confidence,
            source: 'learning-update'
          });
        }
      }
    }
  }
  
  extractDecisionPattern(config, decisions) {
    const factors = {
      avgComplexity: 0,
      commonKeywords: new Map(),
      successRate: 0,
      avgResponseTime: 0
    };
    
    let totalComplexity = 0;
    let successCount = 0;
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    
    for (const decision of decisions) {
      // Complexity analysis
      if (decision.factors?.complexity) {
        totalComplexity += decision.factors.complexity;
      }
      
      // Success analysis
      if (decision.correct) {
        successCount++;
      }
      
      // Response time analysis (would come from feedback)
      if (decision.responseTime) {
        totalResponseTime += decision.responseTime;
        responseTimeCount++;
      }
      
      // Keyword analysis
      if (decision.factors?.keywords) {
        for (const keyword of decision.factors.keywords) {
          factors.commonKeywords.set(keyword, (factors.commonKeywords.get(keyword) || 0) + 1);
        }
      }
    }
    
    factors.avgComplexity = totalComplexity / decisions.length;
    factors.successRate = successCount / decisions.length;
    factors.avgResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
    
    // Find most common keywords (appearing in >50% of decisions)
    const commonKeywords = Array.from(factors.commonKeywords.entries())
      .filter(([, count]) => count > decisions.length * 0.5)
      .map(([keyword]) => keyword);
    
    return {
      configuration: config,
      factors,
      commonKeywords,
      sampleSize: decisions.length,
      confidence: factors.successRate > 0.8 ? 0.9 : factors.successRate > 0.6 ? 0.7 : 0.5,
      pattern: {
        type: 'configuration-usage',
        config,
        characteristics: {
          complexity: this.categorizeComplexity(factors.avgComplexity),
          keywords: commonKeywords,
          performance: factors.avgResponseTime > 0 ? 'measured' : 'unknown'
        }
      }
    };
  }
  
  updateCorrelations() {
    // Update performance correlations for each factor
    for (const [factor, data] of this.performanceModel.correlations) {
      if (data.length > 5) {
        const correlation = this.calculateCorrelation(data.slice(-50)); // Last 50 data points
        
        if (Math.abs(correlation) > 0.5) {
          console.log(`[PatternEngine] Strong correlation found: ${factor} -> performance (${correlation.toFixed(2)})`);
          
          // Use correlation to improve predictions
          this.updateFactorWeight(factor, correlation);
        }
      }
    }
  }
  
  calculateCorrelation(data) {
    if (data.length < 2) return 0;
    
    const n = data.length;
    const sumX = data.reduce((sum, d) => sum + d.score, 0);
    const sumY = data.reduce((sum, d) => sum + d.actualPerformance, 0);
    const sumXY = data.reduce((sum, d) => sum + (d.score * d.actualPerformance), 0);
    const sumX2 = data.reduce((sum, d) => sum + (d.score * d.score), 0);
    const sumY2 = data.reduce((sum, d) => sum + (d.actualPerformance * d.actualPerformance), 0);
    
    const numerator = (n * sumXY) - (sumX * sumY);
    const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
  
  updateFactorWeight(factor, correlation) {
    const currentWeight = this.routingModel.weights.get(factor) || 0.1;
    const adjustment = Math.abs(correlation) * this.learningRate;
    
    // Increase weight for strong positive correlations, decrease for strong negative
    const newWeight = correlation > 0 ? 
      Math.min(currentWeight + adjustment, 0.5) :
      Math.max(currentWeight - adjustment, 0.05);
    
    this.routingModel.weights.set(factor, newWeight);
    this.normalizeWeights();
    
    this.stats.adaptationsMade++;
  }
  
  async adaptWeightsFromPerformance() {
    // Analyze recent performance to adapt weights
    const recentTraining = this.routingModel.trainingData.slice(-30);
    
    if (recentTraining.length < 10) return;
    
    // Group by correctness
    const correct = recentTraining.filter(d => d.correct);
    const incorrect = recentTraining.filter(d => !d.correct);
    
    if (correct.length === 0 || incorrect.length === 0) return;
    
    // Analyze factor differences between correct and incorrect decisions
    const factorAnalysis = new Map();
    
    for (const decision of correct) {
      if (decision.factors) {
        for (const [factor, score] of Object.entries(decision.factors)) {
          if (!factorAnalysis.has(factor)) {
            factorAnalysis.set(factor, { correct: [], incorrect: [] });
          }
          factorAnalysis.get(factor).correct.push(score);
        }
      }
    }
    
    for (const decision of incorrect) {
      if (decision.factors) {
        for (const [factor, score] of Object.entries(decision.factors)) {
          if (factorAnalysis.has(factor)) {
            factorAnalysis.get(factor).incorrect.push(score);
          }
        }
      }
    }
    
    // Adjust weights based on factor performance
    for (const [factor, data] of factorAnalysis) {
      if (data.correct.length > 0 && data.incorrect.length > 0) {
        const correctAvg = data.correct.reduce((sum, s) => sum + s, 0) / data.correct.length;
        const incorrectAvg = data.incorrect.reduce((sum, s) => sum + s, 0) / data.incorrect.length;
        
        const difference = correctAvg - incorrectAvg;
        
        // If correct decisions had higher scores for this factor, increase its weight
        if (Math.abs(difference) > 0.1) {
          const currentWeight = this.routingModel.weights.get(factor) || 0.1;
          const adjustment = difference > 0 ? this.learningRate : -this.learningRate;
          const newWeight = Math.max(0.05, Math.min(0.5, currentWeight + adjustment));
          
          this.routingModel.weights.set(factor, newWeight);
          this.stats.adaptationsMade++;
        }
      }
    }
    
    this.normalizeWeights();
  }
  
  async retrainModels() {
    console.log('[PatternEngine] Retraining models...');
    
    try {
      // Retrain routing model
      await this.retrainRoutingModel();
      
      // Retrain performance model
      await this.retrainPerformanceModel();
      
      // Update pattern confidences
      this.updatePatternConfidences();
      
      this.routingModel.lastTrained = Date.now();
      this.performanceModel.lastUpdated = Date.now();
      
      console.log('[PatternEngine] Model retraining complete');
      
      this.emit('models-retrained', {
        routingAccuracy: this.routingModel.accuracy,
        performanceAccuracy: this.performanceModel.accuracy,
        patterns: this.patterns.size
      });
      
    } catch (error) {
      console.error('[PatternEngine] Model retraining failed:', error);
    }
  }
  
  async retrainRoutingModel() {
    const trainingData = this.routingModel.trainingData.slice(-500); // Use recent data
    
    if (trainingData.length < 50) return;
    
    // Simple weight adjustment based on success patterns
    const successfulFactors = new Map();
    const unsuccessfulFactors = new Map();
    
    for (const data of trainingData) {
      const targetMap = data.correct ? successfulFactors : unsuccessfulFactors;
      
      if (data.factors) {
        for (const [factor, score] of Object.entries(data.factors)) {
          if (!targetMap.has(factor)) {
            targetMap.set(factor, []);
          }
          targetMap.get(factor).push(score);
        }
      }
    }
    
    // Adjust weights based on successful vs unsuccessful patterns
    for (const factor of this.routingModel.weights.keys()) {
      const successScores = successfulFactors.get(factor) || [];
      const failScores = unsuccessfulFactors.get(factor) || [];
      
      if (successScores.length > 0 && failScores.length > 0) {
        const successAvg = successScores.reduce((sum, s) => sum + s, 0) / successScores.length;
        const failAvg = failScores.reduce((sum, s) => sum + s, 0) / failScores.length;
        
        const performance = successAvg - failAvg;
        const currentWeight = this.routingModel.weights.get(factor);
        
        // Adjust weight based on performance difference
        const adjustment = performance * this.learningRate * 0.5; // Conservative adjustment
        const newWeight = Math.max(0.05, Math.min(0.5, currentWeight + adjustment));
        
        this.routingModel.weights.set(factor, newWeight);
      }
    }
    
    this.normalizeWeights();
  }
  
  async retrainPerformanceModel() {
    // Update performance thresholds based on recent data
    const recentPredictions = Array.from(this.performanceModel.predictions.values())
      .filter(p => Date.now() - p.timestamp < 86400000) // Last 24 hours
      .slice(-200);
    
    if (recentPredictions.length < 20) return;
    
    // Calculate new thresholds based on actual performance
    const responseTimeData = recentPredictions.map(p => p.actual).sort((a, b) => a - b);
    const p50 = responseTimeData[Math.floor(responseTimeData.length * 0.5)];
    const p90 = responseTimeData[Math.floor(responseTimeData.length * 0.9)];
    const p95 = responseTimeData[Math.floor(responseTimeData.length * 0.95)];
    
    // Update thresholds
    this.performanceModel.thresholds.set('response_time_p50', p50);
    this.performanceModel.thresholds.set('response_time_p90', p90);
    this.performanceModel.thresholds.set('response_time_p95', p95);
    
    console.log(`[PatternEngine] Updated performance thresholds: P50=${p50}ms, P90=${p90}ms, P95=${p95}ms`);
  }
  
  updatePatternConfidences() {
    // Update pattern confidences based on recent outcomes
    const cutoff = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    for (const [patternId, pattern] of this.patterns) {
      if (pattern.lastSeen > cutoff && pattern.outcomes.length > 0) {
        const recentOutcomes = pattern.outcomes.slice(-10);
        const successRate = recentOutcomes.filter(o => o.success).length / recentOutcomes.length;
        
        // Update confidence based on success rate and frequency
        const frequencyFactor = Math.min(pattern.frequency / 10, 1.0);
        const newConfidence = (successRate * 0.7) + (frequencyFactor * 0.3);
        
        pattern.confidence = (pattern.confidence + newConfidence) / 2;
        
        // Mark as anti-pattern if consistently poor performance
        if (pattern.confidence < 0.3 && recentOutcomes.length >= 5) {
          pattern.type = 'anti-pattern';
          this.antiPatterns.set(patternId, pattern);
        }
      }
    }
  }
  
  async cleanupOldPatterns() {
    const cutoff = Date.now() - (this.patternRetentionDays * 24 * 60 * 60 * 1000);
    let removedCount = 0;
    
    for (const [patternId, pattern] of this.patterns) {
      // Remove old, low-confidence patterns
      if (pattern.lastSeen < cutoff && pattern.confidence < 0.3 && pattern.frequency < 3) {
        this.patterns.delete(patternId);
        this.routingPatterns.delete(patternId);
        this.performancePatterns.delete(patternId);
        this.emergentPatterns.delete(patternId);
        this.antiPatterns.delete(patternId);
        removedCount++;
      }
    }
    
    // Limit total patterns
    if (this.patterns.size > this.maxPatterns) {
      const sortedPatterns = Array.from(this.patterns.entries())
        .sort(([,a], [,b]) => (b.confidence * b.frequency) - (a.confidence * a.frequency));
      
      const toRemove = this.patterns.size - this.maxPatterns;
      for (let i = 0; i < toRemove; i++) {
        const [patternId] = sortedPatterns[sortedPatterns.length - 1 - i];
        this.patterns.delete(patternId);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      console.log(`[PatternEngine] Cleaned up ${removedCount} old patterns`);
    }
  }
  
  // Helper methods
  
  generatePatternId(pattern) {
    const data = pattern.data || pattern;
    const hash = crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
    return hash.substring(0, 16);
  }
  
  updateConfidence(oldConfidence, newConfidence) {
    // Exponential moving average
    return (oldConfidence * 0.8) + (newConfidence * 0.2);
  }
  
  matchesPattern(content, pattern) {
    // Simple pattern matching - could be enhanced with ML
    if (pattern.data.keywords) {
      return pattern.data.keywords.some(keyword => 
        content.includes(keyword.toLowerCase())
      );
    }
    
    if (pattern.data.patterns) {
      return pattern.data.patterns.some(patternStr => 
        content.includes(patternStr.toLowerCase())
      );
    }
    
    return false;
  }
  
  categorizeFileType(fileType) {
    if (!fileType) return 'unknown';
    
    const categories = {
      code: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.php'],
      markup: ['.html', '.xml', '.jsx', '.tsx', '.vue', '.svelte'],
      style: ['.css', '.scss', '.sass', '.less'],
      data: ['.json', '.yaml', '.yml', '.csv', '.xml'],
      config: ['.config', '.conf', '.ini', '.env'],
      docs: ['.md', '.txt', '.doc', '.docx', '.pdf']
    };
    
    for (const [category, extensions] of Object.entries(categories)) {
      if (extensions.includes(fileType.toLowerCase())) {
        return category;
      }
    }
    
    return 'other';
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
    if (content.includes('<html') || content.includes('<!DOCTYPE')) {
      return '.html';
    }
    if (content.includes('{') || content.includes('[')) {
      return '.json';
    }
    
    return null;
  }
  
  calculateCodeComplexity(content) {
    let complexity = 0;
    
    // Count code structures
    const patterns = [
      /\b(function|class|interface)\b/g,
      /\b(if|else|switch|case|while|for)\b/g,
      /\b(try|catch|finally|throw)\b/g,
      /\b(async|await|Promise)\b/g,
      /[{}[\]()]/g
    ];
    
    for (const pattern of patterns) {
      const matches = content.match(pattern) || [];
      complexity += matches.length * 0.1;
    }
    
    return Math.min(complexity, 1.0);
  }
  
  calculateStructuralComplexity(content) {
    // Analyze nesting depth and structure
    let maxDepth = 0;
    let currentDepth = 0;
    
    for (const char of content) {
      if (char === '{' || char === '[' || char === '(') {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (char === '}' || char === ']' || char === ')') {
        currentDepth--;
      }
    }
    
    return Math.min(maxDepth / 10, 1.0);
  }
  
  calculateConceptualComplexity(content) {
    const conceptualKeywords = [
      'algorithm', 'optimization', 'performance', 'concurrent', 'parallel',
      'distributed', 'microservice', 'architecture', 'design pattern',
      'machine learning', 'ai', 'neural', 'deep learning', 'blockchain'
    ];
    
    const content_lower = content.toLowerCase();
    let matches = 0;
    
    for (const keyword of conceptualKeywords) {
      if (content_lower.includes(keyword)) {
        matches++;
      }
    }
    
    return Math.min(matches / conceptualKeywords.length * 2, 1.0);
  }
  
  categorizeComplexity(score) {
    if (score > 0.8) return 'very-high';
    if (score > 0.6) return 'high';
    if (score > 0.4) return 'medium';
    if (score > 0.2) return 'low';
    return 'very-low';
  }
  
  calculatePerformanceMatch(performanceAnalysis, config) {
    if (!config.performance) return 0.5;
    
    let match = 0.5;
    
    // Match performance requirements with config capabilities
    if (performanceAnalysis.ccheavyRecommended && config.id === 'ccheavy') {
      match = 0.9;
    } else if (performanceAnalysis.score > 0.8 && config.performance.concurrency > 4) {
      match = 0.8;
    } else if (performanceAnalysis.score > 0.6 && config.performance.timeout < 30000) {
      match = 0.7;
    }
    
    return match;
  }
  
  getRelevantFactors(factors, config) {
    const relevant = {};
    
    if (factors.fileType?.fileType && config.triggers?.fileTypes) {
      relevant.fileType = config.triggers.fileTypes.includes(factors.fileType.fileType);
    }
    
    if (factors.keywords?.matches) {
      const configMatches = factors.keywords.matches.filter(m => m.config === config.id);
      relevant.keywords = configMatches.length > 0;
      relevant.keywordScore = configMatches.length > 0 ? configMatches[0].score : 0;
    }
    
    if (factors.complexity) {
      relevant.complexity = factors.complexity.score;
      relevant.complexityCategory = factors.complexity.category;
    }
    
    if (factors.performance) {
      relevant.performance = factors.performance.score;
      relevant.performanceCategory = factors.performance.category;
    }
    
    return relevant;
  }
  
  getCurrentSystemLoad() {
    // Mock system load - in real implementation, would use system metrics
    return {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      connections: Math.floor(Math.random() * 100),
      timestamp: Date.now()
    };
  }
  
  findHistoricalPattern(request) {
    // Find similar historical requests
    const similar = Array.from(this.patterns.values())
      .filter(p => p.type === 'routing-pattern')
      .filter(p => this.calculateSimilarity(request, p.data) > 0.7)
      .sort((a, b) => b.confidence - a.confidence)[0];
    
    return similar ? {
      patternId: similar.id,
      confidence: similar.confidence,
      frequency: similar.frequency,
      recommendation: similar.data.configuration
    } : null;
  }
  
  calculateSimilarity(request1, request2) {
    // Simple similarity calculation - could be enhanced
    let similarity = 0;
    
    if (request1.fileType === request2.fileType) {
      similarity += 0.3;
    }
    
    if (request1.content && request2.content) {
      const words1 = new Set(request1.content.toLowerCase().split(/\s+/));
      const words2 = new Set(request2.content.toLowerCase().split(/\s+/));
      const intersection = new Set([...words1].filter(x => words2.has(x)));
      const union = new Set([...words1, ...words2]);
      
      if (union.size > 0) {
        similarity += (intersection.size / union.size) * 0.7;
      }
    }
    
    return Math.min(similarity, 1.0);
  }
  
  // Data persistence
  
  async loadPatterns() {
    try {
      const dataPath = path.join(__dirname, '../data/patterns.json');
      const data = await fs.readFile(dataPath, 'utf8');
      const saved = JSON.parse(data);
      
      // Restore patterns
      this.patterns = new Map(saved.patterns || []);
      this.routingPatterns = new Map(saved.routingPatterns || []);
      this.performancePatterns = new Map(saved.performancePatterns || []);
      this.emergentPatterns = new Map(saved.emergentPatterns || []);
      this.antiPatterns = new Map(saved.antiPatterns || []);
      
      // Restore models
      if (saved.routingModel) {
        this.routingModel = {
          ...this.routingModel,
          ...saved.routingModel,
          weights: new Map(saved.routingModel.weights || []),
          biases: new Map(saved.routingModel.biases || [])
        };
      }
      
      if (saved.performanceModel) {
        this.performanceModel = {
          ...this.performanceModel,
          ...saved.performanceModel,
          thresholds: new Map(saved.performanceModel.thresholds || []),
          correlations: new Map(saved.performanceModel.correlations || []),
          predictions: new Map(saved.performanceModel.predictions || [])
        };
      }
      
      // Restore stats
      if (saved.stats) {
        this.stats = { ...this.stats, ...saved.stats };
      }
      
      console.log(`[PatternEngine] Loaded ${this.patterns.size} patterns from storage`);
      
    } catch (error) {
      console.log('[PatternEngine] No existing patterns found, starting fresh');
    }
  }
  
  async savePatterns() {
    try {
      const dataDir = path.join(__dirname, '../data');
      await fs.mkdir(dataDir, { recursive: true });
      
      const data = {
        patterns: Array.from(this.patterns.entries()),
        routingPatterns: Array.from(this.routingPatterns.entries()),
        performancePatterns: Array.from(this.performancePatterns.entries()),
        emergentPatterns: Array.from(this.emergentPatterns.entries()),
        antiPatterns: Array.from(this.antiPatterns.entries()),
        routingModel: {
          ...this.routingModel,
          weights: Array.from(this.routingModel.weights.entries()),
          biases: Array.from(this.routingModel.biases.entries())
        },
        performanceModel: {
          ...this.performanceModel,
          thresholds: Array.from(this.performanceModel.thresholds.entries()),
          correlations: Array.from(this.performanceModel.correlations.entries()),
          predictions: Array.from(this.performanceModel.predictions.entries())
        },
        stats: this.stats,
        savedAt: Date.now()
      };
      
      const dataPath = path.join(dataDir, 'patterns.json');
      await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
      
      console.log('[PatternEngine] Patterns saved to storage');
      
    } catch (error) {
      console.error('[PatternEngine] Failed to save patterns:', error);
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      patterns: {
        total: this.patterns.size,
        routing: this.routingPatterns.size,
        performance: this.performancePatterns.size,
        emergent: this.emergentPatterns.size,
        antiPatterns: this.antiPatterns.size
      },
      models: {
        routingAccuracy: Math.round(this.routingModel.accuracy * 100),
        performanceAccuracy: Math.round(this.performanceModel.accuracy * 100),
        lastTrained: this.routingModel.lastTrained,
        lastUpdated: this.performanceModel.lastUpdated
      },
      weights: Object.fromEntries(this.routingModel.weights),
      feedbackQueueSize: this.feedbackQueue.length
    };
  }
  
  async shutdown() {
    console.log('[PatternEngine] Shutting down...');
    
    // Clear intervals
    if (this.feedbackProcessor) {
      clearInterval(this.feedbackProcessor);
    }
    
    // Process remaining feedback
    await this.processFeedbackQueue();
    
    // Save patterns
    await this.savePatterns();
    
    console.log('[PatternEngine] Shutdown complete');
    this.emit('shutdown');
  }
}

module.exports = PatternEngine;