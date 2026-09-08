'use client';

import { useState, useEffect, useCallback } from 'react';
import LiveMinute from './LiveMinute';
import EightyTwoBadge from './EightyTwoBadge';

export default function LiveScoreboard({ matchId, initial }) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [activeTheme, setActiveTheme] = useState('orange');

  const themes = {
    orange: {
      name: '82 Atomic Orange',
      glow1: 'bg-[#ff6b35]/15',
      glow2: 'bg-[#1a2540]/30',
      border: 'border-[#ff6b35]/30',
      shadow: 'shadow-[0_0_50px_rgba(255,107,53,0.18)]',
      accent: 'text-[#ff6b35]',
      ring: 'ring-[#ff6b35]/40 border-[#ff6b35]/30',
    },
    emerald: {
      name: 'Emerald Stadium',
      glow1: 'bg-emerald-600/12',
      glow2: 'bg-teal-600/5',
      border: 'border-emerald-500/20',
      shadow: 'shadow-[0_0_50px_rgba(16,185,129,0.12)]',
      accent: 'text-emerald-400',
      ring: 'ring-emerald-500/35 border-emerald-500/20',
    },
    crimson: {
      name: 'Crimson Derby',
      glow1: 'bg-red-600/10',
      glow2: 'bg-rose-600/5',
      border: 'border-red-500/20',
      shadow: 'shadow-[0_0_50px_rgba(239,68,68,0.12)]',
      accent: 'text-red-400',
      ring: 'ring-red-500/35 border-red-500/20',
    },
    amber: {
      name: 'Cyber Amber',
      glow1: 'bg-amber-600/10',
      glow2: 'bg-yellow-600/5',
      border: 'border-amber-500/20',
      shadow: 'shadow-[0_0_50px_rgba(245,158,11,0.12)]',
      accent: 'text-amber-400',
      ring: 'ring-amber-500/35 border-amber-500/20',
    }
  };

  const t = themes[activeTheme] || themes.orange;

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/match/${matchId}`);
      const json = await res.json();
      if (json.match) setData(json.match);
    } catch (e) {
      // Silent catch
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('scoreboard_theme');
      if (saved && themes[saved]) {
        setActiveTheme(saved);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (data.status !== 'live') return;
    const interval = setInterval(refresh, 30000);
    return () => clearInterval(interval);
  }, [data.status, refresh]);

  const changeTheme = (tKey) => {
    setActiveTheme(tKey);
    try {
      localStorage.setItem('scoreboard_theme', tKey);
    } catch (e) {}
  };

  return (
    <div className={`relative overflow-hidden rounded-2xl border bg-[#0a0f1c] px-6 py-6 shadow-2xl transition-all duration-500 ${t.border} ${t.shadow}`}>
      {/* Dynamic Glow backgrounds */}
      <div className={`absolute top-0 left-1/4 w-[280px] h-[280px] pointer-events-none filter blur-3xl transition-all duration-500 ${t.glow1}`} />
      <div className={`absolute bottom-0 right-1/4 w-[280px] h-[280px] pointer-events-none filter blur-3xl transition-all duration-500 ${t.glow2}`} />

      {/* Floating Scoreboard Theme Selector */}
      <div className="absolute top-3.5 right-4 z-20 flex items-center gap-1.5 bg-[#07090f]/80 backdrop-blur-md border border-[#1e2e48] px-2.5 py-1 rounded-full shadow-lg">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mr-1 select-none">82 Style</span>
        {Object.keys(themes).map((tKey) => {
          const isActive = activeTheme === tKey;
          return (
            <button
              key={tKey}
              onClick={() => changeTheme(tKey)}
              className={`h-3.5 w-3.5 rounded-full transition-all duration-300 ${
                tKey === 'orange' ? 'bg-[#ff6b35]' :
                tKey === 'emerald' ? 'bg-emerald-500' :
                tKey === 'crimson' ? 'bg-red-500' : 'bg-amber-500'
              } ${
                isActive 
                  ? 'scale-110 ring-2 ring-white shadow-md shadow-black/80' 
                  : 'scale-90 opacity-40 hover:opacity-90 hover:scale-100'
              }`}
              title={`Switch theme to ${themes[tKey].name}`}
            />
          );
        })}
      </div>

      <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 mt-2">
        
        {/* Home Team */}
        <div className="flex flex-col items-center gap-3 min-w-0 flex-1 md:items-end">
          <div className="flex flex-col items-center md:items-end gap-2.5">
            {data.homeBadge ? (
              <img 
                src={data.homeBadge} 
                alt="" 
                className={`h-16 w-16 rounded-full object-contain bg-[#141c2e] p-1.5 ring-2 shadow-lg transition-all duration-500 ${t.ring}`} 
              />
            ) : (
              <div className={`h-16 w-16 rounded-full bg-[#141c2e] border flex items-center justify-center text-slate-400 text-xl font-black transition-all duration-500 ${t.border}`}>
                {data.homeName?.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-base font-black text-white text-center md:text-right truncate max-w-[200px]">{data.homeName}</span>
          </div>
        </div>

        {/* Score Center Board */}
        <div className={`flex items-center gap-6 shrink-0 bg-[#07090f]/80 border rounded-2xl px-6 py-4 shadow-inner transition-all duration-500 ${t.border}`}>
          <span className="text-4xl sm:text-5xl font-black tabular-nums text-white tracking-tighter">{data.homeScore}</span>
          
          <div className="flex flex-col items-center">
            <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1.5">82 Minute</span>
            <LiveMinute apiMinute={data.currentMinute} apiMinuteNumber={data.currentMinuteNumber} />
          </div>

          <span className="text-4xl sm:text-5xl font-black tabular-nums text-white tracking-tighter">{data.awayScore}</span>
        </div>

        {/* Away Team */}
        <div className="flex flex-col items-center gap-3 min-w-0 flex-1 md:items-start">
          <div className="flex flex-col items-center md:items-start gap-2.5">
            {data.awayBadge ? (
              <img 
                src={data.awayBadge} 
                alt="" 
                className={`h-16 w-16 rounded-full object-contain bg-[#141c2e] p-1.5 ring-2 shadow-lg transition-all duration-500 ${t.ring}`} 
              />
            ) : (
              <div className={`h-16 w-16 rounded-full bg-[#141c2e] border flex items-center justify-center text-slate-400 text-xl font-black transition-all duration-500 ${t.border}`}>
                {data.awayName?.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-base font-black text-white text-center md:text-left truncate max-w-[200px]">{data.awayName}</span>
          </div>
        </div>

      </div>

      {/* Info footer */}
      <div className={`relative z-10 mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs font-semibold text-slate-400 border-t pt-4 transition-all duration-500 ${t.border}`}>
        {data.tournament && (
          <span className="flex items-center gap-1.5 bg-[#141c2e]/70 border border-[#1e2e48] px-3 py-1 rounded-full text-slate-300">
            {data.leagueLogo && (
              <img src={data.leagueLogo} alt="" className="h-4 w-4 rounded-full object-contain bg-[#07090f]" />
            )}
            {data.tournament}
          </span>
        )}
        <span className="bg-[#141c2e]/70 border border-[#1e2e48] px-3 py-1 rounded-full text-slate-300">
          {data.dateStr} &middot; {data.timeStr}
        </span>
        {data.venue && data.venue !== 'N/A' && (
          <span className="bg-[#141c2e]/70 border border-[#1e2e48] px-3 py-1 rounded-full text-slate-300">
            🏟️ {data.venue}
          </span>
        )}
      </div>
    </div>
  );
}
