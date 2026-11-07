import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 🌐 Clean Responsive Web Navbar */}
      <header className="w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-black text-lg">
              🦅
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                Danphe Web
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 font-mono font-normal">
                  v1.0 • Zero-VDOM
                </span>
              </span>
              <span className="text-[11px] text-slate-400">
                Pure Hardware-Mapped Web Architecture
              </span>
            </div>
          </div>

          {/* Web Navigation Controls */}
          <nav className="flex items-center gap-2">
            <button
              action="nav:0"
              data-tab="0"
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>🏠</span>
              <span>गृहपृष्ठ</span>
            </button>
            <button
              action="nav:1"
              data-tab="1"
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white border border-transparent hover:border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>⚙️</span>
              <span>सेटिङ</span>
            </button>
          </nav>
        </div>
      </header>

      {/* 🧭 Centered Web Viewport Container */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
        <HomePage />
        <SettingsPage />
      </main>

      {/* 🦶 Clean Web Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950/80 py-4 text-center text-xs text-slate-500">
        Danphe Web Platform • Zero Virtual DOM • Direct 16-Bit Memory Mapping
      </footer>

    </div>
  );
}
