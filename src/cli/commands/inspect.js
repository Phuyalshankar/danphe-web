'use strict';

/**
 * 🌊 Dolphin CLI — `inspect` command
 * Decode and pretty-print a .dolp binary bundle.
 *
 * Usage: dolphin inspect <file.dolp>
 */

const path = require('path');
const fs   = require('fs');
const { DolphinBinaryProtocol } = require('../../protocol/DolphinBinaryProtocol');

function cmdInspect(filePath) {
    if (!filePath) {
        console.error('❌  Usage: dolphin inspect <file.dolp>');
        process.exit(1);
    }

    const resolved = path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(resolved)) {
        console.error(`❌  File not found: ${resolved}`);
        process.exit(1);
    }

    const buf      = fs.readFileSync(resolved);
    const protocol = new DolphinBinaryProtocol();

    try {
        const parsed = protocol.deserialize(buf);

        console.log('');
        console.log('  🌊 DOLPHIN BUNDLE INSPECTOR');
        console.log('  ═════════════════════════════════════════');
        console.log(`  File:       ${path.basename(resolved)}`);
        console.log(`  Size:       ${buf.length} bytes`);
        console.log(`  Magic:      ${parsed.magic}`);
        console.log(`  Version:    ${parsed.version}`);
        console.log(`  Checksum:   ${parsed.checksumValid ? '✅ valid' : '❌ INVALID'}`);
        console.log(`  Screens:    ${parsed.scrCount}`);
        parsed.screens.forEach((s, i) => {
            console.log(`    [${i}] "${s.name}"  compOff=${s.compOff}  compCnt=${s.compCnt}  data=${s.dataLen}B`);
        });
        console.log(`  Components: ${parsed.compCount}`);
        parsed.components.forEach((c, i) => {
            console.log(protocol.inspectComponent(c, i));
        });
        console.log('  ═════════════════════════════════════════');
        console.log('');
    } catch (err) {
        console.error(`❌  Parse error: ${err.message}`);
        process.exit(1);
    }
}

module.exports = { cmdInspect };
