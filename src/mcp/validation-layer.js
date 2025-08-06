/**
 * API Response Validation Layer for MCP Operations
 * Provides comprehensive validation, sanitization, and error handling
 */

const EventEmitter = require('events');

class ValidationLayer extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.config = {
      enableStrictValidation: config.enableStrictValidation !== false,
      enableSanitization: config.enableSanitization !== false,
      enableSchemaValidation: config.enableSchemaValidation !== false,
      maxResponseSize: config.maxResponseSize || 10 * 1024 * 1024, // 10MB
      maxArrayLength: config.maxArrayLength || 10000,
      maxStringLength: config.maxStringLength || 100000,
      enableContentFiltering: config.enableContentFiltering !== false,
      allowedMimeTypes: config.allowedMimeTypes || [
        'text/plain',
        'text/html',
        'application/json',
        'text/markdown',
        'text/csv',
        'application/xml'
      ],
      ...config
    };
    
    // Validation schemas for different MCP response types
    this.schemas = {
      toolResponse: {
        required: ['content'],
        properties: {
          content: { type: 'array', minItems: 1 },
          isError: { type: 'boolean' }
        }
      },
      resourceResponse: {
        required: ['contents'],
        properties: {
          contents: { type: 'array', minItems: 1 }
        }
      },
      toolsList: {
        required: ['tools'],
        properties: {
          tools: { type: 'array' }
        }
      },
      resourcesList: {
        required: ['resources'],
        properties: {
          resources: { type: 'array' }
        }
      }
    };
    
    // Content filters
    this.contentFilters = {
      sensitive: [
        /api[_-]?key\s*[:=]\s*['"]\w+['"]/i,
        /secret[_-]?key\s*[:=]\s*['"]\w+['"]/i,
        /password\s*[:=]\s*['"]\w+['"]/i,
        /token\s*[:=]\s*['"]\w+['"]/i,
        /access[_-]?token\s*[:=]\s*['"]\w+['"]/i
      ],
      malicious: [
        /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
        /javascript:\s*[^"']/gi,
        /on\w+\s*=\s*["'][^"']*["']/gi,
        /eval\s*\(/gi,
        /function\s*\(\s*\)\s*{\s*return\s+/gi
      ]
    };
    
    // Validation metrics
    this.metrics = {
      validationAttempts: 0,
      validationsPassed: 0,
      validationsFailed: 0,
      sanitizationOperations: 0,
      securityViolations: 0,
      performanceWarnings: 0,
      averageValidationTime: 0
    };
    
    this.initialize();
  }
  
  async initialize() {
    this.emit('validation_layer:initialized', { config: this.config });
  }
  
  /**
   * Validate MCP tool response
   */
  async validateToolResponse(response, context = {}) {
    const startTime = Date.now();
    this.metrics.validationAttempts++;
    
    try {
      // Basic validation
      this.validateBasicStructure(response, 'toolResponse');
      
      // Content validation
      this.validateContent(response.content);
      
      // Security validation
      if (this.config.enableContentFiltering) {
        this.validateSecurity(response.content);
      }
      
      // Size validation
      this.validateResponseSize(response);
      
      // Schema validation
      if (this.config.enableSchemaValidation) {
        this.validateSchema(response, this.schemas.toolResponse);
      }
      
      // Context-specific validation
      if (context.toolName) {
        this.validateToolSpecific(response, context.toolName);
      }
      
      // Sanitization
      if (this.config.enableSanitization) {
        response = this.sanitizeResponse(response);
      }
      
      this.metrics.validationsPassed++;
      const duration = Date.now() - startTime;
      this.updateAverageValidationTime(duration);
      
      this.emit('validation:passed', {
        type: 'tool_response',
        duration,
        context
      });
      
      return {
        valid: true,
        response,
        metadata: {
          validationTime: duration,
          sanitized: this.config.enableSanitization,
          securityChecked: this.config.enableContentFiltering
        }
      };
      
    } catch (error) {
      this.metrics.validationsFailed++;
      
      this.emit('validation:failed', {
        type: 'tool_response',
        error: error.message,
        context
      });
      
      throw new ValidationError(`Tool response validation failed: ${error.message}`, {
        originalResponse: response,
        context
      });
    }
  }
  
  /**
   * Validate MCP resource response
   */
  async validateResourceResponse(response, context = {}) {
    const startTime = Date.now();
    this.metrics.validationAttempts++;
    
    try {
      // Basic validation
      this.validateBasicStructure(response, 'resourceResponse');
      
      // Content validation for each resource
      for (const content of response.contents) {
        this.validateResourceContent(content);
      }
      
      // MIME type validation
      this.validateMimeTypes(response.contents);
      
      // Security validation
      if (this.config.enableContentFiltering) {
        this.validateResourceSecurity(response.contents);
      }
      
      // Size validation
      this.validateResponseSize(response);
      
      // Schema validation
      if (this.config.enableSchemaValidation) {
        this.validateSchema(response, this.schemas.resourceResponse);
      }
      
      // Sanitization
      if (this.config.enableSanitization) {
        response = this.sanitizeResourceResponse(response);
      }
      
      this.metrics.validationsPassed++;
      const duration = Date.now() - startTime;
      this.updateAverageValidationTime(duration);
      
      this.emit('validation:passed', {
        type: 'resource_response',
        duration,
        context
      });
      
      return {
        valid: true,
        response,
        metadata: {
          validationTime: duration,
          sanitized: this.config.enableSanitization,
          securityChecked: this.config.enableContentFiltering
        }
      };
      
    } catch (error) {
      this.metrics.validationsFailed++;
      
      this.emit('validation:failed', {
        type: 'resource_response',
        error: error.message,
        context
      });
      
      throw new ValidationError(`Resource response validation failed: ${error.message}`, {
        originalResponse: response,
        context
      });
    }
  }
  
  /**
   * Basic structure validation
   */
  validateBasicStructure(response, type) {
    if (!response || typeof response !== 'object') {
      throw new Error('Response must be a valid object');
    }
    
    const schema = this.schemas[type];
    if (!schema) {
      throw new Error(`Unknown response type: ${type}`);
    }
    
    // Check required fields
    for (const field of schema.required) {
      if (!(field in response)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Check field types
    for (const [field, rules] of Object.entries(schema.properties)) {
      if (field in response) {
        this.validateFieldType(response[field], rules, field);
      }
    }
  }
  
  /**
   * Field type validation
   */
  validateFieldType(value, rules, fieldName) {
    switch (rules.type) {
      case 'array':
        if (!Array.isArray(value)) {
          throw new Error(`Field ${fieldName} must be an array`);
        }
        if (rules.minItems && value.length < rules.minItems) {
          throw new Error(`Field ${fieldName} must have at least ${rules.minItems} items`);
        }
        if (value.length > this.config.maxArrayLength) {
          throw new Error(`Field ${fieldName} exceeds maximum array length`);
        }
        break;
      case 'string':
        if (typeof value !== 'string') {
          throw new Error(`Field ${fieldName} must be a string`);
        }
        if (value.length > this.config.maxStringLength) {
          throw new Error(`Field ${fieldName} exceeds maximum string length`);
        }
        break;
      case 'boolean':
        if (typeof value !== 'boolean') {
          throw new Error(`Field ${fieldName} must be a boolean`);
        }
        break;
      case 'number':
        if (typeof value !== 'number') {
          throw new Error(`Field ${fieldName} must be a number`);
        }
        break;
      case 'object':
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error(`Field ${fieldName} must be an object`);
        }
        break;
    }
  }
  
  /**
   * Content validation
   */
  validateContent(content) {
    if (!Array.isArray(content)) {
      throw new Error('Content must be an array');
    }
    
    for (let i = 0; i < content.length; i++) {
      const item = content[i];
      
      if (!item.type) {
        throw new Error(`Content item ${i} missing type field`);
      }
      
      // Validate based on content type
      switch (item.type) {
        case 'text':
          if (!item.text || typeof item.text !== 'string') {
            throw new Error(`Text content item ${i} must have text field`);
          }
          break;
        case 'image':
          if (!item.data && !item.url) {
            throw new Error(`Image content item ${i} must have data or url field`);
          }
          break;
        case 'resource':
          if (!item.resource || !item.resource.uri) {
            throw new Error(`Resource content item ${i} must have resource.uri field`);
          }
          break;
      }
    }
  }
  
  /**
   * Resource content validation
   */
  validateResourceContent(content) {
    if (!content.uri) {
      throw new Error('Resource content must have uri field');
    }
    
    if (!content.mimeType) {
      throw new Error('Resource content must have mimeType field');
    }
    
    // Validate URI format
    try {
      new URL(content.uri);
    } catch (error) {
      // URI might be a relative path, which is also valid
      if (!content.uri.startsWith('/') && !content.uri.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:/)) {
        throw new Error(`Invalid URI format: ${content.uri}`);
      }
    }
    
    // Validate content data
    if (content.text && typeof content.text !== 'string') {
      throw new Error('Resource text content must be a string');
    }
    
    if (content.blob && typeof content.blob !== 'string') {
      throw new Error('Resource blob content must be a base64 string');
    }
  }
  
  /**
   * MIME type validation
   */
  validateMimeTypes(contents) {
    for (const content of contents) {
      if (!this.config.allowedMimeTypes.includes(content.mimeType)) {
        throw new Error(`Unsupported MIME type: ${content.mimeType}`);
      }
    }
  }
  
  /**
   * Security validation
   */
  validateSecurity(content) {
    for (const item of content) {
      if (item.type === 'text' && item.text) {
        this.checkForSensitiveData(item.text);
        this.checkForMaliciousContent(item.text);
      }
    }
  }
  
  validateResourceSecurity(contents) {
    for (const content of contents) {
      if (content.text) {
        this.checkForSensitiveData(content.text);
        this.checkForMaliciousContent(content.text);
      }
    }
  }
  
  /**
   * Check for sensitive data
   */
  checkForSensitiveData(text) {
    for (const pattern of this.contentFilters.sensitive) {
      if (pattern.test(text)) {
        this.metrics.securityViolations++;
        this.emit('security:sensitive_data_detected', { pattern: pattern.toString() });
        throw new Error('Sensitive data detected in response');
      }
    }
  }
  
  /**
   * Check for malicious content
   */
  checkForMaliciousContent(text) {
    for (const pattern of this.contentFilters.malicious) {
      if (pattern.test(text)) {
        this.metrics.securityViolations++;
        this.emit('security:malicious_content_detected', { pattern: pattern.toString() });
        throw new Error('Potentially malicious content detected in response');
      }
    }
  }
  
  /**
   * Response size validation
   */
  validateResponseSize(response) {
    const responseSize = JSON.stringify(response).length;
    
    if (responseSize > this.config.maxResponseSize) {
      this.metrics.performanceWarnings++;
      throw new Error(`Response size ${responseSize} exceeds maximum allowed size ${this.config.maxResponseSize}`);
    }
    
    if (responseSize > this.config.maxResponseSize * 0.8) {
      this.metrics.performanceWarnings++;
      this.emit('validation:performance_warning', {
        type: 'large_response',
        size: responseSize,
        maxSize: this.config.maxResponseSize
      });
    }
  }
  
  /**
   * Schema validation
   */
  validateSchema(response, schema) {
    // Basic schema validation (could be enhanced with JSON Schema library)
    for (const [field, rules] of Object.entries(schema.properties)) {
      if (field in response) {
        this.validateFieldType(response[field], rules, field);
      }
    }
  }
  
  /**
   * Tool-specific validation
   */
  validateToolSpecific(response, toolName) {
    // Add tool-specific validation rules
    switch (toolName) {
      case 'search':
        this.validateSearchResponse(response);
        break;
      case 'file_operations':
        this.validateFileOperationResponse(response);
        break;
      // Add more tool-specific validations as needed
    }
  }
  
  validateSearchResponse(response) {
    // Ensure search results have expected structure
    for (const item of response.content) {
      if (item.type === 'text' && item.text) {
        try {
          const data = JSON.parse(item.text);
          if (data.results && !Array.isArray(data.results)) {
            throw new Error('Search results must be an array');
          }
        } catch (error) {
          // Not JSON, that's ok for text responses
        }
      }
    }
  }
  
  validateFileOperationResponse(response) {
    // Ensure file operations return appropriate status
    for (const item of response.content) {
      if (item.type === 'text' && item.text) {
        if (!item.text.includes('success') && !item.text.includes('error')) {
          this.emit('validation:warning', {
            type: 'ambiguous_file_operation_result',
            response: item.text
          });
        }
      }
    }
  }
  
  /**
   * Response sanitization
   */
  sanitizeResponse(response) {
    this.metrics.sanitizationOperations++;
    
    const sanitized = JSON.parse(JSON.stringify(response)); // Deep clone
    
    if (sanitized.content) {
      sanitized.content = sanitized.content.map(item => {
        if (item.type === 'text' && item.text) {
          item.text = this.sanitizeText(item.text);
        }
        return item;
      });
    }
    
    return sanitized;
  }
  
  sanitizeResourceResponse(response) {
    this.metrics.sanitizationOperations++;
    
    const sanitized = JSON.parse(JSON.stringify(response)); // Deep clone
    
    if (sanitized.contents) {
      sanitized.contents = sanitized.contents.map(content => {
        if (content.text) {
          content.text = this.sanitizeText(content.text);
        }
        return content;
      });
    }
    
    return sanitized;
  }
  
  /**
   * Text sanitization
   */
  sanitizeText(text) {
    let sanitized = text;
    
    // Remove potentially sensitive data (replace with placeholders)
    for (const pattern of this.contentFilters.sensitive) {
      sanitized = sanitized.replace(pattern, '[REDACTED_SENSITIVE_DATA]');
    }
    
    // Remove malicious content
    for (const pattern of this.contentFilters.malicious) {
      sanitized = sanitized.replace(pattern, '[REMOVED_MALICIOUS_CONTENT]');
    }
    
    return sanitized;
  }
  
  /**
   * Metrics and monitoring
   */
  updateAverageValidationTime(duration) {
    const total = this.metrics.validationAttempts;
    this.metrics.averageValidationTime = 
      (this.metrics.averageValidationTime * (total - 1) + duration) / total;
  }
  
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.validationAttempts > 0 ? 
        (this.metrics.validationsPassed / this.metrics.validationAttempts * 100).toFixed(2) + '%' : '0%'
    };
  }
  
  getHealthStatus() {
    const metrics = this.getMetrics();
    const successRate = parseFloat(metrics.successRate);
    
    return {
      status: successRate >= 95 ? 'healthy' : successRate >= 80 ? 'degraded' : 'unhealthy',
      metrics,
      warnings: this.metrics.performanceWarnings > 0 ? ['Performance warnings detected'] : [],
      securityIssues: this.metrics.securityViolations > 0 ? ['Security violations detected'] : [],
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Configuration management
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.emit('validation_layer:config_updated', { config: this.config });
  }
  
  addContentFilter(type, pattern) {
    if (!this.contentFilters[type]) {
      this.contentFilters[type] = [];
    }
    this.contentFilters[type].push(pattern);
    this.emit('validation_layer:filter_added', { type, pattern: pattern.toString() });
  }
  
  /**
   * Cleanup
   */
  shutdown() {
    this.emit('validation_layer:shutdown');
  }
}

/**
 * Custom validation error class
 */
class ValidationError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

module.exports = { ValidationLayer, ValidationError };