'use strict';

/**
 * 🌊 Dolphin Binary Protocol v2.0
 *
 * Wire format for .dolp bundle files.
 * This is the contract between:
 *   - Node.js Compiler (dolphinjs)  ← writer side
 *   - Android/iOS Native Runtime    ← reader side
 *
 * NO JavaScript runtime on the device side. Pure byte operations.
 *
 * Bundle Layout:
 * ┌─────────────────────────────────────────────────────────┐
 * │ HEADER (20 bytes)                                       │
 * │   MAGIC      [0..3]   = "DOLP"                         │
 * │   VERSION    [4..5]   = protocol version (uint16 LE)   │
 * │   FLAGS      [6..7]   = feature flags (uint16 LE)      │
 * │   SCR_COUNT  [8..9]   = number of screens (uint16 LE)  │
 * │   COMP_COUNT [10..11] = total titan components (u16)   │
 * │   ENTRY_SCR  [12..13] = entry screen index (uint16 LE) │
 * │   RESERVED   [14..19] = 6 zero bytes (future use)      │
 * ├─────────────────────────────────────────────────────────┤
 * │ SCREEN TABLE (per screen)                               │
 * │   NAME_LEN  [0]      = name byte length (uint8)        │
 * │   NAME      [1..N]   = UTF-8 name bytes                │
 * │   COMP_OFF  [N+1..N+2] = component offset (uint16 LE)  │
 * │   COMP_CNT  [N+3..N+4] = component count (uint16 LE)   │
 * │   DATA_LEN  [N+5..N+8] = raw data length (uint32 LE)   │
 * │   DATA      [...]    = raw compiled .dolp data          │
 * ├─────────────────────────────────────────────────────────┤
 * │ TITAN COMPONENT TABLE                                   │
 * │   [24 bytes per component]  ← Titan binary format      │
 * ├─────────────────────────────────────────────────────────┤
 * │ FOOTER (4 bytes)                                        │
 * │   CHECKSUM  [0..3]   = XOR32 of entire bundle          │
 * └─────────────────────────────────────────────────────────┘
 */

const { Buffer } = require('buffer');

// Protocol constants
const MAGIC        = Buffer.from('DOLP');
const PROTOCOL_VER = 0x0200; // ✅ v2.0 (24-byte protocol)
const FLAGS_NONE   = 0x0000;
const FLAGS_COMPRESSED = 0x0001;
const FLAGS_HAS_ASSETS = 0x0002;

// Command codes for hot-patch dev server messages
const CMD = {
    FULL_RELOAD:      0x01, // send entire bundle
    PATCH_SCREEN:     0x02, // send updated screen data only
    PATCH_COMPONENT:  0x03, // send updated 24-byte component
    PING:             0x04, // keepalive
    PONG:             0x05,
    ACK:              0x06, // runtime confirms patch applied
    PATCH_DELTA:      0x07, // send 24-byte component delta byte diff
};

class DolphinBinaryProtocol {
    constructor() {
        this.version = PROTOCOL_VER;
        this.CMD = CMD;
    }

    // ─────────────────────────────────────────────────────
    // SERIALIZATION  (Node.js → .dolp file / dev server)
    // ─────────────────────────────────────────────────────

