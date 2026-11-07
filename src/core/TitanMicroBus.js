'use strict';

/**
 * 🏔️ EVEREST BUS / TITAN MICRO-BUS (Universal JS / Node / Dolphin Runtime)
 * Latest Update: Typed Analog Methods (writeAnalog, writeSigned, writeBit, writeWord, lerpAnalog)
 * ═════════════════════════════════════════════════════════════════════
 * 2-Byte UInt16 (0 - 65,535) Memory-Mapped Register Bus &
 * 24-Byte Binary Packet Highway.
 */

const { TITAN_TYPE, TitanTypeSystem } = require('./TitanTypeSystem');
const { TitanCodec, TitanVideoReassembler } = require('./TitanCodec');

const TITAN_SIGNATURE = 0x5442; // 'TB' (24-byte macro packet)
const TITAN_SISO_SIGNATURE = 0x5349; // 'SI' (6-byte micro SISO packet)
const TITAN_SISO_SECURE_SIGNATURE = 0x5353; // 'SS' (7-byte secure SISO packet with 8-bit rolling token)
const TITAN_VERSION = 0x02;
const TITAN_HEADER_SIZE = 24;
const TITAN_SISO_PACKET_LEN = 6;
const TITAN_SISO_SECURE_PACKET_LEN = 7;
const TITAN_DEFAULT_SECRET_SEED = 0xA596;

const TITAN_FLAG = {
  JSON: 0x01,
  ENCRYPTED: 0x02,
  AUTH_HEARTBEAT: 0x04
};

const CMD = {
  REGISTER:       0x08,
  REGISTER_ACK:   0x09,
  SISO_STREAM:    0x0A,
  INVITE:         0x10,
  ACCEPT:         0x11,
  REJECT:         0x12,
  HANGUP:         0x13,
  AUDIO_FRAME:    0x14,
  VIDEO_FRAME:    0x15,
  CHAT_MESSAGE:   0x20,
  PUSH_NOTIF:     0x25,
  NOTIF_ACK:      0x26,
  COLLECTION_PREP: 0x27,
  SLOT_DATA:      0x28,
  KEYPAD_EVENT:   0x21,
  DISPLAY_WRITE:  0x22,
  RELAY_SET:      0x23,
  SENSOR_STREAM:  0x24,
  HEARTBEAT:      0x30,
  CUSTOM_ACTION:  0x40,
  ERROR:          0xFF,
};

const TITAN_SEVERITY = {
  INFO:  1,
  WARN:  2,
  ERROR: 3,
  FATAL: 4
};

const TITAN_ERROR_CODE = {
  NONE:          0,
  GENERIC:       1,
  TIMEOUT:       2,
  NETWORK:       3,
  PARSER:        4,
  HARDWARE_I2C:  10,
  SENSOR_FAIL:   11,
  WATCHDOG:      12,
  OUT_OF_MEMORY: 13,
  AUTH_FAIL:     20,
  UI_EVENT:      21,
  UI_RENDER:     22,
  UNCAUGHT:      30
};

const ERROR_REG = {
  SECURITY_TOKEN:    3,
  SECURITY_STATUS:   4,
  SECURITY_FAILURES: 5,
  MASTER:   90,
  COUNT:    91,
  MODULE:   92,
  CODE:     93,
  SEVERITY: 94,
  JSON:     99
};

const NOTIF_REG = {
  PUSH:         110,
  ACK:          111,
  UNREAD_COUNT: 112
};

const TARGET_DIRECTIVE = {
  PULSE:    0x00E0, // 224
  FLIP:     0x00E1, // 225
  SAVE:     0x00E2, // 226 (CRUD Update / Save)
  DELETE:   0x00E3, // 227 (CRUD Delete)
  MIRROR:   0x00E4, // 228 (CRUD Read)
  EDITABLE: 0x00E5, // 229
  ADD:      0x00E6, // 230 (CRUD Create)
  SEARCH:   0x00E7, // 231 (Direct Search)
  FILTER:   0x00E8, // 232 (Predicate Filter)
  SORT:     0x00E9, // 233 (Sort)
  CLEAR:    0x00EA  // 234 (Reset Filter)
};

class TitanMicroBusEngine {
  constructor() {
    this.registers = new Map();
    this.listeners = new Map();
    this.cmdHandlers = new Map();
    this.errorHistory = [];
    this.maxErrorHistory = 50;
    this.seqNo = 1;
    this.myNodeId = 101;
    this.sockets = new Set();
    this.server = null;
    this.securitySeed = TITAN_DEFAULT_SECRET_SEED;
    this.securityEnabled = false;
    this.authFailures = 0;
    this.lastHeartbeatTime = Date.now();
    this.pendingAcks = new Map();
    this.unreadNotifications = new Map();
    this.typeSystem = new TitanTypeSystem();
    this.initDefaults();
  }

  initDefaults() {
    this.write(1, 'ONLINE');
    this.write(2, 0); // REG_BUS_HEARTBEAT
    this.write(3, 0); // REG_SECURITY_TOKEN
    this.write(4, 0); // REG_SECURITY_STATUS: 0 = Open
    this.write(5, 0); // REG_SECURITY_FAILURES
    this.write(10, 'Home');
    this.write(1000, '');
    this.write(ERROR_REG.MASTER, 0); // 0 = OK/Healthy
    this.write(ERROR_REG.COUNT, 0);  // Cumulative Error Count = 0
    this.write(NOTIF_REG.UNREAD_COUNT, 0); // Current unread notifications = 0
  }

