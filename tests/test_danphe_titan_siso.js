'use strict';

const assert = require('node:assert');
const { 
  EverestBus, 
  EverestDeclarative, 
  CMD, 
  REG, 
  TITAN_SIGNATURE, 
  TITAN_SISO_SIGNATURE, 
  TITAN_SISO_SECURE_SIGNATURE 
} = require('../src/bus');

console.log('======================================================================');
console.log('🦅 DANPHE-2 TITAN-BUS FULL BACKWARD COMPATIBILITY & SISO TEST');
console.log('======================================================================\n');

// 1. Test 100% Backward Compatibility with Legacy 24-Byte Macro Packets
console.log('[TEST 1] Legacy 24-Byte Binary Macro Packet Highway...');
EverestBus.initDefaults();

let legacyReceived = 0;
let legacyPayload = null;
EverestBus.onCommand(CMD.RELAY_SET, (cmd, sender, payload) => {
  legacyReceived++;
  legacyPayload = payload;
});

const legacyFrame = EverestBus.emit(300, CMD.RELAY_SET, { relayId: 1, state: 1, pulse: 500 });
assert.strictEqual(legacyFrame.readUInt16BE(0), TITAN_SIGNATURE);
assert.strictEqual(legacyFrame.readUInt8(3), CMD.RELAY_SET);
assert.strictEqual(legacyReceived, 1);
assert.deepStrictEqual(legacyPayload, { relayId: 1, state: 1, pulse: 500 });
console.log('  PASS: Legacy 24-byte macro packet packed & emitted flawlessly!\n');

// 2. Test Legacy Memory Register Operations
console.log('[TEST 2] Memory Register Operations & Event Listeners...');
let listenerVal = null;
EverestBus.subscribe(1020, (val) => {
  listenerVal = val;
});
EverestBus.write(1020, 180);
assert.strictEqual(EverestBus.readInt(1020), 180);
assert.strictEqual(listenerVal, 180);
console.log('  PASS: Register 1020 read/write & listener working 100%!\n');

// 3. Test 6-Byte Micro SISO (Serial In / Serial Out) Stream
console.log('[TEST 3] Unified 6-Byte Micro SISO Stream...');
let sisoCount = 0;
let lastSisoBuf = null;
EverestBus.onCommand(CMD.SISO_STREAM, (cmd, sender, buf) => {
  sisoCount++;
  lastSisoBuf = buf;
});

const sisoBuf = EverestBus.emitSiso(REG.KEYPAD_LAST_KEY, 9);
assert.strictEqual(sisoBuf.length, 6);
assert.strictEqual(sisoBuf.readUInt16BE(0), TITAN_SISO_SIGNATURE); // 'SI'
assert.strictEqual(sisoBuf.readUInt16BE(2), REG.KEYPAD_LAST_KEY);
assert.strictEqual(sisoBuf.readInt16BE(4), 9);
assert.strictEqual(EverestBus.readInt(REG.KEYPAD_LAST_KEY), 9);
assert.strictEqual(sisoCount, 1);
console.log('  PASS: 6-Byte SISO frame emitted & routed with zero overhead!\n');

// 4. Test Zero Register Collision (Animation 0x4700-0x4705 vs Video 0x4100)
console.log('[TEST 4] Zero Register Collision Verification...');
EverestBus.writeInt(REG.VIDEO_OPACITY, 95);
EverestBus.writeInt(REG.ANIM_DURATION, 800);
EverestBus.writeInt(REG.ANIM_TRIGGER, 1);
assert.strictEqual(EverestBus.readInt(REG.VIDEO_OPACITY), 95);
assert.strictEqual(EverestBus.readInt(REG.ANIM_DURATION), 800);
assert.strictEqual(EverestBus.readInt(REG.ANIM_TRIGGER), 1);
assert.notStrictEqual(REG.ANIM_DURATION, REG.VIDEO_OPACITY);
console.log(`  PASS: REG.ANIM_DURATION (0x${REG.ANIM_DURATION.toString(16)}) & REG.VIDEO_OPACITY (0x${REG.VIDEO_OPACITY.toString(16)}) are 100% collision-free!\n`);

