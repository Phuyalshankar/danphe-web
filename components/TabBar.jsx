import { SYS_ROUTE } from '../registers/TitanRegisters';

export default function TabBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 w-full h-16 max-h-16 px-4 py-2 bg-slate-900 border-t border-slate-700 shadow-2xl flex flex-row items-center justify-around gap-3 shrink-0">
      <button
        tx={SYS_ROUTE}
        txValue={0}
        data-tab="0"
        className="flex-1 py-2.5 px-3 rounded-2xl bg-cyan-400 text-slate-950 font-black text-xs shadow-lg active:scale-95 cursor-pointer flex items-center justify-center"
      >
        🏠 होम (Home)
      </button>

      <button
        tx={SYS_ROUTE}
        txValue={1}
        data-tab="1"
        className="flex-1 py-2.5 px-3 rounded-2xl bg-slate-800 text-white font-black text-xs border border-slate-600 shadow-lg active:scale-95 cursor-pointer flex items-center justify-center"
      >
        ⚙️ सेटिङ (Settings)
      </button>
    </div>
  );
}