    /**
     * Serialize a full app bundle into a single .dolp Buffer.
     *
     * @param {object} app
     *   app.screens    : { name: string, data: Buffer, components: Uint8Array[] }[]
     *   app.components : Uint8Array[]  (global component table — 24 bytes each)
     *   app.flags      : number (optional FLAGS_*)
     * @returns {Buffer}
     */
    serialize(app) {
        const { screens = [], components = [], entry = null, flags = FLAGS_NONE } = app;

        // ── HEADER ─────────────────────────────────────
        const header = Buffer.alloc(20);
        MAGIC.copy(header, 0);                            // [0..3]  magic
        header.writeUInt16LE(this.version,      4);       // [4..5]  version
        header.writeUInt16LE(flags,             6);       // [6..7]  flags
        header.writeUInt16LE(screens.length,    8);       // [8..9]  screen count
        header.writeUInt16LE(components.length, 10);      // [10..11] comp count
        
        // Entry screen index
        let entryIdx = 0;
        if (entry) {
            const idx = screens.findIndex(s => s.name === entry);
            if (idx >= 0) entryIdx = idx;
        }
        header.writeUInt16LE(entryIdx, 12);               // [12..13] entry screen index
        
        // Drawer screen index (NEW)
        let drawerIdx = 0xFFFF; // 0xFFFF = No Drawer
        if (app.drawer) {
            const idx = screens.findIndex(s => s.name === app.drawer);
            if (idx >= 0) drawerIdx = idx;
        }
        header.writeUInt16LE(drawerIdx, 14);              // [14..15] drawer screen index
        
        // [16..19] reserved zeros

        // ── SCREEN BLOCKS ──────────────────────────────
        const screenBuffers = screens.map(screen => {
            const nameBytes = Buffer.from(screen.name || 'default', 'utf8');
            const nameLen = Math.min(nameBytes.length, 255);
            const compOff = screen.componentOffset || 0;
            
            // Handle both array of components or a single binary buffer
            let compCnt = 0;
            if (screen.components) compCnt = screen.components.length;
            else if (screen.binary) compCnt = Math.floor(screen.binary.length / 24); // ✅ 24!
            
            // Handle raw string data pool
            let data = screen.rawData || screen.data || Buffer.alloc(0);
            if (typeof data === 'string') data = Buffer.from(data, 'utf8');

            // Layout: [1(nameLen) + nameLen + 2(compOff) + 2(compCnt) + 4(dataLen) + data]
            const block = Buffer.alloc(1 + nameLen + 2 + 2 + 4 + data.length);
            let off = 0;
            block.writeUInt8(nameLen, off++);
            nameBytes.copy(block, off, 0, nameLen); off += nameLen;
            block.writeUInt16LE(compOff, off); off += 2;
            block.writeUInt16LE(compCnt, off); off += 2;
            block.writeUInt32LE(data.length, off); off += 4;
            data.copy(block, off);
            return block;
        });

        // ── TITAN COMPONENT TABLE ──────────────────────
        // Each component is exactly 24 bytes
        const titanTable = Buffer.alloc(components.length * 24); // ✅ 24!
        components.forEach((comp, i) => {
            let src = comp;
            if (comp && comp.binary) {
                src = comp.binary;
            }
            if (src instanceof Uint8Array) {
                src = Buffer.from(src);
            }
            if (!src || typeof src.copy !== 'function') {
                throw new Error(`Invalid component at index ${i}`);
            }
            src.copy(titanTable, i * 24, 0, 24); // ✅ 24!
        });

        // ── ASSEMBLE ───────────────────────────────────
        const body = Buffer.concat([header, ...screenBuffers, titanTable]);

        // ── FOOTER: XOR32 CHECKSUM ─────────────────────
        const checksum = this._xor32(body);
        const footer = Buffer.alloc(4);
        footer.writeUInt32LE(checksum, 0);

        const bundle = Buffer.concat([body, footer]);
        return bundle;
    }

    // ─────────────────────────────────────────────────────
    // DESERIALIZATION  (.dolp file → JS object)
    // ─────────────────────────────────────────────────────

