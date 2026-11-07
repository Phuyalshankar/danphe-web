'use strict';

/**
 * ⚡ TITAN DIODE RELAY (TitanRelay.js)
 * High-Speed, Zero-Dependency Polyglot Relay: Raw TCP (Port 9092) ↔ WebSocket
 * Part of titan-bus-client
 * 
 * • ZERO external dependencies (uses Node.js built-in 'net', 'http', and 'crypto')
 * • Unifies:
 *   - Native C++ (Dolphin / DanpheOS) [Raw TCP 6-byte packets]
 *   - Python AI / PyTorch [Raw TCP 6-byte packets]
 *   - Kotlin / Android [Raw TCP 6-byte packets]
 *   - Browser UI / TitanJSX [Binary WebSocket RFC 6455]
 * • Hardware Protocol: [0x54, 0x42 (Magic 'TB')][Addr: UInt16BE][Val: UInt16BE]
 */

const net = require('net');
const http = require('http');
const crypto = require('crypto');

class TitanRelay {
  constructor(options = {}) {
    this.tcpPort = options.tcpPort || 9092;
    this.wsPort = options.wsPort || 9093;
    this.verbose = options.verbose !== false;

    this.tcpClients = new Set();
    this.wsClients = new Set();
    
    this.tcpServer = null;
    this.httpServer = null;

    // 16-Bit Register In-Memory Cache (0x0000 - 0xFFFF)
    this.registerMemory = new Uint16Array(65536);
    this.activeRegisters = new Set();
  }

  start() {
    return Promise.all([this._startTcpServer(), this._startWsServer()]).then(() => {
      if (this.verbose) {
        console.log(`\n=============================================================`);
        console.log(`🏔️  TITAN POLYGLOT DIODE RELAY IS RUNNING`);
        console.log(`   • Raw TCP Daemon (C++, Python, Kotlin):  Port ${this.tcpPort}`);
        console.log(`   • Browser WebSocket Bridge (TitanJSX):   Port ${this.wsPort}`);
        console.log(`   • Protocol: 6-byte Hardware Transceiver (0x5442 Magic)`);
        console.log(`=============================================================\n`);
      }
      return this;
    });
  }

  // ── 1. RAW TCP SERVER (For C++, Python, Kotlin) ───────────────────────────
  _startTcpServer() {
    return new Promise((resolve, reject) => {
      this.tcpServer = net.createServer((socket) => {
        this.tcpClients.add(socket);
        if (this.verbose) {
          console.log(`[🔌 TCP Client Connected] ${socket.remoteAddress}:${socket.remotePort}`);
        }

        // Send snapshot of all active registers to newly connected TCP client
        this._syncSnapshotToClient(socket, 'TCP');

        socket.on('data', (chunk) => {
          this._handleIncomingBinary(chunk, socket, 'TCP');
        });

        socket.on('error', (err) => {
          if (this.verbose) console.warn(`[TCP Error] ${err.message}`);
        });

        socket.on('close', () => {
          this.tcpClients.delete(socket);
          if (this.verbose) console.log(`[🔌 TCP Client Disconnected]`);
        });
      });

      this.tcpServer.on('error', reject);
      this.tcpServer.listen(this.tcpPort, () => resolve(this.tcpServer));
    });
  }

  // ── 2. ZERO-DEPENDENCY WEBSOCKET SERVER (RFC 6455 For Browser JSX) ────────
  _startWsServer() {
    return new Promise((resolve, reject) => {
      this.httpServer = http.createServer((req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Titan Polyglot WebSocket Relay Online\n');
      });

      this.httpServer.on('upgrade', (req, socket, head) => {
        const secWebSocketKey = req.headers['sec-websocket-key'];
        if (!secWebSocketKey) {
          socket.destroy();
          return;
        }

        // WebSocket RFC 6455 Handshake
        const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
        const hash = crypto.createHash('sha1').update(secWebSocketKey + GUID).digest('base64');

        const headers = [
          'HTTP/1.1 101 Switching Protocols',
          'Upgrade: websocket',
          'Connection: Upgrade',
          `Sec-WebSocket-Accept: ${hash}`
        ];
        socket.write(headers.join('\r\n') + '\r\n\r\n');

        this.wsClients.add(socket);
        if (this.verbose) {
          console.log(`[🌐 WebSocket Client (Browser) Connected]`);
        }

        // Send snapshot of all active registers to newly connected WebSocket client
        this._syncSnapshotToClient(socket, 'WS');

        // Listen for incoming frames from browser
        socket.on('data', (buffer) => {
          this._handleWsFrame(buffer, socket);
        });

        socket.on('error', (err) => {
          if (this.verbose) console.warn(`[WS Error] ${err.message}`);
        });

        socket.on('close', () => {
          this.wsClients.delete(socket);
          if (this.verbose) console.log(`[🌐 WebSocket Client Disconnected]`);
        });
      });

      this.httpServer.on('error', reject);
      this.httpServer.listen(this.wsPort, () => resolve(this.httpServer));
    });
  }

  /**
   * 🔄 Send entire register memory snapshot to newly connected client
   */
  _syncSnapshotToClient(socket, clientType) {
    if (this.activeRegisters.size === 0) return;
    try {
      const packets = [];
      for (const addr of this.activeRegisters) {
        const val = this.registerMemory[addr];
        const pkt = Buffer.alloc(6);
        pkt[0] = 0x54; pkt[1] = 0x42;
        pkt.writeUInt16BE(addr, 2);
        pkt.writeUInt16BE(val, 4);
        packets.push(pkt);
      }
      const combined = Buffer.concat(packets);
      if (clientType === 'TCP' && !socket.destroyed) {
        socket.write(combined);
      } else if (clientType === 'WS' && !socket.destroyed) {
        const frame = this._encodeWsBinaryFrame(combined);
        socket.write(frame);
      }
      if (this.verbose) {
        console.log(`[⚡ Snapshot Sync] Sent ${this.activeRegisters.size} registers to new ${clientType} client`);
      }
    } catch (err) {
      if (this.verbose) console.warn(`[!] Snapshot sync error: ${err.message}`);
    }
  }

