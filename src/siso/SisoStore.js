'use strict';

const { REG, SisoRegisterMap } = require('./SisoRegisterMap');
const { SisoBinaryProtocol } = require('./SisoBinaryProtocol');
const { SisoGizmoSync } = require('./SisoGizmoSync');

/**
 * ⚡ SisoStore — Universal Hardware-Grade SISO State Engine
 * ─────────────────────────────────────────────────────────────
 * Complete, seamless replacement for JavaScript NanoStores and Slice Stores.
 * Internally stores state in a flat 65,536-entry 16-bit Hardware Register buffer,
 * with zero garbage-collection overhead and instant 0ms binary packet generation.
 */
class SisoStore {
    constructor(initialState = {}) {
        // 65,536 16-bit register table (256 KB flat memory block)
        this._registers = new Int32Array(0x10000);

        // String / Rich object storage (captions, URLs, formatting strings)
        this._richStore = new Map();

        // Listeners: map of register -> Set of callbacks
        this._regListeners = new Map();

        // Wildcard listeners: array of callbacks(key, value, reg, state)
        this._globalListeners = new Set();

        // Security configuration for 7-byte secure packets
        this._securitySeed = 0xA596;
        this._securityEnabled = false;

        // Initialize with default state if provided
        if (initialState && typeof initialState === 'object') {
            this.setMany(initialState);
        }
    }

    /**
     * Read a value by key name or 16-bit register address.
     */
    get(keyOrReg) {
        if (keyOrReg === undefined || keyOrReg === null) {
            return this.exportState();
        }

        if (typeof keyOrReg === 'string' && this._richStore.has(keyOrReg)) {
            return this._richStore.get(keyOrReg);
        }

        if (typeof keyOrReg === 'number') {
            const reg = keyOrReg & 0xFFFF;
            // Check rich store first for formatted string/object
            if (this._richStore.has(reg)) {
                return this._richStore.get(reg);
            }
            return this._registers[reg];
        }

        const reg = SisoRegisterMap.resolveRegister(keyOrReg);
        if (this._richStore.has(reg)) {
            return this._richStore.get(reg);
        }
        if (this._richStore.has(keyOrReg)) {
            return this._richStore.get(keyOrReg);
        }
        return this._registers[reg];
    }

    /**
     * Read integer value directly from a register.
     */
    readReg(reg) {
        return this._registers[reg & 0xFFFF];
    }

    /**
     * Write a value to a key name or register address.
     */
    set(keyOrReg, value) {
        const reg = typeof keyOrReg === 'number'
            ? (keyOrReg & 0xFFFF)
            : SisoRegisterMap.resolveRegister(keyOrReg);

        const keyName = typeof keyOrReg === 'string'
            ? keyOrReg
            : SisoRegisterMap.resolveKeyName(reg);

        const prevNum = this._registers[reg];
        let numVal = typeof value === 'number' ? value : (typeof value === 'boolean' ? (value ? 1 : 0) : NaN);

        if (!isNaN(numVal)) {
            this._registers[reg] = Math.round(numVal);
        }

        if (typeof value === 'string' || typeof value === 'object' || typeof value === 'boolean' || isNaN(numVal)) {
            this._richStore.set(reg, value);
            this._richStore.set(keyName, value);
        } else {
            this._richStore.delete(reg);
            this._richStore.delete(keyName);
        }

        // Auto-update Canvas Transform if Zoom, Rotation, or Pan changes
        if (reg === REG.VIDEO_SCALE || reg === REG.VIDEO_ROTATION || reg === REG.VIDEO_PAN_X || reg === REG.VIDEO_PAN_Y) {
            const z = this._registers[REG.VIDEO_SCALE] || 100;
            const r = this._registers[REG.VIDEO_ROTATION] || 0;
            const px = this._registers[REG.VIDEO_PAN_X] || 0;
            const py = this._registers[REG.VIDEO_PAN_Y] || 0;
            const { cssTransform } = SisoGizmoSync.computeTransformMatrix(z, r, px, py);
            this._richStore.set('canvasTransform', cssTransform);
            this._richStore.set(0x410C, cssTransform);
            this._globalListeners.forEach(fn => {
                try { fn(this.exportState(), 'canvasTransform', cssTransform, 0x410C); } catch (e) {}
            });
        }

        // Notify specific register listeners
        if (this._regListeners.has(reg)) {
            this._regListeners.get(reg).forEach(fn => {
                try { fn(value, reg, keyName); } catch (e) { console.error(e); }
            });
        }

        // Notify global listeners
        this._globalListeners.forEach(fn => {
            try { fn(this.exportState(), keyName, value, reg); } catch (e) { console.error(e); }
        });

        // Auto-Broadcast Titan Opcode 0x08 (PATCH_STATE) to Mobile & TV Box Native Engine
        if (globalThis.dolphinDevServer && keyName) {
            try {
                const devServer = globalThis.dolphinDevServer;
                if (typeof devServer.patchState === 'function') {
                    devServer.patchState(null, keyName, value);
                } else if (devServer.server && typeof devServer.server.broadcast === 'function') {
                    const keyBuf = Buffer.from(String(keyName), 'utf8');
                    const valBuf = Buffer.from(String(value !== undefined && value !== null ? value : ''), 'utf8');
                    const payload = Buffer.alloc(1 + keyBuf.length + valBuf.length);
                    payload.writeUInt8(keyBuf.length, 0);
                    keyBuf.copy(payload, 1);
                    valBuf.copy(payload, 1 + keyBuf.length);
                    devServer.server.broadcast(payload, 0x08 /* PATCH_STATE */);
                }
            } catch {
                /* ignore broadcast failures — dev bridge is best-effort */
            }
        }

        return value;
    }

