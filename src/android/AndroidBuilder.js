'use strict';

/**
 * 🌊 Dolphin Android Builder
 * Generates a full Android project and builds APK — NO Android Studio needed.
 *
 * Requirements:
 *   - Java JDK 11+
 *   - Android SDK (run: dolphin android setup)
 *   - ANDROID_HOME env variable
 */

const fs    = require('fs');
const path  = require('path');
const https = require('https');
const { execSync, spawn } = require('child_process');
const os    = require('os');

const DOLPHIN_RUNTIME_DIR  = path.join(__dirname, '..', '..', 'runtime', 'android');
const GRADLE_WRAPPER_JAR_URL = 'https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar';
const DOLPHIN_HOME           = path.join(os.homedir(), '.dolphin');
const DOLPHIN_SDK_DIR        = path.join(DOLPHIN_HOME, 'android-sdk');
const CACHED_JAR_PATH        = path.join(DOLPHIN_HOME, 'gradle-wrapper', 'gradle-wrapper.jar');

class AndroidBuilder {
    constructor(options = {}) {
        this.appName     = options.appName     || 'DolphinApp';
        this.packageName = options.package     || 'io.dolphin.app';
        this.versionName = options.version     || '1.0.0';
        this.versionCode = options.versionCode || 1;
        this.minSdk      = options.minSdk      || 24;
        this.targetSdk   = options.targetSdk   || 34;
        this.compileSdk  = options.compileSdk  || 34;
        this.release     = options.release     || false;
        this.verbose     = options.verbose     || false;
        this.projectDir  = options.projectDir  || path.resolve(process.cwd(), '.dolphin-android');
        this.userPluginsDir = options.userPluginsDir || null;
        this.dolpBundle  = options.dolpBundle  || null;
        this.entryScreen = options.entryScreen || 'Home';
        this.icon        = (options.icon && fs.existsSync(options.icon)) ? options.icon : null;
        this.hasIcon     = Boolean(this.icon);
        this.splash      = (options.splash && fs.existsSync(options.splash)) ? options.splash : null;
        this.hasSplash   = Boolean(this.splash);
        this.devHost     = this._resolveDevHost(options.devHost);
        this.devPort     = options.devPort     || 9091;
        this.enableHotpatch = options.enableHotpatch !== false;
        this.shouldRun   = options.run         || false;
    }

