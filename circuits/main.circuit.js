'use strict';

/**
 * ⚡ TITAN MOTHERBOARD CIRCUIT (circuits/main.circuit.js)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure 16-Bit Memory-Mapped Modular Hardware Motherboard.
 * Aggregates all domain sub-circuits (Counter, System Routing, Telemetry).
 */

const { SYS_ROUTE, SYS_POWER, SYS_THEME_MODE } = require('../registers/TitanRegisters');
const counterCircuit = require('./counter.circuit');

module.exports = {
  // ── 1. Page Navigation Router (Register 10: SYS_ROUTE) ─────────────────────
  sysRoute: {
    address: SYS_ROUTE,
    initialValue: 0,
    onReceive: (routeIdx, { tx }) => {
      console.log(`[Motherboard] Switched Active Screen to: #${routeIdx}`);
      tx(SYS_ROUTE, routeIdx);
    }
  },

  // ── 2. Master Power Switch (Register 1: SYS_POWER) ─────────────────────────
  sysPower: {
    address: SYS_POWER,
    initialValue: 1,
    onReceive: (state, { tx }) => {
      console.log(`[Motherboard] System Power: ${state ? 'ON' : 'OFF'}`);
      tx(SYS_POWER, state ? 1 : 0);
    }
  },

  // ── 3. Theme Mode (Register 12: SYS_THEME_MODE) ────────────────────────────
  sysTheme: {
    address: SYS_THEME_MODE,
    initialValue: 1, // 1=Dark, 2=Light
    onReceive: (mode, { tx }) => {
      console.log(`[Motherboard] Theme set to: ${mode === 2 ? 'LIGHT' : 'DARK'}`);
      tx(SYS_THEME_MODE, mode);
    }
  },

  // ── 4. Subsystem Circuits ──────────────────────────────────────────────────
  ...counterCircuit
};
