'use strict';

/**
 * ⚡ TITAN BINARY EMITTER (BinaryEmitter.js)
 * High-performance 24-Byte Hardware Layout Binary Packager.
 * Formats AST & style descriptors into compact 24-byte memory records.
 */

class BinaryEmitter {
  /**
   * Emits a single 24-byte binary hardware record.
   * @param {object} params
   * @returns {Uint8Array} 24-byte buffer
   */
  static emitRecord(params) {
    const bin = new Uint8Array(24);

    // Byte 0: Component Index (1-based, wrapped)
    bin[0] = (params.componentIndex || 1) & 0xFF;

    // Byte 1: Opcode (0x10..0x74)
    bin[1] = (params.opcode || 0x12) & 0xFF;

    // Byte 2..3: Width (16-bit Big-Endian, 0xFFFF = match_parent)
    const w = params.width !== undefined ? params.width : 0xFFFF;
    bin[2] = (w >> 8) & 0xFF;
    bin[3] = w & 0xFF;

    // Byte 4..5: Height (16-bit Big-Endian, 0xFFFE = wrap_content)
    const h = params.height !== undefined ? params.height : 0xFFFE;
    bin[4] = (h >> 8) & 0xFF;
    bin[5] = h & 0xFF;

    // Byte 6..9: Margins (T, R, B, L)
    bin[6] = Math.min(params.margin?.top || 0, 255);
    bin[7] = Math.min(params.margin?.right || 0, 255);
    bin[8] = Math.min(params.margin?.bottom || 0, 255);
    bin[9] = Math.min(params.margin?.left || 0, 255);

    // Byte 10..11: Padding (T/B, R/L or combined)
    bin[10] = Math.min(params.padding?.top || 0, 255);
    bin[11] = Math.min(params.padding?.left || 0, 255);

    // Byte 12: Background Palette
    bin[12] = (params.bg?.palette || 0) & 0xFF;

    // Byte 13: Background Shade
    bin[13] = (params.bg?.shade || 0) & 0xFF;

    // Byte 14: Border Radius
    bin[14] = Math.min(params.border?.radius || 0, 255);

    // Byte 15: Signature Flags (0x01: Gradient, 0x02: Carrier, etc.)
    bin[15] = (params.sigFlags || 0) & 0xFF;

    // Byte 16..17: Tx Register (16-bit unsigned, Big-Endian)
    const tx = params.tx || 0;
    bin[16] = (tx >> 8) & 0xFF;
    bin[17] = tx & 0xFF;

    // Byte 18..19: Rx Register (16-bit unsigned, Big-Endian)
    const rx = params.rx || 0;
    bin[18] = (rx >> 8) & 0xFF;
    bin[19] = rx & 0xFF;

    // Byte 20: Slot Index (1-255)
    bin[20] = (params.slot || 0) & 0xFF;

    // Byte 21: Font Size / Carrier Flag
    bin[21] = (params.fontSize || 14) & 0xFF;

    // Byte 22: Font Weight / Extra
    bin[22] = (params.fontWeight || 0) & 0xFF;

    // Byte 23: Text Alignment (0=left, 1=center, 2=right)
    bin[23] = (params.textAlign || 0) & 0xFF;

    return bin;
  }
}

module.exports = BinaryEmitter;
