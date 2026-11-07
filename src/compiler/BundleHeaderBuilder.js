'use strict';

const { Buffer } = require('buffer');

/**
 * 📦 BundleHeaderBuilder — Generates pre-compiled .dolp binary headers (20-byte DOLP specification).
 */
class BundleHeaderBuilder {
    static MAGIC = 'DOLP';
    static HEADER_SIZE = 20;

    /**
     * Create 20-byte binary header
     * Byte 0-3: 'DOLP' magic bytes
     * Byte 4: Version (1)
     * Byte 5: Flags (0x01 = Titan 24-byte mode)
     * Byte 6-7: Reserved / Screen count
     */
    static buildHeader(options = {}) {
        const header = Buffer.alloc(BundleHeaderBuilder.HEADER_SIZE);
        header.write(BundleHeaderBuilder.MAGIC, 0, 4, 'ascii');
        header.writeUInt8(options.version || 1, 4);
        header.writeUInt8(options.titanMode ? 0x01 : 0x00, 5);
        header.writeUInt16BE(options.screenCount || 1, 6);
        header.writeUInt32BE(options.timestamp || Math.floor(Date.now() / 1000), 8);
        return header;
    }

    static validateHeader(buffer) {
        if (!buffer || buffer.length < BundleHeaderBuilder.HEADER_SIZE) return false;
        const magic = buffer.toString('ascii', 0, 4);
        return magic === BundleHeaderBuilder.MAGIC;
    }
}

module.exports = BundleHeaderBuilder;
