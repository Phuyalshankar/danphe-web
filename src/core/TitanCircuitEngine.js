'use strict';

/**
 * 🏔️ TITAN CIRCUIT ENGINE (v1.0.0)
 * World-Class Hookless Circuit & Event Bus Client
 * Zero-Overhead • 60/120 FPS Gestures • Dual Physical-Virtual Parity
 */

// 🌟 Titan-Bus Core Engine Integration
let TitanBusEngine = null;
let TitanDeclarativeEngine = null;
if (typeof require !== 'undefined') {
  try {
    const microBus = require('./TitanMicroBus');
    TitanBusEngine = microBus.TitanMicroBus;
    TitanDeclarativeEngine = microBus.TitanDeclarative;
  } catch (e) {
    try {
      const titanPkg = require('everest-bus');
      TitanBusEngine = titanPkg.TitanMicroBus || titanPkg.EverestBus;
      TitanDeclarativeEngine = titanPkg.TitanDeclarative || titanPkg.EverestDeclarative;
    } catch (err) {
      TitanBusEngine = null;
    }
  }
}

class TitanCircuitEngine {
  constructor(circuit = {}, options = {}) {
    this.circuit = circuit;
    this.options = options;
    this.bus = options.bus || TitanBusEngine;
    this.state = new Map();             // Address / Node -> current value
    this.listeners = new Map();         // Target -> Set of callback functions
    this.domBindings = new Map();       // Node Name -> DOM Element
    this.notifications = [];
    this._intervals = [];               // Track all setInterval IDs for cleanup
    this.maxHops = options.maxHops || 16;
    this.activeRoute = 'home';
    this.isBusSyncing = false;
    this.remoteBridge = options.remoteBridge || null;
    this.strictAddresses = Boolean(options.strictAddresses);
    this.allowedAddresses = null;
    if (options.addresses && typeof options.addresses === 'object') {
      this.allowedAddresses = new Set();
      for (const [k, v] of Object.entries(options.addresses)) {
        this.allowedAddresses.add(String(k));
        this.allowedAddresses.add(String(v));
        if (typeof v === 'number') this.allowedAddresses.add(v);
      }
    }
    this.init();
    if (options.remote) {
      this.connectRemote(options.remote);
    }
  }

  init() {
    // 1. Register all nodes from the circuit
    for (const [nodeName, config] of Object.entries(this.circuit)) {
      const addr = config.address ?? config.id;
      if (addr !== undefined) {
        this.state.set(String(addr), config.initialValue ?? null);
      }
      this.state.set(nodeName, config.initialValue ?? null);

      // If tied to Titan Bus register (numeric address)
      if (typeof addr === 'number' && this.bus) {
        this.bus.subscribe(addr, (val) => {
          if (this.isBusSyncing) return;
          this.isBusSyncing = true;
          try {
            this.emit(nodeName, val, 'TITAN_BUS_HARDWARE', 0);
          } finally {
            this.isBusSyncing = false;
          }
        });
      }

      // If routine interval is specified (Timer / Auto-save)
      if (typeof config.interval === 'number' && typeof config.run === 'function') {
        const intervalId = setInterval(async () => {
          try {
            const res = await config.run({ bus: this.bus, state: this.state });
            if (config.tx) this.emit(config.tx, res, nodeName, 0);
          } catch (err) {
            this.handleError(err, nodeName);
          }
        }, config.interval);
        this._intervals.push(intervalId); // Track for cleanup in destroy()
      }
    }

    // Connect subscriptions (Node Name, Address, and explicit RX wires)
    for (const [nodeName, config] of Object.entries(this.circuit)) {
      // 1. Direct Node addressing
      this.subscribe(nodeName, (payload, sender, hop) => {
        this.processReceive(nodeName, payload, sender, hop);
      });

      // 2. Titan Register Address
      const addr = config.address ?? config.id;
      if (addr !== undefined && String(addr) !== nodeName) {
        this.subscribe(String(addr), (payload, sender, hop) => {
          this.processReceive(nodeName, payload, sender, hop);
        });
      }

      // 3. Explicit RX source wires
      if (config.rx !== undefined) {
        const sources = Array.isArray(config.rx) ? config.rx : [config.rx];
        for (const src of sources) {
          const sStr = String(src);
          if (sStr !== nodeName && sStr !== String(addr)) {
            this.subscribe(sStr, (payload, sender, hop) => {
              this.processReceive(nodeName, payload, sender, hop);
            });
          }
        }
      }
    }
  }

