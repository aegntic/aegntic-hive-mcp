#!/usr/bin/env node

/**
 * Aegntic Hive-Mind MCP Main Entry Point
 * Phase 1 Implementation - horizon-beta strategic coordination
 * CCR routing with GLM4.5air integration and Serena semantic analysis
 */

const HiveOrchestrator = require('./core/hive-orchestrator');
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');

class AegnticHiveMCP {
  constructor(options = {}) {
    this.config = {
      port: process.env.PORT || options.port || 9100,
      host: process.env.HOST || options.host || '0.0.0.0',
      enableGLM4Air: process.env.ENABLE_GLM4AIR !== 'false',
      enableSerena: process.env.ENABLE_SERENA !== 'false',
      performanceMode: process.env.PERFORMANCE_MODE || 'ccheavy',
      logLevel: process.env.LOG_LEVEL || 'info',
      ...options
    };
    
    // Initialize Express app
    this.app = express();
    this.server = null;
    this.hiveOrchestrator = null;
    
    // System state
    this.startTime = Date.now();
    this.isRunning = false;
    
    console.log('🧠 Aegntic Hive-Mind MCP Server');
    console.log('📊 Phase 1 Implementation - horizon-beta coordination');
    console.log(`⚡ Performance mode: ${this.config.performanceMode}`);
    console.log(`🤖 GLM4.5air: ${this.config.enableGLM4Air ? 'enabled' : 'disabled'}`);
    console.log(`🔍 Serena: ${this.config.enableSerena ? 'enabled' : 'disabled'}`);
  }
  
  async initialize() {
    try {
      console.log('[Main] Initializing Aegntic Hive-Mind MCP...');
      
      // Setup Express middleware
      this.setupMiddleware();
      
      // Setup API routes
      this.setupRoutes();
      
      // Initialize Hive Orchestrator
      this.hiveOrchestrator = new HiveOrchestrator(this.config);
      await this.hiveOrchestrator.initialize();
      
      // Setup orchestrator event handlers
      this.setupOrchestratorEvents();
      
      console.log('[Main] Initialization complete');
      return true;
      
    } catch (error) {
      console.error('[Main] Initialization failed:', error);
      throw error;
    }
  }
  
