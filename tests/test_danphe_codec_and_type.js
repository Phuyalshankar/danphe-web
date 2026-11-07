'use strict';

const assert = require('node:assert');
const {
  TitanMicroBus,
  TITAN_TYPE,
  TitanCodec,
  TitanVideoReassembler,
  CMD
} = require('../src/index.js');

console.log('======================================================================');
console.log('🦚 DANPHE-NATIVE: TITAN-BUS 2.0 TYPECASTING & AV CODEC TEST');
console.log('======================================================================\n');

// 1. Verify Exports
console.log('[TEST 1] Core Exports Verification...');
assert(TITAN_TYPE !== undefined, 'TITAN_TYPE should be exported');
assert(TitanCodec !== undefined, 'TitanCodec should be exported');
assert(TitanVideoReassembler !== undefined, 'TitanVideoReassembler should be exported');
console.log('  PASS: All Sovereign Type & Codec symbols exported from danphe-native!\n');

// 2. Test Audio ADPCM 4:1 Codec
console.log('[TEST 2] Realtime Sovereign Audio Codec (IMA-ADPCM 4:1)...');
const sampleCount = 320; // 20ms @ 16kHz
const pcmIn = new Int16Array(sampleCount);
for (let i = 0; i < sampleCount; i++) {
  pcmIn[i] = Math.round(12000 * Math.sin((2 * Math.PI * 500 * i) / 16000));
}

const adpcmEncoded = TitanCodec.encodeAdpcm(pcmIn);
assert.strictEqual(adpcmEncoded.length, 160, '16-bit PCM 640B must compress to 160B ADPCM (4:1 ratio)');

const pcmDecoded = TitanCodec.decodeAdpcm(adpcmEncoded);
assert.strictEqual(pcmDecoded.length, 320, 'Decoded sample count must match exactly 320');

let errSum = 0;
for (let i = 0; i < sampleCount; i++) {
  errSum += Math.abs(pcmIn[i] - pcmDecoded[i]);
}
const avgErr = errSum / sampleCount;
assert(avgErr < 600, `Audio error must be within high fidelity threshold (< 600, got ${avgErr.toFixed(1)})`);
console.log(`  PASS: Audio 4:1 roundtrip verified (640B -> 160B -> 640B, avg error ${avgErr.toFixed(1)})!\n`);

// 3. Test Video Frame Packetizer and Reassembler
console.log('[TEST 3] Sovereign Video Packetizer & Out-of-Order Reassembler...');
const rawFrame = Buffer.alloc(3500);
for (let i = 0; i < rawFrame.length; i++) {
  rawFrame[i] = (i * 29 + 11) & 0xFF;
}

const packets = TitanCodec.packetizeVideo(rawFrame, 55, 640, 480, true, 1024);
assert.strictEqual(packets.length, 4, '3500-byte frame should be split into 4 chunks');

const reassembler = new TitanVideoReassembler();
// Feed out-of-order: 2, 0, 3, 1
const outOfOrder = [2, 0, 3, 1];
let completeResult = null;
for (const idx of outOfOrder) {
  const res = reassembler.feed(packets[idx].packet);
  if (res && res.complete) completeResult = res;
}

assert(completeResult !== null, 'Frame should be marked complete');
assert.strictEqual(completeResult.frameId, 55, 'Frame ID should match 55');
assert.strictEqual(completeResult.width, 640, 'Width should match 640');
assert.strictEqual(completeResult.height, 480, 'Height should match 480');
assert(rawFrame.equals(completeResult.buffer), 'Reassembled buffer must match raw frame byte-for-byte');
console.log('  PASS: Video frame chunked, transmitted out-of-order, and reassembled byte-for-byte!\n');

// 4. Test Universal Type Clamping & Gatekeeper
console.log('[TEST 4] Universal Register Type Gatekeeper...');
// Analog zone clamps to 0..255
TitanMicroBus.write(0x4000, 350);
assert.strictEqual(TitanMicroBus.read(0x4000), 255, 'Analog channel upper clamped to 255');

TitanMicroBus.write(0x4000, -20);
assert.strictEqual(TitanMicroBus.read(0x4000), 0, 'Analog channel lower clamped to 0');

// Relay zone coerces to 0 or 1
TitanMicroBus.write(20001, 'on');
assert.strictEqual(TitanMicroBus.read(20001), 1, 'Relay string "on" coerced to 1');

// Dynamic registers allow large values & state
TitanMicroBus.write(5555, 987654321);
assert.strictEqual(TitanMicroBus.read(5555), 987654321, 'Dynamic register holds unconstrained large integer');
console.log('  PASS: Register type gatekeeper operates seamlessly across UI and Hardware!\n');

console.log('======================================================================');
console.log('🎉 ALL DANPHE-NATIVE TITAN-BUS 2.0 CODEC & TYPE TESTS PASSED 100%!');
console.log('======================================================================\n');
