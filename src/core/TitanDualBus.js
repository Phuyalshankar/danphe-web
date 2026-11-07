'use strict';

/**
 * 🏔️ TITAN DUAL BUS SYSTEM (v1.0.0)
 * Dual-Bus Architecture: UI Bus (120 FPS) + Data Bus (Persistent/MCU) + Smart Bridge
 * 
 * Features:
 * • Isolated UI Bus: Zero traffic jams, smooth 120 FPS gestures & buttons.
 * • Reliable Data Bus: Verified, CRC8-checked, persistent registers & MCU telemetry.
 * • Hardware Clock Pulse: Cadenced heartbeat pulse (1Hz) with rolling secret & watchdog.
 * • Automatic Failover Fallback: If Data Bus drops, UI Bus takes over seamlessly (Zero Downtime).
 * • Auto-Reconciliation: Flushes uncommitted buffers as soon as Data Bus recovers.
 */

const TitanCircuitEngine = require('./TitanCircuitEngine');
const TitanClockPulse = require('./TitanClockPulse');
const TitanDataStore = require('./TitanDataStore');

class TitanBusBridge {
  constructor(uiBus, dataBus, options = {}) {
    this.uiBus = uiBus;
    this.dataBus = dataBus;
    this.options = options;
    
    // Hardware Clock Pulse Engine on Data Bus
    this.clockPulse = options.clockPulse || new TitanClockPulse({
      intervalMs: options.pulseIntervalMs || 1000,
      timeoutMs: options.pulseTimeoutMs || 2500,
      secure: options.secureClock || false,
      secretKey: options.secretKey || 'TITAN_DUAL_BUS_BRIDGE_KEY'
    });

    this.isDataBusAlive = true;
    this.pendingBuffer = [];          // Pending operations during fallback
    this.fallbackMemory = new Map();  // Temporary RAM cache when Data Bus is down
    this.init();
  }

  init() {
    // 1. Listen to Clock Pulse Watchdog status
    this.clockPulse.onStatusChange((status, elapsed) => {
      if (status === 'DEAD') {
        this.isDataBusAlive = false;
        // Notify UI Bus on Notification Register (90)
        this.uiBus.emit(90, {
          type: 'warning',
          message: '⚠️ Data Bus Offline: Operating in Temporary UI Fallback Mode',
          elapsed
        }, 'BRIDGE_FAILOVER');
      } else if (status === 'ALIVE') {
        this.isDataBusAlive = true;
        this._reconcilePendingData();
        // Notify UI Bus
        this.uiBus.emit(90, {
          type: 'success',
          message: '✅ Data Bus Restored: All pending operations auto-synced!',
          elapsed
        }, 'BRIDGE_RESTORED');
      }
    });

    // Start Clock Pulse
    this.clockPulse.start();
  }

  /**
   * Safe Write across the Bridge
   */
  write(address, data, source = 'UI_BRIDGE') {
    const addr = Number(address);

    if (this.isDataBusAlive) {
      // Normal Mode: Write directly to Data Bus
      return this.dataBus.emit(addr, data, source);
    } else {
      // Fallback Mode: Store in UI Bus Fallback RAM Buffer
      this.fallbackMemory.set(addr, data);
      this.pendingBuffer.push({ address: addr, data, timestamp: Date.now(), source });
      
      // Update local UI bus listeners so user sees immediate feedback
      this.uiBus.emit(addr, data, 'FALLBACK_LOCAL_STASH');
      return { fallback: true, buffered: true, address: addr };
    }
  }

  /**
   * Safe Read across the Bridge
   */
  read(address) {
    const addr = Number(address);
    if (!this.isDataBusAlive && this.fallbackMemory.has(addr)) {
      // Serve from Fallback RAM
      return this.fallbackMemory.get(addr);
    }
    return this.dataBus.state.get(String(addr)) ?? this.uiBus.state.get(String(addr));
  }

  /**
   * Reconcile and flush pending operations to Data Bus once recovered
   */
  _reconcilePendingData() {
    if (this.pendingBuffer.length === 0) return;

    const toFlush = [...this.pendingBuffer];
    this.pendingBuffer = [];

    for (const op of toFlush) {
      this.dataBus.emit(op.address, op.data, 'RECONCILED_SYNC');
    }
    this.fallbackMemory.clear();
  }

  destroy() {
    this.clockPulse.stop();
  }
}

/**
 * Factory to create a complete Dual Bus System
 */
function createDualBusSystem(options = {}) {
  // 1. Create UI Bus (optimized for 120 FPS gestures & UI nodes)
  const uiBus = new TitanCircuitEngine(options.uiCircuit || {}, {
    name: 'UI_BUS',
    maxHops: 8
  });

  // 2. Create Data Bus (optimized for MCU & persistence)
  const dataBus = new TitanCircuitEngine(options.dataCircuit || {}, {
    name: 'DATA_BUS',
    maxHops: 16
  });

  // 3. Create Binary Data Store connected to Data Bus
  const dataStore = new TitanDataStore({
    bus: dataBus,
    baseAddress: options.baseAddress || 2001
  });

  // 4. Create Smart Bridge with Clock Pulse & Failover
  const bridge = new TitanBusBridge(uiBus, dataBus, options);

  return {
    uiBus,
    dataBus,
    dataStore,
    bridge,
    clockPulse: bridge.clockPulse
  };
}

module.exports = {
  TitanBusBridge,
  createDualBusSystem
};
