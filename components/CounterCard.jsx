import {
  REG_COUNTER,
  ACT_COUNTER_INC,
  ACT_COUNTER_DEC,
  ACT_COUNTER_RESET
} from '../registers/TitanRegisters';

export default function CounterCard() {
  return (
    <div className="w-full p-4 rounded-3xl bg-slate-900 border border-indigo-500/30 shadow-xl space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
            <span className="text-sm">🔢</span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black uppercase tracking-wider text-white">16-Bit Counter Register</span>
            <span className="text-[10px] text-slate-400 font-mono">REG: 0x0200 • Zero VDOM</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded-full border border-cyan-500/40 font-bold">
          LIVE SISO
        </span>
      </div>

      {/* Counter Value Display (Hardware Memory RX) */}
      <div className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center justify-center">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">हालको काउन्टर मान (Value)</span>
        <span rx={REG_COUNTER} className="text-4xl font-mono font-black text-cyan-300 my-1">
          0
        </span>
        <span state="counter_status" className="text-[11px] text-emerald-400 font-bold">
          तयार (Ready)
        </span>
      </div>

      {/* Three Action Buttons (Pure 16-Bit Hardware Register TX) */}
      <div className="grid grid-cols-3 gap-2 pt-1">
        <button
          tx={ACT_COUNTER_INC}
          className="py-3 px-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-black text-xs shadow-lg active:scale-95 cursor-pointer flex flex-col items-center gap-1"
        >
          <span className="text-base">➕</span>
          <span>बढाउनुहोस् (+1)</span>
        </button>

        <button
          tx={ACT_COUNTER_DEC}
          className="py-3 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-black text-xs border border-slate-700 shadow-lg active:scale-95 cursor-pointer flex flex-col items-center gap-1"
        >
          <span className="text-base">➖</span>
          <span>घटाउनुहोस् (-1)</span>
        </button>

        <button
          tx={ACT_COUNTER_RESET}
          className="py-3 px-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 font-black text-xs border border-rose-500/40 shadow-lg active:scale-95 cursor-pointer flex flex-col items-center gap-1"
        >
          <span className="text-base">🔄</span>
          <span>रिसेट (Reset)</span>
        </button>
      </div>
    </div>
  );
}
