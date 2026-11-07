'use strict';

/**
 * ⚡ COUNTER CIRCUIT (circuits/counter.circuit.js)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure 16-Bit Memory-Mapped Sub-Circuit for Counter & Carrier Slot Inputs.
 * All JS business logic, validations, state transitions, and DB saves reside here.
 */

const {
  REG_COUNTER,
  ACT_COUNTER_INC,
  ACT_COUNTER_DEC,
  ACT_COUNTER_RESET,
  ACT_COUNTER_SAVE,
  REG_COUNTER_STREAM,
  HW_HAPTIC
} = require('../registers/TitanRegisters');
const { COUNTER_SLOTS } = require('../registers/TitanSlots');

module.exports = {
  // ── 1. Counter Value State Register (0x0200) ──────────────────────────────
  regCounter: {
    address: REG_COUNTER,
    initialValue: 0,
    onReceive: (val, { tx }) => {
      console.log(`[CounterCircuit] REG_COUNTER updated to: ${val}`);
      tx(REG_COUNTER, val);
    }
  },

  // ── 2. Increment Action (0x0201) ──────────────────────────────────────────
  actIncrement: {
    address: ACT_COUNTER_INC,
    initialValue: 0,
    onReceive: (_, { tx, rx }) => {
      const current = rx(REG_COUNTER) || 0;
      const next = current + 1;
      console.log(`[CounterCircuit] Increment: ${current} -> ${next}`);
      tx(REG_COUNTER, next);
      tx(HW_HAPTIC, 50); // Light haptic feedback
    }
  },

  // ── 3. Decrement Action (0x0202) ──────────────────────────────────────────
  actDecrement: {
    address: ACT_COUNTER_DEC,
    initialValue: 0,
    onReceive: (_, { tx, rx }) => {
      const current = rx(REG_COUNTER) || 0;
      const next = current > 0 ? current - 1 : 0;
      console.log(`[CounterCircuit] Decrement: ${current} -> ${next}`);
      tx(REG_COUNTER, next);
      tx(HW_HAPTIC, 50);
    }
  },

  // ── 4. Reset Action (0x0203) ──────────────────────────────────────────────
  actReset: {
    address: ACT_COUNTER_RESET,
    initialValue: 0,
    onReceive: (_, { tx }) => {
      console.log(`[CounterCircuit] Reset counter to 0`);
      tx(REG_COUNTER, 0);
      tx(HW_HAPTIC, 150); // Stronger haptic on reset
    }
  },

  // ── 5. Save to Local SQLite Store (0x0204) ────────────────────────────────
  actSave: {
    address: ACT_COUNTER_SAVE,
    initialValue: null,
    onReceive: (inputData, { tx, rx, store }) => {
      const current = rx(REG_COUNTER) || 0;
      const label = inputData?.label || inputData?.text || `Log #${Date.now().toString().slice(-4)}`;
      console.log(`[CounterCircuit] Save counter record: "${label}" = ${current}`);

      if (store) {
        store.put('counter_log', {
          id: Date.now(),
          label: label,
          value: current,
          status: 'SAVED',
          timestamp: new Date().toLocaleTimeString()
        });
        tx(REG_COUNTER_STREAM, store.getAll('counter_log'));
      }

      tx(90, `✅ सुरक्षित गरियो: ${label} = ${current}`);
      tx(HW_HAPTIC, 100);
    }
  }
};