  // ── 3. INCOMING BINARY PROCESSOR & BROADCASTER ───────────────────────────
  _handleIncomingBinary(chunk, sourceSocket, sourceType) {
    let offset = 0;
    while (offset < chunk.length) {
      const isTB = chunk[offset] === 0x54 && chunk[offset + 1] === 0x42; // 'TB' (0x5442)
      const isSI = chunk[offset] === 0x53 && chunk[offset + 1] === 0x49; // 'SI' (0x5349)
      const isSS = chunk[offset] === 0x53 && chunk[offset + 1] === 0x53; // 'SS' (0x5353)

      if (isTB || isSI || isSS) {
        let packetLen = isSS ? 7 : 6;

        // Check if this is a 24-byte Titan Binary Macro Packet with variable payload
        if (isTB && offset + 24 <= chunk.length) {
          const payloadLen = ((chunk[offset + 12] << 24) | (chunk[offset + 13] << 16) | (chunk[offset + 14] << 8) | chunk[offset + 15]);
          if (payloadLen >= 0 && payloadLen <= 65536 && (chunk[offset + 12] === 0 && chunk[offset + 13] === 0)) {
            packetLen = 24 + payloadLen;
          }
        }

        if (offset + packetLen > chunk.length) break;

        const packet = chunk.slice(offset, offset + packetLen);

        // Update in-memory register state for 6-byte micro SISO / direct packets
        if (packetLen === 6) {
          const addr = (chunk[offset + 2] << 8) | chunk[offset + 3];
          const val  = (chunk[offset + 4] << 8) | chunk[offset + 5];
          this.registerMemory[addr] = val;
          this.activeRegisters.add(addr);
        }

        // Broadcast to ALL other TCP clients (C++, Python, Kotlin)
        for (const tcpClient of this.tcpClients) {
          if (tcpClient !== sourceSocket && !tcpClient.destroyed) {
            try { tcpClient.write(packet); } catch(e) {}
          }
        }

        // Broadcast to ALL WebSocket clients (Browsers) as Binary Frames
        const wsFrame = this._encodeWsBinaryFrame(packet);
        for (const wsClient of this.wsClients) {
          if (wsClient !== sourceSocket && !wsClient.destroyed) {
            try { wsClient.write(wsFrame); } catch(e) {}
          }
        }

        offset += packetLen;
      } else {
        offset++;
      }
    }
  }

  // ── 4. RFC 6455 WEBSOCKET FRAME DECODER ───────────────────────────────────
  _handleWsFrame(buffer, socket) {
    if (buffer.length < 2) return;
    const firstByte = buffer[0];
    const secondByte = buffer[1];
    
    const opcode = firstByte & 0x0F;
    if (opcode === 0x08) { // Connection Close — send proper close frame back
      try { socket.write(Buffer.from([0x88, 0x00])); } catch(e) {}
      socket.destroy();
      return;
    }
    if (opcode === 0x09) { // Ping -> Send Pong
      socket.write(Buffer.from([0x8A, 0x00]));
      return;
    }

    const isMasked = (secondByte & 0x80) !== 0;
    let payloadLength = secondByte & 0x7F;
    let offset = 2;

    if (payloadLength === 126) {
      if (buffer.length < offset + 2) return; // Incomplete frame
      payloadLength = buffer.readUInt16BE(offset);
      offset += 2;
    } else if (payloadLength === 127) {
      // 64-bit payload length — read lower 32 bits (Titan packets are always 6 bytes, so safe)
      if (buffer.length < offset + 8) return; // Incomplete frame
      // We only support up to 4GB payloads; read as two 32-bit integers
      const hi = buffer.readUInt32BE(offset);
      const lo = buffer.readUInt32BE(offset + 4);
      payloadLength = hi * 0x100000000 + lo; // Correct: update payloadLength!
      offset += 8;
    }

    let maskKey = null;
    if (isMasked) {
      if (buffer.length < offset + 4) return; // Incomplete frame
      maskKey = buffer.slice(offset, offset + 4);
      offset += 4;
    }

    if (buffer.length < offset + payloadLength) return; // Incomplete frame

    const payload = buffer.slice(offset, offset + payloadLength);
    if (isMasked && maskKey) {
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4];
      }
    }

    // Process unmasked binary payload as 6-byte packets
    this._handleIncomingBinary(payload, socket, 'WS');
  }

  // ── 5. RFC 6455 WEBSOCKET BINARY FRAME ENCODER ───────────────────────────
  _encodeWsBinaryFrame(binaryData) {
    const len = binaryData.length;
    let header;
    if (len < 126) {
      header = Buffer.from([0x82, len]); // 0x82 = FIN + Binary Frame Opcode
    } else if (len <= 65535) {
      header = Buffer.alloc(4);
      header[0] = 0x82;
      header[1] = 126;
      header.writeUInt16BE(len, 2);
    } else {
      header = Buffer.alloc(10);
      header[0] = 0x82;
      header[1] = 127;
      header.writeBigUInt64BE(BigInt(len), 2);
    }
    return Buffer.concat([header, binaryData]);
  }

  stop() {
    if (this.tcpServer) this.tcpServer.close();
    if (this.httpServer) this.httpServer.close();
    for (const client of this.tcpClients) client.destroy();
    for (const client of this.wsClients) client.destroy();
    this.tcpClients.clear();
    this.wsClients.clear();
  }
}

module.exports = TitanRelay;
