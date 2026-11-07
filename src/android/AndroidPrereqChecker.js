'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

/**
 * ☕ AndroidPrereqChecker — Validates JDK 17, Java environment, ANDROID_HOME, and ADB paths.
 */
class AndroidPrereqChecker {
    static checkJava(logFunc) {
        let javaOutput = '';
        let javaFound = false;

        try {
            javaOutput = execSync('java -version 2>&1', { encoding: 'utf-8' });
            javaFound = true;
        } catch (_e) {
            // Check common JDK paths if java CLI isn't in PATH directly
            const candidateJdkPaths = [
                process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, 'bin', 'java.exe') : null,
                'C:\\Program Files\\Java\\jdk-17\\bin\\java.exe',
                'C:\\Program Files\\Eclipse Adoptium\\jdk-17\\bin\\java.exe'
            ].filter(Boolean);

            for (const p of candidateJdkPaths) {
                if (fs.existsSync(p)) {
                    try {
                        javaOutput = execSync(`"${p}" -version 2>&1`, { encoding: 'utf-8' });
                        process.env.JAVA_HOME = path.dirname(path.dirname(p));
                        process.env.PATH = path.dirname(p) + path.delimiter + process.env.PATH;
                        javaFound = true;
                        break;
                    } catch (_err) {}
                }
            }
        }

        if (javaFound && logFunc) {
            logFunc('   ✅ Java: ' + javaOutput.split('\n')[0]);
        }
        return javaFound;
    }

    static checkAndroidSdk(logFunc) {
        const candidatePaths = [
            process.env.ANDROID_HOME,
            process.env.ANDROID_SDK_ROOT,
            path.join(os.homedir(), '.dolphin', 'android-sdk'),
            path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
            '/Users/' + os.userInfo().username + '/Library/Android/sdk',
            '/home/' + os.userInfo().username + '/Android/Sdk'
        ].filter(Boolean);

        let sdkPath = null;
        for (const p of candidatePaths) {
            if (fs.existsSync(p) && fs.existsSync(path.join(p), 'platform-tools')) {
                sdkPath = p;
                break;
            }
        }

        if (sdkPath) {
            process.env.ANDROID_HOME = sdkPath;
            process.env.ANDROID_SDK_ROOT = sdkPath;
            if (logFunc) logFunc('   ✅ Android SDK: ' + sdkPath);
        }

        return sdkPath;
    }
}

module.exports = AndroidPrereqChecker;