  declareType(reg, type) {
    return this.typeSystem.declare(reg, type);
  }

  getType(reg) {
    return this.typeSystem.getType(reg);
  }

  write(reg, value, silent = false) {
    const typedValue = this.typeSystem ? this.typeSystem.cast(reg, value) : value;
    this.registers.set(reg, typedValue);
    if (!silent) {
      const subs = this.listeners.get(reg);
      if (subs) {
        subs.forEach(listener => {
          try { listener(typedValue, reg); } catch (e) { console.error(e); }
        });
      }
    }
  }

  writeInt(reg, value, silent = false) {
    const num = isNaN(Number(value)) ? 0 : Math.trunc(Number(value));
    this.write(reg, num, silent);
    return num;
  }

  read(reg, defaultValue = null) {
    return this.registers.has(reg) ? this.registers.get(reg) : defaultValue;
  }

  readInt(reg, defaultValue = 0) {
    const val = this.read(reg);
    if (val === null || val === undefined || val === '') return defaultValue;
    const num = Number(val);
    return isNaN(num) ? defaultValue : Math.trunc(num);
  }

  writeAnalog(reg, value, silent = false) {
    if (this.typeSystem && !this.typeSystem.typeMap.has(Number(reg) & 0xFFFF)) {
      this.typeSystem.declare(reg, TITAN_TYPE.UINT8);
    }
    let num = Number(value);
    if (isNaN(num)) num = 0;
    const clamped = Math.max(0, Math.min(255, Math.round(num)));
    this.write(reg, clamped, silent);
    return clamped;
  }

  readAnalog(reg, defaultValue = 0) {
    const val = this.read(reg);
    if (val === null || val === undefined || val === '') return defaultValue;
    const num = Number(val);
    if (isNaN(num)) return defaultValue;
    return Math.max(0, Math.min(255, Math.round(num)));
  }

  writeSigned(reg, value, silent = false) {
    if (this.typeSystem && !this.typeSystem.typeMap.has(Number(reg) & 0xFFFF)) {
      this.typeSystem.declare(reg, TITAN_TYPE.INT8);
    }
    let num = Number(value);
    if (isNaN(num)) num = 0;
    const clamped = Math.max(-128, Math.min(127, Math.round(num)));
    this.write(reg, clamped, silent);
    return clamped;
  }

  readSigned(reg, defaultValue = 0) {
    const val = this.read(reg);
    if (val === null || val === undefined || val === '') return defaultValue;
    const num = Number(val);
    if (isNaN(num)) return defaultValue;
    return Math.max(-128, Math.min(127, Math.round(num)));
  }

  writeBit(reg, value, silent = false) {
    if (this.typeSystem && !this.typeSystem.typeMap.has(Number(reg) & 0xFFFF)) {
      this.typeSystem.declare(reg, TITAN_TYPE.BOOL);
    }
    const bit = (value === true || value === 1 || value === '1' || value === 'on') ? 1 : 0;
    this.write(reg, bit, silent);
    return bit;
  }

  readBit(reg, defaultValue = 0) {
    const val = this.read(reg);
    if (val === null || val === undefined || val === '') return defaultValue ? 1 : 0;
    return (val === true || val === 1 || val === '1' || val === 'on') ? 1 : 0;
  }

  writeWord(reg, value, silent = false) {
    if (this.typeSystem && !this.typeSystem.typeMap.has(Number(reg) & 0xFFFF)) {
      this.typeSystem.declare(reg, TITAN_TYPE.UINT16);
    }
    let num = Number(value);
    if (isNaN(num)) num = 0;
    const clamped = Math.max(0, Math.min(65535, Math.round(num)));
    this.write(reg, clamped, silent);
    return clamped;
  }

  readWord(reg, defaultValue = 0) {
    const val = this.read(reg);
    if (val === null || val === undefined || val === '') return defaultValue;
    const num = Number(val);
    if (isNaN(num)) return defaultValue;
    return Math.max(0, Math.min(65535, Math.round(num)));
  }

  writeAnalog16(reg, value, silent = false) {
    return this.writeWord(reg, value, silent);
  }

  readAnalog16(reg, defaultValue = 0) {
    return this.readWord(reg, defaultValue);
  }

  lerpAnalog(current, target, factor = 0.2) {
    const c = Number(current) || 0;
    const t = Number(target) || 0;
    const f = Math.max(0, Math.min(1, Number(factor) || 0.2));
    const next = c + (t - c) * f;
    return Math.abs(t - next) < 0.2 ? t : Math.round(next * 100) / 100;
  }

  subscribe(reg, listener) {
    if (!this.listeners.has(reg)) {
      this.listeners.set(reg, new Set());
    }
    this.listeners.get(reg).add(listener);

    if (this.registers.has(reg)) {
      listener(this.registers.get(reg), reg);
    }

    return () => {
      this.listeners.get(reg)?.delete(listener);
    };
  }

