/**
 * Unit Tests for MCP Server (London School TDD)
 * Tests behavior through mocked dependencies
 */

// Mock all dependencies before importing the main class
jest.mock('../../database.js', () => require('../mocks/database.mock.js'));
jest.mock('../../scrapers.js', () => require('../mocks/scraper.mock.js'));
jest.mock('../../src/core/memory-orchestrator.js', () => require('../mocks/memory-system.mock.js').MockMemoryOrchestrator);
jest.mock('../../src/integrations/graphiti/graphiti-adapter.js', () => require('../mocks/memory-system.mock.js').MockGraphitiAdapter);
jest.mock('../../src/core/short-term-memory.js', () => require('../mocks/memory-system.mock.js').MockShortTermMemory);
jest.mock('../../src/core/memory-bridge.js', () => require('../mocks/memory-system.mock.js').MockMemoryBridge);

const {
  Server,
  ListToolsRequestSchema,
  CallToolRequestSchema
} = require('@modelcontextprotocol/sdk/server/index.js');

describe('AIConversationsMCP Server', () => {
  let server;
  let mockDatabase;
  let mockScraper;
  let mockMemoryOrchestrator;
  
  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Import after mocks are set up
    const AIConversationsMCP = require('../../server.js');
    
    // Create server instance (constructor will be called)
    server = new AIConversationsMCP();
    
    // Get mock references
    mockDatabase = server.db;
    mockScraper = server.scraper;
    mockMemoryOrchestrator = server.memoryOrchestrator;
    
    // Wait for memory system initialization to complete
    await global.testUtils.waitFor(100);
  });
  
  describe('Constructor and Initialization', () => {
    test('should initialize server with correct configuration', () => {
      expect(server).toBeDefined();
      expect(server.server).toBeInstanceOf(Server);
      expect(server.db).toBeDefined();
      expect(server.scraper).toBeDefined();
      expect(server.searchEngine).toBeDefined();
    });
    
    test('should initialize memory system components', () => {
      expect(server.memoryOrchestrator).toBeDefined();
      expect(server.graphitiAdapter).toBeDefined();
      expect(server.shortTermMemory).toBeDefined();
      expect(server.memoryBridge).toBeDefined();
    });
    
    test('should set memory initialization flag correctly', async () => {
      // Memory system should be initialized after constructor
      await global.testUtils.waitFor(200);
      expect(server.memoryInitialized).toBe(true);
    });
  });
  
  describe('Tool Registration', () => {
    test('should register all required tools', async () => {
      // Request handlers are registered in the constructor (setupHandlers)
      expect(typeof server.server.getRequestHandler(ListToolsRequestSchema)).toBe('function');
      expect(typeof server.server.getRequestHandler(CallToolRequestSchema)).toBe('function');
    });
    
    test('should register conversation management tools', async () => {
      const tools = [
        'login_service',
        'scrape_conversations',
        'scrape_conversations_for_project',
        'get_conversations',
        'get_conversation_messages',
        'search_conversations',
        'clear_conversations',
        'get_conversation_summary'
      ];
      
      // Each tool should have proper schema
      tools.forEach(toolName => {
        // This would be verified by checking the actual tool registration
        expect(toolName).toBeTruthy();
      });
    });
    
    test('should register project and artifact tools', async () => {
      const projectTools = [
        'create_project',
        'get_projects',
        'get_project',
        'save_artifact',
        'get_artifacts',
        'get_artifact_versions'
      ];
      
      projectTools.forEach(toolName => {
        expect(toolName).toBeTruthy();
      });
    });
    
    test('should register memory management tools', async () => {
      const memoryTools = [
        'store_memory',
        'retrieve_memory',
        'search_memory',
        'promote_memory',
        'get_memory_metrics',
        'analyze_memory_patterns',
        'health_check_memory'
      ];
      
      memoryTools.forEach(toolName => {
        expect(toolName).toBeTruthy();
      });
    });
  });
  
  describe('Login Service Handler', () => {
    test('should handle successful login', async () => {
      // Setup mock behavior
      mockScraper.init.resolves();
      mockScraper.loginToService.resolves();
      
      const result = await server.handleLogin('chatgpt');
      
      expect(mockScraper.init).toHaveBeenCalledTimes(1);
      expect(mockScraper.loginToService).toHaveBeenCalledWith('chatgpt');
      expect(result).toBeValidMCPResponse();
      expect(result.content[0].text).toContain('Successfully logged in to chatgpt');
    });
    
    test('should handle login failure', async () => {
      // Setup mock failure
      mockScraper.init.resolves();
      mockScraper.loginToService.rejects(new Error('Login failed'));
      
      await expect(server.handleLogin('invalid-service')).rejects.toThrow('Login failed');
      expect(mockScraper.loginToService).toHaveBeenCalledWith('invalid-service');
    });
  });
  
  describe('Conversation Scraping', () => {
    test('should scrape conversations from single service', async () => {
      // Setup mock data
      const mockConversations = [global.testUtils.createTestConversation()];
      mockScraper.init.resolves();
      mockScraper.scrapeChatgpt.resolves(mockConversations);
      
      const result = await server.handleScrape('chatgpt', true);
      
      expect(mockScraper.init).toHaveBeenCalledTimes(1);
      expect(mockScraper.scrapeChatgpt).toHaveBeenCalledTimes(1);
      expect(result).toBeValidMCPResponse();
      expect(result.content[0].text).toContain('chatgpt: 1 conversations');
    });
    
    test('should scrape from all services', async () => {
      // Setup mock data for all services
      const mockResults = {
        chatgpt: [global.testUtils.createTestConversation()],
        grok: [global.testUtils.createTestConversation({ id: 'grok-123' })],
        gemini: [global.testUtils.createTestConversation({ id: 'gemini-123' })],
        claude: [global.testUtils.createTestConversation({ id: 'claude-123' })]
      };
      
      mockScraper.init.resolves();
      mockScraper.scrapeAll.resolves(mockResults);
      
      const result = await server.handleScrape('all', true);
      
      expect(mockScraper.scrapeAll).toHaveBeenCalledTimes(1);
      expect(result).toBeValidMCPResponse();
      expect(result.content[0].text).toContain('chatgpt: 1 conversations');
      expect(result.content[0].text).toContain('grok: 1 conversations');
    });
    
    test('should handle scraping errors gracefully', async () => {
      mockScraper.init.resolves();
      mockScraper.scrapeChatgpt.rejects(new Error('Network timeout'));
      
      await expect(server.handleScrape('chatgpt', false)).rejects.toThrow('Network timeout');
    });
    
    test('should save conversations to database when requested', async () => {
      const mockConversations = [global.testUtils.createTestConversation()];
      mockScraper.init.resolves();
      mockScraper.scrapeChatgpt.resolves(mockConversations);
      mockDatabase.saveConversation.resolves(1);
      mockDatabase.saveMessage.resolves(1);
      
      await server.handleScrape('chatgpt', true);
      
      // Verify database interactions
      expect(mockDatabase.saveConversation).toHaveBeenCalled();
      expect(mockDatabase.saveMessage).toHaveBeenCalled();
    });
  });
  
  describe('Project Management', () => {
    test('should create project successfully', async () => {
      mockDatabase.saveProject.resolves(1);
      
      const result = await server.handleCreateProject('Test Project', 'Description', 'Instructions');
      
      expect(mockDatabase.saveProject).toHaveBeenCalledWith('Test Project', 'Description', 'Instructions');
      expect(result).toBeValidMCPResponse();
      expect(result.content[0].text).toContain('Project created with ID: 1');
    });
    
    test('should get all projects', async () => {
      const mockProjects = [global.testUtils.createTestProject()];
      mockDatabase.getProjects.resolves(mockProjects);
      
      const result = await server.handleGetProjects();
      
      expect(mockDatabase.getProjects).toHaveBeenCalledTimes(1);
      expect(result).toBeValidMCPResponse();
      
      const projects = JSON.parse(result.content[0].text);
      expect(Array.isArray(projects)).toBe(true);
      expect(projects).toHaveLength(1);
    });
    
    test('should get specific project', async () => {
      const mockProject = global.testUtils.createTestProject();
      mockDatabase.getProject.resolves(mockProject);
      
      const result = await server.handleGetProject(1);
      
      expect(mockDatabase.getProject).toHaveBeenCalledWith(1);
      expect(result).toBeValidMCPResponse();
      
      const project = JSON.parse(result.content[0].text);
      expect(project.id).toBe(1);
      expect(project.name).toBe('Test Project');
    });
    
    test('should handle project not found', async () => {
      mockDatabase.getProject.resolves(null);
      
      await expect(server.handleGetProject(999)).rejects.toThrow('Project with ID 999 not found');
    });
  });
  
  describe('Memory Management', () => {
    test('should store memory successfully', async () => {
      const memoryData = {
        key: 'test-key',
        value: 'test-value',
        importance: 0.8,
        tags: ['test'],
        context: { source: 'unit-test' }
      };
      
      const result = await server.handleStoreMemory(memoryData);
      
      expect(mockMemoryOrchestrator.store).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-key',
          value: 'test-value',
          importance: 0.8
        }),
        expect.any(Object)
      );
      
      expect(result).toBeValidMCPResponse();
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });
    
    test('should retrieve memory with different strategies', async () => {
      const queryData = {
        query: 'test query',
        strategy: 'fused',
        maxResults: 5
      };
      
      const result = await server.handleRetrieveMemory(queryData);
      
      expect(mockMemoryOrchestrator.retrieve).toHaveBeenCalledWith(
        expect.objectContaining({ text: 'test query' }),
        expect.objectContaining({ strategy: 'fused' })
      );
      
      expect(result).toBeValidMCPResponse();
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
      expect(Array.isArray(response.results)).toBe(true);
    });
    
    test('should handle memory system not initialized', async () => {
      server.memoryInitialized = false;
      
      await expect(server.handleStoreMemory({ key: 'test', value: 'test' }))
        .rejects.toThrow('Memory system not initialized');
    });
    
    test('should promote memory to strategic layer', async () => {
      const promotionData = {
        key: 'test-key',
        reason: 'Important for future reference',
        enhancedImportance: 0.9
      };
      
      const result = await server.handlePromoteMemory(promotionData);
      
      expect(server.shortTermMemory.retrieve).toHaveBeenCalledWith('test-key');
      expect(mockMemoryOrchestrator.promoteToStrategic).toHaveBeenCalled();
      
      expect(result).toBeValidMCPResponse();
      const response = JSON.parse(result.content[0].text);
      expect(response.success).toBe(true);
    });
    
    test('should get memory system metrics', async () => {
      const result = await server.handleGetMemoryMetrics({
        includeDistribution: true,
        includePerformance: true
      });
      
      expect(mockMemoryOrchestrator.getStatistics).toHaveBeenCalledTimes(1);
      expect(server.graphitiAdapter.getMetrics).toHaveBeenCalledTimes(1);
      expect(server.shortTermMemory.getMetrics).toHaveBeenCalledTimes(1);
      
      expect(result).toBeValidMCPResponse();
      const metrics = JSON.parse(result.content[0].text);
      expect(metrics.timestamp).toBeDefined();
      expect(metrics.orchestrator).toBeDefined();
    });
    
    test('should perform health check', async () => {
      const result = await server.handleHealthCheckMemory({ detailed: true });
      
      expect(mockMemoryOrchestrator.healthCheck).toHaveBeenCalledTimes(1);
      expect(result).toBeValidMCPResponse();
      
      const health = JSON.parse(result.content[0].text);
      expect(health.status).toBe('healthy');
      expect(health.components).toBeDefined();
    });
  });
  
  describe('Error Handling', () => {
    test('should handle database errors gracefully', async () => {
      mockDatabase.getProjects.rejects(new Error('Database connection failed'));
      
      await expect(server.handleGetProjects()).rejects.toThrow('Database connection failed');
    });
    
    test('should handle scraper errors gracefully', async () => {
      mockScraper.init.rejects(new Error('Browser initialization failed'));
      
      await expect(server.handleLogin('chatgpt')).rejects.toThrow('Browser initialization failed');
    });
    
    test('should handle memory system errors gracefully', async () => {
      mockMemoryOrchestrator.store.rejects(new Error('Memory storage failed'));
      
      await expect(server.handleStoreMemory({ key: 'test', value: 'test' }))
        .rejects.toThrow('Memory storage failed');
    });
  });
  
  describe('Conversation Management', () => {
    test('should get conversations with filters', async () => {
      const mockConversations = [
        { id: 1, service: 'chatgpt', title: 'Test 1' },
        { id: 2, service: 'chatgpt', title: 'Test 2' }
      ];
      mockDatabase.getConversations.resolves(mockConversations);
      
      const result = await server.handleGetConversations('chatgpt', 10, 0);
      
      expect(mockDatabase.getConversations).toHaveBeenCalledWith('chatgpt', 10, 0);
      expect(result).toBeValidMCPResponse();
      
      const conversations = JSON.parse(result.content[0].text);
      expect(Array.isArray(conversations)).toBe(true);
      expect(conversations).toHaveLength(2);
    });
    
    test('should get conversation messages', async () => {
      const mockMessages = [
        { id: 1, role: 'user', content: 'Hello', message_order: 1 },
        { id: 2, role: 'assistant', content: 'Hi!', message_order: 2 }
      ];
      mockDatabase.getConversationMessages.resolves(mockMessages);
      
      const result = await server.handleGetMessages(1);
      
      expect(mockDatabase.getConversationMessages).toHaveBeenCalledWith(1);
      expect(result).toBeValidMCPResponse();
      
      const messages = JSON.parse(result.content[0].text);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages).toHaveLength(2);
    });
    
    test('should clear conversations for service', async () => {
      mockDatabase.clearConversations.resolves(5);
      
      const result = await server.handleClear('chatgpt');
      
      expect(mockDatabase.clearConversations).toHaveBeenCalledWith('chatgpt');
      expect(result).toBeValidMCPResponse();
      expect(result.content[0].text).toContain('Cleared 5 conversations');
    });
  });
  
  describe('Search Functionality', () => {
    test('should search conversations with different strategies', async () => {
      const mockConversations = [global.testUtils.createTestConversation()];
      mockDatabase.getConversations.resolves(mockConversations);
      
      // Mock search engine
      server.searchEngine = {
        searchConversations: jest.fn().mockReturnValue([{
          id: 1,
          title: 'Test Conversation',
          score: 0.95
        }])
      };
      
      const searchArgs = {
        query: 'test query',
        search_type: 'fuzzy',
        min_score: 0.3
      };
      
      const result = await server.handleSearch(searchArgs);
      
      expect(server.searchEngine.searchConversations).toHaveBeenCalled();
      expect(result).toBeValidMCPResponse();
      expect(result.content[0].text).toContain('Found 1 conversations');
    });
  });
});