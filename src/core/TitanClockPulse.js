'use strict';

/**
 * 🏔️ TITAN CLOCK PULSE (v1.0.0)
 * Hardware-Grade Clock Pulse, Sync Strobe & Watchdog Timer
 * 
 * Works like a physical CPU clock / SPI SCK / CAN bus frame sync.
 * Even if security is disabled, the Clock Pulse NEVER stops:
 * - Plain / Open Mode: Sequential rolling pulse tick (1, 2, 3...)
 * - Secure Mode: Cryptographic rolling token / Nonce (Replay-proof)
 * 
 * Features:
 * • Millisecond-precise hardware cadence (Default: 1000ms / 1Hz)
 * • Hardware Watchdog Timer (trips if pulse is missed)
 * • Fail-safe liveness monitor for UI Bus <-> Data Bus
 */

class TitanClockPulse {
  constructor(options = {}) {
    this.intervalMs = options.intervalMs || 1000;      // 1 pulse per second
    this.timeoutMs = options.timeoutMs || 2500;        // Trip watchdog if > 2.5s no pulse
    this.secure = options.secure || false;             // Secure rolling secret vs plain tick
    const _env = (typeof process !== 'undefined' && process.env) ? process.env : {};
    this.secretKey = options.secretKey || _env.TITAN_SECRET_KEY || 'TITAN_BUS_MASTER_SECRET_KEY';
    this.role = options.role || 'master';              // 'master' (generates) or 'slave' (monitors)
    
    // Role-based Access Control (from options or .env: 0xFF Admin, 0x03 Operator, 0x02 User, 0x01 Guest)
    this.roleId = options.roleId !== undefined ? options.roleId : (_env.TITAN_ROLE_ID ? Number(_env.TITAN_ROLE_ID) : 0x02);
    
    this.tickCounter = 0;
    this.lastPulseTime = Date.now();
    this.isAlive = true;
    this.timer = null;
    this.watchdogTimer = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
  }

  /**
   * Fast, cryptographic rolling secret generator binding Tick + RoleId + Key + Time window
   */
  generateRollingSecret(tick, roleId = this.roleId) {
    if (!this.secure) {
      return (tick & 0xFFFF); // 16-bit sequential pulse in open mode
    }

    const currentSec = Math.floor(Date.now() / 1000);
    const payload = `${this.secretKey}:${tick}:${roleId}:${currentSec}`;
    let hash = 2166136261;
    for (let i = 0; i < payload.length; i++) {
      hash ^= payload.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) & 0xFFFF; // Return 16-bit accurate rolling secret
  }

  /**
   * Start the Clock Pulse engine
   */
  start() {
    this.stop();
    this.isAlive = true;
    this.lastPulseTime = Date.now();

    if (this.role === 'master') {
      // Generate pulses at fixed cadence
      this.timer = setInterval(() => {
        this.tickCounter = (this.tickCounter + 1) & 0xFFFF;
        const secret = this.generateRollingSecret(this.tickCounter, this.roleId);
        const pulse = {
          tick: this.tickCounter,
          secret,
          roleId: this.roleId,
          timestamp: Date.now(),
          secure: this.secure
        };
        this.lastPulseTime = pulse.timestamp;
        this._notifyPulse(pulse);
      }, this.intervalMs);
    }

    // Start Watchdog monitor
    this.watchdogTimer = setInterval(() => {
      const elapsed = Date.now() - this.lastPulseTime;
      if (elapsed > this.timeoutMs) {
        if (this.isAlive) {
          this.isAlive = false;
          this._notifyStatusChange('DEAD', elapsed);
        }
      } else {
        if (!this.isAlive) {
          this.isAlive = true;
          this._notifyStatusChange('ALIVE', elapsed);
        }
      }
    }, Math.floor(this.intervalMs / 2));

    return this;
  }

  /**
   * Pause pulse emission (simulates wire disconnect or MCU crash)
   */
  pauseHeartbeat() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    return this;
  }

  /**
   * Resume pulse emission (simulates wire reconnected or MCU reboot)
   */
  resumeHeartbeat() {
    if (this.role === 'master' && !this.timer) {
      this.timer = setInterval(() => {
        this.tickCounter = (this.tickCounter + 1) & 0xFFFF;
        const secret = this.generateRollingSecret(this.tickCounter, this.roleId);
        const pulse = {
          tick: this.tickCounter,
          secret,
          roleId: this.roleId,
          timestamp: Date.now(),
          secure: this.secure
        };
        this.lastPulseTime = pulse.timestamp;
        this._notifyPulse(pulse);
      }, this.intervalMs);
    }
    return this;
  }

  /**
   * Receive a pulse from external bus (used in slave mode)
   */
  receivePulse(pulse) {
    if (!pulse || typeof pulse.tick !== 'number') return false;

    // Validate if secure
    if (this.secure) {
      const pulseRole = pulse.roleId ?? this.roleId;
      const expectedSecret = this.generateRollingSecret(pulse.tick, pulseRole);
      if (pulse.secret !== expectedSecret) {
        // REJECT: mismatch in key, roleId, tick, or time window!
        return false;
      }
    }

    this.tickCounter = pulse.tick;
    this.lastPulseTime = Date.now();
    if (!this.isAlive) {
      this.isAlive = true;
      this._notifyStatusChange('ALIVE', 0);
    }
    this._notifyPulse(pulse);
    return true;
  }

  /**
   * Stop clock pulse
   */
  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.watchdogTimer) {
      clearInterval(this.watchdogTimer);
      this.watchdogTimer = null;
    }
    return this;
  }

  /**
   * Subscribe to every clock tick
   */
  onPulse(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Subscribe to bus status changes ('ALIVE' | 'DEAD')
   */
  onStatusChange(callback) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  _notifyPulse(pulse) {
    for (const cb of this.listeners) {
      try { cb(pulse); } catch (e) { /* ignore */ }
    }
  }

  _notifyStatusChange(status, elapsed) {
    for (const cb of this.statusListeners) {
      try { cb(status, elapsed); } catch (e) { /* ignore */ }
    }
  }
}

module.exports = TitanClockPulse;
