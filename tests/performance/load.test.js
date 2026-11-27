/**
 * Performance and Load Tests
 * Tests system performance under various load conditions
 */

// Import server for performance testing
const AIConversationsMCP = require('../../server.js');

describe('Performance Tests', () => {
  let server;
  
  beforeAll(async () => {
    process.env.DB_PATH = ':memory:';
    server = new AIConversationsMCP();
    await global.testUtils.waitFor(500);
  });
  
  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });
  
  describe('Database Performance', () => {
    test('should handle bulk conversation insertions efficiently', async () => {
      const startTime = Date.now();
      const conversationCount = 100;
      const insertPromises = [];
      
      // Create test project
      const projectResult = await server.handleCreateProject('Performance Test', 'Load testing', 'Test');
      const projectId = parseInt(projectResult.content[0].text.match(/ID: (\d+)/)[1]);
      
      // Prepare bulk insertions
      for (let i = 0; i < conversationCount; i++) {
        const promise = server.db.saveConversation(
          'performance-test',
          projectId,
          `perf-conv-${i}`,
          `Performance Test Conversation ${i}`,
          new Date().toISOString(),
          new Date().toISOString(),
          `https://test.com/conv/${i}`
        );
        insertPromises.push(promise);
      }
      
      const results = await Promise.all(insertPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Performance assertions
      expect(results.length).toBe(conversationCount);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      const avgTimePerInsert = duration / conversationCount;
      expect(avgTimePerInsert).toBeLessThan(50); // Average < 50ms per insert
      
      console.log(`Bulk insert performance: ${conversationCount} conversations in ${duration}ms (${avgTimePerInsert.toFixed(2)}ms avg)`);
    });
    
    test('should handle concurrent database operations efficiently', async () => {
      const startTime = Date.now();
      const operationCount = 50;
      const operations = [];
      
      // Mix of different database operations
      for (let i = 0; i < operationCount; i++) {
        if (i % 3 === 0) {
          // Create project
          operations.push(server.handleCreateProject(`Concurrent Project ${i}`, 'Test', 'Test'));
        } else if (i % 3 === 1) {
          // Get conversations
          operations.push(server.handleGetConversations(null, 10, i * 10));
        } else {
          // Get projects
          operations.push(server.handleGetProjects());
        }
      }
      
      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results.length).toBe(operationCount);
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`Concurrent operations performance: ${operationCount} operations in ${duration}ms`);
    });
    
    test('should handle large result sets efficiently', async () => {
      // First, insert many conversations
      const projectResult = await server.handleCreateProject('Large Dataset Test', 'Test', 'Test');
      const projectId = parseInt(projectResult.content[0].text.match(/ID: (\d+)/)[1]);
      
      const insertCount = 500;
      const insertPromises = [];
      
      for (let i = 0; i < insertCount; i++) {
        insertPromises.push(
          server.db.saveConversation(
            'large-test',
            projectId,
            `large-conv-${i}`,
            `Large Dataset Conversation ${i}`,
            new Date().toISOString(),
            new Date().toISOString(),
            `https://test.com/large/${i}`
          )
        );
      }
      
      await Promise.all(insertPromises);
      
      // Now test retrieval performance
      const startTime = Date.now();
      const result = await server.handleGetConversations('large-test', 1000, 0);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(result).toBeValidMCPResponse();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      
      const conversations = JSON.parse(result.content[0].text);
      expect(conversations.length).toBe(insertCount);
      
      console.log(`Large result set retrieval: ${conversations.length} conversations in ${duration}ms`);
    });
  });
  
  describe('Memory System Performance', () => {
    test('should handle high-frequency memory operations', async () => {
      if (!server.memoryInitialized) {
        console.warn('Memory system not initialized, skipping memory performance tests');
        return;
      }
      
      const startTime = Date.now();
      const operationCount = 100;
      const operations = [];
      
      // Mix of store and retrieve operations
      for (let i = 0; i < operationCount; i++) {
        if (i % 2 === 0) {
          // Store operation
          operations.push(
            server.handleStoreMemory({
              key: `perf-key-${i}`,
              value: `Performance test data ${i}`,
              importance: Math.random(),
              tags: ['performance', `test-${i}`]
            })
          );
        } else {
          // Retrieve operation
          operations.push(
            server.handleRetrieveMemory({
              query: `performance test ${Math.floor(i / 2)}`,
              maxResults: 5
            })
          );
        }
      }
      
      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results.length).toBe(operationCount);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
      
      const avgTimePerOp = duration / operationCount;
      expect(avgTimePerOp).toBeLessThan(150); // Average < 150ms per operation
      
      console.log(`Memory operations performance: ${operationCount} operations in ${duration}ms (${avgTimePerOp.toFixed(2)}ms avg)`);
    });
    
    test('should handle memory search performance', async () => {
      if (!server.memoryInitialized) {
        console.warn('Memory system not initialized, skipping search performance test');
        return;
      }
      
      // First, populate memory with test data
      const dataCount = 50;
      const storePromises = [];
      
      for (let i = 0; i < dataCount; i++) {
        storePromises.push(
          server.handleStoreMemory({
            key: `search-perf-${i}`,
            value: `Searchable content about topic ${i % 10}. This contains relevant information for performance testing with keywords like database, optimization, and scalability.`,
            importance: 0.5 + (Math.random() * 0.5),
            tags: [`topic-${i % 10}`, 'searchable', 'performance']
          })
        );
      }
      
      await Promise.all(storePromises);
      
      // Wait for memory to be indexed
      await global.testUtils.waitFor(1000);
      
      // Now test search performance
      const searchQueries = [
        'database optimization',
        'scalability performance',
        'topic 5 information',
        'relevant keywords',
        'testing content'
      ];
      
      const startTime = Date.now();
      const searchPromises = searchQueries.map(query => 
        server.handleSearchMemory({
          query,
          searchType: 'semantic',
          includeRelationships: true
        })
      );
      
      const results = await Promise.all(searchPromises);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(results.length).toBe(searchQueries.length);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      
      const avgSearchTime = duration / searchQueries.length;
      expect(avgSearchTime).toBeLessThan(1000); // Average < 1 second per search
      
      console.log(`Memory search performance: ${searchQueries.length} searches in ${duration}ms (${avgSearchTime.toFixed(2)}ms avg)`);
    });
  });
  
  describe('API Response Performance', () => {
    test('should respond to tool calls within acceptable time limits', async () => {
      const tools = [
        { name: 'get_conversation_summary', args: {} },
        { name: 'get_projects', args: {} },
        { name: 'get_trending_topics', args: { limit: 5 } },
        { name: 'get_keyword_insights', args: { limit: 10 } }
      ];
      
      const performanceResults = [];
      
      for (const tool of tools) {
        const startTime = Date.now();
        
        try {
          let result;
          switch (tool.name) {
            case 'get_conversation_summary':
              result = await server.handleSummary();
              break;
            case 'get_projects':
              result = await server.handleGetProjects();
              break;
            case 'get_trending_topics':
              result = await server.handleGetTrendingTopics(null, tool.args.limit);
              break;
            case 'get_keyword_insights':
              result = await server.handleGetKeywordInsights(null, tool.args.limit);
              break;
          }
          
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          expect(result).toBeValidMCPResponse();
          expect(duration).toBeLessThan(2000); // Each call should be < 2 seconds
          
          performanceResults.push({
            tool: tool.name,
            duration,
            success: true
          });
          
        } catch (error) {
          const endTime = Date.now();
          const duration = endTime - startTime;
          
          performanceResults.push({
            tool: tool.name,
            duration,
            success: false,
            error: error.message
          });
        }
      }
      
      // All tools should complete successfully
      const successfulCalls = performanceResults.filter(r => r.success);
      expect(successfulCalls.length).toBe(tools.length);
      
      // Average response time should be reasonable
      const avgResponseTime = performanceResults.reduce((sum, r) => sum + r.duration, 0) / performanceResults.length;
      expect(avgResponseTime).toBeLessThan(1000); // Average < 1 second
      
      console.log('API Response Performance:');
      performanceResults.forEach(result => {
        console.log(`  ${result.tool}: ${result.duration}ms ${result.success ? '✓' : '✗'}`);
      });
      console.log(`  Average: ${avgResponseTime.toFixed(2)}ms`);
    });
    
    test('should handle concurrent API calls efficiently', async () => {
      const concurrencyLevel = 10;
      const calls = [];
      
      // Create multiple concurrent calls
      for (let i = 0; i < concurrencyLevel; i++) {
        calls.push(server.handleGetConversations(null, 10, i * 10));
        calls.push(server.handleGetProjects());
        if (server.memoryInitialized) {
          calls.push(server.handleGetMemoryMetrics({ includeDistribution: true }));
        }
      }
      
      const startTime = Date.now();
      const results = await Promise.all(calls);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      expect(results.length).toBe(server.memoryInitialized ? concurrencyLevel * 3 : concurrencyLevel * 2);
      
      // All should be valid responses
      results.forEach(result => {
        expect(result).toBeValidMCPResponse();
      });
      
      // Should complete faster than sequential execution
      const expectedSequentialTime = results.length * 500; // Assume 500ms per call sequentially
      expect(totalDuration).toBeLessThan(expectedSequentialTime * 0.5); // Should be at least 2x faster
      
      console.log(`Concurrent API performance: ${results.length} concurrent calls in ${totalDuration}ms`);
    });
  });
  
  describe('Resource Usage Performance', () => {
    test('should maintain reasonable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform memory-intensive operations
      const operationCount = 100;
      const operations = [];
      
      for (let i = 0; i < operationCount; i++) {
        operations.push(
          server.handleCreateProject(
            `Memory Test Project ${i}`,
            `Testing memory usage with project ${i}`,
            'Memory usage test instructions'
          )
        );
      }
      
      await Promise.all(operations);
      
      // Add artifacts to increase memory usage
      const artifactOps = [];
      for (let i = 0; i < 50; i++) {
        artifactOps.push(
          server.handleSaveArtifact(
            1, // Use first project
            `memory-test-${i}.js`,
            'code',
            `// Memory test artifact ${i}\\nconsole.log('Testing memory usage ${i}');`,
            `{"test": "memory", "index": ${i}}`
          )
        );
      }
      
      await Promise.all(artifactOps);
      
      const finalMemory = process.memoryUsage();
      
      // Memory usage should not increase excessively
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      expect(memoryIncreaseMB).toBeLessThan(100); // Should not increase by more than 100MB
      
      console.log(`Memory usage increase: ${memoryIncreaseMB.toFixed(2)}MB`);
      console.log(`Initial: ${(initialMemory.heapUsed / (1024 * 1024)).toFixed(2)}MB`);
      console.log(`Final: ${(finalMemory.heapUsed / (1024 * 1024)).toFixed(2)}MB`);
    });
    
    test('should handle cleanup efficiently', async () => {
      // Create many temporary objects
      const tempData = [];
      for (let i = 0; i < 1000; i++) {
        tempData.push({
          id: i,
          data: `Temporary data ${i}`.repeat(100), // Create larger objects
          timestamp: Date.now(),
          nested: {
            level1: { level2: { level3: `Deep data ${i}` } }
          }
        });
      }
      
      const beforeCleanup = process.memoryUsage();
      
      // Clear references
      tempData.length = 0;
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Wait a bit for cleanup
      await global.testUtils.waitFor(100);
      
      const afterCleanup = process.memoryUsage();
      
      // Memory should not increase significantly
      const memoryDiff = afterCleanup.heapUsed - beforeCleanup.heapUsed;
      expect(Math.abs(memoryDiff)).toBeLessThan(50 * 1024 * 1024); // Should be within 50MB
      
      console.log(`Memory cleanup test: ${(memoryDiff / (1024 * 1024)).toFixed(2)}MB difference`);
    });
  });
  
  describe('Stress Testing', () => {
    test('should handle rapid sequential operations', async () => {
      const operationCount = 200;
      const startTime = Date.now();
      
      // Rapid sequential operations
      for (let i = 0; i < operationCount; i++) {
        await server.handleGetConversations(null, 5, 0);
        
        if (i % 10 === 0) {
          await server.handleGetProjects();
        }
        
        if (server.memoryInitialized && i % 20 === 0) {
          await server.handleGetMemoryMetrics({});
        }
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      const avgTimePerOp = duration / operationCount;
      expect(avgTimePerOp).toBeLessThan(150); // Average < 150ms per operation
      
      console.log(`Rapid sequential operations: ${operationCount} operations in ${duration}ms (${avgTimePerOp.toFixed(2)}ms avg)`);
    });
    
    test('should maintain stability under continuous load', async () => {
      const testDuration = 5000; // 5 seconds of continuous load
      const startTime = Date.now();
      const operations = [];
      
      // Continuous operations for specified duration
      while (Date.now() - startTime < testDuration) {
        const op = server.handleGetConversations(null, 1, 0);
        operations.push(op);
        
        // Don't overwhelm the system
        await global.testUtils.waitFor(10);
      }
      
      // Wait for all operations to complete
      const results = await Promise.all(operations);
      
      // All operations should succeed
      results.forEach(result => {
        expect(result).toBeValidMCPResponse();
      });
      
      expect(results.length).toBeGreaterThan(100); // Should handle significant load
      
      console.log(`Stability test: ${results.length} operations completed in ${testDuration}ms continuous load`);
    });
  });
});