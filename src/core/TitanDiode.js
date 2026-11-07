'use strict';

/**
 * 🛡️ TITAN DIODE (v1.0.0)
 * Hardware-Grade Polyglot Error Barrier & Unidirectional Gate
 * Part of titan-bus-client
 * 
 * In electronics, a diode conducts current primarily in one direction (forward)
 * and blocks reverse-current / back-EMF / surges to protect delicate circuitry.
 * 
 * In Titan Micro-Bus:
 * 1. FORWARD GATE: Pipes sanitized data from ANY backend (Node, Python, C++, Kotlin)
 *    directly into the 16-Bit Register Plane (0x0000 - 0xFFFF).
 * 2. REVERSE BARRIER: Intercepts all network timeouts, 500 errors, crashes, and prevents
 *    them from exploding backwards into the UI or crashing the main render loop.
 * 3. ERROR TELEMETRY TAP: Unidirectionally routes caught surges safely to:
 *    • Register 90: Master Error Status / Toast Message
 *    • Register 99: Rich JSON Error Descriptor
 * 4. ZERO-ECHO LOOP PROTECTION: Tags packets with sender 'TITAN_DIODE' to prevent infinite loops.
 */

const net = typeof require !== 'undefined' ? (function() { try { return require('net'); } catch(e) { return null; } })() : null;

class TitanDiode {
  constructor(engineOrOptions = {}, options = {}) {
    if (engineOrOptions && typeof engineOrOptions.tx === 'function') {
      this.engine = engineOrOptions;
      this.options = options;
    } else {
      this.engine = null;
      this.options = engineOrOptions || {};
    }

    this.port = this.options.port || (typeof window !== 'undefined' ? 9093 : 9092);
    this.wsPort = this.options.wsPort || 9093;
    this.host = this.options.host || '127.0.0.1';
    this.errorAddress = this.options.errorAddress || 90;
    this.richErrorAddress = this.options.richErrorAddress || 99;
    this.statusAddress = this.options.statusAddress || 98;
    this.maxRetries = this.options.maxRetries || 5;

    this.socket = null;
    this.isConnected = false;
    this.bufferQueue = [];
    this.forwardHooks = new Map(); // address -> transform function

    if (this.options.autoConnect !== false && (net || typeof WebSocket !== 'undefined')) {
      this.connect();
    }
  }

  /**
   * Connect Diode to Titan Daemon (C++ Server / Port 9092)
   */
  connect() {
    if (net) {
      // Node.js Native Raw TCP Mode
      try {
        this.socket = new net.Socket();
        this.socket.connect(this.port, this.host, () => {
          this.isConnected = true;
          this._emitStatus('DIODE_ONLINE');
          this._flushQueue();
        });

        this.socket.on('data', (chunk) => this._onBinaryData(chunk));
        this.socket.on('close', () => {
          this.isConnected = false;
          this._emitStatus('DIODE_OFFLINE');
        });
        this.socket.on('error', (err) => this._catchSurge('TCP_SOCKET_ERROR', err));
        return;
      } catch (err) {
        this._catchSurge('TCP_CONNECT_FAIL', err);
      }
    } else if (typeof WebSocket !== 'undefined') {
      // Browser WebSocket Mode
      try {
        const wsUrl = `ws://${this.host}:${this.port}`;
        this.socket = new WebSocket(wsUrl);
        this.socket.binaryType = 'arraybuffer';

        this.socket.onopen = () => {
          this.isConnected = true;
          this._emitStatus('DIODE_ONLINE_WS');
          this._flushQueue();
        };

        this.socket.onmessage = (e) => {
          if (e.data instanceof ArrayBuffer) {
            this._onBinaryData(new Uint8Array(e.data));
          }
        };

        this.socket.onclose = () => {
          this.isConnected = false;
          this._emitStatus('DIODE_OFFLINE');
        };

        this.socket.onerror = (err) => this._catchSurge('WS_SOCKET_ERROR', err);
      } catch (err) {
        this._catchSurge('WS_CONNECT_FAIL', err);
      }
    }
  }

  /**
   * ⚡ FORWARD GATE — Transmit data safely through the Diode
   * Catches any data formatting / type error before it can harm the bus.
   */
  tx(address, value) {
    try {
      const addr = Number(address);
      if (isNaN(addr) || addr < 0 || addr > 65535) {
        throw new Error(`[TitanDiode] Invalid 16-bit register address: ${address}`);
      }

      // Apply forward hook transform if defined
      let finalVal = value;
      if (this.forwardHooks.has(addr)) {
        finalVal = this.forwardHooks.get(addr)(value);
      }

      // 1. Commit locally to client engine if attached (supports any type: string, object, number)
      if (this.engine) {
        this.engine.tx(addr, finalVal, 'TITAN_DIODE');
      }

      // 2. Binary packet only for numeric/boolean values — strings/objects stay local
      const isNumericPayload = typeof finalVal === 'number' || typeof finalVal === 'boolean';
      if (!isNumericPayload) return; // Non-numeric values stay in local bus only

      const numVal = typeof finalVal === 'boolean' ? (finalVal ? 1 : 0) : Math.round(finalVal);
      // Clamp to valid UInt16 range
      const clamped = Math.max(0, Math.min(65535, numVal));
      const packet = this._encodePacket(addr, clamped);

      if (this.isConnected && this.socket) {
        if (net && this.socket.write) {
          this.socket.write(packet);
        } else if (this.socket.send) {
          this.socket.send(packet.buffer || packet);
        }
      } else {
        // Buffer offline packet (up to 256 items)
        if (this.bufferQueue.length < 256) {
          this.bufferQueue.push(packet);
        }
      }
    } catch (err) {
      this._catchSurge('TX_FORWARD_ERROR', err, address);
    }
  }

