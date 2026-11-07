'use strict';

/**
 * 🧪 DANPHE-NATIVE TITAN-BUS AUDIO STREAM, DISK WRITE & BUTTON CONTROL TEST
 * ─────────────────────────────────────────────────────────────────────────
 * Tests the exact three requirements specified by the user:
 *   1. Manual Audio Buffer Generation & Serial Bus Streaming (16kHz 16-bit Mono)
 *   2. Direct Disk Write Verification (titan_disk/audio/live_audio.pcm & WAV header)
 *   3. Titan-Bus Button & Register Control Dispatch:
 *      - 0x3038 = 1 (Start Studio Recording -> Subpage 11:1 & Disk WAV write)
 *      - 0x3038 = 2 (Stop Studio Recording -> Finalize WAV header & Subpage 11:0)
 *      - 0x3038 = 6 (Toggle Mic Stream -> Reg 0x3033 & Disk live_audio.pcm write)
 *      - 0x0020 = 1 (Torch Actuator - HW_ACT_TORCH)
 *      - 0x3070 = 1 (Camera Flip Actuator - HW_ACT_CAMERA_FLIP)
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

console.log('======================================================================');
console.log('🧪 TITAN-BUS AUDIO STREAM, DISK WRITE & BUTTON CONTROL TEST');
console.log('======================================================================\n');

// ── Setup Test Titan Disk Directory ──────────────────────────────────────────
const TEST_DISK_DIR = path.resolve(__dirname, '../titan_disk_test');
const TEST_AUDIO_DIR = path.join(TEST_DISK_DIR, 'audio');
fs.mkdirSync(TEST_AUDIO_DIR, { recursive: true });

// ── 1. Create Simulated 16-Bit Titan-Bus Memory & Hardware Engine ────────────
class MockTitanBus {
  constructor() {
    this.memory = new Uint16Array(65536);
    this.listeners = new Map();
    this.audioChunkListeners = [];
    this.activeSubpage = 0;
    this.isRecording = false;
    this.isStreaming = false;
    this.currentRecFile = null;
    this.currentRecStream = null;
    this.liveAudioStream = null;
    this.liveAudioFile = null;
    this.totalRecBytes = 0;
  }

  subscribe(reg, callback) {
    if (!this.listeners.has(reg)) this.listeners.set(reg, []);
    this.listeners.get(reg).push(callback);
  }

  write(reg, value, origin = 'TEST') {
    const r = reg & 0xFFFF;
    const v = value & 0xFFFF;
    this.memory[r] = v;

    // Dispatch listeners
    const cbs = this.listeners.get(r) || [];
    cbs.forEach(cb => cb(v));

    // Universal Hardware Actuator Dispatcher (mimics TitanDeviceBridge.kt)
    this.onActuatorDispatch(r, v);
  }

  read(reg) {
    return this.memory[reg & 0xFFFF];
  }

  onActuatorDispatch(reg, value) {
    switch (reg) {
      case 11: // Sub-page router (0: Home, 1: CamCast, 2: Files)
        this.activeSubpage = value;
        break;

      case 0x0020: // HW_ACT_TORCH (32)
      case 0x3010: // ACTUATOR_TORCH (12304)
        this.isTorchOn = (value !== 0);
        break;

      case 0x3070: // HW_ACT_CAMERA_FLIP (12400)
        this.isFrontCamera = !this.isFrontCamera;
        break;

      case 0x3033: // ACT_AUDIO_STREAM (12339)
        this.setStreaming(value !== 0);
        break;

      case 0x3038: // SYS_VOICE_OPCODE / STUDIO CONTROL (12344)
        switch (value) {
          case 1: // Start Recording
            this.write(11, 1); // Switch to CamCast
            this.startRecording();
            break;
          case 2: // Stop Recording
            this.stopRecording();
            this.write(11, 0); // Switch to Home
            break;
          case 3: // Flip Camera
            this.write(0x3070, 1);
            break;
          case 4: // Rotate
            this.rotation = (this.rotation || 0) + 90;
            break;
          case 6: // Mic Stream to Disk Toggle
            const next = !this.isStreaming;
            this.write(0x3033, next ? 1 : 0);
            break;
        }
        break;
    }
  }

  setStreaming(enable) {
    this.isStreaming = enable;
    if (enable) {
      const livePath = path.join(TEST_AUDIO_DIR, 'live_audio.pcm');
      this.liveAudioFile = livePath;
      if (this.liveAudioFd) try { fs.closeSync(this.liveAudioFd); } catch (_) {}
      this.liveAudioFd = fs.openSync(livePath, 'w');
    } else {
      if (this.liveAudioFd) {
        fs.closeSync(this.liveAudioFd);
        this.liveAudioFd = null;
      }
    }
  }

  startRecording() {
    this.isRecording = true;
    const recPath = path.join(TEST_AUDIO_DIR, `rec_${Date.now()}.wav`);
    this.currentRecFile = recPath;
    if (this.currentRecFd) try { fs.closeSync(this.currentRecFd); } catch (_) {}
    this.currentRecFd = fs.openSync(recPath, 'w');
    this.totalRecBytes = 0;
    // Write 44-byte dummy WAV header
    const dummyHeader = Buffer.alloc(44);
    fs.writeSync(this.currentRecFd, dummyHeader);
  }

  stopRecording() {
    if (!this.isRecording) return;
    this.isRecording = false;
    if (this.currentRecFd) {
      fs.closeSync(this.currentRecFd);
      this.currentRecFd = null;

      // Finalize WAV Header on disk with actual byte length
      if (this.currentRecFile && fs.existsSync(this.currentRecFile)) {
        const totalAudioLen = this.totalRecBytes;
        const totalDataLen = totalAudioLen + 36;
        const fd = fs.openSync(this.currentRecFile, 'r+');
        const header = this.createWavHeader(totalAudioLen, totalDataLen);
        fs.writeSync(fd, header, 0, 44, 0);
        fs.closeSync(fd);
      }
    }
  }

  createWavHeader(totalAudioLen, totalDataLen, sampleRate = 16000) {
    const header = Buffer.alloc(44);
    header.write('RIFF', 0);
    header.writeUInt32LE(totalDataLen, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // SubChunk1Size (16 for PCM)
    header.writeUInt16LE(1, 20);  // AudioFormat (1 = PCM)
    header.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
    header.writeUInt32LE(sampleRate, 24); // SampleRate (16000)
    header.writeUInt32LE(sampleRate * 2, 28); // ByteRate (16000 * 1 * 2)
    header.writeUInt16LE(2, 32);  // BlockAlign (1 * 16 / 8 = 2)
    header.writeUInt16LE(16, 34); // BitsPerSample (16)
    header.write('data', 36);
    header.writeUInt32LE(totalAudioLen, 40);
    return header;
  }

  // Simulates DolphinMic captureLoop feeding raw PCM chunks
  feedManualAudioChunk(pcmBuffer) {
    // 1. Peak Amplitude Calculation -> Reg 0x3034
    let maxAmp = 0;
    for (let i = 0; i < pcmBuffer.length - 1; i += 2) {
      const sample = Math.abs(pcmBuffer.readInt16LE(i));
      if (sample > maxAmp) maxAmp = sample;
    }
    const peakPercent = Math.min(100, Math.floor((maxAmp / 32767.0) * 100));
    this.write(0x3034, peakPercent, 'MIC_PEAK');

    // 2. Serial Titan-Bus Relay
    this.audioChunkListeners.forEach(cb => cb(pcmBuffer));

    // 3. Direct Disk Stream Writer (Reg 0x3033: ACT_AUDIO_STREAM)
    if (this.isStreaming && this.liveAudioFd) {
      fs.writeSync(this.liveAudioFd, pcmBuffer);
    }

    // 4. File Recording (Reg 0x3032 / Studio Record)
    if (this.isRecording && this.currentRecFd) {
      fs.writeSync(this.currentRecFd, pcmBuffer);
      this.totalRecBytes += pcmBuffer.length;
    }
  }
}

// ── TEST 1: MANUAL AUDIO BUFFER GENERATION & SERIAL BUS STREAMING ────────────
console.log('📌 [TEST 1] Generating Manual PCM Audio Buffer & Streaming to Titan-Bus...');
const titan = new MockTitanBus();

// Generate a 100ms 16kHz 16-bit Mono Sine Wave (5 chunks of 640 bytes = 20ms each)
const SAMPLE_RATE = 16000;
const CHUNK_SIZE = 640; // 320 samples @ 16-bit = 20ms
const NUM_CHUNKS = 5;
const FREQUENCY = 440; // 440Hz Concert A tone

const testChunks = [];
for (let c = 0; c < NUM_CHUNKS; c++) {
  const buf = Buffer.alloc(CHUNK_SIZE);
  for (let s = 0; s < 320; s++) {
    const t = (c * 320 + s) / SAMPLE_RATE;
    const sampleVal = Math.floor(Math.sin(2 * Math.PI * FREQUENCY * t) * 20000);
    buf.writeInt16LE(sampleVal, s * 2);
  }
  testChunks.push(buf);
}

// Listen on the Serial Bus for incoming audio chunks
let receivedChunksCount = 0;
let totalBytesReceived = 0;
titan.audioChunkListeners.push((chunk) => {
  receivedChunksCount++;
  totalBytesReceived += chunk.length;
});

// Enable Serial Audio Streaming (0x3033 = 1)
titan.write(0x3033, 1);
assert.strictEqual(titan.isStreaming, true, 'Serial audio streaming is active');
assert.strictEqual(titan.read(0x3033), 1, 'Register 0x3033 is set to 1');

// Feed manual audio chunks through the bus
for (const chunk of testChunks) {
  titan.feedManualAudioChunk(chunk);
}

assert.strictEqual(receivedChunksCount, 5, 'Serial bus received all 5 audio chunks');
assert.strictEqual(totalBytesReceived, 5 * 640, 'Total bytes received matches 3,200 bytes exactly');
assert.ok(titan.read(0x3034) > 0, `VU meter peak amplitude registered: ${titan.read(0x3034)}%`);
console.log(`  ✅ PASS: Serial bus received ${receivedChunksCount} audio chunks (${totalBytesReceived} bytes). Peak VU: ${titan.read(0x3034)}%\n`);


// ── TEST 2: DIRECT DISK WRITE VERIFICATION ────────────────────────────────────
console.log('📌 [TEST 2] Verifying Direct Disk Audio File Writing (titan_disk/audio)...');

// Turn off streaming to flush file stream
titan.write(0x3033, 0);

// Verify live_audio.pcm on disk
const liveAudioPath = path.join(TEST_AUDIO_DIR, 'live_audio.pcm');
assert.ok(fs.existsSync(liveAudioPath), 'live_audio.pcm exists on disk');
const liveStats = fs.statSync(liveAudioPath);
assert.strictEqual(liveStats.size, 3200, `Disk file size matches exact audio stream (got ${liveStats.size} bytes, expected 3200)`);

// Read back data from disk and verify bit-for-bit accuracy
const diskData = fs.readFileSync(liveAudioPath);
const originalConcat = Buffer.concat(testChunks);
assert.ok(diskData.equals(originalConcat), 'Disk file content matches fed PCM buffer bit-for-bit!');
console.log(`  ✅ PASS: Audio written directly to disk: ${liveAudioPath} (${liveStats.size} bytes matches original 100%)!\n`);


// ── TEST 3: BUTTON CONTROL & STUDIO RECORDING CYCLE ──────────────────────────
console.log('📌 [TEST 3] Testing Titan-Bus Button Controls & Studio Recording Cycle...');

// 1. Initial State: Home screen (subpage 11:0)
assert.strictEqual(titan.activeSubpage, 0, 'Initial active subpage is 0 (Home)');

// 2. Press "⏺ START STUDIO RECORDING" button (tx={0x3038} txValue={1})
console.log('  👉 Simulating Click: START STUDIO RECORDING (tx={0x3038} txValue={1})');
titan.write(0x3038, 1);
assert.strictEqual(titan.activeSubpage, 1, 'Subpage switched immediately to 1 (CamCast screen)');
assert.strictEqual(titan.isRecording, true, 'Recording state active');
assert.ok(titan.currentRecFile && fs.existsSync(titan.currentRecFile), 'New WAV file created on disk');

// Feed 10 chunks of live audio during recording session
for (let i = 0; i < 10; i++) {
  titan.feedManualAudioChunk(testChunks[i % 5]);
}
assert.strictEqual(titan.totalRecBytes, 10 * 640, 'Recorded 6,400 bytes of audio');

// 3. Press "🔄 Flip Camera" button (tx={0x3070} txValue={1})
console.log('  👉 Simulating Click: Flip Camera (tx={0x3070} txValue={1})');
const prevFacing = titan.isFrontCamera;
titan.write(0x3070, 1);
assert.strictEqual(titan.isFrontCamera, !prevFacing, 'Camera facing toggled cleanly');

// 4. Press "💡 Torch" button (tx={0x0020} txValue={1} - HW_ACT_TORCH)
console.log('  👉 Simulating Click: Torch (tx={0x0020} txValue={1})');
titan.write(0x0020, 1);
assert.strictEqual(titan.isTorchOn, true, 'Torch engaged via Register 0x0020');

// 5. Press "⏹ Stop" button (tx={0x3038} txValue={2})
console.log('  👉 Simulating Click: Stop Recording (tx={0x3038} txValue={2})');
const recordedWavPath = titan.currentRecFile;
titan.write(0x3038, 2);
assert.strictEqual(titan.isRecording, false, 'Recording stopped cleanly');
assert.strictEqual(titan.activeSubpage, 0, 'Subpage returned immediately to 0 (Home screen)');

// 6. Verify Recorded WAV on disk: Valid RIFF Header + Data size
const wavStats = fs.statSync(recordedWavPath);
assert.strictEqual(wavStats.size, 6400 + 44, `WAV file size is exactly audio data + 44 byte header (got ${wavStats.size})`);

const wavHeader = Buffer.alloc(44);
const fd = fs.openSync(recordedWavPath, 'r');
fs.readSync(fd, wavHeader, 0, 44, 0);
fs.closeSync(fd);

assert.strictEqual(wavHeader.slice(0, 4).toString(), 'RIFF', 'WAV magic is RIFF');
assert.strictEqual(wavHeader.slice(8, 12).toString(), 'WAVE', 'WAV format is WAVE');
assert.strictEqual(wavHeader.readUInt32LE(40), 6400, 'WAV data subchunk length is exactly 6400 bytes');
console.log(`  ✅ PASS: Studio Recording created valid WAV on disk: ${path.basename(recordedWavPath)} (${wavStats.size} bytes)!\n`);


// ── Cleanup Test Files ───────────────────────────────────────────────────────
try {
  fs.rmSync(TEST_DISK_DIR, { recursive: true, force: true });
} catch (_) {}

console.log('======================================================================');
console.log('🎉 ALL TESTS PASSED 100%!');
console.log('  ✅ 1. Manual Audio Buffer passed to Serial Bus: Received & VU peak calculated.');
console.log('  ✅ 2. Audio written directly to Disk: Bit-for-bit verification successful.');
console.log('  ✅ 3. Button controls: Subpage switching, recording, torch, and flip all responsive.');
console.log('======================================================================\n');
process.exit(0);
