/**
 * Database Optimizer for aegntic-hive-mcp
 * Implements async operations, connection pooling, and WAL mode
 * Part of Claude Code Heavy (ccheavy) optimization
 */

const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util');
const EventEmitter = require('events');

class DatabaseOptimizer extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.dbPath = options.dbPath || './conversations.db';
    this.maxConnections = options.maxConnections || 10;
    this.connectionTimeout = options.connectionTimeout || 30000;
    this.batchSize = options.batchSize || 100;
    this.enableWAL = options.enableWAL !== false;
    
    this.connectionPool = [];
    this.activeConnections = 0;
    this.waitingQueue = [];
    this.preparedStatements = new Map();
    
    this.stats = {
      totalQueries: 0,
      successfulQueries: 0,
      failedQueries: 0,
      avgQueryTime: 0,
      connectionPoolHits: 0,
      connectionPoolMisses: 0
    };
    
    this.initialize();
  }
  
  async initialize() {
    console.log('[DatabaseOptimizer] Initializing optimized database connection...');
    
    try {
      // Create initial connection pool
      for (let i = 0; i < Math.min(3, this.maxConnections); i++) {
        await this.createConnection();
      }
      
      // Setup database optimizations
      await this.setupOptimizations();
      
      // Create indexes for better performance
      await this.createIndexes();
      
      // Setup prepared statements
      await this.setupPreparedStatements();
      
      console.log(`[DatabaseOptimizer] Initialized with ${this.connectionPool.length} connections`);
      this.emit('initialized');
      
    } catch (error) {
      console.error('[DatabaseOptimizer] Initialization failed:', error);
      throw error;
    }
  }
  
  async createConnection() {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('[DatabaseOptimizer] Connection failed:', err);
          reject(err);
          return;
        }
        
        const connection = {
          db,
          id: `conn_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          busy: false,
          createdAt: Date.now(),
          lastUsed: Date.now(),
          queryCount: 0
        };
        
        // Promisify common methods
        connection.run = promisify(db.run.bind(db));
        connection.get = promisify(db.get.bind(db));
        connection.all = promisify(db.all.bind(db));
        connection.exec = promisify(db.exec.bind(db));
        connection.prepare = db.prepare.bind(db);
        
        this.connectionPool.push(connection);
        this.activeConnections++;
        
        console.log(`[DatabaseOptimizer] Created connection ${connection.id}`);
        resolve(connection);
      });
    });
  }
  
  async getConnection() {
    // Find available connection
    const availableConnection = this.connectionPool.find(conn => !conn.busy);
    
    if (availableConnection) {
      availableConnection.busy = true;
      availableConnection.lastUsed = Date.now();
      this.stats.connectionPoolHits++;
      return availableConnection;
    }
    
    // Create new connection if under limit
    if (this.activeConnections < this.maxConnections) {
      this.stats.connectionPoolMisses++;
      const newConnection = await this.createConnection();
      newConnection.busy = true;
      return newConnection;
    }
    
    // Wait for available connection
    this.stats.connectionPoolMisses++;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, this.connectionTimeout);
      
      this.waitingQueue.push({ resolve, reject, timeout });
    });
  }
  
  releaseConnection(connection) {
    connection.busy = false;
    connection.lastUsed = Date.now();
    
    // Process waiting queue
    if (this.waitingQueue.length > 0) {
      const { resolve, reject, timeout } = this.waitingQueue.shift();
      clearTimeout(timeout);
      connection.busy = true;
      resolve(connection);
    }
  }
  
  async setupOptimizations() {
    const connection = await this.getConnection();
    
    try {
      // Enable WAL mode for better concurrent access
      if (this.enableWAL) {
        await connection.exec('PRAGMA journal_mode = WAL');
        console.log('[DatabaseOptimizer] WAL mode enabled');
      }
      
      // Optimize synchronization for better performance
      await connection.exec('PRAGMA synchronous = NORMAL');
      
      // Increase cache size (10MB)
      await connection.exec('PRAGMA cache_size = 10000');
      
      // Store temporary tables in memory
      await connection.exec('PRAGMA temp_store = MEMORY');
      
      // Enable memory-mapped I/O (256MB)
      await connection.exec('PRAGMA mmap_size = 268435456');
      
      // Optimize auto-vacuum
      await connection.exec('PRAGMA auto_vacuum = INCREMENTAL');
      
      // Set page size for better performance
      await connection.exec('PRAGMA page_size = 4096');
      
      console.log('[DatabaseOptimizer] Database optimizations applied');
      
    } finally {
      this.releaseConnection(connection);
    }
  }
  
  async createIndexes() {
    const connection = await this.getConnection();
    
    try {
      const indexes = [
        'CREATE INDEX IF NOT EXISTS idx_conversations_service ON conversations(service)',
        'CREATE INDEX IF NOT EXISTS idx_conversations_project_id ON conversations(project_id)',
        'CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at)',
        'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)',
        'CREATE INDEX IF NOT EXISTS idx_messages_content ON messages(content)',
        'CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role)',
        'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp)',
        'CREATE INDEX IF NOT EXISTS idx_artifacts_project_id ON artifacts(project_id)',
        'CREATE INDEX IF NOT EXISTS idx_artifacts_name ON artifacts(name)',
        'CREATE INDEX IF NOT EXISTS idx_artifacts_type ON artifacts(type)'
      ];
      
      for (const indexSQL of indexes) {
        await connection.run(indexSQL);
      }
      
      console.log('[DatabaseOptimizer] Database indexes created');
      
    } finally {
      this.releaseConnection(connection);
    }
  }
  
  async setupPreparedStatements() {
    const connection = await this.getConnection();
    
    try {
      const statements = {
        insertConversation: `
          INSERT INTO conversations (service, project_id, conversation_id, title, created_at, updated_at, url)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        insertMessage: `
          INSERT INTO messages (conversation_id, service, role, content, timestamp, message_order)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
        updateConversation: `
          UPDATE conversations 
          SET title = ?, updated_at = ? 
          WHERE id = ?
        `,
        getConversations: `
          SELECT * FROM conversations 
          WHERE ($1 IS NULL OR service = $1) 
          ORDER BY updated_at DESC 
          LIMIT $2 OFFSET $3
        `,
        getMessages: `
          SELECT * FROM messages 
          WHERE conversation_id = ? 
          ORDER BY message_order ASC
        `,
        searchConversations: `
          SELECT DISTINCT c.* FROM conversations c
          JOIN messages m ON c.id = m.conversation_id
          WHERE ($1 IS NULL OR c.service = $1)
          AND (c.title LIKE $2 OR m.content LIKE $2)
          ORDER BY c.updated_at DESC
          LIMIT $3
        `
      };
      
      for (const [name, sql] of Object.entries(statements)) {
        this.preparedStatements.set(name, connection.prepare(sql));
      }
      
      console.log('[DatabaseOptimizer] Prepared statements created');
      
    } finally {
      this.releaseConnection(connection);
    }
  }
  
  async executeQuery(sql, params = [], options = {}) {
    const startTime = Date.now();
    const connection = await this.getConnection();
    
    try {
      this.stats.totalQueries++;
      connection.queryCount++;
      
      let result;
      
      if (options.method === 'get') {
        result = await connection.get(sql, params);
      } else if (options.method === 'all') {
        result = await connection.all(sql, params);
      } else {
        result = await connection.run(sql, params);
      }
      
      this.stats.successfulQueries++;
      
      const queryTime = Date.now() - startTime;
      this.updateAvgQueryTime(queryTime);
      
      if (queryTime > 1000) {
        console.warn(`[DatabaseOptimizer] Slow query detected (${queryTime}ms):`, sql.substring(0, 100));
      }
      
      return result;
      
    } catch (error) {
      this.stats.failedQueries++;
      console.error('[DatabaseOptimizer] Query failed:', error);
      throw error;
    } finally {
      this.releaseConnection(connection);
    }
  }
  
  async executePrepared(statementName, params = [], options = {}) {
    const statement = this.preparedStatements.get(statementName);
    if (!statement) {
      throw new Error(`Prepared statement '${statementName}' not found`);
    }
    
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      const callback = (err, result) => {
        const queryTime = Date.now() - startTime;
        this.updateAvgQueryTime(queryTime);
        
        if (err) {
          this.stats.failedQueries++;
          reject(err);
        } else {
          this.stats.successfulQueries++;
          resolve(result);
        }
      };
      
      if (options.method === 'get') {
        statement.get(params, callback);
      } else if (options.method === 'all') {
        statement.all(params, callback);
      } else {
        statement.run(params, callback);
      }
    });
  }
  
  async executeBatch(operations) {
    if (!Array.isArray(operations) || operations.length === 0) {
      return [];
    }
    
    const connection = await this.getConnection();
    const results = [];
    
    try {
      // Begin transaction for batch operations
      await connection.run('BEGIN TRANSACTION');
      
      // Process operations in batches
      for (let i = 0; i < operations.length; i += this.batchSize) {
        const batch = operations.slice(i, i + this.batchSize);
        
        for (const operation of batch) {
          try {
            let result;
            
            if (operation.prepared) {
              result = await this.executePrepared(operation.statement, operation.params, operation.options);
            } else {
              result = await this.executeQuery(operation.sql, operation.params, operation.options);
            }
            
            results.push({ success: true, result });
          } catch (error) {
            results.push({ success: false, error: error.message });
          }
        }
      }
      
      // Commit transaction
      await connection.run('COMMIT');
      
    } catch (error) {
      // Rollback on error
      await connection.run('ROLLBACK');
      throw error;
    } finally {
      this.releaseConnection(connection);
    }
    
    return results;
  }
  
  updateAvgQueryTime(queryTime) {
    const alpha = 0.1; // Exponential moving average factor
    this.stats.avgQueryTime = this.stats.avgQueryTime === 0 
      ? queryTime 
      : (alpha * queryTime) + ((1 - alpha) * this.stats.avgQueryTime);
  }
  
  async vacuum() {
    console.log('[DatabaseOptimizer] Running database vacuum...');
    const connection = await this.getConnection();
    
    try {
      await connection.exec('VACUUM');
      console.log('[DatabaseOptimizer] Database vacuum completed');
    } finally {
      this.releaseConnection(connection);
    }
  }
  
  async analyze() {
    console.log('[DatabaseOptimizer] Running database analysis...');
    const connection = await this.getConnection();
    
    try {
      await connection.exec('ANALYZE');
      console.log('[DatabaseOptimizer] Database analysis completed');
    } finally {
      this.releaseConnection(connection);
    }
  }
  
  getStats() {
    return {
      ...this.stats,
      activeConnections: this.activeConnections,
      poolSize: this.connectionPool.length,
      waitingQueue: this.waitingQueue.length,
      preparedStatements: this.preparedStatements.size,
      successRate: this.stats.totalQueries > 0 
        ? Math.round((this.stats.successfulQueries / this.stats.totalQueries) * 100)
        : 0
    };
  }
  
  async cleanup() {
    console.log('[DatabaseOptimizer] Cleaning up old connections...');
    
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    const connectionsToClose = this.connectionPool.filter(conn => 
      !conn.busy && (now - conn.lastUsed > maxAge)
    );
    
    for (const conn of connectionsToClose) {
      conn.db.close();
      const index = this.connectionPool.indexOf(conn);
      if (index > -1) {
        this.connectionPool.splice(index, 1);
        this.activeConnections--;
      }
    }
    
    console.log(`[DatabaseOptimizer] Cleaned up ${connectionsToClose.length} old connections`);
  }
  
  async shutdown() {
    console.log('[DatabaseOptimizer] Shutting down database optimizer...');
    
    // Finalize prepared statements
    for (const statement of this.preparedStatements.values()) {
      statement.finalize();
    }
    
    // Close all connections
    for (const connection of this.connectionPool) {
      connection.db.close();
    }
    
    console.log('[DatabaseOptimizer] Shutdown complete');
  }
}

module.exports = DatabaseOptimizer;