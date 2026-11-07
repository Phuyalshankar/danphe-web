'use strict';

/**
 * 🏷️ TITAN UNIVERSAL REGISTER TYPE SYSTEM (UI TO HARDWARE)
 * ─────────────────────────────────────────────────────────────
 * Strict type contracts and automatic casting across Titan-Bus.
 * Eliminates garbage bytes, type mismatches, and native runtime crashes.
 */

const TITAN_TYPE = Object.freeze({
  RAW:      0x00, // Dynamic / Unconstrained (UI state, large counters, arbitrary payloads)
  INT16:    0x01, // 16-Bit Signed Integer (-32768 to 32767) [Sensors, Coords, Counters]
  UINT8:    0x02, // 8-Bit Unsigned Analog Byte (0 to 255) [Volume, Opacity, PWM, Dimmer]
  INT8:     0x03, // 8-Bit Signed DSP Byte (-128 to 127) [EQ, Pan, Pitch]
  BOOL:     0x04, // 1-Bit Discrete Boolean (0 or 1) [Relays, Mute, Power, Switches]
  UINT16:   0x05, // 16-Bit Unsigned Word (0 to 65535) [ADC, Timecode ms, Frame Index]
  STRING:   0x06, // Variable Length UTF-8 Text [Usernames, Keypad, JSON error, Routes]
  STREAM:   0x07, // Multi-Record Collection Stream [Data streams, Lists]
  ACTION:   0x08  // Action / Pulse Event [Save, Delete, Flip, Dial, Call]
});

class TitanTypeSystem {
  constructor() {
    this.typeMap = new Map();
  }

  declare(reg, type) {
    const r = Number(reg) & 0xFFFF;
    let t = type;
    if (typeof type === 'string') {
      const s = type.toUpperCase().trim();
      t = TITAN_TYPE[s] || (s === 'INT' ? TITAN_TYPE.INT16 :
                            s === 'TEXT' ? TITAN_TYPE.STRING :
                            s === 'ANALOG' ? TITAN_TYPE.UINT8 :
                            s === 'BOOLEAN' ? TITAN_TYPE.BOOL : TITAN_TYPE.INT16);
    }
    this.typeMap.set(r, t);
    return t;
  }

  getType(reg) {
    const r = Number(reg) & 0xFFFF;
    if (this.typeMap.has(r)) return this.typeMap.get(r);

    // Automatic Zone Inference (UI to Hardware)
    if (r >= 0x4000 && r <= 0x44FF) return TITAN_TYPE.UINT8;   // Analog byte channels
    if (r >= 0x4700 && r <= 0x471F) return TITAN_TYPE.UINT16;  // Studio Anim duration/timecode
    if (r >= 0x00E0 && r <= 0x00EF) return TITAN_TYPE.ACTION;  // Target Directives (Save, Delete, etc.)
    if (r === 1010 || r === 1011 || r === 1000) return TITAN_TYPE.STRING; // Text buffers
    if (r === 0x062A || r === 0x062B || r === 0x0208) return TITAN_TYPE.STREAM; // Collection streams
    if (r >= 20000 && r <= 20050) return TITAN_TYPE.BOOL; // Hardware Relays (0 or 1)

    return TITAN_TYPE.RAW; // Dynamic / Unconstrained by default for general registers
  }

  cast(reg, value) {
    if (value === null || value === undefined) return value;
    const type = this.getType(reg);
    if (type === TITAN_TYPE.RAW) return value;

    switch (type) {
      case TITAN_TYPE.BOOL:
        return (value === true || value === 1 || value === '1' || value === 'on' || value === 'true' || value === 'ONLINE') ? 1 : 0;

      case TITAN_TYPE.UINT8: {
        const n = Number(value);
        if (isNaN(n)) return 0;
        return Math.max(0, Math.min(255, Math.round(n)));
      }

      case TITAN_TYPE.INT8: {
        const n = Number(value);
        if (isNaN(n)) return 0;
        return Math.max(-128, Math.min(127, Math.round(n)));
      }

      case TITAN_TYPE.UINT16: {
        const n = Number(value);
        if (isNaN(n)) return 0;
        return Math.max(0, Math.min(65535, Math.round(n)));
      }

      case TITAN_TYPE.INT16: {
        if (typeof value === 'string' && isNaN(Number(value)) && value.trim() !== '') {
          // If non-numeric string (e.g. "Home"), allow to pass without breaking existing routes
          return value;
        }
        const n = Number(value);
        if (isNaN(n)) return 0;
        return Math.max(-32768, Math.min(32767, Math.trunc(n)));
      }

      case TITAN_TYPE.STRING:
        if (typeof value === 'object' && value !== null) return value;
        return String(value ?? '');

      case TITAN_TYPE.STREAM:
      case TITAN_TYPE.ACTION:
      default:
        return value;
    }
  }
}

module.exports = {
  TITAN_TYPE,
  TitanTypeSystem
};
