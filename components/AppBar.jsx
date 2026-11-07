export default function AppBar({ title = "Danphe Native", subtitle = "Titan Bus • Zero-SQL Hardware Engine" }) {
  return (
    <div className="w-full h-14 max-h-14 px-4 py-2 bg-slate-900/90 border-b border-slate-800 shadow-2xl flex items-center justify-between backdrop-blur-md shrink-0">
      <div className="flex items-center gap-2.5 flex-1 min-w-0 mr-2">
        <div className="p-1 rounded-xl bg-purple-950 border border-fuchsia-400/40 shadow-sm shrink-0">
          <span className="text-xl">🦚</span>
        </div>
        <div className="flex flex-col flex-1 min-w-0">
          <span className="text-sm font-black text-white tracking-wide flex items-center gap-1.5">
            <span>{title}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500 text-black font-extrabold uppercase">TITAN</span>
          </span>
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{subtitle}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-400 text-black font-black uppercase shadow">
          ⚡ 0ms HOTPATCH
        </span>
        <span className="text-[9px] font-mono text-emerald-300 font-bold bg-slate-950 px-2 py-0.5 rounded-full border border-emerald-500/40">
          BUS: READY
        </span>
      </div>
    </div>
  );
}
