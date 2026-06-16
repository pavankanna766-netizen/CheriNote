import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { BarChart3, Users, Heart, Flame, Globe2, Sparkles } from "lucide-react";
import { AppDatabase } from "../firebase";

const CHART_DATA = [
  { name: "Mon", hearts: 2400, active: 400 },
  { name: "Tue", hearts: 3210, active: 550 },
  { name: "Wed", hearts: 5410, active: 890 },
  { name: "Thu", hearts: 4100, active: 710 },
  { name: "Fri", hearts: 7800, active: 1200 },
  { name: "Sat", hearts: 9810, active: 1540 },
  { name: "Sun", hearts: 12450, active: 1890 }
];

const GLOBAL_REGIONS = [
  { rank: 1, region: "Paris, France", hearts: "8,940", conversion: "94.2%" },
  { rank: 2, region: "Milan, Italy", hearts: "6,802", conversion: "89.5%" },
  { rank: 3, region: "New York, USA", hearts: "5,411", conversion: "84.1%" },
  { rank: 4, region: "Tokyo, Japan", hearts: "3,110", conversion: "91.8%" }
];

export const InsightsPage: React.FC = () => {
  const [activeUsers, setActiveUsers] = useState(42);
  const [globalHearts, setGlobalHearts] = useState(24802);
  const [engagementPulse, setEngagementPulse] = useState("Optimal");

  useEffect(() => {
    let active = true;
    const loadStats = async () => {
      try {
        const hearts = await AppDatabase.getGlobalHeartsCount();
        if (active) setGlobalHearts(hearts);
      } catch (e) {
        console.error("Failed to load global insights statistics:", e);
      }
    };
    loadStats();

    // Dynamic real-time heart trigger simulation
    const interval = setInterval(() => {
      if (active) {
        setActiveUsers(prev => Math.floor(prev + (Math.random() * 4 - 2)));
        setGlobalHearts(prev => prev + (Math.random() > 0.4 ? 1 : 0));
      }
    }, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="w-full min-h-screen text-on-surface flex flex-col justify-start items-center pb-20 px-4 md:px-8 max-w-6xl mx-auto">
      {/* Page intro header */}
      <section className="text-center max-w-xl py-12">
        <span className="text-secondary text-xs uppercase font-extrabold tracking-widest bg-primary-fixed px-3.5 py-1 rounded-full border border-primary-container inline-flex items-center gap-1.5">
          <BarChart3 size={14} /> HEARTS ANALYTICS
        </span>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold text-on-surface tracking-tight mt-3 mb-4">
          Muses Insights
        </h1>
        <p className="text-xs md:text-sm text-on-surface-variant font-light max-w-md mx-auto leading-relaxed">
          Maintain a premium, real-time observational overview of general romantic conversions, interactions, and geographical focus zones.
        </p>
      </section>

      {/* Grid of Key Numerical Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-10">
        {/* Active Lovers */}
        <div className="bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-[#ffeed0] text-amber-700 rounded-xl shrink-0">
            <Users size={24} className="animate-pulse" />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Lovers Active Online</span>
            <span className="font-display text-2xl font-black text-on-surface">{activeUsers}</span>
            <p className="text-[9px] text-green-700 font-mono mt-0.5">✦ Live streaming dynamic</p>
          </div>
        </div>

        {/* Global Hearts Shared */}
        <div className="bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-primary-fixed text-secondary rounded-xl shrink-0">
            <Heart size={24} fill="currentColor" />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Global Hearts Spanned</span>
            <span className="font-display text-2xl font-black text-on-surface">{globalHearts.toLocaleString()}</span>
            <p className="text-[9px] text-secondary font-mono mt-0.5">✦ Synchronizing ledger</p>
          </div>
        </div>

        {/* Conversions sealed */}
        <div className="bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-red-100 text-red-700 rounded-xl shrink-0">
            <Flame size={24} />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">Conversions Sealed</span>
            <span className="font-display text-2xl font-black text-on-surface">91.4%</span>
            <p className="text-[9px] text-[#864e5a] font-mono mt-0.5">✦ Yielding high-tendency</p>
          </div>
        </div>

        {/* Engagement Pulse */}
        <div className="bg-surface-container-lowest border border-primary/10 rounded-2xl p-6 shadow-xs flex items-center gap-4">
          <div className="p-3.5 bg-green-100 text-green-700 rounded-xl shrink-0">
            <Sparkles size={24} />
          </div>
          <div>
            <span className="text-[10px] text-on-surface-variant uppercase font-bold tracking-wider block">System Health Status</span>
            <span className="font-display text-2xl font-black text-on-surface">{engagementPulse}</span>
            <p className="text-[9px] text-green-700 font-mono mt-0.5">✦ Cryptography fully aligned</p>
          </div>
        </div>
      </section>

      {/* Main Insights Chart and Globe map zones */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full">
        {/* Recharts Conversion Plot Chart */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-primary/10 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="font-display font-extrabold text-[#864e5a] text-lg">Weekly Heart Conversions Plot</h3>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-light">Visual timeline tracing system conversion velocity</p>
          </div>

          <div className="h-[280px] w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={CHART_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorHearts" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#bb0026" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#bb0026" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0e0e2" />
                <XAxis dataKey="name" stroke="#864e5a" />
                <YAxis stroke="#864e5a" />
                <Tooltip />
                <Area type="monotone" dataKey="hearts" stroke="#bb0026" fillOpacity={1} fill="url(#colorHearts)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Love Map Zones */}
        <div className="lg:col-span-4 bg-surface-container-lowest border border-primary/10 rounded-3xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-display font-extrabold text-[#864e5a] text-lg flex items-center gap-1.5 justify-start">
              <Globe2 size={18} className="text-secondary animate-spin-slow" /> Focus Zones
            </h3>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-light mb-4">Top geographical coquette love zones</p>
          </div>

          <div className="space-y-4">
            {GLOBAL_REGIONS.map((reg) => (
              <div key={reg.rank} className="flex justify-between items-center p-3 rounded-xl bg-surface-container-low border border-primary/5">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-primary-fixed text-secondary flex items-center justify-center font-bold text-xs">
                    {reg.rank}
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">{reg.region}</h4>
                    <span className="text-[9px] text-[#bb0026] font-semibold">{reg.hearts} custom hearts</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-mono font-bold text-on-surface block">{reg.conversion}</span>
                  <span className="text-[8px] uppercase tracking-wider text-on-surface-variant block">Conversion</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
