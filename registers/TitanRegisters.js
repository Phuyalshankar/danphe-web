'use strict';

/**
 * 🏛️ TITAN UNIVERSAL HARDWARE REGISTER DIRECTORY (TitanRegisters.js)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure 16-Bit Memory-Mapped Universal Hardware Bus (0x0000 - 0xFFFF).
 * Standalone CommonJS / ES compatible register directory for Danphe-Native.
 */

const TITAN_REGISTERS = Object.freeze({
  // ZONE 0: System Core, Routing & Master Alerts (0x0000 - 0x0099)
  SYSTEM_MAGIC: 0x0000,
  SYS_POWER: 0x0001,
  SYS_HEARTBEAT: 0x0002,
  SYS_AUTH_TOKEN: 0x0003,
  SYS_STATUS_FLAGS: 0x0004,
  SYS_E_STOP: 9,
  SYS_ROUTE: 0x000a,
  SYS_THEME_MODE: 0x000c,
  SYS_CPU_USAGE: 0x0010,
  SYS_RAM_USED_MB: 0x0011,
  SYS_UPTIME_SEC: 0x0012,

  // ZONE 0B: Starter & Counter Module (0x0200 - 0x021F)
  REG_COUNTER: 0x0200,
  ACT_COUNTER_INC: 0x0201,
  ACT_COUNTER_DEC: 0x0202,
  ACT_COUNTER_RESET: 0x0203,
  ACT_COUNTER_SAVE: 0x0204,
  REG_COUNTER_STREAM: 0x0208,

  // Global Errors & Alerts (90 - 99)
  ERROR_MASTER: 90,
  ERROR_COUNT: 91,
  ERROR_MODULE: 92,
  ERROR_CODE: 93,
  ERROR_SEVERITY: 94,
  REMOTE_STATUS: 98,
  ERROR_JSON: 99,

  // ZONE 0: Universal Target Directives & Fixed Hardware Registers (0x00E0 - 0x00EF)
  TARGET_PULSE: 0x00E0,
  TARGET_FLIP: 0x00E1,
  TARGET_SAVE: 0x00E2,
  TARGET_DELETE: 0x00E3,
  TARGET_MIRROR: 0x00E4,
  TARGET_EDITABLE: 0x00E5,

  // ZONE 1: Android Hardware Sensors, Battery & Connectivity (0x1000 - 0x1050)
  TEL_BATTERY: 0x1000,
  TEL_CHARGING: 0x1001,
  BATTERY_PLUG_TYPE: 0x1002,
  BATTERY_TEMP: 0x1003,
  BATTERY_VOLTAGE_MV: 0x1004,
  BATTERY_HEALTH: 0x1005,
  TEL_ONLINE: 0x1010,
  NETWORK_TYPE: 0x1011,
  NETWORK_SIGNAL: 0x1012,
  BLUETOOTH_STATE: 0x1020,
  NFC_AVAILABLE: 0x1030,

  // ZONE 2: Hardware Actuators, Flashlight, Haptics & Audio (0x3000 - 0x3030)
  HW_HAPTIC: 0x3000,
  HW_FLASHLIGHT: 0x3010,
  HW_SCREEN_BRIGHTNESS: 0x3020,
  HW_KEEP_SCREEN_ON: 0x3021,
  AUDIO_VOLUME: 0x3030,
  AUDIO_MIC_MUTE: 0x3031,
  ACT_AUDIO_REC: 0x3032,
  ACT_AUDIO_STREAM: 0x3033,
  TEL_AUDIO_PEAK: 0x3034,
  TEL_AUDIO_TIMER: 0x3035,
  SYS_VOICE_OPCODE: 0x3038,

  // ZONE 2B: Hardware Universal Media & Multimedia Actuators (0x3060 - 0x307F)
  HW_ACT_CAMERA_PHOTO:        0x3060, // 12384: Launch Photo Camera Capture
  HW_ACT_CAMERA_VIDEO:        0x3061, // 12385: Launch Video Camera Recorder
  HW_ACT_PICK_IMAGE:           0x3062, // 12386: Direct Native Image Gallery Picker
  HW_ACT_PICK_VIDEO:           0x3063, // 12387: Direct Native Video Gallery Picker
  HW_ACT_PICK_AUDIO:           0x3064, // 12388: Native Audio/Music Picker
  HW_ACT_PICK_FILE:            0x3065, // 12389: Native Document/PDF File Picker
  HW_ACT_CAMERA_BG_REMOVE:     0x3066, // 12390: Capture Camera Photo + Auto Background Removal to Transparent PNG
  HW_ACT_MEDIA_RECORD_MIC:     0x3067, // 12391: Mic Voice Recording (1=Start, 0=Stop)
  HW_ACT_VIDEO_PLAY_PAUSE:     0x3068, // 12392: Video Player Play/Pause (1=Play, 0=Pause, 2=Toggle)
  HW_ACT_VIDEO_SEEK:           0x3069, // 12393: Video Timeline Seek (Value in 100ms units)
  HW_REG_MEDIA_STATUS:         0x306A, // 12394: 0=Idle, 1=Active, 2=Saved to TitanDisk, 3=Processing BG Remove, 4=Error
  HW_REG_MEDIA_COUNT:          0x306B, // 12395: Total count of processed media files
  HW_REG_MEDIA_TYPE:           0x306C, // 12396: 1=Image, 2=Audio, 3=Video, 4=Doc, 5=Transparent PNG Cutout
  HW_ACT_CCTV_CHANNEL:         0x306D, // 12397: CCTV Active Camera Channel (1=CAM01, 2=CAM02, 3=CAM03, 4=CAM04)

  // ZONE 3: UI Viewport & Scroll Registers
  UI_SCROLL_X: 0x0014,
  UI_SCROLL_Y: 0x0015,
  DISP_BRIGHTNESS: 0x0100,

  // ZONE 6: Universal Audio Stream, Telemetry & DataStore
  REG_CALL_STATE: 100,
  STREAM_SIG: 101,
  STREAM_AUDIO: 102,
  STREAM_CHANNEL_ACTIVE: 103,
  STREAM_STATUS: 104,
  NOTIF_BANNER: 109,
  NOTIF_PUSH: 110,
  NOTIF_ACK: 111,
  NOTIF_UNREAD_COUNT: 112,
  NOTIF_TOAST: 113,
  DISP_COMMAND: 200,
  DISP_CARD: 201,

  // ZONE 7: Generic DataStore & Relays
  DATA_FEED_LIVE: 2000,
  DATA_TELEMETRY: 2001,
  DATA_USERS: 2002,
  DATA_PAYMENTS: 2010,
  RELAY_1: 20001,
  RELAY_2: 20002,
  SOLENOID_LOCK: 20010,

  // ZONE 8: Universal CSS & Styling Tokens (0xC000 - 0xC020)
  CSS_DISPLAY_MODE: 0xc000,
  CSS_FLEX_DIRECTION: 0xc001,
  CSS_JUSTIFY_CONTENT: 0xc002,
  CSS_ALIGN_ITEMS: 0xc003,
  CSS_PALETTE_ID: 0xc010
});

