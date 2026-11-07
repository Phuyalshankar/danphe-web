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
    const current = (rx ? rx('theme::current') : 'danphe') || 'danphe';
    const next = current === 'danphe' ? 'laligurans' : (current === 'laligurans' ? 'sagarmatha' : 'danphe');
    console.log(`⚡ [App Logic] Theme toggled to: ${next}`);
    if (tx) {
      tx('theme::current', next);
      tx('theme', next);
      tx('theme_label', next === 'laligurans' ? 'लालीगुराँस (Laligurans) 🌺' : (next === 'sagarmatha' ? 'सगरमाथा (Sagarmatha) 🏔️' : 'डाँफे (Danphe) 🦅'));
      tx('alert_msg', `🎨 ${next.toUpperCase()} हिमालयन थिम सक्रिय भयो!`);
    }
  },

  'theme::danphe': ({ tx }) => {
    if (tx) {
      tx('theme::current', 'danphe');
      tx('theme', 'danphe');
      tx('theme_label', 'डाँफे (Danphe) 🦅');
      tx('alert_msg', '🦅 डाँफे राष्ट्रिय रङ थिम सक्रिय भयो!');
    }
  },

  'theme::laligurans': ({ tx }) => {
    if (tx) {
      tx('theme::current', 'laligurans');
      tx('theme', 'laligurans');
      tx('theme_label', 'लालीगुराँस (Laligurans) 🌺');
      tx('alert_msg', '🌺 लालीगुराँस राष्ट्रिय फूल थिम सक्रिय भयो!');
    }
  },

  'theme::sagarmatha': ({ tx }) => {
    if (tx) {
      tx('theme::current', 'sagarmatha');
      tx('theme', 'sagarmatha');
      tx('theme_label', 'सगरमाथा (Sagarmatha) 🏔️');
      tx('alert_msg', '🏔️ सगरमाथा सर्वोच्च शिखर थिम सक्रिय भयो!');
    }
  },

  'theme::tilicho': ({ tx }) => {
    if (tx) {
      tx('theme::current', 'tilicho');
      tx('theme', 'tilicho');
      tx('theme_label', 'तिलिचो (Tilicho) 🌊');
      tx('alert_msg', '🌊 तिलिचो ताल थिम सक्रिय भयो!');
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
  },

  // ── ४. नेभिगेसन स्लट लजिक (Unified Navigation Actions) ──────────────────────
  'nav::home': ({ tx }) => {
    console.log(`🧭 [App Logic] Navigated to Home (Slot 1)`);
    if (tx) {
      tx('nav::current', 'home');
      tx(10, 0); // Hardware Register 10 (SYS_ROUTE) -> 0
    }
  },

  'nav::settings': ({ tx }) => {
    console.log(`🧭 [App Logic] Navigated to Settings (Slot 2)`);
    if (tx) {
      tx('nav::current', 'settings');
      tx(10, 3); // Hardware Register 10 (SYS_ROUTE) -> 3
    }
  }
};
