'use strict';

/**
 * 🏛️ TITAN MASTER REGISTER SHEET — COMPLETE 300+ HARDWARE REGISTER MAP
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure 16-Bit Memory-Mapped Universal Hardware Bus (0x0000 - 0xFFFF)
 * Inbuilt directly into Danphe-Native for 100% Standalone, Zero-Dependency Operation.
 *
 * Full Symmetrical Parity across:
 *   - Android OS NDK & Kotlin System Driver (TitanDeviceBridge.kt)
 *   - Samsung ThorVG & Dolphin-CPP Vector Engine (TitanUniversalEngine.hpp)
 *   - Titan-Bus SISO Binary Protocol & 0ms Hotpatch Stream
 *   - Universal CSS & Universal Input Engines
 *   - TitanJSX Reactive UI Runtime
 */

const REGISTERS = Object.freeze({
    // =========================================================================
    // ZONE 0: System, Routing & Error Management (0x0000 - 0x0FFF & 90 - 99)
    // =========================================================================
    SYSTEM_MAGIC:               0x0000, // 0: 0x5449544E ("TITN") Signature
    SYS_POWER:                  0x0001, // 1: Master System Power (0=Off, 1=Run, 2=Reboot)
    SYS_HEARTBEAT:              0x0002, // 2: Watchdog Heartbeat Frame Ticker
    SYS_AUTH_TOKEN:             0x0003, // 3: Rolling Bearer Security Token
    SYS_STATUS_FLAGS:           0x0004, // 4: System Flags (Ready, Running, Suspended)
    SYS_ROUTE:                  0x000A, // 10: Active UI Page / View Route
    SYS_THEME_MODE:             0x000C, // 12: Theme Mode (0=Auto, 1=Dark, 2=Light)
    SYS_CPU_USAGE:              0x0010, // 16: CPU Load % (0 - 100)
    SYS_RAM_USED_MB:            0x0011, // 17: RAM Usage in Megabytes
    SYS_UPTIME_SEC:             0x0012, // 18: System Uptime in Seconds

    // Error Architecture (90 - 99)
    ERROR_MASTER:               90,     // 90: Master Alert / Toast Status
    ERROR_COUNT:                91,     // 91: Accumulated Error Counter
    ERROR_MODULE:               92,     // 92: Error Module Subsystem ID
    ERROR_CODE:                 93,     // 93: Error Classification Code
    ERROR_SEVERITY:             94,     // 94: Error Severity (1=Info, 2=Warn, 3=Fatal)
    REMOTE_STATUS:              98,     // 98: Remote Bridge Link State
    ERROR_JSON:                 99,     // 99: Rich Debug JSON Error Payload

    // =========================================================================
    // ZONE 1: Android Sensors, Battery & Connectivity (0x1000 - 0x17FF)
    // =========================================================================
    // Battery & Power (0x1000 - 0x101F)
    TEL_BATTERY:                0x1000, // 4096: Battery Level % (0 - 100)
    TEL_CHARGING:               0x1001, // 4097: Battery Charging Status (0=Discharging, 1=Charging)
    BATTERY_PLUG_TYPE:          0x1002, // 4098: Plug Type (0=Unplugged, 1=AC, 2=USB, 3=Wireless)
    BATTERY_TEMP:               0x1003, // 4099: Battery Temperature in 0.1 °C
    BATTERY_VOLTAGE_MV:         0x1004, // 4100: Battery Voltage in Millivolts (e.g. 4100 mV)
    BATTERY_HEALTH:             0x1005, // 4101: Battery Health Status (0=Good, 1=Overheat, 2=Dead)

    // Network & Connectivity (0x1010 - 0x102F & 0x1380 - 0x138F)
    TEL_ONLINE:                 0x1010, // 4112: Network Connectivity (0=Offline, 1=Online)
    NETWORK_TYPE:               0x1011, // 4113: Connection Type (0=None, 1=WiFi, 2=Cellular, 3=Ethernet)
    NETWORK_SIGNAL:             0x1012, // 4114: Network Signal Strength (0 - 4 bars)
    BLUETOOTH_STATE:            0x1020, // 4128: Bluetooth State (0=Off, 1=On, 2=Connected)
    NFC_AVAILABLE:              0x1030, // 4144: NFC Hardware Available (0/1)
    TEL_BIOMETRIC_STATUS:       0x1040, // 4160: Biometric Hardware State (0=None, 1=Ready, 2=Not Enrolled)
    TEL_BIOMETRIC_RESULT:       0x1041, // 4161: Biometric Result (0=Idle, 1=Success, 2=Failed, 3=Cancel)

    // Motion Sensors (NDK Fast Path) (0x1080 - 0x10FF)
    TEL_ACCEL_X:                0x1080, // 4224: Accelerometer X Axis (fixed-point / mm/s^2)
    TEL_ACCEL_Y:                0x1081, // 4225: Accelerometer Y Axis (fixed-point / mm/s^2)
    TEL_ACCEL_Z:                0x1082, // 4226: Accelerometer Z Axis (fixed-point / mm/s^2)
    GYRO_X:                     0x1090, // 4240: Gyroscope X Axis (rad/s)
    GYRO_Y:                     0x1091, // 4241: Gyroscope Y Axis (rad/s)
    GYRO_Z:                     0x1092, // 4242: Gyroscope Z Axis (rad/s)
    STEP_COUNTER:               0x10A0, // 4256: Step Counter Pedometer Total
    COMPASS_HEADING:            0x10A8, // 4264: Magnetometer Azimuth / Heading (0 - 360°)

    // Environmental Sensors (0x10B0 - 0x117F)
    TEL_LIGHT:                  0x10B0, // 4272: Ambient Light Sensor (Lux)
    PROXIMITY_CM:               0x1101, // 4353: Proximity Distance (cm)
    BAROMETER_HPA:              0x1102, // 4354: Barometer Atmospheric Pressure (hPa)
    AMBIENT_TEMP:               0x1103, // 4355: Ambient Room Temperature in 0.1 °C

    // Location & GPS (0x1200 - 0x123F)
    GPS_LATITUDE:               0x1200, // 4608: GPS Latitude (fixed-point × 1000000)
    GPS_LONGITUDE:              0x1201, // 4609: GPS Longitude (fixed-point × 1000000)
    GPS_ALTITUDE:               0x1202, // 4610: GPS Altitude (meters)
    GPS_ACCURACY:               0x1203, // 4611: GPS Accuracy Radius (meters)
    GPS_SPEED:                  0x1204, // 4612: GPS Ground Speed (m/s)
    GPS_BEARING:                0x1205, // 4613: GPS Heading / Bearing (0 - 360°)
    GPS_PERMISSION_STATUS:      0x1208, // 4616: GPS Permission (0=None, 1=Granted, 2=Denied)

    // =========================================================================
    // ZONE 2: UI Input Events, Multi-Touch & Physical Keys (0x2000 - 0x2FFF)
    // =========================================================================
    // Multi-Touch Pointer 0 (Primary)
    TOUCH_X:                    0x2000, // 8192: Pointer 0 X coordinate (pixels)
    TOUCH_Y:                    0x2001, // 8193: Pointer 0 Y coordinate (pixels)
    TOUCH_PRESSURE:             0x2002, // 8194: Pointer 0 Pressure (0 - 1000)
    TOUCH_STATE:                0x2003, // 8195: Pointer 0 State (0=Up, 1=Down, 2=Move, 3=Cancel)

    // Multi-Touch Pointer 1
    TOUCH_P1_X:                 0x2004, // 8196: Pointer 1 X coordinate
    TOUCH_P1_Y:                 0x2005, // 8197: Pointer 1 Y coordinate
    TOUCH_P1_PRESSURE:          0x2006, // 8198: Pointer 1 Pressure
    TOUCH_P1_STATE:             0x2007, // 8199: Pointer 1 State

    // Multi-Touch Pointer 2
    TOUCH_P2_X:                 0x2008, // 8200: Pointer 2 X coordinate
    TOUCH_P2_Y:                 0x2009, // 8201: Pointer 2 Y coordinate
    TOUCH_P2_PRESSURE:          0x200A, // 8202: Pointer 2 Pressure
    TOUCH_P2_STATE:             0x200B, // 8203: Pointer 2 State

    // Multi-Touch Pointer 3
    TOUCH_P3_X:                 0x200C, // 8204: Pointer 3 X coordinate
    TOUCH_P3_Y:                 0x200D, // 8205: Pointer 3 Y coordinate
    TOUCH_P3_PRESSURE:          0x200E, // 8206: Pointer 3 Pressure
    TOUCH_P3_STATE:             0x200F, // 8207: Pointer 3 State

    // Multi-Touch Pointer 4
    TOUCH_P4_X:                 0x2010, // 8208: Pointer 4 X coordinate
    TOUCH_P4_Y:                 0x2011, // 8209: Pointer 4 Y coordinate
    TOUCH_P4_PRESSURE:          0x2012, // 8210: Pointer 4 Pressure
    TOUCH_P4_STATE:             0x2013, // 8211: Pointer 4 State

    // Multi-Touch Pointers 5 to 9
    TOUCH_P5_X:                 0x2014, TOUCH_P5_Y: 0x2015, TOUCH_P5_STATE: 0x2017,
    TOUCH_P6_X:                 0x2018, TOUCH_P6_Y: 0x2019, TOUCH_P6_STATE: 0x201B,
    TOUCH_P7_X:                 0x201C, TOUCH_P7_Y: 0x201D, TOUCH_P7_STATE: 0x201F,
    TOUCH_P8_X:                 0x2020, TOUCH_P8_Y: 0x2021, TOUCH_P8_STATE: 0x2023,
    TOUCH_P9_X:                 0x2024, TOUCH_P9_Y: 0x2025, TOUCH_P9_STATE: 0x2027,
    TOUCH_COUNT:                0x2028, // 8232: Total Active Pointers Count (0 - 10)

    // Gestures (0x2200 - 0x221F)
    GESTURE_TYPE:               0x2200, // 8704: 0=None, 1=Tap, 2=DoubleTap, 3=LongPress, 4=Fling, 5=Pinch
    GESTURE_VELOCITY_X:         0x2201, // 8705: Gesture Velocity X (px/s)
    GESTURE_VELOCITY_Y:         0x2202, // 8706: Gesture Velocity Y (px/s)
    GESTURE_SCALE:              0x2203, // 8707: Pinch Zoom Factor (100 = 1.0x)

    // Physical Hardware Buttons (0x2400 - 0x241F)
    KEY_BACK:                   0x2400, // 9216: Back Key (1=Pressed, 0=Released)
    KEY_VOLUME_UP:              0x2401, // 9217: Volume Up Key
    KEY_VOLUME_DOWN:            0x2402, // 9218: Volume Down Key
    KEY_HEADSET_HOOK:           0x2403, // 9219: Headset / Earphone Hook Button
    KEY_POWER:                  0x2404, // 9220: Hardware Power Button

    // Display & Window Insets (0x2800 - 0x281F)
    SCREEN_WIDTH:               0x2800, // 10240: Physical Screen Width (pixels)
    SCREEN_HEIGHT:              0x2801, // 10241: Physical Screen Height (pixels)
    SCREEN_DPI:                 0x2802, // 10242: Screen Density DPI
    SCREEN_ORIENTATION:         0x2803, // 10243: 0=Portrait, 1=Landscape, 2=ReversePortrait, 3=ReverseLandscape
    SAFE_AREA_TOP:              0x2804, // 10244: Notch / Status Bar Top Inset (px)
    SAFE_AREA_BOTTOM:           0x2805, // 10245: Navigation Bar Bottom Inset (px)
    SAFE_AREA_LEFT:             0x2806, // 10246: Left Inset (px)
    SAFE_AREA_RIGHT:            0x2807, // 10247: Right Inset (px)
    SCREEN_REFRESH_RATE:        0x2808, // 10248: Display Refresh Rate (e.g. 60, 90, 120 Hz)

    // App Lifecycle (0x2A00 - 0x2A1F)
    APP_LIFECYCLE_STATE:        0x2A00, // 10752: 0=Destroyed, 1=Created, 2=Started, 3=Resumed, 4=Paused, 5=Stopped

    // =========================================================================
    // ZONE 3: Hardware Actuators & Actions (TX) (0x3000 - 0x3FFF)
    // =========================================================================
    ACT_HAPTIC:                 0x3000, // 12288: Haptic (1=Click, 2=Med, 3=Heavy, 4=Success, 5=Error)
    ACT_TORCH:                  0x3010, // 12304: Torch / Camera Flashlight (0=Off, 1=On)
    ACT_BRIGHTNESS:             0x3020, // 12320: Android Screen Brightness (0 - 255)
    ACT_WAKELOCK:               0x3021, // 12321: Keep Screen ON / WakeLock (0=Off, 1=On)
    ACT_MEDIA_VOL:              0x3030, // 12336: Android Media Stream Volume (0 - 100)
    ACT_CLIPBOARD:              0x3040, // 12352: System Clipboard (1=Copy, 2=Paste)
    ACT_REQUEST_PERMISSION:     0x3050, // 12368: Request OS Permission (1=Cam, 2=Mic, 3=Loc, 4=Storage)
    ACT_OPEN_CAMERA_APP:        0x3060, // 12384: Launch Native Camera App Intent
    ACT_RINGTONE_BEEP:          0x3070, // 12400: Play Hardware System Beep / Ringtone
    ACT_BIOMETRIC_AUTH:         0x3080, // 12416: Trigger Biometric Authentication Prompt (1=Start)

    // =========================================================================
    // ZONE 4: Media, Video NLE & ThorVG Blit (0x4000 - 0x4FFF)
    // =========================================================================
    // Transport & Playback
    ACT_PLAY:                   0x4001, // 16385: Play / Pause State (0=Pause, 1=Play)
    ACT_REW:                    0x4002, // 16386: Rewind Trigger
    ACT_FWD:                    0x4003, // 16387: Fast-Forward Trigger
    PLAYHEAD_SEC:               0x4004, // 16388: Current Playhead Position (seconds)
    AUDIO_PAN:                  0x4005, // 16389: Stereo Balance Pan (-100 to +100)
    MASTER_VOLUME:              0x4006, // 16390: Master Audio Gain (0 - 200%)
    TIMECODE_MS:                0x4007, // 16391: Millisecond Precision Timecode
    FPS_TARGET:                 0x4008, // 16392: Target Frame Rate (24, 30, 60, 120)
    DURATION_SEC:               0x4009, // 16393: Total Media Duration (seconds)

    // Video Geometry & Transform (0x4100 - 0x41FF)
    VIDEO_SCALE:                0x4100, // 16640: Video Scale (100 = 1.0x)
    VIDEO_ZOOM:                 0x4101, // 16641: Video Zoom Level
    VIDEO_ROTATION:             0x4102, // 16642: Rotation Angle (0 - 360°)
    VIDEO_PAN_X:                0x4103, // 16643: Pan Offset X (pixels)
    VIDEO_TILT:                 0x4104, // 16644: Video Tilt / Pan Offset Y
    VIDEO_OPACITY:              0x4105, // 16645: Opacity Layer (0 - 100%)
    VIDEO_SPEED:                0x4106, // 16646: Playback Speed (100 = 1.0x)
    ASPECT_RATIO:               0x4107, // 16647: 0=9:16 Shorts, 1=16:9, 2=1:1 Square
    CROP_LEFT:                  0x4108, CROP_RIGHT: 0x4109,
    CROP_TOP:                   0x410A, CROP_BOTTOM: 0x410B,
    GIZMO_ACTIVE:               0x410C, // 16652: Transform Gizmo Overlay Active (0/1)

    // Audio & Waveform EQ (0x4400 - 0x441F)
    AUDIO_VOLUME:               0x0200, // 512: Master Audio Volume (0 - 100)
    AUDIO_MUTE:                 0x0201, // 513: Audio Mute Toggle (0=No, 1=Yes)
    AUDIO_EQ_BASS:              0x4402, // 17410: Low-frequency Bass Gain (-12 to +12 dB)
    AUDIO_EQ_TREBLE:            0x4403, // 17411: High-frequency Treble Gain (-12 to +12 dB)
    BEAT_SYNC_FLAG:             0x4404, // 17412: Beat Detection Pulse (0/1)

    // =========================================================================
    // ZONE 5: Universal Component Slots (0x5000 - 0x6FFF)
    // 256 Dynamic Component Slots × 16 Registers per Slot
    // =========================================================================
    COMPONENT_TABLE_BASE:       0x5000, // 20480: Base address for component table
    MAX_COMPONENT_SLOTS:        256,
    REGISTERS_PER_COMPONENT:    16,

    // =========================================================================
    // ZONE 6: Business, Hotel Intercom & TitanDataStore (100 - 9999)
    // =========================================================================
    // Hotel Intercom & PBX Audio Bus (100 - 199)
    INTERCOM_SIG:               101,    // 101: Call Signaling (RING, ACCEPT, HANGUP)
    STREAM_AUDIO:               102,    // 102: 16kHz PCM Binary Voice Stream
    STREAM_CHANNEL_ACTIVE:      103,    // 103: Connected Stream Channel
    STREAM_STATUS:              104,    // 104: Call / Stream Status (0=IDLE, 1=RINGING, 2=TALKING)
    NOTIF_BANNER:               110,    // 110: Public Announcement / Banner
    NOTIF_TOAST:                111,    // 111: Instant Alert Toast

    // Generic DataStore Slots (2000 - 9999)
    DATA_FEED_LIVE:             2000,   // 2000: Live Ingest Feed
    DATA_TELEMETRY:             2001,   // 2001: Live Sensor Telemetry Stream
    DATA_USERS:                 2002,   // 2002: Guest & Users Database Slot
    DATA_PAYMENTS:              2010,   // 2010: Payments & Ledger
    DISP_BRIGHTNESS:            0x0100  // 256: Screen Brightness
});

/**
 * Reverse Lookup Dictionary: Address -> Register Name
 */
const REG_NAMES = {};
for (const [name, addr] of Object.entries(REGISTERS)) {
    REG_NAMES[addr] = name;
}

/**
 * Universal Parser for any .dolphin Register File
 */
function parseDolphinRegisters(content) {
    const result = { ...REGISTERS };
    if (!content || typeof content !== 'string') return result;

    const regex = /register\s+([A-Za-z0-9_]+)\s*=\s*(0x[0-9A-Fa-f]+|\d+);/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const key = match[1];
        const val = match[2].startsWith('0x') || match[2].startsWith('0X')
            ? parseInt(match[2], 16)
            : parseInt(match[2], 10);
        result[key] = val;
    }
    return result;
}

module.exports = {
    REGISTERS,
    REG: REGISTERS,
    REG_NAMES,
    parseDolphinRegisters
};
