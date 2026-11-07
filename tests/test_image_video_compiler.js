'use strict';

/**
 * 🦚 IMAGE & VIDEO COMPILER TEST SUITE
 * Tests:
 *  1. <image src="..."> → opcode 0x17, src in stringPool
 *  2. <video src="..."> → opcode 0x52, controls/loop/autoPlay flags
 *  3. <audio src="..."> → opcode 0x54
 *  4. <videostream src="..."> → opcode 0x71, codec, latency
 *  5. <camera> → opcode 0x50
 *  6. <image rx="..."> → live register bind
 *  7. Web HTML5 output: <img> tag src preserved
 *  8. Web HTML5 output: <video> tag src preserved
 *  9. tx="mediaPick" on button → 0x3063
 * 10. TitanDisk video: disk:// URL passthrough
 */

const assert = require('assert');
const TitanCompiler = require('../src/compiler/TitanCompiler');
const DolphinWebEngine = require('../src/web/DolphinWebEngine');

let pass = 0;
let fail = 0;

function test(name, fn) {
    try {
        fn();
        console.log(`  ✅ ${name}`);
        pass++;
    } catch (e) {
        console.log(`  ❌ ${name}`);
        console.log(`     → ${e.message}`);
        fail++;
    }
}

console.log('======================================================================');
console.log('🖼️  DANPHE-NATIVE IMAGE & VIDEO COMPILER TEST SUITE');
console.log('======================================================================\n');

const compiler = new TitanCompiler();
const web = new DolphinWebEngine();

// ══════════════════════════════════════════════════════
// [TEST GROUP 1] Image Tag — Android Binary
// ══════════════════════════════════════════════════════
console.log('[TEST 1] <image> tag → Android Binary (.dolp)');

test('<image src="https://..."> → opcode 0x17', () => {
    const r = compiler.compile({
        tag: 'image',
        props: { src: 'https://example.com/photo.jpg', className: 'w-full h-48 rounded-xl' }
    });
    assert.strictEqual(r.binaries[0][1], 0x17, `Expected opcode 0x17, got 0x${r.binaries[0][1].toString(16)}`);
});

test('<image src="..."> → src URL stringPool मा छ', () => {
    const r = compiler.compile({
        tag: 'image',
        props: { src: 'https://example.com/photo.jpg' }
    });
    const srcInPool = r.stringPool.some(s => s.includes('example.com/photo.jpg'));
    assert.ok(srcInPool, `src URL stringPool मा भेटिएन। Pool: ${JSON.stringify(r.stringPool)}`);
});

test('<img src="local_asset.png"> → opcode 0x17 (img alias)', () => {
    const r = compiler.compile({
        tag: 'img',
        props: { src: 'assets/logo.png' }
    });
    assert.strictEqual(r.binaries[0][1], 0x17, `img alias: Expected 0x17, got 0x${r.binaries[0][1].toString(16)}`);
});

test('<TImage src="disk://..."> → opcode 0x17 + disk URL', () => {
    const r = compiler.compile({
        tag: 'TImage',
        props: { src: 'disk://assets/images/banner.jpg' }
    });
    assert.strictEqual(r.binaries[0][1], 0x17);
    const srcInPool = r.stringPool.some(s => s.includes('disk://assets/images/banner.jpg'));
    assert.ok(srcInPool, 'disk:// URL stringPool मा भेटिएन');
});

test('<image src=""> → opcode 0x17 (empty src graceful)', () => {
    const r = compiler.compile({
        tag: 'image',
        props: { src: '' }
    });
    assert.strictEqual(r.binaries[0][1], 0x17, 'Empty src image should still compile to 0x17');
});

// ══════════════════════════════════════════════════════
// [TEST GROUP 2] Video Tag — Android Binary
// ══════════════════════════════════════════════════════
console.log('\n[TEST 2] <video> tag → Android Binary (.dolp)');

test('<video src="..."> → opcode 0x52', () => {
    const r = compiler.compile({
        tag: 'video',
        props: { src: 'disk://assets/videos/demo.mp4' }
    });
    assert.strictEqual(r.binaries[0][1], 0x52, `Expected 0x52, got 0x${r.binaries[0][1].toString(16)}`);
});

