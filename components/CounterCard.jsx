export default function CounterCard() {
  return (
    <div className="w-full card glass glow p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl filled fx-holo flex items-center justify-center">
            <span className="text-base">🔢</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-white">काउन्टर (Counter)</span>
            <span className="text-[10px] text-slate-400 font-mono">DolphinCSS 2.0 • fx-neon / fx-aqua / fx-flare</span>
          </div>
        </div>
        <span className="badge fx-aurora font-mono font-bold">
          LIVE
        </span>
      </div>

      {/* Counter Value Display */}
      <div className="w-full card outlined fx-glass flex flex-col items-center justify-center p-6 my-2">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">हालको काउन्टर मान (Value)</span>
        <span rx="counter::value" className="text-5xl font-mono font-black glow my-2">
          0
        </span>
        <span state="counter_status" className="badge fx-neon font-bold mt-1">
          तयार (Ready)
        </span>
      </div>

      {/* Three Action Buttons via DolphinCSS Special Variant FX Classes */}
      <div className="grid grid-cols-3 gap-3 pt-2">
        <button
          tx="counter::inc"
          className="filled fx-neon md glow cursor-pointer flex flex-col items-center gap-1 py-3.5"
        >
          <span className="text-xl">➕</span>
          <span className="text-xs font-bold">बढाउनुहोस् (+1)</span>
        </button>

        <button
          tx="counter::dec"
          className="filled fx-aqua md glow cursor-pointer flex flex-col items-center gap-1 py-3.5"
        >
          <span className="text-xl">➖</span>
          <span className="text-xs font-bold">घटाउनुहोस् (-1)</span>
        </button>

        <button
          tx="counter::reset"
          className="filled fx-flare md glow cursor-pointer flex flex-col items-center gap-1 py-3.5"
        >
          <span className="text-xl">🔄</span>
          <span className="text-xs font-bold">रिसेट (Reset)</span>
        </button>
      </div>
    </div>
  );
}
