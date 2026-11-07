'use strict';

/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║         TitanTcpModule — dolphin-native-2                       ║
 * ║  Universal JS bridge for ALL @dolphin/titan-framework modules   ║
 * ║                                                                  ║
 * ║  MODULES COVERED:                                                ║
 * ║    1. Connection & Health   (REGISTER, HEARTBEAT)                ║
 * ║    2. Audio Intercom        (INVITE, ACCEPT, REJECT, HANGUP,     ║
 * ║                              AUDIO_FRAME)                        ║
 * ║    3. Video / NVR Stream    (VIDEO_FRAME via TitanVideoDecoder)  ║
 * ║    4. IoT / PLC / Relays    (CUSTOM_ACTION 0x40)                 ║
 * ║    5. Real-time Chat        (CHAT_MESSAGE 0x20)                  ║
 * ║    6. P2P Data Transfer     (P2P_DATA — CUSTOM_ACTION variant)   ║
 * ║    7. LAN Discovery         (UDP broadcast scan)                 ║
 * ║                                                                  ║
 * ║  USAGE — Declarative (no JS needed):                            ║
 * ║    <button action="hw:tcp:connect">Connect</button>              ║
 * ║    <button action="hw:tcp:invite:102:audio">Call 102</button>    ║
 * ║    <button action="hw:tcp:iot:relay_toggle:1">Relay 1</button>   ║
 * ║    Status: [stateKey:sys_tcp_status]                             ║
 * ║                                                                  ║
 * ║  USAGE — Programmatic:                                           ║
 * ║    const { Titan } = require('dolphin-native-2');                ║
 * ║    Titan.connect('192.168.1.10', 9092, 101);                     ║
 * ║    Titan.iot.relay('relay_1', 'toggle');                         ║
 * ║    Titan.chat.send(102, 'Gate opened');                          ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

// ── CMD Codes (mirrors TitanProtocol.ts) ──────────────────────────────────────
const CMD = {
    REGISTER:      0x08,
    REGISTER_ACK:  0x09,
    INVITE:        0x10,
    ACCEPT:        0x11,
    REJECT:        0x12,
    HANGUP:        0x13,
    AUDIO_FRAME:   0x14,
    VIDEO_FRAME:   0x15,
    CHAT_MESSAGE:  0x20,
    HEARTBEAT:     0x30,
    HEARTBEAT_ACK: 0x31,
    CUSTOM_ACTION: 0x40,
    ERROR:         0xFF,
};

// ── Incoming packet listener registry ────────────────────────────────────────
// Key: CMD code → [handler, handler, ...]
const _listeners = {};

// ── Throttle helper — prevents high-frequency UI thread writes ────────────────
// 10 Hz max for UI state updates (critical for video/audio stability)
const _throttleMs = { default: 100, video: 500, iot: 50 };
const _lastFire   = {};
function _throttle(key, ms, fn) {
    const now = Date.now();
    if (!_lastFire[key] || (now - _lastFire[key]) >= ms) {
        _lastFire[key] = now;
        fn();
    }
}

// ── Internal: dispatch hw:* action to native bridge ──────────────────────────
function _dispatch(action, value) {
    // DolphinRuntime sends this to DolphinHardwareBridge.handleHardwareAction()
    if (typeof globalThis.__dolphin_dispatch === 'function') {
        globalThis.__dolphin_dispatch(action, value);
    } else if (typeof globalThis.DolphinBridge !== 'undefined') {
        globalThis.DolphinBridge.dispatch(action, value);
    }
    // In dev/web mode — log only
    else {
        console.log(`[TitanTcpModule] dispatch → ${action}`, value ?? '');
    }
}

// ── Internal: set state in DolphinStateEngine ─────────────────────────────────
function _setState(key, val) {
    if (typeof globalThis.__dolphin_setState === 'function') {
        globalThis.__dolphin_setState(key, val);
    } else if (typeof globalThis.DolphinState !== 'undefined') {
        globalThis.DolphinState.set(key, val);
    } else {
        console.log(`[TitanTcpModule] state → ${key} = ${val}`);
    }
}

