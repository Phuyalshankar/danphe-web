export default function SettingsPage() {
  return (
    <div data-page="1" className="w-full space-y-4">
      <div className="w-full p-4 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
            सिस्टम कन्फिगरेसन (Settings)
          </span>
          <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950 px-2 py-0.5 rounded-full">
            SETTINGS
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {/* Power Switch */}
          <div className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">मास्टर पावर (System Power)</span>
              <span className="text-[10px] text-slate-400 font-mono">पावर अन/अफ टगल</span>
            </div>
            <switch tx="power" className="text-emerald-400" />
          </div>

          {/* Theme Selector */}
          <div className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">युआई थिम (Theme Mode)</span>
              <span className="text-[10px] text-slate-400 font-mono">गाढा वा उज्यालो रङ्ग</span>
            </div>
            <div className="flex items-center gap-2">
              <button action="theme:toggle" className="px-3 py-1.5 rounded-xl bg-slate-800 text-indigo-300 text-xs font-bold border border-indigo-500/30 cursor-pointer">
                थिम बदल्नुहोस् (Toggle Theme)
              </button>
            </div>
          </div>

          {/* Device Alert Test */}
          <div className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">प्रणाली सूचना (Notification Test)</span>
              <span className="text-[10px] text-slate-400 font-mono">सूचना पठाउनुहोस्</span>
            </div>
            <button action="app.showToast" className="px-3 py-1.5 rounded-xl bg-purple-950 text-fuchsia-300 text-xs font-bold border border-fuchsia-500/40 cursor-pointer">
              सूचना देखाउनुहोस्
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
