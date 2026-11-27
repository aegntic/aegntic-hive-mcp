/**
 * Memory System Mocks for London School TDD
 * Mocks all memory components for isolated testing
 */

const { createStub } = require('./stub-factory');

class MockMemoryOrchestrator {
  constructor() {
    this.initialize = createStub();
    this.store = createStub();
    this.retrieve = createStub();
    this.promoteToStrategic = createStub();
    this.analyzeCorrelations = createStub();
    this.healthCheck = createStub();
    this.getStatistics = createStub();
    
    this.setupDefaultBehaviors();
  }
  
  setupDefaultBehaviors() {
    this.initialize.resolves();
    
    this.store.resolves({
      id: 'mem-123',
      type: 'operational',
      timestamp: Date.now(),
      success: true
    });
    
    this.retrieve.resolves({
      results: [
        {
          id: 'mem-123',
          key: 'test-key',
          value: 'test-value',
          importance: 0.8,
          relevance: 0.95,
          timestamp: Date.now()
        }
      ],
      totalFound: 1,
      queryTime: 45
    });
    
    this.promoteToStrategic.resolves({
      success: true,
      id: 'strategic-mem-456',
      promotedAt: Date.now()
    });
    
    this.analyzeCorrelations.resolves([
      {
        pattern: 'code-review',
        confidence: 0.85,
        frequency: 12
      }
    ]);
    
    this.healthCheck.resolves({
      status: 'healthy',
      uptime: 86400000,
      components: {
        orchestrator: 'active',
        strategic: 'active',
        operational: 'active',
        bridge: 'active'
      },
      stats: {
        performance: {
          memoryPressure: 0.3,
          fusionEffectiveness: 0.89,
          avgResponseTime: 125
        },
        queries: {
          total: 150,
          strategic: 45,
          operational: 75,
          fused: 30,
          avgResponseTime: 125
        }
      }
    });
    
    this.getStatistics.returns({
      uptime: 86400000,
      queries: {
        total: 150,
        strategic: 45,
        operational: 75,
        fused: 30,
        avgResponseTime: 125
      },
      efficiency: {
        promotionRate: 0.15,
        hitRatio: 0.78
      },
      correlations: {
        discovered: 25,
        cached: 18,
        utilized: 12
      },
      performance: {
        hitRatioStrategic: 0.82,
        hitRatioOperational: 0.75,
        fusionEffectiveness: 0.89,
        memoryPressure: 0.3
      }
    });
  }
  
  reset() {
    Object.values(this).forEach(stub => {
      if (typeof stub.reset === 'function') {
        stub.reset();
      }
    });
    this.setupDefaultBehaviors();
  }
}

class MockGraphitiAdapter {
  constructor() {
    this.initialize = createStub();
    this.searchMemory = createStub();
    this.storeMemory = createStub();
    this.getMetrics = createStub();
    this.getStatus = createStub();
    this.getMemoryCount = createStub();
    
    this.entityIndex = new Map();
    this.relationshipIndex = new Map();
    
    this.setupDefaultBehaviors();
  }
  
  setupDefaultBehaviors() {
    this.initialize.resolves();
    
    this.searchMemory.resolves({
      nodes: [
        {
          id: 'node-123',
          type: 'concept',
          content: 'Test memory content',
          relevance: 0.92,
          relationships: ['rel-456']
        }
      ],
      relationships: [
        {
          id: 'rel-456',
          from: 'node-123',
          to: 'node-789',
          type: 'related_to',
          strength: 0.8
        }
      ],
      totalResults: 1
    });
    
    this.storeMemory.resolves({
      id: 'strategic-mem-123',
      success: true,
      timestamp: Date.now()
    });
    
    this.getMetrics.returns({
      entities: 25,
      relationships: 18,
      avgQueryTime: 85,
      cacheHitRatio: 0.82
    });
    
    this.getStatus.returns({
      state: 'active',
      connected: true,
      indices: {
        entities: 25,
        relationships: 18
      },
      cache: {
        size: 150,
        hitRatio: 0.82
      }
    });
    
    this.getMemoryCount.resolves(25);
  }
  
  reset() {
    Object.values(this).forEach(stub => {
      if (typeof stub.reset === 'function') {
        stub.reset();
      }
    });
    this.entityIndex.clear();
    this.relationshipIndex.clear();
    this.setupDefaultBehaviors();
  }
}

class MockShortTermMemory {
  constructor() {
    this.initialize = createStub();
    this.store = createStub();
    this.retrieve = createStub();
    this.search = createStub();
    this.detectPatterns = createStub();
    this.getMetrics = createStub();
    this.getStatus = createStub();
    this.getEntryCount = createStub();
    
    this.setupDefaultBehaviors();
  }
  
  setupDefaultBehaviors() {
    this.initialize.resolves();
    
    this.store.resolves({
      id: 'short-mem-123',
      success: true,
      timestamp: Date.now()
    });
    
    this.retrieve.resolves({
      key: 'test-key',
      value: 'test-value',
      importance: 0.6,
      timestamp: Date.now(),
      tags: ['test', 'memory']
    });
    
    this.search.resolves({
      matches: [
        {
          key: 'test-key-1',
          value: 'test-value-1',
          relevance: 0.89,
          timestamp: Date.now()
        },
        {
          key: 'test-key-2',
          value: 'test-value-2',
          relevance: 0.76,
          timestamp: Date.now()
        }
      ],
      totalMatches: 2
    });
    
    this.detectPatterns.resolves([
      {
        pattern: 'frequent-access',
        confidence: 0.92,
        occurrences: 15
      },
      {
        pattern: 'temporal-clustering',
        confidence: 0.78,
        occurrences: 8
      }
    ]);
    
    this.getMetrics.returns({
      totalEntries: 150,
      avgAccessTime: 12,
      compressionRatio: 0.65,
      patternDetectionRate: 0.23
    });
    
    this.getStatus.returns({
      state: 'active',
      entries: 150,
      patterns: 12,
      compressionInProgress: false,
      indices: {
        primary: 150,
        temporal: 145,
        tags: 89
      }
    });
    
    this.getEntryCount.resolves(150);
  }
  
  reset() {
    Object.values(this).forEach(stub => {
      if (typeof stub.reset === 'function') {
        stub.reset();
      }
    });
    this.setupDefaultBehaviors();
  }
}

class MockMemoryBridge {
  constructor() {
    this.fuseResults = createStub();
    this.correlateMemories = createStub();
    this.transferContext = createStub();
    
    this.setupDefaultBehaviors();
  }
  
  setupDefaultBehaviors() {
    this.fuseResults.resolves({
      results: [
        {
          id: 'fused-result-1',
          source: 'strategic',
          content: 'Strategic memory content',
          relevance: 0.95,
          confidence: 0.89
        },
        {
          id: 'fused-result-2',
          source: 'operational',
          content: 'Operational memory content',
          relevance: 0.82,
          confidence: 0.76
        }
      ],
      fusionScore: 0.87,
      correlations: 3
    });
    
    this.correlateMemories.resolves([
      {
        strategic: 'strategic-mem-123',
        operational: 'operational-mem-456',
        correlation: 0.84,
        type: 'semantic'
      }
    ]);
    
    this.transferContext.resolves({
      success: true,
      contextTransferred: 5,
      timestamp: Date.now()
    });
  }
  
  reset() {
    Object.values(this).forEach(stub => {
      if (typeof stub.reset === 'function') {
        stub.reset();
      }
    });
    this.setupDefaultBehaviors();
  }
}

module.exports = {
  MockMemoryOrchestrator,
  MockGraphitiAdapter,
  MockShortTermMemory,
  MockMemoryBridge
};