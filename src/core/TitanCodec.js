'use strict';

/**
 * 🎙️ TITAN SOVEREIGN AUDIO & VIDEO CODEC ENGINE (JAVASCRIPT)
 * ─────────────────────────────────────────────────────────────
 * Bit-for-bit parity with C++ TitanCodec.cpp (IMA-ADPCM & AV Packetizer).
 * Zero external npm dependencies. Sub-millisecond execution.
 */

const ADPCM_INDEX_TABLE = Object.freeze([
  -1, -1, -1, -1, 2, 4, 6, 8,
  -1, -1, -1, -1, 2, 4, 6, 8
]);

const ADPCM_STEP_TABLE = Object.freeze([
  7, 8, 9, 10, 11, 12, 13, 14, 16, 17,
  19, 21, 23, 25, 28, 31, 34, 37, 41, 45,
  50, 55, 60, 66, 73, 80, 88, 97, 107, 118,
  130, 143, 157, 173, 190, 209, 230, 253, 279, 307,
  337, 371, 408, 449, 494, 544, 598, 658, 724, 796,
  876, 963, 1060, 1166, 1282, 1411, 1552, 1707, 1878, 2066,
  2272, 2499, 2749, 3024, 3327, 3660, 4026, 4428, 4871, 5358,
  5894, 6484, 7132, 7845, 8630, 9493, 10442, 11487, 12635, 13899,
  15289, 16818, 18500, 20350, 22385, 24623, 27086, 29794, 32767
]);

function clampI16(val) {
  if (val < -32768) return -32768;
  if (val > 32767) return 32767;
  return val | 0;
}

function encodeSingleSample(sample, state) {
  let diff = sample - state.prevSample;
  let sign = 0;
  if (diff < 0) {
    sign = 8;
    diff = -diff;
  }

  let step = ADPCM_STEP_TABLE[state.stepIndex];
  let delta = 0;
  let vpdiff = step >> 3;

  if (diff >= step) {
    delta |= 4;
    diff -= step;
    vpdiff += step;
  }
  step >>= 1;
  if (diff >= step) {
    delta |= 2;
    diff -= step;
    vpdiff += step;
  }
  step >>= 1;
  if (diff >= step) {
    delta |= 1;
    vpdiff += step;
  }

  if (sign) {
    state.prevSample = clampI16(state.prevSample - vpdiff);
  } else {
    state.prevSample = clampI16(state.prevSample + vpdiff);
  }

  const code = delta | sign;
  let newIndex = state.stepIndex + ADPCM_INDEX_TABLE[code & 0x0F];
  if (newIndex < 0) newIndex = 0;
  if (newIndex > 88) newIndex = 88;
  state.stepIndex = newIndex;

  return code;
}

function decodeSingleNibble(code, state) {
  const step = ADPCM_STEP_TABLE[state.stepIndex];
  let vpdiff = step >> 3;

  if (code & 4) vpdiff += step;
  if (code & 2) vpdiff += step >> 1;
  if (code & 1) vpdiff += step >> 2;

  let newSample = state.prevSample;
  if (code & 8) {
    newSample -= vpdiff;
  } else {
    newSample += vpdiff;
  }
  state.prevSample = clampI16(newSample);

  let newIndex = state.stepIndex + ADPCM_INDEX_TABLE[code & 0x0F];
  if (newIndex < 0) newIndex = 0;
  if (newIndex > 88) newIndex = 88;
  state.stepIndex = newIndex;

  return state.prevSample;
}

class TitanCodec {
  /**
   * Encodes 16-bit PCM audio samples into 4-bit IMA-ADPCM.
   * Compresses 4:1 (75% savings).
   * @param {Int16Array|number[]} pcmSamples 
   * @param {{prevSample: number, stepIndex: number}} [state]
   * @returns {Buffer} Encoded ADPCM bytes
   */
  static encodeAdpcm(pcmSamples, state = { prevSample: 0, stepIndex: 0 }) {
    const sampleCount = pcmSamples.length;
    const outBytes = Math.ceil(sampleCount / 2);
    const outBuf = Buffer.alloc(outBytes);

    let byteIdx = 0;
    for (let i = 0; i < sampleCount; i += 2) {
      const n1 = encodeSingleSample(pcmSamples[i], state);
      const n2 = (i + 1 < sampleCount) ? encodeSingleSample(pcmSamples[i + 1], state) : 0;
      outBuf[byteIdx++] = ((n2 << 4) | (n1 & 0x0F)) & 0xFF;
    }

    return outBuf;
  }

  /**
   * Decodes 4-bit IMA-ADPCM bytes into 16-bit signed PCM audio samples.
   * @param {Buffer|Uint8Array} adpcmBytes 
   * @param {{prevSample: number, stepIndex: number}} [state]
   * @returns {Int16Array} Decoded 16-bit PCM samples
   */
  static decodeAdpcm(adpcmBytes, state = { prevSample: 0, stepIndex: 0 }) {
    const byteCount = adpcmBytes.length;
    const pcmOut = new Int16Array(byteCount * 2);

    let sampleIdx = 0;
    for (let i = 0; i < byteCount; i++) {
      const b = adpcmBytes[i];
      pcmOut[sampleIdx++] = decodeSingleNibble(b & 0x0F, state);
      pcmOut[sampleIdx++] = decodeSingleNibble((b >> 4) & 0x0F, state);
    }

    return pcmOut;
  }

