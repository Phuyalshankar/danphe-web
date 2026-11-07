'use strict';

/**
 * 🌊 Dolphin Android SDK Setup
 *
 * Automatically downloads and installs Android command-line tools.
 * NO Android Studio needed — ever.
 *
 * Usage:
 *   dolphin android setup
 *
 * What it installs:
 *   1. Android SDK command-line tools
 *   2. platform-tools (adb)
 *   3. build-tools 34.0.0
 *   4. Android platform 34
 *   5. Gradle wrapper JAR
 */

const fs     = require('fs');
const path   = require('path');
const https  = require('https');
const os     = require('os');
const { execSync } = require('child_process');

// Download URLs
const SDK_URL = {
    win32:  'https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip',
    darwin: 'https://dl.google.com/android/repository/commandlinetools-mac-11076708_latest.zip',
    linux:  'https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip',
};
// Default install location
const DOLPHIN_HOME    = path.join(os.homedir(), '.dolphin');
const DOLPHIN_SDK_DIR = path.join(DOLPHIN_HOME, 'android-sdk');
const CACHED_JAR_PATH = path.join(DOLPHIN_HOME, 'gradle-wrapper', 'gradle-wrapper.jar');

class SDKSetup {
    constructor(options = {}) {
        this.sdkDir  = options.sdkDir || DOLPHIN_SDK_DIR;
        this.verbose = options.verbose || false;
    }

    async run() {
        console.log('');
        console.log('  🌊 DOLPHIN ANDROID SDK SETUP');
        console.log('  ══════════════════════════════════════════');
        console.log('  Installing Android tools (NO Studio needed)');
        console.log('');

        // Check if already installed
        if (this._isAlreadyInstalled()) {
            console.log(`  ✅ Android SDK already installed at: ${this.sdkDir}`);
            this._printEnvInstructions();
            return;
        }

        // Check Java
        await this._checkJava();

        // Download SDK command-line tools
        await this._downloadSDK();

        // Accept licenses
        this._acceptLicenses();

        // Install required packages
        this._installPackages();

        // Download Gradle wrapper JAR into dolphin project area
        await this._setupGradleWrapper();

        // Write env setup file
        this._writeEnvFile();

        console.log('');
        console.log('  ══════════════════════════════════════════');
        console.log('  ✅ Android SDK setup complete!');
        this._printEnvInstructions();
    }

    // ─────────────────────────────────────────────────────────
    // JAVA CHECK
    // ─────────────────────────────────────────────────────────

    async _checkJava() {
        console.log('  ▶  Checking Java...');
        try {
            const out = execSync('java -version 2>&1', { encoding: 'utf8' });
            console.log(`     ✅ ${out.split('\n')[0]}`);
        } catch {
            console.error('');
            console.error('  ❌ Java JDK not found!');
            console.error('');
            console.error('  Install JDK 11+ first:');
            if (os.platform() === 'win32') {
                console.error('    winget install Microsoft.OpenJDK.11');
            } else if (os.platform() === 'darwin') {
                console.error('    brew install openjdk@11');
            } else {
                console.error('    sudo apt install openjdk-11-jdk');
            }
            process.exit(1);
        }
    }

    // ─────────────────────────────────────────────────────────
    // DOWNLOAD SDK
    // ─────────────────────────────────────────────────────────

