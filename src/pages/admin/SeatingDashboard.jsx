import { useState } from 'react';
import SeatingGridConfigurator from './SeatingGridConfigurator';
import AllocationEngineDashboard from './AllocationEngineDashboard';

export default function SeatingDashboard() {
  const [activeTab, setActiveTab] = useState('grid'); // 'grid' or 'allocation'

  return (
    <div className="space-y-6 animate-fade-in text-slate-100">
      
      {/* ── Consolidated Header tabs selector ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <h1 className="text-2xl font-black bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent tracking-tight leading-none">
            Seating & Logistics Manager
          </h1>
          <p className="text-slate-500 text-xs mt-1">
            Construct room blueprints, define seating limits, and execute algorithm-balanced team distributions.
          </p>
        </div>

        {/* Dynamic Glass Tabs Selector */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.05] shrink-0 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('grid')}
            className={`py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'grid'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/25 shadow-glow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            Spatial Configurator
          </button>
          
          <button
            onClick={() => setActiveTab('allocation')}
            className={`py-2 px-4 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
              activeTab === 'allocation'
                ? 'bg-brand-500/20 text-brand-300 border border-brand-500/25 shadow-glow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'
            }`}
          >
            Matchmaking Engine
          </button>
        </div>
      </div>

      {/* ── Active Tab Component Mounting ── */}
      <div className="transition-all duration-300">
        {activeTab === 'grid' ? (
          <SeatingGridConfigurator />
        ) : (
          <AllocationEngineDashboard />
        )}
      </div>

    </div>
  );
}
