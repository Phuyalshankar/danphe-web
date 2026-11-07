export default function SettingsPage() {
  return (
    <div className="w-full space-y-4">
      <div className="w-full card glass glow p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl filled primary flex items-center justify-center">
              <span className="text-base">⚙️</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                सिस्टम कन्फिगरेसन (Settings)
              </span>
              <span className="text-[10px] text-slate-300 font-mono">
                DolphinCSS 2.0 • Himalayan Gradients
              </span>
            </div>
          </div>
          <span className="badge success font-mono font-bold">
            ACTIVE
          </span>
        </div>

        {/* Live Alert Notification Banner */}
        <div rx="alert_msg" className="w-full card outlined p-3.5 text-xs font-medium flex items-center gap-2 rounded-xl text-sky-300">
          <span>ℹ️</span>
          <span>कुनै पनि बटन थिचेर सेटिङ वा हिमालयन थिम परिवर्तन गर्नुहोस्।</span>
        </div>

        {/* 🏔️ नेपाली हिमालयन हेरिटेज थिमहरू (Himalayan Heritage Themes) */}
        <div className="w-full space-y-2 pt-2 border-t border-slate-800">
          <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
            <span>🎨</span>
            <span>नेपाली हिमालयन हेरिटेज थिमहरू (Heritage Gradients)</span>
          </span>
          <p className="text-[11px] text-slate-300">
            कुनै पनि थिम चयन गर्दा सम्पूर्ण पृष्ठभूमि तुरुन्तै परिवर्तन हुन्छ:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              tx="theme::danphe"
              className="p-3 rounded-xl cursor-pointer text-xs font-black shadow-lg transition-transform active:scale-95 flex flex-col items-center gap-1 border border-white/20"
              style={{ background: 'linear-gradient(45deg, #10b981 0%, #3b82f6 25%, #8b5cf6 50%, #f97316 75%, #ef4444 100%)', color: '#ffffff' }}
            >
              <span className="text-base">🦅</span>
              <span>डाँफे (Danphe)</span>
            </button>

            <button
              tx="theme::laligurans"
              className="p-3 rounded-xl cursor-pointer text-xs font-black shadow-lg transition-transform active:scale-95 flex flex-col items-center gap-1 border border-white/20"
              style={{ background: 'linear-gradient(135deg, #be123c 0%, #e11d48 50%, #fbcfe8 100%)', color: '#ffffff' }}
            >
              <span className="text-base">🌺</span>
              <span>लालीगुराँस (Laligurans)</span>
            </button>

            <button
              tx="theme::sagarmatha"
              className="p-3 rounded-xl cursor-pointer text-xs font-black shadow-lg transition-transform active:scale-95 flex flex-col items-center gap-1 border border-white/20"
              style={{ background: 'linear-gradient(135deg, #0f172a 0%, #0369a1 50%, #38bdf8 100%)', color: '#ffffff' }}
            >
              <span className="text-base">🏔️</span>
              <span>सगरमाथा (Sagarmatha)</span>
            </button>

            <button
              tx="theme::tilicho"
              className="p-3 rounded-xl cursor-pointer text-xs font-black shadow-lg transition-transform active:scale-95 flex flex-col items-center gap-1 border border-white/20"
              style={{ background: 'linear-gradient(135deg, #042f2e 0%, #0d9488 50%, #5eead4 100%)', color: '#ffffff' }}
            >
              <span className="text-base">🌊</span>
              <span>तिलिचो (Tilicho)</span>
            </button>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* 1. Master Power Switch */}
          <div className="w-full card outlined p-3.5 flex items-center justify-between rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">मास्टर पावर (System Power)</span>
              <span rx="power_status" className="badge success font-mono font-bold mt-1 inline-block w-fit">
                चालू (ON) ⚡
              </span>
            </div>
            <button
              tx="power:toggle"
              className="filled success sm glow cursor-pointer flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span className="font-bold text-xs">पावर टगल</span>
            </button>
          </div>

          {/* 2. Theme Toggle Switch */}
          <div className="w-full card outlined p-3.5 flex items-center justify-between rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">थिम स्विच (Next Theme)</span>
              <span rx="theme_label" className="badge primary font-mono font-bold mt-1 inline-block w-fit">
                डाँफे (Danphe) 🦅
              </span>
            </div>
            <button
              tx="theme:toggle"
              className="filled primary sm glow cursor-pointer flex items-center gap-1.5"
            >
              <span>🌓</span>
              <span className="font-bold text-xs">अर्को थिम</span>
            </button>
          </div>

          {/* 3. Live Alert / Toast Test */}
          <div className="w-full card outlined p-3.5 flex items-center justify-between rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">प्रणाली सूचना (Notification Test)</span>
              <span className="text-[10px] text-slate-400 font-mono">सूचना पठाएर परीक्षण गर्नुहोस्</span>
            </div>
            <button
              tx="alert:test"
              className="filled warning sm glow cursor-pointer flex items-center gap-1.5"
            >
              <span>🔔</span>
              <span className="font-bold text-xs">सूचना पठाउनुहोस्</span>
            </button>
          </div>

          {/* 4. Reset All Data */}
          <div className="w-full card outlined p-3.5 flex items-center justify-between rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">सम्पूर्ण डाटा रिसेट (Reset All)</span>
              <span className="text-[10px] text-slate-400 font-mono">काउन्टर र नोट शून्य बनाउनुहोस्</span>
            </div>
            <button
              tx="data:reset"
              className="filled danger sm glow cursor-pointer flex items-center gap-1.5"
            >
              <span>🔄</span>
              <span className="font-bold text-xs">रिसेट गर्नुहोस्</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