function validateRegistersUniqueness() {
  const claimed = new Map();
  for (const [key, addr] of Object.entries(TITAN_REGISTERS)) {
    if (claimed.has(addr)) {
      const existingKey = claimed.get(addr);
      throw new Error(
        `🚨 [TitanRegisters Fatal Collision] Address 0x${addr.toString(16).toUpperCase()} (${addr}) is duplicated between '${existingKey}' and '${key}'!`
      );
    }
    claimed.set(addr, key);
  }
  return true;
}

validateRegistersUniqueness();

// 📋 MASTER PREDEFINED HUMAN-FRIENDLY ALIASES
const TITAN_ALIASES = Object.freeze({
  // 🎥 Video & Media Playback
  'videoplay':        0x3068,
  'mediaplay':        0x3068,
  'play':             0x3068,
  'videopause':       0x3068,
  'mediapause':       0x3068,
  'pause':            0x3068,
  'playpause':        0x3068,
  'toggleplay':       0x3068,
  'videostop':        0x3068,
  'mediastop':        0x3068,
  'stop':             0x3068,
  'medianext':        0x3066,
  'next':             0x3066,
  'mediaprev':        0x3067,
  'prev':             0x3067,
  'seekforward':      0x306E,
  'seekbackward':     0x306F,
  'fullscreen':       0x306D,
  'togglefullscreen': 0x306D,
  'videorecord':      0x3061,
  'videorec':         0x3061,

  // 🔊 Volume & Audio
  'volumeup':         0x3036,
  'volumedown':       0x3037,
  'volume':           0x3030,
  'mute':             0x3031,
  'togglemute':       0x3031,
  'micmute':          0x3031,
  'micrecord':        0x3032,
  'audiorecord':      0x3032,
  'micvu':            0x3034,
  'audiopeak':        0x3034,
  'micpeak':          0x3034,
  'audiotimer':       0x3035,
  'alertsound':       301,
  'soundalert':       301,
  'beep':             301,

  // 📸 Camera Subsystem
  'cameraopen':       0x3060,
  'cameracapture':    0x3060,
  'cameraphoto':      0x3060,
  'cameraflip':       0x3070,
  'camerasnap':       0x3073,
  'snap':             0x3073,
  'camerarotate':     0x3072,
  'rotatecamera':     0x3072,
  'camerafacing':     0x3074,
  'camerarotation':   0x3072,
  'torch':            0x3010,
  'torchtoggle':      0x3010,
  'flashlight':       0x3010,

  // 🖼️ Specialized Pickers & Mix Modes
  'photopick':        0x3061,
  'pickphoto':        0x3061,
  'videopick':        0x3062,
  'pickvideo':        0x3062,
  'mediapick':        0x3063,
  'gallerypick':      0x3063,
  'mixpick':          0x3063,
  'multipick':        0x3063,

  // 📡 P2P Swarm & Public Stream
  'publicshare':      0x3075,
  'sharepublic':      0x3075,
  'p2plive':          0x3071,
  'live':             0x3071,
  'cameralive':       0x3071,
  'golive':           0x3071,
  'p2pdiscover':      0x3072,
  'p2ppeers':         0x3073,
  'publicfilescount': 0x3074,
  'playpublicvideo':  0x3068,
  'playpublicaudio':  0x3030,
  'connectremotehost':0x3072,
  'copyhostlink':     0x3074,

  // 🖼️ Media Picker & Titan-Disk
  'pickimage':        0x3062,
  'disksync':         0x3063,
  'diskstatus':       0x306A,

  // 🔐 Security & Solenoid
  'biometricauth':    0x3080,
  'solenoidunlock':   20010,
  'solenoid':         20010,
  'doorunlock':       20010,
  'haptic1':          0x3001,
  'haptic2':          0x3002,
  'haptic3':          0x3003,
  'haptic4':          0x3004,

  // 📍 GPS / Location
  'gpsrequest':       0x1208,
  'gpslatitude':      0x1200,
  'gpslongitude':     0x1201,
  'gpsaltitude':      0x1202,
  'gpsaccuracy':      0x1203,

  // 📱 Device Actuators & Sensors
  'battery':          0x1000,
  'batterycharging':  0x1001,
  'lightlux':         0x10B0,
  'stepcounter':      0x10A0,
  'accelx':           0x1080,
  'accely':           0x1081,
  'accelz':           0x1082,
  'haptic':           0x3000,
  'vibrate':          0x3000,
  'brightness':       0x3020,
  'screenbrightness': 0x3020,
  'keepscreenon':     0x3021,
  'draweropen':       0x1101,
  'drawerclose':      0x1100,
  'drawertoggle':     0x1102,
  'themetoggle':      12,
  'pageroute':        10,

  // 🔢 Counters
  'counterinc':       0x0201,
  'counterdec':       0x0202,
  'counterreset':     0x0203,
  'counterval':       0x0200,

  // 🃏 3D Form / Target Operations
  'flip':             0x00E1,
  'save':             0x00E2,
  'delete':           0x00E3,

  // 📞 Calling & P2P
  'calldial':         0x10,
  'callanswer':       0x11,
  'callreject':       0x12,
  'callhangup':       0x13,
  'callstate':        100,
  'audiovu':          0x3034,
  'hosterstatus':     0x3072
});

