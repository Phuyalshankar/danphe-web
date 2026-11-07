const fs = require('fs');
const path = require('path');
const TitanJSX = require('D:/titan-bus-client/src/TitanJSX');
const TitanWidgets = require('D:/titan-bus-client/src/TitanWidgets');
const { pipeline } = require('D:/danphe-native/src/index.js');

const rawCode = fs.readFileSync('D:/titan-real-test/my-real-app/app.jsx', 'utf8');
const transpiled = TitanJSX.transpileJSX(rawCode);
const cleanCode = transpiled
    .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '')
    .replace(/export\s+default\s+function\s+App\s*\(\)\s*\{/, 'function App() {');

const ctx = {
    ...TitanJSX,
    ...TitanWidgets,
    SYS_POWER: 1,
    AUDIO_VOLUME: 512,
    AUDIO_PAN: 513,
    VIDEO_ZOOM: 514,
    VIDEO_TILT: 515,
    DISP_BRIGHTNESS: 516,
    ACT_TORCH: 12304,
    ACT_HAPTIC: 12288,
    ACT_BRIGHTNESS: 12320,
    ACT_WAKELOCK: 12321,
    ACT_MEDIA_VOL: 12336,
    ACT_CLIPBOARD: 12352,
    ACT_PLAY: 16385,
    ACT_REW: 16386,
    ACT_FWD: 16387,
    TEL_BATTERY: 4096,
    TEL_CHARGING: 4097,
    TEL_ONLINE: 4098,
    TEL_ACCEL_X: 4224,
    TEL_ACCEL_Y: 4225,
    TEL_LIGHT: 4226,
    ERROR_MASTER: 61440,
    aja: () => ({ baisakh: 1, year: 2083, month: 7, day: 3, hour: 16, min: 45, sec: 0 })
};
const fn = new Function(...Object.keys(ctx), cleanCode + '\nreturn App();');
const vnode = fn(...Object.values(ctx));
const compiled = pipeline.titanCompiler.compile(vnode);

console.log('Total binaries:', compiled.binaries.length);
compiled.binaries.forEach((b, idx) => {
    const opcode = b[1];
    if (opcode === 0x12 || opcode === 0x13 || opcode === 0x14) {
        const orientation = b[12] & 0x0F;
        const gap = (b[12] >> 4) & 0x0F;
        const count = b[13];
        const mb = b[10];
        console.log('Container #' + idx + ': opcode=0x' + opcode.toString(16) + ' orient=' + orientation + ' gap=' + gap + ' (' + (gap*4) + 'px) count=' + count + ' mb=' + mb);
    } else if (opcode === 0x10) {
        console.log('Button #' + idx + ': bgShade=' + b[2] + ' bgPalette=' + b[3] + ' radius=' + b[14]);
    }
});
