#!/usr/bin/env node

/**
 * Advanced Test Runner for TDD Workflow
 * Provides intelligent test execution with parallel processing and reporting
 */

const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class TDDTestRunner {
  constructor() {
    this.config = {
      maxWorkers: process.env.CI ? 2 : 4,
      timeout: {
        unit: 10000,
        integration: 30000,
        e2e: 60000,
        performance: 120000
      },
      coverage: {
        threshold: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      },
      parallel: {
        unit: true,
        integration: true,
        e2e: false,
        performance: false
      }
    };
    
    this.results = {
      unit: null,
      integration: null,
      e2e: null,
      performance: null,
      coverage: null
    };
    
    this.startTime = Date.now();
  }
  
  /**
   * Run complete test suite with TDD optimizations
   */
  async runAll() {
    console.log('🚀 Starting TDD Test Suite with Parallel Execution');
    console.log('=' .repeat(60));
    
    try {
      // Phase 1: Fast feedback loop (parallel unit tests)
      console.log('\n📋 Phase 1: Unit Tests (Fast Feedback)');
      await this.runUnitTests();
      
      // Phase 2: Integration validation (parallel when possible)
      console.log('\n🔧 Phase 2: Integration Tests');
      await this.runIntegrationTests();
      
      // Phase 3: End-to-end validation (sequential for stability)
      console.log('\n🎯 Phase 3: End-to-End Tests');
      await this.runE2ETests();
      
      // Phase 4: Performance validation
      console.log('\n⚡ Phase 4: Performance Tests');
      await this.runPerformanceTests();
      
      // Phase 5: Coverage analysis
      console.log('\n📊 Phase 5: Coverage Analysis');
      await this.runCoverageAnalysis();
      
      // Generate comprehensive report
      this.generateReport();
      
    } catch (error) {
      console.error('\n❌ Test suite failed:', error.message);
      this.generateFailureReport(error);
      process.exit(1);
    }
  }
  
  /**
   * Run only unit tests for TDD red-green-refactor cycle
   */
  async runTDDCycle() {
    console.log('🔄 TDD Cycle: Running Unit Tests');
    
    try {
      await this.runUnitTests();
      
      if (this.results.unit.success) {
        console.log('✅ TDD Cycle: All tests passing - Ready for refactor');
      } else {
        console.log('❌ TDD Cycle: Tests failing - Continue implementation');
        console.log(`Failed tests: ${this.results.unit.failedTests}`);
      }
      
    } catch (error) {
      console.log('❌ TDD Cycle: Test execution failed');
      console.error(error.message);
    }
  }
  
  /**
   * Run unit tests with parallel execution
   */
  async runUnitTests() {
    const startTime = Date.now();
    
    try {
      const result = await this.executeTests('unit', {
        testPathPattern: 'tests/unit',
        maxWorkers: this.config.maxWorkers,
        testTimeout: this.config.timeout.unit,
        parallel: this.config.parallel.unit,
        watchMode: false
      });
      
      this.results.unit = {
        success: result.exitCode === 0,
        duration: Date.now() - startTime,
        passedTests: result.numPassedTests,
        failedTests: result.numFailedTests,
        totalTests: result.numTotalTests,
        coverage: result.coverageData
      };
      
      if (this.results.unit.success) {
        console.log(`✅ Unit tests passed (${this.results.unit.passedTests}/${this.results.unit.totalTests}) in ${this.results.unit.duration}ms`);
      } else {
        console.log(`❌ Unit tests failed (${this.results.unit.failedTests} failures)`);
      }
      
    } catch (error) {
      this.results.unit = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      throw error;
    }
  }
  
  /**
   * Run integration tests
   */
  async runIntegrationTests() {
    const startTime = Date.now();
    
    try {
      const result = await this.executeTests('integration', {
        testPathPattern: 'tests/integration',
        maxWorkers: this.config.parallel.integration ? this.config.maxWorkers : 1,
        testTimeout: this.config.timeout.integration,
        setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
      });
      
      this.results.integration = {
        success: result.exitCode === 0,
        duration: Date.now() - startTime,
        passedTests: result.numPassedTests,
        failedTests: result.numFailedTests,
        totalTests: result.numTotalTests
      };
      
      if (this.results.integration.success) {
        console.log(`✅ Integration tests passed (${this.results.integration.passedTests}/${this.results.integration.totalTests}) in ${this.results.integration.duration}ms`);
      } else {
        console.log(`❌ Integration tests failed (${this.results.integration.failedTests} failures)`);
      }
      
    } catch (error) {
      this.results.integration = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      throw error;
    }
  }
  
  /**
   * Run end-to-end tests
   */
  async runE2ETests() {
    const startTime = Date.now();
    
    try {
      const result = await this.executeTests('e2e', {
        testPathPattern: 'tests/e2e',
        maxWorkers: 1, // Sequential for stability
        testTimeout: this.config.timeout.e2e,
        setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
        detectOpenHandles: true
      });
      
      this.results.e2e = {
        success: result.exitCode === 0,
        duration: Date.now() - startTime,
        passedTests: result.numPassedTests,
        failedTests: result.numFailedTests,
        totalTests: result.numTotalTests
      };
      
      if (this.results.e2e.success) {
        console.log(`✅ E2E tests passed (${this.results.e2e.passedTests}/${this.results.e2e.totalTests}) in ${this.results.e2e.duration}ms`);
      } else {
        console.log(`❌ E2E tests failed (${this.results.e2e.failedTests} failures)`);
      }
      
    } catch (error) {
      this.results.e2e = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      throw error;
    }
  }
  
  /**
   * Run performance tests
   */
  async runPerformanceTests() {
    const startTime = Date.now();
    
    try {
      const result = await this.executeTests('performance', {
        testPathPattern: 'tests/performance',
        maxWorkers: 1, // Sequential for accurate measurements
        testTimeout: this.config.timeout.performance,
        setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
      });
      
      this.results.performance = {
        success: result.exitCode === 0,
        duration: Date.now() - startTime,
        passedTests: result.numPassedTests,
        failedTests: result.numFailedTests,
        totalTests: result.numTotalTests
      };
      
      if (this.results.performance.success) {
        console.log(`✅ Performance tests passed (${this.results.performance.passedTests}/${this.results.performance.totalTests}) in ${this.results.performance.duration}ms`);
      } else {
        console.log(`❌ Performance tests failed (${this.results.performance.failedTests} failures)`);
      }
      
    } catch (error) {
      this.results.performance = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      // Don't throw for performance tests - they're not critical
      console.warn(`⚠️ Performance tests failed: ${error.message}`);
    }
  }
  
  /**
   * Run coverage analysis
   */
  async runCoverageAnalysis() {
    const startTime = Date.now();
    
    try {
      const result = await this.executeTests('coverage', {
        coverage: true,
        coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
        coverageDirectory: 'coverage',
        collectCoverageFrom: [
          'src/**/*.js',
          'database.js',
          'scrapers.js',
          'search.js',
          'server.js',
          '!**/node_modules/**',
          '!**/tests/**'
        ],
        coverageThreshold: {
          global: this.config.coverage.threshold
        }
      });
      
      this.results.coverage = {
        success: result.exitCode === 0,
        duration: Date.now() - startTime,
        data: this.parseCoverageData()
      };
      
      if (this.results.coverage.success) {
        console.log(`✅ Coverage analysis completed in ${this.results.coverage.duration}ms`);
        this.displayCoverageResults();
      } else {
        console.log(`❌ Coverage threshold not met`);
      }
      
    } catch (error) {
      this.results.coverage = {
        success: false,
        error: error.message,
        duration: Date.now() - startTime
      };
      console.warn(`⚠️ Coverage analysis failed: ${error.message}`);
    }
  }
  
  /**
   * Execute Jest tests with specified configuration
   */
  async executeTests(testType, options) {
    const jestArgs = [
      '--detectOpenHandles',
      '--forceExit',
      '--verbose'
    ];
    
    // Add test path pattern
    if (options.testPathPattern) {
      jestArgs.push('--testPathPattern', options.testPathPattern);
    }
    
    // Add worker configuration
    if (options.maxWorkers) {
      jestArgs.push('--maxWorkers', options.maxWorkers.toString());
    }
    
    // Add timeout
    if (options.testTimeout) {
      jestArgs.push('--testTimeout', options.testTimeout.toString());
    }
    
    // Add coverage options
    if (options.coverage) {
      jestArgs.push('--coverage');
      
      if (options.coverageReporters) {
        jestArgs.push('--coverageReporters', options.coverageReporters.join(','));
      }
      
      if (options.coverageDirectory) {
        jestArgs.push('--coverageDirectory', options.coverageDirectory);
      }
    }
    
    // Run Jest
    return new Promise((resolve, reject) => {
      const jest = spawn('npx', ['jest', ...jestArgs], {
        stdio: ['inherit', 'pipe', 'pipe'],
        cwd: process.cwd()
      });
      
      let stdout = '';
      let stderr = '';
      
      jest.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
      });
      
      jest.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
      });
      
      jest.on('close', (exitCode) => {
        const result = this.parseJestOutput(stdout, stderr);
        result.exitCode = exitCode;
        
        if (exitCode === 0) {
          resolve(result);
        } else {
          reject(new Error(`Jest exited with code ${exitCode}`));
        }
      });
      
      jest.on('error', (error) => {
        reject(error);
      });
    });
  }
  
  /**
   * Parse Jest output for test results
   */
  parseJestOutput(stdout, stderr) {
    const result = {
      numPassedTests: 0,
      numFailedTests: 0,
      numTotalTests: 0,
      coverageData: null
    };
    
    // Parse test results
    const testSummaryMatch = stdout.match(/Tests:\s+(\d+)\s+failed,\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    if (testSummaryMatch) {
      result.numFailedTests = parseInt(testSummaryMatch[1]);
      result.numPassedTests = parseInt(testSummaryMatch[2]);
      result.numTotalTests = parseInt(testSummaryMatch[3]);
    } else {
      const passedMatch = stdout.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
      if (passedMatch) {
        result.numPassedTests = parseInt(passedMatch[1]);
        result.numTotalTests = parseInt(passedMatch[2]);
      }
    }
    
    return result;
  }
  
  /**
   * Parse coverage data from generated reports
   */
  parseCoverageData() {
    try {
      const coveragePath = path.join(process.cwd(), 'coverage', 'coverage-summary.json');
      if (fs.existsSync(coveragePath)) {
        return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
      }
    } catch (error) {
      console.warn('Could not parse coverage data:', error.message);
    }
    return null;
  }
  
  /**
   * Display coverage results in a readable format
   */
  displayCoverageResults() {
    if (!this.results.coverage.data || !this.results.coverage.data.total) {
      return;
    }
    
    const { total } = this.results.coverage.data;
    
    console.log('\n📊 Coverage Summary:');
    console.log(`  Branches:   ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);
    console.log(`  Functions:  ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
    console.log(`  Lines:      ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
    console.log(`  Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);
  }
  
  /**
   * Generate comprehensive test report
   */
  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TDD Test Suite Complete');
    console.log('='.repeat(60));
    
    console.log(`\n⏱️  Total execution time: ${(totalDuration / 1000).toFixed(2)}s`);
    
    // Test results summary
    console.log('\n📋 Test Results:');
    Object.entries(this.results).forEach(([type, result]) => {
      if (result && typeof result.success === 'boolean') {
        const status = result.success ? '✅' : '❌';
        const duration = result.duration ? ` (${result.duration}ms)` : '';
        const tests = result.totalTests ? ` - ${result.passedTests}/${result.totalTests} passed` : '';
        console.log(`  ${status} ${type.padEnd(12)}${duration}${tests}`);
      }
    });
    
    // Overall status
    const allTestsPassed = Object.values(this.results).every(result => 
      !result || result.success !== false
    );
    
    if (allTestsPassed) {
      console.log('\n🎯 Overall Status: ALL TESTS PASSED');
      console.log('✅ Ready for deployment');
    } else {
      console.log('\n🚨 Overall Status: SOME TESTS FAILED');
      console.log('❌ Review failures before deployment');
    }
    
    console.log('='.repeat(60));
  }
  
  /**
   * Generate failure report
   */
  generateFailureReport(error) {
    console.log('\n' + '='.repeat(60));
    console.log('💥 Test Suite Failed');
    console.log('='.repeat(60));
    
    console.log(`\n❌ Error: ${error.message}`);
    
    // Show which tests failed
    Object.entries(this.results).forEach(([type, result]) => {
      if (result && result.success === false) {
        console.log(`\n💔 ${type} tests failed:`);
        if (result.error) {
          console.log(`   Error: ${result.error}`);
        }
        if (result.failedTests) {
          console.log(`   Failed: ${result.failedTests}`);
        }
      }
    });
    
    console.log('\n🔧 Troubleshooting:');
    console.log('  1. Check test logs for specific failures');
    console.log('  2. Run individual test suites: npm run test:unit, test:integration, etc.');
    console.log('  3. Use TDD mode for faster feedback: npm run test:tdd');
    
    console.log('='.repeat(60));
  }
  
  /**
   * Run in watch mode for TDD
   */
  async runWatchMode() {
    console.log('👀 Starting TDD Watch Mode');
    console.log('Press Ctrl+C to exit\n');
    
    const jest = spawn('npx', [
      'jest',
      '--watch',
      '--testPathPattern', 'tests/unit',
      '--verbose',
      '--detectOpenHandles'
    ], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    jest.on('close', (code) => {
      console.log(`\nWatch mode exited with code ${code}`);
    });
    
    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping watch mode...');
      jest.kill('SIGINT');
      process.exit(0);
    });
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'all';
  
  const runner = new TDDTestRunner();
  
  switch (command) {
    case 'all':
      await runner.runAll();
      break;
    case 'tdd':
      await runner.runTDDCycle();
      break;
    case 'watch':
      await runner.runWatchMode();
      break;
    case 'unit':
      await runner.runUnitTests();
      break;
    case 'integration':
      await runner.runIntegrationTests();
      break;
    case 'e2e':
      await runner.runE2ETests();
      break;
    case 'performance':
      await runner.runPerformanceTests();
      break;
    case 'coverage':
      await runner.runCoverageAnalysis();
      break;
    default:
      console.log('Usage: node scripts/test-runner.js [command]');
      console.log('Commands: all, tdd, watch, unit, integration, e2e, performance, coverage');
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Test runner failed:', error.message);
    process.exit(1);
  });
}

module.exports = TDDTestRunner;