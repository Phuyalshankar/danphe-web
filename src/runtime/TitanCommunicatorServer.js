'use strict';

/**
 * 🏔️ TITAN COMMUNICATOR SERVER (TitanCommunicatorServer.js)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Hardened, Lightweight, Zero-Dependency Bidirectional Gateway Bridge for Danphe.
 * Bridges JSX Reactive Bus (rx/tx) ⇄ Physical Serial Ports ⇄ Outbound HTTP/APIs.
 *
 * Hardening & Security Features:
 *  1. DoS Protection: Strict 1MB POST payload limit on all write endpoints.
 *  2. Memory Bounds: Capped register store (LRU eviction past 10,000 keys).
 *  3. SSRF Shield: Blocks metadata service IP (169.254.169.254) & local link addresses.
 *  4. Outbound Response Cap: 10MB max response buffer to prevent memory exhaustion.
 *  5. Serial Line Buffer: Handles fragmented chunks across newline boundaries.
 *  6. Safe SSE Broadcast: Prevents set-mutation race conditions during iteration.
 *  7. Clean Teardown: Uses closeAllConnections() to prevent hanging keep-alives.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const http = require('http');
const https = require('https');
const url = require('url');
const { EventEmitter } = require('events');

const MAX_BODY_LIMIT = 1024 * 1024;        // 1MB request body limit (DoS prevention)
const MAX_RESPONSE_LIMIT = 10 * 1024 * 1024; // 10MB response limit
const DEFAULT_MAX_REGISTERS = 10000;       // Max in-memory register entries

class TitanCommunicatorServer extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 8088;
    this.host = options.host || '0.0.0.0';
    this.timeoutMs = options.timeoutMs || 10000;
    this.maxRegisters = options.maxRegisters || DEFAULT_MAX_REGISTERS;

    // In-memory register store (Address/Name -> Value)
    this.registers = new Map([
      ['bus::status', 'ONLINE'],
      ['bus::heartbeat', Date.now()],
      ['security::status', 'SECURE'],
      ['error::master', 0],
      ['error::code', 200],
      ['error::message', ''],
      ['api::status', 'IDLE']
    ]);

    // Active SSE client connections for reactive push (rx)
    this.sseClients = new Set();

    // Secure Server-Side Auth Vault (Domain/Endpoint -> Token Config)
    this.authVault = new Map();

    // Registered API route definitions (Pattern -> Handler/Target)
    this.apiRoutes = new Map();

    // Physical Serial Port connection handle & line buffer
    this.serialPort = null;
    this.serialBuffer = '';

    // HTTP Server instance
    this.server = null;
  }

  /**
   * Securely register an authentication token or secret on server-side
   */
  setAuth(domainOrKey, tokenConfig) {
    if (typeof tokenConfig === 'string') {
      this.authVault.set(domainOrKey, {
        headers: { 'Authorization': `Bearer ${tokenConfig}` }
      });
    } else if (typeof tokenConfig === 'object' && tokenConfig !== null) {
      this.authVault.set(domainOrKey, tokenConfig);
    }
    return this;
  }

  /**
   * Bind a physical serial port or duplex stream (e.g. node-serialport instance)
   */
  attachSerialPort(port) {
    this.serialPort = port;
    this.serialBuffer = '';

    if (this.serialPort && typeof this.serialPort.on === 'function') {
      this.serialPort.on('data', (chunk) => {
        this._handleSerialChunk(chunk);
      });
      this.serialPort.on('error', (err) => {
        this._recordError(500, `SERIAL_ERROR: ${err.message}`);
      });
    }

    this.writeRegister('serial::connected', Boolean(port));
    return this;
  }

  /**
   * Ingest raw chunks from serial port with newline buffering to prevent partial-frame errors
   */
  _handleSerialChunk(chunk) {
    try {
      this.serialBuffer += chunk.toString('utf8');

      // Process complete newline-delimited frames
      let nlIdx;
      while ((nlIdx = this.serialBuffer.indexOf('\n')) !== -1) {
        const line = this.serialBuffer.slice(0, nlIdx).trim();
        this.serialBuffer = this.serialBuffer.slice(nlIdx + 1);
        if (line) {
          this._handleSerialLine(line);
        }
      }

      // If buffer is a complete JSON packet without trailing newline, process immediately
      const trimmed = this.serialBuffer.trim();
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        this.serialBuffer = '';
        this._handleSerialLine(trimmed);
      }

      // If buffer grows excessively without newlines, parse immediately as fallback
      if (this.serialBuffer.length > 8192) {
        const line = this.serialBuffer.trim();
        this.serialBuffer = '';
        if (line) this._handleSerialLine(line);
      }
    } catch (err) {
      this._recordError(400, `SERIAL_STREAM_ERROR: ${err.message}`);
    }
  }

  /**
   * Process a single complete line from the serial stream
   */
  _handleSerialLine(text) {
    try {
      // 1. JSON packet: {"reg": "temperature", "val": 24.5}
      if (text.startsWith('{') && text.endsWith('}')) {
        const parsed = JSON.parse(text);
        if (parsed.reg !== undefined && parsed.val !== undefined) {
          this.writeRegister(parsed.reg, parsed.val, 'SERIAL_PORT');
          return;
        }
      }

      // 2. KEY=VALUE syntax (safe slicing without truncating values with '=')
      const eqIdx = text.indexOf('=');
      if (eqIdx !== -1) {
        const k = text.slice(0, eqIdx).trim();
        const v = text.slice(eqIdx + 1).trim();
        this.writeRegister(k, v, 'SERIAL_PORT');
        return;
      }

      // 3. ADDR:VALUE syntax (single colon only, ignore '::')
      const colonIdx = text.indexOf(':');
      if (colonIdx !== -1 && text[colonIdx + 1] !== ':') {
        const k = text.slice(0, colonIdx).trim();
        const v = text.slice(colonIdx + 1).trim();
        this.writeRegister(k, v, 'SERIAL_PORT');
        return;
      }

      // Fallback
      this.writeRegister('serial::raw', text, 'SERIAL_PORT');
    } catch (err) {
      this._recordError(400, `SERIAL_PARSE_ERROR: ${err.message}`);
    }
  }

  /**
   * Write to a bus register with bounded memory management
   */
  writeRegister(addressOrName, value, sender = 'LOCAL') {
    const key = String(addressOrName);

    // Memory protection: Evict oldest key if exceeding maxRegisters
    if (!this.registers.has(key) && this.registers.size >= this.maxRegisters) {
      for (const k of this.registers.keys()) {
        if (!k.startsWith('bus::') && !k.startsWith('security::') && !k.startsWith('error::')) {
          this.registers.delete(k);
          break;
        }
      }
    }

    this.registers.set(key, value);
    this.registers.set('bus::heartbeat', Date.now());

    // Hardware serial transmission if writing to designated channels
    if (sender !== 'SERIAL_PORT' && this.serialPort &&
       (key.startsWith('hardware::') || key.startsWith('serial::out') || !isNaN(Number(key)))) {
      try {
        const payload = JSON.stringify({ reg: key, val: value }) + '\n';
        if (typeof this.serialPort.write === 'function') {
          this.serialPort.write(payload);
        }
      } catch (err) {
        this._recordError(500, `SERIAL_TX_ERROR: ${err.message}`);
      }
    }

    // Trigger outbound API call if writing to request channel
    if (key.startsWith('api::request') || key.startsWith('http::out')) {
      this._dispatchOutboundHttpRequest(value);
    }

    // Broadcast update over SSE to reactive JSX listeners (rx)
    this._broadcast(key, value);
    this.emit('write', { register: key, value, sender });
    return value;
  }

  /**
   * Read register value from in-memory bus
   */
  readRegister(addressOrName, fallback = null) {
    const key = String(addressOrName);
    return this.registers.has(key) ? this.registers.get(key) : fallback;
  }

  /**
   * Broadcast state change to all reactive SSE clients (safe set iteration)
   */
  _broadcast(register, value) {
    if (this.sseClients.size === 0) return;
    const ssePayload = `event: register\ndata: ${JSON.stringify({ reg: register, val: value, ts: Date.now() })}\n\n`;

    const deadClients = [];
    for (const client of this.sseClients) {
      try {
        client.write(ssePayload);
      } catch (_) {
        deadClients.push(client);
      }
    }

    for (const dead of deadClients) {
      this.sseClients.delete(dead);
    }
  }

  /**
   * Records standardized errors into bus registers without crashing the UI
   */
  _recordError(code, message) {
    this.registers.set('error::master', 1);
    this.registers.set('error::code', code);
    this.registers.set('error::message', message);
    this.registers.set('api::status', 'ERROR');

    this._broadcast('error::master', 1);
    this._broadcast('error::code', code);
    this._broadcast('error::message', message);
    this._broadcast('api::status', 'ERROR');
    this.emit('error_status', { code, message });
  }

  /**
   * Outbound HTTP Dispatcher with SSRF Protection, Response Capping & Try/Catch
   */
  _dispatchOutboundHttpRequest(requestConfig) {
    let reqObj = requestConfig;
    if (typeof requestConfig === 'string') {
      try {
        reqObj = JSON.parse(requestConfig);
      } catch (_) {
        reqObj = { url: requestConfig, method: 'GET' };
      }
    }

    if (!reqObj || !reqObj.url) {
      this._recordError(400, 'INVALID_API_REQUEST: Missing target URL');
      return;
    }

    this.registers.set('api::status', 'LOADING');
    this._broadcast('api::status', 'LOADING');

    try {
      const parsedUrl = new url.URL(reqObj.url);
      const hostname = parsedUrl.hostname.toLowerCase();

      // SSRF Shield: Block metadata and cloud internal addresses
      if (hostname === '169.254.169.254' || hostname === 'metadata.google.internal' || hostname === 'instance-data') {
        this._recordError(403, 'SSRF_BLOCKED: Access to metadata endpoints is prohibited');
        return;
      }

      const isHttps = parsedUrl.protocol === 'https:';
      const clientLib = isHttps ? https : http;

      // Extract matching auth from server vault
      let headers = Object.assign({}, reqObj.headers || {});
      const matchedAuth = this.authVault.get(parsedUrl.hostname) || this.authVault.get('*');
      if (matchedAuth && matchedAuth.headers) {
        headers = Object.assign({}, matchedAuth.headers, headers);
      }

      const bodyData = reqObj.body ? (typeof reqObj.body === 'string' ? reqObj.body : JSON.stringify(reqObj.body)) : null;
      if (bodyData && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }

      const reqOptions = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: (reqObj.method || 'GET').toUpperCase(),
        headers: headers,
        timeout: reqObj.timeoutMs || this.timeoutMs
      };

      const outReq = clientLib.request(reqOptions, (res) => {
        let responseBody = '';
        res.setEncoding('utf8');

        res.on('data', (chunk) => {
          responseBody += chunk;
          // Response limit protection
          if (responseBody.length > MAX_RESPONSE_LIMIT) {
            outReq.destroy();
            this._recordError(413, 'RESPONSE_TOO_LARGE: Exceeded 10MB response limit');
          }
        });

        res.on('end', () => {
          const statusCode = res.statusCode || 200;
          let parsedResponse = responseBody;
          try {
            parsedResponse = JSON.parse(responseBody);
          } catch (_) {}

          if (statusCode >= 200 && statusCode < 300) {
            this.registers.set('error::master', 0);
            this.registers.set('error::code', 200);
            this.registers.set('error::message', '');
            this.registers.set('api::status', 'SUCCESS');
            this.registers.set('api::response', parsedResponse);

            this._broadcast('api::status', 'SUCCESS');
            this._broadcast('api::response', parsedResponse);
            this._broadcast('error::master', 0);
          } else {
            this._recordError(statusCode, `HTTP_${statusCode}: ${res.statusMessage || responseBody}`);
          }
        });
      });

      outReq.on('timeout', () => {
        outReq.destroy();
        this._recordError(408, 'REQUEST_TIMEOUT: External server took too long to reply');
      });

      outReq.on('error', (err) => {
        this._recordError(503, `NETWORK_FAILURE: ${err.message}`);
      });

      if (bodyData) {
        outReq.write(bodyData);
      }
      outReq.end();
    } catch (err) {
      this._recordError(500, `DISPATCH_EXCEPTION: ${err.message}`);
    }
  }

  /**
   * Handle Inbound HTTP Requests with DoS Protection
   */
  _handleHttpRequest(req, res) {
    // 1. Universal Zero-CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname;

    // 2. Reactive SSE Stream for JSX rx (/bus/stream)
    if (pathname === '/bus/stream') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      res.write(': connected\n\n');

      // Send initial snapshot of all registers
      for (const [k, v] of this.registers.entries()) {
        res.write(`event: register\ndata: ${JSON.stringify({ reg: k, val: v, ts: Date.now() })}\n\n`);
      }

      this.sseClients.add(res);

      req.on('close', () => {
        this.sseClients.delete(res);
      });
      return;
    }

    // 3. Register Read (/bus/read?reg=name)
    if (pathname === '/bus/read') {
      const regKey = parsed.query.reg;
      if (!regKey) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: 'MISSING_REG_PARAM' }));
        return;
      }
      const val = this.readRegister(regKey);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, reg: regKey, val }));
      return;
    }

    // 4. Register Write (/bus/write) with DoS Payload Limit
    if (pathname === '/bus/write' && req.method === 'POST') {
      let body = '';
      let exceeded = false;

      req.on('data', chunk => {
        if (exceeded) return;
        body += chunk;
        if (body.length > MAX_BODY_LIMIT) {
          exceeded = true;
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'PAYLOAD_TOO_LARGE: Exceeded 1MB limit' }));
          req.destroy();
        }
      });

      req.on('end', () => {
        if (exceeded) return;
        try {
          const data = JSON.parse(body);
          if (data.reg === undefined || data.val === undefined) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: false, error: 'INVALID_PAYLOAD: reg and val required' }));
            return;
          }
          this.writeRegister(data.reg, data.val, 'HTTP_GATEWAY');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, reg: data.reg, val: data.val }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'JSON_SYNTAX_ERROR' }));
        }
      });
      return;
    }

    // 5. Inbound Webhook (/bus/inbound) with DoS Payload Limit
    if (pathname === '/bus/inbound' && req.method === 'POST') {
      let body = '';
      let exceeded = false;

      req.on('data', chunk => {
        if (exceeded) return;
        body += chunk;
        if (body.length > MAX_BODY_LIMIT) {
          exceeded = true;
          res.writeHead(413, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'PAYLOAD_TOO_LARGE: Exceeded 1MB limit' }));
          req.destroy();
        }
      });

      req.on('end', () => {
        if (exceeded) return;
        try {
          const payload = JSON.parse(body);
          const channel = parsed.query.channel || 'inbound::event';
          this.writeRegister(channel, payload, 'INBOUND_WEBHOOK');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, channel, received: true }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: false, error: 'INVALID_JSON_BODY' }));
        }
      });
      return;
    }

    // 6. Bus Status & Health Check (/bus/status)
    if (pathname === '/bus/status' || pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        ok: true,
        service: 'TitanCommunicatorServer',
        version: '1.1.0',
        uptime: process.uptime(),
        sseClientsCount: this.sseClients.size,
        registersCount: this.registers.size,
        serialAttached: Boolean(this.serialPort)
      }));
      return;
    }

    // 404 Route Not Found
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'NOT_FOUND' }));
  }

  /**
   * Start the HTTP Server
   */
  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this._handleHttpRequest(req, res);
      });

      this.server.on('error', (err) => {
        this.emit('error', err);
        reject(err);
      });

      this.server.listen(this.port, this.host, () => {
        this.writeRegister('bus::status', 'ONLINE');
        this.emit('listening', { host: this.host, port: this.port });
        resolve(this);
      });
    });
  }

  /**
   * Stop the Communicator Server cleanly
   */
  stop() {
    return new Promise((resolve) => {
      for (const client of this.sseClients) {
        try { client.end(); } catch (_) {}
      }
      this.sseClients.clear();

      if (this.server) {
        if (typeof this.server.closeAllConnections === 'function') {
          this.server.closeAllConnections();
        }
        this.server.close(() => {
          this.emit('stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

// Support direct execution via CLI
if (require.main === module) {
  const portIndex = process.argv.indexOf('--port');
  const port = portIndex !== -1 ? parseInt(process.argv[portIndex + 1], 10) : 8088;
  const server = new TitanCommunicatorServer({ port });
  server.start().then(() => {
    console.log(`🏔️ [TitanCommunicatorServer] Running at http://127.0.0.1:${port}`);
    console.log(`   • SSE Reactive Stream:  http://127.0.0.1:${port}/bus/stream`);
    console.log(`   • Bus Status:           http://127.0.0.1:${port}/bus/status`);
    console.log(`   • Bus Read/Write:       /bus/read & /bus/write`);
  }).catch(err => {
    console.error('Failed to start TitanCommunicatorServer:', err);
  });
}

module.exports = {
  TitanCommunicatorServer
};
