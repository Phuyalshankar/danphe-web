import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';

// 🧭 रुट तथा नेभिगेसन स्लट परिभाषा (Unified Navigation Slots)
export const nav = reg('nav:: home, settings');

export default function App() {
  return (
    <div className="min-h-screen w-full flex flex-col font-sans" style={{ background: '#090d16', color: '#f8fafc' }}>
      
      {/* 🐬 DolphinCSS Clean Responsive Web Navbar */}
      <header className="w-full card sticky top-0 z-50 p-3" style={{ borderRadius: '0px 0px 20px 20px', borderTop: 'none' }}>
        <div className="max-w-4xl mx-auto px-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl filled primary glow flex items-center justify-center text-white font-black text-xl">
              🦅
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                Danphe Web
                <span className="badge primary">
                  DolphinCSS 2.0
                </span>
              </span>
              <span className="text-[11px] text-slate-400">
                Pure Hardware-Mapped Web Architecture
              </span>
            </div>
          </div>

          {/* Web Navigation Controls via DolphinCSS Semantic Classes */}
          <nav className="flex items-center gap-2">
            <button
              tx={nav.home}
              className="filled primary sm glow cursor-pointer flex items-center gap-1.5"
            >
              <span>🏠</span>
              <span>गृहपृष्ठ</span>
            </button>
            <button
              tx={nav.settings}
              className="outlined primary sm cursor-pointer flex items-center gap-1.5"
            >
              <span>⚙️</span>
              <span>सेटिङ</span>
            </button>
          </nav>
        </div>
      </header>

      {/* 🧭 Centered Web Viewport Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <div page={nav.home}>
          <HomePage />
        </div>
        <div page={nav.settings}>
          <SettingsPage />
        </div>
      </main>

      {/* 🦶 Clean Web Footer */}
      <footer className="w-full py-6 text-center text-xs text-slate-500">
        Danphe Web Platform • DolphinCSS 2.0 Universal Engine • Zero Virtual DOM
      </footer>

    </div>
  );
}
