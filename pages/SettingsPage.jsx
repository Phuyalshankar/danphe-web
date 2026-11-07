import { SYS_POWER, SYS_THEME_MODE, HW_HAPTIC } from '../registers/TitanRegisters';

export default function SettingsPage() {
  return (
    <div data-page="1" className="w-full space-y-4">
      <div className="w-full p-4 rounded-3xl bg-slate-900 border border-emerald-500/40 shadow-xl space-y-3">
        <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
            सिस्टम कन्फिगरेसन (Settings)
          </span>
          <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950 px-2 py-0.5 rounded-full">
            REG 0x0001
          </span>
        </div>

        <div className="space-y-3 pt-1">
          {/* Power Switch */}
          <div className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">टाइटन मास्टर पावर (SYS_POWER)</span>
              <span className="text-[10px] text-slate-400 font-mono">Register 0x0001</span>
            </div>
            <switch tx={SYS_POWER} className="text-emerald-400" />
          </div>

          {/* Theme Selector */}
          <div className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">युआई थिम (SYS_THEME_MODE)</span>
              <span className="text-[10px] text-slate-400 font-mono">Register 0x000C</span>
            </div>
            <div className="flex items-center gap-2">
              <button tx={SYS_THEME_MODE} txValue={1} className="px-3 py-1.5 rounded-xl bg-slate-800 text-indigo-300 text-xs font-bold border border-indigo-500/30">
                गाढा (Dark)
              </button>
              <button tx={SYS_THEME_MODE} txValue={2} className="px-3 py-1.5 rounded-xl bg-slate-800 text-amber-300 text-xs font-bold border border-amber-500/30">
                उज्यालो (Light)
              </button>
            </div>
          </div>

          {/* Haptic Test */}
          <div className="w-full p-3 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white">ह्याप्टिक कम्पन (HW_HAPTIC)</span>
              <span className="text-[10px] text-slate-400 font-mono">Register 0x3000</span>
            </div>
            <button tx={HW_HAPTIC} txValue={100} className="px-3 py-1.5 rounded-xl bg-purple-950 text-fuchsia-300 text-xs font-bold border border-fuchsia-500/40 cursor-pointer">
              कम्पन जाँच्नुहोस्
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
