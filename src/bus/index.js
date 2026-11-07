'use strict';

/**
 * 🏔️ EVEREST FIELDBUS & TITAN MICRO BUS ENGINE (Integrated in Danphe Framework)
 * ═════════════════════════════════════════════════════════════════════════════
 * Re-exports the unified TitanMicroBus core with standard register definitions.
 */

const TitanCoreBus = require('../core/TitanMicroBus');

const REG = {
  // Core & Page Navigation (0 - 999)
  BUS_STATUS:          1,
  BUS_HEARTBEAT:       2,
  SECURITY_TOKEN:      3,
  SECURITY_STATUS:     4,
  SECURITY_FAILURES:   5,
  ACTIVE_SCREEN:       10,
  DRAWER_STATE:        11,
  THEME_MODE:          12,

  // Master Error Registers (90 - 99)
  ERROR_MASTER:        90,
  ERROR_COUNT:         91,
  ERROR_MODULE:        92,
  ERROR_CODE:          93,
  ERROR_SEVERITY:      94,
  ERROR_JSON:          99,

  // UI Registers (1,000 - 9,999)
  KEYPAD_DIAL_BUFFER:  1000,
  KEYPAD_LAST_KEY:     1001,
  LCD_LINE_1:          1010,
  LCD_LINE_2:          1011,

  // Hardware Registers (0x4000 - 0x44FF)
  AUDIO_MASTER_VOL:    0x4000,
  VIDEO_OPACITY:       0x4100,
  VIDEO_SCALE:         0x4101,
  VIDEO_POS_X:         0x4103,
  VIDEO_POS_Y:         0x4104,

  // Studio Motion Animation Registers (0x4700 - 0x4705)
  ANIM_STAGE:          0x4700,
  ANIM_OPCODE:         0x4701,
  ANIM_DURATION:       0x4702,
  ANIM_EASING:         0x4703,
  ANIM_TARGET:         0x4704,
  ANIM_TRIGGER:        0x4705,
};

module.exports = {
  ...TitanCoreBus,
  REG
};