    /**
     * Parse a .dolp bundle Buffer back into a JS object.
     * @param {Buffer} bundle
     * @returns {object}
     */
    deserialize(bundle) {
        if (!Buffer.isBuffer(bundle)) bundle = Buffer.from(bundle);

        if (bundle.length < 24) {
            throw new Error('Bundle too small — minimum 24 bytes required');
        }

        // ── VALIDATE MAGIC ─────────────────────────────
        const magic = bundle.slice(0, 4).toString('ascii');
        if (magic !== 'DOLP') {
            throw new Error(`Invalid magic bytes: "${magic}" (expected "DOLP")`);
        }

        // ── READ HEADER ────────────────────────────────
        const version    = bundle.readUInt16LE(4);
        const flags      = bundle.readUInt16LE(6);
        const scrCount   = bundle.readUInt16LE(8);
        const compCount  = bundle.readUInt16LE(10);

        // ── VALIDATE CHECKSUM ──────────────────────────
        const body     = bundle.slice(0, bundle.length - 4);
        const expected = bundle.readUInt32LE(bundle.length - 4);
        const actual   = this._xor32(body);
        const checksumValid = expected === actual;

        // ── READ SCREENS ───────────────────────────────
        let cursor = 20;
        const screens = [];
        for (let i = 0; i < scrCount; i++) {
            const nameLen = bundle.readUInt8(cursor++);
            const name    = bundle.slice(cursor, cursor + nameLen).toString('utf8');
            cursor += nameLen;
            const compOff = bundle.readUInt16LE(cursor); cursor += 2;
            const compCnt = bundle.readUInt16LE(cursor); cursor += 2;
            const dataLen = bundle.readUInt32LE(cursor); cursor += 4;
            const data    = bundle.slice(cursor, cursor + dataLen); cursor += dataLen;
            screens.push({ name, compOff, compCnt, dataLen, data });
        }

        // ── READ TITAN TABLE ───────────────────────────
        const components = [];
        for (let i = 0; i < compCount; i++) {
            const comp = new Uint8Array(bundle.slice(cursor, cursor + 24)); // ✅ 24!
            components.push(comp);
            cursor += 24; // ✅ 24!
        }

        return {
            magic,
            version: `${(version >> 8) & 0xFF}.${version & 0xFF}`,
            flags,
            compressed: !!(flags & FLAGS_COMPRESSED),
            hasAssets: !!(flags & FLAGS_HAS_ASSETS),
            scrCount,
            compCount,
            screens,
            components,
            checksumValid,
            totalSize: bundle.length
        };
    }

    // ─────────────────────────────────────────────────────
    // HOT PATCH MESSAGES  (dev server ↔ native runtime)
    // ─────────────────────────────────────────────────────

    /**
     * Build a FULL_RELOAD message (entire bundle)
     * @param {Buffer} bundle
     * @returns {Buffer}
     */
    buildFullReload(bundle) {
        return this._buildMessage(CMD.FULL_RELOAD, bundle);
    }

    /**
     * Build a PATCH_SCREEN message (updated screen data only)
     * @param {string} screenName
     * @param {Buffer} screenData
     * @returns {Buffer}
     */
    buildPatchScreen(screenName, screenData) {
        const nameBytes = Buffer.from(screenName, 'utf8');
        const payload   = Buffer.alloc(1 + nameBytes.length + screenData.length);
        payload.writeUInt8(nameBytes.length, 0);
        nameBytes.copy(payload, 1);
        screenData.copy(payload, 1 + nameBytes.length);
        return this._buildMessage(CMD.PATCH_SCREEN, payload);
    }

    /**
     * Build a PATCH_COMPONENT message (24-byte titan update)
     * @param {number} index
     * @param {Uint8Array} titanBinary
     * @returns {Buffer}
     */
    buildPatchComponent(index, titanBinary) {
        const payload = Buffer.alloc(2 + 24); // ✅ 24!
        payload.writeUInt16LE(index, 0);
        Buffer.from(titanBinary).copy(payload, 2);
        return this._buildMessage(CMD.PATCH_COMPONENT, payload);
    }

    /**
     * Build a PING message
     * @param {string} [pingId] - Optional ID for tracking
     * @returns {Buffer}
     */
    buildPing(pingId) {
        const payload = pingId ? Buffer.from(pingId, 'utf8') : Buffer.alloc(0);
        return this._buildMessage(CMD.PING, payload);
    }

    /**
     * Parse an incoming hot-patch message from the native device
     * @param {Buffer} buf
     * @returns {object} { cmd, payload }
     */
    parseMessage(buf) {
        if (!Buffer.isBuffer(buf)) buf = Buffer.from(buf);
        if (buf.length < 5) throw new Error('Message too short');
        const cmd     = buf.readUInt8(0);
        const payLen  = buf.readUInt32LE(1);
        const payload = buf.slice(5, 5 + payLen);
        return { cmd, payload };
    }