  setupMiddleware() {
    // CORS
    this.app.use(cors({
      origin: true,
      credentials: true
    }));
    
    // JSON parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
    
    // Request logging
    this.app.use((req, res, next) => {
      const startTime = Date.now();
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
      });
      
      next();
    });
    
    // Error handling
    this.app.use((error, req, res, next) => {
      console.error('[Main] Express error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: Date.now()
      });
    });
  }
  
  setupRoutes() {
    // Health check endpoint
    this.app.get('/health', async (req, res) => {
      try {
        const status = this.hiveOrchestrator ? this.hiveOrchestrator.getStatus() : { state: 'not-initialized' };
        
        res.json({
          status: 'ok',
          timestamp: Date.now(),
          uptime: Date.now() - this.startTime,
          system: status,
          version: '1.0.0-phase1'
        });
        
      } catch (error) {
        res.status(500).json({
          status: 'error',
          error: error.message,
          timestamp: Date.now()
        });
      }
    });
    
    // System status endpoint
    this.app.get('/status', async (req, res) => {
      try {
        if (!this.hiveOrchestrator) {
          return res.status(503).json({
            error: 'Hive orchestrator not initialized',
            timestamp: Date.now()
          });
        }
        
        const status = this.hiveOrchestrator.getStatus();
        res.json(status);
        
      } catch (error) {
        res.status(500).json({
          error: error.message,
          timestamp: Date.now()
        });
      }
    });
    
    // Metrics endpoint
    this.app.get('/metrics', async (req, res) => {
      try {
        if (!this.hiveOrchestrator) {
          return res.status(503).json({
            error: 'Hive orchestrator not initialized',
            timestamp: Date.now()
          });
        }
        
        const metrics = this.hiveOrchestrator.getMetrics();
        res.json(metrics);
        
      } catch (error) {
        res.status(500).json({
          error: error.message,
          timestamp: Date.now()
        });
      }
    });
    
    // Component stats endpoint
    this.app.get('/components/:name/stats', async (req, res) => {
      try {
        if (!this.hiveOrchestrator) {
          return res.status(503).json({
            error: 'Hive orchestrator not initialized',
            timestamp: Date.now()
          });
        }
        
        const stats = await this.hiveOrchestrator.getComponentStats(req.params.name);
        res.json(stats);
        
      } catch (error) {
        res.status(404).json({
          error: error.message,
          timestamp: Date.now()
        });
      }
    });
    
    // Process request endpoint (main MCP functionality)
    this.app.post('/process', async (req, res) => {
      try {
        if (!this.hiveOrchestrator) {
          return res.status(503).json({
            error: 'Hive orchestrator not initialized',
            timestamp: Date.now()
          });
        }
        
        const request = req.body;
        if (!request || typeof request !== 'object') {
          return res.status(400).json({
            error: 'Invalid request body',
            timestamp: Date.now()
          });
        }
        
        const result = await this.hiveOrchestrator.processRequest(request);
        res.json(result);
        
      } catch (error) {
        console.error('[Main] Request processing error:', error);
        res.status(500).json({
          error: error.message,
          timestamp: Date.now()
        });
      }
    });
    
    // Neural router test endpoint
    this.app.post('/route', async (req, res) => {
      try {
        if (!this.hiveOrchestrator || !this.hiveOrchestrator.neuralRouter) {
          return res.status(503).json({
            error: 'Neural router not available',
            timestamp: Date.now()
          });
        }
        
        const request = req.body;
        const routing = await this.hiveOrchestrator.neuralRouter.routeRequest(request);
        
        res.json({
          routing,
          timestamp: Date.now()
        });
        
      } catch (error) {
        res.status(500).json({
          error: error.message,
          timestamp: Date.now()
        });
      }
    });
    
    // Semantic analysis endpoint (if Serena is enabled)
    this.app.post('/analyze', async (req, res) => {
      try {
        if (!this.hiveOrchestrator || !this.hiveOrchestrator.semanticAdapter) {
          return res.status(503).json({
            error: 'Semantic analysis not available',
            timestamp: Date.now()
          });
        }
        
        const { code, options } = req.body;
        if (!code) {
          return res.status(400).json({
            error: 'Code parameter required',
            timestamp: Date.now()
          });
        }
        
        const analysis = await this.hiveOrchestrator.semanticAdapter.analyzeCode(code, options);
        res.json(analysis);
        
      } catch (error) {
        res.status(500).json({
          error: error.message,
          timestamp: Date.now()
        });
      }
    });
    
    // Pattern detection endpoint
    this.app.post('/patterns', async (req, res) => {
      try {
        if (!this.hiveOrchestrator || !this.hiveOrchestrator.patternEngine) {
          return res.status(503).json({
            error: 'Pattern engine not available',
            timestamp: Date.now()
          });
        }
        
        const { data, type } = req.body;
        if (!data) {
          return res.status(400).json({
            error: 'Data parameter required',
            timestamp: Date.now()
          });
        }
        
        const patterns = await this.hiveOrchestrator.patternEngine.detectPatterns(data, type);
        res.json(patterns);
        
      } catch (error) {
        res.status(500).json({
          error: error.message,
          timestamp: Date.now()
        });
      }
    });
    
    // Collective intelligence endpoint
    this.app.post('/collective', async (req, res) => {
      try {
        if (!this.hiveOrchestrator || !this.hiveOrchestrator.superHub) {
          return res.status(503).json({
            error: 'SuperHub not available',
            timestamp: Date.now()
          });
        }
        
        const request = req.body;
        const result = await this.hiveOrchestrator.superHub.processWithCollectiveIntelligence(request);
        
        res.json(result);
        
      } catch (error) {
        res.status(500).json({
          error: error.message,
          timestamp: Date.now()
        });
      }
    });
    
    // Shutdown endpoint (for development)
    this.app.post('/shutdown', async (req, res) => {
      try {
        res.json({
          message: 'Shutdown initiated',
          timestamp: Date.now()
        });
        
        // Shutdown after response
        setTimeout(() => {
          this.shutdown();
        }, 1000);
        
      } catch (error) {
        res.status(500).json({
          error: error.message,
          timestamp: Date.now()
        });
      }
    });
  }
  
  setupOrchestratorEvents() {
    if (!this.hiveOrchestrator) return;
    
    this.hiveOrchestrator.on('initialized', (data) => {
      console.log('🚀 Hive orchestrator initialized:', data.components.join(', '));
    });
    
    this.hiveOrchestrator.on('threshold-exceeded', (data) => {
      console.warn(`⚠️  Performance threshold exceeded: ${data.metric} = ${data.value} (threshold: ${data.threshold})`);
    });
    
    this.hiveOrchestrator.on('health-check-complete', (data) => {
      const healthyComponents = Object.values(data.results).filter(r => r.status === 'healthy' || r.status === 'active').length;
      const totalComponents = Object.keys(data.results).length;
      
      if (healthyComponents < totalComponents) {
        console.warn(`🔧 Health check: ${healthyComponents}/${totalComponents} components healthy`);
      }
    });
    
    this.hiveOrchestrator.on('initialization-failed', (error) => {
      console.error('❌ Hive orchestrator initialization failed:', error);
    });
    
    this.hiveOrchestrator.on('shutdown-complete', () => {
      console.log('✅ Hive orchestrator shutdown complete');
    });
  }
  
  async start() {
    try {
      console.log(`[Main] Starting server on ${this.config.host}:${this.config.port}...`);
      
      // Initialize system
      await this.initialize();
      
      // Start HTTP server
      this.server = createServer(this.app);
      
      return new Promise((resolve, reject) => {
        this.server.listen(this.config.port, this.config.host, (error) => {
          if (error) {
            console.error('[Main] Server start failed:', error);
            reject(error);
            return;
          }
          
          this.isRunning = true;
          
          console.log(`✅ Aegntic Hive-Mind MCP Server running`);
          console.log(`🌐 HTTP API: http://${this.config.host}:${this.config.port}`);
          console.log(`🧠 SuperHub WebSocket: ws://${this.config.host}:9101`);
          console.log(`🔍 Serena Integration: ws://${this.config.host}:9102`);
          console.log(`📊 Health check: http://${this.config.host}:${this.config.port}/health`);
          console.log(`📈 Metrics: http://${this.config.host}:${this.config.port}/metrics`);
          console.log(`🎯 Performance targets: <5s response, >85% accuracy, 99.9% uptime`);
          
          resolve();
        });
      });
      
    } catch (error) {
      console.error('[Main] Start failed:', error);
      throw error;
    }
  }
  
  async shutdown() {
    console.log('[Main] Shutting down server...');
    
    try {
      this.isRunning = false;
      
      // Shutdown hive orchestrator
      if (this.hiveOrchestrator) {
        await this.hiveOrchestrator.shutdown();
      }
      
      // Close HTTP server
      if (this.server) {
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
      }
      
      console.log('✅ Server shutdown complete');
      process.exit(0);
      
    } catch (error) {
      console.error('[Main] Shutdown error:', error);
      process.exit(1);
    }
  }
  
  // Handle process signals
  setupSignalHandlers() {
    process.on('SIGINT', () => {
      console.log('\n[Main] Received SIGINT, shutting down gracefully...');
      this.shutdown();
    });
    
    process.on('SIGTERM', () => {
      console.log('\n[Main] Received SIGTERM, shutting down gracefully...');
      this.shutdown();
    });
    
    process.on('uncaughtException', (error) => {
      console.error('[Main] Uncaught exception:', error);
      this.shutdown();
    });
    
    process.on('unhandledRejection', (reason, promise) => {
      console.error('[Main] Unhandled rejection at:', promise, 'reason:', reason);
      this.shutdown();
    });
  }
}

// CLI execution
if (require.main === module) {
  const server = new AegnticHiveMCP();
  
  // Setup signal handlers
  server.setupSignalHandlers();
  
  // Start server
  server.start().catch((error) => {
    console.error('❌ Failed to start Aegntic Hive-Mind MCP:', error);
    process.exit(1);
  });
}

module.exports = AegnticHiveMCP;