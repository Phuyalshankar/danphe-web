'use strict';

/**
 * ⚡ SisoBinaryProtocol — 6-Byte, 7-Byte & 24-Byte Hardware Binary Protocol
 * Ultra-low latency serialization for Titan hardware bus & Kotlin native runtime.
 */

const TITAN_SISO_SIGNATURE        = 0x5349; // 'SI' - 6-Byte Micro SISO Packet
const TITAN_SISO_SECURE_SIGNATURE = 0x5353; // 'SS' - 7-Byte Titan-Shield Packet
const TITAN_MACRO_SIGNATURE       = 0x5442; // 'TB' - 24-Byte Titan Macro Packet

class SisoBinaryProtocol {
    static get SIGNATURES() {
        return {
            MICRO_SISO:  TITAN_SISO_SIGNATURE,
            SECURE_SISO: TITAN_SISO_SECURE_SIGNATURE,
            MACRO_TITAN: TITAN_MACRO_SIGNATURE
        };
    }

    /**
     * Packs a 6-Byte Micro SISO frame:
     * [0..1] Magic 0x5349 ('SI')
     * [2..3] Register (16-bit unsigned, Big Endian)
     * [4..5] Value (16-bit signed/unsigned, Big Endian)
     */
    static packMicroSiso(reg, val) {
        const buf = Buffer.alloc(6);
        buf.writeUInt16BE(TITAN_SISO_SIGNATURE, 0);
        buf.writeUInt16BE(reg & 0xFFFF, 2);
        buf.writeInt16BE(Math.max(-32768, Math.min(32767, Math.round(Number(val) || 0))), 4);
        return buf;
    }

    /**
     * Unpacks a 6-Byte Micro SISO frame.
     */
    static unpackMicroSiso(buf) {
        if (!buf || buf.length < 6) return null;
        const magic = buf.readUInt16BE(0);
        if (magic !== TITAN_SISO_SIGNATURE) return null;
        const reg = buf.readUInt16BE(2);
        const val = buf.readInt16BE(4);
        return { type: 'micro', reg, val };
    }

    /**
     * Generates an 8-bit rolling security token based on epoch and secret seed.
     */
    static getRollingToken(seed = 0xA596, epoch = null) {
        const sec = epoch !== null ? epoch : Math.floor(Date.now() / 1000);
        const t1 = (sec ^ seed) & 0xFF;
        const t2 = ((sec >> 8) ^ (seed >> 8)) & 0xFF;
        const t3 = (t1 ^ t2) ^ 0x5A;
        return t3 === 0 ? 0x01 : t3;
    }

    /**
     * Packs a 7-Byte Titan-Shield Secure SISO frame:
     * [0..1] Magic 0x5353 ('SS')
     * [2]    Rolling Token (8-bit)
     * [3..4] Masked Register (reg ^ (token * 0x0101))
     * [5..6] Masked Value (val ^ (token * 0x0101))
     */
    static packSecureSiso(reg, val, token = null, seed = 0xA596) {
        const liveToken = token !== null ? (token & 0xFF) : this.getRollingToken(seed);
        const mask16 = (liveToken << 8) | liveToken;

        const regVal = (reg & 0xFFFF) ^ mask16;
        const intVal = (Math.max(-32768, Math.min(32767, Math.round(Number(val) || 0))) & 0xFFFF) ^ mask16;

        const buf = Buffer.alloc(7);
        buf.writeUInt16BE(TITAN_SISO_SECURE_SIGNATURE, 0);
        buf.writeUInt8(liveToken, 2);
        buf.writeUInt16BE(regVal, 3);
        buf.writeUInt16BE(intVal, 5);
        return buf;
    }

    /**
     * Unpacks a 7-Byte Titan-Shield Secure SISO frame.
     */
    static unpackSecureSiso(buf, seed = 0xA596, allowDrift = true) {
        if (!buf || buf.length < 7) return null;
        const magic = buf.readUInt16BE(0);
        if (magic !== TITAN_SISO_SECURE_SIGNATURE) return null;

        const token = buf.readUInt8(2);
        if (allowDrift) {
            const currentSec = Math.floor(Date.now() / 1000);
            const validTokens = [
                this.getRollingToken(seed, currentSec),
                this.getRollingToken(seed, currentSec - 1),
                this.getRollingToken(seed, currentSec + 1),
            ];
            if (!validTokens.includes(token)) {
                return { error: 'INVALID_SECURITY_TOKEN', token };
            }
        }

        const mask16 = (token << 8) | token;
        const reg = buf.readUInt16BE(3) ^ mask16;
        const rawVal = buf.readUInt16BE(5) ^ mask16;
        // Convert to signed 16-bit
        const val = (rawVal & 0x8000) ? (rawVal - 0x10000) : rawVal;

        return { type: 'secure', token, reg, val };
    }

    /**
     * Packs a 24-Byte Titan Macro Packet.
     */
    static packMacroPacket(senderId = 0x01, cmd = 0x00, payload = {}) {
        const buf = Buffer.alloc(24);
        buf.writeUInt16BE(TITAN_MACRO_SIGNATURE, 0);
        buf.writeUInt8(senderId & 0xFF, 2);
        buf.writeUInt8(cmd & 0xFF, 3);

        const jsonStr = JSON.stringify(payload);
        const jsonBuf = Buffer.from(jsonStr, 'utf8');
        const copyLen = Math.min(19, jsonBuf.length);
        jsonBuf.copy(buf, 4, 0, copyLen);
        buf.writeUInt8(copyLen, 23); // length byte
        return buf;
    }

    /**
     * Parse any incoming SISO / Titan binary buffer (detects 6B, 7B, or 24B).
     */
    static parseIncomingBuffer(buf, seed = 0xA596) {
        if (!buf || buf.length < 5) return null;

        const magic = buf.readUInt16BE(0);
        if (magic === TITAN_SISO_SIGNATURE && buf.length >= 6) {
            return this.unpackMicroSiso(buf);
        }
        if (magic === TITAN_SISO_SECURE_SIGNATURE && buf.length >= 7) {
            return this.unpackSecureSiso(buf, seed);
        }
        if (magic === TITAN_MACRO_SIGNATURE && buf.length >= 24) {
            const senderId = buf.readUInt8(2);
            const cmd = buf.readUInt8(3);
            const payLen = buf.readUInt8(23);
            let payload = {};
            try {
                payload = JSON.parse(buf.slice(4, 4 + payLen).toString('utf8'));
            } catch (e) {}
            return { type: 'macro', senderId, cmd, payload };
        }
        return null;
    }
}

module.exports = {
    TITAN_SISO_SIGNATURE,
    TITAN_SISO_SECURE_SIGNATURE,
    TITAN_MACRO_SIGNATURE,
    SisoBinaryProtocol
};
