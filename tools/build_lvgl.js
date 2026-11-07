'use strict';

const fs = require('fs');
const path = require('path');
const TitanJSX = require('D:/titan-bus-client/src/TitanJSX');
const TitanWidgets = require('D:/titan-bus-client/src/TitanWidgets');
const { pipeline } = require('../src/index.js');

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
const lvglCpp = pipeline.toLvgl(vnode, 'Home');
console.log('LVGL C++ Length:', lvglCpp.length, 'lines:', lvglCpp.split('\n').length);

const outDir = path.resolve(__dirname, '../dist');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'app_lvgl.cpp'), lvglCpp, 'utf8');
console.log('Saved to D:/danphe-native/dist/app_lvgl.cpp successfully!');
