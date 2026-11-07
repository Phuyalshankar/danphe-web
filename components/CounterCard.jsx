export default function CounterCard() {
  return (
    <div className="w-full card glass glow space-y-4 p-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl filled primary flex items-center justify-center">
            <span className="text-base">🔢</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-white">काउन्टर (Counter)</span>
            <span className="text-[10px] text-slate-400 font-mono">DolphinCSS • Zero VDOM Reactive</span>
          </div>
        </div>
        <span className="badge primary rounded-full text-[10px] font-mono font-bold px-2.5 py-0.5">
          LIVE
        </span>
      </div>

      {/* Counter Value Display */}
      <div className="w-full card outlined flex flex-col items-center justify-center p-6 my-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">हालको काउन्टर मान (Value)</span>
        <span rx="counter::value" className="text-5xl font-mono font-black glow my-2">
          0
        </span>
        <span state="counter_status" className="badge success rounded-full text-xs font-bold px-3 py-1">
          तयार (Ready)
        </span>
      </div>

      {/* Three Action Buttons via DolphinCSS */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <button
          tx="counter::inc"
          className="filled primary glow btn-lg rounded-xl cursor-pointer flex flex-col items-center gap-1 py-3"
        >
          <span className="text-lg">➕</span>
          <span className="font-bold text-xs">बढाउनुहोस् (+1)</span>
        </button>

        <button
          tx="counter::dec"
          className="filled secondary glow btn-lg rounded-xl cursor-pointer flex flex-col items-center gap-1 py-3"
        >
          <span className="text-lg">➖</span>
          <span className="font-bold text-xs">घटाउनुहोस् (-1)</span>
        </button>

        <button
          tx="counter::reset"
          className="filled danger glow btn-lg rounded-xl cursor-pointer flex flex-col items-center gap-1 py-3"
        >
          <span className="text-lg">🔄</span>
          <span className="font-bold text-xs">रिसेट (Reset)</span>
        </button>
      </div>
    </div>
  );
}