  /**
   * 📡 RX (Receive / Serial In) — Primary Hardware Method
   * Hooks a listener to a memory register or node.
   */
  rx(target, listener) {
    const key = String(target);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(listener);
    return () => this.unwire(key, listener);
  }

  // Aliases for compatibility
  subscribe(target, listener) { return this.rx(target, listener); }
  on(target, listener) { return this.rx(target, listener); }

  /**
   * 🔌 UNWIRE (Disconnect) — Removes a wire listener
   */
  unwire(target, listener) {
    const key = String(target);
    return this.listeners.get(key)?.delete(listener);
  }

  /**
   * 📡 TX (Transmit / Serial Out) — Primary Hardware Method
   * Transmits data to a memory register or target node.
   */
  tx(target, payload, sender = 'ANONYMOUS', hop = 0) {
    if (hop > this.maxHops) {
      console.warn(`[TitanRegister] Infinite loop prevented: exceeded ${this.maxHops} hops from ${sender}`);
      return;
    }

    // 🌟 Multi-Address Fanout Map: tx({ 10: 'page', 90: 'Toast', 2001: data })
    // Safe: only triggers when ALL keys are integer register addresses (0-65535)
    if (typeof target === 'object' && target !== null && !Array.isArray(target) && payload === undefined) {
      const _keys = Object.keys(target);
      if (_keys.length > 0 && _keys.every(k => { const n = Number(k); return Number.isInteger(n) && n >= 0 && n <= 65535; })) {
        for (const [t, p] of Object.entries(target)) {
          this.tx(Number(t), p, sender, hop);
        }
        return;
      }
    }

    const targets = Array.isArray(target) ? target : [target];
    for (const t of targets) {
      const key = String(t);

      // Strict Address Validation
      if (this.strictAddresses && this.allowedAddresses) {
        const isAllowed = this.allowedAddresses.has(t) || this.allowedAddresses.has(key) || t === 90 || t === 98 || t === 10;
        if (!isAllowed) {
          const err = new Error(`[TitanAddressGuardian] Strict Mode: Address "${t}" is not registered in the address map!`);
          this.handleError(err, key);
          continue;
        }
      }

      this.state.set(key, payload);

      // If target is a real numeric Titan Bus Register
      if (typeof t === 'number' && this.bus) {
        if (!this.isBusSyncing) {
          this.isBusSyncing = true;
          try {
            this.bus.write(t, payload);
          } finally {
            this.isBusSyncing = false;
          }
        }
      }

      // If this target is Register 10 (Page Router)
      if (t === 10 || key === '10' || key === 'ROUTE') {
        this.setRoute(String(payload));
      }

      // Notify RX listeners on this wire
      const subs = this.listeners.get(key);
      if (subs) {
        subs.forEach(fn => {
          try { fn(payload, sender, hop + 1); } catch (err) { this.handleError(err, key); }
        });
      }

      // Update DOM node if mounted
      this.updateDOM(key, payload);

      // Forward to remote daemon bridge if connected
      if (this.remoteBridge && sender !== 'REMOTE_BRIDGE') {
        this.remoteBridge.forward(t, payload);
      }
    }
  }

  // Alias for compatibility
  emit(target, payload, sender = 'ANONYMOUS', hop = 0) {
    return this.tx(target, payload, sender, hop);
  }

  /**
   * ⚡ SERIAL WRITE — Direct Memory-Mapped Register Write
   */
  serialWrite(address, val) {
    this.tx(address, val, 'SERIAL_WRITE');
    return val;
  }
  write(address, val) { return this.serialWrite(address, val); }

  /**
   * ⚡ SERIAL READ — Direct Memory-Mapped Register Read
   */
  serialRead(address, defaultValue = null) {
    const key = String(address);
    if (this.state.has(key)) return this.state.get(key);
    if (this.bus && typeof this.bus.read === 'function') {
      return this.bus.read(address, defaultValue);
    }
    return defaultValue;
  }
  read(address, defaultValue = null) { return this.serialRead(address, defaultValue); }

