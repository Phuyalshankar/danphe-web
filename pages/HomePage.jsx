import CounterCard from '../components/CounterCard';
import InputCarrierCard from '../components/InputCarrierCard';

export default function HomePage() {
  return (
    <div className="w-full space-y-4">
      {/* 🐬 DolphinCSS Telemetry Status Strip */}
      <div className="w-full card glass glow p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-bold text-white uppercase tracking-wider">सिस्टम स्टाटस (System Status)</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="badge success rounded-full px-2.5 py-1">
            🔋 <span rx="battery">100</span>%
          </span>
          <span className="badge primary rounded-full px-2.5 py-1">
            📶 <span rx="network">अनलाइन</span>
          </span>
        </div>
      </div>

      {/* 1. काउन्टर कार्ड (Counter Card) */}
      <CounterCard />

      {/* 2. डाटा प्रविष्टि कार्ड (Input Card) */}
      <InputCarrierCard />
    </div>
  );
}
