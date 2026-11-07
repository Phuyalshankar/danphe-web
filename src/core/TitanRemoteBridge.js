'use strict';

/**
 * 🏔️ TITAN REMOTE BRIDGE (v1.0.0)
 * Hardware-grade Bidirectional WebSocket Bridge for Titan Micro-Bus
 * 
 * Bridges local client memory registers to remote Everest/Titan Daemon
 * • Zero-echo loop prevention (tagged with sender 'REMOTE_BRIDGE')
 * • Whitelist/Filter to keep local UI registers (0-99) private in memory
 * • Automatic reconnect with backoff
 * • Real-time status reporting on Register 98 (Default)
 * • Offline buffering: queues outgoing packets when connection drops
 */

class TitanRemoteBridge {
  constructor(engine, options = {}) {
    if (!engine) {
      throw new Error('TitanRemoteBridge requires a TitanRegisterEngine/TitanCircuitEngine instance');
    }

    this.engine = engine;
    this.options = options;
    this.url = options.url || 'ws://127.0.0.1:8080';
    this.statusAddress = options.statusAddress !== undefined ? options.statusAddress : 98;
    this.autoReconnect = options.autoReconnect !== false;
    this.reconnectDelay = options.reconnectDelay || 2000;
    this.WebSocketClass = options.WebSocket || (typeof WebSocket !== 'undefined' ? WebSocket : null);
    
    // Address filter: by default, forward addresses >= 100 (keep 0-99 UI/System registers local)
    if (typeof options.filter === 'function') {
      this.filter = options.filter;
    } else if (Array.isArray(options.filter)) {
      const allowedSet = new Set(options.filter.map(String));
      this.filter = (addr) => allowedSet.has(String(addr));
    } else if (typeof options.minAddress === 'number') {
      this.filter = (addr) => Number(addr) >= options.minAddress;
    } else {
      this.filter = (addr) => {
        const num = Number(addr);
        return !isNaN(num) ? num >= 100 : true; // forward >= 100 or non-numeric named channels
      };
    }

    this.socket = null;
    this.isConnected = false;
    this.isReconnecting = false;
    this.reconnectTimer = null;
    this.messageQueue = [];

    // Register this bridge with the engine
    this.engine.remoteBridge = this;

    if (options.autoConnect !== false && (this.url || options.socket)) {
      this.connect(this.url, options.socket);
    }
  }

  /**
   * Connect to WebSocket server or use custom socket
   */
  connect(url = this.url, customSocket = null) {
    this.url = url;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this._updateStatus('CONNECTING');

    if (customSocket) {
      this.socket = customSocket;
      this._setupSocketListeners();
      return this;
    }

    if (!this.WebSocketClass) {
      this._updateStatus('NO_WEBSOCKET_ENGINE');
      return this;
    }

    try {
      this.socket = new this.WebSocketClass(this.url);
      this._setupSocketListeners();
    } catch (err) {
      this._handleError(err);
    }

    return this;
  }

  _setupSocketListeners() {
    if (!this.socket) return;

    if (typeof this.socket.on === 'function') {
      // Node.js ws style
      this.socket.on('open', () => this._handleOpen());
      this.socket.on('message', (data) => this._handleMessage(data));
      this.socket.on('close', (code, reason) => this._handleClose(reason));
      this.socket.on('error', (err) => this._handleError(err));
    } else {
      // Standard Browser WebSocket style
      this.socket.onopen = () => this._handleOpen();
      this.socket.onmessage = (event) => this._handleMessage(event.data);
      this.socket.onclose = (event) => this._handleClose(event?.reason);
      this.socket.onerror = (err) => this._handleError(err);
    }
  }

  _handleOpen() {
    this.isConnected = true;
    this.isReconnecting = false;
    this._updateStatus('CONNECTED');

    // Flush offline queue
    while (this.messageQueue.length > 0 && this.isConnected) {
      const item = this.messageQueue.shift();
      this._sendRaw(item);
    }
  }

  _handleMessage(raw) {
    try {
      const text = typeof raw === 'string' ? raw : (raw.toString ? raw.toString() : String(raw));
      const packet = JSON.parse(text);

      if (packet && packet.address !== undefined) {
        // Ingest into local engine with sender = 'REMOTE_BRIDGE' so it doesn't loop back!
        this.engine.tx(packet.address, packet.payload, 'REMOTE_BRIDGE', 0);
      }
    } catch (err) {
      console.error('[TitanRemoteBridge] Failed to parse incoming remote packet:', err);
    }
  }

  _handleClose(reason) {
    this.isConnected = false;
    this._updateStatus('DISCONNECTED', { reason });

    if (this.autoReconnect && !this.isReconnecting) {
      this.isReconnecting = true;
      this.reconnectTimer = setTimeout(() => {
        this.connect(this.url);
      }, this.reconnectDelay);
    }
  }

  _handleError(err) {
    this._updateStatus('ERROR', { error: err?.message || String(err) });
  }

  _updateStatus(status, details = {}) {
    const payload = {
      status,
      url: this.url,
      timestamp: Date.now(),
      ...details
    };
    if (this.statusAddress !== null && this.engine) {
      this.engine.tx(this.statusAddress, payload, 'REMOTE_BRIDGE_STATUS', 0);
    }
  }

  /**
   * Forward local tx to remote socket
   */
  forward(address, payload) {
    if (!this.filter(address, payload)) {
      return false;
    }

    const packet = {
      type: 'tx',
      address,
      payload,
      timestamp: Date.now()
    };

    if (this.isConnected && this.socket) {
      this._sendRaw(packet);
    } else if (this.options.queueOffline !== false) {
      if (this.messageQueue.length > 250) this.messageQueue.shift(); // Bound memory
      this.messageQueue.push(packet);
    }
    return true;
  }

  _sendRaw(packet) {
    try {
      const str = JSON.stringify(packet);
      if (typeof this.socket.send === 'function') {
        this.socket.send(str);
      }
    } catch (err) {
      this._handleError(err);
    }
  }

  disconnect() {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        if (typeof this.socket.close === 'function') {
          this.socket.close();
        }
      } catch (e) {}
      this.socket = null;
    }
    this.isConnected = false;
    this._updateStatus('DISCONNECTED');
  }
}

module.exports = TitanRemoteBridge;
