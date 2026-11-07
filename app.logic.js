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

  // ── ३. सेटिङ लजिक (Settings Actions) ─────────────────────────────────────────
  'power:toggle': ({ rx, tx }) => {
    const current = rx ? rx('power') : 1;
    const next = current ? 0 : 1;
    console.log(`⚡ [App Logic] Power toggled: ${next ? 'ON' : 'OFF'}`);
    if (tx) {
      tx('power', next);
      tx('power_status', next ? 'चालू (ON) ⚡' : 'बन्द (OFF) 🔴');
      tx('alert_msg', next ? '⚡ मास्टर पावर चालू गरियो।' : '🔴 मास्टर पावर बन्द गरियो।');
    }
  },

  'theme:toggle': ({ rx, tx }) => {
    const current = (rx ? rx('theme') : 'dark') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    console.log(`⚡ [App Logic] Theme toggled to: ${next}`);
    if (tx) {
      tx('theme', next);
      tx('theme_label', next === 'light' ? 'उज्यालो (Light) ☀️' : 'गाढा (Dark) 🌙');
      tx('alert_msg', next === 'light' ? '☀️ उज्यालो थिम सक्रिय भयो।' : '🌙 गाढा थिम सक्रिय भयो।');
    }
  },

  'alert:test': ({ tx }) => {
    const time = new Date().toLocaleTimeString();
    console.log(`⚡ [App Logic] Alert tested at ${time}`);
    if (tx) {
      tx('alert_msg', `🔔 नयाँ सूचना: सेटिङ सफलतापूर्वक परीक्षण गरियो (${time})`);
    }
  },

  'data:reset': ({ tx }) => {
    console.log(`⚡ [App Logic] All data reset`);
    if (tx) {
      tx('counter::value', 0);
      tx('form::note', '');
      tx('alert_msg', '🔄 सम्पूर्ण काउन्टर र नोट डाटा शून्यमा रिसेट गरियो!');
    }
  }
};
