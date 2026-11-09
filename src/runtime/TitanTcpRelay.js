'use strict';

/**
 * ⚡ TITAN-TCP RELAY SERVER (TitanTcpRelay.js)
 * Standalone, zero-cloud, ultra-low-latency binary P2P relay server.
 *
 * MOSFET Switching Architecture:
 *   Device A ──TCP──▶ Switch Server ──PULSE──▶ Device A ("SWITCH ON")
 *   Device B ──TCP──▶ Switch Server ──PULSE──▶ Device B ("SWITCH ON")
 *                         │
 *                 [MOSFET GATE FIRES]
 *                         │
 *   Device A ◀═══════════════════════▶ Device B
 *            (zero-copy binary pipe, server stores NOTHING)
 *
 * Flow:
 *   1. Device sends TCP → server (HTTP 101 Upgrade: titan-bus-raw-tcp)
 *   2. Server registers peerId → waits in activePeers map
 *   3. When BOTH peers present → MOSFET fires → PULSE sent to both
 *   4. Full-duplex zero-copy pipe opened — server is just a wire
 *
 * Missing before: waitlist queue, PULSE packet, session token
 * Fixed in this version: all three added.
 */

const net = require('net');
const http = require('http');
const crypto = require('crypto');
const { EventEmitter } = require('events');

// ⚡ PULSE PACKET — 8 bytes sent to both devices when MOSFET fires
// Format: [0x54, 0x50, 0x4C, 0x53, sessionHi, sessionLo, roleA/B, 0xFF]
//          'T'   'P'   'L'   'S'   session_id(2B)         role     end
function buildPulsePacket(sessionId, role) {
  const buf = Buffer.alloc(8);
  buf[0] = 0x54; // 'T'
  buf[1] = 0x50; // 'P' (Titan Pulse)
  buf[2] = 0x4C; // 'L'
  buf[3] = 0x53; // 'S'
  buf.writeUInt16BE(sessionId & 0xFFFF, 4); // session low 16 bits
  buf[6] = role;  // 0x01 = initiator (A), 0x02 = joiner (B)
  buf[7] = 0xFF; // end sentinel
  return buf;
}

