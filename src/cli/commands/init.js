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

    // ── 1. Create Core Folders (Zero Circuits, Zero Hardware Registers Bloat) ──
    const folders = [
        'components',
        'pages',
        'assets',
        'dist'
    ];
    fs.mkdirSync(dir, { recursive: true });
    folders.forEach(f => fs.mkdirSync(path.join(dir, f), { recursive: true }));

    const frameworkRoot = path.resolve(__dirname, '../../../');
    ['components', 'pages', 'assets'].forEach(folder => {
        const srcFolder = path.join(frameworkRoot, folder);
        if (fs.existsSync(srcFolder)) {
            fs.cpSync(srcFolder, path.join(dir, folder), { recursive: true });
        }
    });
    const srcApp = path.join(frameworkRoot, 'app.jsx');
    if (fs.existsSync(srcApp)) {
        fs.copyFileSync(srcApp, path.join(dir, 'app.jsx'));
    }
    const srcAppLogic = path.join(frameworkRoot, 'app.logic.js');
    if (fs.existsSync(srcAppLogic)) {
        fs.copyFileSync(srcAppLogic, path.join(dir, 'app.logic.js'));
    }

    // ── Fallback creation if frameworkRoot didn't have components/pages ──
    if (!fs.existsSync(path.join(dir, 'pages', 'HomePage.jsx'))) {
        fs.writeFileSync(path.join(dir, 'pages', 'HomePage.jsx'),
`import CounterCard from '../components/CounterCard';
import InputCarrierCard from '../components/InputCarrierCard';

export default function HomePage() {
  return (
    <div className="w-full space-y-5">
      <div className="w-full card glass glow fx-glass p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 10px #10b981' }}></span>
          <span className="text-xs font-black text-white uppercase tracking-wider">सिस्टम स्टाटस (System Status)</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="badge fx-aqua">
            🔋 <span rx="battery">100</span>%
          </span>
          <span className="badge fx-neon">
            📶 <span rx="network">अनलाइन</span>
          </span>
        </div>
      </div>
      <CounterCard />
      <InputCarrierCard />
    </div>
  );
}
`);
    }

    if (!fs.existsSync(path.join(dir, 'pages', 'SettingsPage.jsx'))) {
        fs.writeFileSync(path.join(dir, 'pages', 'SettingsPage.jsx'),
`export default function SettingsPage() {
  return (
    <div className="w-full space-y-4">
      <div className="w-full card glass glow p-5 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl filled fx-crystal flex items-center justify-center">
              <span className="text-base">⚙️</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                सिस्टम कन्फिगरेसन (Settings)
              </span>
              <span className="text-[10px] text-slate-300 font-mono">
                DolphinCSS 2.0 • 12 Special FX Variants
              </span>
            </div>
          </div>
          <span className="badge fx-holo font-mono font-bold">ACTIVE</span>
        </div>
        <div rx="alert_msg" className="w-full card outlined p-3.5 text-xs font-medium flex items-center gap-2 rounded-xl text-sky-300">
          <span>ℹ️</span>
          <span>कुनै पनि बटन थिचेर सेटिङ वा हिमालयन थिम परिवर्तन गर्नुहोस्।</span>
        </div>
      </div>
    </div>
  );
}
`);
    }

    if (!fs.existsSync(path.join(dir, 'components', 'CounterCard.jsx'))) {
        fs.writeFileSync(path.join(dir, 'components', 'CounterCard.jsx'),
`export default function CounterCard() {
  return (
    <div className="w-full card glass glow p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl filled fx-holo flex items-center justify-center">
            <span className="text-base">🔢</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-white">काउन्टर (Counter)</span>
            <span className="text-[10px] text-slate-400 font-mono">DolphinCSS 2.0 • fx-neon / fx-aqua / fx-flare</span>
          </div>
        </div>
        <span className="badge fx-aurora font-mono font-bold">LIVE</span>
      </div>
      <div className="w-full card outlined fx-glass flex flex-col items-center justify-center p-6 my-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">हालको काउन्टर मान (Value)</span>
        <span rx="counter::value" className="text-5xl font-mono font-black glow my-2">0</span>
      </div>
      <div className="grid grid-cols-3 gap-3 pt-2">
        <button tx="counter::inc" className="filled fx-neon md glow cursor-pointer flex flex-col items-center gap-1 py-3.5">
          <span className="text-xl">➕</span>
          <span className="text-xs font-bold">बढाउनुहोस् (+1)</span>
        </button>
        <button tx="counter::dec" className="filled fx-aqua md glow cursor-pointer flex flex-col items-center gap-1 py-3.5">
          <span className="text-xl">➖</span>
          <span className="text-xs font-bold">घटाउनुहोस् (-1)</span>
        </button>
        <button tx="counter::reset" className="filled fx-flare md glow cursor-pointer flex flex-col items-center gap-1 py-3.5">
          <span className="text-xl">🔄</span>
          <span className="text-xs font-bold">रिसेट (0)</span>
        </button>
      </div>
    </div>
  );
}
`);
    }

    if (!fs.existsSync(path.join(dir, 'components', 'InputCarrierCard.jsx'))) {
        fs.writeFileSync(path.join(dir, 'components', 'InputCarrierCard.jsx'),
`export default function InputCarrierCard() {
  return (
    <div className="w-full card glass glow p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl filled fx-neon flex items-center justify-center">
            <span className="text-base">📝</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-white">डाटा प्रविष्टि (Direct Input Form)</span>
          </div>
        </div>
      </div>
      <form tx="form::save" className="space-y-3">
        <input name="form::note" type="text" placeholder="कुनै सन्देश वा नोट लेख्नुहोस्..." className="w-full input outlined fx-glass p-3 text-sm rounded-xl text-white" />
        <button type="submit" className="w-full filled fx-aurora md glow cursor-pointer py-3 font-bold text-sm rounded-xl">सेभ गर्नुहोस् (Save)</button>
      </form>
    </div>
  );
}
`);
    }

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
`import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';

export const nav = reg('nav:: home, settings');

export default function App() {
  return (
    <div id="app-root-container" className="min-h-screen w-full flex flex-col font-sans">
      <header className="w-full card glass sticky top-0 z-50 p-3" style={{ borderRadius: '0px 0px 20px 20px', borderTop: 'none' }}>
        <div className="max-w-4xl mx-auto px-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl filled fx-crystal glow flex items-center justify-center text-white font-black text-xl">
              🦅
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                ${appName}
                <span className="badge fx-holo">DolphinCSS 2.0</span>
              </span>
              <span className="text-[11px] text-slate-300">Pure Reactive Web Architecture</span>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <button tx={nav.home} className="filled fx-neon sm glow cursor-pointer flex items-center gap-1.5">
              <span>🏠</span>
              <span>गृहपृष्ठ</span>
            </button>
            <button tx={nav.settings} className="filled fx-aurora sm glow cursor-pointer flex items-center gap-1.5">
              <span>⚙️</span>
              <span>सेटिङ</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 space-y-4">
        <HomePage />
        <SettingsPage />
      </main>
    </div>
  );
}
`);
    }

    if (!fs.existsSync(path.join(dir, 'app.logic.js'))) {
        fs.writeFileSync(path.join(dir, 'app.logic.js'),
`'use strict';

module.exports = {
  'counter::inc': ({ rx, tx }) => {
    const val = ((rx ? rx('counter::value') : 0) || 0) + 1;
    if (tx) tx('counter::value', val);
  },
  'counter::dec': ({ rx, tx }) => {
    const val = Math.max(0, ((rx ? rx('counter::value') : 0) || 0) - 1);
    if (tx) tx('counter::value', val);
  },
  'counter::reset': ({ tx }) => {
    if (tx) tx('counter::value', 0);
  },
  'form::save': ({ rx, tx }) => {
    const note = (rx ? rx('form::note') : '') || 'सामान्य नोट';
    if (tx) tx('db_status', 'सेभ भयो: ' + note);
  }
};
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
            "danphe-web": "git+https://github.com/Phuyalshankar/danphe-web.git"
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

Built with 🏔️ **Danphe-Web Platform** (Carrier Slots • Direct DOM • Serial Communicator)

## Project Structure

\`\`\`
${appName}/
├── components/         ← Reusable UI Components (Cards, Buttons, Nav)
├── pages/              ← Modular Screens (HomePage.jsx, SettingsPage.jsx)
├── assets/             ← Images, Wallpapers, Icons
├── app.jsx             ← Universal Shared View (Master Registers & Slots)
├── app.logic.js        ← Application Logic & Serial Handlers ({ rx, tx })
├── index.html          ← Browser HTML Preview Entry
├── dolphin.config.js   ← Build & Platform Config
└── package.json
\`\`\`

## Commands

- **Development:** \`danphe dev\`
- **Build Web:** \`danphe build\`
`);

    console.log('');
    console.log(`  🏔️ \x1b[1m\x1b[36mDanphe-Web project created:\x1b[0m ${appName}/`);
    console.log('');
    console.log('  \x1b[90mStructure:\x1b[0m');
    console.log(`    ${appName}/components/       ← reusable UI components`);
    console.log(`    ${appName}/pages/            ← application screens`);
    console.log(`    ${appName}/assets/           ← icons & wallpapers`);
    console.log(`    ${appName}/app.jsx           ← reactive view (carrier slots)`);
    console.log(`    ${appName}/app.logic.js      ← application logic ({ rx, tx })`);
    console.log(`    ${appName}/dolphin.config.js ← build config`);
    console.log('');
    console.log('  \x1b[90mNext steps:\x1b[0m');
    console.log(`    cd ${appName}`);
    console.log('    danphe dev              (Live preview)');
    console.log('');
}

module.exports = { cmdInit };
