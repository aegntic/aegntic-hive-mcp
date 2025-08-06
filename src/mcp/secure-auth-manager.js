/**
 * Secure Authentication Manager for MCP Operations
 * Handles secure credential management, token refresh, and authentication flows
 */

const crypto = require('crypto');
const EventEmitter = require('events');

class SecureAuthManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      encryptionAlgorithm: 'aes-256-gcm',
      keyDerivationIterations: 100000,
      tokenRefreshThreshold: 300000, // 5 minutes before expiry
      maxRetries: 3,
      retryDelay: 1000,
      credentialStorage: config.credentialStorage || 'memory', // 'memory', 'file', 'env'
      storageEncryption: config.storageEncryption !== false,
      auditLogging: config.auditLogging !== false,
      ...config
    };
    
    // Internal state
    this.credentials = new Map();
    this.tokens = new Map();
    this.refreshTimers = new Map();
    this.authStrategies = new Map();
    this.auditLog = [];
    this.masterKey = null;
    
    // Security metrics
    this.securityMetrics = {
      authenticationAttempts: 0,
      successfulAuthentications: 0,
      failedAuthentications: 0,
      tokenRefreshes: 0,
      securityViolations: 0,
      lastSecurityEvent: null
    };
    
    this.initialize();
  }
  
  async initialize() {
    try {
      // Initialize master encryption key
      await this.initializeMasterKey();
      
      // Register default authentication strategies
      this.registerDefaultStrategies();
      
      // Load stored credentials
      await this.loadStoredCredentials();
      
      this.emit('auth_manager:initialized');
      
    } catch (error) {
      this.emit('auth_manager:initialization_failed', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Initialize master encryption key for credential security
   */
  async initializeMasterKey() {
    if (process.env.MCP_AUTH_MASTER_KEY) {
      this.masterKey = process.env.MCP_AUTH_MASTER_KEY;
    } else {
      // Generate a new master key (should be persisted securely in production)
      this.masterKey = crypto.randomBytes(32).toString('hex');
      console.warn('[SecureAuthManager] Generated new master key. Please store securely!');
    }
  }
  
  /**
   * Register default authentication strategies
   */
  registerDefaultStrategies() {
    // API Key authentication
    this.registerAuthStrategy('api_key', {
      authenticate: this.authenticateWithApiKey.bind(this),
      refresh: null, // API keys don't typically refresh
      validate: this.validateApiKey.bind(this)
    });
    
    // OAuth 2.0 authentication
    this.registerAuthStrategy('oauth2', {
      authenticate: this.authenticateWithOAuth2.bind(this),
      refresh: this.refreshOAuth2Token.bind(this),
      validate: this.validateOAuth2Token.bind(this)
    });
    
    // Bearer token authentication
    this.registerAuthStrategy('bearer', {
      authenticate: this.authenticateWithBearer.bind(this),
      refresh: this.refreshBearerToken.bind(this),
      validate: this.validateBearerToken.bind(this)
    });
    
    // Basic authentication
    this.registerAuthStrategy('basic', {
      authenticate: this.authenticateWithBasic.bind(this),
      refresh: null, // Basic auth doesn't refresh
      validate: this.validateBasicAuth.bind(this)
    });
  }
  
  /**
   * Register custom authentication strategy
   */
  registerAuthStrategy(strategyName, strategy) {
    if (!strategy.authenticate || typeof strategy.authenticate !== 'function') {
      throw new Error('Authentication strategy must have an authenticate function');
    }
    
    if (!strategy.validate || typeof strategy.validate !== 'function') {
      throw new Error('Authentication strategy must have a validate function');
    }
    
    this.authStrategies.set(strategyName, strategy);
    this.emit('auth_strategy:registered', { strategy: strategyName });
  }
  
  /**
   * Store credentials securely for a server
   */
  async storeCredentials(serverName, credentialData) {
    try {
      // Validate input
      if (!serverName || !credentialData) {
        throw new Error('Server name and credential data are required');
      }
      
      // Encrypt credentials
      const encrypted = this.config.storageEncryption ? 
        this.encryptData(JSON.stringify(credentialData)) : credentialData;
      
      // Store in memory
      this.credentials.set(serverName, {
        data: encrypted,
        encrypted: this.config.storageEncryption,
        createdAt: Date.now(),
        lastUsed: null
      });
      
      // Persist if configured
      if (this.config.credentialStorage !== 'memory') {
        await this.persistCredentials(serverName, encrypted);
      }
      
      this.logAuditEvent('credentials_stored', { serverName });
      this.emit('credentials:stored', { serverName });
      
    } catch (error) {
      this.logSecurityViolation('credential_storage_failed', { serverName, error: error.message });
      throw error;
    }
  }
  
  /**
   * Retrieve and decrypt credentials for a server
   */
  async getCredentials(serverName) {
    try {
      const stored = this.credentials.get(serverName);
      if (!stored) {
        throw new Error(`No credentials found for server: ${serverName}`);
      }
      
      // Decrypt if necessary
      const credentialData = stored.encrypted ? 
        JSON.parse(this.decryptData(stored.data)) : stored.data;
      
      // Update last used timestamp
      stored.lastUsed = Date.now();
      
      this.logAuditEvent('credentials_retrieved', { serverName });
      return credentialData;
      
    } catch (error) {
      this.logSecurityViolation('credential_retrieval_failed', { serverName, error: error.message });
      throw error;
    }
  }
  
  /**
   * Authenticate with a server using stored credentials
   */
  async authenticate(serverName, options = {}) {
    const authAttemptId = this.generateAttemptId();
    const startTime = Date.now();
    
    try {
      this.securityMetrics.authenticationAttempts++;
      
      // Get credentials
      const credentials = await this.getCredentials(serverName);
      
      // Determine authentication strategy
      const strategyName = credentials.authType || 'api_key';
      const strategy = this.authStrategies.get(strategyName);
      
      if (!strategy) {
        throw new Error(`Unknown authentication strategy: ${strategyName}`);
      }
      
      // Perform authentication with retry logic
      const authResult = await this.performAuthenticationWithRetry(
        strategy,
        serverName,
        credentials,
        options
      );
      
      // Store authentication token/result
      this.tokens.set(serverName, {
        ...authResult,
        strategy: strategyName,
        createdAt: Date.now(),
        lastRefreshed: Date.now()
      });
      
      // Set up token refresh if applicable
      if (strategy.refresh && authResult.expiresIn) {
        this.scheduleTokenRefresh(serverName, authResult.expiresIn);
      }
      
      // Update metrics
      this.securityMetrics.successfulAuthentications++;
      const duration = Date.now() - startTime;
      
      this.logAuditEvent('authentication_successful', {
        serverName,
        strategy: strategyName,
        duration,
        attemptId: authAttemptId
      });
      
      this.emit('authentication:success', {
        serverName,
        strategy: strategyName,
        duration
      });
      
      return authResult;
      
    } catch (error) {
      this.securityMetrics.failedAuthentications++;
      
      this.logSecurityViolation('authentication_failed', {
        serverName,
        error: error.message,
        attemptId: authAttemptId
      });
      
      this.emit('authentication:failed', {
        serverName,
        error: error.message
      });
      
      throw error;
    }
  }
  
  /**
   * Perform authentication with retry logic
   */
  async performAuthenticationWithRetry(strategy, serverName, credentials, options) {
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          await this.sleep(this.config.retryDelay * attempt);
          this.emit('authentication:retry', { serverName, attempt });
        }
        
        return await strategy.authenticate(credentials, options);
        
      } catch (error) {
        lastError = error;
        
        // Don't retry on certain errors
        if (this.isNonRetryableAuthError(error)) {
          break;
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * Get authentication headers for API requests
   */
  async getAuthHeaders(serverName) {
    try {
      const token = this.tokens.get(serverName);
      if (!token) {
        throw new Error(`No authentication token found for server: ${serverName}`);
      }
      
      // Check if token is still valid
      const strategy = this.authStrategies.get(token.strategy);
      if (strategy.validate && !strategy.validate(token)) {
        // Token is invalid, try to refresh or re-authenticate
        if (strategy.refresh) {
          await this.refreshToken(serverName);
        } else {
          await this.authenticate(serverName);
        }
        
        // Get the updated token
        const updatedToken = this.tokens.get(serverName);
        return this.formatAuthHeaders(updatedToken);
      }
      
      return this.formatAuthHeaders(token);
      
    } catch (error) {
      this.logSecurityViolation('auth_header_generation_failed', {
        serverName,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Format authentication token into HTTP headers
   */
  formatAuthHeaders(token) {
    const headers = {};
    
    switch (token.strategy) {
      case 'api_key':
        headers['Authorization'] = `ApiKey ${token.accessToken}`;
        if (token.apiKeyHeader) {
          headers[token.apiKeyHeader] = token.accessToken;
        }
        break;
        
      case 'oauth2':
      case 'bearer':
        headers['Authorization'] = `Bearer ${token.accessToken}`;
        break;
        
      case 'basic':
        headers['Authorization'] = `Basic ${token.basicAuth}`;
        break;
        
      default:
        headers['Authorization'] = token.accessToken;
    }
    
    // Add any additional headers
    if (token.additionalHeaders) {
      Object.assign(headers, token.additionalHeaders);
    }
    
    return headers;
  }
  
  /**
   * Refresh authentication token
   */
  async refreshToken(serverName) {
    try {
      const token = this.tokens.get(serverName);
      if (!token) {
        throw new Error(`No token found for server: ${serverName}`);
      }
      
      const strategy = this.authStrategies.get(token.strategy);
      if (!strategy.refresh) {
        throw new Error(`Token refresh not supported for strategy: ${token.strategy}`);
      }
      
      const credentials = await this.getCredentials(serverName);
      const refreshedToken = await strategy.refresh(token, credentials);
      
      // Update stored token
      this.tokens.set(serverName, {
        ...refreshedToken,
        strategy: token.strategy,
        createdAt: token.createdAt,
        lastRefreshed: Date.now()
      });
      
      // Reschedule next refresh
      if (refreshedToken.expiresIn) {
        this.scheduleTokenRefresh(serverName, refreshedToken.expiresIn);
      }
      
      this.securityMetrics.tokenRefreshes++;
      
      this.logAuditEvent('token_refreshed', { serverName });
      this.emit('token:refreshed', { serverName });
      
      return refreshedToken;
      
    } catch (error) {
      this.logSecurityViolation('token_refresh_failed', {
        serverName,
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Schedule automatic token refresh
   */
  scheduleTokenRefresh(serverName, expiresInSeconds) {
    // Clear existing timer
    const existingTimer = this.refreshTimers.get(serverName);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Calculate refresh time (5 minutes before expiry by default)
    const refreshTime = Math.max(
      (expiresInSeconds * 1000) - this.config.tokenRefreshThreshold,
      60000 // Minimum 1 minute
    );
    
    const timer = setTimeout(async () => {
      try {
        await this.refreshToken(serverName);
      } catch (error) {
        this.emit('token:refresh_failed', {
          serverName,
          error: error.message
        });
      }
    }, refreshTime);
    
    this.refreshTimers.set(serverName, timer);
    
    this.emit('token:refresh_scheduled', {
      serverName,
      refreshIn: refreshTime
    });
  }
  
  /**
   * Authentication strategy implementations
   */
  async authenticateWithApiKey(credentials, options) {
    if (!credentials.apiKey) {
      throw new Error('API key is required for API key authentication');
    }
    
    return {
      accessToken: credentials.apiKey,
      tokenType: 'api_key',
      apiKeyHeader: credentials.apiKeyHeader,
      additionalHeaders: credentials.additionalHeaders,
      expiresIn: null // API keys typically don't expire
    };
  }
  
  async authenticateWithOAuth2(credentials, options) {
    if (!credentials.clientId || !credentials.clientSecret) {
      throw new Error('Client ID and secret are required for OAuth2 authentication');
    }
    
    // This would integrate with actual OAuth2 provider
    // For now, return simulated response
    return {
      accessToken: `oauth2_${crypto.randomBytes(32).toString('hex')}`,
      refreshToken: `refresh_${crypto.randomBytes(32).toString('hex')}`,
      tokenType: 'Bearer',
      expiresIn: credentials.tokenExpirySeconds || 3600,
      scope: credentials.scope
    };
  }
  
  async authenticateWithBearer(credentials, options) {
    if (!credentials.bearerToken) {
      throw new Error('Bearer token is required for bearer authentication');
    }
    
    return {
      accessToken: credentials.bearerToken,
      tokenType: 'Bearer',
      expiresIn: credentials.expiresIn || null
    };
  }
  
  async authenticateWithBasic(credentials, options) {
    if (!credentials.username || !credentials.password) {
      throw new Error('Username and password are required for basic authentication');
    }
    
    const basicAuth = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
    
    return {
      basicAuth,
      tokenType: 'Basic',
      expiresIn: null // Basic auth doesn't expire
    };
  }
  
  /**
   * Token refresh implementations
   */
  async refreshOAuth2Token(currentToken, credentials) {
    if (!currentToken.refreshToken) {
      throw new Error('Refresh token is required for OAuth2 token refresh');
    }
    
    // This would integrate with actual OAuth2 provider
    // For now, return simulated response
    return {
      accessToken: `oauth2_refreshed_${crypto.randomBytes(32).toString('hex')}`,
      refreshToken: currentToken.refreshToken, // May be rotated
      tokenType: 'Bearer',
      expiresIn: credentials.tokenExpirySeconds || 3600,
      scope: currentToken.scope
    };
  }
  
  async refreshBearerToken(currentToken, credentials) {
    // Bearer token refresh logic depends on the specific API
    // This would need to be implemented per API
    throw new Error('Bearer token refresh must be implemented per API');
  }
  
  /**
   * Token validation implementations
   */
  validateApiKey(token) {
    return !!token.accessToken;
  }
  
  validateOAuth2Token(token) {
    if (!token.accessToken) return false;
    
    if (token.expiresIn) {
      const expiryTime = token.lastRefreshed + (token.expiresIn * 1000);
      return Date.now() < expiryTime;
    }
    
    return true;
  }
  
  validateBearerToken(token) {
    if (!token.accessToken) return false;
    
    if (token.expiresIn) {
      const expiryTime = token.lastRefreshed + (token.expiresIn * 1000);
      return Date.now() < expiryTime;
    }
    
    return true;
  }
  
  validateBasicAuth(token) {
    return !!token.basicAuth;
  }
  
  /**
   * Encryption utilities
   */
  encryptData(data) {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(this.masterKey, iv, 32);
    
    const cipher = crypto.createCipher(this.config.encryptionAlgorithm, key);
    cipher.setAAD(iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    };
  }
  
  decryptData(encryptedData) {
    const key = crypto.scryptSync(this.masterKey, Buffer.from(encryptedData.iv, 'hex'), 32);
    
    const decipher = crypto.createDecipher(this.config.encryptionAlgorithm, key);
    decipher.setAAD(Buffer.from(encryptedData.iv, 'hex'));
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
  
  /**
   * Audit and security logging
   */
  logAuditEvent(eventType, details) {
    if (!this.config.auditLogging) return;
    
    const auditEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      details,
      sessionId: this.generateSessionId()
    };
    
    this.auditLog.push(auditEntry);
    
    // Keep only last 1000 entries
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }
    
    this.emit('audit:event', auditEntry);
  }
  
  logSecurityViolation(violationType, details) {
    this.securityMetrics.securityViolations++;
    this.securityMetrics.lastSecurityEvent = Date.now();
    
    const violation = {
      timestamp: new Date().toISOString(),
      type: violationType,
      details,
      severity: this.getViolationSeverity(violationType)
    };
    
    this.logAuditEvent('security_violation', violation);
    this.emit('security:violation', violation);
  }
  
  getViolationSeverity(violationType) {
    const severityMap = {
      'authentication_failed': 'medium',
      'credential_storage_failed': 'high',
      'credential_retrieval_failed': 'high',
      'token_refresh_failed': 'medium',
      'auth_header_generation_failed': 'medium'
    };
    
    return severityMap[violationType] || 'low';
  }
  
  /**
   * Utility functions
   */
  isNonRetryableAuthError(error) {
    const nonRetryablePatterns = [
      'invalid credentials',
      'unauthorized',
      'forbidden',
      'invalid client',
      'invalid grant'
    ];
    
    return nonRetryablePatterns.some(pattern =>
      error.message.toLowerCase().includes(pattern)
    );
  }
  
  generateAttemptId() {
    return `auth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Storage operations
   */
  async loadStoredCredentials() {
    // Implementation depends on storage type
    if (this.config.credentialStorage === 'file') {
      // Load from file
    } else if (this.config.credentialStorage === 'env') {
      // Load from environment variables
    }
    // Memory storage doesn't need loading
  }
  
  async persistCredentials(serverName, encryptedCredentials) {
    // Implementation depends on storage type
    if (this.config.credentialStorage === 'file') {
      // Save to file
    }
    // Environment and memory storage don't need persistence
  }
  
  /**
   * Public API methods
   */
  getSecurityMetrics() {
    return {
      ...this.securityMetrics,
      activeTokens: this.tokens.size,
      storedCredentials: this.credentials.size,
      registeredStrategies: Array.from(this.authStrategies.keys()),
      auditLogSize: this.auditLog.length
    };
  }
  
  getAuditLog(limit = 100) {
    return this.auditLog.slice(-limit);
  }
  
  /**
   * Cleanup and shutdown
   */
  shutdown() {
    // Clear all refresh timers
    this.refreshTimers.forEach(timer => clearTimeout(timer));
    this.refreshTimers.clear();
    
    // Clear sensitive data
    this.credentials.clear();
    this.tokens.clear();
    
    this.emit('auth_manager:shutdown');
  }
}

module.exports = SecureAuthManager;