// ── ⚡ DYNAMIC VARIABLE & NAMESPACE REGISTRY ──────────────────────────────────
const _dynamicRegistry = new Map();
const _dynamicSlots = new Map();
let _nextDynamicAddress = 0x4000; // Zone 4: Dynamic User Registers (0x4000 - 0x7FFF)

/**
 * 🏛️ FormRegister / Namespace Entity Representation
 * Binds a parent register with sequential 8-bit dynamic slots (name::field).
 */
class FormRegister {
  constructor(baseReg, name, fields = []) {
    this._baseReg = baseReg & 0xFFFF;
    this._name = String(name).trim();
    this._fields = new Map();
    this.valueOf = () => this._baseReg;
    this.toString = () => this._name;

    fields.forEach((field, index) => {
      const fieldName = String(field).trim();
      const slotId = (index + 1) & 0xFF; // Slots 1-255
      const fieldObj = {
        reg: this._baseReg,
        slot: slotId,
        name: fieldName,
        parent: this._name,
        fullName: `${this._name}::${fieldName}`,
        valueOf: () => this._baseReg,
        toString: () => `${this._name}::${fieldName}`
      };
      this[fieldName] = fieldObj;
      this._fields.set(fieldName, fieldObj);
      _dynamicRegistry.set(`${this._name}::${fieldName}`.toLowerCase(), fieldObj);
      _dynamicSlots.set(fieldName.toLowerCase(), slotId);
    });

    _dynamicRegistry.set(this._name.toLowerCase(), this);
  }

