/**
 * 🏛️ TITAN UNIVERSAL HARDWARE REGISTER DIRECTORY (TitanRegisters.ts)
 * ═══════════════════════════════════════════════════════════════════════════════
 * 100% Strict Type-Safe Symmetrical Register Directory for Danphe-Native,
 * Titan-Bus, Circuit Engines, and Reactive JSX UI.
 *
 * Guaranteed Properties:
 * 1. Zero Duplicate Addresses (Enforced at Compile-Time & Runtime Pre-Flight).
 * 2. Instant Autocomplete & Inline JSDoc in any IDE.
 * 3. Exact 1:1 Match with Android Kotlin Native Siso Engine (0x0000 - 0xFFFF).
 */

// ─── 1. MASTER IMMUTABLE REGISTER DEFINITIONS ─────────────────────────────────

export const TITAN_REGISTERS = {
  // ===========================================================================
  // ZONE 0: System Core, Routing & Master Alerts (0x0000 - 0x0099)
  // ===========================================================================
  /** 0x0000 (0): System Magic Signature 0x5449544E ("TITN") */
  SYSTEM_MAGIC: 0x0000,
  /** 0x0001 (1): Master Power State (0=Off, 1=Run, 2=Reboot) */
  SYS_POWER: 0x0001,
  /** 0x0002 (2): Watchdog Heartbeat Frame Ticker Pulse */
  SYS_HEARTBEAT: 0x0002,
  /** 0x0003 (3): Rolling Bearer Security Token */
  SYS_AUTH_TOKEN: 0x0003,
  /** 0x0004 (4): System Status Flags (0=Boot, 1=Ready, 2=Suspended) */
  SYS_STATUS_FLAGS: 0x0004,
  /** 0x0009 (9): System Emergency Stop (E-Stop) */
  SYS_E_STOP: 9,
  /** 0x000A (10): Page Navigation Router (0=Reception, 1=Intercom, 2=QR, 3=Admin, 4=Security) */
  SYS_ROUTE: 0x000a,
  /** 0x000C (12): Theme Mode (0=Auto, 1=Dark, 2=Light) */
  SYS_THEME_MODE: 0x000c,
  /** 0x0010 (16): CPU Load Percentage (0 - 100) */
  SYS_CPU_USAGE: 0x0010,
  /** 0x0011 (17): RAM Used in Megabytes */
  SYS_RAM_USED_MB: 0x0011,
  /** 0x0012 (18): System Uptime in Seconds */
  SYS_UPTIME_SEC: 0x0012,

  // Global Errors & Alerts (90 - 99)
  /** 90: Master Alert / Toast Status */
  ERROR_MASTER: 90,
  /** 91: Accumulated System Error Counter */
  ERROR_COUNT: 91,
  /** 92: Error Module Subsystem ID */
  ERROR_MODULE: 92,
  /** 93: Error Classification Code */
  ERROR_CODE: 93,
  /** 94: Error Severity (1=Info, 2=Warn, 3=Fatal) */
  ERROR_SEVERITY: 94,
  /** 98: Remote Bridge Link State (0=Disconnected, 1=Connected) */
  REMOTE_STATUS: 98,
  /** 99: Rich Debug JSON Error Payload Register */
  ERROR_JSON: 99,

  // ===========================================================================
  // ZONE 1: Android Hardware Sensors, Battery & Connectivity (0x1000 - 0x1050)
  // ===========================================================================
  /** 0x1000 (4096): Battery Level Percentage (0 - 100) */
  TEL_BATTERY: 0x1000,
  /** 0x1001 (4097): Battery Charging Status (0=Discharging, 1=Charging) */
  TEL_CHARGING: 0x1001,
  /** 0x1002 (4098): Power Plug Type (0=Unplugged, 1=AC, 2=USB, 3=Wireless) */
  BATTERY_PLUG_TYPE: 0x1002,
  /** 0x1003 (4099): Battery Temperature in 0.1 °C */
  BATTERY_TEMP: 0x1003,
  /** 0x1004 (4100): Battery Voltage in Millivolts (e.g. 4100 mV) */
  BATTERY_VOLTAGE_MV: 0x1004,
  /** 0x1005 (4101): Battery Health (0=Good, 1=Overheat, 2=Dead) */
  BATTERY_HEALTH: 0x1005,
  /** 0x1010 (4112): Network Online Status (0=Offline, 1=Online) */
  TEL_ONLINE: 0x1010,
  /** 0x1011 (4113): Network Type (0=None, 1=WiFi, 2=Cellular, 3=Ethernet) */
  NETWORK_TYPE: 0x1011,
  /** 0x1012 (4114): Signal Strength (0 - 4 Bars) */
  NETWORK_SIGNAL: 0x1012,
  /** 0x1020 (4128): Bluetooth Hardware State (0=Off, 1=On, 2=Connected) */
  BLUETOOTH_STATE: 0x1020,
  /** 0x1030 (4144): NFC Hardware Available (0=No, 1=Yes) */
  NFC_AVAILABLE: 0x1030,

  // ===========================================================================
  // ZONE 2: Hardware Actuators, Flashlight, Haptics & Audio (0x3000 - 0x3030)
  // ===========================================================================
  /** 0x3000 (12288): Haptic Vibration Pulse Trigger (milliseconds) */
  HW_HAPTIC: 0x3000,
  /** 0x3010 (12304): Flashlight Torch State (0=Off, 1=On) */
  HW_FLASHLIGHT: 0x3010,
  /** 0x3020 (12320): Screen Brightness Override (0 - 255) */
  HW_SCREEN_BRIGHTNESS: 0x3020,
  /** 0x3021 (12321): WakeLock Keep Screen On (0=Disabled, 1=Active) */
  HW_KEEP_SCREEN_ON: 0x3021,
  /** 0x3030 (12336): Master Speaker Volume (0 - 100) */
  AUDIO_VOLUME: 0x3030,
  /** 0x3031 (12337): Microphone Mute State (0=Unmuted, 1=Muted) */
  AUDIO_MIC_MUTE: 0x3031,

  // ===========================================================================
  // ZONE 3: Hotel Operations, Real-Time Stats & Opcodes (0x0600 - 0x060F)
  // ===========================================================================
  /** 0x0600 (1536): कुल कोठा संख्या (Hotel Total Rooms) */
  HOTEL_TOTAL_ROOMS: 0x0600,
  /** 0x0601 (1537): पाहुना भएका कोठा संख्या (Occupied Rooms) */
  HOTEL_OCCUPIED_ROOMS: 0x0601,
  /** 0x0602 (1538): खाली कोठा संख्या (Vacant Rooms) */
  HOTEL_VACANT_ROOMS: 0x0602,
  /** 0x0603 (1539): कुल मेनु परिकार संख्या (Menu Items Count) */
  HOTEL_MENU_ITEMS_COUNT: 0x0603,

  // ===========================================================================
  // ZONE 4: Room Live Status Registers (0x0610 - 0x061F)
  // State: 0=VACANT, 1=OCCUPIED, 2=IN_CALL, 3=RINGING, 4=GUEST_ONLINE
  // ===========================================================================
  /** 0x0610 (1552): रुम १०१ स्थिति (Room 101 Live Status) */
  ROOM_101_STATUS: 0x0610,
  /** 0x0611 (1553): रुम १०२ स्थिति (Room 102 Live Status) */
  ROOM_102_STATUS: 0x0611,
  /** 0x0612 (1554): रुम २०१ स्थिति (Room 201 Live Status) */
  ROOM_201_STATUS: 0x0612,
  /** 0x0613 (1555): रुम ३०४ स्थिति (Room 304 Live Status) */
  ROOM_304_STATUS: 0x0613,
  /** 0x0614 (1556): रुम ३०५ स्थिति (Room 305 Live Status) */
  ROOM_305_STATUS: 0x0614,

  // ===========================================================================
  // ZONE 5: Hotel Operations & Command Opcodes (0x0620 - 0x062F)
  // ===========================================================================
  /** 0x0620 (1568): नयाँ कोठा दर्ता गर्ने अपकोड (Create Room to Disk) */
  HOTEL_ACTION_CREATE_ROOM: 0x0620,
  /** 0x0621 (1569): पाहुना चेक-आउट अपकोड (Room Checkout Opcode) */
  HOTEL_ACTION_CHECKOUT: 0x0621,
  /** 0x0622 (1570): पाहुना चेक-इन अपकोड (Room Checkin Opcode) */
  HOTEL_ACTION_CHECKIN: 0x0622,
  /** 0x0623 (1571): कोठा क्युआर प्रिन्ट अपकोड (Print QR Sheet Opcode) */
  HOTEL_ACTION_PRINT_QR: 0x0623,
  /** 0x0624 (1572): इन्टरकम कल अपकोड (Intercom Call Opcode) */
  HOTEL_ACTION_CALL_ROOM: 0x0624,

  // ===========================================================================
  // ZONE 6: Menu Availability & Service Registers (0x0630 - 0x063F)
  // State: 1 = Available (उपलब्ध), 0 = Sold Out (सकिएको)
  // ===========================================================================
  /** 0x0630 (1584): नयाँ मेनु थप्ने अपकोड (Create Menu Item) */
  HOTEL_ACTION_CREATE_MENU: 0x0630,
  /** 0x0631 (1585): मिनरल वाटर स्थिति (Mineral Water Availability) */
  MENU_ITEM_M01_AVAIL: 0x0631,
  /** 0x0632 (1586): मसाला चिया वा कफी स्थिति (Tea / Coffee Availability) */
  MENU_ITEM_M02_AVAIL: 0x0632,
  /** 0x0633 (1587): नेपाली थाली खाना स्थिति (Nepali Thali Availability) */
  MENU_ITEM_M03_AVAIL: 0x0633,
  /** 0x0634 (1588): स्टिम चिकेन मोमो स्थिति (Chicken Momo Availability) */
  MENU_ITEM_M04_AVAIL: 0x0634,
  /** 0x0635 (1589): कोठा सरसफाइ सेवा स्थिति (Room Cleaning Service Availability) */
  MENU_ITEM_M05_AVAIL: 0x0635,
  /** 0x0636 (1590): एयरपोर्ट ट्याक्सी क्याब स्थिति (Airport Taxi Availability) */
  MENU_ITEM_M07_AVAIL: 0x0636,

  // ===========================================================================
  // ZONE 7: Financials, Ledger & Database Sync (0x0640 - 0x064F)
  // ===========================================================================
  /** 0x0640 (1600): आजको कुल कारोबार रु. (Hotel Daily Revenue) */
  HOTEL_DAILY_REVENUE: 0x0640,
  /** 0x0641 (1601): संचित कमिसन रु. (Hotel Commission Accumulated) */
  HOTEL_COMMISSION_ACC: 0x0641,
  /** 0x0642 (1602): पछिल्लो अर्डर आईडी (Hotel Last Order ID) */
  HOTEL_LAST_ORDER_ID: 0x0642,
  /** 0x0643 (1603): डिस्क सिंक स्थिति (1=Synced, 0=Syncing) */
  HOTEL_DB_SYNC_STATUS: 0x0643,

  // ===========================================================================
  // ZONE 8: Universal CSS & Styling Tokens (0xC000 - 0xC020)
  // ===========================================================================
  /** 0xC000 (49152): CSS Display Mode (0=None, 1=Flex, 2=Grid, 3=Block) */
  CSS_DISPLAY_MODE: 0xc000,
  /** 0xC001 (49153): CSS Flex Direction (0=Row, 1=Column) */
  CSS_FLEX_DIRECTION: 0xc001,
  /** 0xC002 (49154): CSS Justify Content (0=Start, 1=Center, 2=Between, 3=End) */
  CSS_JUSTIFY_CONTENT: 0xc002,
  /** 0xC003 (49155): CSS Align Items (0=Start, 1=Center, 2=Stretch, 3=End) */
  CSS_ALIGN_ITEMS: 0xc003,
  /** 0xC010 (49168): CSS Active Theme Palette ID */
  CSS_PALETTE_ID: 0xc010
} as const;