  emit(targetId, cmd, payload = null, isJson = false) {
    let payloadBuf;
    let flags = 0;

    if (Buffer.isBuffer(payload)) {
      payloadBuf = payload;
    } else if (typeof payload === 'string') {
      payloadBuf = Buffer.from(payload, 'utf8');
    } else if (payload !== null && typeof payload === 'object') {
      payloadBuf = Buffer.from(JSON.stringify(payload), 'utf8');
      flags = 1;
    } else if (typeof payload === 'number') {
      payloadBuf = Buffer.alloc(4);
      payloadBuf.writeInt32BE(payload, 0);
    } else {
      payloadBuf = Buffer.alloc(0);
    }

    const frame = Buffer.alloc(TITAN_HEADER_SIZE + payloadBuf.length);
    frame.writeUInt16BE(TITAN_SIGNATURE, 0);
    frame.writeUInt8(TITAN_VERSION, 2);
    frame.writeUInt8(cmd, 3);
    frame.writeInt32BE(this.myNodeId, 4);
    frame.writeInt32BE(targetId, 8);
    frame.writeInt32BE(payloadBuf.length, 12);
    frame.writeInt32BE(this.seqNo++, 16);
    frame.writeUInt16BE(0, 20);
    frame.writeUInt8(flags, 22);
    frame.writeUInt8(0xAA, 23);

    if (payloadBuf.length > 0) {
      payloadBuf.copy(frame, TITAN_HEADER_SIZE);
    }

    const handlers = this.cmdHandlers.get(cmd);
    if (handlers) {
      handlers.forEach(h => {
        try { h(cmd, this.myNodeId, payload); } catch (e) { console.error(e); }
      });
    }

    this.broadcast(frame);
    return frame;
  }

  emitSiso(reg, val) {
    const frame = Buffer.alloc(TITAN_SISO_PACKET_LEN);
    frame.writeUInt16BE(TITAN_SISO_SIGNATURE, 0); // 'SI' (0x5349)
    frame.writeUInt16BE(Number(reg) & 0xFFFF, 2);
    frame.writeInt16BE(Math.max(-32768, Math.min(32767, Number(val) || 0)), 4);

    this.write(reg, val);

    const handlers = this.cmdHandlers.get(CMD.SISO_STREAM);
    if (handlers) {
      handlers.forEach(h => {
        try { h(CMD.SISO_STREAM, this.myNodeId, { reg, value: val }); } catch (e) { console.error(e); }
      });
    }

    this.broadcast(frame);
    return frame;
  }

  setSecuritySeed(seed) {
    this.securitySeed = Number(seed) & 0xFFFF;
  }

  setSecurityEnabled(enabled) {
    this.securityEnabled = Boolean(enabled);
    this.write(ERROR_REG.SECURITY_STATUS, this.securityEnabled ? 1 : 0);
  }

  isSecurityEnabled() {
    return this.securityEnabled;
  }

  computeRollingToken(epochSec = Math.floor(Date.now() / 1000)) {
    return ((this.securitySeed ^ (epochSec & 0xFFFF)) * 109 + 89) & 0xFF;
  }

  verifyToken(token, epochSec = Math.floor(Date.now() / 1000)) {
    const t0 = this.computeRollingToken(epochSec);
    const t1 = this.computeRollingToken(epochSec - 1);
    return token === t0 || token === t1;
  }

  maskSiso(token, reg, val) {
    const mask = ((token << 8) | token);
    const maskedReg = (Number(reg) ^ mask) & 0xFFFF;
    const rawVal = Math.max(-32768, Math.min(32767, Number(val) || 0));
    const maskedVal = (rawVal ^ mask) << 16 >> 16;
    return { reg: maskedReg, val: maskedVal };
  }

