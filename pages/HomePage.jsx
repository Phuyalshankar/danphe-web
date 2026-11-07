import CounterCard from '../components/CounterCard';
import InputCarrierCard from '../components/InputCarrierCard';

export default function HomePage() {
  return (
    <div className="w-full space-y-5">
      {/* 🐬 DolphinCSS Telemetry Status Strip with fx-glass and fx badges */}
      <div className="w-full card glass glow fx-glass p-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-3 h-3 rounded-full bg-emerald-400" style={{ boxShadow: '0 0 10px #10b981' }}></span>
          <span className="text-xs font-black text-white uppercase tracking-wider">सिस्टम स्टाटस (System Status)</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="badge fx-aqua">
            🔋 <span rx="battery">100</span>%
          </span>
          <span className="badge fx-neon">
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