    async _downloadSDK() {
        const platform = os.platform();
        const url      = SDK_URL[platform] || SDK_URL.linux;

        console.log('');
        console.log('  ▶  Downloading Android command-line tools...');
        console.log(`     URL: ${url}`);
        console.log(`     Dest: ${this.sdkDir}`);

        fs.mkdirSync(this.sdkDir, { recursive: true });

        const zipPath = path.join(this.sdkDir, 'cmdline-tools.zip');
        await this._download(url, zipPath);
        console.log('     ✅ Downloaded');

        // Unzip
        console.log('  ▶  Extracting...');
        const unzip = os.platform() === 'win32'
            ? `powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${this.sdkDir}' -Force"`
            : `unzip -o "${zipPath}" -d "${this.sdkDir}"`;
        execSync(unzip, { stdio: this.verbose ? 'inherit' : 'pipe' });

        // Move extracted dir to expected location
        const extractedTools = path.join(this.sdkDir, 'cmdline-tools');
        const latestDir      = path.join(this.sdkDir, 'cmdline-tools', 'latest');
        if (fs.existsSync(extractedTools) && !fs.existsSync(latestDir)) {
            fs.mkdirSync(latestDir, { recursive: true });
            fs.readdirSync(extractedTools).forEach(f => {
                if (f !== 'latest') {
                    const src = path.join(extractedTools, f);
                    const dst = path.join(latestDir, f);
                    try { fs.renameSync(src, dst); } catch {}
                }
            });
        }

        // Cleanup zip
        try { fs.unlinkSync(zipPath); } catch {}
        console.log('     ✅ Extracted');
    }

    // ─────────────────────────────────────────────────────────
    // ACCEPT LICENSES
    // ─────────────────────────────────────────────────────────

    _acceptLicenses() {
        console.log('');
        console.log('  ▶  Accepting Android licenses...');

        const licensesDir = path.join(this.sdkDir, 'licenses');
        fs.mkdirSync(licensesDir, { recursive: true });

        // Pre-accept all licenses by writing the hashes
        const licenses = {
            'android-sdk-license':              ['d56f5187479451eabf01fb78af6dfcb131a6481e', '24333f8a63b6825ea9c5514f83c2829b004d1fee'],
            'android-sdk-preview-license':      ['84831b9409646a918e30573bab4c9c91346d8abd'],
            'intel-android-extra-license':      ['d975f751698a77b662f1254ddbeed3901e976f5a'],
            'android-googletv-license':         ['601085b94cd77f0b54ff86406957099ebe79c4d6'],
            'google-gdk-license':               ['33b6a2b64607f11b759f320ef9dff4ae5c47d97a'],
            'android-sdk-arm-dbt-license':      ['859f317696f67ef3d7f30a50a5560e7834b43903'],
        };

        Object.entries(licenses).forEach(([name, hashes]) => {
            fs.writeFileSync(path.join(licensesDir, name), '\n' + hashes.join('\n') + '\n');
        });

        console.log('     ✅ Licenses accepted');
    }

    // ─────────────────────────────────────────────────────────
    // INSTALL PACKAGES
    // ─────────────────────────────────────────────────────────

    _installPackages() {
        console.log('');
        console.log('  ▶  Installing Android SDK packages...');
        console.log('     (This downloads ~500MB — please wait)');

        const sdkmanager = this._getSdkManagerPath();
        const env = { ...process.env, ANDROID_HOME: this.sdkDir, ANDROID_SDK_ROOT: this.sdkDir };

        const packages = [
            'platform-tools',
            'build-tools;34.0.0',
            'platforms;android-34',
        ];

        packages.forEach(pkg => {
            console.log(`     Installing: ${pkg}`);
            try {
                execSync(`"${sdkmanager}" --sdk_root="${this.sdkDir}" "${pkg}"`, {
                    env,
                    stdio: this.verbose ? 'inherit' : 'pipe',
                    input: 'y\n',  // auto-accept prompts
                    timeout: 300000
                });
                console.log(`     ✅ ${pkg}`);
            } catch (e) {
                console.error(`     ❌ Failed to install ${pkg}: ${e.message}`);
            }
        });
    }

    // ─────────────────────────────────────────────────────────
    // GRADLE WRAPPER JAR
    // ─────────────────────────────────────────────────────────