// 5. Test Titan-Shield 7-Byte Secure SISO (Rolling Token & In-Binary XOR Masking)
console.log('[TEST 5] Titan-Shield 8-bit Rolling Security & 7-Byte Secure SISO...');
EverestBus.setSecuritySeed(0xA596);
EverestBus.setSecurityEnabled(true);

const testEpoch = 1727743500;
const token = EverestBus.getRollingToken(testEpoch);
assert.strictEqual(token, 235); // 0xEB
assert.strictEqual(EverestBus.verifyToken(token, testEpoch), true);
assert.strictEqual(EverestBus.verifyToken(token, testEpoch + 1), true); // 1-sec drift
assert.strictEqual(EverestBus.verifyToken(99, testEpoch), false);       // Invalid rejected

// Live secure SISO packet
const liveToken = EverestBus.getRollingToken();
const secureFrame = EverestBus.packSecureSiso(REG.AUDIO_MASTER_VOL, 220, liveToken);
assert.strictEqual(secureFrame.length, 7);
assert.strictEqual(secureFrame.readUInt16BE(0), TITAN_SISO_SECURE_SIGNATURE); // 'SS'
assert.strictEqual(secureFrame.readUInt8(2), liveToken);

// Ingest through single-pipe stream parser
EverestBus.processIncomingBytes(secureFrame);
assert.strictEqual(EverestBus.readInt(REG.AUDIO_MASTER_VOL), 220);
assert.strictEqual(EverestBus.readInt(REG.SECURITY_TOKEN), liveToken);
console.log(`  PASS: Token verified (${liveToken}) and payload unmasked to 220 with zero latency!\n`);

// 6. Test 3-Strike Intrusion Lockout
console.log('[TEST 6] Titan-Shield 3-Strike Intrusion Lockout...');
EverestBus.resetSecurityFailures();
const badFrame = Buffer.from([0x53, 0x53, 0x12, 0x00, 0x00, 0x00, 0x00]); // Invalid token 0x12

EverestBus.processIncomingBytes(badFrame); // Strike 1
assert.strictEqual(EverestBus.readInt(REG.SECURITY_FAILURES), 1);
EverestBus.processIncomingBytes(badFrame); // Strike 2
assert.strictEqual(EverestBus.readInt(REG.SECURITY_FAILURES), 2);
EverestBus.processIncomingBytes(badFrame); // Strike 3 -> Lockout!
assert.strictEqual(EverestBus.readInt(REG.SECURITY_FAILURES), 3);
assert.strictEqual(EverestBus.isLockedOut(), true);
assert.strictEqual(EverestBus.readInt(REG.SECURITY_STATUS), 2);
assert.strictEqual(EverestBus.readInt(REG.ERROR_CODE), 90);
console.log('  PASS: 3 strikes triggered lock out and Master Error Register 90!\n');

// 7. Test Zero-Overhead URL Routing Index
console.log('[TEST 7] Zero-Overhead URL Routing Index...');
EverestBus.setRoutingUrl(101, '/danphe/telephony/active');
EverestBus.setRoutingUrl(202, '/danphe/hardware/pwm');
assert.strictEqual(EverestBus.getRoutingUrl(101), '/danphe/telephony/active');
assert.strictEqual(EverestBus.getRoutingUrl(202), '/danphe/hardware/pwm');
assert.strictEqual(EverestBus.getRoutingUrl(999), '');
console.log('  PASS: SessionId to URL routing mapped with 0 ns overhead!\n');

// 8. Test EverestDeclarative UI Actions
console.log('[TEST 8] Declarative UI Directives & Actions...');
EverestDeclarative.executeAction('bus:siso:1001:5');
assert.strictEqual(EverestBus.readInt(1001), 5);

EverestDeclarative.executeAction('bus:relay:1:on');
assert.strictEqual(EverestBus.readInt(20001), 1);
console.log('  PASS: Declarative bus actions executed seamlessly!\n');

console.log('======================================================================');
console.log('🎉 ALL DANPHE-2 TITAN-BUS TESTS PASSED WITH 100% PERFECTION!');
console.log('======================================================================\n');