  readInt(address, defaultValue = 0) {
    const val = this.read(address);
    if (val === null || val === undefined || val === '') return defaultValue;
    const num = Number(val);
    return isNaN(num) ? defaultValue : Math.trunc(num);
  }

  /**
   * 🌟 1. Discrete Bit (0 or 1 / 1-Bit Boolean) — Titan-Bus Rule
   * Coerced for Buttons, Relays, Flashlight, Camera Power, Lock/Unlock
   */
  writeBit(addr, val, silent = false) {
    const bit = (val === true || val === 1 || val === '1' || val === 'on') ? 1 : 0;
    this.tx(addr, bit, 'CIRCUIT_WRITE_BIT');
    if (this.bus && typeof this.bus.writeBit === 'function') {
      this.bus.writeBit(Number(addr), bit, silent);
    }
    return bit;
  }

  readBit(addr, defaultVal = 0) {
    if (this.bus && typeof this.bus.readBit === 'function') {
      return this.bus.readBit(Number(addr), defaultVal);
    }
    const val = this.read(addr);
    if (val === null || val === undefined || val === '') return defaultVal ? 1 : 0;
    return (val === true || val === 1 || val === '1' || val === 'on') ? 1 : 0;
  }

  /**
   * 🌟 2. Analog Byte (0 - 255 / uint8) — Titan-Bus Rule
   * Auto-clamped for Sliders, Volume, Brightness, PWM, and Scrubbers
   */
  writeAnalog(addr, val, silent = false) {
    let num = Number(val);
    if (isNaN(num)) num = 0;
    const clamped = Math.max(0, Math.min(255, Math.round(num)));
    this.tx(addr, clamped, 'CIRCUIT_WRITE_ANALOG');
    if (this.bus && typeof this.bus.writeAnalog === 'function') {
      this.bus.writeAnalog(Number(addr), clamped, silent);
    }
    return clamped;
  }

  readAnalog(addr, defaultVal = 0) {
    if (this.bus && typeof this.bus.readAnalog === 'function') {
      return this.bus.readAnalog(Number(addr), defaultVal);
    }
    const val = this.read(addr);
    if (val === null || val === undefined || val === '') return defaultVal;
    const num = Number(val);
    if (isNaN(num)) return defaultVal;
    return Math.max(0, Math.min(255, Math.round(num)));
  }

  /**
   * 🌟 3. Signed DSP Byte (-128 to +127 / int8) — Titan-Bus Rule
   * Auto-clamped for Stereo Pan, Balance, EQ, and Temperature
   */
  writeSigned(addr, val, silent = false) {
    let num = Number(val);
    if (isNaN(num)) num = 0;
    const clamped = Math.max(-128, Math.min(127, Math.round(num)));
    this.tx(addr, clamped, 'CIRCUIT_WRITE_SIGNED');
    if (this.bus && typeof this.bus.writeSigned === 'function') {
      this.bus.writeSigned(Number(addr), clamped, silent);
    }
    return clamped;
  }

  readSigned(addr, defaultVal = 0) {
    if (this.bus && typeof this.bus.readSigned === 'function') {
      return this.bus.readSigned(Number(addr), defaultVal);
    }
    const val = this.read(addr);
    if (val === null || val === undefined || val === '') return defaultVal;
    const num = Number(val);
    if (isNaN(num)) return defaultVal;
    return Math.max(-128, Math.min(127, Math.round(num)));
  }

  /**
   * 🌟 4. Analog Word (0 - 65,535 / uint16) — Titan-Bus Rule
   * Auto-clamped for Telemetry ADC, 4K Frames, Timelines
   */
  writeWord(addr, val, silent = false) {
    let num = Number(val);
    if (isNaN(num)) num = 0;
    const clamped = Math.max(0, Math.min(65535, Math.round(num)));
    this.tx(addr, clamped, 'CIRCUIT_WRITE_WORD');
    if (this.bus && typeof this.bus.writeWord === 'function') {
      this.bus.writeWord(Number(addr), clamped, silent);
    }
    return clamped;
  }

  readWord(addr, defaultVal = 0) {
    if (this.bus && typeof this.bus.readWord === 'function') {
      return this.bus.readWord(Number(addr), defaultVal);
    }
    const val = this.read(addr);
    if (val === null || val === undefined || val === '') return defaultVal;
    const num = Number(val);
    if (isNaN(num)) return defaultVal;
    return Math.max(0, Math.min(65535, Math.round(num)));
  }