class TitanTcpRelay extends EventEmitter {
  constructor(options = {}) {
    super();
    this.port = options.port || 9091;
    this.host = options.host || '0.0.0.0';
    this.activePeers  = new Map(); // peerId -> { socket, targetPeer, connectedAt }
    this.waitQueue    = new Map(); // peerId -> { socket, targetPeer } — waiting for partner
    this.activeSessions = new Map(); // sessionId -> { peerA, peerB, startTime, bytes }
    this.auditLogs    = []; // Lightweight ~60-byte compliance session logs
    this.tcpServer    = null;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.tcpServer = net.createServer((socket) => {
        this._handleIncomingConnection(socket);
      });

      this.tcpServer.on('error', (err) => {
        this.emit('error', err);
        reject(err);
      });

      this.tcpServer.listen(this.port, this.host, () => {
        console.log(`📡 [TitanTcpRelay] Listening on ${this.host}:${this.port} (Binary Pipe + MOSFET HTTP 101)`);
        this.emit('listening', { host: this.host, port: this.port });
        resolve(this.tcpServer.address());
      });
    });
  }

  stop() {
    return new Promise((resolve) => {
      for (const [peerId, peer] of this.activePeers) {
        try { peer.socket.destroy(); } catch (_) {}
      }
      for (const [waiterId, waiter] of this.waitQueue) {
        try { waiter.socket.destroy(); } catch (_) {}
      }
      this.activePeers.clear();
      this.waitQueue.clear();
      this.activeSessions.clear();

      if (this.tcpServer) {
        this.tcpServer.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  _handleIncomingConnection(socket) {
    socket.once('data', (initialChunk) => {
      const headerStr = initialChunk.toString('latin1', 0, Math.min(initialChunk.length, 512));

      // ⚡ MOSFET TRIGGER: Check for HTTP 101 Switching Protocols
      if (headerStr.startsWith('GET /titan/tunnel') || headerStr.includes('Upgrade: titan-bus-raw-tcp')) {
        this._handleMosfetTrigger(socket, headerStr, initialChunk);
      } else {
        // Direct raw TCP SISO binary packet (0x5442 or 0x5349)
        this._handleRawBinarySocket(socket, initialChunk);
      }
    });

    socket.on('error', () => {
      this._cleanupSocket(socket);
    });

    socket.on('close', () => {
      this._cleanupSocket(socket);
    });
  }

  _handleMosfetTrigger(socket, headerStr, initialChunk) {
    // Extract peerId from URL params or headers
    let peerId = 'peer_' + Math.random().toString(36).substring(2, 9);
    const peerMatch = headerStr.match(/[?&]peerId=([a-zA-Z0-9_-]+)/);
    if (peerMatch) peerId = peerMatch[1];

    // Extract targetPeer if device already knows who to connect with
    const targetMatch = headerStr.match(/[?&]targetPeer=([a-zA-Z0-9_-]+)/);
    const targetPeerId = targetMatch ? targetMatch[1] : null;

    // ⚡ MOSFET TRIGGER RESPONSE: HTTP/1.1 101 Switching Protocols
    // This is the "gate opens" signal — device now switches to raw binary mode
    const response =
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: titan-bus-raw-tcp\r\n' +
      'Connection: Upgrade\r\n' +
      'X-Titan-Node: sovereign-relay\r\n' +
      `X-Titan-Peer: ${peerId}\r\n` +
      '\r\n';

    socket.write(response, 'latin1', () => {
      socket.__peerId     = peerId;
      socket.__targetPeer = targetPeerId;
      this.activePeers.set(peerId, { socket, targetPeerId, connectedAt: Date.now() });
      this.emit('peer_connected', { peerId, remoteAddress: socket.remoteAddress, remotePort: socket.remotePort });

      // ════════════════════════════════════════════════════════
      // MOSFET SWITCHING LOGIC
      // ════════════════════════════════════════════════════════
      if (targetPeerId) {
        // Case 1: targetPeer already waiting in activePeers → FIRE immediately
        const target = this.activePeers.get(targetPeerId);
        if (target && !target.socket.__bridged) {
          this._fireMosfet(peerId, targetPeerId);
        } else {
          // Case 2: targetPeer not yet arrived → join waitQueue
          this.waitQueue.set(peerId, { socket, targetPeerId });
          console.log(`⏳ [TitanTcpRelay] ${peerId} waiting for ${targetPeerId}...`);
        }
      } else {
        // Case 3: No target specified — check if someone in waitQueue is waiting for ME
        for (const [waiterId, waiter] of this.waitQueue) {
          if (waiter.targetPeerId === peerId) {
            this.waitQueue.delete(waiterId);
            this._fireMosfet(waiterId, peerId);
            return;
          }
        }
        // No one waiting — just sit in activePeers, available for anyone
      }
    });
  }

  _fireMosfet(peerAId, peerBId) {
    const entryA = this.activePeers.get(peerAId);
    const entryB = this.activePeers.get(peerBId);
    if (!entryA || !entryB) return;

    const socketA = entryA.socket;
    const socketB = entryB.socket;

    // Mark as bridged so we don't double-bridge
    socketA.__bridged = true;
    socketB.__bridged = true;

    const sessionNumeric = Date.now() & 0xFFFF;
    const sessionId = `sess_${Date.now()}_${peerAId}_${peerBId}`;

    // ════════════════════════════════════════════════════════
    // ⚡ SEND PULSE TO BOTH DEVICES — "SWITCH ON"
    // 8-byte pulse packet: both devices know the gate is open
    // ════════════════════════════════════════════════════════
    const pulseA = buildPulsePacket(sessionNumeric, 0x01); // 0x01 = initiator
    const pulseB = buildPulsePacket(sessionNumeric, 0x02); // 0x02 = joiner
    socketA.write(pulseA);
    socketB.write(pulseB);

    console.log(`⚡ [TitanTcpRelay] MOSFET FIRED! ${peerAId} ⟷ ${peerBId} | Session: ${sessionId}`);
    this.emit('mosfet_fired', { peerAId, peerBId, sessionId });

    // ════════════════════════════════════════════════════════
    // Zero-copy binary pipe — server becomes invisible wire
    // ════════════════════════════════════════════════════════
    const startTime = Date.now();
    let totalBytes = 0;

    socketA.on('data', (chunk) => { totalBytes += chunk.length; socketB.write(chunk); });
    socketB.on('data', (chunk) => { totalBytes += chunk.length; socketA.write(chunk); });

    let ended = false;
    const onEnd = () => {
      if (ended) return;
      ended = true;
      this.activeSessions.delete(sessionId);
      const durationSec = Math.round((Date.now() - startTime) / 1000);
      this._recordAuditLog({
        sessionId,
        peerA: peerAId,  peerB: peerBId,
        ipA: socketA.remoteAddress, ipB: socketB.remoteAddress,
        startTime: new Date(startTime).toISOString(),
        durationSec, totalBytes
      });
      console.log(`🔌 [TitanTcpRelay] Session ended: ${sessionId} | ${totalBytes}B in ${durationSec}s`);
    };

    socketA.once('close', onEnd);
    socketB.once('close', onEnd);

    this.activeSessions.set(sessionId, { peerAId, peerBId, startTime, totalBytesRef: () => totalBytes });
  }

  _handleRawBinarySocket(socket, initialChunk) {
    // Direct raw TCP SISO binary packet (non-HTTP fallback)
    // Magic: 0x5442 ('TB') or 0x5349 ('SI')
    const magic = initialChunk.length >= 2 ? initialChunk.readUInt16BE(0) : 0;
    let peerId = 'raw_' + Math.random().toString(36).substring(2, 9);

    socket.__peerId = peerId;
    this.activePeers.set(peerId, { socket, targetPeerId: null, connectedAt: Date.now() });
    this.emit('peer_connected', { peerId, rawBinary: true, magic });

    // In raw mode, if there's someone in waitQueue waiting for any connection, match them
    for (const [waiterId, waiter] of this.waitQueue) {
      this.waitQueue.delete(waiterId);
      this._fireMosfet(waiterId, peerId);
      return;
    }
  }

  _recordAuditLog(logEntry) {
    // Lawful Compliance / Telecom CDR entry (~60 bytes metadata, 0% media stored)
    this.auditLogs.push(logEntry);
    if (this.auditLogs.length > 5000) this.auditLogs.shift();
    this.emit('session_completed', logEntry);
  }

  _cleanupSocket(socket) {
    if (socket.__peerId) {
      this.activePeers.delete(socket.__peerId);
      this.waitQueue.delete(socket.__peerId);
      this.emit('peer_disconnected', { peerId: socket.__peerId });
    }
  }

  getAuditLogs() {
    return this.auditLogs;
  }
}

module.exports = TitanTcpRelay;
