'use strict';

/**
 * 🌊 Dolphin CLI — `android` command
 * Subcommands: setup | build
 *
 * Usage:
 *   dolphin android setup           ← auto-install Android SDK
 *   dolphin android build            ← build offline-first APK from existing project
 *   dolphin android build --release  ← production signed APK
 *   dolphin android build --hotpatch ← debug APK that connects to dev server
 *   dolphin android build --run      ← build + install + launch on device
 */

const path = require('path');
const fs   = require('fs');
const { cmdBuild } = require('./build');

async function cmdAndroid(subCmd, args) {
    const { AndroidBuilder } = require('../../android/AndroidBuilder');
    const { SDKSetup }       = require('../../android/SDKSetup');

    // ── android setup ───────────────────────────────────────────
    if (subCmd === 'setup') {
        const setup = new SDKSetup({ verbose: (args || []).includes('--verbose') });
        await setup.run();
        return;
    }

    // ── android build (default) ─────────────────────────────────
    const cwd        = process.cwd();
    const configPath = path.resolve(cwd, 'dolphin.config.js');
    if (!fs.existsSync(configPath)) {
        console.error('❌  dolphin.config.js not found. Run: dolphin init <AppName>');
        process.exit(1);
    }

    const config  = require(configPath);
    const distDir = path.resolve(cwd, 'dist');
    const dolpFile = path.join(distDir, `${config.app || 'app'}.dolp`);

    // Build .dolp first, then APK
    await cmdBuild([]);

    const builder = new AndroidBuilder({
        appName:    config.app     || 'DolphinApp',
        package:    config.package || 'io.dolphin.app',
        version:    config.version || '1.0.0',
        entry:      config.entry   || 'Home',
        icon:       config.icon ? path.resolve(cwd, config.icon) : null,
        splash:     config.splash ? path.resolve(cwd, config.splash) : null,
        dolpBundle: dolpFile,
        release:    (args || []).includes('--release'),
        verbose:    (args || []).includes('--verbose'),
        projectDir: fs.existsSync(path.resolve(cwd, '.danphe-android')) ? path.resolve(cwd, '.danphe-android') : path.resolve(cwd, '.dolphin-android'),
        devPort:    config.dev?.port || 7788,
        devHost:    config.dev?.host || null,
        enableHotpatch: (args || []).includes('--hotpatch'),
        run:        (args || []).includes('--run'),
    });

    await builder.build();
}

module.exports = { cmdAndroid };
