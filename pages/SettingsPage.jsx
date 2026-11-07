export default function SettingsPage() {
  return (
    <div className="w-full space-y-4">
      <div className="w-full card glass glow space-y-4 p-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl filled primary flex items-center justify-center">
              <span className="text-base">⚙️</span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-wider text-white">
                सिस्टम कन्फिगरेसन (Settings)
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                DolphinCSS • Reactive Hardware Mapping
              </span>
            </div>
          </div>
          <span className="badge success rounded-full text-[10px] font-mono font-bold px-2.5 py-0.5">
            ACTIVE
          </span>
        </div>

        {/* Live Alert Notification Banner */}
        <div rx="alert_msg" className="w-full card outlined p-3.5 text-xs font-medium flex items-center gap-2 rounded-xl text-sky-300">
          <span>ℹ️</span>
          <span>कुनै पनि बटन थिचेर सेटिङ परिवर्तन गर्नुहोस्।</span>
        </div>

        <div className="space-y-3 pt-1">
          {/* 1. Master Power Switch */}
          <div className="w-full card outlined p-3.5 flex items-center justify-between rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">मास्टर पावर (System Power)</span>
              <span rx="power_status" className="badge success rounded-full text-[11px] font-mono font-bold mt-1 inline-block w-fit px-2 py-0.5">
                चालू (ON) ⚡
              </span>
            </div>
            <button
              tx="power:toggle"
              className="filled success glow btn-sm rounded-xl cursor-pointer flex items-center gap-1.5 px-3.5 py-2"
            >
              <span>⚡</span>
              <span className="font-bold text-xs">पावर टगल</span>
            </button>
          </div>

          {/* 2. Theme Selector */}
          <div className="w-full card outlined p-3.5 flex items-center justify-between rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">युआई थिम (Theme Mode)</span>
              <span rx="theme_label" className="badge primary rounded-full text-[11px] font-mono font-bold mt-1 inline-block w-fit px-2 py-0.5">
                गाढा (Dark) 🌙
              </span>
            </div>
            <button
              tx="theme:toggle"
              className="filled primary glow btn-sm rounded-xl cursor-pointer flex items-center gap-1.5 px-3.5 py-2"
            >
              <span>🌓</span>
              <span className="font-bold text-xs">थिम बदल्नुहोस्</span>
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
              className="filled warning glow btn-sm rounded-xl cursor-pointer flex items-center gap-1.5 px-3.5 py-2"
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
              className="filled danger glow btn-sm rounded-xl cursor-pointer flex items-center gap-1.5 px-3.5 py-2"
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
