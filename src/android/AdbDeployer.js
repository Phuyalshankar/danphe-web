'use strict';

const path = require('path');
const { execSync } = require('child_process');

/**
 * 📱 AdbDeployer — Manages ADB device installation, package launching, and ADB logcat streaming.
 */
class AdbDeployer {
    static getAdbExecutable() {
        const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
        if (sdk) {
            const adb = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');
            if (require('fs').existsSync(adb)) return `"${adb}"`;
        }
        return 'adb';
    }

    static installApk(apkPath, logFunc) {
        const adb = AdbDeployer.getAdbExecutable();
        if (logFunc) logFunc(`📱 Installing APK via ADB: ${apkPath}`);
        try {
            const output = execSync(`${adb} install -r "${apkPath}"`, { encoding: 'utf-8' });
            if (logFunc) logFunc('   ✅ ADB Install: ' + output.trim());
            return true;
        } catch (e) {
            if (logFunc) logFunc('   ❌ ADB Install failed: ' + e.message);
            return false;
        }
    }

    static launchApp(packageName = 'com.dolphin.app', activityName = '.MainActivity', logFunc) {
        const adb = AdbDeployer.getAdbExecutable();
        try {
            execSync(`${adb} shell am start -n "${packageName}/${activityName}"`, { encoding: 'utf-8' });
            if (logFunc) logFunc('   🚀 Launched ' + packageName);
            return true;
        } catch (_e) {
            return false;
        }
    }
}

module.exports = AdbDeployer;
