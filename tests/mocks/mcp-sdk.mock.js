/**
 * CommonJS test double for the ESM-only @modelcontextprotocol/sdk.
 *
 * The SDK ships as ESM ("type": "module"), which Jest's default CJS runtime
 * cannot require directly. This stub mirrors only the surface used by the
 * server, the MCP connector and the test suites, and is wired in through
 * jest.config.js moduleNameMapper. It intentionally provides no real
 * transport behaviour; tests mock or stub what they exercise.
 */

const CallToolRequestSchema = { jsonrpc: '2.0', method: 'tools/call' };
const ListToolsRequestSchema = { jsonrpc: '2.0', method: 'tools/list' };

class MockTransport {
  constructor(options = {}) {
    this.options = options;
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    this.sessionId = undefined;
  }
  async start() {
    return undefined;
  }
  async send(message) {
    return message;
  }
  async close() {
    return undefined;
  }
}

class MockClient {
  constructor(info = {}, options = {}) {
    this.info = info;
    this.options = options;
  }
  async connect(transport) {
    this.transport = transport;
    return {};
  }
  async listTools() {
    return { tools: [] };
  }
  async callTool() {
    return { content: [] };
  }
  async close() {
    return undefined;
  }
}

class MockServer {
  constructor(info = {}, options = {}) {
    this.info = info;
    this.options = options;
    this._requestHandlers = new Map();
  }
  setRequestHandler(schema, handler) {
    this._requestHandlers.set(schema, handler);
    return this._requestHandlers;
  }
  getRequestHandler(schema) {
    return this._requestHandlers.get(schema);
  }
  /**
   * Minimal protocol dispatch mirroring the real Server: routes
   * tools/list and tools/call messages to their registered handlers.
   */
  async request(message) {
    const { method, params = {} } = message || {};
    if (method === 'tools/list') {
      const handler = this._requestHandlers.get(ListToolsRequestSchema);
      if (!handler) {
        throw new Error('No handler registered for tools/list');
      }
      return handler(params);
    }
    if (method === 'tools/call') {
      const handler = this._requestHandlers.get(CallToolRequestSchema);
      if (!handler) {
        throw new Error('No handler registered for tools/call');
      }
      return handler(params);
    }
    throw new Error(`Method not found: ${method}`);
  }
  async connect(transport) {
    this.transport = transport;
    return {};
  }
  async close() {
    return undefined;
  }
}

class McpError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'McpError';
    this.code = code;
  }
}

const ErrorCode = {
  ParseError: 'ParseError',
  InvalidRequest: 'InvalidRequest',
  MethodNotFound: 'MethodNotFound',
  InvalidParams: 'InvalidParams',
  InternalError: 'InternalError',
  NotFound: 'NotFound',
};

module.exports = {
  Client: MockClient,
  Server: MockServer,
  StdioServerTransport: MockTransport,
  StdioClientTransport: MockTransport,
  SSEClientTransport: MockTransport,
  WebSocketClientTransport: MockTransport,
  TestTransport: MockTransport,
  McpError,
  ErrorCode,
  CallToolRequestSchema,
  ListToolsRequestSchema,
};
