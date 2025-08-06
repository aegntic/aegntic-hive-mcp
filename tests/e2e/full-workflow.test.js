/**
 * End-to-End Tests for Complete Workflows
 * Tests realistic user scenarios from start to finish
 */

const { jest } = require('@jest/globals');
const mockFs = require('mock-fs');
const path = require('path');

// Import server without extensive mocking for E2E tests
const AIConversationsMCP = require('../../server.js');

describe('End-to-End Workflow Tests', () => {
  let server;
  
  beforeAll(async () => {
    // Use in-memory database for E2E tests
    process.env.DB_PATH = ':memory:';
    
    // Create server instance
    server = new AIConversationsMCP();
    
    // Wait for initialization
    await global.testUtils.waitFor(500);
  });
  
  afterAll(async () => {
    if (server) {
      await server.stop();
    }
    mockFs.restore();
  });
  
  beforeEach(() => {
    mockFs.restore();
  });
  
  describe('Complete Project Lifecycle', () => {
    test('should handle full project creation, development, and export workflow', async () => {
      // Step 1: Create a new project
      const projectResult = await server.handleCreateProject(
        'E2E Test Project',
        'Complete end-to-end test project',
        'Build a simple web application with authentication'
      );
      
      expect(projectResult).toBeValidMCPResponse();
      const projectId = parseInt(projectResult.content[0].text.match(/ID: (\\d+)/)[1]);
      
      // Step 2: Save multiple artifacts for the project
      const artifacts = [
        {
          name: 'package.json',
          type: 'config',
          content: JSON.stringify({
            name: 'e2e-test-app',
            version: '1.0.0',
            dependencies: {
              'express': '^4.18.0'
            }
          }, null, 2),
          metadata: JSON.stringify({ language: 'json' })
        },
        {
          name: 'server.js',
          type: 'code',
          content: `const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`,
          metadata: JSON.stringify({ language: 'javascript', entryPoint: true })
        },
        {
          name: 'auth.js',
          type: 'code',
          content: `class AuthService {
  constructor() {
    this.users = new Map();
  }
  
  register(username, password) {
    if (this.users.has(username)) {
      throw new Error('User already exists');
    }
    this.users.set(username, { password, createdAt: new Date() });
    return { success: true, message: 'User registered successfully' };
  }
  
  login(username, password) {
    const user = this.users.get(username);
    if (!user || user.password !== password) {
      throw new Error('Invalid credentials');
    }
    return { success: true, token: 'mock-jwt-token' };
  }
}

module.exports = AuthService;`,
          metadata: JSON.stringify({ language: 'javascript', module: true })
        },
        {
          name: 'README.md',
          type: 'documentation',
          content: `# E2E Test Project

A simple web application built during end-to-end testing.

## Features
- Express.js server
- Basic authentication
- RESTful API

## Getting Started
1. npm install
2. node server.js
3. Visit http://localhost:3000`,
          metadata: JSON.stringify({ format: 'markdown' })
        }
      ];
      
      // Save all artifacts
      const artifactResults = [];
      for (const artifact of artifacts) {
        const result = await server.handleSaveArtifact(
          projectId,
          artifact.name,
          artifact.type,
          artifact.content,
          artifact.metadata
        );
        artifactResults.push(result);
      }
      
      // Verify all artifacts were saved
      artifactResults.forEach((result, index) => {
        expect(result).toBeValidMCPResponse();
        expect(result.content[0].text).toContain('version: 1');
      });
      
      // Step 3: Update an artifact (create version 2)
      const updatedServerCode = `const express = require('express');
const AuthService = require('./auth');

const app = express();
const auth = new AuthService();

app.use(express.json());

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello World!', 
    version: '2.0',
    timestamp: new Date().toISOString()
  });
});

app.post('/auth/register', (req, res) => {
  try {
    const result = auth.register(req.body.username, req.body.password);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/auth/login', (req, res) => {
  try {
    const result = auth.login(req.body.username, req.body.password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server v2.0 running on port 3000');
});`;
      
      const v2Result = await server.handleSaveArtifact(
        projectId,
        'server.js',
        'code',
        updatedServerCode,
        JSON.stringify({ language: 'javascript', version: '2.0', entryPoint: true })
      );
      
      expect(v2Result).toBeValidMCPResponse();
      expect(v2Result.content[0].text).toContain('version: 2');
      
      // Step 4: Verify versioning works
      const versionsResult = await server.handleGetArtifactVersions(projectId, 'server.js');
      expect(versionsResult).toBeValidMCPResponse();
      
      const versions = JSON.parse(versionsResult.content[0].text);
      expect(versions.length).toBe(2);
      expect(versions.some(v => v.version === 1)).toBe(true);
      expect(versions.some(v => v.version === 2)).toBe(true);
      
      // Step 5: Mock file system for export
      const exportPath = '/tmp/e2e-test-export.json';
      mockFs({
        '/tmp': {}
      });
      
      // Step 6: Export project structure
      const exportResult = await server.handleExportProjectStructure(projectId, exportPath);
      expect(exportResult).toBeValidMCPResponse();
      expect(exportResult.content[0].text).toContain(`Project structure exported to ${exportPath}`);
      
      // Step 7: Verify export file contains expected data
      const fs = require('fs');
      const exportedData = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      
      expect(exportedData.project).toBeDefined();
      expect(exportedData.project.id).toBe(projectId);
      expect(exportedData.project.name).toBe('E2E Test Project');
      
      expect(exportedData.artifacts).toBeDefined();
      expect(Array.isArray(exportedData.artifacts)).toBe(true);
      expect(exportedData.artifacts.length).toBeGreaterThanOrEqual(4);
      
      // Verify server.js has both versions
      const serverArtifacts = exportedData.artifacts.filter(a => a.name === 'server.js');
      expect(serverArtifacts.length).toBe(2);
      expect(serverArtifacts.some(a => a.version === 1)).toBe(true);
      expect(serverArtifacts.some(a => a.version === 2)).toBe(true);
    });
    
    test('should handle project import and reconstruction', async () => {
      // Step 1: Create mock export file
      const importPath = '/tmp/e2e-import-test.json';
      const mockProjectData = {
        project: {
          id: 999, // This will be ignored during import
          name: 'Imported Test Project',
          description: 'A project imported during E2E testing',
          instructions: 'Follow the imported instructions'
        },
        conversations: [], // No conversations for this test
        artifacts: [
          {
            project_id: 999,
            name: 'imported.js',
            type: 'code',
            content: 'console.log(\"This was imported\");',
            metadata: '{"imported": true}',
            version: 1
          }
        ]
      };
      
      mockFs({
        '/tmp': {
          'e2e-import-test.json': JSON.stringify(mockProjectData, null, 2)
        }
      });
      
      // Step 2: Import project
      const importResult = await server.handleImportProjectStructure(importPath);
      expect(importResult).toBeValidMCPResponse();
      expect(importResult.content[0].text).toContain(`Project structure imported from ${importPath}`);
      
      // Step 3: Verify imported project exists
      const projectsResult = await server.handleGetProjects();
      expect(projectsResult).toBeValidMCPResponse();
      
      const projects = JSON.parse(projectsResult.content[0].text);
      const importedProject = projects.find(p => p.name === 'Imported Test Project');
      expect(importedProject).toBeDefined();
      expect(importedProject.description).toBe('A project imported during E2E testing');
      
      // Step 4: Verify imported artifacts
      const artifactsResult = await server.handleGetArtifacts(importedProject.id);
      expect(artifactsResult).toBeValidMCPResponse();
      
      const artifacts = JSON.parse(artifactsResult.content[0].text);
      expect(artifacts.length).toBe(1);
      expect(artifacts[0].name).toBe('imported.js');
      expect(artifacts[0].content).toBe('console.log(\"This was imported\");');
    });
  });
  
  describe('Memory-Driven Development Workflow', () => {
    test('should support development workflow with persistent memory', async () => {
      if (!server.memoryInitialized) {
        console.warn('Memory system not initialized, skipping memory workflow test');
        return;
      }
      
      // Step 1: Store development context in memory
      const contextResult = await server.handleStoreMemory({
        key: 'e2e-dev-context',
        value: 'Working on authentication system for e-commerce platform. Need to implement JWT tokens with refresh capability.',
        importance: 0.8,
        tags: ['development', 'authentication', 'jwt', 'e-commerce'],
        context: {
          phase: 'implementation',
          priority: 'high',
          deadline: '2024-02-15'
        }
      });
      
      expect(contextResult).toBeValidMCPResponse();
      
      // Step 2: Store technical decisions
      const techDecisionResult = await server.handleStoreMemory({
        key: 'jwt-implementation-decision',
        value: 'Decided to use jsonwebtoken library with 15-minute access tokens and 7-day refresh tokens. Store refresh tokens in Redis for revocation capability.',
        importance: 0.9,
        tags: ['technical-decision', 'jwt', 'redis', 'security'],
        context: {
          decision_type: 'architecture',
          alternatives_considered: ['passport-jwt', 'custom-implementation'],
          rationale: 'Better security and established ecosystem'
        }
      });
      
      expect(techDecisionResult).toBeValidMCPResponse();
      
      // Step 3: Store code patterns
      const patternResult = await server.handleStoreMemory({
        key: 'jwt-middleware-pattern',
        value: `const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};`,
        importance: 0.7,
        tags: ['code-pattern', 'middleware', 'jwt', 'express'],
        context: {
          pattern_type: 'middleware',
          framework: 'express',
          security_level: 'high'
        }
      });
      
      expect(patternResult).toBeValidMCPResponse();
      
      // Step 4: Retrieve development context later
      const retrieveResult = await server.handleRetrieveMemory({
        query: 'authentication jwt implementation',
        strategy: 'fused',
        maxResults: 10,
        temporalWeight: true
      });
      
      expect(retrieveResult).toBeValidMCPResponse();
      
      const retrieveResponse = JSON.parse(retrieveResult.content[0].text);
      expect(retrieveResponse.success).toBe(true);
      expect(Array.isArray(retrieveResponse.results)).toBe(true);
      expect(retrieveResponse.results.length).toBeGreaterThan(0);
      
      // Step 5: Search for specific patterns
      const searchResult = await server.handleSearchMemory({
        query: 'jwt middleware express',
        searchType: 'semantic',
        includeRelationships: true
      });
      
      expect(searchResult).toBeValidMCPResponse();
      
      const searchResponse = JSON.parse(searchResult.content[0].text);
      expect(searchResponse.success).toBe(true);
      
      // Step 6: Promote important decision to strategic memory
      const promoteResult = await server.handlePromoteMemory({
        key: 'jwt-implementation-decision',
        reason: 'Critical architectural decision that affects entire authentication system',
        enhancedImportance: 0.95
      });
      
      expect(promoteResult).toBeValidMCPResponse();
      
      const promoteResponse = JSON.parse(promoteResult.content[0].text);
      expect(promoteResponse.success).toBe(true);
    });
  });
  
  describe('Conversation Analysis Workflow', () => {
    test('should handle complete conversation scraping and analysis', async () => {
      // Step 1: Create project for conversations
      const projectResult = await server.handleCreateProject(
        'Conversation Analysis Project',
        'Analyzing AI conversations for insights',
        'Extract patterns and improve prompting strategies'
      );
      
      const projectId = parseInt(projectResult.content[0].text.match(/ID: (\\d+)/)[1]);
      
      // Step 2: Simulate scraped conversations (since we can't actually scrape in tests)
      const testConversations = [
        {
          service: 'chatgpt',
          conversation_id: 'conv-analysis-1',
          title: 'Code Review Discussion',
          messages: [
            {
              role: 'user',
              content: 'Please review this JavaScript function for security vulnerabilities',
              order: 1
            },
            {
              role: 'assistant',
              content: 'I found several security issues: 1) SQL injection vulnerability in line 15, 2) XSS vulnerability in line 23, 3) Missing input validation',
              order: 2
            },
            {
              role: 'user',
              content: 'How should I fix the SQL injection issue?',
              order: 3
            },
            {
              role: 'assistant',
              content: 'Use parameterized queries instead of string concatenation. Here\\'s an example using prepared statements...',
              order: 4
            }
          ]
        },
        {
          service: 'claude',
          conversation_id: 'conv-analysis-2',
          title: 'Architecture Planning',
          messages: [
            {
              role: 'user',
              content: 'I need to design a microservices architecture for an e-commerce platform',
              order: 1
            },
            {
              role: 'assistant',
              content: 'For e-commerce microservices, I recommend these core services: User Management, Product Catalog, Order Processing, Payment Gateway, Inventory Management',
              order: 2
            }
          ]
        }
      ];
      
      // Step 3: Save conversations to database
      for (const conv of testConversations) {
        const convId = await server.db.saveConversation(
          conv.service,
          projectId,
          conv.conversation_id,
          conv.title,
          new Date().toISOString(),
          new Date().toISOString(),
          `https://${conv.service}.com/c/${conv.conversation_id}`
        );
        
        for (const message of conv.messages) {
          await server.db.saveMessage(
            convId,
            conv.service,
            message.role,
            message.content,
            new Date().toISOString(),
            message.order
          );
        }
      }
      
      // Step 4: Search conversations
      const searchResult = await server.handleSearch({
        query: 'security vulnerabilities',
        search_type: 'fuzzy',
        min_score: 0.1,
        service: 'chatgpt'
      });
      
      expect(searchResult).toBeValidMCPResponse();
      expect(searchResult.content[0].text).toContain('security');
      
      // Step 5: Analyze conversation content
      const conversationsResult = await server.handleGetConversations('chatgpt', 10, 0);
      expect(conversationsResult).toBeValidMCPResponse();
      
      const conversations = JSON.parse(conversationsResult.content[0].text);
      expect(Array.isArray(conversations)).toBe(true);
      expect(conversations.length).toBeGreaterThan(0);
      
      // Step 6: Get conversation messages
      const firstConv = conversations[0];
      const messagesResult = await server.handleGetMessages(firstConv.id);
      expect(messagesResult).toBeValidMCPResponse();
      
      const messages = JSON.parse(messagesResult.content[0].text);
      expect(Array.isArray(messages)).toBe(true);
      expect(messages.length).toBeGreaterThan(0);
      
      // Step 7: Export conversations for analysis
      mockFs({
        '/tmp': {}
      });
      
      const exportPath = '/tmp/conversations-export.json';
      const exportResult = await server.handleExportToJSON('chatgpt', exportPath);
      expect(exportResult).toBeValidMCPResponse();
      
      // Step 8: Verify export contains conversation data
      const fs = require('fs');
      const exportedConversations = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      expect(Array.isArray(exportedConversations)).toBe(true);
      expect(exportedConversations.length).toBeGreaterThan(0);
    });
  });
  
  describe('Error Recovery Workflows', () => {
    test('should handle and recover from various error conditions', async () => {
      // Step 1: Test project creation with invalid data
      await expect(server.handleCreateProject('', '', ''))
        .resolves.toBeValidMCPResponse(); // Should still work with empty strings
      
      // Step 2: Test artifact save with non-existent project
      await expect(server.handleSaveArtifact(
        99999, // Non-existent project
        'test.js',
        'code',
        'console.log("test");',
        '{}'
      )).resolves.toBeValidMCPResponse(); // Database should handle this
      
      // Step 3: Test memory operations with invalid data
      if (server.memoryInitialized) {
        await expect(server.handleStoreMemory({
          key: '', // Invalid key
          value: 'test'
        })).resolves.toBeValidMCPResponse(); // Should handle gracefully
        
        await expect(server.handleRetrieveMemory({
          query: '', // Empty query
          maxResults: -1 // Invalid limit
        })).resolves.toBeValidMCPResponse(); // Should use defaults
      }
      
      // Step 4: Test file operations with invalid paths
      mockFs({
        '/tmp': {}
      });
      
      await expect(server.handleExportProjectStructure(1, '/invalid/path/export.json'))
        .rejects.toThrow(); // Should fail appropriately
      
      await expect(server.handleImportProjectStructure('/nonexistent/file.json'))
        .rejects.toThrow(); // Should fail appropriately
    });
  });
  
  describe('Performance Under Load', () => {
    test('should handle multiple concurrent workflows', async () => {
      const workflows = [];
      
      // Create 5 concurrent project workflows
      for (let i = 0; i < 5; i++) {
        const workflow = async () => {
          // Create project
          const projectResult = await server.handleCreateProject(
            `Concurrent Project ${i}`,
            `Project ${i} for load testing`,
            `Instructions for project ${i}`
          );
          
          const projectId = parseInt(projectResult.content[0].text.match(/ID: (\\d+)/)[1]);
          
          // Add artifacts
          await server.handleSaveArtifact(
            projectId,
            `file${i}.js`,
            'code',
            `console.log('File ${i}');`,
            `{"index": ${i}}`
          );
          
          // Store memory if available
          if (server.memoryInitialized) {
            await server.handleStoreMemory({
              key: `concurrent-workflow-${i}`,
              value: `Data for workflow ${i}`,
              importance: 0.5,
              tags: ['concurrent', `workflow-${i}`]
            });
          }
          
          return projectId;
        };
        
        workflows.push(workflow());
      }
      
      // Wait for all workflows to complete
      const results = await Promise.all(workflows);
      
      // All should complete successfully
      expect(results.length).toBe(5);
      results.forEach(projectId => {
        expect(typeof projectId).toBe('number');
        expect(projectId).toBeGreaterThan(0);
      });
      
      // Verify all projects exist
      const projectsResult = await server.handleGetProjects();
      const projects = JSON.parse(projectsResult.content[0].text);
      
      for (let i = 0; i < 5; i++) {
        const project = projects.find(p => p.name === `Concurrent Project ${i}`);
        expect(project).toBeDefined();
      }
    });
  });
});