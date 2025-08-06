/**
 * Unit Tests for Database Module (London School TDD)
 * Tests database operations through mocked SQLite interactions
 */

const { jest } = require('@jest/globals');

// Mock sqlite3 before importing Database
jest.mock('sqlite3', () => ({
  Database: jest.fn().mockImplementation(() => ({
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn(),
    prepare: jest.fn(),
    close: jest.fn()
  })),
  OPEN_READWRITE: 'OPEN_READWRITE',
  OPEN_CREATE: 'OPEN_CREATE'
}));

const Database = require('../../database.js');
const sqlite3 = require('sqlite3');

describe('Database Module', () => {
  let database;
  let mockSqliteDb;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock SQLite database
    mockSqliteDb = {
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(),
      prepare: jest.fn(),
      close: jest.fn()
    };
    
    // Mock SQLite constructor to return our mock
    sqlite3.Database.mockImplementation(() => mockSqliteDb);
    
    // Create database instance
    database = new Database();
  });
  
  describe('Constructor and Initialization', () => {
    test('should create SQLite database connection', () => {
      expect(sqlite3.Database).toHaveBeenCalledWith(
        'conversations.db',
        sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
        expect.any(Function)
      );
      expect(database.db).toBe(mockSqliteDb);
    });
    
    test('should call init method during construction', () => {
      // The constructor should have called init(), which calls createTables()
      expect(mockSqliteDb.run).toHaveBeenCalled();
    });
  });
  
  describe('Table Creation', () => {
    test('should create conversations table with correct schema', () => {
      database.createTables();
      
      // Check if conversations table creation was called
      const conversationsTableCall = mockSqliteDb.run.mock.calls.find(call => 
        call[0].includes('CREATE TABLE IF NOT EXISTS conversations')
      );
      
      expect(conversationsTableCall).toBeDefined();
      expect(conversationsTableCall[0]).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT');
      expect(conversationsTableCall[0]).toContain('service TEXT NOT NULL');
      expect(conversationsTableCall[0]).toContain('project_id INTEGER');
      expect(conversationsTableCall[0]).toContain('conversation_id TEXT NOT NULL');
      expect(conversationsTableCall[0]).toContain('title TEXT');
      expect(conversationsTableCall[0]).toContain('FOREIGN KEY (project_id) REFERENCES projects(id)');
    });
    
    test('should create messages table with correct schema', () => {
      database.createTables();
      
      const messagesTableCall = mockSqliteDb.run.mock.calls.find(call => 
        call[0].includes('CREATE TABLE IF NOT EXISTS messages')
      );
      
      expect(messagesTableCall).toBeDefined();
      expect(messagesTableCall[0]).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT');
      expect(messagesTableCall[0]).toContain('conversation_id INTEGER');
      expect(messagesTableCall[0]).toContain('role TEXT NOT NULL');
      expect(messagesTableCall[0]).toContain('content TEXT NOT NULL');
      expect(messagesTableCall[0]).toContain('FOREIGN KEY (conversation_id) REFERENCES conversations(id)');
    });
    
    test('should create projects table with correct schema', () => {
      database.createTables();
      
      const projectsTableCall = mockSqliteDb.run.mock.calls.find(call => 
        call[0].includes('CREATE TABLE IF NOT EXISTS projects')
      );
      
      expect(projectsTableCall).toBeDefined();
      expect(projectsTableCall[0]).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT');
      expect(projectsTableCall[0]).toContain('name TEXT NOT NULL');
      expect(projectsTableCall[0]).toContain('description TEXT');
      expect(projectsTableCall[0]).toContain('instructions TEXT');
    });
    
    test('should create artifacts table with correct schema', () => {
      database.createTables();
      
      const artifactsTableCall = mockSqliteDb.run.mock.calls.find(call => 
        call[0].includes('CREATE TABLE IF NOT EXISTS artifacts')
      );
      
      expect(artifactsTableCall).toBeDefined();
      expect(artifactsTableCall[0]).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT');
      expect(artifactsTableCall[0]).toContain('project_id INTEGER');
      expect(artifactsTableCall[0]).toContain('name TEXT NOT NULL');
      expect(artifactsTableCall[0]).toContain('type TEXT NOT NULL');
      expect(artifactsTableCall[0]).toContain('version INTEGER NOT NULL');
      expect(artifactsTableCall[0]).toContain('FOREIGN KEY (project_id) REFERENCES projects(id)');
    });
  });
  
  describe('Conversation Operations', () => {
    test('should save conversation with correct parameters', async () => {
      // Mock successful database operation
      mockSqliteDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ lastID: 1, changes: 1 });
      });
      
      const result = await database.saveConversation(
        'chatgpt',
        1,
        'conv-123',
        'Test Conversation',
        '2024-01-01T00:00:00Z',
        '2024-01-01T00:00:00Z',
        'https://chatgpt.com/c/conv-123'
      );
      
      expect(mockSqliteDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO conversations'),
        ['chatgpt', 1, 'conv-123', 'Test Conversation', '2024-01-01T00:00:00Z', '2024-01-01T00:00:00Z', 'https://chatgpt.com/c/conv-123'],
        expect.any(Function)
      );
      expect(result).toBe(1);
    });
    
    test('should handle conversation save errors', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, callback) => {
        callback.call(null, new Error('Database error'));
      });
      
      await expect(database.saveConversation('chatgpt', 1, 'conv-123', 'Test', '', '', ''))
        .rejects.toThrow('Database error');
    });
    
    test('should get conversations with filters', async () => {
      const mockConversations = [
        { id: 1, service: 'chatgpt', title: 'Test 1' },
        { id: 2, service: 'chatgpt', title: 'Test 2' }
      ];
      
      mockSqliteDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockConversations);
      });
      
      const result = await database.getConversations('chatgpt', 10, 0);
      
      expect(mockSqliteDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM conversations'),
        ['chatgpt', 10, 0],
        expect.any(Function)
      );
      expect(result).toEqual(mockConversations);
    });
    
    test('should get all conversations when no service filter provided', async () => {
      const mockConversations = [
        { id: 1, service: 'chatgpt', title: 'Test 1' },
        { id: 2, service: 'grok', title: 'Test 2' }
      ];
      
      mockSqliteDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockConversations);
      });
      
      const result = await database.getConversations(null, 10, 0);
      
      expect(mockSqliteDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM conversations ORDER BY updated_at DESC LIMIT ? OFFSET ?'),
        [10, 0],
        expect.any(Function)
      );
      expect(result).toEqual(mockConversations);
    });
    
    test('should clear conversations for service', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ changes: 5 });
      });
      
      const result = await database.clearConversations('chatgpt');
      
      expect(mockSqliteDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM conversations WHERE service = ?'),
        ['chatgpt'],
        expect.any(Function)
      );
      expect(result).toBe(5);
    });
  });
  
  describe('Message Operations', () => {
    test('should save message with correct parameters', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ lastID: 1 });
      });
      
      const result = await database.saveMessage(
        1,
        'chatgpt',
        'user',
        'Hello world',
        '2024-01-01T00:00:00Z',
        1
      );
      
      expect(mockSqliteDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        [1, 'chatgpt', 'user', 'Hello world', '2024-01-01T00:00:00Z', 1],
        expect.any(Function)
      );
      expect(result).toBe(1);
    });
    
    test('should get conversation messages ordered by message_order', async () => {
      const mockMessages = [
        { id: 1, role: 'user', content: 'Hello', message_order: 1 },
        { id: 2, role: 'assistant', content: 'Hi!', message_order: 2 }
      ];
      
      mockSqliteDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockMessages);
      });
      
      const result = await database.getConversationMessages(1);
      
      expect(mockSqliteDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM messages WHERE conversation_id = ? ORDER BY message_order ASC'),
        [1],
        expect.any(Function)
      );
      expect(result).toEqual(mockMessages);
    });
  });
  
  describe('Project Operations', () => {
    test('should save project with correct parameters', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ lastID: 1 });
      });
      
      const result = await database.saveProject(
        'Test Project',
        'A test project',
        'Test instructions'
      );
      
      expect(mockSqliteDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO projects'),
        ['Test Project', 'A test project', 'Test instructions'],
        expect.any(Function)
      );
      expect(result).toBe(1);
    });
    
    test('should get all projects', async () => {
      const mockProjects = [
        { id: 1, name: 'Project 1', description: 'Desc 1' },
        { id: 2, name: 'Project 2', description: 'Desc 2' }
      ];
      
      mockSqliteDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockProjects);
      });
      
      const result = await database.getProjects();
      
      expect(mockSqliteDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM projects'),
        expect.any(Function)
      );
      expect(result).toEqual(mockProjects);
    });
    
    test('should get specific project by ID', async () => {
      const mockProject = { id: 1, name: 'Test Project', description: 'Test desc' };
      
      mockSqliteDb.get.mockImplementation((sql, params, callback) => {
        callback(null, mockProject);
      });
      
      const result = await database.getProject(1);
      
      expect(mockSqliteDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM projects WHERE id = ?'),
        [1],
        expect.any(Function)
      );
      expect(result).toEqual(mockProject);
    });
  });
  
  describe('Artifact Operations', () => {
    test('should save artifact with versioning', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, callback) => {
        callback.call({ lastID: 1 });
      });
      
      const result = await database.saveArtifact(
        1,
        'test.js',
        'code',
        'console.log("test");',
        '{"lang": "javascript"}',
        1
      );
      
      expect(mockSqliteDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO artifacts'),
        [1, 'test.js', 'code', 'console.log("test");', '{"lang": "javascript"}', 1],
        expect.any(Function)
      );
      expect(result).toBe(1);
    });
    
    test('should get artifacts for project', async () => {
      const mockArtifacts = [
        { id: 1, name: 'test.js', type: 'code', version: 1 },
        { id: 2, name: 'readme.md', type: 'document', version: 1 }
      ];
      
      mockSqliteDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockArtifacts);
      });
      
      const result = await database.getArtifacts(1);
      
      expect(mockSqliteDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM artifacts WHERE project_id = ?'),
        [1],
        expect.any(Function)
      );
      expect(result).toEqual(mockArtifacts);
    });
    
    test('should get artifact versions', async () => {
      const mockVersions = [
        { id: 1, version: 1, content: 'v1 content' },
        { id: 2, version: 2, content: 'v2 content' }
      ];
      
      mockSqliteDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockVersions);
      });
      
      const result = await database.getArtifactVersions(1, 'test.js');
      
      expect(mockSqliteDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM artifacts WHERE project_id = ? AND name = ?'),
        [1, 'test.js'],
        expect.any(Function)
      );
      expect(result).toEqual(mockVersions);
    });
    
    test('should get latest artifact version number', async () => {
      const mockResult = { version: 3 };
      
      mockSqliteDb.get.mockImplementation((sql, params, callback) => {
        callback(null, mockResult);
      });
      
      const result = await database.getLatestArtifactVersion(1, 'test.js');
      
      expect(mockSqliteDb.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT MAX(version) as version FROM artifacts'),
        [1, 'test.js'],
        expect.any(Function)
      );
      expect(result).toBe(3);
    });
    
    test('should return 0 when no artifacts exist', async () => {
      mockSqliteDb.get.mockImplementation((sql, params, callback) => {
        callback(null, null);
      });
      
      const result = await database.getLatestArtifactVersion(1, 'nonexistent.js');
      
      expect(result).toBe(0);
    });
  });
  
  describe('Search Operations', () => {
    test('should search conversations by content', async () => {
      const mockResults = [
        { id: 1, service: 'chatgpt', title: 'Test conversation', score: 0.95 }
      ];
      
      mockSqliteDb.all.mockImplementation((sql, params, callback) => {
        callback(null, mockResults);
      });
      
      const result = await database.searchConversations('test query');
      
      expect(mockSqliteDb.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT c.*, m.content'),
        expect.arrayContaining(['%test query%']),
        expect.any(Function)
      );
      expect(result).toEqual(mockResults);
    });
  });
  
  describe('Database Lifecycle', () => {
    test('should close database connection', () => {
      database.close();
      expect(mockSqliteDb.close).toHaveBeenCalledTimes(1);
    });
    
    test('should handle connection errors during initialization', () => {
      // Test error callback during database creation
      const errorCallback = sqlite3.Database.mock.calls[0][2];
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      errorCallback(new Error('Failed to open database'));
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error opening database:', expect.any(Error));
      
      consoleErrorSpy.mockRestore();
    });
  });
  
  describe('Error Handling', () => {
    test('should handle database operation errors gracefully', async () => {
      mockSqliteDb.run.mockImplementation((sql, params, callback) => {
        callback.call(null, new Error('SQL constraint violation'));
      });
      
      await expect(database.saveConversation('test', 1, 'id', 'title', '', '', ''))
        .rejects.toThrow('SQL constraint violation');
    });
    
    test('should handle database query errors gracefully', async () => {
      mockSqliteDb.all.mockImplementation((sql, params, callback) => {
        callback(new Error('SQL syntax error'));
      });
      
      await expect(database.getConversations()).rejects.toThrow('SQL syntax error');
    });
  });
});