// ── Register incoming packet handler from Kotlin side ────────────────────────
// Called by DolphinHardwareBridge when TitanTcpClient.messageListeners fires
if (typeof globalThis.__titanOnPacket === 'undefined') {
    globalThis.__titanOnPacket = function(cmdType, senderExt, payloadBase64) {
        const handlers = _listeners[cmdType] || [];
        const payloadStr = payloadBase64
            ? (typeof atob !== 'undefined' ? atob(payloadBase64) : Buffer.from(payloadBase64, 'base64').toString())
            : '';

        // ── Built-in: REGISTER_ACK → update sys_tcp_status ──────────────────
        if (cmdType === CMD.REGISTER_ACK) {
            _setState('sys_tcp_status', '● ONLINE');
            _setState('sys_tcp_peer', senderExt.toString());
            try {
                const body = JSON.parse(payloadStr);
                if (body.status === 'AUTH_OK') {
                    _setState('sys_tcp_status', '● ONLINE ✓ Auth OK');
                }
            } catch (_) {}
        }

        // ── Built-in: INVITE → update sys_call_status ───────────────────────
        if (cmdType === CMD.INVITE) {
            _setState('sys_call_status', `INCOMING ← Ext ${senderExt}`);
            _setState('call_target_ext', senderExt.toString());
            try {
                const body = JSON.parse(payloadStr);
                _setState('sys_call_type', body.type || 'audio');
            } catch (_) {}
        }

        // ── Built-in: HANGUP → reset call state ─────────────────────────────
        if (cmdType === CMD.HANGUP) {
            _setState('sys_call_status', 'IDLE');
            _setState('call_target_ext', '0');
        }

        // ── Built-in: HEARTBEAT_ACK → confirm health ────────────────────────
        if (cmdType === CMD.HEARTBEAT_ACK) {
            _throttle('hb_ack', _throttleMs.default, () => {
                _setState('sys_tcp_status', '● ONLINE ♥');
            });
        }

        // ── Built-in: CHAT_MESSAGE → sys_chat_msg ───────────────────────────
        if (cmdType === CMD.CHAT_MESSAGE) {
            _setState('sys_chat_msg', `Ext ${senderExt}: ${payloadStr}`);
            _setState('sys_chat_from', senderExt.toString());
        }

        // ── Built-in: CUSTOM_ACTION response → IoT state ────────────────────
        if (cmdType === CMD.CUSTOM_ACTION) {
            _throttle(`iot_${senderExt}`, _throttleMs.iot, () => {
                try {
                    const body = JSON.parse(payloadStr);
                    // Server ACK: { status: 'ok', pin: '1', value: '1' }
                    if (body.pin !== undefined) {
                        _setState(`sys_iot_${body.pin}`, body.value ?? (body.status === 'ok' ? '1' : '0'));
                    }
                } catch (_) {}
                _setState('sys_iot_last', payloadStr);
            });
        }

        // ── VIDEO_FRAME — throttled FPS counter only (video stays in GPU layer)
        if (cmdType === CMD.VIDEO_FRAME) {
            _throttle('video_fps', _throttleMs.video, () => {
                const fps = _fpsCounter.tick();
                if (fps > 0) _setState('sys_tcp_fps', `${fps} fps`);
            });
        }

        // Dispatch to all registered JS listeners
        handlers.forEach(fn => {
            try { fn({ cmdType, senderExt, payload: payloadStr }); } catch (_) {}
        });
    };
}

// ── FPS counter for video stream ──────────────────────────────────────────────
const _fpsCounter = (() => {
    let frames = 0, lastTs = Date.now();
    return {
        tick() {
            frames++;
            const now = Date.now();
            if (now - lastTs >= 1000) {
                const fps = frames;
                frames = 0;
                lastTs = now;
                return fps;
            }
            return 0;
        }
    };
})();


// ══════════════════════════════════════════════════════════════════════════════
// ══  PUBLIC API — Titan.*  ═══════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════

