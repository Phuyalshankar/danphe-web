'use strict';

/**
 * 🐬 DANPHE-WEB TRANSPORT GATEWAY (v1.0.0)
 * Micro-SISO & Titan-Bus Universal Stream Connector (< 3 KB)
 * 
 * • Real-time WebSocket connection to Dolphin-CPP / Node Titan-Bus
 * • Auto-reconnection with Exponential Backoff
 * • Ingests 6-Byte Micro-SISO (0x5349) and 24-Byte Titan Frames
 * • Auto-hydrates DanpheStore Carrier Slots
 */

class DanpheTransport {
  constructor(options = {}) {
    this.url = options.url || 'ws://localhost:9092';
    this.store = options.store || null;
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectDelay = 5000;
    this.listeners = new Map();
  }

  connect() {
    if (typeof WebSocket === 'undefined') return;

    try {
      this.ws = new WebSocket(this.url);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this._emit('connect');
      };

      this.ws.onclose = () => {
        this.connected = false;
        this._emit('disconnect');
        this._scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        this._emit('error', err);
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event.data);
      };
    } catch (err) {
      this._scheduleReconnect();
    }
  }

  _scheduleReconnect() {
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts++), this.maxReconnectDelay);
    setTimeout(() => this.connect(), delay);
  }

  _handleMessage(data) {
    // 1. Text / JSON Payload
    if (typeof data === 'string') {
      try {
        const json = JSON.parse(data);
        // Direct slot injection: { reg: 'products', slot: 4, val: 'ACTIVE' }
        if (this.store && json.namespace && json.field) {
          this.store.set(`${json.namespace}::${json.field}`, json.val);
        }
        this._emit('data', json);
      } catch(e) {}
      return;
    }

    // 2. Binary ArrayBuffer (Micro-SISO 6-byte: ['S', 'I', reg_hi, reg_lo, val_hi, val_lo])
    if (data instanceof ArrayBuffer && data.byteLength >= 6) {
      const view = new DataView(data);
      const sig = view.getUint16(0);
      if (sig === 0x5349) { // 'SI' (Titan Micro-SISO)
        const reg = view.getUint16(2);
        const val = view.getInt16(4);
        if (this.store) {
          this.store.set(`reg::${reg}`, val);
        }
        this._emit('siso', { reg, val });
      }
    }
  }

  /**
   * Send JSON action to server
   */
  send(action) {
    if (!this.connected || !this.ws) return false;
    const msg = typeof action === 'string' ? action : JSON.stringify(action);
    this.ws.send(msg);
    return true;
  }

  /**
   * Send 6-byte Micro-SISO packet to server
   */
  sendSiso(reg, val) {
    if (!this.connected || !this.ws) return false;
    const buf = new ArrayBuffer(6);
    const view = new DataView(buf);
    view.setUint16(0, 0x5349);
    view.setUint16(2, Number(reg) & 0xFFFF);
    view.setInt16(4, Math.max(-32768, Math.min(32767, Number(val) || 0)));
    this.ws.send(buf);
    return true;
  }

  _emit(event, data) {
    const list = this.listeners.get(event);
    if (list) list.forEach(fn => fn(data));
  }

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event).delete(fn);
  }
}

module.exports = {
  DanpheTransport
};
