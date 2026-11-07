export default function SettingsPage() {
  return (
    <div className="w-full space-y-4">
      <div className="w-full card glass glow p-5 space-y-4">
        {/* Header */}
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
          <span className="badge fx-holo font-mono font-bold">
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
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
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

            <button
              tx="theme::light"
              className="p-3 rounded-xl cursor-pointer text-xs font-black shadow-lg transition-transform active:scale-95 flex flex-col items-center gap-1 border border-slate-300"
              style={{ background: 'linear-gradient(135deg, #ffffff 0%, #e2e8f0 50%, #cbd5e1 100%)', color: '#0f172a' }}
            >
              <span className="text-base">☀️</span>
              <span>उज्यालो (Light)</span>
            </button>
          </div>
        </div>

        <div className="space-y-3 pt-2">
          {/* 1. Master Power Switch with fx-neon */}
          <div className="w-full card outlined fx-glass p-3.5 flex items-center justify-between rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">मास्टर पावर (System Power)</span>
              <span rx="power_status" className="badge fx-neon font-mono font-bold mt-1 inline-block w-fit">
                चालू (ON) ⚡
              </span>
            </div>
            <button
              tx="power:toggle"
              className="filled fx-neon sm glow cursor-pointer flex items-center gap-1.5 text-white"
            >
              <span>⚡</span>
              <span className="font-bold text-xs">पावर टगल</span>
            </button>
          </div>

          {/* 2. Theme Toggle Switch with fx-aurora */}
          <div className="w-full card outlined fx-glass p-3.5 flex items-center justify-between rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">थिम स्विच (Next Theme)</span>
              <span rx="theme_label" className="badge fx-aurora font-mono font-bold mt-1 inline-block w-fit">
                डाँफे (Danphe) 🦅
              </span>
            </div>
            <button
              tx="theme:toggle"
              className="filled fx-aurora sm glow cursor-pointer flex items-center gap-1.5 text-white"
            >
              <span>🌓</span>
              <span className="font-bold text-xs">अर्को थिम</span>
            </button>
          </div>

          {/* 3. Live Alert / Toast Test with fx-flare */}
          <div className="w-full card outlined fx-glass p-3.5 flex items-center justify-between rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">प्रणाली सूचना (Notification Test)</span>
              <span className="text-[10px] text-slate-300 font-mono">सूचना पठाएर परीक्षण गर्नुहोस्</span>
            </div>
            <button
              tx="alert:test"
              className="filled fx-flare sm glow cursor-pointer flex items-center gap-1.5 text-white"
            >
              <span>🔔</span>
              <span className="font-bold text-xs">सूचना पठाउनुहोस्</span>
            </button>
          </div>

          {/* 4. Reset All Data with fx-metal */}
          <div className="w-full card outlined fx-glass p-3.5 flex items-center justify-between rounded-xl">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">सम्पूर्ण डाटा रिसेट (Reset All)</span>
              <span className="text-[10px] text-slate-300 font-mono">काउन्टर र नोट शून्य बनाउनुहोस्</span>
            </div>
            <button
              tx="data:reset"
              className="filled fx-metal sm glow cursor-pointer flex items-center gap-1.5 text-white"
            >
              <span>🔄</span>
              <span className="font-bold text-xs">रिसेट गर्नुहोस्</span>
            </button>
          </div>
        </div>

        {/* 🔮 DolphinCSS 2.0 Special FX Variant Showcase (१२ वटा स्पेशल FX भेरियन्टहरू) */}
        <div className="w-full space-y-3 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>🔮</span>
              <span>DolphinCSS स्पेशल FX भेरियन्टहरू (12 Special FX Variants)</span>
            </span>
            <span className="badge fx-holo font-mono text-[10px]">
              DolphinCSS 2.0 Engine
            </span>
          </div>
          <p className="text-[11px] text-slate-300">
            DolphinCSS का सबै १२ वटा स्पेशल भिजुअल FX भेरियन्टहरू (कुनै पनि थिचेर लाइभ टेस्ट गर्नुहोस्):
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 pt-1">
            <button
              tx="fx::crystal"
              className="filled fx-crystal md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">💎</span>
              <span>fx-crystal</span>
              <span className="text-[10px] text-slate-300 font-mono">Prismatic Glass</span>
            </button>

            <button
              tx="fx::neon"
              className="filled fx-neon md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">⚡</span>
              <span>fx-neon</span>
              <span className="text-[10px] text-sky-300 font-mono">Cyber Neon Glow</span>
            </button>

            <button
              tx="fx::aurora"
              className="filled fx-aurora md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">🌌</span>
              <span>fx-aurora</span>
              <span className="text-[10px] text-emerald-300 font-mono">Northern Lights</span>
            </button>

            <button
              tx="fx::cyber"
              className="filled fx-cyber md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">🌐</span>
              <span>fx-cyber</span>
              <span className="text-[10px] text-purple-300 font-mono">Grid Circuit</span>
            </button>

            <button
              tx="fx::holo"
              className="filled fx-holo md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">💿</span>
              <span>fx-holo</span>
              <span className="text-[10px] text-pink-300 font-mono">Matrix Shimmer</span>
            </button>

            <button
              tx="fx::flare"
              className="filled fx-flare md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">☀️</span>
              <span>fx-flare</span>
              <span className="text-[10px] text-amber-300 font-mono">Solar Corona</span>
            </button>

            <button
              tx="fx::aqua"
              className="filled fx-aqua md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">🌊</span>
              <span>fx-aqua</span>
              <span className="text-[10px] text-cyan-300 font-mono">Deep Abyssal</span>
            </button>

            <button
              tx="fx::nebula"
              className="filled fx-nebula md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">✨</span>
              <span>fx-nebula</span>
              <span className="text-[10px] text-violet-300 font-mono">Cosmic Stardust</span>
            </button>

            <button
              tx="fx::metal"
              className="filled fx-metal md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">🛡️</span>
              <span>fx-metal</span>
              <span className="text-[10px] text-slate-300 font-mono">Liquid Titanium</span>
            </button>

            <button
              tx="fx::rainbow"
              className="filled fx-rainbow md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">🌈</span>
              <span>fx-rainbow</span>
              <span className="text-[10px] text-yellow-300 font-mono">Spectrum Wave</span>
            </button>

            <button
              tx="fx::glass"
              className="filled fx-glass md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">🧊</span>
              <span>fx-glass</span>
              <span className="text-[10px] text-slate-300 font-mono">Liquid Frosted</span>
            </button>

            <button
              tx="fx::float"
              className="filled fx-float md glow cursor-pointer flex flex-col items-center gap-1 py-3 text-white text-xs font-bold"
            >
              <span className="text-lg">🛸</span>
              <span>fx-float</span>
              <span className="text-[10px] text-sky-300 font-mono">Quantum Lift</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
