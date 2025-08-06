module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Coverage configuration
  collectCoverage: false, // Enable via --coverage flag
  collectCoverageFrom: [
    'src/**/*.js',
    'database.js',
    'scrapers.js',
    'search.js',
    'server.js',
    'ecosystem-integration.js',
    '!src/**/index.js',
    '!**/node_modules/**',
    '!**/tests/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Test timeout
  testTimeout: 30000,
  
  // Parallel execution
  maxWorkers: '50%',
  
  // Module paths
  moduleDirectories: ['node_modules', '<rootDir>'],
  
  // Transform files
  transform: {},
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/'
  ],
  
  // Verbose output
  verbose: true,
  
  // Error handling
  bail: 0,
  
  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true
};