// ─── 2. STRICT TYPE GUARDS & COLLISION DETECTION ─────────────────────────────

export type TitanRegisterKey = keyof typeof TITAN_REGISTERS;
export type TitanRegisterAddress = typeof TITAN_REGISTERS[TitanRegisterKey];

/**
 * 🛡️ Compile-Time Collision Validator
 * If two keys have the exact same address, TypeScript will throw a type error.
 */
type ValuesOf<T> = T[keyof T];
type VerifyUniqueAddresses<T extends Record<string, number>> = {
  [K in keyof T]: {
    [P in keyof T]: P extends K ? never : T[P] extends T[K] ? `🚨 COLLISION: Register address collision between '${Extract<K, string>}' and '${Extract<P, string>}'!` : never;
  }[keyof T];
};

// Compile-time check (will fail compilation if any address is duplicated)
type __CheckNoCollisions = VerifyUniqueAddresses<typeof TITAN_REGISTERS>[keyof typeof TITAN_REGISTERS] extends never ? true : false;
const __assertNoCollisions: __CheckNoCollisions = true;

/**
 * 🛡️ Runtime Pre-Flight Collision Detector
 * Asserts uniqueness at app boot time. Throws detailed error if any collision occurs.
 */
export function validateRegistersUniqueness(): boolean {
  const claimed = new Map<number, string>();
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

// Pre-flight run on import
validateRegistersUniqueness();

// ─── 3. INDIVIDUAL NAMED EXPORTS FOR INSTANT IDE AUTOCOMPLETE ─────────────────

export const {
  SYSTEM_MAGIC,
  SYS_POWER,
  SYS_HEARTBEAT,
  SYS_AUTH_TOKEN,
  SYS_STATUS_FLAGS,
  SYS_E_STOP,
  SYS_ROUTE,
  SYS_THEME_MODE,
  SYS_CPU_USAGE,
  SYS_RAM_USED_MB,
  SYS_UPTIME_SEC,
  ERROR_MASTER,
  ERROR_COUNT,
  ERROR_MODULE,
  ERROR_CODE,
  ERROR_SEVERITY,
  REMOTE_STATUS,
  ERROR_JSON,
  TEL_BATTERY,
  TEL_CHARGING,
  BATTERY_PLUG_TYPE,
  BATTERY_TEMP,
  BATTERY_VOLTAGE_MV,
  BATTERY_HEALTH,
  TEL_ONLINE,
  NETWORK_TYPE,
  NETWORK_SIGNAL,
  BLUETOOTH_STATE,
  NFC_AVAILABLE,
  HW_HAPTIC,
  HW_FLASHLIGHT,
  HW_SCREEN_BRIGHTNESS,
  HW_KEEP_SCREEN_ON,
  AUDIO_VOLUME,
  AUDIO_MIC_MUTE,
  HOTEL_TOTAL_ROOMS,
  HOTEL_OCCUPIED_ROOMS,
  HOTEL_VACANT_ROOMS,
  HOTEL_MENU_ITEMS_COUNT,
  ROOM_101_STATUS,
  ROOM_102_STATUS,
  ROOM_201_STATUS,
  ROOM_304_STATUS,
  ROOM_305_STATUS,
  HOTEL_ACTION_CREATE_ROOM,
  HOTEL_ACTION_CHECKOUT,
  HOTEL_ACTION_CHECKIN,
  HOTEL_ACTION_PRINT_QR,
  HOTEL_ACTION_CALL_ROOM,
  HOTEL_ACTION_CREATE_MENU,
  MENU_ITEM_M01_AVAIL,
  MENU_ITEM_M02_AVAIL,
  MENU_ITEM_M03_AVAIL,
  MENU_ITEM_M04_AVAIL,
  MENU_ITEM_M05_AVAIL,
  MENU_ITEM_M07_AVAIL,
  HOTEL_DAILY_REVENUE,
  HOTEL_COMMISSION_ACC,
  HOTEL_LAST_ORDER_ID,
  HOTEL_DB_SYNC_STATUS,
  CSS_DISPLAY_MODE,
  CSS_FLEX_DIRECTION,
  CSS_JUSTIFY_CONTENT,
  CSS_ALIGN_ITEMS,
  CSS_PALETTE_ID
} = TITAN_REGISTERS;

export default TITAN_REGISTERS;
