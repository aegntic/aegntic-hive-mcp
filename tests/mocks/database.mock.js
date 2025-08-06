/**
 * Database Mock for London School TDD
 * All database interactions are mocked for isolated unit testing
 */

const sinon = require('sinon');

class MockDatabase {
  constructor() {
    // Mock database connection
    this.db = {
      run: sinon.stub(),
      get: sinon.stub(),
      all: sinon.stub(),
      prepare: sinon.stub(),
      close: sinon.stub()
    };
    
    // Default mock responses
    this.setupDefaultBehaviors();
  }
  
  setupDefaultBehaviors() {
    // Mock successful operations
    this.db.run.resolves({ lastID: 1, changes: 1 });
    this.db.get.resolves(null);
    this.db.all.resolves([]);
    
    // Mock prepared statements
    const mockStatement = {
      run: sinon.stub().resolves({ lastID: 1, changes: 1 }),
      get: sinon.stub().resolves(null),
      all: sinon.stub().resolves([]),
      finalize: sinon.stub().resolves()
    };
    this.db.prepare.returns(mockStatement);
  }
  
  // Mock conversation operations
  async saveConversation(service, projectId, conversationId, title, createdAt, updatedAt, url) {
    return this.db.run.resolves({ lastID: 1 });
  }
  
  async getConversations(service = null, limit = 50, offset = 0) {
    const mockConversations = [
      {
        id: 1,
        service: 'test',
        conversation_id: 'test-123',
        title: 'Test Conversation',
        project_id: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        url: 'https://test.com/conv/123'
      }
    ];
    return this.db.all.resolves(mockConversations);
  }
  
  async getConversationMessages(conversationId) {
    const mockMessages = [
      {
        id: 1,
        conversation_id: conversationId,
        service: 'test',
        role: 'user',
        content: 'Hello',
        timestamp: new Date().toISOString(),
        message_order: 1
      },
      {
        id: 2,
        conversation_id: conversationId,
        service: 'test',
        role: 'assistant',
        content: 'Hi there!',
        timestamp: new Date().toISOString(),
        message_order: 2
      }
    ];
    return this.db.all.resolves(mockMessages);
  }
  
  async saveMessage(conversationId, service, role, content, timestamp, order) {
    return this.db.run.resolves({ lastID: 1 });
  }
  
  async clearConversations(service) {
    return this.db.run.resolves({ changes: 5 });
  }
  
  async searchConversations(query) {
    const mockResults = [
      {
        id: 1,
        service: 'test',
        title: 'Test Conversation',
        score: 0.95
      }
    ];
    return this.db.all.resolves(mockResults);
  }
  
  // Mock project operations
  async saveProject(name, description, instructions) {
    return this.db.run.resolves({ lastID: 1 });
  }
  
  async getProjects() {
    const mockProjects = [
      {
        id: 1,
        name: 'Test Project',
        description: 'A test project',
        instructions: 'Test instructions',
        created_at: new Date().toISOString()
      }
    ];
    return this.db.all.resolves(mockProjects);
  }
  
  async getProject(projectId) {
    return this.db.get.resolves({
      id: projectId,
      name: 'Test Project',
      description: 'A test project',
      instructions: 'Test instructions',
      created_at: new Date().toISOString()
    });
  }
  
  // Mock artifact operations
  async saveArtifact(projectId, name, type, content, metadata, version) {
    return this.db.run.resolves({ lastID: 1 });
  }
  
  async getArtifacts(projectId) {
    const mockArtifacts = [
      {
        id: 1,
        project_id: projectId,
        name: 'test.js',
        type: 'code',
        content: 'console.log("test");',
        metadata: '{}',
        version: 1,
        created_at: new Date().toISOString()
      }
    ];
    return this.db.all.resolves(mockArtifacts);
  }
  
  async getArtifactVersions(projectId, artifactName) {
    const mockVersions = [
      {
        id: 1,
        version: 1,
        content: 'console.log("test v1");',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        version: 2,
        content: 'console.log("test v2");',
        created_at: new Date().toISOString()
      }
    ];
    return this.db.all.resolves(mockVersions);
  }
  
  async getLatestArtifactVersion(projectId, artifactName) {
    return this.db.get.resolves({ version: 1 }) || { version: 0 };
  }
  
  // Mock database lifecycle
  close() {
    return this.db.close();
  }
  
  // Test utilities
  reset() {
    this.db.run.reset();
    this.db.get.reset();
    this.db.all.reset();
    this.db.prepare.reset();
    this.db.close.reset();
    this.setupDefaultBehaviors();
  }
  
  // Configure specific responses for tests
  configureResponse(method, response) {
    this.db[method].resolves(response);
  }
  
  configureError(method, error) {
    this.db[method].rejects(error);
  }
}

module.exports = MockDatabase;