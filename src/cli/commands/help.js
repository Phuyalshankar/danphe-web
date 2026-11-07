'use strict';

/**
 * 🌊 Dolphin CLI — `help` command
 * Show all available commands and usage.
 */

function showHelp(version) {
    console.log(`
   🌊 \x1b[1m\x1b[36mDOLPHIN MOBILE PLATFORM\x1b[0m v${version || '1.0.0'}
   \x1b[90mPure Binary Native • No WebView • No Bridge • Zero Studio\x1b[0m

   \x1b[1mCOMMANDS:\x1b[0m
     \x1b[32minit\x1b[0m <AppName>           Scaffold a new project (pages, hooks, components...)
     \x1b[32mgenerate\x1b[0m | \x1b[32mg\x1b[0m page <Name>  Generate a new stateful MVC page
     \x1b[32mdev\x1b[0m                    Start hot-binary-patch dev server
     \x1b[32mbuild\x1b[0m                  Compile project to .dolp bundle
     \x1b[32mbuild --android\x1b[0m        Compile + build Android APK
     \x1b[32mbuild --android --hotpatch\x1b[0m Compile + build debug APK with hot-binary patching enabled
     \x1b[32mbuild --android --run\x1b[0m  Compile + build + install + launch on device
     \x1b[32mthorvg\x1b[0m                 Compile UI to Native Samsung ThorVG / LVGL C++ code
     \x1b[32mandroid setup\x1b[0m          Auto-install Android SDK toolchain
     \x1b[32mandroid build\x1b[0m          Build signed APK for production
     \x1b[32mandroid build --hotpatch\x1b[0m Build debug APK with hot-binary patching enabled
     \x1b[32mandroid build --release\x1b[0m Production-signed APK
     \x1b[32minspect\x1b[0m <file>         Deep-dive into binary bundle
     \x1b[32mdoctor\x1b[0m                 Verify and diagnose development environment

   \x1b[1mWORKFLOW:\x1b[0m
     \x1b[90m1.\x1b[0m dolphin android setup
     \x1b[90m2.\x1b[0m dolphin init MyApp
     \x1b[90m3.\x1b[0m cd MyApp && npm install
     \x1b[90m4.\x1b[0m dolphin dev
     \x1b[90m5.\x1b[0m dolphin build --android --release

   \x1b[1mPROJECT STRUCTURE:\x1b[0m
     \x1b[90mMyApp/\x1b[0m
     \x1b[90m├── pages/          ← screens\x1b[0m
     \x1b[90m├── components/     ← reusable UI\x1b[0m
     \x1b[90m├── hooks/          ← custom hooks\x1b[0m
     \x1b[90m├── store/          ← state management\x1b[0m
     \x1b[90m├── utils/          ← helpers\x1b[0m
     \x1b[90m├── assets/         ← images & fonts\x1b[0m
     \x1b[90m├── app.jsx         ← entry point\x1b[0m
     \x1b[90m└── dolphin.config.js\x1b[0m
`);
}

module.exports = { showHelp };
