'use strict';

/**
 * 🇳🇵 DANPHE-WEB — PURE JAVASCRIPT APPLICATION LOGIC (app.logic.js)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure normal JavaScript. Zero circuits, zero hardware simulation, zero bloat.
 * Each action is simply a clean JavaScript function receiving (data, { rx, tx, store }).
 */

const {
  REG_COUNTER,
  ACT_COUNTER_INC,
  ACT_COUNTER_DEC,
  ACT_COUNTER_RESET,
  ACT_COUNTER_SAVE,
  REG_COUNTER_STREAM,
  SYS_ROUTE,
  SYS_POWER,
  SYS_THEME_MODE
} = require('./registers/TitanRegisters');

function getContext(data, options) {
  if (data && typeof data === 'object' && typeof data.tx === 'function') {
    return data;
  }
  return options || {};
}

module.exports = {
  // ── 1. काउन्टर लजिक (Counter Logic) ──────────────────────────────────────────
  [ACT_COUNTER_INC]: (data, options) => {
    const { rx, tx } = getContext(data, options);
    const current = (rx ? rx(REG_COUNTER) : 0) || 0;
    const next = current + 1;
    console.log(`⚡ [App Logic] Increment: ${current} -> ${next}`);
    if (tx) tx(REG_COUNTER, next);
  },

  [ACT_COUNTER_DEC]: (data, options) => {
    const { rx, tx } = getContext(data, options);
    const current = (rx ? rx(REG_COUNTER) : 0) || 0;
    const next = Math.max(0, current - 1);
    console.log(`⚡ [App Logic] Decrement: ${current} -> ${next}`);
    if (tx) tx(REG_COUNTER, next);
  },

  [ACT_COUNTER_RESET]: (data, options) => {
    const { tx } = getContext(data, options);
    console.log(`⚡ [App Logic] Reset counter to 0`);
    if (tx) tx(REG_COUNTER, 0);
  },

  [ACT_COUNTER_SAVE]: (data, options) => {
    const { rx, tx, store } = getContext(data, options);
    const current = (rx ? rx(REG_COUNTER) : 0) || 0;
    const label = (data && typeof data === 'object' && (data.label || data.text)) || `Log #${Date.now().toString().slice(-4)}`;
    console.log(`⚡ [App Logic] Save record: "${label}" = ${current}`);
    if (store && typeof store.put === 'function') {
      store.put('counter_log', {
        id: Date.now(),
        label: label,
        value: current,
        status: 'SAVED',
        timestamp: new Date().toLocaleTimeString()
      });
      if (tx) tx(REG_COUNTER_STREAM, store.getAll('counter_log'));
    }
  },

  // ── 2. प्रणाली न्याभिगेसन र सेटिङ (System Navigation & Settings) ─────────────
  [SYS_ROUTE]: (screenId, options) => {
    const { tx } = getContext(screenId, options);
    if (tx) tx(SYS_ROUTE, screenId);
  },

  [SYS_POWER]: (state, options) => {
    const { tx } = getContext(state, options);
    if (tx) tx(SYS_POWER, state ? 1 : 0);
  },

  [SYS_THEME_MODE]: (mode, options) => {
    const { tx } = getContext(mode, options);
    if (tx) tx(SYS_THEME_MODE, mode);
  }
};
