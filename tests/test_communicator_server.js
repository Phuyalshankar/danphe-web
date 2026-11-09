'use strict';

/**
 * 🏔️ TEST SUITE: TitanCommunicatorServer
 * Tests the lightweight, zero-dependency, zero-CORS bidirectional gateway bridge.
 */

const http = require('http');
const { EventEmitter } = require('events');
const { TitanCommunicatorServer } = require('../src/runtime/TitanCommunicatorServer');

let passed = 0;
let failed = 0;
const TEST_PORT = 18088;
const MOCK_API_PORT = 18089;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`);
    passed++;
  } else {
    console.error(`  ❌ ${message}`);
    failed++;
  }
}

// Helper to make simple HTTP requests in test
function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data,
          json: () => {
            try { return JSON.parse(data); } catch (_) { return null; }
          }
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

// Create a mock external target server to test token injection and API dispatching
function createMockExternalApi() {
  return new Promise((resolve) => {
    const mockServer = http.createServer((req, res) => {
      if (req.url === '/api/profile') {
        const auth = req.headers['authorization'];
        if (auth === 'Bearer DANPHE_SECRET_TOKEN_123') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ name: 'Danphe User', role: 'Engineer' }));
        } else {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'UNAUTHORIZED' }));
        }
      } else if (req.url === '/api/error-test') {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'INTERNAL_SERVER_CRASH' }));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'NOT_FOUND' }));
      }
    });

    mockServer.listen(MOCK_API_PORT, '127.0.0.1', () => {
      resolve(mockServer);
    });
  });
}

async function runTests() {
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('🚀 RUNNING TEST: TitanCommunicatorServer (Danphe Web Gateway Bridge)');
  console.log('═══════════════════════════════════════════════════════════════════');

  const mockApi = await createMockExternalApi();
  const server = new TitanCommunicatorServer({ port: TEST_PORT });
  await server.start();

  try {
    // 1. Health & Status Check
    console.log('\n[TEST 1] Server Startup & Status Check');
    const statusRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/bus/status',
      method: 'GET'
    });
    const statusJson = statusRes.json();
    assert(statusRes.statusCode === 200, 'HTTP 200 returned from /bus/status');
    assert(statusJson.ok === true, 'Service reports ok: true');
    assert(statusJson.service === 'TitanCommunicatorServer', 'Correct service name reported');

    // 2. Zero-CORS Headers
    console.log('\n[TEST 2] Universal Zero-CORS Headers & OPTIONS');
    const optionsRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/bus/write',
      method: 'OPTIONS'
    });
    assert(optionsRes.statusCode === 204, 'Pre-flight OPTIONS returns 204 No Content');
    assert(optionsRes.headers['access-control-allow-origin'] === '*', 'CORS wildcard header present');

    // 3. Register Write and Read
    console.log('\n[TEST 3] Bus Write & Read');
    const writeRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/bus/write',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, { reg: 'theme::current', val: 'everest' });

    assert(writeRes.statusCode === 200, 'Register write returns 200 OK');
    assert(writeRes.json().val === 'everest', 'Written value confirmed in response');

    const readRes = await httpRequest({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/bus/read?reg=theme::current',
      method: 'GET'
    });
    assert(readRes.statusCode === 200, 'Register read returns 200 OK');
    assert(readRes.json().val === 'everest', 'Read value matches stored register value');

    // 4. Reactive SSE Stream Dispatch
    console.log('\n[TEST 4] Reactive SSE Stream (/bus/stream)');
    let sseReceivedValue = null;
    const sseReq = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path: '/bus/stream',
      method: 'GET'
    }, (res) => {
      res.on('data', (chunk) => {
        const text = chunk.toString('utf8');
        if (text.includes('counter::test')) {
          const match = text.match(/data: ({.*})/);
          if (match) {
            try {
              const data = JSON.parse(match[1]);
              sseReceivedValue = data.val;
            } catch (_) {}
          }
        }
      });
    });
    sseReq.end();

    // Allow SSE connection to settle
    await new Promise(r => setTimeout(r, 100));

    // Trigger write to bus
    server.writeRegister('counter::test', 42);

    await new Promise(r => setTimeout(r, 150));
    assert(sseReceivedValue === 42, 'SSE stream received real-time register update without client fetch');
    sseReq.destroy();

    // 5. Simulated Physical Serial Port Bridge
    console.log('\n[TEST 5] Physical Serial Port Inbound/Outbound Bridge');
    class MockSerialPort extends EventEmitter {
      constructor() {
        super();
        this.written = [];
      }
      write(data) {
        this.written.push(data);
      }
    }
    const mockSerial = new MockSerialPort();
    server.attachSerialPort(mockSerial);
    assert(server.readRegister('serial::connected') === true, 'Serial port registered as connected');

    // Inbound: Simulate physical serial port sending sensor data
    mockSerial.emit('data', Buffer.from(JSON.stringify({ reg: 'sensor::temp', val: 26.8 })));
    assert(server.readRegister('sensor::temp') === 26.8, 'Inbound serial data parsed into register');

    // Outbound: Write to hardware register and check serial transmission
    server.writeRegister('hardware::led', 'ON');
    assert(mockSerial.written.length > 0, 'Hardware register write emitted to physical serial port');
    assert(mockSerial.written[0].includes('hardware::led'), 'Correct serial payload sent');

    // 6. Outbound API Dispatch & Auth Vault Token Injection
    console.log('\n[TEST 6] Outbound API Dispatcher & Auth Vault Token Injection');
    // Store secret token on server side
    server.setAuth('127.0.0.1', 'DANPHE_SECRET_TOKEN_123');

    // Trigger outbound API request via bus register
    server.writeRegister('api::request', {
      url: `http://127.0.0.1:${MOCK_API_PORT}/api/profile`,
      method: 'GET'
    });

    // Wait for async HTTP call to complete
    await new Promise(r => setTimeout(r, 200));

    const apiStatus = server.readRegister('api::status');
    const apiResponse = server.readRegister('api::response');
    assert(apiStatus === 'SUCCESS', 'Outbound API succeeded with auto-injected Bearer token');
    assert(apiResponse && apiResponse.name === 'Danphe User', 'API response securely populated on bus');

    // 7. Error Handling & Try/Catch Fault Tolerance
    console.log('\n[TEST 7] Fault Tolerance & Error Trapping (Try/Catch Safety)');
    server.writeRegister('api::request', {
      url: `http://127.0.0.1:${MOCK_API_PORT}/api/error-test`,
      method: 'GET'
    });

    await new Promise(r => setTimeout(r, 200));

    const errorMaster = server.readRegister('error::master');
    const errorCode = server.readRegister('error::code');
    const errorStatus = server.readRegister('api::status');

    assert(errorMaster === 1, 'Error master register flagged on HTTP 500 error');
    assert(errorCode === 500, 'Correct HTTP 500 error code captured');
    assert(errorStatus === 'ERROR', 'API status mapped to ERROR without crashing server');

    // 8. SSRF Shield Protection
    console.log('\n[TEST 8] SSRF Shield Protection');
    server.writeRegister('api::request', {
      url: 'http://169.254.169.254/latest/meta-data/',
      method: 'GET'
    });
    assert(server.readRegister('error::code') === 403, 'SSRF attack to 169.254.169.254 blocked with HTTP 403');
    assert(server.readRegister('error::message').includes('SSRF_BLOCKED'), 'Accurate SSRF_BLOCKED message recorded');

    // 9. Memory Protection & Key Bounding
    console.log('\n[TEST 9] Bounded Memory Register Store');
    const miniServer = new TitanCommunicatorServer({ maxRegisters: 12 });
    for (let i = 0; i < 20; i++) {
      miniServer.writeRegister(`test_key_${i}`, i);
    }
    assert(miniServer.registers.size <= 12, 'Register map size bounded to maxRegisters limit');

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('═══════════════════════════════════════════════════════════════════');

  } finally {
    await server.stop();
    mockApi.close();
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
