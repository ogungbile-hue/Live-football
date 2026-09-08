'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Filter, Flame, Calendar, Star, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import MatchCard from './MatchCard';
import EightyTwoBadge from './EightyTwoBadge';
import { useRouter } from 'next/navigation';
import { getFavoriteTeams } from '@/lib/utils/favorites';

export default function MatchGrid({ matches, defaultTab }) {
  const router = useRouter();
  const [tab, setTab] = useState(defaultTab);
  const [search, setSearch] = useState('');
  const [selectedLeagues, setSelectedLeagues] = useState([]);
  const [favorites, setFavorites] = useState([]);

  const scrollRef = useRef(null);

  const scrollLeagues = (direction) => {
    if (!scrollRef.current) return;
    const scrollAmount = 250;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const interval = setInterval(() => { router.refresh(); }, 20000);
    return () => clearInterval(interval);
  }, [router]);

  useEffect(() => {
    const updateFavs = () => {
      setFavorites(getFavoriteTeams());
    };
    updateFavs();
    window.addEventListener('favorites-updated', updateFavs);
    return () => {
      window.removeEventListener('favorites-updated', updateFavs);
    };
  }, []);

  const enrichedMatches = useMemo(() => {
    return matches.map(m => {
      if (m.status === 'upcoming') {
        const now = Date.now();
        const kickoffTime = m.timestamp ? new Date(m.timestamp).getTime() : 0;
        const diffMinutes = kickoffTime ? Math.floor((now - kickoffTime) / 60000) : -1;
        // Promote to live if kickoff time has arrived/passed and less than 135 mins have passed
        if (kickoffTime && diffMinutes >= 0 && diffMinutes < 135) {
          let currentMinuteNumber = m.currentMinuteNumber || 0;
          let currentMinute = m.currentMinute || '';
          
          if (diffMinutes < 45) {
            currentMinuteNumber = diffMinutes;
            currentMinute = `${diffMinutes}'`;
          } else if (diffMinutes >= 45 && diffMinutes < 60) {
            currentMinuteNumber = 45;
            currentMinute = 'HT';
          } else if (diffMinutes >= 60 && diffMinutes < 105) {
            currentMinuteNumber = diffMinutes - 15;
            currentMinute = `${diffMinutes - 15}'`;
          } else {
            currentMinuteNumber = 90;
            currentMinute = '90+';
          }

          return {
            ...m,
            status: 'live',
            currentMinute,
            currentMinuteNumber,
          };
        }
      }
      return m;
    });
  }, [matches]);

  const live = useMemo(() => enrichedMatches.filter(m => m.status === 'live'), [enrichedMatches]);
  const upcoming = useMemo(() => enrichedMatches.filter(m => m.status === 'upcoming'), [enrichedMatches]);

  const baseMatches = tab === 'upcoming' ? upcoming : live;

  const leaguesWithLogos = useMemo(() => {
    const leagueMap = new Map();
    for (const m of baseMatches) {
      if (m.tournament && !leagueMap.has(m.tournament)) {
        leagueMap.set(m.tournament, { name: m.tournament, logo: m.leagueLogo || '' });
      }
    }
    return Array.from(leagueMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [baseMatches]);

  // Synchronize selection: remove any selected league that is no longer active in the current tab
  useEffect(() => {
    setSelectedLeagues(prev => prev.filter(name => leaguesWithLogos.some(l => l.name === name)));
  }, [leaguesWithLogos]);

  const filtered = useMemo(() => {
    let result = baseMatches;
    if (selectedLeagues.length > 0) {
      result = result.filter(m => selectedLeagues.includes(m.tournament));
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(m =>
        m.homeTeam.name.toLowerCase().includes(q) ||
        m.awayTeam.name.toLowerCase().includes(q) ||
        m.title.toLowerCase().includes(q) ||
        m.tournament.toLowerCase().includes(q)
      );
    }
    return result;
  }, [baseMatches, selectedLeagues, search]);

  // Decouple filtered matches into favorited and standard categories
  const { starredMatches, normalMatches } = useMemo(() => {
    const starred = [];
    const normal = [];
    for (const m of filtered) {
      const isHomeFav = favorites.some(f => f.toLowerCase() === m.homeTeam?.name?.toLowerCase());
      const isAwayFav = favorites.some(f => f.toLowerCase() === m.awayTeam?.name?.toLowerCase());
      if (isHomeFav || isAwayFav) {
        starred.push(m);
      } else {
        normal.push(m);
      }
    }
    return { starredMatches: starred, normalMatches: normal };
  }, [filtered, favorites]);

  return (
    <div className="space-y-8 relative">
      {/* 82 Hero Welcome Banner with Animated Badge */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-[#1e2e48] bg-gradient-to-r from-white via-slate-50 to-orange-50/20 dark:from-[#0a0f1c] dark:via-[#0d1527] dark:to-[#141c2e] p-6 sm:p-8 shadow-lg dark:shadow-[0_10px_35px_rgba(0,0,0,0.6)] transition-all duration-300">
        <div className="absolute top-0 right-0 w-[400px] h-full bg-gradient-to-l from-[#ff6b35]/15 dark:from-[#ff6b35]/10 to-transparent pointer-events-none filter blur-2xl" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 border border-orange-200 dark:bg-[#ff6b35]/10 dark:border-[#ff6b35]/25 px-3 py-1 text-xs font-black text-[#ff6b35]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ff6b35] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ff6b35]"></span>
              </span>
              <span>82 LIVE ENGINE &middot; TELEMETRY ONLINE</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              82 <span className="text-[#ff6b35] drop-shadow-[0_0_12px_rgba(255,107,53,0.35)]">LIVE</span> FOOTBALL
            </h1>
            
            <p className="text-sm text-slate-600 dark:text-[#8a96b8] leading-relaxed">
              Ultra-low latency streams, real-time live scoreboards, and instant multi-provider match resolution aggregated by Eighty-Two.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-[#141c2e] border border-slate-200 dark:border-[#1e2e48] text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <Zap className="h-3.5 w-3.5 text-[#ff6b35]" />
                {live.length} Live Fixtures Active
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-[#141c2e] border border-slate-200 dark:border-[#1e2e48] text-[11px] font-bold text-slate-700 dark:text-slate-300">
                <Calendar className="h-3.5 w-3.5 text-[#ff6b35]" />
                {upcoming.length} Upcoming Scheduled
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center justify-center p-2 rounded-2xl bg-white/50 dark:bg-[#07090f]/50 border border-slate-200/50 dark:border-[#1e2e48]/50 filter drop-shadow-[0_0_20px_rgba(255,107,53,0.25)]">
            <EightyTwoBadge size={110} speed={1} />
          </div>
        </div>
      </div>

      {/* Control panel & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-panel p-4 sm:p-5 rounded-xl shadow-md dark:shadow-lg border border-slate-200/80 dark:border-[#1e2e48]/70">
        
        {/* Sliding Tabs */}
        <div className="flex rounded-lg bg-slate-200/70 dark:bg-[#07090f] p-1 border border-slate-300/60 dark:border-[#1e2e48] max-w-xs shrink-0">
          <button
            onClick={() => setTab('live')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              tab === 'live'
                ? 'bg-gradient-to-r from-[#ff6b35] to-[#e0531f] text-white shadow-md shadow-[#ff6b35]/25 scale-[1.02]'
                : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Flame className={`h-3.5 w-3.5 ${tab === 'live' ? 'animate-pulse' : ''}`} />
            Live Now ({live.length})
          </button>
          <button
            onClick={() => setTab('upcoming')}
            className={`flex items-center gap-2 rounded-md px-4 py-2 text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              tab === 'upcoming'
                ? 'bg-gradient-to-r from-[#ff6b35] to-[#e0531f] text-white shadow-md shadow-[#ff6b35]/25 scale-[1.02]'
                : 'text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Calendar className="h-3.5 w-3.5" />
            Upcoming ({upcoming.length})
          </button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center justify-between gap-3 w-full sm:w-auto flex-1 sm:flex-initial">
          
          {/* Search bar */}
          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-[#8a96b8]" />
            <input
              type="text"
              placeholder="Search teams or leagues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 rounded-lg border border-slate-200 bg-white dark:border-[#1e2e48] dark:bg-[#07090f] py-2 pl-9 pr-4 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35]/30 transition-all"
            />
          </div>

        </div>
      </div>

      {/* 82 Tournaments Horizontal Scroll Shelf */}
      {(() => {
        if (leaguesWithLogos.length === 0) return null;

        const isAllSelected = selectedLeagues.length === 0;

        return (
          <div className="space-y-3.5 p-4 sm:p-5 bg-white/85 dark:bg-[#0a0f1c]/70 border border-slate-200/80 dark:border-[#1e2e48]/70 rounded-2xl shadow-sm transition-all duration-300">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-[#8a96b8] flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-[#ff6b35]" />
                Filter by Tournament ({leaguesWithLogos.length})
              </label>
              {!isAllSelected && (
                <button 
                  onClick={() => setSelectedLeagues([])}
                  className="text-[10px] font-black uppercase tracking-wider text-[#ff6b35] hover:text-[#ff8554] transition-colors cursor-pointer"
                >
                  Reset filters
                </button>
              )}
            </div>
            
            {/* Scroll Container Wrapper with Edge Fades */}
            <div className="relative w-full overflow-hidden group/shelf">
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white/90 dark:from-[#0a0f1c] to-transparent pointer-events-none z-10" />
              <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white/90 dark:from-[#0a0f1c] to-transparent pointer-events-none z-10" />
              
              {/* Left scroll chevron */}
              <button 
                onClick={() => scrollLeagues('left')}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 dark:bg-[#141c2e]/95 border border-slate-200 dark:border-[#1e2e48] text-slate-600 dark:text-slate-300 hover:text-[#ff6b35] dark:hover:text-[#ff6b35] shadow-md hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/shelf:opacity-100 cursor-pointer"
                title="Scroll Left"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {/* Right scroll chevron */}
              <button 
                onClick={() => scrollLeagues('right')}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 dark:bg-[#141c2e]/95 border border-slate-200 dark:border-[#1e2e48] text-slate-600 dark:text-slate-300 hover:text-[#ff6b35] dark:hover:text-[#ff6b35] shadow-md hover:scale-105 active:scale-95 transition-all opacity-0 group-hover/shelf:opacity-100 cursor-pointer"
                title="Scroll Right"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>

              <div 
                ref={scrollRef}
                className="flex flex-row flex-nowrap overflow-x-auto gap-1.5 py-1.5 px-1 -mx-1 custom-horizontal-scrollbar scroll-smooth"
              >
                {/* "All Leagues" Pill */}
                <button
                  onClick={() => setSelectedLeagues([])}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all cursor-pointer border shrink-0 ${
                    isAllSelected
                      ? 'bg-[#ff6b35] text-white border-[#ff6b35] shadow-md shadow-[#ff6b35]/25 scale-[1.02]'
                      : 'bg-white dark:bg-[#07090f] text-slate-700 dark:text-slate-400 border-slate-200 dark:border-[#1e2e48] hover:bg-slate-100 dark:hover:bg-[#141c2e] hover:scale-[1.01]'
                  }`}
                >
                  <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                    isAllSelected ? 'bg-white/20' : 'bg-slate-100 dark:bg-[#141c2e] text-slate-500 dark:text-slate-400'
                  }`}>
                    <Star className="h-2 w-2" />
                  </div>
                  <span>All Tournaments</span>
                </button>

                {/* Tournament pills */}
                {leaguesWithLogos.map((l) => {
                  const isActive = selectedLeagues.includes(l.name);
                  const count = baseMatches.filter(m => m.tournament === l.name).length;

                  return (
                    <button
                      key={l.name}
                      onClick={() => {
                        setSelectedLeagues(prev =>
                          prev.includes(l.name)
                            ? prev.filter(name => name !== l.name)
                            : [...prev, l.name]
                        );
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all cursor-pointer border shrink-0 ${
                        isActive
                          ? 'bg-[#ff6b35] text-white border-[#ff6b35] shadow-md shadow-[#ff6b35]/25 scale-[1.02]'
                          : 'bg-white dark:bg-[#07090f] text-slate-700 dark:text-slate-400 border-slate-200 dark:border-[#1e2e48] hover:bg-slate-100 dark:hover:bg-[#141c2e] hover:scale-[1.01]'
                      }`}
                    >
                      {l.logo ? (
                        <img 
                          src={l.logo} 
                          alt="" 
                          className="h-3.5 w-3.5 rounded-full object-contain bg-slate-50 dark:bg-[#141c2e] p-0.5" 
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className={`flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-black ${
                          isActive ? 'bg-white/20' : 'bg-[#ff6b35]/15 text-[#ff6b35]'
                        }`}>
                          {l.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span>{l.name}</span>
                      <span className={`text-[8px] px-1 py-0.2 rounded-md font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-[#141c2e] text-slate-500'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Fixtures Listings */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 glass-panel rounded-xl shadow-md">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 border border-slate-200 dark:bg-[#07090f] dark:border-[#1e2e48] shadow-inner">
            <EightyTwoBadge size={32} isStatic={true} />
          </div>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            {search || selectedLeagues.length > 0 ? 'No matching fixtures found' : tab === 'live' ? 'No live games running' : 'No upcoming fixtures scheduled'}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 dark:text-[#8a96b8] max-w-xs text-center leading-relaxed">
            {search || selectedLeagues.length > 0 ? 'Try adjusting search terms or clearing selected league filters.' : tab === 'live' ? 'Browse the upcoming tab to see what is scheduled next.' : 'Check back later for updated fixtures.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Prioritized Starred Matches list */}
          {starredMatches.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-orange-400/10 border border-[#ff6b35]/30 text-[#ff6b35] animate-pulse">
                  <Star className="h-3.5 w-3.5 fill-[#ff6b35]" />
                </div>
                <h2 className="text-xs font-black uppercase tracking-widest text-[#ff6b35]">Starred Team Fixtures</h2>
                <div className="h-px flex-1 bg-gradient-to-r from-[#ff6b35]/40 via-slate-300 dark:via-[#1e2e48] to-transparent ml-2" />
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
                {starredMatches.map(match => (
                  <MatchCard key={match.id} match={match} tab={tab} />
                ))}
              </div>
            </div>
          )}

          {/* Standard listings */}
          {normalMatches.length > 0 && (
            <div className="space-y-4">
              {starredMatches.length > 0 && (
                <div className="flex items-center gap-2 pt-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-200/80 border border-slate-300/70 text-slate-600 dark:bg-[#141c2e] dark:border-[#1e2e48] dark:text-slate-400">
                    <Calendar className="h-3.5 w-3.5" />
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-[#8a96b8]">Other Fixtures</h2>
                  <div className="h-px flex-1 bg-gradient-to-r from-slate-300/80 dark:from-[#1e2e48] via-slate-200/30 dark:via-[#0a0f1c] to-transparent ml-2" />
                </div>
              )}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:gap-8">
                {normalMatches.map(match => (
                  <MatchCard key={match.id} match={match} tab={tab} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