  /**
   * 🌟 5. Emit 6-Byte Micro SISO Packet ('SI' 0x5349)
   */
  emitSiso(reg, value) {
    if (this.bus && typeof this.bus.emitSiso === 'function') {
      return this.bus.emitSiso(reg, value);
    }
    const buf = Buffer.alloc(6);
    buf.writeUInt16BE(0x5349, 0);
    buf.writeUInt16BE(Number(reg) & 0xFFFF, 2);
    buf.writeInt16BE(Number(value) || 0, 4);
    return buf;
  }

  /**
   * 🌟 6. Execute Declarative Action String or Object (TitanDeclarative)
   */
  executeAction(action) {
    if (TitanDeclarativeEngine && typeof TitanDeclarativeEngine.executeAction === 'function') {
      return TitanDeclarativeEngine.executeAction(action);
    }
    return false;
  }

  /**
   * 🌟 7. Emit 7-Byte Secure SISO Packet ('SS' 0x5353) with 8-Bit Rolling Token
   */
  emitSecureSiso(reg, value) {
    if (this.bus && typeof this.bus.emitSecureSiso === 'function') {
      return this.bus.emitSecureSiso(reg, value);
    }
    return null;
  }

  /**
   * 🌟 8. GPU 120 FPS Linear Interpolation (Lerp) Helper
   */
  lerpAnalog(current, target, factor = 0.2) {
    if (this.bus && typeof this.bus.lerpAnalog === 'function') {
      return this.bus.lerpAnalog(current, target, factor);
    }
    const c = Number(current) || 0;
    const t = Number(target) || 0;
    const f = Math.max(0, Math.min(1, Number(factor) || 0.2));
    const next = c + (t - c) * f;
    return Math.abs(t - next) < 0.2 ? t : Math.round(next * 100) / 100;
  }

  /**
   * 🛡️ Titan-Shield Security Methods
   */
  setSecuritySeed(seed) {
    if (this.bus && typeof this.bus.setSecuritySeed === 'function') {
      this.bus.setSecuritySeed(seed);
    }
  }

  setSecurityEnabled(enabled) {
    if (this.bus && typeof this.bus.setSecurityEnabled === 'function') {
      this.bus.setSecurityEnabled(enabled);
    }
  }

  isSecurityEnabled() {
    return this.bus && typeof this.bus.isSecurityEnabled === 'function' ? this.bus.isSecurityEnabled() : false;
  }

  computeRollingToken(epochSec) {
    return this.bus && typeof this.bus.computeRollingToken === 'function' ? this.bus.computeRollingToken(epochSec) : 0;
  }

  verifyToken(token, epochSec) {
    return this.bus && typeof this.bus.verifyToken === 'function' ? this.bus.verifyToken(token, epochSec) : false;
  }

  /**
   * 🚨 Error Subsystem (Registers 90 - 99)
   */
  reportError(err) {
    if (this.bus && typeof this.bus.reportError === 'function') {
      return this.bus.reportError(err);
    }
    this.handleError(err, 'REPORT_ERROR');
  }

  clearError() {
    if (this.bus && typeof this.bus.clearError === 'function') {
      this.bus.clearError();
    }
    this.tx(90, 0, 'CLEAR_ERROR');
  }

  /**
   * ⚡ Batch Register Update
   */
  writeBatch(regMap) {
    if (typeof regMap === 'object' && regMap !== null) {
      for (const [r, v] of Object.entries(regMap)) {
        this.write(Number(r) || r, v);
      }
    }
  }

  /**
   * ⚡ Fluent Actions
   */
  dial(ext) {
    if (TitanDeclarativeEngine && typeof TitanDeclarativeEngine.dial === 'function') {
      return TitanDeclarativeEngine.dial(ext);
    }
    this.tx(10, 'ActiveCall');
  }

  relay(relayId, state, pulse) {
    if (TitanDeclarativeEngine && typeof TitanDeclarativeEngine.relay === 'function') {
      return TitanDeclarativeEngine.relay(relayId, state, pulse);
    }
    this.writeBit(20000 + Number(relayId), state);
  }

