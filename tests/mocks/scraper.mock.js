/**
 * Scraper Mock for London School TDD
 * Mocks web scraping operations for isolated testing
 */

const sinon = require('sinon');

class MockConversationScraper {
  constructor() {
    this.browser = null;
    this.pages = new Map();
    this.sessions = new Map();
    
    // Setup method stubs
    this.init = sinon.stub();
    this.close = sinon.stub();
    this.loginToService = sinon.stub();
    this.scrapeAll = sinon.stub();
    this.scrapeChatgpt = sinon.stub();
    this.scrapeGrok = sinon.stub();
    this.scrapeGemini = sinon.stub();
    this.scrapeClaude = sinon.stub();
    this.loadSessions = sinon.stub();
    this.saveSession = sinon.stub();
    
    this.setupDefaultBehaviors();
  }
  
  setupDefaultBehaviors() {
    // Mock initialization
    this.init.resolves();
    this.close.resolves();
    
    // Mock login
    this.loginToService.resolves();
    
    // Mock session management
    this.loadSessions.returns();
    this.saveSession.returns();
    
    // Mock scraping operations
    const mockConversations = [
      {
        id: 'conv-1',
        title: 'Test Conversation 1',
        url: 'https://chatgpt.com/c/conv-1',
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
        ]
      },
      {
        id: 'conv-2',
        title: 'Test Conversation 2',
        url: 'https://chatgpt.com/c/conv-2',
        messages: [
          {
            role: 'user',
            content: 'How are you?',
            order: 1
          },
          {
            role: 'assistant',
            content: 'I am doing well, thank you!',
            order: 2
          }
        ]
      }
    ];
    
    this.scrapeChatgpt.resolves(mockConversations);
    this.scrapeGrok.resolves(mockConversations.map(c => ({ ...c, id: c.id.replace('conv', 'grok') })));
    this.scrapeGemini.resolves(mockConversations.map(c => ({ ...c, id: c.id.replace('conv', 'gemini') })));
    this.scrapeClaude.resolves(mockConversations.map(c => ({ ...c, id: c.id.replace('conv', 'claude') })));
    
    this.scrapeAll.resolves({
      chatgpt: mockConversations,
      grok: mockConversations.map(c => ({ ...c, id: c.id.replace('conv', 'grok') })),
      gemini: mockConversations.map(c => ({ ...c, id: c.id.replace('conv', 'gemini') })),
      claude: mockConversations.map(c => ({ ...c, id: c.id.replace('conv', 'claude') }))
    });
  }
  
  // Mock browser operations
  async createPage(url) {
    const mockPage = {
      goto: sinon.stub().resolves(),
      waitForSelector: sinon.stub().resolves(),
      click: sinon.stub().resolves(),
      type: sinon.stub().resolves(),
      evaluate: sinon.stub().resolves([]),
      $: sinon.stub().resolves(null),
      $$: sinon.stub().resolves([]),
      close: sinon.stub().resolves()
    };
    
    this.pages.set(url, mockPage);
    return mockPage;
  }
  
  // Mock authentication
  async authenticateService(service, credentials) {
    return { success: true, sessionId: `${service}-session-123` };
  }
  
  // Mock data extraction
  async extractConversationData(page, service) {
    return this.setupDefaultBehaviors()[`scrape${service.charAt(0).toUpperCase() + service.slice(1)}`]();
  }
  
  // Test utilities
  reset() {
    this.init.reset();
    this.close.reset();
    this.loginToService.reset();
    this.scrapeAll.reset();
    this.scrapeChatgpt.reset();
    this.scrapeGrok.reset();
    this.scrapeGemini.reset();
    this.scrapeClaude.reset();
    this.loadSessions.reset();
    this.saveSession.reset();
    
    this.pages.clear();
    this.sessions.clear();
    
    this.setupDefaultBehaviors();
  }
  
  // Configure specific responses for tests
  configureServiceResponse(service, response) {
    const method = `scrape${service.charAt(0).toUpperCase() + service.slice(1)}`;
    if (this[method]) {
      this[method].resolves(response);
    }
  }
  
  configureError(method, error) {
    if (this[method]) {
      this[method].rejects(error);
    }
  }
  
  // Simulate authentication failure
  simulateAuthFailure(service) {
    this.loginToService.withArgs(service).rejects(new Error(`Authentication failed for ${service}`));
  }
  
  // Simulate network timeout
  simulateTimeout(method) {
    if (this[method]) {
      this[method].rejects(new Error('Network timeout'));
    }
  }
  
  // Simulate rate limiting
  simulateRateLimit(service) {
    const method = `scrape${service.charAt(0).toUpperCase() + service.slice(1)}`;
    if (this[method]) {
      this[method].rejects(new Error('Rate limit exceeded'));
    }
  }
}

module.exports = MockConversationScraper;