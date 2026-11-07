'use strict';

/**
 * 🌊 Dolphin CLI — `dev` command
 * Start the hot-binary-patch dev server.
 *
 * Usage: dolphin dev
 */

const path = require('path');
const fs   = require('fs');
const { DevServer }   = require('../../runtime/DevServer');
const { buildBundle } = require('../helpers/buildBundle');

// ── ADB reverse helper ────────────────────────────────────────────────────────
function setupAdbReverse(port) {
    try {
        const { execSync } = require('child_process');
        execSync(`adb reverse tcp:${port} tcp:${port}`, { stdio: 'ignore' });
        console.log(`   🔌 adb reverse tcp:${port} established (USB)`);
    } catch (e) {
        // Silently ignore — no ADB or no device connected
    }
}

// ── Resolve config & entry path ───────────────────────────────────────────────
function resolveProjectPaths(cwd) {
    const possibleConfigs = [
        path.resolve(cwd, 'dolphin.config.js'),
        path.resolve(cwd, 'dolphin-native', 'dolphin.config.js'),
        path.resolve(__dirname, '../../../dolphin.config.js')
    ];
    const configPath = possibleConfigs.find(p => fs.existsSync(p));

    if (!configPath) {
        console.error('❌  dolphin.config.js not found. Are you in a Dolphin project?');
        process.exit(1);
    }

    const projectRoot = path.dirname(configPath);
    let config = {};
    try { config = require(configPath); } catch (e) {}

    const entryPaths = [
        config.entry ? path.resolve(projectRoot, config.entry) : null,
        path.resolve(projectRoot, 'frontend', 'app.jsx'),
        path.resolve(projectRoot, 'frontend', 'app.js'),
        path.resolve(projectRoot, 'app.jsx'),
        path.resolve(projectRoot, 'app.js'),
        path.resolve(projectRoot, 'DemoApp', 'app.jsx'),
        path.resolve(projectRoot, 'DemoApp', 'app.js')
    ].filter(Boolean);
    const appPath = entryPaths.find(p => fs.existsSync(p));
    if (!appPath) {
        console.error('❌  app.js or app.jsx not found. Please create an entry file.');
        process.exit(1);
    }

    return { configPath, appPath };
}

const IconCDNFetcher = require('../../compiler/IconCDNFetcher');