  screen(name) {
    if (TitanDeclarativeEngine && typeof TitanDeclarativeEngine.screen === 'function') {
      return TitanDeclarativeEngine.screen(name);
    }
    this.tx(10, name);
  }

  show(text) {
    if (TitanDeclarativeEngine && typeof TitanDeclarativeEngine.show === 'function') {
      return TitanDeclarativeEngine.show(text);
    }
    this.tx(1010, text);
  }

  /**
   * 🔗 WIRE — Directly bridges two registers or nodes together
   */
  wire(source, destination, transform = (v) => v) {
    return this.rx(source, (data) => {
      this.tx(destination, transform(data), `WIRE_${source}`);
    });
  }

  /**
   * 🌐 CONNECT REMOTE — Connect this engine to a remote WebSocket server/daemon
   */
  connectRemote(urlOrOpts, extraOpts = {}) {
    const TitanRemoteBridge = require('./TitanRemoteBridge');
    const opts = typeof urlOrOpts === 'string' ? { url: urlOrOpts, ...extraOpts } : { ...urlOrOpts, ...extraOpts };
    this.remoteBridge = new TitanRemoteBridge(this, opts);
    return this.remoteBridge;
  }

  /**
   * 🔌 DISCONNECT REMOTE
   */
  disconnectRemote() {
    if (this.remoteBridge) {
      this.remoteBridge.disconnect();
      this.remoteBridge = null;
    }
  }

  /**
   * ⚡ TITAN API TRANSFORMER
   * Creates or returns a TitanApi instance wired directly to this register engine.
   */
  api(baseUrl = '', options = {}) {
    const TitanApi = require('./TitanApi');
    return new TitanApi(this, baseUrl, options);
  }

  processReceive(nodeName, payload, sender, hop) {
    if (sender === nodeName) return; // Prevent self-loop

    const config = this.circuit[nodeName] || {};
    const domNode = this.domBindings.get(nodeName);

    const context = {
      tx: (t, p) => this.tx(t ?? config.tx, p, nodeName, hop + 1),
      rx: (t, cb) => this.rx(t, cb),
      emit: (t, p) => this.tx(t ?? config.tx, p, nodeName, hop + 1),
      reply: (p) => this.tx(sender, p, nodeName, hop + 1),
      serialWrite: (addr, p) => this.serialWrite(addr, p),
      serialRead: (addr, d) => this.serialRead(addr, d),
      bus: this.bus,
      domNode,
      state: this.state
    };

    let result = payload;

    if (typeof config.onReceive === 'function') {
      try {
        const returned = config.onReceive(payload, context);
        if (returned !== undefined) result = returned;
      } catch (err) {
        this.handleError(err, nodeName);
        return;
      }
    }

    // Update state and DOM
    this.state.set(nodeName, result);
    this.updateDOM(nodeName, result);

    // If notification flag is active
    if (config.notify) {
      this.dispatchNotification(result);
    }

    // Cascade down to TX if defined (avoid self-echo & reflection)
    if (config.tx && result !== undefined) {
      const txTargets = Array.isArray(config.tx) ? config.tx : [config.tx];
      const validTargets = txTargets.filter(t => 
        String(t) !== nodeName && 
        String(t) !== String(config.address) && 
        String(t) !== String(sender)
      );
      if (validTargets.length > 0) {
        this.emit(validTargets, result, nodeName, hop + 1);
      }
    }
  }

