'use strict';

/**
 * 🏛️ TITAN MASTER SCHEMA (registers/schema.js)
 * ══════════════════════════════════════════════════════════════════════
 * Single Source of Truth for Hardware Registers (Parent) & Slots (Child).
 * 100% Type-Safe • Zero Raw Magic Numbers • Instant IDE Autocomplete
 */

const { COUNTER_SLOTS, ROOM_SLOTS, MENU_SLOTS, ORDER_SLOTS, USER_SLOTS } = require('./TitanSlots');

const SCHEMA = Object.freeze({
  // ===================================================================
  // 1. SYSTEM & ROUTING ZONE (0x0001 - 0x0099)
  // ===================================================================
  SYS: Object.freeze({
    POWER:        0x0001, // 1: Master System Power (0=Off, 1=On)
    HEARTBEAT:    0x0002, // 2: Watchdog Pulse Ticker
    AUTH_TOKEN:   0x0003, // 3: Rolling Security Token
    ROUTE:        0x000A, // 10: Active UI Screen Router (0=Home, 1=Settings, 2=Admin)
    THEME_MODE:   0x000C, // 12: Theme Mode (0=Auto, 1=Dark, 2=Light)
    CPU_USAGE:    0x0010, // 16: CPU Load % (0 - 100)
    RAM_USED_MB:  0x0011, // 17: RAM Usage in Megabytes
    UPTIME_SEC:   0x0012, // 18: System Uptime in Seconds
    ALERT_TOAST:  90,     // 90: Master UI Toast Message
    ALERT_JSON:   99,     // 99: Rich Debug JSON Error Payload
    HW_HAPTIC:    12288   // 12288: Mobile Hardware Vibration Pulse
  }),

  // ===================================================================
  // 2. HARDWARE TELEMETRY & SENSORS ZONE (0x1000 - 0x10FF)
  // ===================================================================
  TELEMETRY: Object.freeze({
    BATTERY:      0x1000, // 4096: Battery Level % (0 - 100)
    CHARGING:     0x1001, // 4097: Battery Charging State (0/1)
    ONLINE:       0x1010, // 4112: Network Connectivity (0/1)
    AUDIO_VOL:    512,    // 512: Master Audio Volume (0 - 1024)
    ACCEL_X:      0x1080, // Accelerometer X Axis
    ACCEL_Y:      0x1081, // Accelerometer Y Axis
    LIGHT:        0x10B0  // Ambient Light Sensor (Lux)
  }),

  // ===================================================================
  // 3. HOTEL ROOMS MODULE (Parent Registers + Child Slots 1 to 8)
  // ===================================================================
  COUNTER: Object.freeze({
    VAL:          0x0200,
    STEP:         0x0201,
    ACT_INC:      0x0201,
    ACT_DEC:      0x0202,
    ACT_RESET:    0x0203,
    ACT_SAVE:     0x0204,
    STREAM:       0x0208,
    SLOTS:        COUNTER_SLOTS
  }),

  ROOMS: Object.freeze({
    STREAM:       0x0624, // 24-byte hardware stream carrier
    TOTAL_COUNT:  0x0600, // Total Rooms count
    VACANT_COUNT: 0x0602, // Vacant count
    OCCUPIED:     0x0603, // Occupied count
    DAILY_REV:    0x0620, // Daily revenue total

    // Actions (TX)
    ACT_CREATE:   0x0601, // Create Room Trigger
    ACT_CHECKOUT: 0x0605, // Checkout Trigger
    ACT_DELETE:   0x0606, // Delete Room Trigger

    // Child Slots (1 to 8):
    SLOTS: ROOM_SLOTS
  }),

  // ===================================================================
  // 4. RESTAURANT MENU MODULE (Parent Registers + Child Slots)
  // ===================================================================
  MENU: Object.freeze({
    STREAM:       0x0628, // Menu stream carrier
    TOTAL_ITEMS:  0x0608, // Total menu items count
    ACT_CREATE:   0x060A, // Add Dish Trigger

    // Child Slots:
    SLOTS: MENU_SLOTS
  }),

  // ===================================================================
  // 5. ORDERS & BILLING MODULE
  // ===================================================================
  ORDERS: Object.freeze({
    STREAM:       0x0630, // Orders stream carrier
    TOTAL_COUNT:  0x0610, // Total orders count
    ACT_DISPATCH: 0x0612, // Dispatch Order Trigger

    // Child Slots:
    SLOTS: ORDER_SLOTS
  })
});

module.exports = {
  SCHEMA,
  SYS: SCHEMA.SYS,
  TELEMETRY: SCHEMA.TELEMETRY,
  ROOMS: SCHEMA.ROOMS,
  MENU: SCHEMA.MENU,
  ORDERS: SCHEMA.ORDERS,
  COUNTER: SCHEMA.COUNTER
};
