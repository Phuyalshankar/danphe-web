'use strict';

/**
 * 🇳🇵 DANPHE-WEB — PURE JAVASCRIPT APPLICATION LOGIC (app.logic.js)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure normal JavaScript. Zero register codes, zero hardware simulation.
 * Actions are simply clean JavaScript functions that read and update state.
 */

module.exports = {
  // ── १. काउन्टर लजिक (Counter Actions) ─────────────────────────────────────────
  'counter::inc': ({ rx, tx }) => {
    const current = (rx ? rx('counter::value') : 0) || 0;
    const next = current + 1;
    console.log(`⚡ [App Logic] Increment: ${current} -> ${next}`);
    if (tx) tx('counter::value', next);
  },

  'counter::dec': ({ rx, tx }) => {
    const current = (rx ? rx('counter::value') : 0) || 0;
    const next = Math.max(0, current - 1);
    console.log(`⚡ [App Logic] Decrement: ${current} -> ${next}`);
    if (tx) tx('counter::value', next);
  },

  'counter::reset': ({ tx }) => {
    console.log(`⚡ [App Logic] Reset counter to 0`);
    if (tx) tx('counter::value', 0);
  },

  // ── २. डाटा सेभ लजिक (Save Form Note) ─────────────────────────────────────────
  'form::save': ({ rx, tx }) => {
    const note = (rx ? rx('form::note') : '') || 'सामान्य नोट';
    console.log(`⚡ [App Logic] Note saved: "${note}"`);
    if (tx) {
      tx('db_status', `✅ सेभ भयो: ${new Date().toLocaleTimeString()}`);
    }
  },

  // ── ३. प्रणाली सेटिङ लजिक (System Settings) ──────────────────────────────────
  'power': ({ tx, value }) => {
    console.log(`⚡ [App Logic] Master power toggled`);
    if (tx) tx('power', value ? 1 : 0);
  }
};
