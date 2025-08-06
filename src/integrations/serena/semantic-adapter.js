/**
 * Semantic Adapter for Serena Integration
 * Advanced semantic code analysis and intelligent routing
 * Integrates with CCR system and pattern engine
 */

const EventEmitter = require('events');
const crypto = require('crypto');

class SemanticAdapter extends EventEmitter {
  constructor(options = {}) {
    super();
    
    // Configuration
    this.mcpBridge = options.mcpBridge;
    this.patternEngine = options.patternEngine;
    this.superHub = options.superHub;
    
    // Semantic analysis configuration
    this.analysisConfig = {
      enableDeepAnalysis: options.enableDeepAnalysis !== false,
      enablePatternLearning: options.enablePatternLearning !== false,
      enablePredictiveRouting: options.enablePredictiveRouting !== false,
      analysisTimeout: options.analysisTimeout || 15000,
      cacheResults: options.cacheResults !== false,
      cacheExpiry: options.cacheExpiry || 300000 // 5 minutes
    };
    
    // Analysis cache
    this.analysisCache = new Map();
    this.routingCache = new Map();
    
    // Semantic models
    this.semanticModels = {
      complexity: {
        factors: new Map(),
        weights: new Map(),
        accuracy: 0.7
      },
      patterns: {
        knownPatterns: new Map(),
        emergentPatterns: new Map(),
        antiPatterns: new Map()
      },
      routing: {
        decisions: new Map(),
        performance: new Map(),
        recommendations: new Map()
      }
    };
    
    // Performance tracking
    this.performanceMetrics = {
      totalAnalyses: 0,
      averageAnalysisTime: 0,
      routingAccuracy: 0.8,
      patternDetectionRate: 0,
      cacheHitRate: 0,
      errorRate: 0
    };
    
    // CCR integration
    this.ccrIntegration = {
      enabled: true,
      routingStrategies: new Map(),
      performanceProfiles: new Map(),
      optimizationRules: new Map()
    };
    
    console.log('[SemanticAdapter] Initializing semantic code analysis system...');
    this.initialize();
  }
  
  async initialize() {
    try {
      // Initialize semantic models
      this.initializeSemanticModels();
      
      // Load existing patterns and models
      await this.loadSemanticData();
      
      // Initialize CCR integration
      this.initializeCCRIntegration();
      
      // Start cache cleanup
      this.startCacheCleanup();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      console.log('[SemanticAdapter] Semantic analysis system initialized');
      this.emit('initialized');
      
    } catch (error) {
      console.error('[SemanticAdapter] Initialization failed:', error);
      throw error;
    }
  }
  
  initializeSemanticModels() {
    // Initialize complexity analysis factors
    this.semanticModels.complexity.factors.set('cyclomaticComplexity', 0.3);
    this.semanticModels.complexity.factors.set('cognitiveComplexity', 0.25);
    this.semanticModels.complexity.factors.set('nestingDepth', 0.2);
    this.semanticModels.complexity.factors.set('functionLength', 0.15);
    this.semanticModels.complexity.factors.set('parameterCount', 0.1);
    
    // Initialize pattern recognition weights
    this.semanticModels.complexity.weights.set('designPatterns', 0.8);
    this.semanticModels.complexity.weights.set('antiPatterns', -0.6);
    this.semanticModels.complexity.weights.set('codeSmells', -0.4);
    this.semanticModels.complexity.weights.set('bestPractices', 0.5);
    
    console.log('[SemanticAdapter] Semantic models initialized');
  }
  
  async loadSemanticData() {
    try {
      // Load from pattern engine if available
      if (this.patternEngine) {
        const patterns = this.patternEngine.patterns;
        let loadedCount = 0;
        
        for (const [patternId, pattern] of patterns) {
          if (pattern.type === 'semantic-pattern' || pattern.type === 'code-pattern') {
            this.semanticModels.patterns.knownPatterns.set(patternId, {
              ...pattern,
              semanticWeight: this.calculateSemanticWeight(pattern)
            });
            loadedCount++;
          }
        }
        
        console.log(`[SemanticAdapter] Loaded ${loadedCount} semantic patterns`);
      }
      
    } catch (error) {
      console.warn('[SemanticAdapter] Failed to load semantic data:', error.message);
    }
  }
  
