'use strict';

const assert = require('assert');
const TitanRegisters = require('../src/registers/TitanRegisters');
const TitanCompiler = require('../src/compiler/TitanCompiler');

console.log('======================================================================');
console.log('⚡ TITAN-OS MULTIMEDIA & PREDEFINED REGISTER TEST SUITE');
console.log('======================================================================\n');

// 1. Test Master Register Resolver
console.log('[TEST 1] Testing TitanRegisters.resolve() Master Method...');
const tests = [
  { name: 'cameraOpen', expected: 0x3060 },
  { name: 'camera:capture', expected: 0x3060 },
  { name: 'cameraFlip', expected: 0x3070 },
  { name: 'mediaPick', expected: 0x3063 },
  { name: 'galleryPick', expected: 0x3063 },
  { name: 'videoPlay', expected: 0x3068 },
  { name: 'togglePlay', expected: 0x3068 },
  { name: 'volumeUp', expected: 0x3036 },
  { name: 'volumeDown', expected: 0x3037 },
  { name: 'next', expected: 0x3066 },
  { name: 'prev', expected: 0x3067 },
  { name: 'battery', expected: 0x1000 },
  { name: 'torch', expected: 0x3010 },
  { name: 'themeToggle', expected: 12 },
  { name: 'counterInc', expected: 0x0201 },
  { name: '0x3060', expected: 0x3060 },
  { name: 12384, expected: 0x3060 }
];

for (const t of tests) {
  const actual = TitanRegisters.resolve(t.name);
  assert.strictEqual(actual, t.expected, `Failed for ${t.name}: expected 0x${t.expected.toString(16)}, got 0x${actual.toString(16)}`);
  console.log(`  ✅ ${String(t.name).padEnd(16)} ➔ 0x${actual.toString(16).toUpperCase()} (${actual})`);
}

// 2. Test JSX Compiler HTML5 Tags & Symbol Resolution
console.log('\n[TEST 2] Testing TitanCompiler HTML5 Media Tags & Symbol Resolution...');
const compiler = new TitanCompiler();

// 2A. Video Tag
const videoComp = compiler.compile({
  tag: 'video',
  props: { src: 'titan_disk/my_sample.mp4', controls: true, autoPlay: true, loop: true }
});
assert.strictEqual(videoComp.binaries[0][1], 0x52, 'Video tag should compile to opcode 0x52');
assert.ok(videoComp.stringPool.includes('controls:true;loop:true;autoplay:true'), 'Video controls/loop/autoplay flags must be in stringPool');
console.log('  ✅ <video controls autoPlay loop /> ➔ Opcode 0x52 + Flags in stringPool');

// 2B. Camera Tag
const cameraComp = compiler.compile({
  tag: 'camera',
  props: { facing: 'front', autoPreview: true }
});
assert.strictEqual(cameraComp.binaries[0][1], 0x50, 'Camera tag should compile to opcode 0x50');
console.log('  ✅ <camera facing="front" autoPreview /> ➔ Opcode 0x50 (CameraBuilder)');

// 2C. Button with tx="cameraOpen"
const btnCam = compiler.compile({
  tag: 'button',
  props: { tx: 'cameraOpen' },
  text: 'Snap Photo'
});
const txCam = (btnCam.binaries[0][16] << 8) | btnCam.binaries[0][17];
assert.strictEqual(txCam, 0x3060, 'tx="cameraOpen" should resolve to 0x3060');
console.log('  ✅ <button tx="cameraOpen"> ➔ Byte 16..17 = 0x3060 (Zero strings on wire)');

// 2D. Button with tx="mediaPick"
const btnPick = compiler.compile({
  tag: 'button',
  props: { tx: 'mediaPick' },
  text: 'Open Gallery'
});
const txPick = (btnPick.binaries[0][16] << 8) | btnPick.binaries[0][17];
assert.strictEqual(txPick, 0x3063, 'tx="mediaPick" should resolve to 0x3063');
console.log('  ✅ <button tx="mediaPick"> ➔ Byte 16..17 = 0x3063 (Universal Photo/Video Picker)');

// 2E. Text with rx="battery"
const textBat = compiler.compile({
  tag: 'text',
  props: { rx: 'battery' }
});
const rxBat = (textBat.binaries[0][18] << 8) | textBat.binaries[0][19];
assert.strictEqual(rxBat, 0x1000, 'rx="battery" should resolve to 0x1000');
console.log('  ✅ <text rx="battery"> ➔ Byte 18..19 = 0x1000 (Direct Live Hardware RX Wire)');

console.log('\n======================================================================');
console.log('🎉 ALL TITAN-OS MULTIMEDIA & PREDEFINED REGISTER TESTS PASSED 100%!');
console.log('======================================================================\n');
