'use client';

import Link from 'next/link';
import { Play, Clock, ShieldAlert, Star, Radio } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { isTeamFavorited, toggleFavoriteTeam } from '@/lib/utils/favorites';

function TeamBadge({ team, size = 'h-9 w-9' }) {
  const [imgError, setImgError] = useState(false);
  const hasBadge = team.badge && !imgError;
  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(team.name)}&background=141c2e&color=ff6b35&size=128&bold=true&format=png`;

  if (hasBadge) {
    return (
      <img
        src={team.badge}
        alt={team.name}
        className={`${size} rounded-full object-contain bg-white dark:bg-[#07090f] p-0.5 ring-1 ring-slate-200 dark:ring-[#1e2e48] group-hover:ring-[#ff6b35]/60 group-hover:scale-110 transition-all duration-300 shadow-sm`}
        loading="lazy"
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <img
      src={fallbackUrl}
      alt={team.name}
      className={`${size} rounded-full object-contain group-hover:scale-110 transition-all duration-300 ring-1 ring-slate-200 dark:ring-[#1e2e48]`}
      loading="lazy"
    />
  );
}

export default function MatchCard({ match, tab }) {
  const { id, status, timestamp, homeTeam, awayTeam, sources, tournament, homeScore, awayScore, leagueLogo, currentMinuteNumber } = match;

  const [liveData, setLiveData] = useState(null);
  const [homeFav, setHomeFav] = useState(false);
  const [awayFav, setAwayFav] = useState(false);
  const polling = useRef(null);

  useEffect(() => {
    const checkFavs = () => {
      setHomeFav(isTeamFavorited(homeTeam?.name));
      setAwayFav(isTeamFavorited(awayTeam?.name));
    };
    checkFavs();
    window.addEventListener('favorites-updated', checkFavs);
    return () => {
      window.removeEventListener('favorites-updated', checkFavs);
    };
  }, [homeTeam?.name, awayTeam?.name]);

  useEffect(() => {
    if (status !== 'live') { setLiveData(null); return; }
    const poll = async () => {
      try {
        const res = await fetch(`/api/match/${id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.match) setLiveData(data.match);
      } catch {}
    };
    poll();
    polling.current = setInterval(poll, 30000);
    return () => { if (polling.current) clearInterval(polling.current); polling.current = null; };
  }, [id, status]);

  const liveMinute = liveData?.currentMinute || match.currentMinute;
  const liveMinuteNumber = liveData?.currentMinuteNumber ?? match.currentMinuteNumber;
  const displayHomeScore = liveData?.homeScore ?? homeScore;
  const displayAwayScore = liveData?.awayScore ?? awayScore;

  const currentMinute = liveMinute || (liveMinuteNumber ? `${liveMinuteNumber}'` : '');
  const timeStr = status === 'live'
    ? (currentMinute ? `${currentMinute}` : 'LIVE')
    : new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const timeLeft = status === 'upcoming' ? getTimeLeft(timestamp) : '';
  const isMatchFavorited = homeFav || awayFav;

  return (
    <Link
      href={`/watch/${id}?tab=${tab || 'live'}`}
      className={`group relative flex flex-col rounded-xl glass-panel glass-panel-hover p-4 shadow-md hover:shadow-lg dark:hover:shadow-[0_0_30px_rgba(255,107,53,0.2)] transition-all duration-500 ${
        isMatchFavorited 
          ? 'border-[#ff6b35]/40 bg-gradient-to-br from-orange-50/40 via-white to-orange-50/20 ring-1 ring-[#ff6b35]/30 shadow-[0_10px_30px_rgba(255,107,53,0.1)] dark:border-[#ff6b35]/40 dark:bg-gradient-to-br dark:from-[#ff6b35]/10 dark:via-[#0d1527]/80 dark:to-[#07090f]/90 dark:ring-1 dark:ring-[#ff6b35]/25 dark:shadow-[0_0_30px_rgba(255,107,53,0.15)]' 
          : ''
      }`}
    >
      {/* Top Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {status === 'live' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/25 px-2.5 py-0.5 text-[11px] font-black text-red-600 dark:text-red-400 tracking-wider">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
              </span>
              {currentMinute || 'LIVE'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 dark:bg-[#07090f] dark:border-[#1e2e48] px-2.5 py-0.5 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-sm">
              <Clock className="h-3 w-3 text-[#ff6b35]" />
              {timeStr}
            </span>
          )}

          {isMatchFavorited && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 dark:bg-[#ff6b35]/10 border border-orange-200 dark:border-[#ff6b35]/30 px-2 py-0.5 text-[10px] font-black text-[#ff6b35] tracking-wider uppercase animate-pulse">
              <Star className="h-2.5 w-2.5 fill-[#ff6b35]" />
              Starred
            </span>
          )}
        </div>
        {tournament && (
          <span className="text-[11px] font-bold text-slate-600 dark:text-[#8a96b8] truncate max-w-[140px] flex items-center gap-1.5 bg-slate-100 border border-slate-200 dark:bg-[#07090f] dark:border-[#1e2e48] px-2.5 py-0.5 rounded-full shadow-sm" title={tournament}>
            {leagueLogo ? (
              <img src={leagueLogo} alt="" className="h-3.5 w-3.5 rounded-full object-contain bg-slate-50 dark:bg-[#07090f] inline-block shrink-0" />
            ) : (
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b35] inline-block shrink-0" />
            )}
            <span className="truncate">{tournament}</span>
          </span>
        )}
      </div>

      {/* Main scoreboard block */}
      <div className="space-y-3.5 py-1">
        {/* Home Team */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <TeamBadge team={homeTeam} />
            <span className="text-[14px] font-black truncate text-slate-800 dark:text-slate-100 group-hover:text-[#ff6b35] dark:group-hover:text-[#ff6b35] transition-colors">{homeTeam.name}</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavoriteTeam(homeTeam.name);
              }}
              className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-[#141c2e] text-slate-400 hover:text-[#ff6b35] dark:text-slate-500 dark:hover:text-[#ff6b35] active:scale-75 transition-all shrink-0 ml-1 opacity-65 group-hover:opacity-100 cursor-pointer"
              title={homeFav ? "Unfavorite Team" : "Favorite Team"}
            >
              <Star className={`h-3.5 w-3.5 transition-all ${homeFav ? 'fill-[#ff6b35] text-[#ff6b35] drop-shadow-[0_0_4px_rgba(255,107,53,0.6)]' : 'text-slate-400 dark:text-slate-500'}`} />
            </button>
          </div>
          {status === 'live' && displayHomeScore !== undefined && (
            <span className="text-[18px] font-black text-slate-900 dark:text-white tabular-nums shrink-0 bg-slate-100 dark:bg-[#07090f] px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-[#1e2e48] shadow-sm">{displayHomeScore}</span>
          )}
        </div>

        {/* Away Team */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <TeamBadge team={awayTeam} />
            <span className="text-[14px] font-black truncate text-slate-800 dark:text-slate-100 group-hover:text-[#ff6b35] dark:group-hover:text-[#ff6b35] transition-colors">{awayTeam.name}</span>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavoriteTeam(awayTeam.name);
              }}
              className="p-1 rounded-md hover:bg-slate-200/60 dark:hover:bg-[#141c2e] text-slate-400 hover:text-[#ff6b35] dark:text-slate-500 dark:hover:text-[#ff6b35] active:scale-75 transition-all shrink-0 ml-1 opacity-65 group-hover:opacity-100 cursor-pointer"
              title={awayFav ? "Unfavorite Team" : "Favorite Team"}
            >
              <Star className={`h-3.5 w-3.5 transition-all ${awayFav ? 'fill-[#ff6b35] text-[#ff6b35] drop-shadow-[0_0_4px_rgba(255,107,53,0.6)]' : 'text-slate-400 dark:text-slate-500'}`} />
            </button>
          </div>
          {status === 'live' && displayAwayScore !== undefined && (
            <span className="text-[18px] font-black text-slate-900 dark:text-white tabular-nums shrink-0 bg-slate-100 dark:bg-[#07090f] px-2.5 py-0.5 rounded-md border border-slate-200 dark:border-[#1e2e48] shadow-sm">{displayAwayScore}</span>
          )}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-[#1e2e48] to-transparent my-3.5" />

      {/* Footer Info */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[11px] text-slate-500 dark:text-[#8a96b8] font-bold tracking-wide flex items-center gap-1.5">
          {sources.length > 0 ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b35] animate-pulse" />
              <span>{sources.length} 82 stream{sources.length !== 1 ? 's' : ''}</span>
            </>
          ) : (
            <span>Verification pending</span>
          )}
        </span>

        {sources.length > 0 ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-black text-[#ff6b35] group-hover:text-[#ff8554] transition-colors">
            <Play className="h-3 w-3 fill-[#ff6b35]/20 group-hover:scale-110 transition-transform" />
            Watch 82 Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500">
            <ShieldAlert className="h-3.5 w-3.5" />
            Scheduled
          </span>
        )}
      </div>

      {status === 'upcoming' && timeLeft && (
        <div className="mt-3 rounded-lg bg-slate-100 dark:bg-[#07090f] border border-slate-200 dark:border-[#1e2e48] px-3 py-2 text-center text-xs font-bold text-slate-700 dark:text-slate-300 shadow-inner">
          {timeLeft.toLowerCase().trim().includes('starting soon') ? (
            <span className="text-[#ff6b35] font-black animate-pulse">Starting soon</span>
          ) : (
            <>
              Kickoff in <span className="text-[#ff6b35] font-black font-mono">{timeLeft}</span>
            </>
          )}
        </div>
      )}
    </Link>
  );
}

function getTimeLeft(timestamp) {
  const diff = timestamp - Date.now();
  if (diff <= 0) return 'Starting soon';
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
