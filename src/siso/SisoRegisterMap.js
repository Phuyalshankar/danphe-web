'use strict';

/**
 * 🗺️ SisoRegisterMap — Master 16-Bit Register Directory (0x0000 - 0xFFFF)
 * Universal hardware-mapped registers for Danphe-2 / Titan Architecture.
 * Bridges state property keys directly to 16-bit hardware memory addresses.
 */

// 1. Core 16-Bit Hardware Registers
const REG = Object.freeze({
    // ── 0x4000 - 0x40FF: Transport & Playback State ──
    PLAYBACK_STATE:       0x4001, // 0 = Paused, 1 = Playing
    PLAYHEAD_SEC:         0x4002, // Current playhead time in seconds (integer or fixed-point)
    MASTER_VOLUME:        0x4003, // 0% - 200% Master audio gain
    TIMECODE_MS:          0x4004, // Millisecond precision timecode
    FPS_TARGET:           0x4005, // e.g. 24, 30, 60, 120
    DURATION_SEC:         0x4006, // Total duration in seconds

    // ── 0x4100 - 0x41FF: Video Transform, Geometry & Gizmo ──
    VIDEO_SCALE:          0x4100, // Zoom / Scale percentage (10% - 400%, 100 = 1.0x)
    VIDEO_ROTATION:       0x4101, // Rotation angle in degrees (0 - 360 or -180 to +180)
    VIDEO_PAN_X:          0x4102, // Horizontal pan offset (-500 to +500 px)
    VIDEO_PAN_Y:          0x4103, // Vertical pan offset (-500 to +500 px)
    VIDEO_OPACITY:        0x4104, // Layer opacity (0% - 100%)
    VIDEO_SPEED:          0x4105, // Playback speed rate (100 = 1.0x, 25 = 0.25x, 400 = 4.0x)
    ASPECT_RATIO:         0x4106, // 0 = 9:16 Shorts, 1 = 16:9 Cinema, 2 = 1:1 Square, 3 = 4:5
    CROP_LEFT:            0x4107, // Crop left margin (0 - 100%)
    CROP_RIGHT:           0x4108, // Crop right margin (0 - 100%)
    CROP_TOP:             0x4109, // Crop top margin (0 - 100%)
    CROP_BOTTOM:          0x410A, // Crop bottom margin (0 - 100%)
    GIZMO_ACTIVE:         0x410B, // 1 = Transform Gizmo visible & active on canvas, 0 = hidden

    // ── 0x4200 - 0x42FF: NLE Timeline, Tracks & Lane Selection ──
    ACTIVE_LANE:          0x4200, // Active track index (0 = Video V1, 1 = Audio A1, 2 = Text T1, 3 = Overlay)
    ACTIVE_TOOL:          0x4201, // Active tool opcode (Split, Trim, Zoom, Rotate, Speed, Volume)
    SELECTED_CLIP_ID:     0x4202, // Active selected clip index
    CLIP_START_MS:        0x4203, // Clip in-point on timeline
    CLIP_WIDTH_PX:        0x4204, // Clip visual width on timeline canvas
    CLIP_DURATION_SEC:    0x4205, // Clip trimmed duration in seconds
    SPLIT_TRIGGER:        0x4206, // 1 = Trigger split cut at playhead
    TRIM_IN_TRIGGER:      0x4207, // 1 = Trigger trim left
    TRIM_OUT_TRIGGER:     0x4208, // 1 = Trigger trim right
    DELETE_TRIGGER:       0x4209, // 1 = Trigger delete segment

    // ── 0x4300 - 0x43FF: Master Hardware Slider Dock ──
    SLIDER_ACTIVE_REG:    0x4300, // Register currently bound to the analog hardware slider
    SLIDER_RAW_VAL:       0x4301, // 0 - 255 Raw analog slider fader position
    SLIDER_MIN:           0x4302, // Minimum range bound
    SLIDER_MAX:           0x4303, // Maximum range bound
    SLIDER_STEP:          0x4304, // Stepper delta (for [-] and [+] buttons)
    SLIDER_UNIT_CODE:     0x4305, // 0 = %, 1 = x, 2 = °, 3 = dB, 4 = #
    SLIDER_PRESET_CYCLE:  0x4306, // Discrete preset hop index

    // ── 0x4400 - 0x44FF: Audio & Waveform Processing ──
    AUDIO_GAIN:           0x4400, // Master volume (0 - 200%)
    AUDIO_MUTE:           0x4401, // 0 = Unmuted, 1 = Muted
    AUDIO_EQ_BASS:        0x4402, // Low-frequency gain (-12dB to +12dB)
    AUDIO_EQ_TREBLE:      0x4403, // High-frequency gain (-12dB to +12dB)
    BEAT_SYNC_FLAG:       0x4404, // 0 = Off, 1 = Active beat-detection sync

    // ── 0x4500 - 0x45FF: Typography & Text Layer ──
    TEXT_FONT_INDEX:      0x4500, // Danphe Font ID (0 - 255)
    TEXT_FONT_SIZE:       0x4501, // Font size (pt/px)
    TEXT_COLOR_RGB:       0x4502, // 24-bit RGB packed color
    TEXT_BG_RADIUS:       0x4503, // Background box corner radius (px)
    TEXT_ANIMATION_ID:    0x4504, // Text kinetic motion preset (0 - 255)

    // ── 0x4600 - 0x46FF: System Status, Telemetry & Security ──
    SYSTEM_STATUS_OPCODE: 0x4600, // Status display opcode
    SISO_LOG_OPCODE:      0x4601, // Binary log telemetry opcode
    SECURITY_TOKEN:       0x4602, // 8-bit Titan-Shield rolling security token
    EXPORT_PROGRESS:      0x4603, // Export completion percentage (0 - 100%)
    EXPORT_STATUS:        0x4604, // 0 = IDLE, 1 = RENDERING, 2 = FINISHED, 3 = ERROR
    THEME_MODE:           0x4605, // 0 = Dark, 1 = Light
});

