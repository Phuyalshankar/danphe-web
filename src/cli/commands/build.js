'use strict';

/**
 * 🌊 Dolphin CLI — `build` command
 * Compile project to .dolp bundle (+ optional Android APK).
 *
 * Usage:
 *   dolphin build
 *   dolphin build --android
 *   dolphin build --android --release
 *   dolphin build --android --hotpatch
 *   dolphin build --android --run
 */

const path = require('path');
const fs   = require('fs');
const { performance } = require('perf_hooks');
const { buildBundle } = require('../helpers/buildBundle');

const IconCDNFetcher   = require('../../compiler/IconCDNFetcher');
const CdnAssetFetcher  = require('../../compiler/CdnAssetFetcher');

async function cmdBuild(args) {
    const cwd = process.cwd();
    const enableHotpatch = args.includes('--hotpatch');

    // ── Resolve config & entry path ──────────────────────────────
    const possibleConfigs = [
        path.resolve(cwd, 'dolphin.config.js'),
        path.resolve(cwd, 'dolphin-native', 'dolphin.config.js'),
        path.resolve(__dirname, '../../../dolphin.config.js')
    ];
    const configPath = possibleConfigs.find(p => fs.existsSync(p));

    if (!configPath) {
        console.error('❌  dolphin.config.js not found.');
        process.exit(1);
    }
    const config = require(configPath);

    const projectRoot = path.dirname(configPath);

    // ── Sync CDN Icon assets if configured ────────────────────────
    await IconCDNFetcher.ensureIconsDownloaded(config, projectRoot);

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
        console.error('❌  Entry file (app.js or app.jsx) not found.');
        process.exit(1);
    }

    console.log('');
    console.log('   \x1b[1m\x1b[36m🌊 DOLPHIN BUILD\x1b[0m');
    console.log('   \x1b[90m─────────────────────────────────────────\x1b[0m');

    const startTime = performance.now();

    // ── Bust require cache for fresh build ──────────────────────
    const appDir = path.dirname(path.resolve(appPath));
    Object.keys(require.cache).forEach(key => {
        const n = key.replace(/\\/g, '/').toLowerCase();
        if (n.startsWith(appDir.replace(/\\/g, '/').toLowerCase()) ||
            n.includes('/src/framework')) {
            delete require.cache[key];
        }
    });

    // ── Compile bundle ──────────────────────────────────────────
    const bundleResult = buildBundle(appPath, config);
    const bundle       = bundleResult.buffer;

    // ── Write to dist/ ──────────────────────────────────────────
    const distDir = path.resolve(cwd, 'dist');
    fs.mkdirSync(distDir, { recursive: true });

    const outFile = path.join(distDir, `${config.app || 'app'}.dolp`);
    fs.writeFileSync(outFile, bundle);

    const time = (performance.now() - startTime).toFixed(1);
    console.log(`   ✨ \x1b[32mBuild complete!\x1b[0m (${time}ms)`);
    console.log(`   📦 \x1b[1mOutput:\x1b[0m \x1b[90m${outFile}\x1b[0m`);
    console.log(`   📊 \x1b[1mSize:\x1b[0m   \x1b[33m${bundle.length} bytes\x1b[0m`);
    console.log('');

    // ── Optional: Web HTML5 SEO build ─────────────────────────────
    if (args.includes('--web')) {
        const DolphinWebEngine = require('../../web/DolphinWebEngine');
        const pagesDir = path.resolve(projectRoot, 'pages');

        // Download CDN assets locally once (cache-on-disk)
        const localCdnPaths = await CdnAssetFetcher.ensureDownloaded(projectRoot);

        if (fs.existsSync(pagesDir)) {
            const pageFiles = fs.readdirSync(pagesDir).filter(f => (f.endsWith('.jsx') || f.endsWith('.js')) && f !== 'index.js');
            
            // Purge node cache for fresh JSX rendering
            Object.keys(require.cache).forEach(key => {
                if (key.includes(projectRoot)) {
                    delete require.cache[key];
                }
            });

            // Find Home page or default to first page
            const homeFile = pageFiles.find(f => f.toLowerCase().startsWith('home')) || pageFiles[0];

            pageFiles.forEach(file => {
                const pagePath = path.join(pagesDir, file);
                try {
                    const pageModule = require(pagePath);
                    const compFunc = Object.values(pageModule)[0];
                    if (typeof compFunc === 'function') {
                        const vnode = compFunc();
                        const html = DolphinWebEngine.renderToWebHTML(vnode, {
                            title: config.title || config.app || 'Dolphin Web App',
                            description: config.description || 'Built with Dolphin Native Universal Architecture'
                        }, {}, localCdnPaths);

                        const baseName = path.basename(file, path.extname(file));
                        const fileName = (file === homeFile) ? 'index.html' : `${baseName.toLowerCase()}.html`;
                        const outPath = path.join(distDir, fileName);
                        fs.writeFileSync(outPath, html);
                        
                        console.log(`   ✅ \x1b[32mGenerated Web Page ->\x1b[0m \x1b[90m${outPath}\x1b[0m`);
                    }
                } catch(e) {
                    console.error(`  ⚠️ Web render error for ${file}:`, e.message);
                }
            });

            // Copy project assets directory to dist/assets for 100% offline web support
            const projAssets = path.resolve(projectRoot, 'assets');
            if (fs.existsSync(projAssets)) {
                const distAssets = path.resolve(distDir, 'assets');
                fs.cpSync(projAssets, distAssets, { recursive: true });
            }
        }
    }

    // ── Optional: Android APK build ─────────────────────────────
    if (args.includes('--android')) {
        const { AndroidBuilder } = require('../../android/AndroidBuilder');
        const builder = new AndroidBuilder({
            appName:    config.app     || 'DolphinApp',
            package:    config.package || 'io.dolphin.app',
            version:    config.version || '1.0.0',
            entry:      config.entry   || 'Home',
            icon:       config.icon ? path.resolve(projectRoot, config.icon) : null,
            splash:     config.splash ? path.resolve(projectRoot, config.splash) : null,
            dolpBundle: outFile,
            release:    args.includes('--release') || !args.includes('--debug'),
            verbose:    args.includes('--verbose'),
            projectDir: fs.existsSync(path.resolve(cwd, '.danphe-android')) ? path.resolve(cwd, '.danphe-android') : path.resolve(cwd, '.dolphin-android'),
            userPluginsDir: path.resolve(projectRoot, 'android-plugins'),
            devPort:    config.dev?.port || 9091,
            devHost:    config.dev?.host || null,
            enableHotpatch,
            run:        args.includes('--run'),
        });
        await builder.build();
        if (!enableHotpatch) {
            console.log('  ℹ️  APK is offline-first by default. Use --hotpatch only for direct-mobile dev builds.');
        }
    } else if (!args.includes('--web')) {
        console.log('  Next steps:');
        console.log('    dolphin build --web       ← build HTML5 Web App with Full SEO');
        console.log('    dolphin build --android   ← compile + build APK in one step');
        console.log('');
    }

    return { outFile, bundle };
}

module.exports = { cmdBuild };
