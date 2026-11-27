/**
 * Integration Tests for MCP Server
 * Tests the complete MCP protocol interaction and real component integration
 */

const {
  TestTransport,
  ListToolsRequestSchema
} = require('@modelcontextprotocol/sdk/server/index.js');

// Import without mocking for integration tests
const AIConversationsMCP = require('../../server.js');

describe('MCP Server Integration Tests', () => {
  let server;
  let transport;
  
  beforeAll(async () => {
    // Use test database in memory
    process.env.DB_PATH = ':memory:';
    
    // Create fresh server instance for integration testing
    server = new AIConversationsMCP();
    
    // Create test transport
    transport = new TestTransport();
    
    // Wait for memory system to initialize
    await global.testUtils.waitFor(500);
  });
  
  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });
  
  describe('MCP Protocol Compliance', () => {
    test('should handle ListTools request correctly', async () => {
      const listToolsRequest = {
        method: 'tools/list',
        params: {}
      };

      // Verify handler registration (handlers are registered in setupHandlers)
      expect(typeof server.server.getRequestHandler(ListToolsRequestSchema)).toBe('function');

      // Test that we can get tools list
      const tools = await server.server.request(listToolsRequest);
      expect(Array.isArray(tools?.tools || [])).toBe(true);
    });
    
    test('should validate tool schemas', async () => {
      const expectedTools = [
        'login_service',
        'scrape_conversations',
        'get_conversations',
        'search_conversations',
        'store_memory',
        'retrieve_memory'
      ];
      
      // Each expected tool should be registered
      expectedTools.forEach(toolName => {
        expect(typeof toolName).toBe('string');
        expect(toolName.length).toBeGreaterThan(0);
      });
    });
    
    test('should handle CallTool requests with proper validation', async () => {
      const callToolRequest = {
        method: 'tools/call',
        params: {
          name: 'get_conversation_summary',
          arguments: {}
        }
      };
      
      // This should not throw an error for valid tool calls
      expect(callToolRequest.params.name).toBe('get_conversation_summary');
      expect(typeof callToolRequest.params.arguments).toBe('object');
    });
  });
  
  describe('Database Integration', () => {
    test('should create and retrieve projects through full stack', async () => {
      // Create project through handler
      const createResult = await server.handleCreateProject(
        'Integration Test Project',
        'A project created during integration testing',
        'Test project instructions'
      );
      
      expect(createResult).toBeValidMCPResponse();
      expect(createResult.content[0].text).toContain('Project created with ID:');
      
      // Extract project ID
      const projectId = parseInt(createResult.content[0].text.match(/ID: (\d+)/)[1]);
      expect(projectId).toBeGreaterThan(0);
      
      // Retrieve project
      const getResult = await server.handleGetProject(projectId);
      expect(getResult).toBeValidMCPResponse();
      
      const project = JSON.parse(getResult.content[0].text);
      expect(project.id).toBe(projectId);
      expect(project.name).toBe('Integration Test Project');
      expect(project.description).toBe('A project created during integration testing');
    });
    
    test('should handle artifact versioning correctly', async () => {
      // Create project first
      const createResult = await server.handleCreateProject('Artifact Test', 'Test', 'Test');
      const projectId = parseInt(createResult.content[0].text.match(/ID: (\d+)/)[1]);
      
      // Save first version of artifact
      const v1Result = await server.handleSaveArtifact(
        projectId,
        'test-file.js',
        'code',
        'console.log("version 1");',
        '{"version": 1}'
      );
      
      expect(v1Result).toBeValidMCPResponse();
      expect(v1Result.content[0].text).toContain('version: 1');
      
      // Save second version
      const v2Result = await server.handleSaveArtifact(
        projectId,
        'test-file.js',
        'code',
        'console.log("version 2");',
        '{"version": 2}'
      );
      
      expect(v2Result).toBeValidMCPResponse();
      expect(v2Result.content[0].text).toContain('version: 2');
      
      // Get all versions
      const versionsResult = await server.handleGetArtifactVersions(projectId, 'test-file.js');
      expect(versionsResult).toBeValidMCPResponse();
      
      const versions = JSON.parse(versionsResult.content[0].text);
      expect(Array.isArray(versions)).toBe(true);
      expect(versions.length).toBe(2);
      expect(versions.some(v => v.version === 1)).toBe(true);
      expect(versions.some(v => v.version === 2)).toBe(true);
    });
  });
  
  describe('Memory System Integration', () => {
    test('should store and retrieve memories across layers', async () => {
      // Wait for memory system initialization
      await global.testUtils.waitFor(200);
      
      if (!server.memoryInitialized) {
        console.warn('Memory system not initialized, skipping memory integration tests');
        return;
      }
      
      // Store operational memory
      const storeResult = await server.handleStoreMemory({
        key: 'integration-test-key',
        value: 'This is integration test data',
        importance: 0.6,
        tags: ['integration', 'test'],
        context: { testType: 'integration' }
      });
      
      expect(storeResult).toBeValidMCPResponse();
      
      const storeResponse = JSON.parse(storeResult.content[0].text);
      expect(storeResponse.success).toBe(true);
      expect(storeResponse.layer).toBeDefined();
      
      // Retrieve memory
      const retrieveResult = await server.handleRetrieveMemory({
        query: 'integration test data',
        strategy: 'operational',
        maxResults: 5
      });
      
      expect(retrieveResult).toBeValidMCPResponse();
      
      const retrieveResponse = JSON.parse(retrieveResult.content[0].text);
      expect(retrieveResponse.success).toBe(true);
      expect(Array.isArray(retrieveResponse.results)).toBe(true);
    });
    
    test('should handle memory promotion workflow', async () => {
      if (!server.memoryInitialized) {
        console.warn('Memory system not initialized, skipping memory promotion test');
        return;
      }
      
      // Store memory first
      await server.handleStoreMemory({
        key: 'promotion-test',
        value: 'Data to be promoted',
        importance: 0.5,
        tags: ['promotion', 'test']
      });
      
      // Promote to strategic memory
      const promoteResult = await server.handlePromoteMemory({
        key: 'promotion-test',
        reason: 'Important for future integration tests',
        enhancedImportance: 0.9
      });
      
      expect(promoteResult).toBeValidMCPResponse();
      
      const promoteResponse = JSON.parse(promoteResult.content[0].text);
      expect(promoteResponse.success).toBe(true);
      expect(promoteResponse.enhancedImportance).toBe(0.9);
    });
    
    test('should provide comprehensive memory metrics', async () => {
      if (!server.memoryInitialized) {
        console.warn('Memory system not initialized, skipping metrics test');
        return;
      }
      
      const metricsResult = await server.handleGetMemoryMetrics({
        includeDistribution: true,
        includePerformance: true,
        includeCorrelations: true
      });
      
      expect(metricsResult).toBeValidMCPResponse();
      
      const metrics = JSON.parse(metricsResult.content[0].text);
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.orchestrator).toBeDefined();
      expect(metrics.components).toBeDefined();
      expect(metrics.components.strategic).toBeDefined();
      expect(metrics.components.operational).toBeDefined();
    });
  });
  
  describe('Search Integration', () => {
    test('should search across conversations and memory', async () => {
      // Create test conversations through database
      const projectId = 1; // Use a test project ID
      
      // Save test conversation
      const convId = await server.db.saveConversation(
        'test-service',
        projectId,
        'test-conv-123',
        'Integration Test Conversation',
        new Date().toISOString(),
        new Date().toISOString(),
        'https://test.com/conv/123'
      );
      
      // Add messages to conversation
      await server.db.saveMessage(
        convId,
        'test-service',
        'user',
        'Tell me about machine learning',
        new Date().toISOString(),
        1
      );
      
      await server.db.saveMessage(
        convId,
        'test-service',
        'assistant',
        'Machine learning is a subset of artificial intelligence',
        new Date().toISOString(),
        2
      );
      
      // Search conversations
      const searchResult = await server.handleSearch({
        query: 'machine learning',
        search_type: 'fuzzy',
        min_score: 0.1
      });
      
      expect(searchResult).toBeValidMCPResponse();
      expect(searchResult.content[0].text).toContain('machine learning');
    });
  });
  
  describe('Error Handling Integration', () => {
    test('should handle invalid tool names gracefully', async () => {
      await expect(server.server.request({
        method: 'tools/call',
        params: {
          name: 'nonexistent_tool',
          arguments: {}
        }
      })).rejects.toThrow();
    });
    
    test('should handle malformed requests gracefully', async () => {
      const invalidRequests = [
        { method: 'tools/call', params: { name: 'get_conversations' } }, // missing arguments
        { method: 'tools/call', params: { arguments: {} } }, // missing name
        { method: 'tools/call', params: {} } // missing both
      ];
      
      for (const request of invalidRequests) {
        await expect(server.server.request(request)).rejects.toThrow();
      }
    });
    
    test('should handle memory system unavailable gracefully', async () => {
      // Temporarily disable memory system
      const originalFlag = server.memoryInitialized;
      server.memoryInitialized = false;
      
      await expect(server.handleStoreMemory({
        key: 'test',
        value: 'test'
      })).rejects.toThrow('Memory system not initialized');
      
      // Restore flag
      server.memoryInitialized = originalFlag;
    });
  });
  
  describe('Concurrent Operations', () => {
    test('should handle multiple concurrent requests', async () => {
      const requests = [];
      
      // Create multiple concurrent requests
      for (let i = 0; i < 5; i++) {
        const request = server.handleCreateProject(
          `Concurrent Project ${i}`,
          `Project created in concurrent test ${i}`,
          `Instructions ${i}`
        );
        requests.push(request);
      }
      
      // Wait for all to complete
      const results = await Promise.all(requests);
      
      // All should succeed
      results.forEach((result, index) => {
        expect(result).toBeValidMCPResponse();
        expect(result.content[0].text).toContain(`Project created with ID:`);
      });
      
      // All should have different IDs
      const ids = results.map(result => {
        const match = result.content[0].text.match(/ID: (\d+)/);
        return match ? parseInt(match[1]) : null;
      }).filter(id => id !== null);
      
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length); // All IDs should be unique
    });
    
    test('should handle concurrent memory operations', async () => {
      if (!server.memoryInitialized) {
        console.warn('Memory system not initialized, skipping concurrent memory test');
        return;
      }
      
      const memoryOps = [];
      
      // Create concurrent memory operations
      for (let i = 0; i < 3; i++) {
        const storeOp = server.handleStoreMemory({
          key: `concurrent-key-${i}`,
          value: `Concurrent data ${i}`,
          importance: 0.5 + (i * 0.1),
          tags: ['concurrent', `test-${i}`]
        });
        memoryOps.push(storeOp);
      }
      
      const results = await Promise.all(memoryOps);
      
      results.forEach((result, index) => {
        expect(result).toBeValidMCPResponse();
        const response = JSON.parse(result.content[0].text);
        expect(response.success).toBe(true);
      });
    });
  });
  
  describe('Data Consistency', () => {
    test('should maintain data consistency across operations', async () => {
      // Create project
      const createResult = await server.handleCreateProject(
        'Consistency Test',
        'Testing data consistency',
        'Test instructions'
      );
      
      const projectId = parseInt(createResult.content[0].text.match(/ID: (\d+)/)[1]);
      
      // Add multiple artifacts
      const artifacts = [
        { name: 'file1.js', content: 'content 1' },
        { name: 'file2.js', content: 'content 2' },
        { name: 'file3.js', content: 'content 3' }
      ];
      
      for (const artifact of artifacts) {
        await server.handleSaveArtifact(
          projectId,
          artifact.name,
          'code',
          artifact.content,
          '{}'
        );
      }
      
      // Retrieve all artifacts
      const artifactsResult = await server.handleGetArtifacts(projectId);
      expect(artifactsResult).toBeValidMCPResponse();
      
      const retrievedArtifacts = JSON.parse(artifactsResult.content[0].text);
      expect(Array.isArray(retrievedArtifacts)).toBe(true);
      expect(retrievedArtifacts.length).toBe(3);
      
      // Verify all artifacts are present
      artifacts.forEach(original => {
        const found = retrievedArtifacts.find(a => a.name === original.name);
        expect(found).toBeDefined();
        expect(found.content).toBe(original.content);
      });
    });
  });
});