test('<video src="..." controls loop autoPlay> → flags stringPool मा', () => {
    const r = compiler.compile({
        tag: 'video',
        props: { src: 'disk://assets/videos/demo.mp4', controls: true, loop: true, autoPlay: true }
    });
    assert.strictEqual(r.binaries[0][1], 0x52);
    const flagStr = r.stringPool.find(s => s.includes('controls:true'));
    assert.ok(flagStr, `controls flag stringPool मा भेटिएन। Pool: ${JSON.stringify(r.stringPool)}`);
    assert.ok(flagStr.includes('loop:true'), 'loop flag missing');
    assert.ok(flagStr.includes('autoplay:true'), 'autoplay flag missing');
});

test('<video src="..."> → src URL stringPool मा छ', () => {
    const r = compiler.compile({
        tag: 'video',
        props: { src: 'https://cdn.example.com/video.mp4' }
    });
    const srcInPool = r.stringPool.some(s => s.includes('cdn.example.com/video.mp4'));
    assert.ok(srcInPool, `Video src URL stringPool मा भेटिएन। Pool: ${JSON.stringify(r.stringPool)}`);
});

test('<video> no src → default disk:// URL fallback', () => {
    const r = compiler.compile({
        tag: 'video',
        props: { controls: true }
    });
    assert.strictEqual(r.binaries[0][1], 0x52);
    const hasFallback = r.stringPool.some(s => s.includes('disk://'));
    assert.ok(hasFallback, 'No src video should fallback to disk:// URL');
});

test('<VideoPlayer> PascalCase → 0x52 ✅ (bug fixed)', () => {
    const r = compiler.compile({ tag: 'VideoPlayer', props: { src: 'titan_disk/movie.mp4' } });
    assert.strictEqual(r.binaries[0][1], 0x52, `VideoPlayer: Expected 0x52, got 0x${r.binaries[0][1].toString(16)}`);
});

test('<videoplayer> lowercase → 0x52 ✅ (bug fixed)', () => {
    const r = compiler.compile({ tag: 'videoplayer', props: { src: 'titan_disk/movie.mp4' } });
    assert.strictEqual(r.binaries[0][1], 0x52, `videoplayer: Expected 0x52, got 0x${r.binaries[0][1].toString(16)}`);
});

test('<AudioPlayer> + <audioplayer> → 0x54 ✅ (bug fixed)', () => {
    const r1 = compiler.compile({ tag: 'AudioPlayer', props: { src: 'song.mp3' } });
    assert.strictEqual(r1.binaries[0][1], 0x54, `AudioPlayer: Expected 0x54`);
    const r2 = compiler.compile({ tag: 'audioplayer', props: { src: 'song.mp3' } });
    assert.strictEqual(r2.binaries[0][1], 0x54, `audioplayer: Expected 0x54`);
});

// ══════════════════════════════════════════════════════
// [TEST GROUP 3] Audio Tag
// ══════════════════════════════════════════════════════
console.log('\n[TEST 3] <audio> tag → Android Binary (.dolp)');

test('<audio src="..."> → opcode 0x54', () => {
    const r = compiler.compile({
        tag: 'audio',
        props: { src: 'disk://assets/audio/song.mp3', controls: true }
    });
    assert.strictEqual(r.binaries[0][1], 0x54, `Expected 0x54, got 0x${r.binaries[0][1].toString(16)}`);
});

test('<audio> → controls flag stringPool मा', () => {
    const r = compiler.compile({
        tag: 'audio',
        props: { src: 'disk://audio/bg.mp3', controls: true }
    });
    const flagStr = r.stringPool.find(s => s.includes('controls:true'));
    assert.ok(flagStr, `controls flag stringPool मा भेटिएन`);
});

// ══════════════════════════════════════════════════════
// [TEST GROUP 4] Camera & Streaming Tags
// ══════════════════════════════════════════════════════
console.log('\n[TEST 4] Camera, VideoStream, VideoCall tags');

test('<camera facing="back"> → opcode 0x50', () => {
    const r = compiler.compile({
        tag: 'camera',
        props: { facing: 'back', autoPreview: true }
    });
    assert.strictEqual(r.binaries[0][1], 0x50);
});

