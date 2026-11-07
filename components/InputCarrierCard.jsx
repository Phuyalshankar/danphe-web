export default function InputCarrierCard() {
  return (
    <div className="w-full p-4 rounded-3xl bg-slate-900 border border-cyan-500/30 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <span className="text-sm">🗄️</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-300">डेटा प्रविष्टि (Data Input)</span>
            <span className="text-[10px] text-slate-400 font-mono">Two-Way Reactive • Zero Boilerplate</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-500/40 font-bold">
          REACTIVE
        </span>
      </div>

      {/* Input Binding Form */}
      <div className="w-full space-y-2">
        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
          डाटा प्रविष्टि (Input Field bound to note):
        </span>
        <input
          name="note"
          rx="form::note"
          placeholder="उदाहरण: काउन्टर नोट / नाम प्रविष्ट गर्नुहोस्..."
          className="w-full p-3 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-sans placeholder-slate-500 focus:outline-none focus:border-cyan-400"
        />
        <div className="flex items-center justify-between pt-1">
          <span state="db_status" className="text-[11px] text-slate-400 font-mono">
            डाटा सेभ हुन तयार
          </span>
          <button
            tx="form::save"
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs shadow active:scale-95 cursor-pointer flex items-center gap-1.5"
          >
            <span>💾</span>
            <span>सेभ गर्नुहोस्</span>
          </button>
        </div>
      </div>

      {/* Live Preview Display */}
      <div className="pt-2 border-t border-slate-800 space-y-2">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
          प्रत्यक्ष पूर्वावलोकन (Live Note Preview):
        </span>
        <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex flex-col">
            <span rx="form::note" className="text-xs font-bold text-white">
              (टाइप गर्दा यहाँ तुरुन्तै देखिन्छ)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              अहिले भर्खरै
            </span>
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/40 font-bold uppercase">
            SYNCED
          </span>
        </div>
      </div>
    </div>
  );
}