  /**
   * 🛡️ REVERSE BARRIER (Surge Protection)
   * Catches errors, suppresses crashes, and pipes safely to Register 90/99
   */
  _catchSurge(context, err, addr = 0) {
    const errorMsg = err && err.message ? err.message : String(err);
    const errorPayload = {
      context,
      address: addr,
      message: errorMsg,
      timestamp: Date.now(),
      status: 'BLOCKED_BY_DIODE'
    };

    // Safely emit to error registers without throwing
    if (this.engine) {
      this.engine.tx(this.errorAddress, `⚠️ Diode Alert: ${errorMsg}`, 'TITAN_DIODE');
      this.engine.tx(this.richErrorAddress, errorPayload, 'TITAN_DIODE');
    }

    console.warn(`[🛡️ TitanDiode Surge Blocked] Context: ${context} | Addr: ${addr} | ${errorMsg}`);
  }

  _onBinaryData(chunk) {
    try {
      const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
      let offset = 0;
      while (offset < bytes.length) {
        // 1. 24-Byte Titan Binary Macro Packet ('TB' signature 0x5442) with optional payload
        if (offset + 24 <= bytes.length && bytes[offset] === 0x54 && bytes[offset + 1] === 0x42) {
          const payloadLen = ((bytes[offset + 12] << 24) | (bytes[offset + 13] << 16) | (bytes[offset + 14] << 8) | bytes[offset + 15]);
          const flags = bytes[offset + 22];
          const totalPacketLen = 24 + (payloadLen > 0 ? payloadLen : 0);

          if (payloadLen > 0 && offset + totalPacketLen <= bytes.length) {
            const payloadBytes = bytes.slice(offset + 24, offset + totalPacketLen);
            const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;
            const strPayload = decoder ? decoder.decode(payloadBytes) : String.fromCharCode.apply(null, payloadBytes);
            let parsedData = strPayload;
            if (flags & 0x01) { // TITAN_FLAG_JSON
              try { parsedData = JSON.parse(strPayload); } catch(e) {}
            }
            const regAddr = ((bytes[offset + 2] << 8) | bytes[offset + 3]) || 0;
            if (this.engine) {
              this.engine.tx(regAddr, parsedData, 'TITAN_DIODE');
            }
            offset += totalPacketLen;
            continue;
          }
        }

        // 2. 6-Byte Micro SISO Stream ('SI' signature 0x5349 OR 'TB' signature 0x5442)
        const isSisoMagic = (bytes[offset] === 0x53 && bytes[offset + 1] === 0x49) ||
                            (bytes[offset] === 0x54 && bytes[offset + 1] === 0x42);
        if (offset + 6 <= bytes.length && isSisoMagic) {
          const addr = (bytes[offset + 2] << 8) | bytes[offset + 3];
          const val  = (bytes[offset + 4] << 8) | bytes[offset + 5];
          if (this.engine) {
            this.engine.tx(addr, val, 'TITAN_DIODE');
          }
          offset += 6;
          continue;
        }

        // 3. 7-Byte Secure SISO Stream ('SS' signature 0x5353)
        if (offset + 7 <= bytes.length && bytes[offset] === 0x53 && bytes[offset + 1] === 0x53) {
          const token = bytes[offset + 2];
          const rawReg = (bytes[offset + 3] << 8) | bytes[offset + 4];
          const rawVal = (bytes[offset + 5] << 8) | bytes[offset + 6];
          const addr = rawReg ^ (token | (token << 8));
          const val  = rawVal ^ (token | (token << 8));
          if (this.engine) {
            this.engine.tx(addr, val, 'TITAN_DIODE');
          }
          offset += 7;
          continue;
        }

        offset++;
      }
    } catch (err) {
      this._catchSurge('RX_DECODE_ERROR', err);
    }
  }

  _encodePacket(addr, val, magic = 0x5349) {
    // 6-Byte Hardware Micro SISO Packet: [Magic: UInt16BE][Addr: UInt16BE][Val: UInt16BE]
    const buf = new Uint8Array(6);
    buf[0] = (magic >> 8) & 0xFF; buf[1] = magic & 0xFF;
    buf[2] = (addr >> 8) & 0xFF;  buf[3] = addr & 0xFF;
    buf[4] = (val >> 8) & 0xFF;   buf[5] = val & 0xFF;
    return buf;
  }

  _flushQueue() {
    while (this.bufferQueue.length > 0 && this.isConnected && this.socket) {
      const pkt = this.bufferQueue.shift();
      if (net && this.socket.write) this.socket.write(pkt);
      else if (this.socket.send) this.socket.send(pkt.buffer || pkt);
    }
  }

  _emitStatus(status) {
    if (this.engine) {
      this.engine.tx(this.statusAddress, status, 'TITAN_DIODE');
    }
  }

  hook(address, transformFn) {
    this.forwardHooks.set(Number(address), transformFn);
    return this;
  }

  disconnect() {
    this.isConnected = false;
    if (this.socket) {
      if (this.socket.destroy) this.socket.destroy();
      else if (this.socket.close) this.socket.close();
      this.socket = null;
    }
    this._emitStatus('DIODE_OFFLINE');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TitanDiode;
}
if (typeof window !== 'undefined') {
  window.TitanDiode = TitanDiode;
}
