/**
 * Global test setup and configuration
 * London School TDD setup with mocking capabilities
 */

const sinon = require('sinon');
const mockFs = require('mock-fs');

// Global test configuration
global.sinon = sinon;

// Setup before all tests
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  process.env.DB_PATH = ':memory:';
  
  // Disable console output during tests (except errors)
  global.originalConsole = {
    log: console.log,
    info: console.info,
    warn: console.warn
  };
  
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  
  // Set global timeout for async operations
  jest.setTimeout(30000);
});

// Cleanup after all tests
afterAll(async () => {
  // Restore console
  console.log = global.originalConsole.log;
  console.info = global.originalConsole.info;
  console.warn = global.originalConsole.warn;
  
  // Restore file system
  mockFs.restore();
  
  // Clean up sinon
  sinon.restore();
});

// Setup before each test
beforeEach(() => {
  // Clear all mocks and stubs before each test
  jest.clearAllMocks();
  sinon.reset();
});

// Cleanup after each test
afterEach(() => {
  // Restore sinon after each test
  sinon.restore();
  
  // Clear any mock fs setups
  try {
    mockFs.restore();
  } catch (e) {
    // Ignore if already restored
  }
});

// Custom matchers for TDD
expect.extend({
  toBeValidMCPResponse(received) {
    const pass = received && 
      received.content && 
      Array.isArray(received.content) && 
      received.content.length > 0;
      
    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to be a valid MCP response`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to be a valid MCP response with content array`,
        pass: false
      };
    }
  },
  
  toHaveValidSchema(received, schema) {
    const hasRequiredFields = schema.required ? 
      schema.required.every(field => field in received) : true;
    
    const pass = hasRequiredFields;
    
    if (pass) {
      return {
        message: () => `Expected ${JSON.stringify(received)} not to match schema`,
        pass: true
      };
    } else {
      return {
        message: () => `Expected ${JSON.stringify(received)} to match schema ${JSON.stringify(schema)}`,
        pass: false
      };
    }
  }
});

// Global test utilities
global.testUtils = {
  // Create test conversation
  createTestConversation: (overrides = {}) => ({
    id: 'test-123',
    title: 'Test Conversation',
    service: 'test',
    messages: [
      {
        role: 'user',
        content: 'Hello',
        order: 1
      },
      {
        role: 'assistant',
        content: 'Hi there!',
        order: 2
      }
    ],
    url: 'https://test.com/conv/123',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides
  }),
  
  // Create test project
  createTestProject: (overrides = {}) => ({
    id: 1,
    name: 'Test Project',
    description: 'A test project',
    instructions: 'Test instructions',
    created_at: new Date().toISOString(),
    ...overrides
  }),
  
  // Wait helper for async operations
  waitFor: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Mock database response
  mockDbResponse: (data) => Promise.resolve(data),
  
  // Mock MCP server response
  mockMCPResponse: (content) => ({
    content: [
      {
        type: 'text',
        text: JSON.stringify(content, null, 2)
      }
    ]
  })
};