    _getLocalIP() {
        const interfaces = os.networkInterfaces();
        for (const name of Object.keys(interfaces)) {
            for (const iface of interfaces[name]) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    return iface.address;
                }
            }
        }
        return null;
    }

    _resolveDevHost(host) {
        // `0.0.0.0` is valid for the server to listen on, but Android devices
        // cannot connect to it directly. Bake a reachable host into debug APKs.
        if (!host || host === '0.0.0.0') {
            return this._getLocalIP() || '10.0.2.2';
        }
        return host;
    }

    async build() {
        console.log('\n  🤖 DOLPHIN ANDROID BUILDER');
        console.log('  ══════════════════════════════════════════');

        this._checkPrereqs();

        this._step('Generating Android project...');
        this._generateProject();

        this._step('Setting up Gradle wrapper JAR...');
        await this._downloadGradleWrapperJar();

        this._step('Copying Dolphin Native Runtime (.kt files)...');
        this._copyRuntimeFiles();

        if (this.dolpBundle) {
            this._step('Embedding .dolp bundle...');
            this._embedBundle();
        }

        this._step(`Building APK (${this.release ? 'release' : 'debug'})...`);
        const apkPath = await this._runGradle();

        this._step('Copying APK to dist/...');
        const finalApk = this._copyApk(apkPath);

        if (this.shouldRun) {
            await this._installAndRun(finalApk);
        }

        console.log('\n  ══════════════════════════════════════════');
        console.log('  ✅ BUILD SUCCESS');
        console.log(`  📱 APK: ${finalApk}`);
        console.log(`  📦 Size: ${(fs.statSync(finalApk).size / 1024).toFixed(0)} KB`);
        console.log(`  🔌 Hotpatch: ${this.enableHotpatch ? 'ENABLED (dev-only)' : 'DISABLED (offline-first)'}`);
        console.log('\n  Install on device:');
        console.log(`    adb install -r ${finalApk}\n`);

        return finalApk;
    }

    _checkPrereqs() {
        this._step('Checking prerequisites...');
        
        let javaOutput = '';
        let javaFound = false;

        // Try default java command
        try {
            javaOutput = execSync('java -version 2>&1', { encoding: 'utf8' });
            javaFound = true;
        } catch {
            // Try common Microsoft JDK locations on this system
            const possiblePaths = [
                'C:\\Program Files\\Microsoft\\jdk-17.0.18.8-hotspot\\bin\\java.exe',
                'C:\\Program Files\\Microsoft\\jdk-11.0.30.7-hotspot\\bin\\java.exe'
            ];
            for (const p of possiblePaths) {
                if (fs.existsSync(p)) {
                    try {
                        javaOutput = execSync(`"${p}" -version 2>&1`, { encoding: 'utf8' });
                        process.env.JAVA_HOME = path.dirname(path.dirname(p));
                        process.env.PATH = path.dirname(p) + path.delimiter + process.env.PATH;
                        javaFound = true;
                        break;
                    } catch {}
                }
            }
        }

        if (javaFound) {
            this._log('   ✅ Java: ' + javaOutput.split('\n')[0]);
        } else {
            this._fatal(
                'Java JDK not found. Install JDK 11+:\n' +
                '    Windows: winget install Microsoft.OpenJDK.11\n' +
                '    Mac:     brew install openjdk@11\n' +
                '    Linux:   sudo apt install openjdk-11-jdk\n' +
                '    Download: https://adoptium.net'
            );
        }

        const candidatePaths = [
            process.env.ANDROID_HOME,
            process.env.ANDROID_SDK_ROOT,
            path.join(os.homedir(), '.dolphin', 'android-sdk'),
            path.join(os.homedir(), 'AppData', 'Local', 'Android', 'Sdk'),
            'C:\\Android\\sdk',
            'D:\\Android\\sdk',
            'D:\\android-sdk'
        ].filter(Boolean);

        const androidHome = candidatePaths.find(p => fs.existsSync(p));
        if (!androidHome) {
            this._fatal('Android SDK not found.\n    Run: dolphin android setup  ← installs everything automatically');
        }
        this._log(`   ✅ Android SDK: ${androidHome}`);
        this.androidHome = androidHome;
        process.env.ANDROID_HOME = androidHome; // Ensure exported
    }

    // ── KEY FIX: Download the real gradle-wrapper.jar ───────────────
    async _downloadGradleWrapperJar() {
        const jarDest = path.join(this.projectDir, 'gradle', 'wrapper', 'gradle-wrapper.jar');

        // Use local cache (~/.dolphin/gradle-wrapper-8.5.jar) if present
        if (fs.existsSync(CACHED_JAR_PATH)) {
            fs.copyFileSync(CACHED_JAR_PATH, jarDest);
            this._log('   ✅ gradle-wrapper.jar (from cache)');
            return;
        }

        this._log('   Downloading gradle-wrapper.jar from GitHub (~60KB)...');
        fs.mkdirSync(path.dirname(CACHED_JAR_PATH), { recursive: true });

        try {
            await this._download(GRADLE_WRAPPER_JAR_URL, CACHED_JAR_PATH);
            if (fs.existsSync(CACHED_JAR_PATH)) {
                fs.copyFileSync(CACHED_JAR_PATH, jarDest);
                this._log('   ✅ gradle-wrapper.jar downloaded and cached in ~/.dolphin/');
            }
        } catch (err) {
            this._log('   ⚠️  Download failed: ' + err.message);
            this._log('   Trying system gradle...');
            try {
                execSync('gradle wrapper --gradle-version=8.5', {
                    cwd: this.projectDir, stdio: 'pipe'
                });
                this._log('   ✅ Gradle wrapper generated via system gradle');
            } catch {
                this._fatal(
                    'Could not set up Gradle wrapper.\n' +
                    '    Option 1: Ensure internet connection (auto-download)\n' +
                    '    Option 2: Install Gradle: https://gradle.org/install/\n' +
                    '    Option 3: Run "gradle wrapper" in the project dir manually'
                );
            }
        }
    }

    _generateProject() {
        const proj   = this.projectDir;
        const pkg    = this.packageName;
        const pkgDir = pkg.replace(/\./g, '/');

        ['app/src/main/java/' + pkgDir, 'app/src/main/java/io/dolphin/runtime',
         'app/src/main/res/layout', 'app/src/main/res/values', 'app/src/main/res/drawable', 'app/src/main/res/mipmap-xxhdpi',
         'app/src/main/res/xml', 'app/src/main/assets', 'gradle/wrapper'
        ].forEach(d => fs.mkdirSync(path.join(proj, d), { recursive: true }));

        if (this.icon && fs.existsSync(this.icon)) {
            fs.copyFileSync(this.icon, path.join(proj, 'app/src/main/res/mipmap-xxhdpi/ic_launcher.png'));
            fs.copyFileSync(this.icon, path.join(proj, 'app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png'));
        }
        if (this.splash && fs.existsSync(this.splash)) {
            fs.copyFileSync(this.splash, path.join(proj, 'app/src/main/res/drawable/splash_logo.png'));
            this._write('app/src/main/res/drawable/splash_background.xml', `<?xml version="1.0" encoding="utf-8"?>
<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
    <item>
        <shape android:shape="rectangle">
            <solid android:color="#FFFFFF"/>
        </shape>
    </item>
    <item>
        <bitmap android:src="@drawable/splash_logo" android:gravity="center" />
    </item>
</layer-list>`);
        }

        this._write('settings.gradle', `rootProject.name = "${this.appName}"\ninclude ':app'\n`);

        this._write('build.gradle',
`buildscript {
    ext.kotlin_version = '1.9.22'
    repositories { google(); mavenCentral(); maven { url 'https://jitpack.io' } }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.2.2'
        classpath "org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlin_version"
    }
}
allprojects { repositories { google(); mavenCentral(); maven { url 'https://jitpack.io' } } }
task clean(type: Delete) { delete rootProject.buildDir }
`);

        let customDependencies = '';
        if (this.userPluginsDir && require('fs').existsSync(this.userPluginsDir)) {
            const pluginJsonPath = require('path').join(this.userPluginsDir, 'plugin.json');
            if (require('fs').existsSync(pluginJsonPath)) {
                try {
                    const pluginConfig = JSON.parse(require('fs').readFileSync(pluginJsonPath, 'utf8'));
                    if (pluginConfig.dependencies && Array.isArray(pluginConfig.dependencies)) {
                        customDependencies = pluginConfig.dependencies.map(d => `    implementation '${d}'`).join('\n');
                    }
                    if (pluginConfig.plugins && Array.isArray(pluginConfig.plugins)) {
                        this.customPluginClasses = pluginConfig.plugins;
                    }
                } catch (e) {
                    console.error('Error parsing plugin.json:', e.message);
                }
            }
        }

        const nativeDir = path.resolve(__dirname, '../../native').replace(/\\/g, '/');
        const ndkDir = 'C:/Users/USER/AppData/Local/Android/Sdk/ndk/25.1.8937393';
        const cmakeDir = 'C:/Users/USER/AppData/Local/Android/Sdk/cmake/3.22.1';
        this._write('local.properties', `sdk.dir=${this.androidHome.replace(/\\/g, '/')}\nndk.dir=${ndkDir}\ncmake.dir=${cmakeDir}\n`);

        this._write('app/build.gradle',
`def getLocalIPv4() {
    try {
        for (def intf : java.net.NetworkInterface.getNetworkInterfaces()) {
            if (intf.isUp() && !intf.isLoopback() && !intf.isVirtual()) {
                for (def addr : intf.getInetAddresses()) {
                    if (addr instanceof java.net.Inet4Address) {
                        def ip = addr.getHostAddress()
                        if (ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
                            return ip
                        }
                    }
                }
            }
        }
    } catch (Exception e) {}
    return "127.0.0.1"
}

plugins {
    id 'com.android.application'
    id 'kotlin-android'
}
android {
    namespace         '${pkg}'
    compileSdk        ${this.compileSdk}
    buildFeatures { buildConfig = true }
    defaultConfig {
        applicationId '${pkg}'
        minSdk        ${this.minSdk}
        targetSdk     ${this.targetSdk}
        versionCode   ${this.versionCode}
        versionName   '${this.versionName}'
        buildConfigField "boolean", "DOLPHIN_HOTPATCH_ENABLED", "${this.enableHotpatch ? 'true' : 'false'}"
        buildConfigField "String", "DOLPHIN_DEV_HOST", "\\"\${getLocalIPv4()}\\""
        buildConfigField "int", "DOLPHIN_DEV_PORT", "${this.devPort}"
        ndk {
            abiFilters 'arm64-v8a'
        }
        externalNativeBuild {
            cmake {
                cppFlags "-std=c++17 -O3 -fvisibility=hidden -fdata-sections -ffunction-sections"
            }
        }
    }
    externalNativeBuild {
        cmake {
            path file("${nativeDir}/CMakeLists.txt")
            version "3.22.1"
        }
    }
    buildTypes {
        release {
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.debug
        }
        debug   { debuggable true }
    }
    compileOptions { sourceCompatibility JavaVersion.VERSION_11; targetCompatibility JavaVersion.VERSION_11 }
    kotlinOptions  { jvmTarget = '11' }
    sourceSets { main { java.srcDirs = ['src/main/java']; assets.srcDirs = ['src/main/assets'] } }
}
dependencies {
    implementation "org.jetbrains.kotlin:kotlin-stdlib:$kotlin_version"
    implementation 'androidx.core:core-ktx:1.12.0'
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'com.google.android.material:material:1.11.0'
    implementation 'androidx.drawerlayout:drawerlayout:1.2.0'
    implementation 'androidx.constraintlayout:constraintlayout:2.1.4'
    implementation 'com.squareup.okhttp3:okhttp:4.12.0'
    implementation 'io.nayuki:qrcodegen:1.8.0'
${customDependencies}
}
`);

        this._write('gradle.properties',
`org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
`);

        this._write('gradle/wrapper/gradle-wrapper.properties',
`distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.5-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`);

        // Proper gradlew that invokes the JAR we download
        this._write('gradlew',
`#!/bin/sh
APP_HOME="$(cd "$(dirname "$0")" && pwd)"
JAVA_CMD=java
if [ -n "$JAVA_HOME" ]; then JAVA_CMD="$JAVA_HOME/bin/java"; fi
exec "$JAVA_CMD" "-Dorg.gradle.appname=gradlew" -classpath "$APP_HOME/gradle/wrapper/gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain "$@"
`);
        this._write('gradlew.bat',
`@rem Dolphin Gradle wrapper for Windows
@if "%DEBUG%"=="" @echo off
set JAVA_EXE=java.exe
if defined JAVA_HOME set JAVA_EXE=%JAVA_HOME%\\bin\\java.exe
set APP_HOME=%~dp0
"%JAVA_EXE%" "-Dorg.gradle.appname=gradlew" -classpath "%APP_HOME%gradle\\wrapper\\gradle-wrapper.jar" org.gradle.wrapper.GradleWrapperMain %*
`);
        try { fs.chmodSync(path.join(proj, 'gradlew'), 0o755); } catch {}

        this._write('app/src/main/AndroidManifest.xml',
`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"/>
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
    <uses-permission android:name="android.permission.READ_MEDIA_VIDEO"/>
    <uses-permission android:name="android.permission.CAMERA"/>
    <uses-permission android:name="android.permission.READ_CONTACTS"/>
    <uses-permission android:name="android.permission.RECORD_AUDIO"/>
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    <uses-permission android:name="android.permission.BLUETOOTH"/>
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>
    <uses-permission android:name="android.permission.NFC"/>
    <uses-permission android:name="android.permission.FLASHLIGHT"/>
    <uses-permission android:name="android.permission.VIBRATE"/>
    <uses-permission android:name="android.permission.WAKE_LOCK"/>
    <uses-feature android:name="android.hardware.camera" android:required="false"/>
    <uses-feature android:name="android.hardware.camera.flash" android:required="false"/>
    <uses-feature android:name="android.hardware.touchscreen" android:required="false"/>
    <uses-feature android:name="android.software.leanback" android:required="false"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_PHONE_CALL"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_DATA_SYNC"/>
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_SPECIAL_USE"/>
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.USE_FULL_SCREEN_INTENT"/>
    <uses-permission android:name="android.permission.MANAGE_OWN_CALLS"/>
    <uses-permission android:name="android.permission.READ_PHONE_STATE"/>
    <uses-permission android:name="android.permission.CALL_PHONE"/>
    <uses-permission android:name="android.permission.BIND_TELECOM_CONNECTION_SERVICE"/>
    
    <application android:label="${this.appName}" android:theme="@style/Theme.DolphinApp"
        ${this.hasIcon ? 'android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round"' : 'android:icon="@android:drawable/sym_def_app_icon"'}
        android:allowBackup="true" android:supportsRtl="true"
        android:hardwareAccelerated="true"
        android:usesCleartextTraffic="true"
        android:networkSecurityConfig="@xml/network_security_config">
        <activity android:name=".MainActivity" android:exported="true"
            android:theme="${this.hasSplash ? '@style/Theme.Splash' : '@style/Theme.DolphinApp'}"
            android:launchMode="singleInstance"
            android:hardwareAccelerated="true"
            android:showWhenLocked="true"
            android:turnScreenOn="true"
            android:windowSoftInputMode="adjustResize|stateUnspecified"
            android:configChanges="orientation|screenSize|screenLayout|smallestScreenSize|keyboardHidden|uiMode">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
                <category android:name="android.intent.category.LEANBACK_LAUNCHER"/>
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.DIAL"/>
                <category android:name="android.intent.category.DEFAULT"/>
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.DIAL"/>
                <category android:name="android.intent.category.DEFAULT"/>
                <data android:scheme="tel"/>
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW"/>
                <category android:name="android.intent.category.DEFAULT"/>
                <category android:name="android.intent.category.BROWSABLE"/>
                <data android:scheme="tel"/>
            </intent-filter>
        </activity>
        
        <service
            android:name="io.dolphin.runtime.DolphinBackgroundService"
            android:enabled="true"
            android:exported="false"
            android:foregroundServiceType="phoneCall|dataSync" />
            
        <service
            android:name="io.dolphin.runtime.DolphinConnectionService"
            android:permission="android.permission.BIND_TELECOM_CONNECTION_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.telecom.ConnectionService" />
            </intent-filter>
        </service>
    </application>
</manifest>
`);

        this._write(`app/src/main/java/${pkgDir}/MainActivity.kt`, `package ${pkg}

import android.os.Bundle
import android.util.Log
import android.view.WindowManager
import android.app.KeyguardManager
import android.os.Build
import android.widget.Toast
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraManager
import android.content.Context
import android.content.pm.PackageManager
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.drawerlayout.widget.DrawerLayout
import com.google.android.material.navigation.NavigationView
import com.google.android.material.bottomsheet.BottomSheetDialog
import com.google.android.material.bottomsheet.BottomSheetBehavior
import io.dolphin.runtime.DolphinRuntime
import io.dolphin.runtime.DolphinBackgroundService
import io.dolphin.runtime.DolphinStateEngine
import android.content.Intent
import ${pkg}.BuildConfig
import ${pkg}.R
import android.view.Gravity
import android.view.ViewGroup
import android.view.View

class MainActivity : AppCompatActivity() {
    private lateinit var runtime: DolphinRuntime
    private lateinit var drawerLayout: DrawerLayout
    private lateinit var contentContainer: android.widget.FrameLayout
    private lateinit var navigationView: android.widget.FrameLayout
    private var isTorchOn = false
    private var flashCameraId: String? = null
    private val screenHistory = mutableListOf<String>()
    private var currentScreen = "Home"
    private var bottomSheetDialog: com.google.android.material.bottomsheet.BottomSheetDialog? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.Theme_DolphinApp)
        super.onCreate(savedInstanceState)

        try {
            System.loadLibrary("danphe_vector")
            Log.d("MainActivity", "✅ Loaded native danphe_vector library")
        } catch (e: Throwable) {
            Log.e("MainActivity", "⚠️ Could not load danphe_vector: \${e.message}")
        }

        try {
            com.danphe.nativeio.TitanDeviceBridge.currentActivity = this
            com.danphe.nativeio.TitanDeviceBridge.initialize(this)
            io.dolphin.runtime.TitanSisoEngine.init(this)
            checkAndRequestPermissions()
            Log.d("MainActivity", "✅ TitanDeviceBridge initialized")
        } catch (e: Throwable) {
            Log.e("MainActivity", "⚠️ Could not init TitanDeviceBridge: \${e.message}")
        }
        
${(this.customPluginClasses || []).map(cls => `        try {
            val pluginClass = Class.forName("${cls}")
            val pluginInstance = pluginClass.getDeclaredConstructor().newInstance() as io.dolphin.runtime.DolphinUIPlugin
            io.dolphin.runtime.plugin.DolphinPluginRegistry.register(pluginInstance)
            Log.d("MainActivity", "Successfully registered custom plugin: ${cls}")
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to register custom plugin: ${cls}", e)
        }`).join('\n')}

        // Root Layout with Drawer
        drawerLayout = DrawerLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(android.graphics.Color.parseColor("#0b0f19"))
        }
        // Content container for screens
        contentContainer = android.widget.FrameLayout(this).apply {
            layoutParams = DrawerLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(android.graphics.Color.parseColor("#0b0f19"))
        }
        drawerLayout.addView(contentContainer)
        
        // NavigationView for Drawer
        navigationView = android.widget.FrameLayout(this).apply {
            layoutParams = DrawerLayout.LayoutParams(
                (300 * resources.displayMetrics.density).toInt(),
                ViewGroup.LayoutParams.MATCH_PARENT,
                Gravity.START
            )
            setBackgroundColor(android.graphics.Color.parseColor("#0b0f19"))
            isClickable = true
        }
        drawerLayout.addView(navigationView)
        setContentView(drawerLayout)

        // WAKE UP DEVICE ON CALL
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as KeyguardManager
            keyguardManager.requestDismissKeyguard(this, null)
        } else {
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        runtime = DolphinRuntime(this)
        // GUARANTEE CLEAN ZERO-ROUTE STARTUP
        io.dolphin.runtime.TitanSisoEngine.write(10, 0, origin = "SYS_INIT", force = true)
        io.dolphin.runtime.TitanSisoEngine.write(11, 0, origin = "SYS_INIT", force = true)

        // ⚡ TITAN-BUS REGISTER 10 (SYS_ROUTE) HARDWARE NAVIGATION SUBSCRIBER
        // 🛡️ FRAMEWORK PROTECTION: Only switches screens if there are multiple full-screen pages (excludes Drawers & Modals)
        io.dolphin.runtime.TitanSisoEngine.subscribe(10) { routeIdx ->
            runOnUiThread {
                try {
                    val fullScreens = runtime.getScreenNames().filter {
                        !it.contains("Drawer", ignoreCase = true) && !it.contains("Modal", ignoreCase = true) && !it.contains("Sheet", ignoreCase = true)
                    }
                    if (fullScreens.size > 1 && routeIdx >= 0 && routeIdx < fullScreens.size) {
                        val targetScreen = fullScreens[routeIdx]
                        if (currentScreen != targetScreen) {
                            Log.i("MainActivity", "⚡ [TitanBus Reg 10 Router] Switching to: $targetScreen (idx: $routeIdx)")
                            val newView = runtime.buildScreen(targetScreen)
                            currentScreen = targetScreen
                            contentContainer.removeAllViews()
                            contentContainer.addView(newView)
                            newView.requestLayout()
                            try { drawerLayout.closeDrawers() } catch (_: Exception) {}
                            try { bottomSheetDialog?.dismiss() } catch (_: Exception) {}
                        }
                    }
                } catch (e: Exception) {
                    Log.e("MainActivity", "Router switch error on Reg 10: " + e.message)
                }
            }
        }

        // Request essential runtime hardware permissions on startup
        val requiredPermissions = mutableListOf(
            android.Manifest.permission.CAMERA,
            android.Manifest.permission.RECORD_AUDIO,
            android.Manifest.permission.ACCESS_FINE_LOCATION,
            android.Manifest.permission.READ_CONTACTS,
            android.Manifest.permission.READ_EXTERNAL_STORAGE,
            android.Manifest.permission.WRITE_EXTERNAL_STORAGE
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requiredPermissions.add(android.Manifest.permission.POST_NOTIFICATIONS)
        }
        val permissionsToRequest = requiredPermissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (permissionsToRequest.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsToRequest.toTypedArray(), 1001)
        }

        // Auto-start DolphinBackgroundService on startup
        try {
            val serviceIntent = Intent(this, DolphinBackgroundService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                startForegroundService(serviceIntent)
            } else {
                startService(serviceIntent)
            }
        } catch (e: Exception) {
            Log.e("MainActivity", "Failed to start DolphinBackgroundService: \${e.message}")
        }


        runtime.onAction = { action, value ->
            Log.d("MainActivity", "Dynamic action received: \$action (value: \$value)")
            if (action.startsWith("bus:")) {
                val raw = action.removePrefix("bus:")
                val parts = if (raw.startsWith("write:")) raw.removePrefix("write:").split(":") else null
                val targetReg = if (parts != null && parts.isNotEmpty()) {
                    if (parts[0].startsWith("0x", ignoreCase = true)) parts[0].substring(2).toIntOrNull(16) else parts[0].toIntOrNull()
                } else {
                    if (raw.startsWith("0x", ignoreCase = true)) raw.substring(2).toIntOrNull(16) else raw.toIntOrNull()
                }
                val explicitVal = if (parts != null && parts.size >= 2) parts[1].toIntOrNull() else null
                val finalVal = explicitVal ?: when (value) {
                    is Number -> value.toInt()
                    is Boolean -> if (value) 1 else 0
                    is String -> value.toIntOrNull() ?: if (value.equals("true", ignoreCase = true)) 1 else 0
                    else -> 0
                }
                if (targetReg != null) {
                    io.dolphin.runtime.TitanSisoEngine.write(targetReg, finalVal, force = true)
                }
            }
            if (action == "drawer:open") {
                runOnUiThread {
                    drawerLayout.openDrawer(Gravity.START)
                }
            } else if (action == "drawer:close") {
                runOnUiThread {
                    drawerLayout.closeDrawers()
                }
            } else if (action.startsWith("open_drawer:")) {
                val drawerName = action.removePrefix("open_drawer:")
                runOnUiThread {
                    if (runtime.getScreenNames().contains(drawerName)) {
                        val drawerView = runtime.buildScreen(drawerName)
                        navigationView.removeAllViews()
                        navigationView.addView(drawerView)
                    }
                    drawerLayout.openDrawer(Gravity.START)
                }
            } else if (action.startsWith("nav:")) {
                val screenName = action.removePrefix("nav:")
                runOnUiThread {
                    try {
                        val targetScreen = if (screenName == "back") {
                            if (screenHistory.isNotEmpty()) {
                                screenHistory.removeAt(screenHistory.size - 1)
                            } else {
                                "${this.entryScreen}"
                            }
                        } else {
                            if (currentScreen.isNotEmpty()) screenHistory.add(currentScreen)
                            val resolvedName = runtime.resolveScreenName(screenName) ?: screenName
                            resolvedName
                        }

                        if (runtime.getScreenNames().contains(targetScreen)) {
                            val newView = runtime.buildScreen(targetScreen)
                            currentScreen = targetScreen
                            newView.layoutParams = android.widget.FrameLayout.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            contentContainer.removeAllViews()
                            contentContainer.addView(newView)
                            newView.requestLayout()
                        } else {
                            Log.w("MainActivity", "Screen '$targetScreen' not found in bundle, preserving current display")
                        }
                        try { drawerLayout.closeDrawers() } catch (e: Exception) {}
                        try { bottomSheetDialog?.dismiss() } catch (e: Exception) {}
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Failed to navigate: \${e.message}")
                        Toast.makeText(this@MainActivity, "Screen not found: \$screenName", Toast.LENGTH_SHORT).show()
                    }
                }
            } else if (action.startsWith("bottom_drawer:open") || action.startsWith("bottom_sheet:open") ||
                       action.startsWith("sheet:open") || action == "bottom_drawer:toggle" || action == "bottom_drawer:show") {
                runOnUiThread {
                    try {
                        val parts = action.split(":")
                        val rawScreen = if (parts.size >= 3) parts[2] else ""
                        val extNumber = if (parts.size >= 4) parts[3] else ""
                        if (extNumber.isNotEmpty()) {
                            DolphinStateEngine.updateState("dial_input", extNumber)
                        } else if (rawScreen.isNotEmpty() && rawScreen.all { it.isDigit() }) {
                            DolphinStateEngine.updateState("dial_input", rawScreen)
                        }
                        val targetScreen = when {
                            rawScreen.isNotEmpty() && !rawScreen.all { it.isDigit() } && rawScreen != "open" && rawScreen != "show" && rawScreen != "toggle" -> {
                                runtime.resolveScreenName(rawScreen) ?: rawScreen
                            }
                            else -> {
                                runtime.resolveScreenName("KeypadDrawer")
                                    ?: runtime.resolveScreenName("BottomDrawer")
                                    ?: runtime.resolveScreenName("Keypad")
                                    ?: runtime.resolveScreenName("Drawer")
                                    ?: "KeypadDrawer"
                            }
                        }
                        if (runtime.getScreenNames().contains(targetScreen)) {
                            bottomSheetDialog?.dismiss()
                            val dialog = com.google.android.material.bottomsheet.BottomSheetDialog(this@MainActivity)
                            val sheetView = runtime.buildScreen(targetScreen)
                            sheetView.setBackgroundColor(android.graphics.Color.parseColor("#0b0f19"))
                            
                            val wrap = android.widget.FrameLayout(this@MainActivity).apply {
                                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)
                                setBackgroundColor(android.graphics.Color.parseColor("#0b0f19"))
                                addView(sheetView)
                            }
                            dialog.setContentView(wrap)

                            dialog.setOnShowListener {
                                val bottomSheet = dialog.findViewById<android.view.View>(com.google.android.material.R.id.design_bottom_sheet)
                                if (bottomSheet != null) {
                                    bottomSheet.setBackgroundColor(android.graphics.Color.parseColor("#0b0f19"))
                                    val behavior = com.google.android.material.bottomsheet.BottomSheetBehavior.from(bottomSheet)
                                    val heightPixels = resources.displayMetrics.heightPixels
                                    val halfScreenHeight = (heightPixels * 0.58).toInt()
                                    behavior.peekHeight = halfScreenHeight
                                    behavior.state = com.google.android.material.bottomsheet.BottomSheetBehavior.STATE_COLLAPSED
                                }
                            }
                            dialog.show()
                            bottomSheetDialog = dialog
                        } else {
                            Log.w("MainActivity", "BottomDrawer target screen not found: \$targetScreen")
                        }
                    } catch (e: Exception) {
                        Log.e("MainActivity", "Error opening bottom drawer: \${e.message}")
                    }
                }
            } else if (action == "bottom_drawer:close" || action == "bottom_sheet:close" || action == "sheet:close") {
                runOnUiThread {
                    try { bottomSheetDialog?.dismiss() } catch (e: Exception) {}
                }
            } else {
                runOnUiThread {
                    DolphinStateEngine.handleAction(action)
                }
                when(action) {
                    "TOGGLE_FLASH", "hw:torch", "torch", "toggle_flash" -> {
                        com.danphe.nativeio.TitanDeviceBridge.toggleTorch()
                    }
                    "OPEN_CAMERA" -> checkAndRequestPermissions()
                    "OPEN_GALLERY", "PICK_IMAGE", "hw:storage:pick", "pick_media", "upload_media", "pick_files", "send_files" -> {
                        launchMediaPickerDirectly(1)
                    }
                    "flip_camera", "flip", "hw:camera:flip" -> {
                        io.dolphin.runtime.DolphinCamera.flipCamera(this@MainActivity)
                    }
                    "rotate_camera", "rotate", "hw:camera:rotate" -> {
                        io.dolphin.runtime.DolphinCamera.rotateCamera(this@MainActivity)
                    }
                    "OPEN_CAMERA_APP" -> {
                        try {
                            val intent = android.content.Intent(android.provider.MediaStore.ACTION_IMAGE_CAPTURE)
                            startActivity(intent)
                        } catch (e: Exception) {
                            Toast.makeText(this@MainActivity, "Camera App not found", Toast.LENGTH_SHORT).show()
                        }
                    }
                    "simulateAudioCall" -> {
                        val intent = Intent(this@MainActivity, DolphinBackgroundService::class.java).apply {
                            putExtra("action", "SIMULATE_EVENT")
                            putExtra("type", "CALL")
                            putExtra("from", "+977 9800000000")
                        }
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            startForegroundService(intent)
                        } else {
                            startService(intent)
                        }
                        Toast.makeText(this@MainActivity, "Simulating Audio Call...", Toast.LENGTH_SHORT).show()
                    }
                    "simulateVideoCall" -> {
                        val intent = Intent(this@MainActivity, DolphinBackgroundService::class.java).apply {
                            putExtra("action", "SIMULATE_EVENT")
                            putExtra("type", "VIDEO_CALL")
                            putExtra("from", "Dolphin Video")
                        }
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            startForegroundService(intent)
                        } else {
                            startService(intent)
                        }
                        Toast.makeText(this@MainActivity, "Simulating Video Call...", Toast.LENGTH_SHORT).show()
                    }
                    "simulateSms" -> {
                        val intent = Intent(this@MainActivity, DolphinBackgroundService::class.java).apply {
                            putExtra("action", "SIMULATE_EVENT")
                            putExtra("type", "SMS")
                            putExtra("from", "Dolphin Team")
                            putExtra("message", "Hi from Dolphin Native! 🌊")
                        }
                        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                            startForegroundService(intent)
                        } else {
                            startService(intent)
                        }
                        Toast.makeText(this@MainActivity, "Simulating SMS...", Toast.LENGTH_SHORT).show()
                    }
                }
            }
        }

        // AUTO-REQUEST ON START
        checkAndRequestPermissions()

        fun loadAndRenderBootBundle() {
            var loadedSuccessfully = false
            val cacheFile = java.io.File(filesDir, "hotpatch_cache.dolp")
            
            // Delete stale dev cache on cold boot so fresh embedded app.dolp is always used
            if (cacheFile.exists()) {
                try {
                    Log.i("MainActivity", "🧹 Purging stale hotpatch cache on cold boot")
                    cacheFile.delete()
                } catch (_: Exception) {}
            }

            try {
                Log.i("MainActivity", "📦 Loading fresh bundle from assets/app.dolp")
                runtime.loadFromBytes(assets.open("app.dolp").readBytes())
                val entryView = runtime.buildEntryScreen()
                entryView.layoutParams = android.widget.FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
                contentContainer.removeAllViews()
                contentContainer.addView(entryView)
                contentContainer.post {
                    entryView.requestLayout()
                }
                loadedSuccessfully = true
                Log.i("MainActivity", "✅ Cold boot succeeded from assets/app.dolp")
            } catch (assetErr: Exception) {
                Log.e("MainActivity", "❌ Failed cold boot from assets/app.dolp: \${assetErr.message}", assetErr)
            }

            if (loadedSuccessfully && runtime.getScreenNames().contains("MainDrawer")) {
                try {
                    val drawerView = runtime.buildScreen("MainDrawer")
                    navigationView.removeAllViews()
                    navigationView.addView(drawerView)
                } catch (_: Exception) {}
            }

            if (!loadedSuccessfully) {
                Log.e("MainActivity", "🚨 Emergency UI active — could not load any bundle")
                contentContainer.removeAllViews()
                val emergencyTv = android.widget.TextView(this).apply {
                    text = "🐬 Dolphin Engine\\n\\nTap to reload app"
                    textSize = 18f
                    gravity = android.view.Gravity.CENTER
                    setTextColor(android.graphics.Color.WHITE)
                    setBackgroundColor(android.graphics.Color.parseColor("#0f172a"))
                    setOnClickListener { loadAndRenderBootBundle() }
                }
                contentContainer.addView(emergencyTv, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
            }
        }

        val action = intent?.getStringExtra("action")
        if (action == "incoming_call" || action == "open_chat") {
            handleIntent(intent)
        } else {
            loadAndRenderBootBundle()
        }
        if (BuildConfig.DOLPHIN_HOTPATCH_ENABLED) {
            runtime.connectDevServer(BuildConfig.DOLPHIN_DEV_HOST, BuildConfig.DOLPHIN_DEV_PORT) { patchType, screenName ->
                runOnUiThread {
                    try {
                        if (patchType == "NAVIGATE_TO") {
                            val target = screenName ?: "${this.entryScreen}"
                            currentScreen = target
                            val newView = runtime.buildScreen(target)
                            newView.layoutParams = android.widget.FrameLayout.LayoutParams(
                                ViewGroup.LayoutParams.MATCH_PARENT,
                                ViewGroup.LayoutParams.MATCH_PARENT
                            )
                            val oldView = if (contentContainer.childCount > 0) contentContainer.getChildAt(0) else null
                            contentContainer.addView(newView)
                            if (oldView != null) {
                                val w = contentContainer.width.toFloat()
                                if (w > 0) {
                                    newView.translationX = w
                                    newView.animate().translationX(0f).setDuration(250).start()
                                    oldView.animate().translationX(-w).setDuration(250).withEndAction {
                                        contentContainer.removeView(oldView)
                                    }.start()
                                } else {
                                    contentContainer.removeView(oldView)
                                }
                            }
                            drawerLayout.closeDrawers()
                        } else if (patchType == "OPEN_DRAWER") {
                            val drawerName = screenName ?: "MainDrawer"
                            if (runtime.getScreenNames().contains(drawerName)) {
                                val drawerView = runtime.buildScreen(drawerName)
                                navigationView.removeAllViews()
                                navigationView.addView(drawerView)
                            }
                            drawerLayout.openDrawer(Gravity.START)
                        } else if (screenName == "MainDrawer") {
                            if (runtime.getScreenNames().contains("MainDrawer")) {
                                val drawerView = runtime.buildScreen("MainDrawer")
                                navigationView.removeAllViews()
                                navigationView.addView(drawerView)
                            }
                        } else if (patchType == "FULL_RELOAD") {
                            // ✅ DolphinRuntime handles FULL_RELOAD internally (bundle parse + buildScreen + contentContainer update)
                            // MainActivity only needs to update the drawer if present
                            if (runtime.getScreenNames().contains("MainDrawer")) {
                                val drawerView = runtime.buildScreen("MainDrawer")
                                navigationView.removeAllViews()
                                navigationView.addView(drawerView)
                            }
                        } else {
                            val target = screenName ?: currentScreen
                            if (target == currentScreen) {
                                val newView = runtime.buildScreen(target)
                                newView.layoutParams = android.widget.FrameLayout.LayoutParams(
                                    ViewGroup.LayoutParams.MATCH_PARENT,
                                    ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                contentContainer.removeAllViews()
                                contentContainer.addView(newView)
                                newView.requestLayout()
                            }
                        }
                    }
                    catch (e: Exception) { Toast.makeText(this, "Patch: \${e.message}", Toast.LENGTH_SHORT).show() }
                }
            }
        } else {
            Log.i("MainActivity", "Hotpatch disabled for this build. Running from embedded app.dolp only.")
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleIntent(intent)
    }

    private fun handleIntent(intent: Intent?) {
        val action = intent?.getStringExtra("action")
        if (action == "incoming_call") {
            runOnUiThread {
                try {
                    val newView = runtime.buildScreen("VideoCallScreen")
                    newView.layoutParams = android.widget.FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    val oldView = if (contentContainer.childCount > 0) contentContainer.getChildAt(0) else null
                    contentContainer.addView(newView)
                    oldView?.let { contentContainer.removeView(it) }
                } catch (e: Exception) {
                    Log.e("MainActivity", "Failed to navigate to VideoCallScreen: \${e.message}")
                }
            }
        } else if (action == "open_chat") {
            runtime.sendAction("app:go_to_chats", "")
        }
    }

    private fun toggleFlash(shouldOn: Boolean) {
        val cameraManager = getSystemService(Context.CAMERA_SERVICE) as CameraManager
        try {
            if (flashCameraId == null) {
                for (id in cameraManager.cameraIdList) {
                    val hasFlash = cameraManager.getCameraCharacteristics(id).get(CameraCharacteristics.FLASH_INFO_AVAILABLE) ?: false
                    if (hasFlash) {
                        flashCameraId = id
                        break
                    }
                }
            }

            val finalId = flashCameraId ?: cameraManager.cameraIdList[0]
            cameraManager.setTorchMode(finalId, shouldOn)
            isTorchOn = shouldOn
        } catch (e: Exception) {
            Toast.makeText(this, "Flash error: \${e.message}", Toast.LENGTH_SHORT).show()
        }
    }

    private fun checkAndRequestPermissions() {
        val permissions = mutableListOf(
            android.Manifest.permission.CAMERA,
            android.Manifest.permission.RECORD_AUDIO
        ).apply {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.TIRAMISU) {
                add("android.permission.READ_MEDIA_IMAGES")
                add("android.permission.READ_MEDIA_VIDEO")
            } else {
                add(android.Manifest.permission.READ_EXTERNAL_STORAGE)
            }
        }.toTypedArray()
        val needed = permissions.filter {
            ContextCompat.checkSelfPermission(this, it) != PackageManager.PERMISSION_GRANTED
        }
        if (needed.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, needed.toTypedArray(), 101)
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == 101) {
            if (grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                Toast.makeText(this, "Hardware access granted", Toast.LENGTH_SHORT).show()
            } else {
                Toast.makeText(this, "Hardware access denied", Toast.LENGTH_SHORT).show()
            }
        }
    }

    override fun onBackPressed() {
        if (drawerLayout.isDrawerOpen(Gravity.START)) {
            drawerLayout.closeDrawer(Gravity.START)
        } else if (screenHistory.isNotEmpty()) {
            val prevScreen = screenHistory.removeAt(screenHistory.size - 1)
            runOnUiThread {
                try {
                    currentScreen = prevScreen
                    val newView = runtime.buildScreen(prevScreen)
                    newView.layoutParams = android.widget.FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    val oldView = if (contentContainer.childCount > 0) contentContainer.getChildAt(0) else null
                    contentContainer.addView(newView)
                    if (oldView != null) {
                        val w = contentContainer.width.toFloat()
                        if (w > 0) {
                            newView.translationX = -w
                            newView.animate().translationX(0f).setDuration(250).start()
                            oldView.animate().translationX(w).setDuration(250).withEndAction {
                                contentContainer.removeView(oldView)
                            }.start()
                        } else {
                            contentContainer.removeView(oldView)
                        }
                    }
                } catch (e: Exception) {
                    Log.e("MainActivity", "Failed to navigate back: \${e.message}")
                }
            }
        } else {
            super.onBackPressed()
        }
    }

    private var activePickerMode: Int = 0x3063
    fun launchMediaPickerDirectly(mode: Int = 0x3063) {
        activePickerMode = mode
        try {
            // 🌟 Modern Android Photo Picker (ChatGPT/Gemini Style bottom sheet)
            val intent = android.content.Intent("android.provider.action.PICK_IMAGES").apply {
                when (mode) {
                    0x3061 -> type = "image/*"
                    0x3062 -> type = "video/*"
                    else -> {} // Multi-mix
                }
                putExtra("android.provider.extra.PICK_IMAGES_MAX", 25)
            }
            startActivityForResult(intent, 9001)
            Log.i("MainActivity", "📸 Modern ChatGPT/Gemini Photo Picker launched (mode=$mode)")
        } catch (e: Throwable) {
            try {
                val fallback = android.content.Intent(android.content.Intent.ACTION_PICK).apply {
                    when (mode) {
                        0x3061 -> setDataAndType(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI, "image/*")
                        0x3062 -> setDataAndType(android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI, "video/*")
                        else -> {
                            type = "*/*"
                            putExtra(android.content.Intent.EXTRA_MIME_TYPES, arrayOf("image/*", "video/*"))
                            putExtra(android.content.Intent.EXTRA_ALLOW_MULTIPLE, true)
                        }
                    }
                }
                startActivityForResult(fallback, 9001)
            } catch (err: Throwable) {
                val generic = android.content.Intent(android.content.Intent.ACTION_GET_CONTENT).apply {
                    type = if (mode == 0x3061) "image/*" else if (mode == 0x3062) "video/*" else "*/*"
                    putExtra(android.content.Intent.EXTRA_ALLOW_MULTIPLE, true)
                }
                startActivityForResult(generic, 9001)
            }
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: android.content.Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        // Handled natively
        if ((requestCode == 301 || requestCode == 9001) && resultCode == android.app.Activity.RESULT_OK) {
            val clipData = data?.clipData
            val uriList = mutableListOf<android.net.Uri>()
            if (clipData != null) {
                for (i in 0 until clipData.itemCount) {
                    uriList.add(clipData.getItemAt(i).uri)
                }
            } else {
                data?.data?.let { uriList.add(it) }
            }

            val firstUri = uriList.firstOrNull()
            if (firstUri != null) {
                val rawName = getFileName(this, firstUri) ?: "picked_video_\${System.currentTimeMillis()}.mp4"
                val fileName = rawName.lowercase()
                val mimeType = (contentResolver.getType(firstUri) ?: "").lowercase()
                val targetUriStr = firstUri.toString()
                Log.i("MainActivity", "📂 Picked file: rawName=\$rawName, mimeType=\$mimeType, targetUri=\$targetUriStr")

                val count = uriList.size
                val displayTxt = if (count > 1) "\$rawName (\$count Files)" else rawName
                io.dolphin.runtime.DolphinStateEngine.updateState("selectedFilesSize", displayTxt)
                io.dolphin.runtime.DolphinStateEngine.updateState("lastTransferStatus", "Picked: \$displayTxt")

                val isImage = mimeType.startsWith("image/") || fileName.endsWith(".jpg") || fileName.endsWith(".jpeg") || fileName.endsWith(".png") || fileName.endsWith(".webp") || fileName.endsWith(".svg")
                val isVideo = (mimeType.startsWith("video/") || fileName.endsWith(".mp4") || fileName.endsWith(".mkv") || fileName.endsWith(".webm") || fileName.endsWith(".3gp") || fileName.endsWith(".avi") || targetUriStr.contains("video")) && !isImage
                val isAudio = (mimeType.startsWith("audio/") || fileName.endsWith(".mp3") || fileName.endsWith(".wav") || fileName.endsWith(".aac") || fileName.endsWith(".m4a") || fileName.endsWith(".flac") || targetUriStr.contains("audio")) && !isImage

                if (isImage) {
                    io.dolphin.runtime.DolphinStateEngine.updateState("sys_picked_image_url", targetUriStr)
                    io.dolphin.runtime.DolphinStateEngine.updateState("sys_picked_image_name", rawName)
                    io.dolphin.runtime.DolphinStateEngine.updateState("gallery_media_url", targetUriStr)
                    io.dolphin.runtime.DolphinStateEngine.updateState("gallery_media_type", "image")
                    Toast.makeText(this, "🖼️ Image Loaded: $displayTxt", Toast.LENGTH_SHORT).show()
                } else if (isVideo) {
                    io.dolphin.runtime.DolphinStateEngine.updateState("sys_picked_video_url", targetUriStr)
                    io.dolphin.runtime.DolphinStateEngine.updateState("gallery_media_url", targetUriStr)
                    io.dolphin.runtime.DolphinStateEngine.updateState("gallery_media_type", "video")
                    Toast.makeText(this, "🎬 Video Loaded: \$displayTxt", Toast.LENGTH_SHORT).show()
                } else if (isAudio) {
                    io.dolphin.runtime.DolphinStateEngine.updateState("sys_picked_audio_name", rawName)
                    io.dolphin.runtime.DolphinStateEngine.updateState("sys_picked_audio_url", targetUriStr)
                    io.dolphin.runtime.DolphinAudio.playSound(this, targetUriStr)
                    Toast.makeText(this, "🎵 Audio Loaded: \$displayTxt", Toast.LENGTH_SHORT).show()
                }

                // Asynchronous background copy to disk & direct DevServer upload
                Thread {
                    try {
                        val diskDir = if (activePickerMode == 0x3070) java.io.File(filesDir, "titan_disk/public") else java.io.File(filesDir, "titan_disk")
                if (!diskDir.exists()) diskDir.mkdirs()
                // Sync bundled assets to diskDir if not present
                val assetDirs = listOf("assets/videos", "assets/images", "videos", "images")
                for (ad in assetDirs) {
                    try {
                        val names = assets.list(ad) ?: continue
                        for (name in names) {
                            val local = java.io.File(diskDir, name)
                            if (!local.exists()) {
                                assets.open("$ad/$name").use { inp ->
                                    local.outputStream().use { out -> inp.copyTo(out) }
                                }
                            }
                        }
                    } catch (_: Throwable) {}
                }

                        for (uri in uriList) {
                            val curName = getFileName(this, uri) ?: "file_\${System.currentTimeMillis()}"
                            val safeName = curName.replace("[^a-zA-Z0-9._-]".toRegex(), "_")
                            val localFile = java.io.File(diskDir, safeName)

                            contentResolver.openInputStream(uri)?.use { input ->
                                java.io.FileOutputStream(localFile).use { output ->
                                    input.copyTo(output)
                                }
                            }
                            Log.i("MainActivity", "💾 Cached locally: \${localFile.absolutePath} (\${localFile.length()} bytes)")

                            // ⚡ INSTANT ZERO-COPY LOCAL PLAYBACK (Never wait for network, zero OOM crash)
                            val localUri = localFile.absolutePath
                            runOnUiThread {
                                if (isImage) {
                                    io.dolphin.runtime.DolphinStateEngine.updateState("sys_picked_image_url", localUri)
                                    io.dolphin.runtime.DolphinStateEngine.updateState("gallery_media_url", localUri)
                                    io.dolphin.runtime.DolphinStateEngine.updateState("gallery_media_type", "image")
                                } else if (isVideo) {
                                    io.dolphin.runtime.DolphinStateEngine.updateState("sys_picked_video_url", localUri)
                                    io.dolphin.runtime.DolphinStateEngine.updateState("gallery_media_url", localUri)
                                    io.dolphin.runtime.DolphinStateEngine.updateState("gallery_media_type", "video")
                                    io.dolphin.runtime.TitanSisoEngine.write(0x3068, 1, origin = "DEVICE_BRIDGE", force = true) // Play video!
                                    // 🎬 Auto-route to Video Cinema Player (Page 0)
                                    io.dolphin.runtime.TitanSisoEngine.write(10, 0, origin = "DEVICE_BRIDGE", force = true)
                                    io.dolphin.runtime.TitanSisoEngine.emitSiso(10, 0)
                                }
                                io.dolphin.runtime.TitanSisoEngine.write(0x306A, 2, origin = "DEVICE_BRIDGE")
                                Toast.makeText(this@MainActivity, "🎬 Loaded to Titan-Disk: \$safeName", Toast.LENGTH_SHORT).show()
                            }

                            // Optional background stream upload to PC DevServer (Chunked buffer, NEVER readBytes)
                            try {
                                val host = BuildConfig.DOLPHIN_DEV_HOST
                                if (host.isNotEmpty() && host != "127.0.0.1") {
                                    val encName = java.net.URLEncoder.encode(safeName, "UTF-8")
                                    val uploadUrl = java.net.URL("http://\$host:9090/upload?name=\$encName")
                                    val conn = (uploadUrl.openConnection() as java.net.HttpURLConnection).apply {
                                        requestMethod = "POST"
                                        doOutput = true
                                        connectTimeout = 3000
                                        readTimeout = 5000
                                        setRequestProperty("Content-Type", mimeType.ifEmpty { "application/octet-stream" })
                                        setFixedLengthStreamingMode(localFile.length())
                                    }
                                    localFile.inputStream().use { input ->
                                        conn.outputStream.use { output ->
                                            input.copyTo(output, bufferSize = 65536)
                                        }
                                    }
                                    val code = conn.responseCode
                                    Log.i("MainActivity", "🚀 Background PC sync: \$code for \$safeName")
                                    conn.disconnect()
                                }
                            } catch (uploadErr: Exception) {
                                Log.d("MainActivity", "DevServer background upload skipped: \${uploadErr.message}")
                            }
                        }
                    } catch (e: Exception) {
                        Log.w("MainActivity", "Background disk save error: \${e.message}")
                    }
                }.start()
            }
        }
    }

    private fun getFileName(ctx: Context, uri: android.net.Uri): String? {
        return try {
            val cursor = ctx.contentResolver.query(uri, null, null, null, null)
            cursor?.use {
                if (it.moveToFirst()) {
                    val idx = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                    if (idx >= 0) it.getString(idx) else null
                } else null
            }
        } catch (e: Exception) { null }
    }

    override fun onPause() {
        super.onPause()
        Log.i("MainActivity", "⏸️ App going to background: Releasing hardware sensors & GPS listeners to conserve battery")
        try {
                        io.dolphin.runtime.DolphinLocation.stopWatching()
            io.dolphin.runtime.DolphinAudio.stopSound()
                    } catch (e: Exception) {
            Log.e("MainActivity", "Error in onPause cleanup: \${e.message}")
        }
    }

    override fun onResume() {
        super.onResume()
        com.danphe.nativeio.TitanDeviceBridge.currentActivity = this
        Log.i("MainActivity", "▶️ App resumed & currentActivity registered")
    }

    override fun onDestroy() { 
        super.onDestroy()
        try {
                        io.dolphin.runtime.DolphinLocation.stopWatching()
            io.dolphin.runtime.DolphinAudio.stopSound()
                        runtime.disconnectDevServer() 
        } catch (e: Exception) {}
    }
}
`);

        this._write('app/src/main/res/values/themes.xml',
`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.DolphinApp" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="colorPrimary">#1E88E5</item>
        <item name="colorPrimaryVariant">#1565C0</item>
        <item name="colorOnPrimary">#FFFFFF</item>
        <item name="colorSecondary">#00ACC1</item>
        <item name="android:windowBackground">#FFFFFF</item>
    </style>
${this.hasSplash ? `    <style name="Theme.Splash" parent="Theme.MaterialComponents.DayNight.NoActionBar">
        <item name="android:windowBackground">@drawable/splash_background</item>
        <item name="android:statusBarColor">#FFFFFF</item>
    </style>` : ''}
</resources>
`);
        this._write('app/src/main/res/values/strings.xml',
`<?xml version="1.0" encoding="utf-8"?>
<resources><string name="app_name">${this.appName}</string></resources>
`);
        this._write('app/src/main/res/xml/network_security_config.xml',
`<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`);
        this._write('app/proguard-rules.pro', '-keep class io.dolphin.runtime.** { *; }\n-keep class io.danphe.** { *; }\n-keep class io.titan.** { *; }\n-keep class io.nayuki.qrcodegen.** { *; }\n-keepattributes *Annotation*\n-dontwarn okhttp3.**\n-dontwarn okio.**\n');
        this._log('   ✅ Android project generated');
    }

    _copyRuntimeFiles() {
        const destJavaDir = path.join(this.projectDir, 'app/src/main/java');
        const runtimeSrcDir = path.join(DOLPHIN_RUNTIME_DIR, 'app/src/main/java');
        const buildDir = path.join(this.projectDir, 'app/build');
        const tmpKotlin = path.join(buildDir, 'tmp/kotlin-classes');
        const buildIntermediates = path.join(buildDir, 'intermediates');
        if (fs.existsSync(tmpKotlin)) {
            try { fs.rmSync(tmpKotlin, { recursive: true, force: true }); } catch (e) {}
        }
        if (fs.existsSync(buildIntermediates)) {
            try { fs.rmSync(buildIntermediates, { recursive: true, force: true }); } catch (e) {}
        }

        // Clean destDir to avoid duplicate class files
        const destRuntimeDir = path.join(destJavaDir, 'io/dolphin/runtime');
        if (fs.existsSync(destRuntimeDir)) {
            try { fs.rmSync(destRuntimeDir, { recursive: true, force: true }); } catch (e) {}
        }
        fs.mkdirSync(destRuntimeDir, { recursive: true });

        const copyDirRecursive = (src, baseSrc) => {
            fs.readdirSync(src).forEach(item => {
                if (item.startsWith('.')) return;
                const srcPath = path.join(src, item);
                if (fs.statSync(srcPath).isDirectory()) {
                    copyDirRecursive(srcPath, baseSrc);
                } else if (item.endsWith('.kt')) {
                    const rel = path.relative(baseSrc, srcPath);
                    // Skip copying sample MainActivity if app has its own generated MainActivity
                    if (item === 'MainActivity.kt' && this.packageName !== 'io.danphe.hmi') {
                        return;
                    }
                    const dstFile = path.join(destJavaDir, rel);
                    fs.mkdirSync(path.dirname(dstFile), { recursive: true });
                    fs.copyFileSync(srcPath, dstFile);
                    this._log(`   ✅ ${rel}`);
                }
            });
        };
        copyDirRecursive(runtimeSrcDir, runtimeSrcDir);

        // Copy user external plugins
        if (this.userPluginsDir && fs.existsSync(this.userPluginsDir)) {
            const pluginDst = path.join(destRuntimeDir, 'plugin');
            if (!fs.existsSync(pluginDst)) fs.mkdirSync(pluginDst, { recursive: true });
            fs.readdirSync(this.userPluginsDir).forEach(f => {
                if (f.endsWith('.kt')) {
                    fs.copyFileSync(path.join(this.userPluginsDir, f), path.join(pluginDst, f));
                    this._log(`   ✅ user-plugin/${f}`);
                }
            });
        }
    }

    _copyRecursiveSync(src, dest) {
        if (!fs.existsSync(src)) return;
        const stats = fs.statSync(src);
        if (stats.isDirectory()) {
            const dirName = path.basename(src).toLowerCase();
            // 🚫 HARDWARE RULE: NEVER bundle images, videos, or raw media folders into the APK!
            if (dirName === 'images' || dirName === 'videos' || dirName === 'media' || dirName === 'photos' || dirName === 'audio') {
                return;
            }
            if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
            fs.readdirSync(src).forEach(child => {
                this._copyRecursiveSync(path.join(src, child), path.join(dest, child));
            });
        } else {
            const lower = src.toLowerCase();
            const fileName = path.basename(lower);
            // Allow only essential launcher icon and splash
            const isEssentialIcon = fileName === 'icon.png' || fileName === 'splash.png';
            const isMedia = /\.(jpg|jpeg|png|webp|gif|bmp|mp4|mkv|avi|mov|webm|mp3|wav|aac|flac|ogg)$/i.test(lower);
            if (isMedia && !isEssentialIcon) {
                return; // 🚫 STRICT PRUNING: Keeps APK lean (< 2.8 MB)
            }
            if (stats.size > 500000 && !src.endsWith('.json') && !src.endsWith('.dolp')) {
                return;
            }
            fs.mkdirSync(path.dirname(dest), { recursive: true });
            fs.copyFileSync(src, dest);
        }
    }

    _embedBundle() {
        const dst = path.join(this.projectDir, 'app/src/main/assets/app.dolp');
        fs.copyFileSync(this.dolpBundle, dst);
        this._log(`   ✅ app.dolp (${fs.statSync(dst).size} bytes)`);

        // Copy Inbuilt 557 Vector Icons to Android assets
        const iconsJsonSrc = path.join(DOLPHIN_RUNTIME_DIR, 'danphe_icons.json');
        const iconsJsonDst = path.join(this.projectDir, 'app/src/main/assets/danphe_icons.json');
        if (fs.existsSync(iconsJsonSrc)) {
            fs.copyFileSync(iconsJsonSrc, iconsJsonDst);
            this._log(`   ✅ Inbuilt DanpheIcons (557 vectors, ${fs.statSync(iconsJsonDst).size} bytes)`);
        }

        // Copy project's local assets/icons to Android assets/icons (only vector / svg / json)
        const iconAssetsSrc = path.join(process.cwd(), 'assets', 'icons');
        const iconAssetsDst = path.join(this.projectDir, 'app/src/main/assets/icons');
        if (fs.existsSync(iconAssetsSrc)) {
            this._copyRecursiveSync(iconAssetsSrc, iconAssetsDst);
            this._log(`   ✅ Synced CDN icon assets -> app/src/main/assets/icons/`);
        }

        // 🚫 STRICT MEDIA GUARD: Purge any accidental images/videos from app/src/main/assets
        const accidentalMediaDirs = [
            path.join(this.projectDir, 'app/src/main/assets/assets'),
            path.join(this.projectDir, 'app/src/main/assets/images'),
            path.join(this.projectDir, 'app/src/main/assets/videos')
        ];
        accidentalMediaDirs.forEach(d => {
            if (fs.existsSync(d)) {
                try {
                    fs.rmSync(d, { recursive: true, force: true });
                    this._log(`   🧹 Purged media folder: ${path.basename(d)} to keep APK < 2.8 MB`);
                } catch (_) {}
            }
        });

        // Copy project local docstore.json / titan_hotel_docstore.json to Android assets
        const docStoreSrc = path.join(process.cwd(), 'titan_hotel_docstore.json');
        const docStoreDst = path.join(this.projectDir, 'app/src/main/assets/titan_hotel_docstore.json');
        if (fs.existsSync(docStoreSrc)) {
            fs.copyFileSync(docStoreSrc, docStoreDst);
            this._log(`   ✅ Embedded local DocStore -> assets/titan_hotel_docstore.json`);
        }
    }




    async _runGradle() {
        const isWin  = os.platform() === 'win32';
        let gradle = isWin ? 'gradlew.bat' : './gradlew';
        
        // ── KEY FIX: Support system Gradle as fallback ──────────────
        const dolphinGradle = path.join(os.homedir(), '.dolphin', 'gradle-8.5', 'gradle-8.5', 'bin', isWin ? 'gradle.bat' : 'gradle');
        if (fs.existsSync(dolphinGradle)) {
            gradle = `"${dolphinGradle}"`;
            this._log(`   ✅ Using Dolphin Gradle: ${dolphinGradle}`);
        }

        const task = this.release ? 'assembleRelease' : 'assembleDebug';
        const buildTasks = this.release ? ['generateReleaseBuildConfig', 'assembleRelease'] : ['generateDebugBuildConfig', 'assembleDebug'];

        return new Promise((resolve, reject) => {
            console.log(`\n  ⚙️  ${gradle} ${buildTasks.join(' ')}`);
            const env  = { ...process.env, ANDROID_HOME: this.androidHome };
            const proc = spawn(gradle, [...buildTasks, '--no-daemon'], {
                cwd: this.projectDir, env, shell: true,
                stdio: this.verbose ? 'inherit' : ['ignore', 'pipe', 'pipe']
            });
            let stderr = '';
            if (!this.verbose) {
                proc.stdout?.on('data', () => process.stdout.write('.'));
                proc.stderr?.on('data', d => { stderr += d; });
            }
            proc.on('close', code => {
                if (!this.verbose) process.stdout.write('\n');
                if (code !== 0) {
                    console.error('\n  ❌ Gradle build failed:');
                    console.error(stderr.slice(-3000));
                    reject(new Error(`Gradle exited with code ${code}`));
                    return;
                }
                const variant = this.release ? 'release' : 'debug';
                const apk = path.join(
                    this.projectDir, 'app', 'build', 'outputs', 'apk', variant, `app-${variant}.apk`
                );
                if (!fs.existsSync(apk)) { reject(new Error(`APK not found: ${apk}`)); return; }
                resolve(apk);
            });
        });
    }

    _copyApk(apkPath) {
        const targetDirs = new Set();
        
        // 1. Primary android output dist
        targetDirs.add(path.resolve(this.projectDir, 'dist'));

        // 2. Parent root dist if projectDir is inside .dolphin-android or .danphe-android
        if (this.projectDir.includes('.dolphin-android') || this.projectDir.includes('.danphe-android')) {
            const rootDir = this.projectDir.replace(/[\\\/]\.(dolphin|danphe)-android.*$/, '');
            targetDirs.add(path.resolve(rootDir, 'dist'));
            targetDirs.add(path.resolve(rootDir, 'app', 'dist'));
        }

        // 3. Current working directory dist
        targetDirs.add(path.resolve(process.cwd(), 'dist'));
        targetDirs.add(path.resolve(process.cwd(), 'app', 'dist'));

        const apkName = `${this.appName.replace(/\s+/g, '-')}-${this.versionName}.apk`;
        let primaryOut = '';

        for (const distDir of targetDirs) {
            try {
                if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
                const destFile = path.join(distDir, apkName);
                fs.copyFileSync(apkPath, destFile);
                if (!primaryOut) primaryOut = destFile;
            } catch (e) {}
        }

        // 🌟 Auto-copy directly to Project Root directory as ${appName}.apk (Zero Confusion)
        try {
            const rootDir = this.projectDir.replace(/[\\\/]\.(dolphin|danphe)-android.*$/, '');
            const rootApkPath = path.resolve(rootDir, `${this.appName.replace(/\s+/g, '-')}.apk`);
            fs.copyFileSync(apkPath, rootApkPath);
        } catch (_) {}

        return primaryOut || apkPath;
    }

    async _installAndRun(apkPath) {
        this._step('Installing APK and launching app...');
        try {
            execSync(`adb install -r "${apkPath}"`, { stdio: 'inherit' });
            this._log(`   🚀 Launching ${this.packageName}...`);
            execSync(`adb shell am start -S -n ${this.packageName}/.MainActivity`, { stdio: 'inherit' });
            
            // Auto-setup adb reverse for hot patching
            execSync(`adb reverse tcp:${this.devPort} tcp:${this.devPort}`, { stdio: 'inherit' });
            this._log(`   🔌 adb reverse tcp:${this.devPort} set`);
        } catch (err) {
            this._log('   ⚠️  Auto-run failed. Is your device connected via USB?');
        }
    }

    _download(url, dest) {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(dest);
            const req  = (u) => https.get(u, res => {
                if (res.statusCode === 301 || res.statusCode === 302) return req(res.headers.location);
                res.pipe(file);
                file.on('finish', () => file.close(resolve));
            }).on('error', err => { fs.unlink(dest, () => {}); reject(err); });
            req(url);
        });
    }

    _write(rel, content) {
        const full = path.join(this.projectDir, rel);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, content.replace(/\r\n/g, '\n'));
    }

    _step(msg) { console.log(`\n  ▶  ${msg}`); }
    _log(msg)  { console.log(msg); }
    _fatal(msg) { console.error(`\n  ❌ ${msg}\n`); process.exit(1); }
}

module.exports = { AndroidBuilder };