    /**
     * Write integer directly to register with zero overhead.
     */
    writeReg(reg, val) {
        return this.set(reg, val);
    }

    /**
     * Batch update multiple state keys at once.
     */
    setMany(updates) {
        if (!updates || typeof updates !== 'object') return;
        for (const [key, val] of Object.entries(updates)) {
            this.set(key, val);
        }
    }

    /**
     * Subscribe to state updates.
     * Overloads:
     * - subscribe(callback) -> subscribes to all updates (matches NanoStore API)
     * - subscribe(keyOrReg, callback) -> subscribes to specific key or register
     */
    subscribe(keyOrFn, maybeFn) {
        if (typeof keyOrFn === 'function') {
            const fn = keyOrFn;
            this._globalListeners.add(fn);
            return () => this._globalListeners.delete(fn);
        }

        const reg = typeof keyOrFn === 'number'
            ? (keyOrFn & 0xFFFF)
            : SisoRegisterMap.resolveRegister(keyOrFn);
        const fn = maybeFn;

        if (!this._regListeners.has(reg)) {
            this._regListeners.set(reg, new Set());
        }
        this._regListeners.get(reg).add(fn);

        return () => {
            if (this._regListeners.has(reg)) {
                this._regListeners.get(reg).delete(fn);
            }
        };
    }

    /**
     * Replaces the entire active state from a raw object, state slice, or file export.
     */
    replaceState(newInitialState = {}) {
        this._registers.fill(0);
        this._richStore.clear();
        this.setMany(newInitialState);
    }

    /**
     * Generates a 6-Byte Micro SISO binary frame for the given key or register.
     */
    toMicroBinary(keyOrReg) {
        const reg = typeof keyOrReg === 'number'
            ? (keyOrReg & 0xFFFF)
            : SisoRegisterMap.resolveRegister(keyOrReg);
        const val = this._registers[reg];
        return SisoBinaryProtocol.packMicroSiso(reg, val);
    }

    /**
     * Generates a 7-Byte Titan-Shield secure binary frame.
     */
    toSecureBinary(keyOrReg) {
        const reg = typeof keyOrReg === 'number'
            ? (keyOrReg & 0xFFFF)
            : SisoRegisterMap.resolveRegister(keyOrReg);
        const val = this._registers[reg];
        return SisoBinaryProtocol.packSecureSiso(reg, val, null, this._securitySeed);
    }

    /**
     * Ingests an incoming binary buffer (6-Byte, 7-Byte, or 24-Byte) directly into state.
     */
    ingestBinary(buf) {
        const parsed = SisoBinaryProtocol.parseIncomingBuffer(buf, this._securitySeed);
        if (!parsed || parsed.error) return null;

        if (parsed.type === 'micro' || parsed.type === 'secure') {
            this.set(parsed.reg, parsed.val);
            return parsed;
        }

        if (parsed.type === 'macro' && parsed.payload) {
            this.setMany(parsed.payload);
            return parsed;
        }

        return null;
    }

    /**
     * Exports a clean JavaScript snapshot of all active registers and rich values.
     */
    exportState() {
        const snapshot = {};

        // Export known standard keys
        for (const [k, reg] of Object.entries(SisoRegisterMap.REG)) {
            const keyName = SisoRegisterMap.resolveKeyName(reg);
            if (this._richStore.has(reg)) {
                snapshot[keyName] = this._richStore.get(reg);
            } else if (this._registers[reg] !== 0) {
                snapshot[keyName] = this._registers[reg];
            }
        }

        // Export all rich store values
        for (const [k, v] of this._richStore.entries()) {
            if (typeof k === 'string') {
                snapshot[k] = v;
            }
        }

        return snapshot;
    }

    /**
     * Creates a backwards-compatible Sub-Slice object matching legacy stores
     * (e.g. editStore, zoomPanStore, sliderStore, audioStore).
     */
    createSlice(sliceKeyNames = []) {
        const slice = {
            get: (key) => {
                if (key !== undefined) return this.get(key);
                const obj = {};
                sliceKeyNames.forEach(k => { obj[k] = this.get(k); });
                return obj;
            },
            set: (key, val) => this.set(key, val),
            setMany: (updates) => this.setMany(updates),
            subscribe: (listener) => {
                return this.subscribe((state, key, val, reg) => {
                    if (sliceKeyNames.includes(key) || sliceKeyNames.length === 0) {
                        listener(slice.get(), key, val);
                    }
                });
            }
        };
        return slice;
    }
}

/**
 * Factory helper: creates and initializes a unified SisoStore.
 */
function createSisoStore(initialState = {}) {
    return new SisoStore(initialState);
}

module.exports = {
    SisoStore,
    createSisoStore
};