    async _setupGradleWrapper() {
        console.log('');
        console.log('  ▶  Setting up Gradle wrapper...');

        // Store the gradle-wrapper.jar in the central dolphin cache
        fs.mkdirSync(path.dirname(CACHED_JAR_PATH), { recursive: true });

        if (!fs.existsSync(CACHED_JAR_PATH)) {
            await this._download(GRADLE_JAR_URL, CACHED_JAR_PATH);
        }
        console.log('     ✅ Gradle wrapper ready');
    }

    // ─────────────────────────────────────────────────────────
    // ENV FILE
    // ─────────────────────────────────────────────────────────

    _writeEnvFile() {
        const envFile  = path.join(os.homedir(), '.dolphin', 'env.sh');
        const envBat   = path.join(os.homedir(), '.dolphin', 'env.bat');

        fs.writeFileSync(envFile, [
            `export ANDROID_HOME="${this.sdkDir}"`,
            `export ANDROID_SDK_ROOT="${this.sdkDir}"`,
            `export PATH="$ANDROID_HOME/platform-tools:$PATH"`,
            `export PATH="$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"`,
            '',
        ].join('\n'));

        fs.writeFileSync(envBat, [
            `set ANDROID_HOME=${this.sdkDir}`,
            `set ANDROID_SDK_ROOT=${this.sdkDir}`,
            `set PATH=%ANDROID_HOME%\\platform-tools;%ANDROID_HOME%\\cmdline-tools\\latest\\bin;%PATH%`,
            '',
        ].join('\r\n'));
    }

    _printEnvInstructions() {
        const isWin = os.platform() === 'win32';
        console.log('');
        console.log('  ─────────────────────────────────────────');
        console.log('  Add to your shell profile:');
        if (isWin) {
            console.log(`    set ANDROID_HOME=${this.sdkDir}`);
            console.log(`    set PATH=%ANDROID_HOME%\\platform-tools;%PATH%`);
            console.log('');
            console.log('  Or source the env file:');
            console.log(`    ${path.join(os.homedir(), '.dolphin', 'env.bat')}`);
        } else {
            console.log(`    export ANDROID_HOME="${this.sdkDir}"`);
            console.log(`    export PATH="$ANDROID_HOME/platform-tools:$PATH"`);
            console.log('');
            console.log('  Or source the env file:');
            console.log(`    source ${path.join(os.homedir(), '.dolphin', 'env.sh')}`);
        }
        console.log('');
        console.log('  Then build your app:');
        console.log('    dolphin build --android');
        console.log('');
    }

    // ─────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────

    _isAlreadyInstalled() {
        const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
        return androidHome && fs.existsSync(path.join(androidHome, 'platform-tools'));
    }

    _getSdkManagerPath() {
        const isWin = os.platform() === 'win32';
        const ext   = isWin ? '.bat' : '';
        return path.join(this.sdkDir, 'cmdline-tools', 'latest', 'bin', `sdkmanager${ext}`);
    }

    _download(url, dest) {
        return new Promise((resolve, reject) => {
            const file   = fs.createWriteStream(dest);
            let received = 0;
            let total    = 0;

            const request = https.get(url, res => {
                if (res.statusCode === 301 || res.statusCode === 302) {
                    // Follow redirect
                    return this._download(res.headers.location, dest).then(resolve).catch(reject);
                }
                total = parseInt(res.headers['content-length'] || '0');

                res.on('data', chunk => {
                    received += chunk.length;
                    if (total > 0) {
                        const pct = Math.round((received / total) * 100);
                        process.stdout.write(`\r     ${pct}% (${(received/1024/1024).toFixed(1)} MB)`);
                    }
                });

                res.pipe(file);
                file.on('finish', () => {
                    process.stdout.write('\n');
                    file.close(resolve);
                });
            });

            request.on('error', err => {
                fs.unlink(dest, () => reject(err));
            });
            file.on('error', err => {
                fs.unlink(dest, () => reject(err));
            });
        });
    }
}

module.exports = { SDKSetup, DOLPHIN_SDK_DIR };