// 2. Default Name-to-Register Lookup Table
const KEY_TO_REG_MAP = {
    // Playback
    isPlaying:            REG.PLAYBACK_STATE,
    playbackState:        REG.PLAYBACK_STATE,
    currentTime:          REG.PLAYHEAD_SEC,
    playheadSec:          REG.PLAYHEAD_SEC,
    totalDuration:        REG.DURATION_SEC,
    fps:                  REG.FPS_TARGET,
    timecodeMs:           REG.TIMECODE_MS,

    // Video & Transform & Gizmo
    zoom:                 REG.VIDEO_SCALE,
    scale:                REG.VIDEO_SCALE,
    rotation:             REG.VIDEO_ROTATION,
    panX:                 REG.VIDEO_PAN_X,
    panY:                 REG.VIDEO_PAN_Y,
    opacity:              REG.VIDEO_OPACITY,
    speed:                REG.VIDEO_SPEED,
    aspectRatio:          REG.ASPECT_RATIO,
    cropLeft:             REG.CROP_LEFT,
    cropRight:            REG.CROP_RIGHT,
    cropTop:              REG.CROP_TOP,
    cropBottom:           REG.CROP_BOTTOM,
    isGizmoActive:        REG.GIZMO_ACTIVE,

    // NLE Timeline & Lanes
    activeLane:           REG.ACTIVE_LANE,
    selectedTrackType:    REG.ACTIVE_LANE,
    activeTool:           REG.ACTIVE_TOOL,
    selectedClipId:       REG.SELECTED_CLIP_ID,
    clipStart:            REG.CLIP_START_MS,
    clipWidth:            REG.CLIP_WIDTH_PX,
    clipDuration:         REG.CLIP_DURATION_SEC,

    // Slider Dock
    sliderReg:            REG.SLIDER_ACTIVE_REG,
    sliderParam:          REG.SLIDER_ACTIVE_REG,
    sliderVal:            REG.SLIDER_RAW_VAL,
    sliderMin:            REG.SLIDER_MIN,
    sliderMax:            REG.SLIDER_MAX,
    sliderStep:           REG.SLIDER_STEP,

    // Audio
    volume:               REG.AUDIO_GAIN,
    isMuted:              REG.AUDIO_MUTE,
    beatSyncActive:       REG.BEAT_SYNC_FLAG,

    // Text
    fontIndex:            REG.TEXT_FONT_INDEX,
    fontSize:             REG.TEXT_FONT_SIZE,
    bgRadius:             REG.TEXT_BG_RADIUS,
    animationIndex:       REG.TEXT_ANIMATION_ID,

    // System
    status:               REG.SYSTEM_STATUS_OPCODE,
    sisoLog:              REG.SISO_LOG_OPCODE,
    exportProgress:       REG.EXPORT_PROGRESS,
    exportStatus:         REG.EXPORT_STATUS,
    theme:                REG.THEME_MODE,
};

// 3. Dynamic Registration Store for Custom App Keys (0x4800 - 0x4FFF)
const dynamicKeyMap = new Map();
const dynamicRegMap = new Map();
let nextDynamicReg = 0x4800;

class SisoRegisterMap {
    static get REG() {
        return REG;
    }

    /**
     * Resolves a key name or existing register into a valid 16-bit register address.
     * If the key is not in the standard map, dynamically allocates a register for it.
     */
    static resolveRegister(keyOrReg) {
        if (typeof keyOrReg === 'number') {
            return keyOrReg & 0xFFFF;
        }
        if (typeof keyOrReg !== 'string') {
            return 0x0000;
        }

        // Check if string is a hex representation like '0x4100' or decimal string
        if (keyOrReg.startsWith('0x') || keyOrReg.startsWith('0X')) {
            const parsed = parseInt(keyOrReg, 16);
            if (!isNaN(parsed)) return parsed & 0xFFFF;
        }
        if (!isNaN(Number(keyOrReg)) && keyOrReg.trim() !== '') {
            return Number(keyOrReg) & 0xFFFF;
        }

        // Standard lookup
        if (KEY_TO_REG_MAP[keyOrReg] !== undefined) {
            return KEY_TO_REG_MAP[keyOrReg];
        }

        // Dynamic key lookup
        if (dynamicKeyMap.has(keyOrReg)) {
            return dynamicKeyMap.get(keyOrReg);
        }

        // Auto-allocate dynamic register
        const allocated = nextDynamicReg;
        nextDynamicReg = ((nextDynamicReg + 1) & 0x4FFF) || 0x4800;
        dynamicKeyMap.set(keyOrReg, allocated);
        dynamicRegMap.set(allocated, keyOrReg);
        return allocated;
    }

    /**
     * Reverse lookup: finds property name from register address.
     */
    static resolveKeyName(reg) {
        reg = reg & 0xFFFF;
        // Standard check
        for (const [k, r] of Object.entries(KEY_TO_REG_MAP)) {
            if (r === reg) return k;
        }
        // Dynamic check
        if (dynamicRegMap.has(reg)) {
            return dynamicRegMap.get(reg);
        }
        return `reg_0x${reg.toString(16).toUpperCase().padStart(4, '0')}`;
    }

    /**
     * Registers a custom state key explicitly to a specific register.
     */
    static mapKeyToRegister(key, reg) {
        dynamicKeyMap.set(key, reg & 0xFFFF);
        dynamicRegMap.set(reg & 0xFFFF, key);
    }
}

module.exports = {
    REG,
    KEY_TO_REG_MAP,
    SisoRegisterMap
};