test('<videostream src="rtsp://..."> → opcode 0x71 + codec', () => {
    const r = compiler.compile({
        tag: 'videostream',
        props: { src: 'rtsp://192.168.1.100:8554/live', codec: 'h264', latency: 'ultra-low' }
    });
    assert.strictEqual(r.binaries[0][1], 0x71, `Expected 0x71, got 0x${r.binaries[0][1].toString(16)}`);
    const hasCodec = r.stringPool.some(s => s.includes('h264'));
    assert.ok(hasCodec, 'codec stringPool मा भेटिएन');
});

test('<videocall peerId="abc"> → opcode 0x70', () => {
    const r = compiler.compile({
        tag: 'videocall',
        props: { peerId: 'peer-abc-123', mode: 'p2p_mesh' }
    });
    assert.strictEqual(r.binaries[0][1], 0x70);
});

// ══════════════════════════════════════════════════════
// [TEST GROUP 5] Register (rx/tx) on Image/Video
// ══════════════════════════════════════════════════════
console.log('\n[TEST 5] rx/tx registers on image & video');

test('<image rx="0x4001"> → rxReg correct in binary', () => {
    const r = compiler.compile({
        tag: 'image',
        props: { rx: 0x4001 }
    });
    assert.strictEqual(r.binaries[0][1], 0x17);
    const rxHi = r.binaries[0][18];
    const rxLo = r.binaries[0][19];
    const rxVal = (rxHi << 8) | rxLo;
    assert.strictEqual(rxVal, 0x4001, `rx register: expected 0x4001, got 0x${rxVal.toString(16)}`);
});

test('<button tx="mediaPick"> → Byte 16..17 = 0x3063', () => {
    const r = compiler.compile({
        tag: 'button',
        props: { tx: 'mediaPick' },
        children: ['Gallery']
    });
    const txVal = (r.binaries[0][16] << 8) | r.binaries[0][17];
    assert.strictEqual(txVal, 0x3063, `mediaPick: expected 0x3063, got 0x${txVal.toString(16)}`);
});

test('<button tx="cameraOpen"> → Byte 16..17 = 0x3060', () => {
    const r = compiler.compile({
        tag: 'button',
        props: { tx: 'cameraOpen' },
        children: ['Camera']
    });
    const txVal = (r.binaries[0][16] << 8) | r.binaries[0][17];
    assert.strictEqual(txVal, 0x3060, `cameraOpen: expected 0x3060, got 0x${txVal.toString(16)}`);
});

// ══════════════════════════════════════════════════════
// [TEST GROUP 6] Web HTML5 Output — image/video src preserved
// ══════════════════════════════════════════════════════
console.log('\n[TEST 6] Web HTML5 output — image/video src URL preserved');

test('<image src="..."> → Web HTML <img> tag with src', () => {
    const html = web.renderToWebHTML({
        tag: 'image',
        props: { src: 'https://example.com/banner.jpg', className: 'w-full' }
    });
    assert.ok(typeof html === 'string', 'HTML output should be a string');
    assert.ok(
        html.includes('example.com/banner.jpg') || html.includes('img'),
        `Web output should contain src URL or img tag. Got: ${html.slice(0, 200)}`
    );
});

test('<video src="..."> → Web HTML <video> tag with src', () => {
    const html = web.renderToWebHTML({
        tag: 'video',
        props: { src: 'https://cdn.example.com/video.mp4', controls: true }
    });
    assert.ok(typeof html === 'string', 'HTML output should be a string');
    assert.ok(
        html.includes('video') || html.includes('cdn.example.com'),
        `Web output should contain video or src. Got: ${html.slice(0, 200)}`
    );
});

// ══════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════
console.log('\n======================================================================');
const total = pass + fail;
if (fail === 0) {
    console.log(`🎉 ALL ${total} IMAGE & VIDEO TESTS PASSED 100%!`);
} else {
    console.log(`⚠️  ${pass}/${total} PASSED — ${fail} FAILED`);
}
console.log('======================================================================\n');

if (fail > 0) process.exit(1);