  updateDOM(nodeKey, data) {
    const el = this.domBindings.get(nodeKey) || (typeof document !== 'undefined' ? document.getElementById(nodeKey) : null);
    if (!el || data === undefined || data === null) return;

    // 1. If it's a <form>, auto-populate child fields from object
    if (el.tagName === 'FORM' && typeof data === 'object') {
      for (const [key, val] of Object.entries(data)) {
        const input = el.elements?.[key];
        if (input) {
          if (input.type === 'checkbox') input.checked = Boolean(val);
          else input.value = val ?? '';
        }
      }
      return;
    }

    // 2. If it's a checkbox input
    if (el.type === 'checkbox') {
      el.checked = Boolean(data);
      return;
    }

    // 3. String, Number, or Boolean value
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
        el.value = String(data);
      } else if (el.tagName === 'IMG') {
        el.src = String(data);
      } else {
        el.textContent = String(data);
      }
    } else if (typeof data === 'object') {
      if (data.text !== undefined) el.textContent = String(data.text);
      if (data.html !== undefined) el.innerHTML = String(data.html);
      if (data.value !== undefined && 'value' in el) el.value = String(data.value);
      if (data.class) {
        el.className = typeof data.class === 'string' ? data.class : Object.values(data.class).join(' ');
      }
      if (data.style && typeof data.style === 'object') {
        Object.assign(el.style, data.style);
      }
      if (data.transform) {
        el.style.transform = data.transform;
      }
    }
  }

  setRoute(routeName) {
    this.activeRoute = routeName;
    if (typeof document !== 'undefined') {
      const routedElements = document.querySelectorAll('[route]');
      routedElements.forEach(el => {
        const targetRoute = el.getAttribute('route');
        if (targetRoute === routeName) {
          el.style.display = '';
          el.removeAttribute('hidden');
        } else {
          el.style.display = 'none';
          el.setAttribute('hidden', 'true');
        }
      });
    }
  }

  dispatchNotification(content) {
    const title = typeof content === 'object' ? content.title || 'Titan Notification' : 'Titan Alert';
    const body = typeof content === 'object' ? content.body || JSON.stringify(content) : String(content);

    this.notifications.push({ title, body, timestamp: Date.now() });

    // 1. In-App Toast event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('titan-toast', { detail: { title, body } }));

      // 2. Browser Desktop Notification
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(title, { body }); } catch (e) {}
      }
    }
  }

  handleError(err, source) {
    console.error(`[TitanCircuit Error] at ${source}:`, err);
    const errMsg = err?.message || String(err);

    if (this.bus && typeof this.bus.reportError === 'function') {
      this.bus.reportError({
        module: 100, // UI / Circuit Node
        code: 30,    // TITAN_ERR_UNCAUGHT
        severity: 'ERROR',
        message: errMsg,
        details: { source, stack: err?.stack }
      });
    } else if (this.bus) {
      this.bus.write(90, 1); // Master Error Flag = ACTIVE
      this.bus.write(93, 30); // Code 30 = Uncaught Error
      this.bus.write(99, { source, message: errMsg, time: Date.now() });
    }

    this.emit(90, { source, message: errMsg }, source, 0);
  }

  /**
   * ⚡ INTERNAL MOUNT — Mounts Titan-JSX Component directly to DOM
   */
  mount(vnode, container = '#root') {
    const TitanJSX = require('./TitanJSX');
    return TitanJSX.render(vnode, container, this);
  }

  /**
   * 🔌 Attach event listeners to DOM elements (Hookless Vanilla / React)
   */
  attachToDOM(container = (typeof document !== 'undefined' ? document : null)) {
    if (!container) return;

    for (const [nodeName, config] of Object.entries(this.circuit)) {
      const el = container.querySelector ? container.querySelector(`#${nodeName}, [data-titan="${nodeName}"]`) : null;
      if (!el) continue;

      this.domBindings.set(nodeName, el);

      const context = {
        tx: (t, p) => this.tx(t ?? config.tx, p, nodeName, 0),
        rx: (t, cb) => this.rx(t, cb),
        emit: (t, p) => this.tx(t ?? config.tx, p, nodeName, 0),
        serialWrite: (addr, p) => this.serialWrite(addr, p),
        serialRead: (addr, d) => this.serialRead(addr, d),
        bus: this.bus,
        state: this.state,
        loading: (isLoading) => {
          if (isLoading) el.setAttribute('data-loading', 'true');
          else el.removeAttribute('data-loading');
        }
      };

      // 1. Natural Payload Extractor
      const extractNaturalPayload = (targetEl) => {
        if (!targetEl) return true;
        if (targetEl.tagName === 'FORM') {
          try {
            if (typeof FormData !== 'undefined') {
              return Object.fromEntries(new FormData(targetEl));
            }
          } catch (e) {}
          return {};
        }
        if (targetEl.type === 'checkbox') return targetEl.checked;
        if (targetEl.type === 'range' || targetEl.type === 'number') {
          const num = Number(targetEl.value);
          return isNaN(num) ? targetEl.value : num;
        }
        if ('value' in targetEl && targetEl.value !== undefined) return targetEl.value;
        return true;
      };

      // 2. Smart Default Event Detector
      const getDefaultEvent = (targetEl) => {
        if (targetEl.tagName === 'FORM') return 'submit';
        if (targetEl.type === 'checkbox' || targetEl.tagName === 'SELECT') return 'change';
        if (targetEl.tagName === 'INPUT' || targetEl.tagName === 'TEXTAREA') return 'input';
        return 'click';
      };

      // 3. Check for explicit on* event handler functions
      const hasExplicitHandler = Object.keys(config).some(k => 
        typeof config[k] === 'function' && k !== 'onReceive' && k !== 'run'
      );

      // 4. 🚀 SMART TX TRANSCEIVER: Auto-bind if tx (or address) exists without manual boilerplate!
      const effectiveTx = config.tx ?? (config.address !== undefined ? config.address : null);
      if (effectiveTx !== null && !hasExplicitHandler && !config.drag && !config.zoom && !config.pan) {
        let txTarget = effectiveTx;
        let eventName = config.on || getDefaultEvent(el);
        let keyFilter = null;
        let staticVal = undefined;

        let isFanoutMap = false;

        if (typeof effectiveTx === 'object' && !Array.isArray(effectiveTx)) {
          if (effectiveTx.to || effectiveTx.address || effectiveTx.target) {
            txTarget = effectiveTx.to ?? effectiveTx.address ?? effectiveTx.target;
            eventName = effectiveTx.on ?? eventName;
            keyFilter = effectiveTx.key ?? null;
            staticVal = effectiveTx.value;
          } else {
            isFanoutMap = true;
          }
        }

        el.addEventListener(eventName, (e) => {
          if (el.tagName === 'FORM' && eventName === 'submit') {
            e.preventDefault?.();
          }
          if (keyFilter && e.key !== keyFilter) {
            return;
          }
          if (isFanoutMap) {
            this.tx(effectiveTx, undefined, nodeName, 0);
          } else {
            const payload = staticVal !== undefined ? staticVal : extractNaturalPayload(el);
            this.tx(txTarget, payload, nodeName, 0);
          }
        });
      }

      // 5. 🌐 UNIVERSAL JS DOM EVENT DISPATCHER (for explicit on* functions)
      const EVENT_MAP = {
        onClick: 'click',
        onDblClick: 'dblclick',
        onDoubleClick: 'dblclick',
        onChange: 'change',
        onInput: 'input',
        onKeyDown: 'keydown',
        onKeyUp: 'keyup',
        onKeyPress: 'keypress',
        onFocus: 'focus',
        onBlur: 'blur',
        onSubmit: 'submit',
        onMouseEnter: 'mouseenter',
        onMouseLeave: 'mouseleave',
        onMouseOver: 'mouseover',
        onMouseOut: 'mouseout',
        onMouseDown: 'mousedown',
        onMouseUp: 'mouseup',
        onContextMenu: 'contextmenu',
        onWheel: 'wheel',
        onTouchStart: 'touchstart',
        onTouchEnd: 'touchend',
        onTouchMove: 'touchmove',
        onPointerDown: 'pointerdown',
        onPointerUp: 'pointerup',
        onPointerMove: 'pointermove',
        onScroll: 'scroll',
        onCopy: 'copy',
        onPaste: 'paste'
      };

      for (const [prop, handler] of Object.entries(config)) {
        if (typeof handler !== 'function') continue;
        if (prop === 'onReceive' || prop === 'run') continue; // Circuit internals

        let domEvent = EVENT_MAP[prop];
        if (!domEvent && prop.startsWith('on') && prop.length > 2) {
          domEvent = prop.slice(2).toLowerCase();
        }

        if (domEvent) {
          el.addEventListener(domEvent, (e) => {
            if (el.tagName === 'FORM' && domEvent === 'submit') {
              e.preventDefault?.();
            }
            try {
              const naturalPayload = extractNaturalPayload(el);
              context.e = e;
              context.data = naturalPayload;
              context.val = naturalPayload;
              if (e) {
                e.data = naturalPayload;
                e.val = naturalPayload;
              }

              // Pass both naturalPayload and context
              const res = handler(naturalPayload, context);
              const handleResult = (val) => {
                if (val === undefined) return;
                if (config.tx) {
                  this.tx(config.tx, val, nodeName, 0);
                } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                  this.tx(val, undefined, nodeName, 0);
                }
              };

              if (res instanceof Promise) {
                res.then(handleResult).catch((err) => this.handleError(err, nodeName));
              } else {
                handleResult(res);
              }
            } catch (err) {
              this.handleError(err, nodeName);
            }
          });
        }
      }

      // 3. 🚀 Built-in Hard 60 FPS Drag Engine
      if (config.drag) {
        this.bindDrag(el, nodeName, config, context);
      }

      // 4. 🚀 Built-in Hard 60 FPS Zoom Engine
      if (config.zoom) {
        this.bindZoom(el, nodeName, config, context);
      }

      // 5. 🚀 Built-in Hard 60 FPS Pan Engine
      if (config.pan) {
        this.bindPan(el, nodeName, config, context);
      }
    }
  }

  bindDrag(el, nodeName, config, context) {
    const opts = typeof config.drag === 'object' ? config.drag : {};
    const axis = opts.axis || 'both'; // 'x', 'y', 'both'
    const snap = opts.snap || 1;

    let isDragging = false;
    let startX = 0, startY = 0;
    let currentX = 0, currentY = 0;

    el.style.touchAction = 'none';
    el.style.cursor = 'grab';

    el.addEventListener('pointerdown', (e) => {
      isDragging = true;
      startX = e.clientX - currentX;
      startY = e.clientY - currentY;
      el.setPointerCapture?.(e.pointerId);
      el.style.cursor = 'grabbing';
    });

    const onMove = (e) => {
      if (!isDragging) return;
      let nx = e.clientX - startX;
      let ny = e.clientY - startY;

      if (snap > 1) {
        nx = Math.round(nx / snap) * snap;
        ny = Math.round(ny / snap) * snap;
      }

      if (axis === 'x') currentX = nx;
      else if (axis === 'y') currentY = ny;
      else { currentX = nx; currentY = ny; }

      // 60/120 FPS GPU Transform
      el.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;

      const dragData = { x: currentX, y: currentY, nodeName };
      if (config.tx) this.emit(config.tx, dragData, nodeName, 0);
    };

    const onUp = (e) => {
      if (!isDragging) return;
      isDragging = false;
      el.releasePointerCapture?.(e.pointerId);
      el.style.cursor = 'grab';
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  bindZoom(el, nodeName, config, context) {
    const opts = typeof config.zoom === 'object' ? config.zoom : {};
    const min = opts.min ?? 0.1;
    const max = opts.max ?? 10.0;
    let scale = opts.initial ?? 1.0;

    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      scale = Math.min(max, Math.max(min, Math.round((scale + delta) * 100) / 100));

      el.style.transform = `scale(${scale})`;
      if (config.tx) this.emit(config.tx, { scale, nodeName }, nodeName, 0);
    }, { passive: false });
  }

  bindPan(el, nodeName, config, context) {
    let isPanning = false;
    let startX = 0, startY = 0;
    let panX = 0, panY = 0;

    el.addEventListener('pointerdown', (e) => {
      // Pan on middle mouse button or space+drag or direct drag
      if (e.button === 1 || e.shiftKey || config.pan === true) {
        isPanning = true;
        startX = e.clientX - panX;
        startY = e.clientY - panY;
        el.setPointerCapture?.(e.pointerId);
      }
    });

    window.addEventListener('pointermove', (e) => {
      if (!isPanning) return;
      panX = e.clientX - startX;
      panY = e.clientY - startY;

      el.style.transform = `translate(${panX}px, ${panY}px)`;
      if (config.tx) this.emit(config.tx, { panX, panY }, nodeName, 0);
    });

    window.addEventListener('pointerup', () => {
      isPanning = false;
    });
  }

  /**
   * 🧹 DESTROY — Clean up all intervals, listeners, and remote connections
   * Call this when the circuit engine is no longer needed to prevent memory leaks.
   */
  destroy() {
    // 1. Clear all tracked intervals
    for (const id of this._intervals) {
      clearInterval(id);
    }
    this._intervals = [];

    // 2. Clear all listeners
    this.listeners.clear();

    // 3. Disconnect remote bridge if connected
    this.disconnectRemote();

    // 4. Clear state and DOM bindings
    this.state.clear();
    this.domBindings.clear();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TitanCircuitEngine;
}
if (typeof window !== 'undefined') {
  window.TitanCircuitEngine = TitanCircuitEngine;
}