  maskMacro(token, buffer) {
    if (!Buffer.isBuffer(buffer) || buffer.length === 0) return buffer;
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] ^= (token ^ (i & 0xFF));
    }
    return buffer;
  }

  emitSecureSiso(reg, val) {
    const token = this.computeRollingToken();
    const frame = Buffer.alloc(TITAN_SISO_SECURE_PACKET_LEN);
    frame.writeUInt16BE(TITAN_SISO_SECURE_SIGNATURE, 0); // 'SS' (0x5353)
    frame.writeUInt8(token, 2);

    const mask = ((token << 8) | token);
    const maskedReg = (Number(reg) ^ mask) & 0xFFFF;
    const rawVal = Math.max(-32768, Math.min(32767, Number(val) || 0));
    const maskedVal = (rawVal ^ mask) & 0xFFFF;

    frame.writeUInt16BE(maskedReg, 3);
    frame.writeUInt16BE(maskedVal, 5);

    this.write(reg, val);
    this.write(ERROR_REG.SECURITY_TOKEN, token);
    this.write(2, token); // REG_BUS_HEARTBEAT
    this.write(1, 'ONLINE');
    this.lastHeartbeatTime = Date.now();

    const handlers = this.cmdHandlers.get(CMD.SISO_STREAM);
    if (handlers) {
      handlers.forEach(h => {
        try { h(CMD.SISO_STREAM, this.myNodeId, { reg, value: val, secure: true, token }); } catch (e) { console.error(e); }
      });
    }

    this.broadcast(frame);
    return frame;
  }

  getRollingToken(epochSec) {
    return this.computeRollingToken(epochSec);
  }

  resetSecurityFailures() {
    this.authFailures = 0;
    this.write(ERROR_REG.SECURITY_FAILURES, 0);
    this.write(ERROR_REG.SECURITY_STATUS, this.securityEnabled ? 1 : 0);
  }

  isLockedOut() {
    return this.read(ERROR_REG.SECURITY_STATUS) === 2 || this.authFailures >= 3;
  }

  processIncomingBytes(chunk) {
    return this.ingestBytes(chunk);
  }

  packSecureSiso(reg, val, token = this.computeRollingToken()) {
    const frame = Buffer.alloc(TITAN_SISO_SECURE_PACKET_LEN);
    frame.writeUInt16BE(TITAN_SISO_SECURE_SIGNATURE, 0); // 'SS'
    frame.writeUInt8(token, 2);
    const mask = ((token << 8) | token);
    const maskedReg = (Number(reg) ^ mask) & 0xFFFF;
    const rawVal = Math.max(-32768, Math.min(32767, Number(val) || 0));
    const maskedVal = (rawVal ^ mask) & 0xFFFF;
    frame.writeUInt16BE(maskedReg, 3);
    frame.writeUInt16BE(maskedVal, 5);
    return frame;
  }

  checkHeartbeatWatchdog(timeoutMs = 3000) {
    if (this.lastHeartbeatTime > 0 && (Date.now() - this.lastHeartbeatTime) > timeoutMs) {
      this.write(1, 'OFFLINE');
    }
  }

  setRoutingUrl(id, url) {
    if (!this.urlRoutes) this.urlRoutes = new Map();
    this.urlRoutes.set(Number(id) & 0xFFFF, String(url));
  }

  getRoutingUrl(id) {
    return this.urlRoutes ? (this.urlRoutes.get(Number(id) & 0xFFFF) || '') : '';
  }

  listen(port = 9092, host = '0.0.0.0', callback) {
    const net = require('net');
    this.server = net.createServer((socket) => {
      this.sockets.add(socket);
      socket.on('data', (chunk) => {
        this.ingestBytes(chunk);
      });
      socket.on('close', () => {
        this.sockets.delete(socket);
      });
      socket.on('error', () => {
        this.sockets.delete(socket);
      });
    });
    return this.server.listen(port, host, callback);
  }

  connect(port = 9092, host = '127.0.0.1', callback) {
    const net = require('net');
    const socket = net.createConnection({ port, host }, callback);
    this.sockets.add(socket);
    socket.on('data', (chunk) => {
      this.ingestBytes(chunk);
    });
    socket.on('close', () => {
      this.sockets.delete(socket);
    });
    socket.on('error', () => {
      this.sockets.delete(socket);
    });
    return socket;
  }

  broadcast(buf) {
    if (!this.sockets || this.sockets.size === 0) return;
    for (const s of this.sockets) {
      try {
        if (!s.destroyed) s.write(buf);
      } catch (e) {}
    }
  }

  close(callback) {
    if (this.sockets) {
      for (const s of this.sockets) {
        try { s.destroy(); } catch (e) {}
      }
      this.sockets.clear();
    }
    if (this.server) {
      this.server.close(callback);
      this.server = null;
    } else if (callback) {
      callback();
    }
  }

  onCommand(cmd, handler) {
    if (!this.cmdHandlers.has(cmd)) {
      this.cmdHandlers.set(cmd, new Set());
    }
    this.cmdHandlers.get(cmd).add(handler);
    return () => {
      this.cmdHandlers.get(cmd)?.delete(handler);
    };
  }

  reportError(errorData, options = {}) {
    let module = this.myNodeId;
    let code = TITAN_ERROR_CODE.GENERIC;
    let severity = TITAN_SEVERITY.ERROR;
    let message = 'Unknown error';
    let stack = null;
    let extra = null;

    if (errorData instanceof Error) {
      message = errorData.message;
      stack = errorData.stack;
      if (errorData.code && typeof errorData.code === 'number') {
        code = errorData.code;
      }
    } else if (typeof errorData === 'string') {
      message = errorData;
    } else if (typeof errorData === 'object' && errorData !== null) {
      if (errorData.module !== undefined) module = Number(errorData.module) || module;
      if (errorData.code !== undefined) code = Number(errorData.code) || code;
      if (errorData.severity !== undefined) {
        if (typeof errorData.severity === 'string') {
          severity = TITAN_SEVERITY[errorData.severity.toUpperCase()] || TITAN_SEVERITY.ERROR;
        } else {
          severity = Number(errorData.severity) || TITAN_SEVERITY.ERROR;
        }
      }
      message = errorData.message || errorData.msg || message;
      stack = errorData.stack || (errorData.error instanceof Error ? errorData.error.stack : null);
      extra = errorData.extra || errorData.details || null;
    }

    this.write(ERROR_REG.MASTER, severity);
    this.write(ERROR_REG.MODULE, module);
    this.write(ERROR_REG.CODE, code);
    this.write(ERROR_REG.SEVERITY, severity);
    const prevCount = this.readInt(ERROR_REG.COUNT, 0);
    this.write(ERROR_REG.COUNT, prevCount + 1);

    const fullError = {
      timestamp: Date.now(),
      module,
      code,
      severity,
      message,
      stack,
      extra
    };

    this.write(ERROR_REG.JSON, fullError);

    this.errorHistory.unshift(fullError);
    if (this.errorHistory.length > this.maxErrorHistory) {
      this.errorHistory.pop();
    }

    if (!options.silent) {
      this.emit(0, CMD.ERROR, fullError);
    }

    return fullError;
  }

  clearError() {
    this.write(ERROR_REG.MASTER, 0);
    this.write(ERROR_REG.CODE, 0);
    this.write(ERROR_REG.SEVERITY, 0);
    this.write(ERROR_REG.JSON, null);
  }

  getErrorHistory() {
    return [...this.errorHistory];
  }

  captureUIError(eventOrError, context = {}) {
    let message = 'UI Event Error';
    let stack = null;
    let extra = { ...context };

    if (eventOrError instanceof Error) {
      message = eventOrError.message;
      stack = eventOrError.stack;
    } else if (typeof eventOrError === 'string') {
      message = eventOrError;
    } else if (eventOrError && typeof eventOrError === 'object') {
      if (eventOrError.message) message = eventOrError.message;
      if (eventOrError.error instanceof Error) {
        message = eventOrError.error.message;
        stack = eventOrError.error.stack;
      }
      if (eventOrError.filename) extra.filename = eventOrError.filename;
      if (eventOrError.lineno) extra.lineno = eventOrError.lineno;
      if (eventOrError.colno) extra.colno = eventOrError.colno;
      if (eventOrError.type) extra.eventType = eventOrError.type;
      if (eventOrError.target) {
        extra.tagName = eventOrError.target.tagName;
        extra.elementId = eventOrError.target.id;
      }
    }

    return this.reportError({
      module: 100,
      code: TITAN_ERROR_CODE.UI_EVENT,
      severity: 'ERROR',
      message,
      stack,
      extra
    });
  }

  attachGlobalErrorCatchers(options = {}) {
    if (typeof process !== 'undefined' && process.on) {
      process.on('uncaughtException', (err) => {
        this.reportError({
          module: options.nodeId || this.myNodeId,
          code: TITAN_ERROR_CODE.UNCAUGHT,
          severity: 'FATAL',
          message: err?.message || String(err),
          stack: err?.stack
        });
      });

      process.on('unhandledRejection', (reason) => {
        const isErr = reason instanceof Error;
        this.reportError({
          module: options.nodeId || this.myNodeId,
          code: TITAN_ERROR_CODE.GENERIC,
          severity: 'ERROR',
          message: isErr ? reason.message : String(reason),
          stack: isErr ? reason.stack : null
        });
      });
    }

    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('error', (event) => {
        this.captureUIError(event, { source: 'window.onerror' });
      });

      window.addEventListener('unhandledrejection', (event) => {
        const reason = event.reason;
        this.captureUIError(reason, { source: 'window.unhandledrejection' });
      });
    }
  }

  pushNotification(payload, options = {}) {
    if (!payload) return null;
    const notifId = payload.id || `ntf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const fullPayload = {
      id: notifId,
      room: payload.room || 0,
      title: payload.title || 'Titan Alert',
      body: payload.body || '',
      icon: payload.icon || 'notification',
      time: payload.time || Date.now(),
      data: payload.data || null,
      ...payload
    };

    const targetExt = Number(options.targetExt || payload.targetExt || 0);
    const retryTimeoutMs = options.retryTimeoutMs || 3000;
    const maxRetries = options.maxRetries || 3;

    if (!this.pendingAcks) this.pendingAcks = new Map();
    if (!this.unreadNotifications) this.unreadNotifications = new Map();

    this.unreadNotifications.set(notifId, fullPayload);
    this.write(NOTIF_REG.UNREAD_COUNT, this.unreadNotifications.size);
    this.write(NOTIF_REG.PUSH, fullPayload);

    this.emit(targetExt, CMD.PUSH_NOTIF, fullPayload, { flags: TITAN_FLAG.JSON });

    const scheduleRetry = (attempt) => {
      if (attempt >= maxRetries) {
        if (this.pendingAcks) this.pendingAcks.delete(notifId);
        return;
      }
      const timer = setTimeout(() => {
        if (this.pendingAcks && this.pendingAcks.has(notifId)) {
          this.emit(targetExt, CMD.PUSH_NOTIF, fullPayload, { flags: TITAN_FLAG.JSON });
          scheduleRetry(attempt + 1);
        }
      }, retryTimeoutMs);

      if (typeof timer.unref === 'function') timer.unref();
      this.pendingAcks.set(notifId, { timer, payload: fullPayload, attempt });
    };

    scheduleRetry(0);
    return notifId;
  }

  ackNotification(notifId, senderExt = 0) {
    if (this.pendingAcks && this.pendingAcks.has(notifId)) {
      const entry = this.pendingAcks.get(notifId);
      if (entry && entry.timer) clearTimeout(entry.timer);
      this.pendingAcks.delete(notifId);
    }

    if (this.unreadNotifications && this.unreadNotifications.has(notifId)) {
      this.unreadNotifications.delete(notifId);
      this.write(NOTIF_REG.UNREAD_COUNT, this.unreadNotifications.size);
    }

    const ackObj = { id: notifId, senderExt, time: Date.now() };
    this.write(NOTIF_REG.ACK, ackObj);
    this.emit(0, CMD.NOTIF_ACK, ackObj, { flags: TITAN_FLAG.JSON });
    return true;
  }

  getUnreadCount() {
    return this.unreadNotifications ? this.unreadNotifications.size : 0;
  }

  ingestBytes(chunk) {
    if (!Buffer.isBuffer(chunk) || chunk.length < 2) return;
    let offset = 0;

    while (offset <= chunk.length - 2) {
      const sig = chunk.readUInt16BE(offset);

      if (sig === TITAN_SISO_SECURE_SIGNATURE) {
        if (offset + TITAN_SISO_SECURE_PACKET_LEN > chunk.length) break;
        const token = chunk.readUInt8(offset + 2);
        const validAuth = !this.securityEnabled || this.verifyToken(token);

        if (!validAuth) {
          this.authFailures++;
          this.write(ERROR_REG.SECURITY_FAILURES, this.authFailures);
          if (this.authFailures >= 3) {
            this.write(ERROR_REG.SECURITY_STATUS, 2);
            this.reportError({ code: 90, message: 'Titan-Shield 8-bit Auth Failed - Locked Out' });
          }
        } else {
          this.authFailures = 0;
          this.write(ERROR_REG.SECURITY_FAILURES, 0);
          this.write(ERROR_REG.SECURITY_TOKEN, token);
          this.write(ERROR_REG.SECURITY_STATUS, this.securityEnabled ? 1 : 0);
          this.write(2, token);
          this.write(1, 'ONLINE');
          this.lastHeartbeatTime = Date.now();

          const mask = ((token << 8) | token);
          const maskedReg = chunk.readUInt16BE(offset + 3);
          const maskedVal = chunk.readUInt16BE(offset + 5);

          const reg = (maskedReg ^ mask) & 0xFFFF;
          const val = ((maskedVal ^ mask) << 16) >> 16;
          this.write(reg, val);

          const handlers = this.cmdHandlers.get(CMD.SISO_STREAM);
          if (handlers) {
            handlers.forEach(h => {
              try { h(CMD.SISO_STREAM, 0, { reg, value: val, secure: true, token }); } catch (e) { console.error(e); }
            });
          }
        }
        offset += TITAN_SISO_SECURE_PACKET_LEN;
        continue;
      }

      if (sig === TITAN_SISO_SIGNATURE) {
        if (offset + TITAN_SISO_PACKET_LEN > chunk.length) break;
        if (this.securityEnabled) {
          this.authFailures++;
          this.write(ERROR_REG.SECURITY_FAILURES, this.authFailures);
        } else {
          const reg = chunk.readUInt16BE(offset + 2);
          const val = chunk.readInt16BE(offset + 4);
          this.write(reg, val);
          this.write(1, 'ONLINE');
          this.lastHeartbeatTime = Date.now();

          const handlers = this.cmdHandlers.get(CMD.SISO_STREAM);
          if (handlers) {
            handlers.forEach(h => {
              try { h(CMD.SISO_STREAM, 0, { reg, value: val }); } catch (e) { console.error(e); }
            });
          }
        }
        offset += TITAN_SISO_PACKET_LEN;
        continue;
      }

      if (sig === TITAN_SIGNATURE) {
        if (offset + TITAN_HEADER_SIZE > chunk.length) break;

        const cmd = chunk.readUInt8(offset + 3);
        const sender = chunk.readInt32BE(offset + 4);
        const target = chunk.readInt32BE(offset + 8);
        const pLen = chunk.readInt32BE(offset + 12);
        const flags = chunk.readUInt8(offset + 22);
        const token = chunk.readUInt8(offset + 23);

        if (pLen < 0 || pLen > 65536) {
          offset += 2;
          continue;
        }

        const totalLen = TITAN_HEADER_SIZE + pLen;
        if (offset + totalLen > chunk.length) break;

        const validAuth = !this.securityEnabled || this.verifyToken(token);
        if (!validAuth) {
          this.authFailures++;
          this.write(ERROR_REG.SECURITY_FAILURES, this.authFailures);
        } else {
          this.authFailures = 0;
          this.write(ERROR_REG.SECURITY_FAILURES, 0);
          this.write(ERROR_REG.SECURITY_TOKEN, token);
          this.write(2, token);
          this.write(1, 'ONLINE');
          this.lastHeartbeatTime = Date.now();

          let payload = null;
          if (pLen > 0) {
            let rawPayload = Buffer.from(chunk.subarray(offset + TITAN_HEADER_SIZE, offset + totalLen));
            if (flags & TITAN_FLAG.ENCRYPTED) {
              rawPayload = this.maskMacro(token, rawPayload);
            }

            if (flags & TITAN_FLAG.JSON) {
              try { payload = JSON.parse(rawPayload.toString('utf8')); } catch { payload = rawPayload; }
            } else if (pLen === 4) {
              payload = rawPayload.readInt32BE(0);
            } else {
              payload = rawPayload;
            }
          }

          if (cmd === CMD.ERROR) {
            const isObj = payload && typeof payload === 'object' && !Buffer.isBuffer(payload);
            const code = isObj && payload.code !== undefined ? Number(payload.code) : (target || TITAN_ERROR_CODE.GENERIC);
            let severity = isObj && payload.severity !== undefined ? payload.severity : TITAN_SEVERITY.ERROR;
            if (typeof severity === 'string') severity = TITAN_SEVERITY[severity.toUpperCase()] || TITAN_SEVERITY.ERROR;
            const msg = isObj && payload.message ? payload.message : (typeof payload === 'string' ? payload : `Hardware error code ${code}`);

            this.write(ERROR_REG.MASTER, severity);
            this.write(ERROR_REG.MODULE, sender);
            this.write(ERROR_REG.CODE, code);
            this.write(ERROR_REG.SEVERITY, severity);
            const prevCount = this.readInt(ERROR_REG.COUNT, 0);
            this.write(ERROR_REG.COUNT, prevCount + 1);

            const fullError = isObj ? payload : {
              timestamp: Date.now(),
              module: sender,
              code,
              severity,
              message: msg,
              stack: null
            };
            this.write(ERROR_REG.JSON, fullError);

            this.errorHistory.unshift(fullError);
            if (this.errorHistory.length > this.maxErrorHistory) {
              this.errorHistory.pop();
            }
          }

          if (cmd === CMD.PUSH_NOTIF) {
            this.write(NOTIF_REG.PUSH, payload);
            if (payload && payload.id) {
              if (!this.unreadNotifications) this.unreadNotifications = new Map();
              this.unreadNotifications.set(payload.id, payload);
              this.write(NOTIF_REG.UNREAD_COUNT, this.unreadNotifications.size);
            }
          }

          if (cmd === CMD.NOTIF_ACK) {
            const notifId = payload?.id || (typeof payload === 'string' ? payload : null);
            if (notifId) {
              if (this.pendingAcks && this.pendingAcks.has(notifId)) {
                const entry = this.pendingAcks.get(notifId);
                if (entry && entry.timer) clearTimeout(entry.timer);
                this.pendingAcks.delete(notifId);
              }
              if (this.unreadNotifications && this.unreadNotifications.has(notifId)) {
                this.unreadNotifications.delete(notifId);
                this.write(NOTIF_REG.UNREAD_COUNT, this.unreadNotifications.size);
              }
            }
            this.write(NOTIF_REG.ACK, payload);
          }

          const handlers = this.cmdHandlers.get(cmd);
          if (handlers) {
            handlers.forEach(h => {
              try { h(cmd, sender, payload); } catch (e) { console.error(e); }
            });
          }
        }

        offset += totalLen;
        continue;
      }

      offset += 1;
    }
  }
}

class TitanDeclarative {
  static extractRegisterId(str) {
    if (!str) return null;
    const match = str.match(/\[?bus:(\d+)\]?/);
    return match ? parseInt(match[1], 10) : null;
  }

  static executeAction(action) {
    if (!action) return false;

    if (Array.isArray(action)) {
      return action.every(act => TitanDeclarative.executeAction(act));
    }

    if (typeof action === 'object') {
      if (action.registers && typeof action.registers === 'object') {
        for (const [r, v] of Object.entries(action.registers)) {
          const regNum = parseInt(r, 10);
          const valNum = isNaN(v) || (typeof v === 'string' && v.trim() === '') ? v : Number(v);
          TitanMicroBus.write(regNum, valNum);
        }
        return true;
      }

      const verb = (action.verb || action.action || action.type || '').toLowerCase();

      switch (verb) {
        case 'write': {
          const reg = parseInt(action.reg ?? action.register ?? action.target, 10);
          let val = action.val ?? action.value;
          if (typeof val === 'string') {
            val = isNaN(val) || val.trim() === '' ? val : Number(val);
          }
          TitanMicroBus.write(reg, val);
          return true;
        }

        case 'siso': {
          const reg = parseInt(action.reg ?? action.register ?? action.target, 10);
          const val = Number(action.val ?? action.value ?? 0);
          TitanMicroBus.write(reg, val);
          return true;
        }

        case 'analog': {
          const reg = parseInt(action.reg ?? action.register ?? action.target, 10);
          const val = action.val ?? action.value ?? 0;
          TitanMicroBus.writeAnalog(reg, val);
          return true;
        }

        case 'signed': {
          const reg = parseInt(action.reg ?? action.register ?? action.target, 10);
          const val = action.val ?? action.value ?? 0;
          TitanMicroBus.writeSigned(reg, val);
          return true;
        }

        case 'bit': {
          const reg = parseInt(action.reg ?? action.register ?? action.target, 10);
          const val = action.val ?? action.value ?? 0;
          TitanMicroBus.writeBit(reg, val);
          return true;
        }

        case 'key': {
          const key = String(action.key ?? action.value ?? '');
          const current = TitanMicroBus.read(1000, '');
          const updated = current + key;
          TitanMicroBus.write(1000, updated);
          TitanMicroBus.emit(101, CMD.KEYPAD_EVENT, key);
          return true;
        }

        case 'backspace': {
          const current = TitanMicroBus.read(1000, '');
          const updated = current.length > 0 ? current.slice(0, -1) : '';
          TitanMicroBus.write(1000, updated);
          return true;
        }

        case 'dial': {
          const ext = String(action.ext ?? action.target ?? action.value ?? TitanMicroBus.read(1000, ''));
          if (ext) {
            TitanMicroBus.emit(101, CMD.INVITE, ext);
            TitanMicroBus.write(10, 'ActiveCall');
          }
          return true;
        }

        case 'relay': {
          const relayId = parseInt(action.relayId ?? action.relay ?? action.id, 10);
          const rawState = action.state ?? action.value ?? 0;
          const state = rawState === 'on' || rawState === 1 || rawState === true ? 1 : 0;
          const pulse = parseInt(action.pulse ?? 0, 10);
          TitanMicroBus.write(20000 + relayId, state);
          TitanMicroBus.emit(300, CMD.RELAY_SET, { relayId, state, pulse });
          return true;
        }

        case 'screen': {
          const screenName = action.screen ?? action.name ?? action.value;
          TitanMicroBus.write(10, screenName);
          return true;
        }

        case 'show': {
          const text = String(action.text ?? action.message ?? action.value ?? '');
          TitanMicroBus.write(1010, text);
          return true;
        }

        case 'error': {
          TitanMicroBus.reportError(action);
          return true;
        }

        case 'clear_error': {
          TitanMicroBus.clearError();
          return true;
        }

        case 'notify':
        case 'push': {
          const title = String(action.title ?? action.name ?? 'Alert');
          const body = String(action.body ?? action.text ?? action.message ?? '');
          const room = action.room ?? 0;
          TitanMicroBus.pushNotification({ ...action, title, body, room });
          return true;
        }

        case 'ack': {
          const id = action.id ?? action.notifId ?? '';
          TitanMicroBus.ackNotification(id);
          return true;
        }

        default:
          return false;
      }
    }

    if (typeof action === 'string' && action.startsWith('bus:')) {
      const parts = action.split(':');
      const verb = parts[1];

      switch (verb) {
        case 'write': {
          const reg = parseInt(parts[2], 10);
          const rawVal = parts.slice(3).join(':');
          const val = isNaN(rawVal) || rawVal.trim() === '' ? rawVal : Number(rawVal);
          TitanMicroBus.write(reg, val);
          return true;
        }

        case 'siso': {
          const reg = parseInt(parts[2], 10);
          const val = Number(parts[3]) || 0;
          TitanMicroBus.write(reg, val);
          return true;
        }

        case 'analog': {
          const reg = parseInt(parts[2], 10);
          const val = Number(parts[3]) || 0;
          TitanMicroBus.writeAnalog(reg, val);
          return true;
        }

        case 'signed': {
          const reg = parseInt(parts[2], 10);
          const val = Number(parts[3]) || 0;
          TitanMicroBus.writeSigned(reg, val);
          return true;
        }

        case 'bit': {
          const reg = parseInt(parts[2], 10);
          const val = parts[3] === '1' || parts[3] === 'true' || parts[3] === 'on' ? 1 : 0;
          TitanMicroBus.writeBit(reg, val);
          return true;
        }

        case 'key': {
          const key = parts[2];
          const current = TitanMicroBus.read(1000, '');
          const updated = current + key;
          TitanMicroBus.write(1000, updated);
          TitanMicroBus.emit(101, CMD.KEYPAD_EVENT, key);
          return true;
        }

        case 'backspace': {
          const current = TitanMicroBus.read(1000, '');
          const updated = current.length > 0 ? current.slice(0, -1) : '';
          TitanMicroBus.write(1000, updated);
          return true;
        }

        case 'dial': {
          const ext = parts[2] || TitanMicroBus.read(1000, '');
          if (ext) {
            TitanMicroBus.emit(101, CMD.INVITE, ext);
            TitanMicroBus.write(10, 'ActiveCall');
          }
          return true;
        }

        case 'relay': {
          const relayId = parseInt(parts[2], 10);
          const state = parts[3] === 'on' || parts[3] === '1' ? 1 : 0;
          const pulse = parts[4] ? parseInt(parts[4], 10) : 0;
          TitanMicroBus.write(20000 + relayId, state);
          TitanMicroBus.emit(300, CMD.RELAY_SET, { relayId, state, pulse });
          return true;
        }

        case 'screen': {
          const screenName = parts[2];
          TitanMicroBus.write(10, screenName);
          return true;
        }

        case 'show': {
          const text = parts.slice(2).join(':');
          TitanMicroBus.write(1010, text);
          return true;
        }

        case 'error': {
          const code = parseInt(parts[2], 10) || TITAN_ERROR_CODE.GENERIC;
          const msg = parts.slice(3).join(':') || 'Error';
          TitanMicroBus.reportError({ code, message: msg });
          return true;
        }

        case 'clear_error': {
          TitanMicroBus.clearError();
          return true;
        }

        case 'notify':
        case 'push': {
          const title = parts[2] || 'Alert';
          const body = parts.slice(3).join(':') || '';
          TitanMicroBus.pushNotification({ title, body });
          return true;
        }

        case 'ack': {
          const id = parts[2] || '';
          TitanMicroBus.ackNotification(id);
          return true;
        }

        default:
          return false;
      }
    }

    return false;
  }

  static write(reg, value) {
    return this.executeAction({ verb: 'write', reg, value });
  }

  static writeBatch(registers) {
    return this.executeAction({ registers });
  }

  static relay(relayId, state, pulse = 0) {
    return this.executeAction({ verb: 'relay', relayId, state, pulse });
  }

  static dial(ext) {
    return this.executeAction({ verb: 'dial', ext });
  }

  static screen(name) {
    return this.executeAction({ verb: 'screen', name });
  }

  static show(text) {
    return this.executeAction({ verb: 'show', text });
  }

  static pushNotification(payload, options) {
    return TitanMicroBus.pushNotification(payload, options);
  }

  static ackNotification(notifId, senderExt) {
    return TitanMicroBus.ackNotification(notifId, senderExt);
  }

  static reportError(err) {
    return TitanMicroBus.reportError(err);
  }

  static clearError() {
    TitanMicroBus.clearError();
  }

  static captureUIError(err, ctx) {
    return TitanMicroBus.captureUIError(err, ctx);
  }

  static declareType(reg, type) {
    return TitanMicroBus.declareType(reg, type);
  }

  static getType(reg) {
    return TitanMicroBus.getType(reg);
  }
}

const TitanMicroBus = new TitanMicroBusEngine();
const EverestBus = TitanMicroBus;
const EverestDeclarative = TitanDeclarative;

module.exports = {
  TitanMicroBusEngine,
  TitanMicroBus,
  TitanBus: TitanMicroBus,
  TitanDeclarative,
  EverestBus,
  EverestDeclarative,
  TARGET_DIRECTIVE,
  CMD,
  TITAN_SIGNATURE,
  TITAN_SISO_SIGNATURE,
  TITAN_SISO_SECURE_SIGNATURE,
  TITAN_VERSION,
  TITAN_HEADER_SIZE,
  TITAN_SISO_PACKET_LEN,
  TITAN_SISO_SECURE_PACKET_LEN,
  TITAN_DEFAULT_SECRET_SEED,
  TITAN_FLAG,
  TITAN_SEVERITY,
  TITAN_ERROR_CODE,
  ERROR_REG,
  NOTIF_REG,
  TITAN_TYPE,
  TitanTypeSystem,
  TitanCodec,
  TitanVideoReassembler
};
