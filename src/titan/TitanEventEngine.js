'use strict';

/**
 * 🏔️ TITAN UNIVERSAL EVENT & REACTIVE CONTROL ENGINE (v2.0)
 * ═══════════════════════════════════════════════════════════════════════════════
 * Pure 0ms In-Memory Memory-Mapped Hardware Bus & Reactive Event Dispatcher.
 * Handles ALL User Inputs: Mouse, Clicks, Changes, Inputs, Keys, Touch, CAD Dragging,
 * and Bi-directional DOM Data-Binding (`data-titan-reg`, `data-titan-bind`).
 *
 * Compatible with Node.js, Dolphin Runtime, and all Modern Web Browsers.
 */

(function(root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.TitanEventEngine = factory();
        root.TitanMicroBus = root.TitanEventEngine.Bus;
        root.TITAN_REG = root.TitanEventEngine.REG;
    }
}(typeof self !== 'undefined' ? self : this, function() {

    // ── 1. TITAN 16-BIT REGISTER MAP (0x4000 - 0x4700) ─────────────────────────
    const TITAN_REG = {
        // ── Transport & Master (0x4000 - 0x401F) ──
        SYS_STATUS:           0x4000, // 0 = Standby, 1 = Ready, 2 = Rendering
        PLAYBACK_STATE:       0x4001, // 0 = Paused, 1 = Playing
        PLAYHEAD_MS:          0x4002, // Current playhead timecode in milliseconds
        MASTER_VOLUME:        0x4003, // 0 - 100%
        ACTIVE_TOOL:          0x4004, // 1=Select, 2=TrackSelect, 3=Ripple, 4=Razor, 5=Hand, 6=Zoom, 7=Pen
        ACTIVE_WORKSPACE:     0x4005, // 0=Edit, 1=Color, 2=Audio, 3=Motion
        MONITOR_ZOOM_LEVEL:   0x4006, // Zoom percentage (5 - 6400%)
        MONITOR_PAN_X:        0x4007, // Viewport Pan X offset
        MONITOR_PAN_Y:        0x4008, // Viewport Pan Y offset
        TIMELINE_ZOOM:        0x4009, // Timeline zoom scale (5 - 500%)

        // ── Video Compositing & 2D/3D Transforms (0x4100 - 0x411F) ──
        VIDEO_OPACITY:        0x4100, // 0 - 100%
        VIDEO_SCALE:          0x4101, // 20 - 400%
        VIDEO_ROTATION:       0x4102, // -180 to +180 deg
        VIDEO_POS_X:          0x4103, // -1920 to +1920 px
        VIDEO_POS_Y:          0x4104, // -1080 to +1080 px
        VIDEO_CORNER_RADIUS:  0x4105, // 0 - 100 px
        VIDEO_BLUR_GAUSSIAN:  0x4106, // 0 - 50 px
        VIDEO_FLAGS_BITMASK:  0x4110, // 16-bit compositing flags

        // ── Lumetrie Color Grading (0x4120 - 0x413F) ──
        COLOR_EXPOSURE:       0x4120, // -100 to +100
        COLOR_CONTRAST:       0x4121, // 50 - 150%
        COLOR_SATURATION:     0x4122, // 0 - 200%
        COLOR_TEMPERATURE:    0x4123, // 2500 - 9000 K
        COLOR_TINT:           0x4124, // -100 to +100
        COLOR_HIGHLIGHTS:     0x4125, // -100 to +100
        COLOR_SHADOWS:        0x4126, // -100 to +100

        // ── Typography & Text (0x4200 - 0x423F) ──
        TEXT_FONT_SIZE:       0x4200, // 10 - 240 px
        TEXT_TRACKING:        0x4201, // -10 to +60 px
        TEXT_STROKE_WIDTH:    0x4202, // 0 - 30 px
        TEXT_SHADOW_BLUR:     0x4203, // 0 - 60 px
        TEXT_SHADOW_ANGLE:    0x4204, // 0 - 360 deg
        TEXT_SHADOW_DIST:     0x4205, // 0 - 80 px
        TEXT_EXTRUDE_DEPTH:   0x4206, // 0 - 40 px 3D Depth
        TEXT_GLOW_SPREAD:     0x4207, // 0 - 50 px
        TEXT_OPACITY:         0x4208, // 0 - 100%
        TEXT_ROTATION_Z:      0x4209, // -180 to +180 deg
        TEXT_ROT_X_3D:        0x420A, // -45 to +45 deg

        // ── Audio & Vector CAD Draw (0x4300 - 0x438F) ──
        AUDIO_EQ_MASTER_GAIN: 0x4300,
        DRAW_TOOL_MODE:       0x4380, // 0=Off, 1=Pen, 2=Brush, 3=Highlighter, 4=Laser, 5=Eraser
        DRAW_BRUSH_SIZE:      0x4381, // 1 - 50 px
        DRAW_BRUSH_COLOR_R:   0x4382, // 0 - 255
        DRAW_BRUSH_COLOR_G:   0x4383, // 0 - 255
        DRAW_BRUSH_COLOR_B:   0x4384, // 0 - 255
        DRAW_BRUSH_OPACITY:   0x4385, // 0 - 100 %
        DRAW_STROKE_COUNT:    0x4386, // Total strokes captured

        // ── Timeline Multi-Track State (0x4400 - 0x4420) ──
        TL_ACTIVE_TRACK:      0x4400, // 1=D1, 2=T1, 3=FX1, 4=V2, 5=V1, 6=A1, 7=M1
        TL_TOTAL_CLIPS:       0x4401,
        TL_CLIP_START_MS:     0x4402,
        TL_CLIP_DURATION_MS:  0x4403,
        TL_CLIP_SPEED_PCT:    0x4404,
        TL_LINKED_STATE:      0x4405, // 0=Unlinked, 1=Linked
        TL_SNAP_MAGNET:       0x4406, // 0=Off, 1=On
        TL_ACTION_TRIGGER:    0x4407, // 1=Split, 2=Duplicate, 3=RippleDelete, 4=AddText, 5=AddDraw, 6=AddMusic

        // ── 🎮 UNIVERSAL INPUT & EVENT REGISTERS (0x4600 - 0x4650) ──
        MOUSE_POS_X:          0x4600, // Screen / Surface X in Pixels
        MOUSE_POS_Y:          0x4601, // Screen / Surface Y in Pixels
        MOUSE_CANVAS_X:       0x4602, // Canvas Virtual Sub-pixel X
        MOUSE_CANVAS_Y:       0x4603, // Canvas Virtual Sub-pixel Y
        MOUSE_DELTA_X:        0x4604, // Frame-by-frame mouse delta X
        MOUSE_DELTA_Y:        0x4605, // Frame-by-frame mouse delta Y
        MOUSE_WHEEL_DELTA:    0x4606, // Raw wheel delta (+ / -)
        MOUSE_BUTTONS_MASK:   0x4607, // Bitmask: 1=Left, 2=Right, 4=Middle
        MODIFIER_KEYS_MASK:   0x4608, // Bitmask: 1=Ctrl, 2=Shift, 4=Alt, 8=Space, 16=Meta/Cmd
        ACTIVE_SURFACE:       0x4609, // 1=CanvasStage, 2=TimeRuler, 3=TrackLanes, 4=Headers, 5=Inspector, 6=Splitter
        ACTIVE_DRAG_MODE:     0x460A, // 0=Idle, 1=Scrub, 2=ClipMove, 3=ClipTrim, 4=RazorSlice, 5=StrokeDraw, 6=HandPan, 7=GizmoTransform
        ACTIVE_HOVER_CLIP:    0x460B, // Numeric Clip ID
        ACTIVE_HOVER_TRACK:   0x460C, // Track numeric enum (1-7)

        // ── Forms, Inputs, Sliders & Actions (0x4610 - 0x4620) ──
        FORM_INPUT_REG_TARGET:0x4610, // Target register for active slider/input
        FORM_INPUT_RAW_VAL:   0x4611, // Numeric value emitted by input/change event
        FORM_EVENT_TRIGGER:   0x4612, // 1=Change, 2=Input, 3=Focus, 4=Blur
        KEYBOARD_LAST_KEY:    0x4630, // ASCII/KeyCode of last pressed key
        KEYBOARD_HOTKEY_CODE: 0x4631  // 1=V(Select), 2=C(Razor), 3=P(Draw), 4=H(Hand), 5=Z(Zoom), 6=Space(Play), 7=CtrlD(Dup), 8=Del(Delete)
    };

    // ── 2. TITAN IN-MEMORY HARDWARE BUS CORE (0x5442) ──────────────────────────
    const MEMORY_SIZE = 0x5500;
    const memoryBank = new Float64Array(MEMORY_SIZE);
    const listeners = new Map();
    const batchQueue = [];
    let isBatching = false;

    const TitanMicroBus = {
        MAGIC: 0x5442,
        REG: TITAN_REG,

        write: function(regAddress, value) {
            const addr = Number(regAddress);
            const val = Number(value);
            if (addr < 0 || addr >= MEMORY_SIZE || isNaN(val)) return;

            const oldVal = memoryBank[addr];
            memoryBank[addr] = val;

            if (isBatching) {
                batchQueue.push({ addr, val, oldVal });
                return;
            }

            const cbs = listeners.get(addr);
            if (cbs && cbs.length > 0) {
                for (let i = 0; i < cbs.length; i++) {
                    cbs[i](val, addr, oldVal);
                }
            }
        },

        read: function(regAddress, defaultValue) {
            const addr = Number(regAddress);
            if (addr < 0 || addr >= MEMORY_SIZE) return defaultValue || 0;
            const val = memoryBank[addr];
            return (val !== undefined && !isNaN(val)) ? val : (defaultValue || 0);
        },

        subscribe: function(regAddress, callback) {
            const addr = Number(regAddress);
            if (!listeners.has(addr)) {
                listeners.set(addr, []);
            }
            listeners.get(addr).push(callback);

            // Return unsubscribe handle
            return function unsubscribe() {
                const arr = listeners.get(addr);
                if (arr) {
                    const idx = arr.indexOf(callback);
                    if (idx > -1) arr.splice(idx, 1);
                }
            };
        },

        startBatch: function() {
            isBatching = true;
            batchQueue.length = 0;
        },

        flushBatch: function() {
            isBatching = false;
            for (let i = 0; i < batchQueue.length; i++) {
                const item = batchQueue[i];
                const cbs = listeners.get(item.addr);
                if (cbs) {
                    for (let k = 0; k < cbs.length; k++) {
                        cbs[k](item.val, item.addr, item.oldVal);
                    }
                }
            }
            batchQueue.length = 0;
        },

        writeBlock: function(entries) {
            this.startBatch();
            for (const reg in entries) {
                this.write(Number(reg), entries[reg]);
            }
            this.flushBatch();
        }
    };

    // ── 3. TITAN UNIVERSAL EVENT ENGINE ────────────────────────────────────────
    class EventEngine {
        constructor(bus) {
            this.bus = bus || TitanMicroBus;
            this.activeTool = 'select'; // 'select', 'razor', 'draw', 'hand', 'zoom'
            this.dragState = {
                isDragging: false,
                startX: 0,
                startY: 0,
                curX: 0,
                curY: 0,
                target: null,
                mode: 0 // 0=Idle
            };
            this.boundElements = new WeakSet();
            this.customHandlers = new Map();
        }

        /**
         * Initialize Global Event Listeners (Browser DOM Environment)
         */
        attachGlobal(rootElement) {
            if (typeof window === 'undefined') return this;
            const target = rootElement || window;

            // 1. Pointer & Mouse Dispatchers
            target.addEventListener('pointerdown', (e) => this.handlePointerDown(e), { passive: false });
            target.addEventListener('pointermove', (e) => this.handlePointerMove(e), { passive: false });
            target.addEventListener('pointerup', (e) => this.handlePointerUp(e), { passive: false });
            target.addEventListener('pointercancel', (e) => this.handlePointerUp(e), { passive: false });
            target.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

            // 2. Global Keyboard & Shortcut Dispatcher
            target.addEventListener('keydown', (e) => this.handleKeyDown(e), { passive: false });
            target.addEventListener('keyup', (e) => this.handleKeyUp(e), { passive: false });

            // 3. Form, Input & Change Dispatcher (Event Delegation)
            target.addEventListener('input', (e) => this.handleInput(e), { passive: false });
            target.addEventListener('change', (e) => this.handleChange(e), { passive: false });

            // 4. Scan & Bind Existing DOM Elements
            if (typeof document !== 'undefined' && document.body) {
                this.bindDomTree(document.body);
            }

            return this;
        }

        /**
         * Compute Modifier Keys Bitmask (1=Ctrl, 2=Shift, 4=Alt, 8=Space, 16=Meta)
         */
        getModifierMask(e) {
            let mask = 0;
            if (e.ctrlKey) mask |= 1;
            if (e.shiftKey) mask |= 2;
            if (e.altKey) mask |= 4;
            if (e.spaceKey || e.code === 'Space') mask |= 8;
            if (e.metaKey) mask |= 16;
            return mask;
        }

        /**
         * 🖱️ Pointer Down (Click / Drag Start)
         */
        handlePointerDown(e) {
            const modMask = this.getModifierMask(e);
            let btnMask = 0;
            if (e.button === 0) btnMask = 1;      // Left
            else if (e.button === 2) btnMask = 2; // Right
            else if (e.button === 1) btnMask = 4; // Middle

            this.dragState.isDragging = true;
            this.dragState.startX = e.clientX;
            this.dragState.startY = e.clientY;
            this.dragState.curX = e.clientX;
            this.dragState.curY = e.clientY;
            this.dragState.target = e.target;

            // Determine Active Surface
            let surface = 0;
            if (e.target && e.target.closest) {
                if (e.target.closest('#program-canvas-stage, .canvas-viewport')) surface = 1;
                else if (e.target.closest('#timeline-ruler, .time-ruler')) surface = 2;
                else if (e.target.closest('.lanes-box, .lane, .clip-block')) surface = 3;
                else if (e.target.closest('.track-headers, .header-row')) surface = 4;
                else if (e.target.closest('.inspector-deck, .inspector-panel')) surface = 5;
                else if (e.target.closest('.workspace-splitter')) surface = 6;
            }

            // Determine Drag Mode
            let dragMode = 0;
            if (surface === 2) dragMode = 1; // Playhead Scrub
            else if (surface === 3) {
                if (this.activeTool === 'razor') dragMode = 4;
                else if (this.activeTool === 'draw') dragMode = 5;
                else if (this.activeTool === 'hand' || e.button === 1 || e.spaceKey) dragMode = 6;
                else if (e.target && e.target.closest && e.target.closest('.handle')) dragMode = 3; // Clip Trim
                else if (e.target && e.target.closest && e.target.closest('.clip-block')) dragMode = 2; // Clip Move
            } else if (surface === 1) {
                if (this.activeTool === 'hand' || e.button === 1 || e.spaceKey) dragMode = 6;
                else dragMode = 7; // Gizmo Transform
            }
            this.dragState.mode = dragMode;

            // Write into Titan MicroBus Registers
            this.bus.writeBlock({
                [TITAN_REG.MOUSE_POS_X]: e.clientX || 0,
                [TITAN_REG.MOUSE_POS_Y]: e.clientY || 0,
                [TITAN_REG.MOUSE_DELTA_X]: 0,
                [TITAN_REG.MOUSE_DELTA_Y]: 0,
                [TITAN_REG.MOUSE_BUTTONS_MASK]: btnMask,
                [TITAN_REG.MODIFIER_KEYS_MASK]: modMask,
                [TITAN_REG.ACTIVE_SURFACE]: surface,
                [TITAN_REG.ACTIVE_DRAG_MODE]: dragMode
            });

            this.emitCustom('pointerdown', { event: e, surface, dragMode, modMask, btnMask });
        }

        /**
         * 🖱️ Pointer Move (Scrub, Drag, Draw, Transform)
         */
        handlePointerMove(e) {
            const dx = (e.clientX || 0) - this.dragState.curX;
            const dy = (e.clientY || 0) - this.dragState.curY;
            this.dragState.curX = e.clientX || 0;
            this.dragState.curY = e.clientY || 0;

            const modMask = this.getModifierMask(e);

            this.bus.writeBlock({
                [TITAN_REG.MOUSE_POS_X]: e.clientX || 0,
                [TITAN_REG.MOUSE_POS_Y]: e.clientY || 0,
                [TITAN_REG.MOUSE_DELTA_X]: dx,
                [TITAN_REG.MOUSE_DELTA_Y]: dy,
                [TITAN_REG.MODIFIER_KEYS_MASK]: modMask
            });

            if (this.dragState.isDragging) {
                this.emitCustom('drag', {
                    event: e,
                    dx, dy,
                    startX: this.dragState.startX,
                    startY: this.dragState.startY,
                    mode: this.dragState.mode
                });
            }
        }

        /**
         * 🖱️ Pointer Up (Release, Commit Action)
         */
        handlePointerUp(e) {
            const prevMode = this.dragState.mode;
            this.dragState.isDragging = false;
            this.dragState.mode = 0;

            this.bus.writeBlock({
                [TITAN_REG.MOUSE_BUTTONS_MASK]: 0,
                [TITAN_REG.ACTIVE_DRAG_MODE]: 0
            });

            this.emitCustom('pointerup', { event: e, prevMode });
        }

        /**
         * 🎡 Mouse Wheel (Scroll, Zoom)
         */
        handleWheel(e) {
            const modMask = this.getModifierMask(e);
            const delta = e.deltaY || 0;

            this.bus.writeBlock({
                [TITAN_REG.MOUSE_WHEEL_DELTA]: delta,
                [TITAN_REG.MODIFIER_KEYS_MASK]: modMask
            });

            this.emitCustom('wheel', { event: e, delta, modMask });
        }

        /**
         * ⌨️ Key Down (Shortcuts & Modifiers)
         */
        handleKeyDown(e) {
            if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
                return;
            }

            const modMask = this.getModifierMask(e);
            let hotkey = 0;
            const k = (e.key || '').toLowerCase();

            if (k === 'v' || e.key === 'Escape') hotkey = 1; // Select
            else if (k === 'c') hotkey = 2;                  // Razor Cut
            else if (k === 'p' || k === 'd' || k === 'b') hotkey = 3; // Draw
            else if (k === 'h') hotkey = 4;                  // Hand Pan
            else if (k === 'z' && !e.ctrlKey) hotkey = 5;    // Zoom Tool
            else if (e.code === 'Space' || e.key === ' ') hotkey = 6; // Play/Pause Toggle
            else if (k === 'd' && e.ctrlKey) hotkey = 7;     // Duplicate
            else if (e.key === 'Delete' || e.key === 'Backspace') hotkey = 8; // Delete

            this.bus.writeBlock({
                [TITAN_REG.KEYBOARD_LAST_KEY]: e.keyCode || 0,
                [TITAN_REG.KEYBOARD_HOTKEY_CODE]: hotkey,
                [TITAN_REG.MODIFIER_KEYS_MASK]: modMask
            });

            if (hotkey > 0) {
                const tools = ['', 'select', 'razor', 'draw', 'hand', 'zoom'];
                if (hotkey <= 5) {
                    this.setTool(tools[hotkey]);
                }
                this.emitCustom('hotkey', { key: e.key, code: hotkey, event: e });
            }
        }

        /**
         * ⌨️ Key Up
         */
        handleKeyUp(e) {
            const modMask = this.getModifierMask(e);
            this.bus.write(TITAN_REG.MODIFIER_KEYS_MASK, modMask);
        }

        /**
         * 🎛️ Form Input & Sliders (Live Reactive Sync)
         */
        handleInput(e) {
            const el = e.target;
            if (!el || typeof el.getAttribute !== 'function') return;
            const regAttr = el.getAttribute('data-titan-reg') || el.getAttribute('data-reg');
            if (!regAttr) return;

            const reg = Number(regAttr);
            const val = el.type === 'checkbox' ? (el.checked ? 1 : 0) : Number(el.value);

            if (!isNaN(reg) && !isNaN(val)) {
                this.bus.writeBlock({
                    [TITAN_REG.FORM_INPUT_REG_TARGET]: reg,
                    [TITAN_REG.FORM_INPUT_RAW_VAL]: val,
                    [TITAN_REG.FORM_EVENT_TRIGGER]: 2, // Input
                    [reg]: val
                });
            }

            this.emitCustom('input', { element: el, register: reg, value: val, event: e });
        }

        /**
         * 🎛️ Form Change (Commit Value)
         */
        handleChange(e) {
            const el = e.target;
            if (!el || typeof el.getAttribute !== 'function') return;
            const regAttr = el.getAttribute('data-titan-reg') || el.getAttribute('data-reg');
            if (!regAttr) return;

            const reg = Number(regAttr);
            const val = el.type === 'checkbox' ? (el.checked ? 1 : 0) : Number(el.value);

            if (!isNaN(reg) && !isNaN(val)) {
                this.bus.writeBlock({
                    [TITAN_REG.FORM_INPUT_REG_TARGET]: reg,
                    [TITAN_REG.FORM_INPUT_RAW_VAL]: val,
                    [TITAN_REG.FORM_EVENT_TRIGGER]: 1, // Change
                    [reg]: val
                });
            }

            this.emitCustom('change', { element: el, register: reg, value: val, event: e });
        }

        /**
         * 🔄 Bi-Directional DOM Data-Binding
         */
        bindDomTree(root) {
            if (!root || typeof root.querySelectorAll !== 'function') return;

            const boundNodes = root.querySelectorAll('[data-titan-reg], [data-reg]');
            boundNodes.forEach(node => {
                if (this.boundElements.has(node)) return;
                this.boundElements.add(node);

                const reg = Number(node.getAttribute('data-titan-reg') || node.getAttribute('data-reg'));
                if (isNaN(reg)) return;

                // Subscribe Titan Register ➔ Update DOM Element
                this.bus.subscribe(reg, (val) => {
                    if (node.type === 'checkbox') {
                        node.checked = (val === 1 || val === true);
                    } else if (node.tagName === 'INPUT' || node.tagName === 'SELECT') {
                        if (typeof document !== 'undefined' && document.activeElement !== node) {
                            node.value = val;
                        }
                    } else {
                        node.innerText = val;
                    }
                });
            });
        }

        /**
         * 🛠️ Active Tool Controller
         */
        setTool(toolName) {
            this.activeTool = toolName;
            const toolMap = { select: 1, razor: 4, hand: 5, zoom: 6, draw: 7, pen: 7 };
            const toolId = toolMap[toolName] || 1;
            this.bus.write(TITAN_REG.ACTIVE_TOOL, toolId);

            if (typeof document !== 'undefined') {
                document.querySelectorAll('.tool-btn, .tl-mode-btn').forEach(b => {
                    b.classList.toggle('active', b.id.includes(toolName));
                });
            }

            this.emitCustom('toolchange', { tool: toolName, toolId });
        }

        /**
         * 📢 Custom Event Subscription Pipeline
         */
        on(eventName, handler) {
            if (!this.customHandlers.has(eventName)) {
                this.customHandlers.set(eventName, []);
            }
            this.customHandlers.get(eventName).push(handler);
            return () => {
                const arr = this.customHandlers.get(eventName);
                if (arr) {
                    const idx = arr.indexOf(handler);
                    if (idx > -1) arr.splice(idx, 1);
                }
            };
        }

        emitCustom(eventName, data) {
            const handlers = this.customHandlers.get(eventName);
            if (handlers) {
                for (let i = 0; i < handlers.length; i++) {
                    handlers[i](data);
                }
            }
        }
    }

    // Export Singleton Instance & Class
    const instance = new EventEngine(TitanMicroBus);
    instance.EventEngine = EventEngine;
    instance.Bus = TitanMicroBus;
    instance.REG = TITAN_REG;

    return instance;
}));
