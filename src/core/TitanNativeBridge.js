'use strict';

/**
 * 🏔️ TITAN NATIVE BRIDGE (v2.0.0)
 * Hardware-Grade Direct Binary TCP & Memory Bridge
 * Part of titan-bus-client
 * 
 * • Zero-WebSocket overhead in Native / Desktop / C++ runtimes
 * • Direct Raw TCP Socket (Port 9092, Magic 0x5442, 16-Bit Registers)
 * • Seamless fallback to Browser WebSocket if running in plain browser
 * • Zero External npm Dependencies
 */

class TitanNativeBridge {
  constructor(engine, options = {}) {
    if (!engine) {
      throw new Error('TitanNativeBridge requires a TitanCircuitEngine instance');
    }

    this.engine = engine;
    this.options = options;
    this.port = options.port || 9092;
    this.host = options.host || '127.0.0.1';
    this.statusAddress = options.statusAddress !== undefined ? options.statusAddress : 98;
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectDelay = options.reconnectDelay || 2000;

    this.socket = null;
    this.mode = null; // 'RAW_TCP' | 'WEBSOCKET' | 'MEMORY'
    this.isConnected = false;
    this.reconnectTimer = null;

    // Attach to engine
    this.engine.remoteBridge = this;

    if (options.autoConnect !== false) {
      this.connect();
    }
  }

  connect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this._updateStatus('CONNECTING');

    // 1. Detect if Native TCP (Node.js / Electron / C++ sidecar) is available
    const isNode = typeof process !== 'undefined' && process.versions && process.versions.node;
    if (isNode) {
      try {
        const net = require('net');
        this.mode = 'RAW_TCP';
        this.socket = new net.Socket();

        this.socket.connect(this.port, this.host, () => {
          this.isConnected = true;
          this._updateStatus('CONNECTED_RAW_TCP');
          // Send Titan Protocol Magic Handshake: [0x54, 0x42, 0x02, 0x00] ('TB' v2)
          this.socket.write(Buffer.from([0x54, 0x42, 0x02, 0x00]));
        });

        this.socket.on('data', (chunk) => this._handleRawData(chunk));
        this.socket.on('close', () => this._handleClose());
        this.socket.on('error', (err) => this._handleError(err));
        return;
      } catch (e) {
        // Fallback
      }
    }

    // 2. Browser Environment: WebSocket fallback
    if (typeof WebSocket !== 'undefined') {
      this.mode = 'WEBSOCKET';
      const wsUrl = this.options.wsUrl || `ws://${this.host}:${this.port}`;
      try {
        this.socket = new WebSocket(wsUrl);
        this.socket.binaryType = 'arraybuffer';

        this.socket.onopen = () => {
          this.isConnected = true;
          this._updateStatus('CONNECTED_WS');
        };

        this.socket.onmessage = (event) => {
          if (event.data instanceof ArrayBuffer) {
            this._handleRawData(new Uint8Array(event.data));
          } else {
            try {
              const msg = JSON.parse(event.data);
              if (msg && msg.address !== undefined) {
                this.engine.tx(msg.address, msg.value, 'REMOTE_BRIDGE');
              }
            } catch (err) {}
          }
        };

        this.socket.onclose = () => this._handleClose();
        this.socket.onerror = (err) => this._handleError(err);
      } catch (err) {
        this._handleError(err);
      }
    }
  }

  /**
   * Transmit Register change to Remote Daemon
   */
  send(address, value) {
    if (!this.isConnected || !this.socket) return;

    const addr = Number(address);
    if (isNaN(addr)) return;

    if (this.mode === 'RAW_TCP') {
      // 6-Byte Hardware Packet: [Magic: 0x54, 0x42][Addr: UInt16BE][Val: UInt16BE]
      const buf = Buffer.alloc(6);
      buf.writeUInt8(0x54, 0);
      buf.writeUInt8(0x42, 1);
      buf.writeUInt16BE(addr, 2);
      buf.writeUInt16BE(typeof value === 'number' ? value : (value ? 1 : 0), 4);
      this.socket.write(buf);
    } else if (this.mode === 'WEBSOCKET') {
      if (this.socket.readyState === WebSocket.OPEN) {
        // Send as 6-byte binary ArrayBuffer
        const buf = new Uint8Array(6);
        buf[0] = 0x54; buf[1] = 0x42;
        buf[2] = (addr >> 8) & 0xFF; buf[3] = addr & 0xFF;
        const numVal = typeof value === 'number' ? value : (value ? 1 : 0);
        buf[4] = (numVal >> 8) & 0xFF; buf[5] = numVal & 0xFF;
        this.socket.send(buf.buffer);
      }
    }
  }

  _handleRawData(chunk) {
    // Process 6-byte Titan Packets
    const bytes = chunk instanceof Uint8Array ? chunk : new Uint8Array(chunk);
    let offset = 0;
    while (offset + 6 <= bytes.length) {
      if (bytes[offset] === 0x54 && bytes[offset + 1] === 0x42) {
        const addr = (bytes[offset + 2] << 8) | bytes[offset + 3];
        const val  = (bytes[offset + 4] << 8) | bytes[offset + 5];
        this.engine.tx(addr, val, 'REMOTE_BRIDGE');
        offset += 6;
      } else {
        offset++;
      }
    }
  }

  _handleClose() {
    this.isConnected = false;
    this._updateStatus('DISCONNECTED');
    if (this.autoReconnect && !this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => this.connect(), this.reconnectDelay);
    }
  }

  _handleError(err) {
    this._updateStatus('ERROR');
  }

  _updateStatus(status) {
    if (this.engine) {
      this.engine.tx(this.statusAddress, status, 'REMOTE_BRIDGE');
    }
  }

  disconnect() {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      if (this.mode === 'RAW_TCP') this.socket.destroy();
      else if (this.mode === 'WEBSOCKET') this.socket.close();
      this.socket = null;
    }
    this.isConnected = false;
    this._updateStatus('OFFLINE');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TitanNativeBridge;
}
if (typeof window !== 'undefined') {
  window.TitanNativeBridge = TitanNativeBridge;
}
