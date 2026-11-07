export default function SettingsPage() {
  return (
    <div className="w-full space-y-4">
      <div className="w-full card p-5 space-y-4">
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
              <span className="text-[10px] text-slate-400 font-mono">
                DolphinCSS 2.0 • Hardware Mapping
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
          <span>कुनै पनि बटन थिचेर सेटिङ परिवर्तन गर्नुहोस्।</span>
        </div>

        <div className="space-y-3 pt-1">
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

          {/* 2. Theme Selector */}
          <div className="w-full card outlined p-3.5 flex items-center justify-between rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">युआई थिम (Theme Mode)</span>
              <span rx="theme_label" className="badge primary font-mono font-bold mt-1 inline-block w-fit">
                गाढा (Dark) 🌙
              </span>
            </div>
            <button
              tx="theme:toggle"
              className="filled primary sm glow cursor-pointer flex items-center gap-1.5"
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
