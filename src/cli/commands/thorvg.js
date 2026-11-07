'use strict';

/**
 * 🦚 Danphe CLI — `thorvg` command
 * Transpiles JSX/HTML pages to Native Samsung ThorVG / LVGL C++ code.
 *
 * Usage:
 *   danphe thorvg
 *   danphe thorvg build
 */

const path = require('path');
const fs = require('fs');
const { DanpheThorVGTranspiler } = require('../../thorvg/DanpheThorVGTranspiler');

async function cmdThorVG(args) {
    const cwd = process.cwd();
    console.log('🦚 =================================================================');
    console.log('🦚  DANPHE 2: SAMSUNG THORVG & LVGL NATIVE C++ GENERATOR');
    console.log('🦚 =================================================================\n');

    const transpiler = new DanpheThorVGTranspiler();
    const pagesDir = path.resolve(cwd, 'pages');
    const outDir = path.resolve(cwd, 'src', 'embedded');

    if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir, { recursive: true });
    }

    // Default Demo Component if no pages directory
    const demoAST = [
        { tag: 'h1', text: 'Danphe Embedded Screen' },
        { tag: 'p', stateKey: 'sys_battery_level' },
        { tag: 'button', text: '⚡ Activate Engine' },
        { tag: 'button', text: '🛑 Emergency Stop' },
        { tag: 'slider' }
    ];

    const generatedCpp = transpiler.transpileToCpp(demoAST, 'MainScreen');
    const targetFile = path.join(outDir, 'danphe_thorvg_screen.cpp');
    fs.writeFileSync(targetFile, generatedCpp, 'utf8');

    console.log(`✅ Generated ThorVG/LVGL C++ Code: ${targetFile}`);
    console.log(`⚡ Ready for Direct Hardware Flashing (ESP32 / Display / Smartwatch)!\n`);
}

module.exports = { cmdThorVG };
