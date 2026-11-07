'use strict';

/**
 * 🏔️ Danphe-Native CLI — `init` command
 * Scaffolds a new Unified Titan-Bus & Danphe-Native Project.
 * 
 * 100% Aligned with modern Titan-Bus-Client Architecture:
 *   - circuits/       ← Motherboard Circuit (Event Logic, tx/rx, pins & flow)
 *   - registers/      ← Master 16-Bit Hardware Register Map (registers.dolphin)
 *   - diodes/         ← Polyglot Bridges (node.diode.js, python.diode.py)
 *   - components/     ← Modular Reusable UI Components
 *   - backend/        ← Backend Server Services
 *   - app.jsx         ← Single Universal Shared TitanJSX View
 *   - dolphin.config.js ← Android Native Build Config
 *
 * Usage: danphe init <AppName> (or dolphin init <AppName>)
 */

const path = require('path');
const fs   = require('fs');

function cmdInit(appName) {
    if (!appName) {
        console.error('❌  Usage: danphe init <AppName>');
        process.exit(1);
    }

    const dir = path.resolve(process.cwd(), appName);
    if (fs.existsSync(dir)) {
        console.error(`❌  Directory "${appName}" already exists.`);
        process.exit(1);
    }

    console.log(`\n🏔️  Scaffolding Unified Titan-Bus & Danphe-Native Project: ${appName} ...`);

    // ── 1. Create Core Folders ───────────────────────────────────
    const folders = [
        'circuits',
        'registers',
        'database',
        'diodes',
        'components',
        'pages',
        'backend',
        'assets',
        'dist'
    ];
    fs.mkdirSync(dir, { recursive: true });
    folders.forEach(f => fs.mkdirSync(path.join(dir, f), { recursive: true }));

    // ── 2. registers/ (Master 300+ 16-Bit Register Map + Unified Schema) ──
    const masterRegDir = path.resolve(__dirname, '../../registers');
    const targetRegDir = path.join(dir, 'registers');
    if (fs.existsSync(masterRegDir)) {
        ['TitanRegisters.js', 'TitanRegisterSheet.js', 'TitanSlots.js', 'schema.js', 'registers.dolphin', 'registers.json', 'index.js'].forEach(f => {
            const src = path.join(masterRegDir, f);
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, path.join(targetRegDir, f));
            }
        });
    }

    const frameworkRoot = path.resolve(__dirname, '../../../');
    ['components', 'pages', 'circuits', 'database', 'diodes', 'assets'].forEach(folder => {
        const srcFolder = path.join(frameworkRoot, folder);
        if (fs.existsSync(srcFolder)) {
            fs.cpSync(srcFolder, path.join(dir, folder), { recursive: true });
        }
    });
    const srcApp = path.join(frameworkRoot, 'app.jsx');
    if (fs.existsSync(srcApp)) {
        fs.copyFileSync(srcApp, path.join(dir, 'app.jsx'));
    }

    if (!fs.existsSync(path.join(dir, 'components', 'AppBar.jsx'))) {
    // ── 3. components/ (Modular UI Components: AppBar, TabBar) ──
    fs.writeFileSync(path.join(dir, 'components', 'AppBar.jsx'),
`export default function AppBar({ title = "${appName}", subtitle = "Titan Bus Native • Everest Core" }) {
  return (
    <div className="w-full h-14 max-h-14 px-4 py-2 bg-slate-900/90 border-b border-slate-800 shadow-2xl flex items-center justify-between backdrop-blur-md shrink-0">
      <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
        <div className="p-1 rounded-xl bg-purple-950 border border-fuchsia-400/40 shadow-sm w-auto shrink-0">
          <span className="text-xl">🦚</span>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
            <span>{title}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500 text-black font-extrabold uppercase">TITAN NATIVE</span>
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{subtitle}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 w-auto shrink-0">
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-400 text-black font-black uppercase shadow">
          ⚡ 0ms HOTPATCH
        </span>
        <span className="text-[9px] font-mono text-emerald-300 font-bold bg-slate-950 px-2 py-0.5 rounded-full border border-emerald-500/40">
          BUS: READY
        </span>
      </div>
    </div>
  );
}
`);

    fs.writeFileSync(path.join(dir, 'components', 'TabBar.jsx'),
`export default function TabBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full h-16 max-h-16 px-3 py-2 bg-slate-900/95 backdrop-blur border-t border-indigo-500/40 shadow-2xl flex items-center justify-around shrink-0">
      <button action="nav:Home" data-tab="0" className="flex-1 py-1.5 px-1 rounded-2xl flex flex-col items-center gap-0.5 border border-cyan-400 bg-cyan-500/20 text-cyan-300 font-bold transition-all cursor-pointer">
        <span className="text-base">🏠</span>
        <span className="text-[10px] uppercase tracking-wider">होम</span>
      </button>
      <button action="nav:Settings" data-tab="1" className="flex-1 py-1.5 px-1 rounded-2xl flex flex-col items-center gap-0.5 border border-transparent text-slate-400 font-bold transition-all cursor-pointer">
        <span className="text-base">⚙️</span>
        <span className="text-[10px] uppercase tracking-wider">सेटिङ</span>
      </button>
    </div>
  );
}
`);

    // ── 3.1 pages/ (Modular Multi-Screen Architecture) ────────────
    fs.writeFileSync(path.join(dir, 'pages', 'HomePage.jsx'),
`import { SYS, TELEMETRY, ROOMS } from '../registers/schema';

export default function HomePage() {
  return (
    <div data-page="0" className="w-full space-y-4">
      {/* Welcome Banner */}
      <div className="w-full p-4 rounded-3xl bg-gradient-to-r from-purple-900 to-indigo-950 border border-fuchsia-500/40 shadow-xl flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-fuchsia-300 uppercase tracking-widest">डल्फिन नेभ इन्स्ट्रुमेन्ट</span>
          <span className="text-base font-black text-white mt-0.5">लाइभ हार्डवेयर ड्यासबोर्ड</span>
          <span className="text-[10px] text-slate-300 mt-1">Titan-Bus SISO 0ms रियल-टाइम रिफ्लेक्स</span>
        </div>
        <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-black font-black text-xs shadow">
          ONLINE
        </span>
      </div>

      {/* Semantic Hardware Register Deck */}
      <div className="w-full p-4 rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
          <span className="text-xs font-black uppercase tracking-wider text-lime-300 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-lime-400 animate-pulse"></span>
            <span>हार्डवेयर टेलिमेट्री (Named Registers)</span>
          </span>
          <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded-full font-bold">
            TYPE-SAFE
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
          <div className="p-3 rounded-2xl bg-emerald-950 border border-emerald-500/50">
            <div className="text-[10px] text-emerald-400 font-bold uppercase">BATTERY LEVEL</div>
            <div className="text-emerald-300 font-black text-lg mt-1 flex items-baseline gap-1">
              <span rx={TELEMETRY.BATTERY}>98</span>%
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-cyan-950 border border-cyan-500/50">
            <div className="text-[10px] text-cyan-400 font-bold uppercase">AUDIO VOLUME</div>
            <div className="text-cyan-300 font-black text-lg mt-1 flex items-baseline gap-1">
              <span rx={TELEMETRY.AUDIO_VOL}>512</span>
            </div>
          </div>
        </div>

        <div className="pt-1">
          <TitanSlider address={TELEMETRY.AUDIO_VOL} label="Master Volume Scrub" />
        </div>
      </div>

      {/* 🏨 Dynamic Carrier Card (Demonstrating Parent Register + Child Slots) */}
      <div className="w-full p-4 rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
          <span className="text-xs font-black uppercase tracking-wider text-cyan-300">
            होटल कोठा (Parent Register + Child Slots)
          </span>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-full font-bold">
            SLOT 1-8
          </span>
        </div>

        <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
          <div className="flex flex-col">
            <span rx={ROOMS.STREAM} slot={ROOMS.SLOTS.ROOM_NUM} className="text-base font-black text-white">
              Room 101
            </span>
            <span rx={ROOMS.STREAM} slot={ROOMS.SLOTS.GUEST_NAME} className="text-xs text-slate-400">
              Roshan Sharma
            </span>
          </div>
          <div className="flex flex-col items-end">
            <span rx={ROOMS.STREAM} slot={ROOMS.SLOTS.PRICE} className="text-sm font-black text-emerald-400">
              Rs. 3500
            </span>
            <span rx={ROOMS.STREAM} slot={ROOMS.SLOTS.STATUS} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
              VACANT
            </span>
          </div>
        </div>

        <button tx={ROOMS.ACT_CHECKOUT} txValue={{ roomNumber: 101 }} className="w-full py-2.5 rounded-xl bg-cyan-500 text-black font-black text-xs uppercase shadow hover:bg-cyan-400 cursor-pointer">
          कोठा १०१ चेकआउट (Action Trigger)
        </button>
      </div>
    </div>
  );
}
`);

    fs.writeFileSync(path.join(dir, 'pages', 'SettingsPage.jsx'),
`import { SYS } from '../registers/schema';

export default function SettingsPage() {
  return (
    <div data-page="1" className="w-full space-y-4">
      <div className="w-full p-4 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
            सिस्टम सेटिङ (Settings)
          </span>
          <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950 px-2 py-0.5 rounded-full">
            CONFIG
          </span>
        </div>

        <div className="space-y-2.5 pt-1">
          <div className="w-full p-3 rounded-xl bg-slate-800 border border-slate-700">
            <switch tx={SYS.POWER} label="टाइटन सिस्टम पावर (Master Power)" className="w-full text-emerald-400" />
          </div>
          <div className="flex items-center gap-4 p-2.5 rounded-xl bg-slate-800 border border-slate-700">
            <radio tx={SYS.THEME_MODE} value={1} label="गाढा थिम (Dark)" className="text-indigo-300" />
            <radio tx={SYS.THEME_MODE} value={2} label="उज्यालो थिम (Light)" className="text-amber-300" />
          </div>
        </div>
      </div>
    </div>
  );
}
`);

    // ── 4. circuits/main.circuit.js (Motherboard Logic) ─────────
    fs.writeFileSync(path.join(dir, 'circuits', 'main.circuit.js'),
`// ⚡ TITAN MOTHERBOARD CIRCUIT (circuits/main.circuit.js)
// Single Source of Truth for Business Logic, Validations & Register Wires
import { SYS, TELEMETRY, ROOMS } from '../registers/schema';

export default {
  // ── 1. Master System Power (Parent Register: SYS.POWER) ──────
  powerSwitch: {
    address: SYS.POWER,
    initialValue: true,
    onReceive: (val, { tx }) => {
      console.log("[Circuit] Power state changed:", val ? "ON" : "OFF");
      if (!val) tx(TELEMETRY.AUDIO_VOL, 0); // If power OFF, mute audio
    }
  },

  // ── 2. Hotel Room Checkout Action (ROOMS.ACT_CHECKOUT) ───────
  checkoutAction: {
    address: ROOMS.ACT_CHECKOUT,
    initialValue: null,
    onReceive: (data, { tx, rx }) => {
      const roomNum = data?.roomNumber || 101;
      console.log(\`[Circuit] Checking out room #\${roomNum}\`);
      tx(SYS.ALERT_TOAST, \`कोठा #\${roomNum} चेकआउट सम्पन्न भयो!\`);
      tx(SYS.HW_HAPTIC, 100);
    }
  },

  // ── 3. Battery Telemetry Guard (TELEMETRY.BATTERY) ───────────
  telemetryBattery: {
    address: TELEMETRY.BATTERY,
    initialValue: 98,
    onReceive: (level, { tx }) => {
      if (level < 20) {
        tx(SYS.ALERT_TOAST, "⚠️ ब्याट्री कम भयो! चार्ज गर्नुहोस्।");
      }
    }
  }
};
`);

    } // End fallback write

    // ── 5. diodes/node.diode.js (Node.js Polyglot Bridge) ────────
    fs.writeFileSync(path.join(dir, 'diodes', 'node.diode.js'),
`// 🛡️ Node.js Diode Bridge
// Connects Node.js backend processes directly to Titan Bus
const net = require('net');

const client = new net.Socket();
client.connect(9092, '127.0.0.1', () => {
  console.log("🛡️ Node.js Diode connected to Titan Bus (Port 9092)!");
});

client.on('data', (chunk) => {
  if (chunk.length >= 6 && chunk[0] === 0x54 && chunk[1] === 0x42) {
    const addr = (chunk[2] << 8) | chunk[3];
    const val  = (chunk[4] << 8) | chunk[5];
    console.log(\`[Node Diode] Received Reg 0x\${addr.toString(16)} = \${val}\`);
  }
});
`);

    // ── 6. diodes/python.diode.py (Python AI Bridge) ─────────────
    fs.writeFileSync(path.join(dir, 'diodes', 'python.diode.py'),
`# 🛡️ Python AI Diode Bridge
# Run this for Python / AI Edge integration with Titan Bus
import socket, struct, time

print("🐍 Python AI Diode Ready...")
`);

    // ── 7. Default Assets (1x1 Transparent PNGs) ─────────────────
    const defaultPngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
    const pngBuffer = Buffer.from(defaultPngBase64, 'base64');
    fs.writeFileSync(path.join(dir, 'assets', 'icon.png'), pngBuffer);
    fs.writeFileSync(path.join(dir, 'assets', 'splash.png'), pngBuffer);

    // ── 8. dolphin.config.js (Android APK Build Config) ──────────
    fs.writeFileSync(path.join(dir, 'dolphin.config.js'),
`'use strict';

module.exports = {
    app:      '${appName}',
    package:  'io.danphe.${appName.toLowerCase().replace(/[^a-z0-9_]/g, '')}',
    version:  '1.0.0',
    platform: 'NATIVE',
    entry:    'Home',
    icon:     'assets/icon.png',
    splash:   'assets/splash.png',
    dev: {
        host:     '0.0.0.0',
        port:     9091,
        httpPort: 9090,
    }
};
`);

    // ── 9. app.jsx (Single Shared Universal Modular TitanJSX Scaffold) ──
    if (!fs.existsSync(path.join(dir, 'app.jsx'))) {
    fs.writeFileSync(path.join(dir, 'app.jsx'),
`import AppBar from './components/AppBar';
import TabBar from './components/TabBar';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <div className="w-full h-screen max-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* 📱 Reusable Top Navigation AppBar */}
      <AppBar title="${appName}" subtitle="Titan Bus Native • Everest Core" />

      {/* 🧭 Modular Multi-Screen Page Container */}
      <div className="flex-1 w-full p-3 pb-24 overflow-y-auto space-y-4">
        <HomePage />
        <SettingsPage />
      </div>

      {/* 🧭 Reusable Bottom Tab Navigation */}
      <TabBar />

    </div>
  );
}
`);

    }

    // ── 10. index.html (Web Preview for Browser) ─────────────────
    fs.writeFileSync(path.join(dir, 'index.html'),
`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${appName} — Titan Bus Native</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen">
  <div id="root"></div>
  <script type="module">
    import App from './app.jsx';
    console.log("🏔️ Loaded ${appName} Titan App");
  </script>
</body>
</html>
`);

    // ── 11. package.json ─────────────────────────────────────────
    const pkg = {
        name:        appName.toLowerCase().replace(/\s+/g, '-'),
        version:     '1.0.0',
        description: `Unified Titan-Bus & Danphe-Native App — ${appName}`,
        main:        'app.jsx',
        scripts: {
            dev:   'danphe dev',
            build: 'danphe build',
            'build:android': 'danphe android build',
        },
        dependencies: {
            "danphe-native": "file:../danphe-native",
            "titan-bus-client": "file:../titan-bus-client"
        }
    };
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg, null, 2));

    // ── 12. .gitignore ───────────────────────────────────────────
    fs.writeFileSync(path.join(dir, '.gitignore'),
`node_modules/
dist/
*.dolp
.danphe-android/
.dolphin-android/
`);

    // ── 13. README.md ────────────────────────────────────────────
    fs.writeFileSync(path.join(dir, 'README.md'),
`# ${appName}

Built with 🏔️ **Danphe-Native & Titan-Bus Unified Platform**

## Project Structure (Titan-Bus Architecture)

\`\`\`
${appName}/
├── circuits/           ← Motherboard Circuit (main.circuit.js)
├── registers/          ← Master 16-Bit Hardware Registers (registers.dolphin)
├── diodes/             ← Polyglot Diode Bridges (node.diode.js, python.diode.py)
├── components/         ← Reusable UI Components
├── backend/            ← Backend Services
├── assets/             ← Icons, Splashes, Fonts
├── app.jsx             ← Universal Shared TitanJSX View
├── dolphin.config.js   ← Native Android APK Config
└── package.json
\`\`\`

## Commands

- **Development:** \`danphe dev\`
- **Build APK:** \`danphe android build\`
`);

    console.log('');
    console.log(`  🏔️ \x1b[1m\x1b[36mTitan-Bus project created:\x1b[0m ${appName}/`);
    console.log('');
    console.log('  \x1b[90mStructure:\x1b[0m');
    console.log(`    ${appName}/circuits/       ← motherboard logic`);
    console.log(`    ${appName}/registers/      ← master 16-bit register map (registers.dolphin)`);
    console.log(`    ${appName}/diodes/         ← polyglot bridges (Node, Python)`);
    console.log(`    ${appName}/app.jsx         ← universal TitanJSX view`);
    console.log(`    ${appName}/dolphin.config.js ← Android APK builder config`);
    console.log('');
    console.log('  \x1b[90mNext steps:\x1b[0m');
    console.log(`    cd ${appName}`);
    console.log('    danphe dev              (Live preview)');
    console.log('    danphe android build    (Compile native Android APK)');
    console.log('');
}

module.exports = { cmdInit };
