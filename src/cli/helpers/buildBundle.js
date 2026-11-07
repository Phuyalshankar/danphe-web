'use strict';

/**
 * 🌊 Dolphin — Build Bundle Helper
 * Shared utility used by `dev` and `build` commands.
 * Loads the app entry file, serializes all screens/components into
 * the Dolphin Binary Protocol (.dolp) buffer.
 */

const path = require('path');
const fs = require('fs');
const { DolphinBinaryProtocol } = require('../../protocol/DolphinBinaryProtocol');

const INITIAL_STATE_MARKER = '__DOLPHIN_INITIAL_STATE__:';

function loadInitialStoreState(appPath) {
    const projectRoot = path.dirname(appPath);
    const storePaths = [
        path.join(projectRoot, 'store', 'appStore.js'),
        path.join(projectRoot, 'store', 'index.js'),
        path.join(projectRoot, 'store.js'),
    ];

    for (const storePath of storePaths) {
        if (!fs.existsSync(storePath)) continue;
        try {
            delete require.cache[require.resolve(storePath)];
            const storeModule = require(storePath);
            const store = storeModule.default || storeModule.appStore || storeModule.nanoStore || storeModule.store || storeModule;
            const state = (store && typeof store.get === 'function' && typeof store.get() === 'object' && store.get() !== null ? store.get() : null)
                       || storeModule.initialMasterState
                       || (store && typeof store.exportState === 'function' ? store.exportState() : null);
            if (state && typeof state === 'object' && !Array.isArray(state)) return state;
        } catch (error) {
            console.warn(`   ⚠️ Could not load initial NanoStore state from ${storePath}: ${error.message}`);
        }
    }
    return {};
}

/**
 * Build a .dolp bundle from the given app entry file.
 *
 * @param {string} appPath   - Absolute path to app.js / app.jsx
 * @param {object} config    - dolphin.config.js contents

/**
 * Build a .dolp bundle from the given app entry file.
 *
 * @param {string} appPath   - Absolute path to app.js / app.jsx
 * @param {object} config    - dolphin.config.js contents
 * @returns {{ buffer, screens, entry, actionHandler, appInstance }}
 */
