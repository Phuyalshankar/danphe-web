export default function InputCarrierCard() {
  return (
    <div className="w-full card glass glow p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl filled fx-cyber flex items-center justify-center">
            <span className="text-base">🗄️</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-white">डेटा प्रविष्टि (Data Input)</span>
            <span className="text-[10px] text-slate-400 font-mono">Two-Way Reactive • fx-crystal & fx-holo</span>
          </div>
        </div>
        <span className="badge fx-holo font-mono font-bold">
          REACTIVE
        </span>
      </div>

      {/* Input Binding Form */}
      <div className="w-full space-y-3">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">
          डाटा प्रविष्टि (Input Field bound to note):
        </span>
        <input
          name="note"
          rx="form::note"
          placeholder="उदाहरण: काउन्टर नोट / नाम प्रविष्ट गर्नुहोस्..."
          className="w-full card outlined fx-glass p-3.5 text-white text-xs font-sans placeholder-slate-400 rounded-xl focus:outline-none"
        />
        <div className="flex items-center justify-between pt-1">
          <span state="db_status" className="text-[11px] text-slate-300 font-mono">
            डाटा सेभ हुन तयार
          </span>
          <button
            tx="form::save"
            className="filled fx-crystal md glow cursor-pointer flex items-center gap-2 text-white"
          >
            <span>💾</span>
            <span className="font-bold text-xs">सेभ गर्नुहोस्</span>
          </button>
        </div>
      </div>

      {/* Live Preview Display with fx-float */}
      <div className="pt-3 border-t border-slate-800 space-y-2">
        <span className="text-[10px] font-mono text-slate-300 uppercase tracking-widest">
          प्रत्यक्ष पूर्वावलोकन (Live Note Preview):
        </span>
        <div className="card outlined fx-float p-3.5 flex items-center justify-between rounded-xl">
          <div className="flex flex-col">
            <span rx="form::note" className="text-sm font-bold text-white">
              (टाइप गर्दा यहाँ तुरुन्तै देखिन्छ)
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              अहिले भर्खरै
            </span>
          </div>
          <span className="badge fx-aurora font-bold uppercase">
            SYNCED
          </span>
        </div>
      </div>
    </div>
  );
}
