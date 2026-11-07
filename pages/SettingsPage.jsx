export default function SettingsPage() {
  return (
    <div data-page="1" className="w-full space-y-4">
      <div className="w-full p-4 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
              <span className="text-sm">⚙️</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                सिस्टम कन्फिगरेसन (Settings)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                Pure Reactive Web Settings
              </span>
            </div>
          </div>
          <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
            ACTIVE
          </span>
        </div>

        {/* Live Alert Notification Banner */}
        <div rx="alert_msg" className="w-full p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-2">
          <span>ℹ️</span>
          <span>कुनै पनि बटन थिचेर सेटिङ परिवर्तन गर्नुहोस्।</span>
        </div>

        <div className="space-y-3 pt-1">
          {/* 1. Master Power Switch */}
          <div className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">मास्टर पावर (System Power)</span>
              <span rx="power_status" className="text-[11px] text-emerald-400 font-mono font-bold mt-0.5">
                चालू (ON) ⚡
              </span>
            </div>
            <button
              tx="power:toggle"
              className="px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>पावर टगल</span>
            </button>
          </div>

          {/* 2. Theme Selector */}
          <div className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">युआई थिम (Theme Mode)</span>
              <span rx="theme_label" className="text-[11px] text-cyan-400 font-mono font-bold mt-0.5">
                गाढा (Dark) 🌙
              </span>
            </div>
            <button
              tx="theme:toggle"
              className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>🌓</span>
              <span>थिम बदल्नुहोस्</span>
            </button>
          </div>

          {/* 3. Live Alert / Toast Test */}
          <div className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">प्रणाली सूचना (Notification Test)</span>
              <span className="text-[10px] text-slate-400 font-mono">सूचना पठाएर परीक्षण गर्नुहोस्</span>
            </div>
            <button
              tx="alert:test"
              className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>🔔</span>
              <span>सूचना पठाउनुहोस्</span>
            </button>
          </div>

          {/* 4. Reset All Data */}
          <div className="w-full p-3.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">सम्पूर्ण डाटा रिसेट (Reset All)</span>
              <span className="text-[10px] text-slate-400 font-mono">काउन्टर र नोट शून्य बनाउनुहोस्</span>
            </div>
            <button
              tx="data:reset"
              className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span>रिसेट गर्नुहोस्</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
