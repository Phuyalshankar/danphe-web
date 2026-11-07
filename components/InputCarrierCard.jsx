export default function InputCarrierCard() {
  return (
    <div className="w-full card glass glow space-y-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl filled primary flex items-center justify-center">
            <span className="text-base">🗄️</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-white">डेटा प्रविष्टि (Data Input)</span>
            <span className="text-[10px] text-slate-400 font-mono">Two-Way Reactive • Zero Boilerplate</span>
          </div>
        </div>
        <span className="badge primary rounded-full text-[10px] font-mono font-bold px-2.5 py-0.5">
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
          className="w-full card outlined p-3.5 text-white text-xs font-sans placeholder-slate-500 rounded-xl focus:outline-none"
        />
        <div className="flex items-center justify-between pt-1">
          <span state="db_status" className="text-[11px] text-slate-400 font-mono">
            डाटा सेभ हुन तयार
          </span>
          <button
            tx="form::save"
            className="filled success glow btn-md rounded-xl cursor-pointer flex items-center gap-2 px-4 py-2"
          >
            <span>💾</span>
            <span className="font-bold text-xs">सेभ गर्नुहोस्</span>
          </button>
        </div>
      </div>

      {/* Live Preview Display */}
      <div className="pt-3 border-t border-slate-800 space-y-2">
        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
          प्रत्यक्ष पूर्वावलोकन (Live Note Preview):
        </span>
        <div className="card outlined p-3.5 flex items-center justify-between rounded-xl">
          <div className="flex flex-col">
            <span rx="form::note" className="text-sm font-bold text-white">
              (टाइप गर्दा यहाँ तुरुन्तै देखिन्छ)
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              अहिले भर्खरै
            </span>
          </div>
          <span className="badge success rounded-full text-[9px] px-2 py-0.5 font-bold uppercase">
            SYNCED
          </span>
        </div>
      </div>
    </div>
  );
}
