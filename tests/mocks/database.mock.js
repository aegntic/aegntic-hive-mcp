/**
 * Database Mock for London School TDD
 * All database interactions are mocked for isolated unit testing.
 *
 * The public methods are jest doubles (see tests/mocks/stub-factory.js) so
 * suites can both configure behaviour (.resolves/.rejects) and assert calls
 * with jest matchers, mirroring how server.js consumes the Database class.
 */

const { createStub } = require('./stub-factory');

class MockDatabase {
  constructor() {
    // Internal sqlite3 handle (server.js reaches it as instance.db.db)
    this.db = {
      run: createStub().resolves({ lastID: 1, changes: 1 }),
      get: createStub().resolves(null),
      all: createStub().resolves([]),
      prepare: createStub(),
      close: createStub().resolves()
    };

    // Default mock responses
    this.setupDefaultBehaviors();
  }

  setupDefaultBehaviors() {
    // Mock conversation operations
    this.saveConversation = createStub().resolves(1);
    this.getConversations = createStub().resolves([]);
    this.getConversationMessages = createStub().resolves([]);
    this.saveMessage = createStub().resolves(1);
    this.clearConversations = createStub().resolves(0);
    this.searchConversations = createStub().resolves([]);

    // Mock project operations
    this.saveProject = createStub().resolves(1);
    this.getProjects = createStub().resolves([]);
    this.getProject = createStub().resolves(null);

    // Mock artifact operations
    this.saveArtifact = createStub().resolves(1);
    this.getArtifacts = createStub().resolves([]);
    this.getArtifactVersions = createStub().resolves([]);
    this.getLatestArtifactVersion = createStub().resolves(0);

    // Mock lifecycle
    this.close = createStub().resolves();
  }

  // Test utilities
  reset() {
    Object.values(this).forEach(stub => {
      if (typeof stub.reset === 'function') {
        stub.reset();
      }
    });
    this.setupDefaultBehaviors();
  }

  // Configure specific responses for tests
  configureResponse(method, response) {
    this[method].resolves(response);
  }

  configureError(method, error) {
    this[method].rejects(error);
  }
}

module.exports = MockDatabase;