  initializeCCRIntegration() {
    // Define routing strategies based on semantic analysis
    this.ccrIntegration.routingStrategies.set('complexity-based', {
      name: 'Complexity-Based Routing',
      selector: (analysis) => this.selectByComplexity(analysis),
      weight: 0.4
    });
    
    this.ccrIntegration.routingStrategies.set('pattern-based', {
      name: 'Pattern-Based Routing',
      selector: (analysis) => this.selectByPatterns(analysis),
      weight: 0.3
    });
    
    this.ccrIntegration.routingStrategies.set('quality-based', {
      name: 'Quality-Based Routing',
      selector: (analysis) => this.selectByQuality(analysis),
      weight: 0.3
    });
    
    // Define performance profiles
    this.ccrIntegration.performanceProfiles.set('high-complexity', {
      recommendedConfig: 'ccheavy',
      confidence: 0.9,
      expectedImprovement: 0.6
    });
    
    this.ccrIntegration.performanceProfiles.set('pattern-heavy', {
      recommendedConfig: 'codeReview',
      confidence: 0.8,
      expectedImprovement: 0.4
    });
    
    this.ccrIntegration.performanceProfiles.set('data-intensive', {
      recommendedConfig: 'dataAnalysis',
      confidence: 0.85,
      expectedImprovement: 0.5
    });
    
    console.log('[SemanticAdapter] CCR integration initialized');
  }
  
  startCacheCleanup() {
    setInterval(() => {
      this.cleanupExpiredCache();
    }, 60000); // Every minute
  }
  
