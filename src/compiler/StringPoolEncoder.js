'use strict';

const { Buffer } = require('buffer');

/**
 * 🔤 StringPoolEncoder — Encodes string pools into binary offsets and UTF-8 string blocks.
 */
class StringPoolEncoder {
    constructor() {
        this.strings = [];
        this.map = new Map();
    }

    add(str) {
        if (!str || typeof str !== 'string') return 0;
        if (this.map.has(str)) {
            return this.map.get(str);
        }
        const index = this.strings.length;
        this.strings.push(str);
        this.map.set(str, index);
        return index;
    }

    buildBuffer() {
        const parts = [];
        for (const str of this.strings) {
            const buf = Buffer.from(str, 'utf-8');
            const lenBuf = Buffer.alloc(2);
            lenBuf.writeUInt16BE(buf.length, 0);
            parts.push(lenBuf);
            parts.push(buf);
        }
        return Buffer.concat(parts);
    }
}

module.exports = StringPoolEncoder;
