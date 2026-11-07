# 🤖 Dolphin Native Android Build Engine (`src/android`)

The **Android Build Engine** manages JDK/Android SDK validation, native Gradle project generation, debug/release APK compilation, and ADB device deployment.

---

## 📂 Modular Architecture

| File | Class | Description |
|---|---|---|
| `AndroidPrereqChecker.js` | `AndroidPrereqChecker` | Validates JDK 17, `JAVA_HOME`, `ANDROID_HOME`, and `adb` executable paths. |
| `GradleRunner.js` | `GradleRunner` | Executes `gradlew.bat` build tasks (`assembleDebug`, `assembleRelease`) with real-time log streaming. |
| `AdbDeployer.js` | `AdbDeployer` | ADB device installation (`adb install -r`) and intent package launcher. |
| `SDKSetup.js` | `SDKSetup` | Automated SDK downloader and platform-tools manager. |
| `AndroidBuilder.js` | `AndroidBuilder` | Master builder orchestrating Kotlin runtime copying, bundle embedding, and APK assembly. |

---

## 💻 Usage Example

```js
const AndroidBuilder = require('dolphin-native/src/android/AndroidBuilder');

const builder = new AndroidBuilder({
    projectDir: './my-app',
    enableHotpatch: true
});
await builder.build();
```