  startPerformanceMonitoring() {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000); // Every 30 seconds
  }
  
  async analyzeCode(code, options = {}) {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(code, options);
    
    try {
      // Check cache first
      if (this.analysisConfig.cacheResults) {
        const cached = this.analysisCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.analysisConfig.cacheExpiry) {
          this.performanceMetrics.cacheHitRate = 
            (this.performanceMetrics.cacheHitRate * 0.9) + (1.0 * 0.1);
          return cached.result;
        }
      }
      
      // Perform semantic analysis
      const analysis = await this.performSemanticAnalysis(code, options);
      
      // Cache result
      if (this.analysisConfig.cacheResults) {
        this.analysisCache.set(cacheKey, {
          result: analysis,
          timestamp: Date.now()
        });
      }
      
      // Update performance metrics
      const analysisTime = Date.now() - startTime;
      this.updateAnalysisMetrics(analysisTime);
      
      // Learn from analysis if enabled
      if (this.analysisConfig.enablePatternLearning) {
        await this.learnFromAnalysis(analysis);
      }
      
      this.emit('analysis-complete', { analysis, analysisTime });
      return analysis;
      
    } catch (error) {
      this.performanceMetrics.errorRate = 
        (this.performanceMetrics.errorRate * 0.9) + (1.0 * 0.1);
      console.error('[SemanticAdapter] Code analysis failed:', error);
      throw error;
    }
  }
  
  async performSemanticAnalysis(code, options) {
    const analysis = {
      timestamp: Date.now(),
      codeHash: crypto.createHash('sha256').update(code).digest('hex').substring(0, 16),
      complexity: {},
      patterns: {},
      quality: {},
      architecture: {},
      recommendations: [],
      routing: {},
      confidence: 0.8
    };
    
    try {
      // Use Serena bridge if available for deep analysis
      if (this.mcpBridge && this.mcpBridge.connected && this.analysisConfig.enableDeepAnalysis) {
        const serenaAnalysis = await this.mcpBridge.analyzeCode(code, {
          includePatterns: true,
          includeMetrics: true,
          includeRecommendations: true,
          includeArchitecture: options.includeArchitecture || false
        });
        
        analysis.complexity = this.processComplexityAnalysis(serenaAnalysis);
        analysis.patterns = this.processPatternAnalysis(serenaAnalysis);
        analysis.quality = this.processQualityAnalysis(serenaAnalysis);
        analysis.architecture = serenaAnalysis.architecture || {};
        analysis.recommendations = serenaAnalysis.recommendations || [];
        analysis.confidence = Math.max(analysis.confidence, serenaAnalysis.confidence || 0.8);
      }
      
      // Fallback to local analysis
      const localAnalysis = this.performLocalAnalysis(code);
      analysis.complexity = { ...localAnalysis.complexity, ...analysis.complexity };
      analysis.patterns = { ...localAnalysis.patterns, ...analysis.patterns };
      analysis.quality = { ...localAnalysis.quality, ...analysis.quality };
      
      // Generate routing recommendations
      analysis.routing = await this.generateRoutingRecommendations(analysis);
      
      // Calculate overall confidence
      analysis.confidence = this.calculateOverallConfidence(analysis);
      
      return analysis;
      
    } catch (error) {
      console.error('[SemanticAdapter] Semantic analysis error:', error);
      
      // Fallback to basic local analysis
      const fallbackAnalysis = this.performLocalAnalysis(code);
      return {
        ...analysis,
        ...fallbackAnalysis,
        confidence: 0.5,
        fallback: true,
        error: error.message
      };
    }
  }
  
  processComplexityAnalysis(serenaAnalysis) {
    const complexity = {
      overall: 0.5,
      cyclomatic: 0,
      cognitive: 0,
      nesting: 0,
      maintainability: 0.8,
      factors: {}
    };
    
    if (serenaAnalysis.metrics) {
      complexity.cyclomatic = serenaAnalysis.metrics.cyclomaticComplexity || 0;
      complexity.cognitive = serenaAnalysis.metrics.cognitiveComplexity || 0;
      complexity.nesting = serenaAnalysis.metrics.nestingDepth || 0;
      complexity.maintainability = serenaAnalysis.metrics.maintainabilityIndex || 0.8;
      
      // Calculate overall complexity
      const factors = this.semanticModels.complexity.factors;
      complexity.overall = 
        (complexity.cyclomatic / 10) * factors.get('cyclomaticComplexity') +
        (complexity.cognitive / 15) * factors.get('cognitiveComplexity') +
        (complexity.nesting / 5) * factors.get('nestingDepth') +
        (1 - complexity.maintainability) * 0.2;
      
      complexity.overall = Math.min(complexity.overall, 1.0);
      complexity.factors = serenaAnalysis.metrics;
    }
    
    return complexity;
  }
  
  processPatternAnalysis(serenaAnalysis) {
    const patterns = {
      detected: [],
      antiPatterns: [],
      designPatterns: [],
      codeSmells: [],
      bestPractices: [],
      confidence: 0.8
    };
    
    if (serenaAnalysis.patterns) {
      patterns.detected = serenaAnalysis.patterns;
      
      // Categorize patterns
      for (const pattern of serenaAnalysis.patterns) {
        switch (pattern.category || pattern.type) {
          case 'anti-pattern':
            patterns.antiPatterns.push(pattern);
            break;
          case 'design-pattern':
            patterns.designPatterns.push(pattern);
            break;
          case 'code-smell':
            patterns.codeSmells.push(pattern);
            break;
          case 'best-practice':
            patterns.bestPractices.push(pattern);
            break;
        }
      }
      
      patterns.confidence = serenaAnalysis.confidence || 0.8;
    }
    
    return patterns;
  }
  
  processQualityAnalysis(serenaAnalysis) {
    const quality = {
      overall: 0.8,
      readability: 0.8,
      maintainability: 0.8,
      testability: 0.7,
      performance: 0.7,
      security: 0.8,
      factors: {}
    };
    
    if (serenaAnalysis.metrics) {
      quality.readability = serenaAnalysis.metrics.readability || 0.8;
      quality.maintainability = serenaAnalysis.metrics.maintainability || 0.8;
      quality.testability = serenaAnalysis.metrics.testability || 0.7;
      quality.performance = serenaAnalysis.metrics.performance || 0.7;
      quality.security = serenaAnalysis.metrics.security || 0.8;
      
      // Calculate overall quality
      quality.overall = (
        quality.readability * 0.25 +
        quality.maintainability * 0.25 +
        quality.testability * 0.2 +
        quality.performance * 0.15 +
        quality.security * 0.15
      );
      
      quality.factors = serenaAnalysis.metrics;
    }
    
    return quality;
  }
  
  performLocalAnalysis(code) {
    const analysis = {
      complexity: this.analyzeComplexityLocally(code),
      patterns: this.analyzePatternsLocally(code),
      quality: this.analyzeQualityLocally(code)
    };
    
    return analysis;
  }
  
  analyzeComplexityLocally(code) {
    let complexity = 0;
    const factors = {};
    
    // Simple cyclomatic complexity (count decisions)
    const decisions = (code.match(/\b(if|else|while|for|switch|case|\?|&&|\|\|)\b/g) || []).length;
    factors.cyclomaticComplexity = decisions;
    complexity += Math.min(decisions / 10, 0.4);
    
    // Function length
    const lines = code.split('\n').filter(line => line.trim().length > 0).length;
    factors.functionLength = lines;
    complexity += Math.min(lines / 100, 0.3);
    
    // Nesting depth
    let maxNesting = 0;
    let currentNesting = 0;
    for (const char of code) {
      if (char === '{') currentNesting++;
      if (char === '}') currentNesting--;
      maxNesting = Math.max(maxNesting, currentNesting);
    }
    factors.nestingDepth = maxNesting;
    complexity += Math.min(maxNesting / 5, 0.3);
    
    return {
      overall: Math.min(complexity, 1.0),
      cyclomatic: decisions,
      nesting: maxNesting,
      factors,
      confidence: 0.6
    };
  }
  
  analyzePatternsLocally(code) {
    const patterns = {
      detected: [],
      antiPatterns: [],
      designPatterns: [],
      confidence: 0.5
    };
    
    // Simple pattern detection
    const codeSmells = [
      { name: 'LongFunction', pattern: /function\s+\w+[^}]*{[^}]{500,}}/g },
      { name: 'DeepNesting', pattern: /{[^{}]*{[^{}]*{[^{}]*{/g },
      { name: 'MagicNumbers', pattern: /\b\d{2,}\b/g },
      { name: 'LongParameterList', pattern: /\([^)]{50,}\)/g }
    ];
    
    for (const smell of codeSmells) {
      const matches = code.match(smell.pattern);
      if (matches && matches.length > 0) {
        patterns.antiPatterns.push({
          name: smell.name,
          count: matches.length,
          severity: 'medium',
          confidence: 0.7
        });
      }
    }
    
    // Design pattern detection (simple)
    const designPatternKeywords = [
      'singleton', 'factory', 'observer', 'strategy', 'decorator',
      'adapter', 'facade', 'proxy', 'command', 'state'
    ];
    
    const content = code.toLowerCase();
    for (const pattern of designPatternKeywords) {
      if (content.includes(pattern)) {
        patterns.designPatterns.push({
          name: pattern,
          confidence: 0.6,
          type: 'design-pattern'
        });
      }
    }
    
    patterns.detected = [...patterns.antiPatterns, ...patterns.designPatterns];
    
    return patterns;
  }
  
  analyzeQualityLocally(code) {
    let readability = 0.8;
    let maintainability = 0.8;
    
    // Simple readability metrics
    const lines = code.split('\n');
    const avgLineLength = lines.reduce((sum, line) => sum + line.length, 0) / lines.length;
    if (avgLineLength > 120) readability -= 0.2;
    
    const commentRatio = lines.filter(line => line.trim().startsWith('//') || line.trim().startsWith('/*')).length / lines.length;
    if (commentRatio < 0.1) readability -= 0.1;
    
    // Simple maintainability
    const functionCount = (code.match(/function\s+\w+/g) || []).length;
    const classCount = (code.match(/class\s+\w+/g) || []).length;
    const complexity = this.analyzeComplexityLocally(code).overall;
    
    maintainability = Math.max(0.2, 1.0 - complexity * 0.5);
    
    return {
      overall: (readability + maintainability) / 2,
      readability,
      maintainability,
      testability: 0.7,
      performance: 0.7,
      security: 0.8,
      confidence: 0.5
    };
  }
  
  async generateRoutingRecommendations(analysis) {
    const routing = {
      recommended: 'default',
      alternatives: [],
      reasoning: [],
      confidence: 0.7,
      optimizations: {}
    };
    
    try {
      // Apply routing strategies
      const strategies = this.ccrIntegration.routingStrategies;
      const scores = new Map();
      
      for (const [strategyName, strategy] of strategies) {
        const result = strategy.selector(analysis);
        if (result) {
          scores.set(result.config, (scores.get(result.config) || 0) + (result.score * strategy.weight));
        }
      }
      
      // Find best configuration
      let bestConfig = 'default';
      let bestScore = 0;
      
      for (const [config, score] of scores) {
        if (score > bestScore) {
          bestScore = score;
          bestConfig = config;
        }
      }
      
      routing.recommended = bestConfig;
      routing.confidence = Math.min(bestScore, 0.95);
      
      // Generate alternatives
      const sortedScores = Array.from(scores.entries())
        .sort(([,a], [,b]) => b - a)
        .slice(1, 4); // Top 3 alternatives
      
      routing.alternatives = sortedScores.map(([config, score]) => ({
        config,
        score,
        confidence: Math.min(score, 0.9)
      }));
      
      // Generate reasoning
      routing.reasoning = this.generateRoutingReasoning(analysis, bestConfig, bestScore);
      
      // Generate optimizations
      routing.optimizations = this.generateOptimizations(analysis, bestConfig);
      
      return routing;
      
    } catch (error) {
      console.error('[SemanticAdapter] Routing recommendation error:', error);
      return routing;
    }
  }
  
  selectByComplexity(analysis) {
    const complexity = analysis.complexity?.overall || 0.5;
    
    if (complexity > 0.8) {
      return { config: 'ccheavy', score: 0.9, reason: 'High complexity requires high-performance processing' };
    } else if (complexity > 0.6) {
      return { config: 'codeReview', score: 0.8, reason: 'Medium complexity benefits from detailed analysis' };
    } else if (complexity > 0.4) {
      return { config: 'projectManagement', score: 0.6, reason: 'Moderate complexity suitable for standard processing' };
    }
    
    return { config: 'default', score: 0.5, reason: 'Low complexity uses default configuration' };
  }
  
  selectByPatterns(analysis) {
    const patterns = analysis.patterns;
    
    if (!patterns || !patterns.detected) {
      return { config: 'default', score: 0.3, reason: 'No patterns detected' };
    }
    
    const antiPatternCount = patterns.antiPatterns?.length || 0;
    const designPatternCount = patterns.designPatterns?.length || 0;
    
    if (antiPatternCount > 3) {
      return { config: 'codeReview', score: 0.9, reason: 'Multiple anti-patterns require detailed review' };
    } else if (designPatternCount > 2) {
      return { config: 'codeReview', score: 0.8, reason: 'Design patterns benefit from advanced analysis' };
    } else if (patterns.detected.length > 5) {
      return { config: 'dataAnalysis', score: 0.7, reason: 'Pattern-heavy code needs analytical processing' };
    }
    
    return { config: 'default', score: 0.4, reason: 'Standard pattern complexity' };
  }
  
  selectByQuality(analysis) {
    const quality = analysis.quality?.overall || 0.8;
    
    if (quality < 0.4) {
      return { config: 'codeReview', score: 0.9, reason: 'Low quality code needs comprehensive review' };
    } else if (quality < 0.6) {
      return { config: 'codeReview', score: 0.7, reason: 'Medium quality code benefits from review' };
    } else if (quality > 0.9) {
      return { config: 'projectManagement', score: 0.6, reason: 'High quality code suitable for management tasks' };
    }
    
    return { config: 'default', score: 0.5, reason: 'Standard quality code' };
  }
  
  generateRoutingReasoning(analysis, selectedConfig, score) {
    const reasoning = [];
    
    const complexity = analysis.complexity?.overall || 0.5;
    const quality = analysis.quality?.overall || 0.8;
    const patternCount = analysis.patterns?.detected?.length || 0;
    
    // Complexity reasoning
    if (complexity > 0.7) {
      reasoning.push(`High complexity (${(complexity * 100).toFixed(1)}%) suggests need for advanced processing`);
    } else if (complexity < 0.3) {
      reasoning.push(`Low complexity (${(complexity * 100).toFixed(1)}%) allows for standard processing`);
    }
    
    // Quality reasoning
    if (quality < 0.5) {
      reasoning.push(`Low quality score (${(quality * 100).toFixed(1)}%) indicates need for detailed review`);
    } else if (quality > 0.9) {
      reasoning.push(`High quality score (${(quality * 100).toFixed(1)}%) suggests well-structured code`);
    }
    
    // Pattern reasoning
    if (patternCount > 5) {
      reasoning.push(`${patternCount} patterns detected suggest complex architectural considerations`);
    }
    
    // Configuration-specific reasoning
    switch (selectedConfig) {
      case 'ccheavy':
        reasoning.push('CCHeavy configuration selected for optimal performance on complex code');
        break;
      case 'codeReview':
        reasoning.push('Code review configuration selected for thorough analysis');
        break;
      case 'dataAnalysis':
        reasoning.push('Data analysis configuration selected for pattern-heavy code');
        break;
    }
    
    reasoning.push(`Overall confidence: ${(score * 100).toFixed(1)}%`);
    
    return reasoning;
  }
  
  generateOptimizations(analysis, selectedConfig) {
    const optimizations = {
      caching: false,
      streaming: false,
      parallelization: false,
      resourceAllocation: 'standard',
      recommendations: []
    };
    
    const complexity = analysis.complexity?.overall || 0.5;
    const quality = analysis.quality?.overall || 0.8;
    
    // Enable optimizations based on analysis
    if (complexity > 0.6) {
      optimizations.parallelization = true;
      optimizations.recommendations.push('Enable parallel processing for complex code analysis');
    }
    
    if (quality > 0.8 && selectedConfig !== 'ccheavy') {
      optimizations.caching = true;
      optimizations.recommendations.push('Enable caching for high-quality, stable code');
    }
    
    if (analysis.patterns?.detected?.length > 3) {
      optimizations.streaming = true;
      optimizations.recommendations.push('Enable streaming for pattern-heavy analysis');
    }
    
    // Resource allocation
    if (selectedConfig === 'ccheavy') {
      optimizations.resourceAllocation = 'high-performance';
      optimizations.recommendations.push('Allocate high-performance resources for complex processing');
    } else if (complexity < 0.3) {
      optimizations.resourceAllocation = 'minimal';
      optimizations.recommendations.push('Minimal resource allocation for simple code');
    }
    
    return optimizations;
  }
  
  calculateOverallConfidence(analysis) {
    let confidence = 0.5;
    let factors = 0;
    
    if (analysis.complexity?.confidence) {
      confidence += analysis.complexity.confidence;
      factors++;
    }
    
    if (analysis.patterns?.confidence) {
      confidence += analysis.patterns.confidence;
      factors++;
    }
    
    if (analysis.quality?.confidence) {
      confidence += analysis.quality.confidence;
      factors++;
    }
    
    if (analysis.routing?.confidence) {
      confidence += analysis.routing.confidence;
      factors++;
    }
    
    return factors > 0 ? confidence / factors : 0.5;
  }
  
  async learnFromAnalysis(analysis) {
    try {
      // Update semantic models based on analysis results
      await this.updateComplexityModel(analysis.complexity);
      await this.updatePatternModel(analysis.patterns);
      await this.updateQualityModel(analysis.quality);
      
      // Record successful patterns
      if (this.patternEngine) {
        const semanticPattern = {
          type: 'semantic-analysis-pattern',
          data: {
            complexity: analysis.complexity?.overall,
            quality: analysis.quality?.overall,
            patternCount: analysis.patterns?.detected?.length || 0,
            routing: analysis.routing?.recommended,
            confidence: analysis.confidence
          },
          source: 'semantic-adapter',
          confidence: analysis.confidence || 0.7,
          impact: 'optimization'
        };
        
        await this.patternEngine.recordPattern(semanticPattern);
      }
      
    } catch (error) {
      console.error('[SemanticAdapter] Learning from analysis failed:', error);
    }
  }
  
  async updateComplexityModel(complexityAnalysis) {
    if (!complexityAnalysis || !complexityAnalysis.factors) return;
    
    // Update factor weights based on accuracy
    const factors = this.semanticModels.complexity.factors;
    
    for (const [factor, value] of Object.entries(complexityAnalysis.factors)) {
      if (factors.has(factor)) {
        // Simple adaptive weighting (could be enhanced with ML)
        const currentWeight = factors.get(factor);
        const accuracy = complexityAnalysis.confidence || 0.7;
        const adjustment = (accuracy - 0.5) * 0.01; // Small adjustments
        
        const newWeight = Math.max(0.05, Math.min(0.5, currentWeight + adjustment));
        factors.set(factor, newWeight);
      }
    }
  }
  
  async updatePatternModel(patternAnalysis) {
    if (!patternAnalysis || !patternAnalysis.detected) return;
    
    // Update known patterns with confidence scores
    for (const pattern of patternAnalysis.detected) {
      const patternId = this.generatePatternId(pattern);
      
      if (this.semanticModels.patterns.knownPatterns.has(patternId)) {
        const existing = this.semanticModels.patterns.knownPatterns.get(patternId);
        existing.frequency = (existing.frequency || 0) + 1;
        existing.confidence = (existing.confidence + (pattern.confidence || 0.7)) / 2;
        existing.lastSeen = Date.now();
      } else {
        this.semanticModels.patterns.knownPatterns.set(patternId, {
          ...pattern,
          frequency: 1,
          firstSeen: Date.now(),
          lastSeen: Date.now(),
          semanticWeight: this.calculateSemanticWeight(pattern)
        });
      }
    }
  }
  
  async updateQualityModel(qualityAnalysis) {
    if (!qualityAnalysis) return;
    
    // Update quality thresholds based on observed patterns
    const thresholds = this.semanticModels.routing.recommendations;
    
    const qualityScore = qualityAnalysis.overall || 0.8;
    const factors = qualityAnalysis.factors || {};
    
    // Adapt thresholds based on quality patterns
    for (const [factor, value] of Object.entries(factors)) {
      if (typeof value === 'number') {
        const thresholdKey = `${factor}_threshold`;
        const currentThreshold = thresholds.get(thresholdKey) || 0.5;
        
        // Adaptive threshold adjustment
        const adjustment = (qualityScore - 0.5) * 0.01;
        const newThreshold = Math.max(0.1, Math.min(0.9, currentThreshold + adjustment));
        
        thresholds.set(thresholdKey, newThreshold);
      }
    }
  }
  
  calculateSemanticWeight(pattern) {
    let weight = 0.5;
    
    // Adjust weight based on pattern characteristics
    if (pattern.severity === 'high' || pattern.impact === 'high') {
      weight += 0.3;
    } else if (pattern.severity === 'low' || pattern.impact === 'low') {
      weight -= 0.2;
    }
    
    if (pattern.confidence > 0.8) {
      weight += 0.1;
    } else if (pattern.confidence < 0.5) {
      weight -= 0.1;
    }
    
    if (pattern.frequency > 10) {
      weight += 0.1;
    }
    
    return Math.max(0.1, Math.min(1.0, weight));
  }
  
  generatePatternId(pattern) {
    const data = {
      name: pattern.name || 'unknown',
      type: pattern.type || 'generic',
      category: pattern.category || 'general'
    };
    
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
  }
  
  generateCacheKey(code, options) {
    const hash = crypto.createHash('sha256')
      .update(code)
      .update(JSON.stringify(options))
      .digest('hex');
    
    return hash.substring(0, 32);
  }
  
  cleanupExpiredCache() {
    const now = Date.now();
    let cleanedCount = 0;
    
    // Clean analysis cache
    for (const [key, entry] of this.analysisCache) {
      if (now - entry.timestamp > this.analysisConfig.cacheExpiry) {
        this.analysisCache.delete(key);
        cleanedCount++;
      }
    }
    
    // Clean routing cache
    for (const [key, entry] of this.routingCache) {
      if (now - entry.timestamp > this.analysisConfig.cacheExpiry) {
        this.routingCache.delete(key);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`[SemanticAdapter] Cleaned up ${cleanedCount} expired cache entries`);
    }
  }
  
  updateAnalysisMetrics(analysisTime) {
    this.performanceMetrics.totalAnalyses++;
    
    if (this.performanceMetrics.averageAnalysisTime === 0) {
      this.performanceMetrics.averageAnalysisTime = analysisTime;
    } else {
      // Exponential moving average
      this.performanceMetrics.averageAnalysisTime = 
        (this.performanceMetrics.averageAnalysisTime * 0.9) + (analysisTime * 0.1);
    }
  }
  
  updatePerformanceMetrics() {
    // Update cache hit rate
    const totalCacheRequests = this.analysisCache.size + this.routingCache.size;
    if (totalCacheRequests > 0) {
      // This is a simplified calculation - in reality would track hits vs misses
      this.performanceMetrics.cacheHitRate = Math.min(totalCacheRequests / 100, 0.8);
    }
    
    // Update pattern detection rate
    const recentAnalyses = Math.min(this.performanceMetrics.totalAnalyses, 100);
    if (recentAnalyses > 0) {
      // Simplified calculation - would track actual pattern detection
      this.performanceMetrics.patternDetectionRate = 0.6; // Mock value
    }
  }
  
  // Public API methods
  
  async analyzeForRouting(request) {
    try {
      const cacheKey = this.generateCacheKey(request.content || '', { routing: true });
      
      // Check routing cache
      if (this.routingCache.has(cacheKey)) {
        const cached = this.routingCache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.analysisConfig.cacheExpiry) {
          return cached.result;
        }
      }
      
      // Perform lightweight analysis for routing
      const analysis = await this.analyzeCode(request.content || '', {
        lightweight: true,
        includeArchitecture: false,
        focusOnRouting: true
      });
      
      const routingAnalysis = {
        complexity: analysis.complexity?.overall || 0.5,
        quality: analysis.quality?.overall || 0.8,
        patterns: analysis.patterns?.detected?.length || 0,
        recommendation: analysis.routing?.recommended || 'default',
        confidence: analysis.routing?.confidence || 0.7,
        optimizations: analysis.routing?.optimizations || {},
        reasoning: analysis.routing?.reasoning || []
      };
      
      // Cache routing result
      this.routingCache.set(cacheKey, {
        result: routingAnalysis,
        timestamp: Date.now()
      });
      
      return routingAnalysis;
      
    } catch (error) {
      console.error('[SemanticAdapter] Routing analysis failed:', error);
      return {
        complexity: 0.5,
        quality: 0.8,
        patterns: 0,
        recommendation: 'default',
        confidence: 0.3,
        error: error.message
      };
    }
  }
  
  async predictPerformance(analysis, configuration) {
    try {
      const performanceProfile = this.ccrIntegration.performanceProfiles.get(
        this.categorizeAnalysis(analysis)
      );
      
      if (performanceProfile && performanceProfile.recommendedConfig === configuration) {
        return {
          expectedImprovement: performanceProfile.expectedImprovement,
          confidence: performanceProfile.confidence,
          reasoning: [`Configuration ${configuration} is optimal for this analysis profile`]
        };
      }
      
      // Fallback prediction
      const complexityFactor = analysis.complexity || 0.5;
      const qualityFactor = analysis.quality || 0.8;
      
      let expectedImprovement = 0.2; // Base improvement
      
      if (configuration === 'ccheavy' && complexityFactor > 0.7) {
        expectedImprovement = 0.6;
      } else if (configuration === 'codeReview' && qualityFactor < 0.6) {
        expectedImprovement = 0.4;
      }
      
      return {
        expectedImprovement,
        confidence: 0.6,
        reasoning: ['Performance prediction based on complexity and quality factors']
      };
      
    } catch (error) {
      console.error('[SemanticAdapter] Performance prediction failed:', error);
      return {
        expectedImprovement: 0.2,
        confidence: 0.3,
        reasoning: ['Fallback performance prediction']
      };
    }
  }
  
  categorizeAnalysis(analysis) {
    const complexity = analysis.complexity || 0.5;
    const patterns = analysis.patterns || 0;
    const quality = analysis.quality || 0.8;
    
    if (complexity > 0.7) {
      return 'high-complexity';
    } else if (patterns > 5) {
      return 'pattern-heavy';
    } else if (quality < 0.5) {
      return 'low-quality';
    }
    
    return 'standard';
  }
  
  getCapabilities() {
    return {
      semanticAnalysis: true,
      patternDetection: true,
      qualityAssessment: true,
      routingRecommendations: true,
      performancePrediction: true,
      ccrIntegration: this.ccrIntegration.enabled,
      serenaIntegration: this.mcpBridge?.connected || false,
      caching: this.analysisConfig.cacheResults,
      learning: this.analysisConfig.enablePatternLearning
    };
  }
  
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      cacheSize: this.analysisCache.size + this.routingCache.size,
      knownPatterns: this.semanticModels.patterns.knownPatterns.size,
      modelAccuracy: this.semanticModels.complexity.accuracy
    };
  }
  
  async shutdown() {
    console.log('[SemanticAdapter] Shutting down semantic adapter...');
    
    try {
      // Save semantic models and patterns
      await this.saveSemanticData();
      
      // Clear caches
      this.analysisCache.clear();
      this.routingCache.clear();
      
      console.log('[SemanticAdapter] Semantic adapter shutdown complete');
      this.emit('shutdown');
      
    } catch (error) {
      console.error('[SemanticAdapter] Shutdown error:', error);
    }
  }
  
  async saveSemanticData() {
    try {
      // This would save semantic models to persistent storage
      // For now, just log the statistics
      console.log('[SemanticAdapter] Semantic data statistics:', {
        totalAnalyses: this.performanceMetrics.totalAnalyses,
        knownPatterns: this.semanticModels.patterns.knownPatterns.size,
        averageAnalysisTime: Math.round(this.performanceMetrics.averageAnalysisTime),
        cacheHitRate: Math.round(this.performanceMetrics.cacheHitRate * 100),
        routingAccuracy: Math.round(this.performanceMetrics.routingAccuracy * 100)
      });
      
    } catch (error) {
      console.error('[SemanticAdapter] Failed to save semantic data:', error);
    }
  }
}

module.exports = SemanticAdapter;