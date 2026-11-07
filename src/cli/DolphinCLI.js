'use strict';

/**
 * 🌊 Dolphin CLI — Main Dispatcher
 * Parses process.argv and routes to the correct command handler.
 *
 * Called by: bin/dolphin.js
 */

const path = require('path');
const globalNativePath = path.resolve(__dirname, '../../');
if (module.paths && !module.paths.includes(globalNativePath)) {
    module.paths.unshift(globalNativePath);
}

const { cmdInit, cmdDev, cmdBuild, cmdInspect, cmdAndroid, cmdDoctor, cmdGenerate, cmdThorVG, showHelp } = require('./commands');

// ── Enable JSX via Babel globally ───────────────────────────────
try {
    const babelRegister = require(require.resolve('@babel/register', { paths: [globalNativePath, process.cwd()] }));
    const pluginPath = require.resolve('@babel/plugin-transform-react-jsx', { paths: [globalNativePath, process.cwd()] });
    babelRegister({
        presets: [],
        plugins: [[pluginPath, { pragma: 'React.createElement', runtime: 'classic' }]],
        extensions: ['.js', '.jsx'],
        only: [() => true],
        ignore: [
            (filepath) => {
                if (filepath && filepath.includes('dolphin-native')) return false;
                return /node_modules/.test(filepath);
            }
        ],
    });
    // Stub React.createElement so Babel output doesn't crash at runtime
    global.React = {
        createElement(type, props, ...children) {
            const flatChildren = children.flat(Infinity).filter(c => c !== null && c !== undefined && c !== false);
            return {
                $$typeof: Symbol.for('react.element'),
                type,
                props: { ...props, children: flatChildren.length === 1 ? flatChildren[0] : flatChildren },
            };
        },
    };
} catch (e) {
    // @babel/register warning catch
}

const fs = require('fs');
if (require.extensions) {
    require.extensions['.dolphin'] = function(module, filename) {
        const content = fs.readFileSync(filename, 'utf8');
        const registers = {};
        const regex = /register\s+([A-Za-z0-9_]+)\s*=\s*(0x[0-9A-Fa-f]+|\d+);/g;
        let m;
        while ((m = regex.exec(content)) !== null) {
            const val = m[2].startsWith('0x') || m[2].startsWith('0X') ? parseInt(m[2], 16) : parseInt(m[2], 10);
            registers[m[1]] = val;
        }
        let code = '';
        for (const [k, v] of Object.entries(registers)) {
            code += `exports.${k} = ${v};\n`;
        }

        // Dynamic Namespace Form Registers: reg form:: name, email, password;
        const formRegex = /reg\s+([A-Za-z0-9_]+)::\s*([A-Za-z0-9_,\s]+);?/g;
        let fm;
        while ((fm = formRegex.exec(content)) !== null) {
            const formDecl = fm[0].replace(/'/g, "\\'");
            const titanRegPath = path.resolve(__dirname, '../registers/TitanRegisters').replace(/\\/g, '/');
            code += `const _f_${fm[1]} = require('${titanRegPath}').reg('${formDecl}');\nexports.${fm[1]} = _f_${fm[1]};\n`;
        }

        module._compile(code, filename);
    };
}

// ── Parse argv ────────────────────────────────────────────────────────────────
const [,, command, sub, ...rest] = process.argv;
const allArgs = [sub, ...rest].filter(Boolean);

let version = '1.0.0';
try { version = require('../../package.json').version; } catch (e) {}

// ── Dispatch ──────────────────────────────────────────────────────────────────
async function main() {
    switch (command) {
        case 'init':     await cmdInit(sub);                 process.exit(0);
        case 'dev':      await cmdDev(allArgs);              break;
        case 'build':    await cmdBuild(allArgs);            process.exit(0);
        case 'inspect':  await cmdInspect(sub);              process.exit(0);
        case 'android':  await cmdAndroid(sub, rest);        process.exit(0);
        case 'doctor':   await cmdDoctor(allArgs);           process.exit(0);
        case 'thorvg':   await cmdThorVG(allArgs);           process.exit(0);
        case 'g':
        case 'generate': await cmdGenerate(sub, rest[0]);    process.exit(0);
        default:         showHelp(version);                  process.exit(0);
    }
}

if (require.main && (require.main.filename.endsWith('dolphin.js') || require.main.filename.endsWith('dolphin-mobile.js') || require.main.filename.endsWith('danphe.js') || require.main.filename.endsWith('danphe-mobile.js') || require.main.filename.endsWith('DolphinCLI.js'))) {
    main().catch(err => {
        console.error(err);
        process.exit(1);
    });
}