const Titan = {

    /**
     * All CMD codes — for advanced use
     * @example Titan.CMD.CUSTOM_ACTION
     */
    CMD,

    // ── 1. CONNECTION ─────────────────────────────────────────────────────────

    /**
     * Connect to Titan TCP server.
     * Sets state: sys_tcp_status
     *
     * @param {string} host   IP or hostname  (default: reads tcp_host state)
     * @param {number} port   TCP port        (default: 9092 or tcp_port state)
     * @param {number} ext    My extension ID (default: 101 or tcp_ext state)
     *
     * @example
     *   Titan.connect('192.168.1.10', 9092, 101);
     *   // Declarative: <button action="hw:tcp:connect:192.168.1.10:9092:101">
     *   // Or with state pre-set: <button action="hw:tcp:connect">
     */
    connect(host, port = 9092, ext = 101) {
        if (host) {
            _setState('tcp_host', host);
            _setState('tcp_port', port.toString());
            _setState('tcp_ext',  ext.toString());
        }
        _dispatch(host ? `hw:tcp:connect:${host}:${port}:${ext}` : 'hw:tcp:connect');
    },

    /**
     * Disconnect from Titan TCP server.
     * Sets state: sys_tcp_status = "● DISCONNECTED"
     *
     * @example
     *   Titan.disconnect();
     *   // Declarative: <button action="hw:tcp:disconnect">
     */
    disconnect() {
        _dispatch('hw:tcp:disconnect');
    },

    /**
     * Check connection status (updates sys_tcp_status).
     * @returns {string} Current status from sys_tcp_status state
     *
     * @example
     *   Titan.status();
     *   // Declarative: <span>[stateKey:sys_tcp_status]</span>
     */
    status() {
        _dispatch('hw:tcp:status');
    },

    // ── 2. AUDIO / VIDEO INTERCOM ─────────────────────────────────────────────

    intercom: {
        /**
         * Invite (call) a remote extension.
         * @param {number} targetExt  Extension to call
         * @param {'audio'|'video'} type  Call type
         *
         * @example
         *   Titan.intercom.call(102, 'audio');
         *   // Declarative: <button action="hw:tcp:invite:102:audio">📞 Call 102</button>
         */
        call(targetExt, type = 'audio') {
            _setState('call_target_ext', targetExt.toString());
            _dispatch(`hw:tcp:invite:${targetExt}:${type}`);
        },

        /**
         * Accept an incoming call.
         * @example
         *   Titan.intercom.accept();
         *   // Declarative: <button action="hw:tcp:accept">✅ Answer</button>
         */
        accept() {
            _dispatch('hw:tcp:accept');
        },

        /**
         * Reject an incoming call.
         * @example
         *   Titan.intercom.reject();
         *   // Declarative: <button action="hw:tcp:reject">❌ Reject</button>
         */
        reject() {
            _dispatch('hw:tcp:reject');
        },

        /**
         * Hang up the active call.
         * @example
         *   Titan.intercom.hangup();
         *   // Declarative: <button action="hw:tcp:hangup">📵 End</button>
         */
        hangup() {
            _dispatch('hw:tcp:hangup');
        },
    },

    // ── 3. IOT / PLC / RELAY CONTROL ─────────────────────────────────────────

    iot: {
        /**
         * Control a relay (ON/OFF/Toggle).
         * Sends CMD.CUSTOM_ACTION 0x40 with JSON: {action, pin}
         *
         * @param {string|number} pin     Pin/relay name (e.g. 1, 'relay_1')
         * @param {'on'|'off'|'toggle'} state
         * @param {number} [targetExt=0]  Target device extension
         *
         * @example
         *   Titan.iot.relay(1, 'on');
         *   Titan.iot.relay('relay_2', 'toggle');
         *   // Declarative: <button action="hw:tcp:iot:relay_toggle:1">💡 Toggle Relay 1</button>
         *   // Status:      [stateKey:sys_iot_1]
         */
        relay(pin, state = 'toggle', targetExt = 0) {
            if (targetExt) _setState('iot_target_ext', targetExt.toString());
            const actionName = state === 'on' ? 'relay_on' : state === 'off' ? 'relay_off' : 'relay_toggle';
            _dispatch(`hw:tcp:iot:${actionName}:${pin}`);
        },

        /**
         * Write a value to a PLC register or sensor setpoint.
         * @param {string} register   Register name
         * @param {string|number} val Value to write
         * @param {number} [targetExt=0]
         *
         * @example
         *   Titan.iot.write('temp_setpoint', 25);
         *   // Declarative: hw:tcp:iot:write:temp_setpoint:25
         */
        write(register, val, targetExt = 0) {
            if (targetExt) _setState('iot_target_ext', targetExt.toString());
            _dispatch(`hw:tcp:iot:write:${register}:${val}`);
        },

        /**
         * Read a sensor or register value.
         * @param {string} sensor   Sensor/register name
         * @param {number} [targetExt=0]
         *
         * @example
         *   Titan.iot.read('temp_sensor');
         *   // Status: [stateKey:sys_iot_temp_sensor]
         */
        read(sensor, targetExt = 0) {
            if (targetExt) _setState('iot_target_ext', targetExt.toString());
            _dispatch(`hw:tcp:iot:read:${sensor}`);
        },

        /**
         * Send any custom CUSTOM_ACTION JSON payload.
         * @param {object} payload  Any object matching backend expectation
         * @param {number} [targetExt=0]
         *
         * @example
         *   Titan.iot.custom({ action: 'set_speed', motor: 1, rpm: 1500 });
         */
        custom(payload, targetExt = 0) {
            _dispatch(`hw:tcp:custom:${targetExt}`, JSON.stringify(payload));
        },
    },

    // ── 4. REAL-TIME CHAT ─────────────────────────────────────────────────────

    chat: {
        /**
         * Send a text message to a target extension.
         * Sets state: sys_chat_msg = "Me: <message>"
         *
         * @param {number} targetExt  Destination extension
         * @param {string} message    Text message
         *
         * @example
         *   Titan.chat.send(102, 'Gate opened by admin');
         *   // Status: [stateKey:sys_chat_msg]
         */
        send(targetExt, message) {
            _setState('chat_target_ext', targetExt.toString());
            _dispatch(`hw:tcp:chat:${targetExt}`, message);
        },

        /**
         * Broadcast a message to all connected peers (targetExt=0).
         * @param {string} message
         *
         * @example
         *   Titan.chat.broadcast('Server restarting in 60s');
         */
        broadcast(message) {
            _dispatch('hw:tcp:chat:0', message);
        },
    },

    // ── 5. SYSTEM HEALTH ─────────────────────────────────────────────────────

    system: {
        /**
         * Send a heartbeat ping.
         * Sets state: sys_tcp_status = "● ONLINE ♥"
         *
         * @example
         *   Titan.system.ping();
         *   // Declarative: <button action="hw:tcp:ping">Ping</button>
         */
        ping() {
            _dispatch('hw:tcp:ping');
        },

        /**
         * Auto-ping every N seconds (keep-alive from JS side).
         * @param {number} intervalSec  Default: 30s
         * @returns {Function} stop function — call to clear the interval
         *
         * @example
         *   const stopPing = Titan.system.autoPing(30);
         *   // Call stopPing() to cancel
         */
        autoPing(intervalSec = 30) {
            const id = setInterval(() => _dispatch('hw:tcp:ping'), intervalSec * 1000);
            return () => clearInterval(id);
        },
    },

    // ── 6. P2P MODE (listen mode for direct device-to-device) ────────────────

    p2p: {
        /**
         * Start in P2P server mode (wait for incoming TCP connection).
         * @param {number} port  TCP listen port
         * @param {number} ext   My extension ID
         *
         * @example
         *   Titan.p2p.startServer(9092, 101);
         *   // Declarative: <button action="hw:tcp:server:9092:101">Start P2P Server</button>
         */
        startServer(port = 9092, ext = 101) {
            _dispatch(`hw:tcp:server:${port}:${ext}`);
        },

        /**
         * Connect to a P2P peer (client mode — same as Titan.connect).
         */
        connect(host, port = 9092, ext = 101) {
            _dispatch(`hw:tcp:connect:${host}:${port}:${ext}`);
        },
    },

    // ── 7. INCOMING PACKET LISTENER REGISTRATION ─────────────────────────────

    /**
     * Subscribe to incoming Titan TCP packets of a specific CMD type.
     * Called automatically by Kotlin via globalThis.__titanOnPacket().
     *
     * @param {number} cmdType    CMD code to listen for (use Titan.CMD.*)
     * @param {Function} handler  ({ cmdType, senderExt, payload }) => void
     * @returns {Function} unsubscribe function
     *
     * @example
     *   // Listen for IoT responses
     *   const off = Titan.on(Titan.CMD.CUSTOM_ACTION, ({ senderExt, payload }) => {
     *       const body = JSON.parse(payload);
     *       console.log('IoT ACK:', body.status, 'pin:', body.pin);
     *   });
     *
     *   // Listen for chat messages
     *   Titan.on(Titan.CMD.CHAT_MESSAGE, ({ senderExt, payload }) => {
     *       console.log(`Message from Ext ${senderExt}:`, payload);
     *   });
     *
     *   // Unsubscribe when done
     *   off();
     */
    on(cmdType, handler) {
        if (!_listeners[cmdType]) _listeners[cmdType] = [];
        _listeners[cmdType].push(handler);
        return () => {
            _listeners[cmdType] = (_listeners[cmdType] || []).filter(h => h !== handler);
        };
    },

    /**
     * Remove all listeners for a CMD (or all CMDs if none specified).
     */
    off(cmdType) {
        if (cmdType !== undefined) delete _listeners[cmdType];
        else Object.keys(_listeners).forEach(k => delete _listeners[k]);
    },
};