  /**
   * Chunks a raw video frame into wire-safe Titan AV packets.
   * @param {Buffer} frameBuffer Raw frame payload (e.g. JPEG / NV21)
   * @param {number} frameId Monotonic frame counter (0-65535)
   * @param {number} width Resolution width
   * @param {number} height Resolution height
   * @param {boolean} [isKeyframe=false] Keyframe flag
   * @param {number} [chunkSize=1024] Max payload size per chunk
   * @returns {Array<{header: Buffer, payload: Buffer, packet: Buffer}>}
   */
  static packetizeVideo(frameBuffer, frameId, width, height, isKeyframe = false, chunkSize = 1024) {
    const totalBytes = frameBuffer.length;
    const totalChunks = Math.ceil(totalBytes / chunkSize);
    if (totalChunks > 255) {
      throw new Error(`Frame size ${totalBytes} exceeds max 255 chunks of size ${chunkSize}`);
    }

    const packets = [];
    for (let i = 0; i < totalChunks; i++) {
      const offset = i * chunkSize;
      const end = Math.min(offset + chunkSize, totalBytes);
      const payload = frameBuffer.subarray(offset, end);
      const isLast = (i === totalChunks - 1);

      let flags = 0;
      if (isKeyframe) flags |= 0x01;
      if (isLast) flags |= 0x02;

      // 12-byte TitanAVPacketHdr:
      // uint16 frameId, uint8 codecType (0x15), uint8 chunkIndex, uint8 totalChunks,
      // uint8 flags, uint16 width, uint16 height, uint16 payloadSize
      const hdr = Buffer.alloc(12);
      hdr.writeUInt16LE(frameId & 0xFFFF, 0);
      hdr.writeUInt8(0x15, 2); // 0x15 = Video Tile
      hdr.writeUInt8(i, 3);
      hdr.writeUInt8(totalChunks, 4);
      hdr.writeUInt8(flags, 5);
      hdr.writeUInt16LE(width & 0xFFFF, 6);
      hdr.writeUInt16LE(height & 0xFFFF, 8);
      hdr.writeUInt16LE(payload.length & 0xFFFF, 10);

      const packet = Buffer.concat([hdr, payload]);
      packets.push({ header: hdr, payload, packet });
    }

    return packets;
  }
}

/**
 * 🎥 TITAN VIDEO REASSEMBLER (JAVASCRIPT)
 * Reassembles packetized chunks into complete video frames with bitmask tracking.
 */
class TitanVideoReassembler {
  constructor(maxFrameBytes = 524288) {
    this.maxFrameBytes = maxFrameBytes;
    this.reset();
  }

  reset() {
    this.activeFrameId = -1;
    this.totalChunks = 0;
    this.chunksReceived = 0;
    this.width = 0;
    this.height = 0;
    this.receivedMask = new Uint8Array(32); // 256 bits
    this.frameBuffer = Buffer.alloc(this.maxFrameBytes);
    this.totalPayloadBytes = 0;
  }

  /**
   * Feed a chunk buffer (with 12-byte header) into the reassembler.
   * @param {Buffer} chunkPacket
   * @returns {{complete: boolean, frameId: number, buffer: Buffer, width: number, height: number, chunks: number}|null}
   */
  feed(chunkPacket) {
    if (!chunkPacket || chunkPacket.length < 12) return null;

    const frameId = chunkPacket.readUInt16LE(0);
    // const codecType = chunkPacket.readUInt8(2);
    const chunkIndex = chunkPacket.readUInt8(3);
    const totalChunks = chunkPacket.readUInt8(4);
    // const flags = chunkPacket.readUInt8(5);
    const width = chunkPacket.readUInt16LE(6);
    const height = chunkPacket.readUInt16LE(8);
    const payloadSize = chunkPacket.readUInt16LE(10);
    const payload = chunkPacket.subarray(12, 12 + payloadSize);

    // New frame arrival
    if (this.chunksReceived === 0 || this.activeFrameId !== frameId) {
      this.activeFrameId = frameId;
      this.totalChunks = totalChunks;
      this.chunksReceived = 0;
      this.width = width;
      this.height = height;
      this.totalPayloadBytes = 0;
      this.receivedMask.fill(0);
    }

    if (chunkIndex >= this.totalChunks || chunkIndex >= 256) return null;

    // Check bitmask
    const maskByteIdx = Math.floor(chunkIndex / 8);
    const bit = 1 << (chunkIndex % 8);
    if ((this.receivedMask[maskByteIdx] & bit) !== 0) {
      // Chunk already received
      return null;
    }

    // Mark bitmask
    this.receivedMask[maskByteIdx] |= bit;
    this.chunksReceived++;

    // Copy to frame buffer at offset
    const offset = chunkIndex * 1024;
    if (offset + payloadSize <= this.maxFrameBytes) {
      payload.copy(this.frameBuffer, offset);
      if (offset + payloadSize > this.totalPayloadBytes) {
        this.totalPayloadBytes = offset + payloadSize;
      }
    }

    // Check completion
    if (this.chunksReceived === this.totalChunks && this.totalChunks > 0) {
      return {
        complete: true,
        frameId: this.activeFrameId,
        buffer: this.frameBuffer.subarray(0, this.totalPayloadBytes),
        width: this.width,
        height: this.height,
        chunks: this.totalChunks
      };
    }

    return null;
  }
}

module.exports = {
  TitanCodec,
  TitanVideoReassembler,
  ADPCM_INDEX_TABLE,
  ADPCM_STEP_TABLE
};