function buildBundle(appPath, config) {
    // Clear require cache for framework compiler modules so hotpatch always uses fresh code
    Object.keys(require.cache).forEach(key => {
        if (key.includes('ubParser') || key.includes('UniversalUIImporter') || key.includes('CDNStyleBridge')) {
            delete require.cache[key];
        }
    });

    // Inject project-local node_modules into NODE_PATH so require('dolphin-native') inside
    // app.jsx resolves from the TEST PROJECT's own node_modules (which has the file: symlink)
    // rather than from the CLI package's own directory.
    const projectNodeModules = path.join(path.dirname(appPath), 'node_modules');
    const danpheCorePath = path.resolve(__dirname, '../../../');
    const existingNodePath = process.env.NODE_PATH || '';
    if (!existingNodePath.includes(danpheCorePath)) {
        process.env.NODE_PATH = danpheCorePath + path.delimiter + projectNodeModules + (existingNodePath ? path.delimiter + existingNodePath : '');
        require('module').Module._initPaths();
    }

    if (module.paths && !module.paths.includes(danpheCorePath)) {
        module.paths.unshift(danpheCorePath);
    }

    // Direct mock for require('dolphin-native') and require('danphe-native')
    const nativeExports = require('../../index.js');
    require.cache[require.resolve('../../index.js')] = { exports: nativeExports, loaded: true };
    try {
        const Module = require('module');
        const origResolve = Module._resolveFilename;
        Module._resolveFilename = function(request, parent, isMain, options) {
            if (request === 'dolphin-native' || request === 'danphe-native') {
                return path.resolve(danpheCorePath, 'index.js');
            }
            try {
                return origResolve.call(this, request, parent, isMain, options);
            } catch (err) {
                for (const ext of ['.jsx', '.js', '.json']) {
                    try {
                        return origResolve.call(this, request + ext, parent, isMain, options);
                    } catch (_) {}
                }
                throw err;
            }
        };
    } catch(e) {}

    require.extensions['.jsx'] = function(module, filename) {
        let content = fs.readFileSync(filename, 'utf8');
        const transpiled = nativeExports.TitanJSX.transpileJSX(content);
        const clean = transpiled
            .replace(/import\s+([A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"];?/g, (m, name, p) => {
                if (p.endsWith('.dolphin')) return '';
                return `const ${name} = require('${p}');`;
            })
            .replace(/import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"];?/g, (m, names, p) => {
                if (p.endsWith('.dolphin')) return '';
                return `const { ${names} } = require('${p}');`;
            })
            .replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)/, 'function $1')
            .replace(/export\s+default\s+([A-Za-z0-9_]+);?/, 'module.exports = $1;');
        const fnMatch = clean.match(/function\s+([A-Za-z0-9_]+)/);
        const exportName = fnMatch ? fnMatch[1] : null;

        const regFile = path.resolve(path.dirname(filename), '../registers/registers.dolphin');
        let fileRegs = {};
        if (fs.existsSync(regFile)) {
            try { fileRegs = nativeExports.parseDolphinRegisters(fs.readFileSync(regFile, 'utf8')); } catch (_) {}
        }
        const combinedRegs = { ...nativeExports.REGISTERS, ...fileRegs };
        Object.assign(globalThis, combinedRegs);

        const wrapCode = `(function(require, module, exports, TitanJSX, TitanWidgets) {\n${clean}\nif (typeof ${exportName} !== 'undefined') { module.exports = ${exportName}; module.exports.default = ${exportName}; }\n})`;
        const fn = require('vm').runInThisContext(wrapCode, { filename });
        fn(module.require.bind(module), module, module.exports, nativeExports.TitanJSX, nativeExports.TitanWidgets);
    };

    // Check if modern TitanJSX app
    const rawCode = fs.readFileSync(appPath, 'utf8');
    if (rawCode.includes('function App') || rawCode.includes('export default') || rawCode.includes('<')) {
        const { pipeline, TitanJSX, TitanWidgets, REGISTERS, parseDolphinRegisters } = nativeExports;
        const transpiled = TitanJSX.transpileJSX(rawCode);
        const cleanCode = transpiled
            .replace(/import\s+([A-Za-z0-9_]+)\s+from\s+['"]([^'"]+)['"];?/g, (m, name, p) => {
                if (p.endsWith('.dolphin')) return '';
                return `const ${name} = require('${p}');`;
            })
            .replace(/import\s*\{([^}]+)\}\s*from\s+['"]([^'"]+)['"];?/g, (m, names, p) => {
                if (p.endsWith('.dolphin')) return '';
                return `const { ${names} } = require('${p}');`;
            })
            .replace(/import\s+[\s\S]*?from\s+['"].*?['"];?/g, '')
            .replace(/export\s+default\s+function\s+App\s*\(\)\s*\{/, 'function App() {');

        const regFile = path.resolve(path.dirname(appPath), 'registers', 'registers.dolphin');
        let registers = { ...REGISTERS };
        if (fs.existsSync(regFile)) {
            registers = { ...registers, ...parseDolphinRegisters(fs.readFileSync(regFile, 'utf8')) };
        }
        Object.assign(globalThis, registers);

        const TitanRegisters = require('../../registers/TitanRegisters');
        const ctx = {
            ...TitanJSX,
            ...TitanWidgets,
            ...registers,
            TitanRegisters,
            reg: TitanRegisters.reg,
            defineRegisters: TitanRegisters.defineRegisters,
            require: (mod) => {
                if (mod.includes('TitanWidgets')) return TitanWidgets;
                if (mod.includes('TitanJSX')) return TitanJSX;
                if (mod.includes('TitanRegisters')) return TitanRegisters;
                if (mod.startsWith('./') || mod.startsWith('../')) {
                    return require(path.resolve(path.dirname(appPath), mod));
                }
                return require(mod);
            },
            aja: () => ({ baisakh: 1, year: 2083, month: '07', day: '03', hour: 16, min: 45, sec: 0 })
        };

        const fn = new Function(...Object.keys(ctx), cleanCode + '\nreturn App();');
        const vnode = fn(...Object.values(ctx));
        const androidRes = pipeline.toAndroid(vnode);

        // 🏛️ Automatically export compiled Register Schema (registers.json)
        try {
            const schemaJson = TitanRegisters.exportSchemaJson();
            const projectRoot = path.dirname(appPath);
            const distDir = path.join(projectRoot, 'dist');
            if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
            fs.writeFileSync(path.join(distDir, 'registers.json'), schemaJson, 'utf8');

            const possibleAssetDirs = [
                path.join(projectRoot, '.dolphin-android', 'app', 'src', 'main', 'assets'),
                path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets'),
                path.join(danpheCorePath, 'runtime', 'android', 'app', 'src', 'main', 'assets'),
                path.join(danpheCorePath, '.danphe-android', 'app', 'src', 'main', 'assets')
            ];
            for (const assetDir of possibleAssetDirs) {
                if (fs.existsSync(path.dirname(assetDir))) {
                    if (!fs.existsSync(assetDir)) fs.mkdirSync(assetDir, { recursive: true });
                    fs.writeFileSync(path.join(assetDir, 'registers.json'), schemaJson, 'utf8');
                }
            }
        } catch (_) {}

        const screensList = (androidRes.screens && androidRes.screens.length > 0)
            ? androidRes.screens.map((s, i) => ({ name: s.name, offset: 0, length: androidRes.bundleBuffer.length }))
            : [{ name: 'Home', offset: 0, length: androidRes.bundleBuffer.length }];

        return {
            buffer: androidRes.bundleBuffer,
            screens: screensList,
            entry: 0,
            actionHandler: null,
            appInstance: null
        };
    }

    const app = require(appPath);

    // Clear compiler cache & refresh universalImporter so new compiler fixes apply immediately
    if (app) {
        const comp = app.compiler || (app.app && app.app.compiler);
        if (comp) {
            if (comp.titanCache) comp.titanCache.clear();
            try {
                const UniversalUIImporter = require('../../ui/UniversalUIImporter');
                comp.universalImporter = new UniversalUIImporter();
            } catch (e) {}
        }
    }
    const initialStoreState = loadInitialStoreState(appPath);

    // Support both: DolphinApp instance (export app) or pre-built bundle (export app.build())
    const isInstance = app && app.constructor && app.constructor.name === 'DolphinApp';
    const appBundle  = isInstance ? app.build() : app;

    const protocol   = new DolphinBinaryProtocol();

    console.log('   🔍 App screens:', Object.keys(appBundle.screens || {}));

    const screens    = [];
    const components = [];
    let   compOffset = 0;

    for (const [name, screen] of Object.entries(appBundle.screens || {})) {
        console.log(`   🔍 Screen "${name}":`, {
            binaryType:    screen.binaryType,
            binaryIsBuffer: Buffer.isBuffer(screen.binary),
            binaryIsArray:  Array.isArray(screen.binary),
            binaryLength:   screen.binary
                ? (Buffer.isBuffer(screen.binary) ? screen.binary.length : screen.binary.length)
                : 0,
            rawDataLength: screen.rawData ? screen.rawData.length : 0,
        });

        const screenComps = [];

        if (Array.isArray(screen.binary)) {
            screen.binary.forEach(bin => {
                if (bin && bin.length > 0) {
                    components.push(Buffer.from(bin.slice(0, 24)));
                    screenComps.push(Buffer.from(bin.slice(0, 24)));
                }
            });
        } else if (Buffer.isBuffer(screen.binary)) {
            for (let i = 0; i < screen.binary.length; i += 24) {
                if (i + 24 <= screen.binary.length) {
                    const chunk = screen.binary.slice(i, i + 24);
                    components.push(chunk);
                    screenComps.push(chunk);
                }
            }
        }

        const rawData = screen.rawData || Buffer.alloc(0);
        const stateData = Object.keys(initialStoreState).length > 0
            ? Buffer.concat([rawData, Buffer.from(`${INITIAL_STATE_MARKER}${JSON.stringify(initialStoreState)}\0`, 'utf8')])
            : rawData;

        screens.push({
            name,
            data:            stateData,
            componentOffset: compOffset,
            components:      screenComps,
        });
        compOffset += screenComps.length;

        console.log(`   📱 "${name}": ${screenComps.length} components`);
    }

    console.log(`   📦 Total: ${screens.length} screens, ${components.length} components`);

    return {
        buffer: protocol.serialize({
            screens,
            components,
            entry:  appBundle.entry,
            drawer: appBundle.drawer,
            flags:  appBundle.flags || 0,
        }),
        screens,
        entry:         appBundle.entry,
        actionHandler: appBundle.__actionHandler,
        appInstance:   isInstance ? app : null,
    };
}

module.exports = { buildBundle };