    // ─────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────

    /** Build a framed message: [CMD(1) | PAYLOAD_LEN(4) | PAYLOAD] */
    _buildMessage(cmd, payload) {
        const msg = Buffer.alloc(1 + 4 + payload.length);
        msg.writeUInt8(cmd, 0);
        msg.writeUInt32LE(payload.length, 1);
        payload.copy(msg, 5);
        return msg;
    }

    /** XOR-32 checksum over a buffer */
    _xor32(buf) {
        let checksum = 0;
        for (let i = 0; i + 3 < buf.length; i += 4) {
            checksum ^= buf.readUInt32LE(i);
        }
        // handle trailing bytes
        const rem = buf.length % 4;
        if (rem > 0) {
            const tail = Buffer.alloc(4);
            buf.slice(buf.length - rem).copy(tail);
            checksum ^= tail.readUInt32LE(0);
        }
        return checksum >>> 0;
    }

    /** Decode component type code to a human-readable string */
    decodeComponentType(code) {
        const map = {
            0x10: 'Button',     0x11: 'Card',      0x12: 'Container',
            0x13: 'Column',     0x14: 'Row',        0x15: 'Stack',
            0x16: 'Text',       0x17: 'Image',      0x18: 'TextField',
            0x19: 'Slider',     0x1A: 'Switch',     0x1B: 'AppBar',
            0x1C: 'ListView',   0x1D: 'GridView',   0x1E: 'Modal',
            0x1F: 'Form',       0x20: 'Camera',     0x21: 'Microphone',
            0x22: 'Location',   0x23: 'Bluetooth',  0x24: 'Haptics',
            0x25: 'Battery',    0x26: 'Sensors',    0x27: 'WebRTCVideo',
            0x28: 'WebRTCAudio',
            0x70: 'VideoCall',  0x71: 'VideoStream', 0x72: 'AudioStream',
            0x73: 'TitanDisk',  0x74: 'Hoster',
            0x00: 'Unknown'
        };
        return map[code] || `0x${code.toString(16).padStart(2, '0')}`;
    }

    /** Decode library code */
    decodeLibrary(code) {
        const map = {
            0x01: 'MUI', 0x02: 'Tailwind', 0x04: 'iOS',
            0x05: 'Android', 0x06: 'Flutter', 0xFF: 'Universal', 0x00: 'Unknown'
        };
        return map[code] || `0x${code.toString(16)}`;
    }

    /** Pretty-print a Titan 24-byte component */
    inspectComponent(bin, index = 0) {
        if (bin.length < 24) return '(invalid — less than 24 bytes)';
        const lines = [
            `  [${index}] ${this.decodeComponentType(bin[1])} (${this.decodeLibrary(bin[0])})`,
            `       Scale:   ${bin[2]}%   Zoom: ${bin[3]}%`,
            `       Padding: T${bin[4]} R${bin[5]} B${bin[6]} L${bin[7]}`,
            `       Margin:  T${bin[8]} R${bin[9]} B${bin[10]} L${bin[11]}`,
            `       Width:   ${(bin[16] | (bin[17] << 8))}px`,
            `       Height:  ${(bin[18] | (bin[19] << 8))}px`,
            `       Color:   ${bin[20]}`,
            `       Radius:  ${bin[21]}`,
            `       Z-Index: ${bin[22]}`,
            `       Anim:    type=0x${bin[12].toString(16)} dur=${Math.round(bin[13]/255*5000)}ms`,
            `       Opacity: ${Math.round(bin[14]/255*100)}%`,
            `       Sig:     0x${bin[15].toString(16).toUpperCase()} ${bin[15] === 0x00 ? '✅' : '❓'}`
        ];
        return lines.join('\n');
    }
}

module.exports = { DolphinBinaryProtocol, CMD, FLAGS_NONE, FLAGS_COMPRESSED, FLAGS_HAS_ASSETS };
