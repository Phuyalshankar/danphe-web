import CounterCard from '../components/CounterCard';
import InputCarrierCard from '../components/InputCarrierCard';
import { TEL_BATTERY, TEL_ONLINE } from '../registers/TitanRegisters';

export default function HomePage() {
  return (
    <div data-page="0" className="w-full space-y-4">
      {/* Hardware Telemetry Strip */}
      <div className="w-full p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 to-slate-900 border border-purple-500/30 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">Titan Hardware Bus</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1 text-emerald-400">
            <span>🔋</span>
            <span rx={TEL_BATTERY}>98</span>%
          </div>
          <div className="flex items-center gap-1 text-cyan-400">
            <span>📶</span>
            <span rx={TEL_ONLINE}>ON</span>
          </div>
        </div>
      </div>

      {/* 1. 16-Bit Counter Register Card */}
      <CounterCard />

      {/* 2. Carrier Slot Input & TitanDB Card */}
      <InputCarrierCard />
    </div>
  );
}
