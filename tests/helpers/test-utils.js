/**
 * Test Utilities and Helpers
 * Common utilities for test setup and execution
 */

/**
 * Test data generators
 */
const generators = {
  /**
   * Generate test conversation data
   */
  conversation: (overrides = {}) => ({
    id: `test-conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: 'Test Conversation',
    service: 'test',
    messages: [
      {
        role: 'user',
        content: 'Hello, this is a test message',
        order: 1,
        timestamp: new Date().toISOString()
      },
      {
        role: 'assistant',
        content: 'Hello! I understand this is a test. How can I help?',
        order: 2,
        timestamp: new Date().toISOString()
      }
    ],
    url: `https://test.com/conv/${Date.now()}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),
  
  /**
   * Generate test project data
   */
  project: (overrides = {}) => ({
    id: Math.floor(Math.random() * 10000) + 1,
    name: `Test Project ${Date.now()}`,
    description: 'A test project for automated testing',
    instructions: 'Follow standard testing procedures',
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  /**
   * Generate test artifact data
   */
  artifact: (projectId, overrides = {}) => ({
    id: Math.floor(Math.random() * 10000) + 1,
    project_id: projectId,
    name: `test-file-${Date.now()}.js`,
    type: 'code',
    content: `// Test artifact generated at ${new Date().toISOString()}\nconsole.log('Test artifact');`,
    metadata: JSON.stringify({ 
      language: 'javascript',
      generated: true,
      testId: Date.now()
    }),
    version: 1,
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  /**
   * Generate test memory data
   */
  memory: (overrides = {}) => ({
    key: `test-memory-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    value: 'Test memory content for automated testing',
    importance: Math.random(),
    tags: ['test', 'automated', `tag-${Date.now()}`],
    context: {
      testRun: true,
      timestamp: Date.now(),
      randomId: Math.random().toString(36).substr(2, 9)
    },
    ...overrides
  }),
  
  /**
   * Generate multiple test items
   */
  multiple: (generator, count = 5, overrides = {}) => {
    const items = [];
    for (let i = 0; i < count; i++) {
      items.push(generator({ index: i, ...overrides }));
    }
    return items;
  }
};

/**
 * Mock factory functions
 */
const mocks = {
  /**
   * Create a mock database with configurable responses
   */
  database: () => {
    const MockDatabase = require('../mocks/database.mock.js');
    return new MockDatabase();
  },
  
  /**
   * Create a mock scraper with configurable responses
   */
  scraper: () => {
    const MockConversationScraper = require('../mocks/scraper.mock.js');
    return new MockConversationScraper();
  },
  
  /**
   * Create mock memory system components
   */
  memorySystem: () => {
    const {
      MockMemoryOrchestrator,
      MockGraphitiAdapter,
      MockShortTermMemory,
      MockMemoryBridge
    } = require('../mocks/memory-system.mock.js');
    
    return {
      orchestrator: new MockMemoryOrchestrator(),
      graphiti: new MockGraphitiAdapter(),
      shortTerm: new MockShortTermMemory(),
      bridge: new MockMemoryBridge()
    };
  },
  
  /**
   * Create a mock MCP response
   */
  mcpResponse: (content) => ({
    content: [
      {
        type: 'text',
        text: typeof content === 'string' ? content : JSON.stringify(content, null, 2)
      }
    ]
  })
};

/**
 * Test execution helpers
 */
const execution = {
  /**
   * Run tests in parallel with proper error handling
   */
  parallel: async (tests, maxConcurrency = 5) => {
    const results = [];
    const executing = [];
    
    for (const test of tests) {
      const promise = Promise.resolve(test()).then(result => ({
        success: true,
        result
      })).catch(error => ({
        success: false,
        error: error.message
      }));
      
      results.push(promise);
      
      if (results.length >= maxConcurrency) {
        executing.push(promise);
        
        if (executing.length >= maxConcurrency) {
          await Promise.race(executing);
          executing.splice(0, 1);
        }
      }
    }
    
    return Promise.all(results);
  },
  
  /**
   * Retry a test function with exponential backoff
   */
  retry: async (testFn, maxRetries = 3, baseDelay = 100) => {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await testFn();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  },
  
  /**
   * Execute test with timeout
   */
  withTimeout: (testFn, timeout = 30000) => {
    return Promise.race([
      testFn(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout)
      )
    ]);
  },
  
  /**
   * Measure execution time of a function
   */
  measure: async (testFn) => {
    const startTime = process.hrtime.bigint();
    const result = await testFn();
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
    
    return {
      result,
      duration,
      durationFormatted: `${duration.toFixed(2)}ms`
    };
  }
};

/**
 * Assertion helpers
 */
const assertions = {
  /**
   * Assert that a value is within a range
   */
  isWithinRange: (value, min, max) => {
    expect(value).toBeGreaterThanOrEqual(min);
    expect(value).toBeLessThanOrEqual(max);
  },
  
  /**
   * Assert that an array contains items matching a predicate
   */
  arrayContainsMatch: (array, predicate) => {
    expect(Array.isArray(array)).toBe(true);
    expect(array.some(predicate)).toBe(true);
  },
  
  /**
   * Assert that all items in array match predicate
   */
  arrayAllMatch: (array, predicate) => {
    expect(Array.isArray(array)).toBe(true);
    expect(array.every(predicate)).toBe(true);
  },
  
  /**
   * Assert object has required properties
   */
  hasRequiredProperties: (obj, properties) => {
    expect(obj).toBeTruthy();
    properties.forEach(prop => {
      expect(obj).toHaveProperty(prop);
    });
  },
  
  /**
   * Assert performance metrics
   */
  performanceWithinLimits: (duration, maxDuration, operation = 'operation') => {
    expect(duration).toBeLessThan(maxDuration);
    if (duration > maxDuration * 0.8) {
      console.warn(`Performance warning: ${operation} took ${duration}ms (limit: ${maxDuration}ms)`);
    }
  }
};

/**
 * Environment helpers
 */
const environment = {
  /**
   * Setup test environment
   */
  setup: () => {
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'error';
    process.env.DB_PATH = ':memory:';
    
    // Suppress console output during tests
    const originalLog = console.log;
    const originalInfo = console.info;
    const originalWarn = console.warn;
    
    console.log = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    
    return {
      restore: () => {
        console.log = originalLog;
        console.info = originalInfo;
        console.warn = originalWarn;
      }
    };
  },
  
  /**
   * Check if running in CI environment
   */
  isCI: () => {
    return process.env.CI === 'true' || process.env.CONTINUOUS_INTEGRATION === 'true';
  },
  
  /**
   * Get test configuration based on environment
   */
  getConfig: () => {
    const isCI = environment.isCI();
    
    return {
      timeouts: {
        unit: isCI ? 10000 : 5000,
        integration: isCI ? 30000 : 15000,
        e2e: isCI ? 60000 : 30000,
        performance: isCI ? 120000 : 60000
      },
      parallelism: {
        maxWorkers: isCI ? 2 : 4,
        maxConcurrency: isCI ? 3 : 5
      },
      retries: {
        flaky: isCI ? 3 : 1,
        network: isCI ? 5 : 2
      }
    };
  }
};

/**
 * File system helpers for tests
 */
const filesystem = {
  /**
   * Create temporary test files
   */
  createTempFiles: (files) => {
    const mockFs = require('mock-fs');
    const structure = {};
    
    files.forEach(file => {
      structure[file.path] = file.content || '';
    });
    
    mockFs(structure);
    
    return {
      cleanup: () => mockFs.restore()
    };
  },
  
  /**
   * Verify file operations in tests
   */
  verifyFileOperations: async (operations) => {
    const fs = require('fs');
    const results = [];
    
    for (const op of operations) {
      try {
        switch (op.type) {
          case 'read':
            const content = fs.readFileSync(op.path, 'utf8');
            results.push({ success: true, content, operation: op });
            break;
          case 'exists':
            const exists = fs.existsSync(op.path);
            results.push({ success: exists, operation: op });
            break;
          case 'stat':
            const stats = fs.statSync(op.path);
            results.push({ success: true, stats, operation: op });
            break;
          default:
            results.push({ success: false, error: `Unknown operation: ${op.type}`, operation: op });
        }
      } catch (error) {
        results.push({ success: false, error: error.message, operation: op });
      }
    }
    
    return results;
  }
};

module.exports = {
  generators,
  mocks,
  execution,
  assertions,
  environment,
  filesystem
};