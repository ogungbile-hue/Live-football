'use client';

import { useState } from 'react';
import { BarChart3, MessageSquare, ChevronDown, ChevronUp, Zap } from 'lucide-react';

export default function MatchStatsSection({ teamStats, commentary, homeTeam, awayTeam }) {
  const [showStats, setShowStats] = useState(true);
  const [showCommentary, setShowCommentary] = useState(false);

  if (!teamStats.length && !commentary.length) return null;

  return (
    <div className="space-y-5">
      {/* 82 Match Statistics panel */}
      {teamStats.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-[#1e2e48] bg-white dark:bg-[#0a0f1c] overflow-hidden shadow-xl">
          <button
            onClick={() => setShowStats(!showStats)}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-[#ff6b35] dark:hover:text-[#ff6b35] transition-colors border-b border-slate-200 dark:border-[#1e2e48] cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#ff6b35]/15 border border-[#ff6b35]/30">
                <BarChart3 className="h-4 w-4 text-[#ff6b35]" />
              </div>
              <span className="font-black text-slate-900 dark:text-white">82 Fixture Statistics</span>
            </span>
            {showStats ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          
          {showStats && (
            <div className="px-6 py-6 space-y-5">
              {/* Teams Header row */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-[#1e2e48]">
                <div className="flex items-center gap-2.5">
                  {homeTeam?.badge && (
                    <img src={homeTeam.badge} alt="" className="h-6 w-6 rounded-full object-contain bg-slate-100 dark:bg-[#141c2e] ring-1 ring-slate-200 dark:ring-[#1e2e48]" />
                  )}
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">{homeTeam?.name || 'Home'}</span>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#ff6b35]">Comparison</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">{awayTeam?.name || 'Away'}</span>
                  {awayTeam?.badge && (
                    <img src={awayTeam.badge} alt="" className="h-6 w-6 rounded-full object-contain bg-slate-100 dark:bg-[#141c2e] ring-1 ring-slate-200 dark:ring-[#1e2e48]" />
                  )}
                </div>
              </div>

              {/* Stats Rows */}
              {teamStats[0]?.statistics?.map((stat, idx) => {
                const homeVal = teamStats[0]?.statistics?.[idx]?.displayValue || '-';
                const awayVal = teamStats[1]?.statistics?.[idx]?.displayValue || '-';
                const homePct = teamStats[0]?.statistics?.[idx]?.percentage || 50;
                const awayPct = teamStats[1]?.statistics?.[idx]?.percentage || 50;
                
                const homeNum = parseFloat(homeVal) || 0;
                const awayNum = parseFloat(awayVal) || 0;
                const homeLeads = homeNum > awayNum;
                const awayLeads = awayNum > homeNum;

                return (
                  <div key={`${stat.name || 'stat'}-${idx}`} className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className={`font-black tabular-nums min-w-[3ch] text-left ${homeLeads ? 'text-[#ff6b35]' : 'text-slate-700 dark:text-slate-300'}`}>
                        {homeVal}
                      </span>
                      <span className="text-slate-500 dark:text-[#8a96b8] text-[11px] font-black uppercase tracking-wider">
                        {stat.label || stat.name}
                      </span>
                      <span className={`font-black tabular-nums min-w-[3ch] text-right ${awayLeads ? 'text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {awayVal}
                      </span>
                    </div>
                    {/* Visual bar split */}
                    <div className="flex h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-[#07090f] border border-slate-200 dark:border-[#1e2e48] gap-0.5">
                      <div
                        className={`rounded-l-full transition-all duration-700 ease-out ${
                          homeLeads 
                            ? 'bg-gradient-to-r from-[#ff6b35] to-orange-400 shadow-[0_0_8px_rgba(255,107,53,0.35)]' 
                            : 'bg-gradient-to-r from-[#ff6b35]/60 to-orange-400/40'
                        }`}
                        style={{ width: `${homePct}%` }}
                      />
                      <div
                        className={`rounded-r-full transition-all duration-700 ease-out ml-auto ${
                          awayLeads 
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.3)]' 
                            : 'bg-gradient-to-r from-emerald-500/40 to-emerald-400/30'
                        }`}
                        style={{ width: `${awayPct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 pt-3 border-t border-slate-200 dark:border-[#1e2e48]">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#ff6b35] to-orange-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{homeTeam?.name || 'Home'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">{awayTeam?.name || 'Away'}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Commentary log panel */}
      {commentary.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-[#1e2e48] bg-white dark:bg-[#0a0f1c] overflow-hidden shadow-xl">
          <button
            onClick={() => setShowCommentary(!showCommentary)}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-bold text-slate-700 dark:text-slate-300 hover:text-[#ff6b35] dark:hover:text-[#ff6b35] transition-colors border-b border-slate-200 dark:border-[#1e2e48] cursor-pointer"
          >
            <span className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <MessageSquare className="h-4 w-4 text-emerald-400" />
              </div>
              <span className="font-black text-slate-900 dark:text-white">82 Live Match Telemetry Log</span>
              <span className="text-[10px] font-black text-[#ff6b35] bg-[#ff6b35]/10 border border-[#ff6b35]/25 px-2 py-0.5 rounded-full">
                {commentary.length} events
              </span>
            </span>
            {showCommentary ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          
          {showCommentary && (
            <div className="px-5 py-4 space-y-0 max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1e2e48]/60">
              {commentary.slice(0, 30).map((item, idx) => {
                const eventType = (item.type || '').toLowerCase();
                const isGoal = eventType.includes('goal');
                const isCard = eventType.includes('card') || eventType.includes('yellow') || eventType.includes('red');
                const isSub = eventType.includes('sub');

                let timeBg = 'bg-[#ff6b35]/15 border-[#ff6b35]/30 text-[#ff6b35]';
                if (isGoal) timeBg = 'bg-emerald-950/40 border-emerald-900/60 text-emerald-400';
                else if (isCard) timeBg = 'bg-amber-950/40 border-amber-900/60 text-amber-400';
                else if (isSub) timeBg = 'bg-sky-950/40 border-sky-900/60 text-sky-400';

                return (
                  <div key={idx} className="flex gap-4 text-xs py-3.5 items-start">
                    {/* Time badge */}
                    <span className={`shrink-0 font-mono font-black w-14 text-center border px-2 py-0.5 rounded-md text-[11px] ${timeBg}`}>
                      {item.time?.displayValue || 'KO'}
                    </span>
                    
                    {/* Log description */}
                    <div className="space-y-1 flex-1">
                      <p className={`font-medium leading-relaxed ${isGoal ? 'text-emerald-300 font-bold' : 'text-slate-700 dark:text-slate-300'}`}>
                        {isGoal && '⚽ '}{isCard && '🟨 '}{isSub && '🔄 '}{item.text}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