  getField(name) {
    return this._fields.get(name);
  }

  getFields() {
    return Array.from(this._fields.values());
  }

  getSlot(fieldName) {
    const f = this._fields.get(fieldName);
    return f ? f.slot : 0;
  }
}

/**
 * ⚡ defineRegisters / reg
 * Declares dynamic registers, forms, and slot namespaces.
 * Supports:
 *   - "reg form:: name, email, password;"
 *   - "form:: name, email, password"
 *   - { form: ['name', 'email', 'password'] }
 *   - { roomLight: 0, roomTemp: { default: 24 } }
 */
function defineRegisters(schema) {
  if (!schema) return {};

  // Case 1: String definition: "reg form:: name, email, password;" or "form:: name, email, password"
  if (typeof schema === 'string') {
    const cleaned = schema.replace(/^reg\s+/i, '').replace(/;+$/, '').trim();
    if (cleaned.includes('::')) {
      const [formPart, fieldsPart] = cleaned.split('::');
      const formName = formPart.trim();
      const fields = fieldsPart ? fieldsPart.split(',').map(s => s.trim()).filter(Boolean) : [];
      const baseReg = _nextDynamicAddress++;
      const formInstance = new FormRegister(baseReg, formName, fields);
      return formInstance;
    } else {
      // Comma-separated list of standalone registers: "roomLight, roomTemp, fanSpeed"
      const names = cleaned.split(',').map(s => s.trim()).filter(Boolean);
      const res = {};
      names.forEach(name => {
        const addr = _nextDynamicAddress++;
        const item = {
          reg: addr,
          slot: 0,
          name: name,
          valueOf: () => addr,
          toString: () => name
        };
        _dynamicRegistry.set(name.toLowerCase(), item);
        res[name] = item;
      });
      return res;
    }
  }

  // Case 2: Object schema
  if (typeof schema === 'object') {
    const res = {};
    for (const [key, val] of Object.entries(schema)) {
      if (Array.isArray(val)) {
        // Form entity: { form: ['name', 'email', 'password'] }
        const baseReg = _nextDynamicAddress++;
        res[key] = new FormRegister(baseReg, key, val);
      } else if (typeof val === 'string' && val.includes('::')) {
        // Nested string declaration
        const sub = defineRegisters(val);
        res[key] = sub;
      } else {
        // Single dynamic register
        const addr = (typeof val === 'number') ? (val & 0xFFFF) : (_nextDynamicAddress++);
        const item = {
          reg: addr,
          slot: 0,
          name: key,
          valueOf: () => addr,
          toString: () => key
        };
        _dynamicRegistry.set(key.toLowerCase(), item);
        res[key] = item;
      }
    }
    return res;
  }

  return {};
}

