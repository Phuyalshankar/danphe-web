import AppBar from './components/AppBar';
import TabBar from './components/TabBar';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <div className="w-full h-screen max-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      
      {/* 📱 Reusable Top Navigation AppBar */}
      <AppBar title="Danphe Starter" subtitle="Titan-DB • Zero-SQL Architecture" />

      {/* 🧭 Multi-Screen Viewport Container */}
      <div className="flex-1 w-full p-3 pb-24 overflow-y-auto space-y-4">
        <HomePage />
        <SettingsPage />
      </div>

      {/* 🧭 Reusable Bottom Tab Navigation */}
      <TabBar />

    </div>
  );
}
