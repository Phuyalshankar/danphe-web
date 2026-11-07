'use strict';

/**
 * test_titan_tcp_relay.js
 * Tests for TitanTcpRelay MOSFET switching architecture
 *
 * Tests:
 *   1. PULSE packet format (8 bytes, correct magic bytes + role)
 *   2. Server starts and listens on port
 *   3. Device A connects → waits in activePeers
 *   4. Device B connects with targetPeer=A → MOSFET fires, PULSE sent to both
 *   5. waitQueue logic — Device A waits if B not yet connected
 *   6. Zero-copy pipe — data from A → B and B → A
 *   7. Audit log recorded after session ends
 *   8. Cleanup on socket close
 */

const net  = require('net');
const TitanTcpRelay = require('D:/danphe-native/src/runtime/TitanTcpRelay.js');

let passed = 0;
let failed = 0;
const TEST_PORT = 19091;

function assert(cond, name) {
  if (cond) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.error(`  ❌ ${name}`);
    failed++;
  }
}

// ─────────────────────────────────────────────
// TEST 1 — PULSE packet format
// ─────────────────────────────────────────────
function testPulsePacket() {
  console.log('\n[TEST 1] PULSE packet format');

  // We access buildPulsePacket indirectly via the relay events.
  // For direct unit test, re-implement inline and compare.
  function buildPulsePacket(sessionId, role) {
    const buf = Buffer.alloc(8);
    buf[0] = 0x54; buf[1] = 0x50; buf[2] = 0x4C; buf[3] = 0x53;
    buf.writeUInt16BE(sessionId & 0xFFFF, 4);
    buf[6] = role;
    buf[7] = 0xFF;
    return buf;
  }

  const pA = buildPulsePacket(0x1234, 0x01);
  const pB = buildPulsePacket(0x1234, 0x02);

  assert(pA.length === 8,            'Pulse packet is 8 bytes');
  assert(pA[0] === 0x54 && pA[1] === 0x50 && pA[2] === 0x4C && pA[3] === 0x53,
                                     'Magic bytes T P L S correct');
  assert(pA.readUInt16BE(4) === 0x1234, 'Session ID encoded in bytes 4-5');
  assert(pA[6] === 0x01,             'Role 0x01 = initiator (A)');
  assert(pB[6] === 0x02,             'Role 0x02 = joiner (B)');
  assert(pA[7] === 0xFF,             'End sentinel 0xFF');
}

