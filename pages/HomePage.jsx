import CounterCard from '../components/CounterCard';
import InputCarrierCard from '../components/InputCarrierCard';

export default function HomePage() {
  return (
    <div data-page="0" className="w-full space-y-4">
      {/* Telemetry Status Strip */}
      <div className="w-full p-3 rounded-2xl bg-gradient-to-r from-purple-950/80 to-slate-900 border border-purple-500/30 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">सिस्टम स्टाटस (System Status)</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="flex items-center gap-1 text-emerald-400">
            <span>🔋</span>
            <span rx="battery">100</span>%
          </div>
          <div className="flex items-center gap-1 text-cyan-400">
            <span>📶</span>
            <span rx="network">अनलाइन</span>
          </div>
        </div>
      </div>

      {/* 1. काउन्टर कार्ड (Counter Card) */}
      <CounterCard />

      {/* 2. डाटा प्रविष्टि कार्ड (Input Card) */}
      <InputCarrierCard />
    </div>
  );
}
