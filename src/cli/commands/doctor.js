'use strict';

/**
 * 🌊 Dolphin Mobile CLI — `doctor` command
 * Analyzes developer's environment (Node, Java, Android SDK, Gradle, variables)
 * and outputs a beautiful, colorful compatibility report.
 */

const { execSync } = require('child_process');
const fs           = require('fs');
const path         = require('path');
const os           = require('os');

function cmdDoctor(args = []) {
    console.log('\n   \x1b[1m\x1b[36m🌊 DOLPHIN DIAGNOSTICS DOCTOR\x1b[0m');
    console.log('   \x1b[90m═════════════════════════════════════════\x1b[0m\n');

    let allOk = true;

    // ── 1. Node.js Environment ───────────────────────────────
    const nodeVer = process.version;
    const nodeMajor = parseInt(nodeVer.replace('v', '').split('.')[0]);
    if (nodeMajor >= 18) {
        console.log(`   \x1b[32m✔\x1b[0m \x1b[1mNode.js Environment\x1b[0m: ${nodeVer} (\x1b[32mCompatible\x1b[0m)`);
    } else {
        allOk = false;
        console.log(`   \x1b[31m✘\x1b[0m \x1b[1mNode.js Environment\x1b[0m: ${nodeVer} (\x1b[31mWarning: Recommended Node.js >= 18\x1b[0m)`);
    }

    // ── 2. Java JDK ──────────────────────────────────────────
    let javaVer = '';
    let javaPath = '';
    try {
        const out = execSync('java -version 2>&1', { encoding: 'utf8' });
        javaVer = out.split('\n')[0].replace(/"/g, '');
        console.log(`   \x1b[32m✔\x1b[0m \x1b[1mJava JDK Version\x1b[0m: ${javaVer}`);
    } catch (e) {
        // Search common paths
        const search = [
            'C:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot\\bin\\java.exe',
            'C:\\Program Files\\Microsoft\\jdk-11.0.30.7-hotspot\\bin\\java.exe'
        ];
        const found = search.find(p => fs.existsSync(p));
        if (found) {
            javaPath = found;
            console.log(`   \x1b[32m✔\x1b[0m \x1b[1mJava JDK\x1b[0m: Found in common paths at: \x1b[90m${found}\x1b[0m`);
        } else {
            allOk = false;
            console.log(`   \x1b[31m✘\x1b[0m \x1b[1mJava JDK\x1b[0m: Not found in PATH or standard Microsoft OpenJDK directories.`);
            console.log('       \x1b[90mInstall OpenJDK 11 or 17 (e.g. winget install Microsoft.OpenJDK.11)\x1b[0m');
        }
    }

    // ── 3. ANDROID_HOME / SDK ────────────────────────────────
    const sdkHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), '.dolphin', 'android-sdk');
    if (fs.existsSync(sdkHome)) {
        console.log(`   \x1b[32m✔\x1b[0m \x1b[1mAndroid SDK Path\x1b[0m: ${sdkHome} (\x1b[32mDetected\x1b[0m)`);
        
        // Check platform tools
        const adbPath = path.join(sdkHome, 'platform-tools', os.platform() === 'win32' ? 'adb.exe' : 'adb');
        if (fs.existsSync(adbPath)) {
            console.log(`   \x1b[32m✔\x1b[0m \x1b[1mAdb Platform Tool\x1b[0m: Detected`);
        } else {
            allOk = false;
            console.log(`   \x1b[31m✘\x1b[0m \x1b[1mAdb Platform Tool\x1b[0m: Missing in SDK. Run \x1b[36mdolphin android setup\x1b[0m`);
        }
    } else {
        allOk = false;
        console.log(`   \x1b[31m✘\x1b[0m \x1b[1mAndroid SDK\x1b[0m: Not detected at ${sdkHome}`);
        console.log('       \x1b[90mRun: dolphin android setup  ← auto-installs full Android CLI environment\x1b[0m');
    }

    // ── 4. Gradle Cache ──────────────────────────────────────
    const gradleHome = path.join(os.homedir(), '.dolphin', 'gradle-wrapper', 'gradle-wrapper.jar');
    if (fs.existsSync(gradleHome)) {
        console.log(`   \x1b[32m✔\x1b[0m \x1b[1mGradle Wrapper Cache\x1b[0m: Loaded and cached successfully`);
    } else {
        console.log(`   \x1b[33m!\x1b[0m \x1b[1mGradle Wrapper Cache\x1b[0m: Cached wrapper jar not found (Will auto-download on first build)`);
    }

    // ── 5. Android Devices Connected ─────────────────────────
    try {
        const adbCmd = fs.existsSync(path.join(sdkHome, 'platform-tools', 'adb.exe')) 
            ? `"${path.join(sdkHome, 'platform-tools', 'adb.exe')}" devices` 
            : 'adb devices';
        const devicesOut = execSync(adbCmd, { encoding: 'utf8' });
        const lines = devicesOut.trim().split('\n').slice(1).filter(l => l.trim().length > 0);
        if (lines.length > 0) {
            console.log(`   \x1b[32m✔\x1b[0m \x1b[1mConnected Devices\x1b[0m: ${lines.length} device(s) active`);
            lines.forEach(l => console.log(`       \x1b[90m- ${l.replace(/\tdevice/, '')}\x1b[0m`));
        } else {
            console.log(`   \x1b[33m!\x1b[0m \x1b[1mConnected Devices\x1b[0m: No physical phones or emulators detected via adb`);
        }
    } catch (e) {
        console.log(`   \x1b[33m!\x1b[0m \x1b[1mConnected Devices\x1b[0m: Could not query active devices (Adb may not be configured)`);
    }

    console.log('\n   \x1b[90m═════════════════════════════════════════\x1b[0m');
    if (allOk) {
        console.log('   \x1b[1m\x1b[32m🎉 EXCELLENT! Your environment is 100% ready for Dolphin Native!\x1b[0m\n');
    } else {
        console.log('   \x1b[1m\x1b[33m⚠️  WARNING: Some prerequisites need your attention before building.\x1b[0m\n');
    }
}

module.exports = { cmdDoctor };