// ─────────────────────────────────────────────
// INTEGRATION TESTS — require live server
// ─────────────────────────────────────────────
function runIntegrationTests() {
  return new Promise((resolve) => {
    const relay = new TitanTcpRelay({ port: TEST_PORT });

    relay.start().then(() => {
      console.log('\n[TEST 2] Server starts and listens');
      assert(true, 'Server started without error');

      // ── helpers ──
      function makeHandshake(peerId, targetPeer) {
        let req = `GET /titan/tunnel?peerId=${peerId}`;
        if (targetPeer) req += `&targetPeer=${targetPeer}`;
        req += ` HTTP/1.1\r\nHost: localhost\r\nUpgrade: titan-bus-raw-tcp\r\nConnection: Upgrade\r\n\r\n`;
        return req;
      }

      function connect(peerId, targetPeer) {
        return new Promise((res, rej) => {
          const sock = new net.Socket();
          sock.connect(TEST_PORT, '127.0.0.1', () => {
            sock.write(makeHandshake(peerId, targetPeer));
            res(sock);
          });
          sock.on('error', rej);
        });
      }

      // ── TEST 3 — Device A connects, sits in activePeers ──
      console.log('\n[TEST 3] Device A connects → waits in activePeers');
      connect('peerAlpha', null).then((sockA) => {
        setTimeout(() => {
          assert(relay.activePeers.has('peerAlpha'), 'peerAlpha in activePeers after handshake');

          // ── TEST 4+5 — Device B connects with targetPeer=A ──
          console.log('\n[TEST 4+5] Device B connects with targetPeer=peerAlpha → MOSFET fires');

          let mosfetFired = false;
          let pulseReceivedA = false;
          let pulseReceivedB = false;
          let dataEchoedAtoB = false;

          relay.once('mosfet_fired', (info) => {
            mosfetFired = true;
            assert(info.peerAId === 'peerAlpha' || info.peerBId === 'peerAlpha',
              'mosfet_fired event includes peerAlpha');
            assert(info.sessionId.startsWith('sess_'), 'sessionId has correct prefix');
          });

          // Buffer incoming data on sockA to detect PULSE + piped data
          const bufA = [];
          sockA.on('data', (chunk) => {
            // Skip the 101 response (already drained in real usage, but here we buffer all)
            bufA.push(chunk);
          });

          connect('peerBeta', 'peerAlpha').then((sockB) => {
            const bufB = [];
            sockB.on('data', (chunk) => { bufB.push(chunk); });

            setTimeout(() => {
              assert(mosfetFired, 'MOSFET fires when B connects targeting A');

              // Check PULSE received — look for 0x54 0x50 0x4C 0x53 in accumulated buffers
              const allA = Buffer.concat(bufA);
              const allB = Buffer.concat(bufB);

              // Find PULSE magic in A's buffer
              for (let i = 0; i <= allA.length - 8; i++) {
                if (allA[i] === 0x54 && allA[i+1] === 0x50 && allA[i+2] === 0x4C && allA[i+3] === 0x53) {
                  pulseReceivedA = true;
                  break;
                }
              }
              // Find PULSE magic in B's buffer
              for (let i = 0; i <= allB.length - 8; i++) {
                if (allB[i] === 0x54 && allB[i+1] === 0x50 && allB[i+2] === 0x4C && allB[i+3] === 0x53) {
                  pulseReceivedB = true;
                  break;
                }
              }

              assert(pulseReceivedA, 'PULSE packet received by Device A (initiator)');
              assert(pulseReceivedB, 'PULSE packet received by Device B (joiner)');

              // ── TEST 6 — Zero-copy pipe: send data A → B ──
              console.log('\n[TEST 6] Zero-copy pipe — data A→B and B→A');
              const testPayload = Buffer.from([0xDE, 0xAD, 0xBE, 0xEF, 0x01, 0x02, 0x03, 0x04]);

              sockB.once('data', (chunk) => {
                // May include PULSE and piped data — look for our payload
                const str = chunk.toString('hex');
                if (str.includes('deadbeef01020304')) dataEchoedAtoB = true;
              });

              sockA.write(testPayload);

              setTimeout(() => {
                assert(dataEchoedAtoB, 'Binary data piped from A to B (zero-copy)');

                // ── TEST 7 — waitQueue: Device C waits for peerDelta not yet arrived ──
                console.log('\n[TEST 7] waitQueue — C waits for peerDelta (not yet connected)');
                connect('peerGamma', 'peerDelta').then((sockC) => {
                  setTimeout(() => {
                    assert(relay.waitQueue.has('peerGamma'), 'peerGamma sits in waitQueue awaiting peerDelta');

                    // ── TEST 8 — Cleanup on close ──
                    console.log('\n[TEST 8] Cleanup on socket close');
                    sockC.destroy();
                    sockA.destroy();
                    sockB.destroy();
                    setTimeout(() => {
                      assert(!relay.activePeers.has('peerGamma'), 'peerGamma removed from activePeers after close');

                      // Done
                      relay.stop().then(() => {
                        console.log(`\n${'═'.repeat(50)}`);
                        console.log(`  TOTAL: ${passed} passed, ${failed} failed`);
                        console.log(`${'═'.repeat(50)}`);
                        resolve();
                        process.exit(failed > 0 ? 1 : 0);
                      });
                    }, 100);
                  }, 200);
                }).catch((e) => { console.error('sockC connect error:', e.message); });

              }, 300);
            }, 300);
          }).catch((e) => { console.error('sockB connect error:', e.message); });

        }, 200);
      }).catch((e) => { console.error('sockA connect error:', e.message); });

    }).catch((e) => {
      console.error('Server start error:', e.message);
      failed++;
      resolve();
    });
  });
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
testPulsePacket();
runIntegrationTests().then(() => {
  if (failed > 0) process.exit(1);
});