// ══════════════════════════════════════════════════════════════════════════════
// ══  DECLARATIVE ACTION TABLE — for app.jsx registerLambdas  ════════════════
// ══  These are the hw:tcp:* strings handled by DolphinHardwareBridge.kt      ║
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Full list of supported declarative action strings.
 * These map directly to DolphinHardwareBridge.kt handlers.
 *
 * CONNECTION:
 *   hw:tcp:connect                          ← uses tcp_host/tcp_port/tcp_ext state
 *   hw:tcp:connect:<host>:<port>:<ext>      ← inline params
 *   hw:tcp:disconnect
 *   hw:tcp:status
 *   hw:tcp:server:<port>:<ext>              ← P2P listen mode
 *
 * SIGNALING:
 *   hw:tcp:invite:<targetExt>:<audio|video>
 *   hw:tcp:accept
 *   hw:tcp:reject
 *   hw:tcp:hangup
 *
 * CHAT:
 *   hw:tcp:chat:<targetExt>:<message>
 *
 * IOT / PLC:
 *   hw:tcp:iot:relay_on:<pin>
 *   hw:tcp:iot:relay_off:<pin>
 *   hw:tcp:iot:relay_toggle:<pin>
 *   hw:tcp:iot:write:<register>:<value>
 *   hw:tcp:iot:read:<sensor>
 *   hw:tcp:custom:<targetExt>              ← value = JSON string
 *
 * HEALTH:
 *   hw:tcp:ping
 *   hw:tcp:heartbeat
 *
 * STATE KEYS (reactive via [stateKey:...]):
 *   sys_tcp_status    → "● ONLINE" / "● CONNECTING..." / "● DISCONNECTED"
 *   sys_tcp_ext       → My extension ID
 *   sys_tcp_fps       → "30 fps" (video stream)
 *   sys_call_status   → "IDLE" / "CALLING 102..." / "ACTIVE ↔ 102" / "INCOMING ← 102"
 *   sys_call_type     → "audio" / "video"
 *   sys_chat_msg      → "Me: Hello" / "Ext 102: Gate opened"
 *   sys_chat_from     → sender extension
 *   sys_iot_<pin>     → "0" (OFF) / "1" (ON) / sensor value
 *   sys_iot_last      → last raw IoT JSON response
 */
Titan.ACTIONS = {
    // Connection
    connect:    (host, port, ext) => `hw:tcp:connect:${host}:${port}:${ext}`,
    disconnect: 'hw:tcp:disconnect',
    status:     'hw:tcp:status',
    // Signaling
    invite:     (ext, type = 'audio') => `hw:tcp:invite:${ext}:${type}`,
    accept:     'hw:tcp:accept',
    reject:     'hw:tcp:reject',
    hangup:     'hw:tcp:hangup',
    // Chat
    chat:       (ext, msg) => `hw:tcp:chat:${ext}:${msg}`,
    // IoT
    relayOn:    (pin) => `hw:tcp:iot:relay_on:${pin}`,
    relayOff:   (pin) => `hw:tcp:iot:relay_off:${pin}`,
    relayToggle:(pin) => `hw:tcp:iot:relay_toggle:${pin}`,
    iotWrite:   (reg, val) => `hw:tcp:iot:write:${reg}:${val}`,
    iotRead:    (sensor) => `hw:tcp:iot:read:${sensor}`,
    // Health
    ping:       'hw:tcp:ping',
    server:     (port, ext) => `hw:tcp:server:${port}:${ext}`,
};

module.exports = { Titan, CMD };