// ── Main ──────────────────────────────────────────────────────────────────────
async function cmdDev(args) {
    const cwd = process.cwd();
    const globalNativePath = path.resolve(__dirname, '../../../');
    if (module.paths && !module.paths.includes(globalNativePath)) {
        module.paths.unshift(globalNativePath);
    }
    const { configPath, appPath } = resolveProjectPaths(cwd);
    const config = require(configPath);
    const projectRoot = path.dirname(configPath);

    await IconCDNFetcher.ensureIconsDownloaded(config, projectRoot);

    let bundleResult  = buildBundle(appPath, config);
    let bundle        = bundleResult.buffer;
    let actionHandler = bundleResult.actionHandler;
    let appInstance   = bundleResult.appInstance;

    const port = config.dev?.port || 9091;
    const httpPort = config.dev?.httpPort || 9090;
    const titanPort = config.dev?.titanPort || 9092;
    setupAdbReverse(port);
    setupAdbReverse(httpPort);
    setupAdbReverse(titanPort);

    const server = new DevServer({
        host:     config.dev?.host || '0.0.0.0',
        port,
        httpPort,
        titanPort,
        watchDir: cwd,
    });
    global.dolphinDevServer = server;

    // Device connection log
    server.server.on('connection', ({ id, ip }) => {
        console.log(`   📱 \x1b[32mDevice Linked:\x1b[0m ${id} @ ${ip}`);
    });

    // Load custom server.js if present in project root
    const serverScriptPath = path.resolve(projectRoot, 'server.js');
    if (fs.existsSync(serverScriptPath)) {
        try {
            const customServer = require(serverScriptPath);
            if (typeof customServer === 'function') {
                customServer(server);
                console.log('🏨 [Custom Server Engine] Attached project server.js');
            }
        } catch (e) {
            console.error('⚠️ Failed to load project server.js:', e.message);
        }
    }

    if (appInstance) appInstance.attachDevServer(server);
    if (actionHandler) server.attachApp(actionHandler);

    server.on('ready', () => {
        console.log('📦 Sending initial bundle to connected devices...');
        server.pushReload(bundle);
    });

    // ── Hot-reload on file change (debounced 200ms) ───────────────────────────
    let rebuildTimer = null;
    server.on('fileChanged', ({ file }) => {
        clearTimeout(rebuildTimer);
        rebuildTimer = setTimeout(() => {
            console.log(`  🔄 Rebuilding: ${file}`);
            try {
                // Bust require cache for all project & src files (including store.js, etc.)
                const cwdNorm = cwd.replace(/\\/g, '/').toLowerCase();
                Object.keys(require.cache).forEach(k => {
                    const n = k.replace(/\\/g, '/').toLowerCase();
                    if (!n.includes('/node_modules/') || n.includes('dolphin-native')) {
                        delete require.cache[k];
                    }
                });

                bundleResult  = buildBundle(appPath, config);
                bundle        = bundleResult.buffer;
                actionHandler = bundleResult.actionHandler;
                appInstance   = bundleResult.appInstance;

                // Load custom server.js if present in project root
    const serverScriptPath = path.resolve(projectRoot, 'server.js');
    if (fs.existsSync(serverScriptPath)) {
        try {
            const customServer = require(serverScriptPath);
            if (typeof customServer === 'function') {
                customServer(server);
                console.log('🏨 [Custom Server Engine] Attached project server.js');
            }
        } catch (e) {
            console.error('⚠️ Failed to load project server.js:', e.message);
        }
    }

    if (appInstance) appInstance.attachDevServer(server);
                if (actionHandler) server.attachApp(actionHandler);
                server.pushReload(bundle);

                // Push updated store state keys to connected devices
                try {
                    const path = require('path');
                    const fs = require('fs');
                    const storePaths = [
                        path.join(cwd, 'store', 'appStore.js'),
                        path.join(cwd, 'store', 'index.js'),
                        path.join(cwd, 'store.js')
                    ];
                    for (const sp of storePaths) {
                        if (fs.existsSync(sp)) {
                            delete require.cache[require.resolve(sp)];
                            const storeModule = require(sp);
                            const storeObj = storeModule.default || storeModule.appStore || storeModule.nanoStore || storeModule.store;
                            if (storeObj && typeof storeObj.get === 'function') {
                                const stateData = storeObj.get();
                                if (stateData && typeof stateData === 'object') {
                                    Object.entries(stateData).forEach(([k, v]) => {
                                        console.log(`   ✅ Push → [${k}] = ${v}`);
                                        server.patchState(null, k, String(v));
                                    });
                                }
                            }
                            break;
                        }
                    }
                } catch (e) {}
            } catch (err) {
                console.error(`  ❌ Rebuild error: ${err.message}`);
            }
        }, 200);
    });

    await server.start();

    // ── Device action handler ─────────────────────────────────────────────────
    server.server.on('deviceAction', ({ id, action, value }) => {
        if (action === 'app.error') {
            try {
                const errData = JSON.parse(value);
                console.log(`\n❌ \x1b[31m[DEVICE ERROR]\x1b[0m Device ${id} reported an error:`);
                console.log(`   \x1b[31m${errData.message}\x1b[0m\n`);
                console.log(`\x1b[33m${errData.trace}\x1b[0m\n`);
            } catch(e) {
                console.error(`\n❌ \x1b[31m[DEVICE ERROR]\x1b[0m from ${id}: ${value}`);
            }
            return;
        }

        console.log(`\n⚡ [DEVICE ACTION] ${id} -> ${action} (value: ${value})`);
        try {
            let v = value;
            if (v === 'true')  v = true;
            else if (v === 'false') v = false;
            else if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) v = Number(v);

            if (typeof actionHandler === 'function') actionHandler(action, v, id);
            if (global.dolphinBus && typeof global.dolphinBus._onDeviceAction === 'function') {
                global.dolphinBus._onDeviceAction(action, value, id);
            }
        } catch (e) {
            console.error(`  ❌ Action handling error: ${e.message}`);
        }
    });

    // ── Optional project server.js ────────────────────────────────────────────
    let projectServerPath = path.resolve(cwd, 'server.js');
    if (!fs.existsSync(projectServerPath)) {
        projectServerPath = path.resolve(path.dirname(appPath), 'server.js');
    }
    if (fs.existsSync(projectServerPath)) {
        console.log('  🚀 Loading project server-side logic (server.js)...');
        try {
            const projectServer = require(projectServerPath);
            if (typeof projectServer === 'function') projectServer(server.server, server);
        } catch (e) {
            console.error(`  ❌ Error loading server.js: ${e.message}`);
        }
    }

    // Initial push after server is ready
    setTimeout(() => server.pushReload(bundle), 500);
}

module.exports = { cmdDev };