const reg = defineRegisters;

/**
 * ⚡ Master Register and Slot Resolver
 * Resolves raw numbers, hex strings, namespace symbols ("form::name"), or FormRegister handles.
 * @param {any} input
 * @returns {{ reg: number, slot: number, name?: string }}
 */
function resolveRegisterAndSlot(input) {
  if (input === undefined || input === null) return { reg: 0, slot: 0 };

  // If already a resolved handle or FormRegister field object
  if (typeof input === 'object' && input !== null) {
    const regVal = input.reg !== undefined ? (Number(input.reg) & 0xFFFF)
                 : (input._baseReg !== undefined ? (Number(input._baseReg) & 0xFFFF)
                 : (input.address !== undefined ? (Number(input.address) & 0xFFFF) : 0));
    const slotVal = input.slot !== undefined ? (Number(input.slot) & 0xFF) : 0;
    return { reg: regVal, slot: slotVal, name: input.name || '' };
  }

  if (typeof input === 'number') {
    return { reg: input & 0xFFFF, slot: 0 };
  }

  if (typeof input === 'string') {
    const s = input.trim();
    if (/^(0x[0-9a-f]+|\d+)$/i.test(s)) {
      return { reg: parseInt(s, s.startsWith('0x') || s.startsWith('0X') ? 16 : 10) & 0xFFFF, slot: 0 };
    }

    // Check dynamic namespace e.g. "form::name"
    const lower = s.toLowerCase();
    if (_dynamicRegistry.has(lower)) {
      const entry = _dynamicRegistry.get(lower);
      if (entry instanceof FormRegister) {
        return { reg: entry._baseReg, slot: 0, name: entry._name };
      }
      return { reg: entry.reg || 0, slot: entry.slot || 0, name: entry.name || '' };
    }

    // Split "form::name" manually if registered separately
    if (s.includes('::')) {
      const [parent, child] = s.split('::').map(x => x.trim().toLowerCase());
      if (_dynamicRegistry.has(parent)) {
        const pObj = _dynamicRegistry.get(parent);
        if (pObj instanceof FormRegister) {
          const f = pObj.getField(child);
          if (f) return { reg: f.reg, slot: f.slot, name: f.name };
        }
      }
    }

    // Standard static alias / constant
    const normalized = lower.replace(/[-_:\s]/g, '');
    if (TITAN_ALIASES[normalized] !== undefined) {
      return { reg: TITAN_ALIASES[normalized], slot: 0 };
    }
    for (const [k, v] of Object.entries(TITAN_REGISTERS)) {
      if (k.toLowerCase().replace(/[-_:\s]/g, '') === normalized) {
        return { reg: v, slot: 0 };
      }
    }
  }

  return { reg: 0, slot: 0 };
}

/**
 * ⚡ Master Slot Resolver
 * Resolves slot name or dynamic slot variable into integer 1-255.
 */
function resolveSlot(input) {
  if (input === undefined || input === null) return 0;
  if (typeof input === 'number') return input & 0xFF;
  if (typeof input === 'object' && input !== null && input.slot !== undefined) {
    return Number(input.slot) & 0xFF;
  }
  if (typeof input === 'string') {
    const s = input.trim();
    if (/^\d+$/.test(s)) return parseInt(s, 10) & 0xFF;
    const lower = s.toLowerCase();
    if (_dynamicSlots.has(lower)) return _dynamicSlots.get(lower);
  }
  return 0;
}

/**
 * ⚡ Master Register Resolver
 * Resolves raw numbers, hex strings, or human-friendly symbols into 16-bit register addresses.
 * @param {string|number|object} input
 * @returns {number} 16-bit Unsigned Integer (0 if unresolvable)
 */
function resolve(input) {
  const res = resolveRegisterAndSlot(input);
  return res.reg;
}

for (const [k, v] of Object.entries(TITAN_REGISTERS)) {
  exports[k] = v;
}

module.exports = {
  TITAN_REGISTERS,
  TITAN_ALIASES,
  resolve,
  resolveRegisterAndSlot,
  resolveSlot,
  defineRegisters,
  reg,
  FormRegister,
  validateRegistersUniqueness,
  ...TITAN_REGISTERS
};
