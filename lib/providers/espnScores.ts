import { Match, Channel } from '../types';
import { getCacheManager } from '../cache/cacheManager';
import { teamsMatch, teamSimilarity, normalizeTournament, extractTeamNames } from '../utils/matching';
import logger from '../logger';

const ESPN_ALL_SCOREBOARDS = 'https://site.api.espn.com/apis/site/v2/sports/soccer/all/scoreboard?limit=300';

const TOP_ESPN_LEAGUES = [
  'eng.1',          // Premier League
  'esp.1',          // LaLiga
  'ita.1',          // Serie A
  'ger.1',          // Bundesliga
  'fra.1',          // Ligue 1
  'uefa.champions', // Champions League
  'uefa.europa',    // Europa League
  'eng.2',          // Championship
  'esp.2',          // LaLiga 2
  'ger.2',          // 2. Bundesliga
  'por.1',          // Primeira Liga
  'ned.1',          // Eredivisie
  'tur.1',          // Süper Lig
  'eng.w.1',        // Women's Super League
  'rsa.1',          // South African Premiership
  'rus.1',          // Russian Premier League
  'eng.fa',         // FA Cup
  'eng.league_cup', // Carabao Cup
  'usa.1',          // MLS
  'bra.1',          // Brasileirão
];

export interface EspnEventData {
  id: string;
  name: string;
  state: 'in' | 'pre' | 'post';
  displayClock: string;
  detail: string;
  clock: number;
  kickoffTime: number;
  homeTeam: {
    name: string;
    displayName: string;
    score: number;
    logo?: string;
  };
  awayTeam: {
    name: string;
    displayName: string;
    score: number;
    logo?: string;
  };
  leagueName?: string;
  leagueLogo?: string;
}

export async function fetchEspnLiveScoreboards(): Promise<EspnEventData[]> {
  const cache = getCacheManager();
  return cache.swr('espn_scoreboards_unified_v2', async () => {
    const events: EspnEventData[] = [];
    const seenIds = new Set<string>();

    const fetchLeague = async (url: string) => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(4500) });
        if (!res.ok) return [];
        const data = await res.json();
        const leagueName = data.leagues?.[0]?.name;
        const leagueLogo = data.leagues?.[0]?.logos?.[0]?.href;

        return (data.events || []).map((e: any) => {
          const comp = e.competitions?.[0];
          const homeComp = comp?.competitors?.find((c: any) => c.homeAway === 'home');
          const awayComp = comp?.competitors?.find((c: any) => c.homeAway === 'away');

          const state = (e.status?.type?.state || 'pre') as 'in' | 'pre' | 'post';
          const clock = typeof e.status?.clock === 'number' ? e.status.clock : 0;
          const displayClock = e.status?.displayClock || '';
          const detail = e.status?.type?.detail || displayClock || (state === 'in' ? 'LIVE' : '');

          const homeScore = parseInt(homeComp?.score ?? '0', 10);
          const awayScore = parseInt(awayComp?.score ?? '0', 10);

          let kickoffTime = Date.now();
          if (e.date) {
            const parsed = new Date(e.date).getTime();
            if (!isNaN(parsed)) kickoffTime = parsed;
          }

          return {
            id: String(e.id),
            name: e.name || `${awayComp?.team?.displayName || 'Away'} at ${homeComp?.team?.displayName || 'Home'}`,
            state,
            displayClock,
            detail,
            clock,
            kickoffTime,
            homeTeam: {
              name: homeComp?.team?.name || homeComp?.team?.displayName || 'Home',
              displayName: homeComp?.team?.displayName || homeComp?.team?.name || 'Home',
              score: isNaN(homeScore) ? 0 : homeScore,
              logo: homeComp?.team?.logo || '',
            },
            awayTeam: {
              name: awayComp?.team?.name || awayComp?.team?.displayName || 'Away',
              displayName: awayComp?.team?.displayName || awayComp?.team?.name || 'Away',
              score: isNaN(awayScore) ? 0 : awayScore,
              logo: awayComp?.team?.logo || '',
            },
            leagueName: leagueName || e.season?.slug || '',
            leagueLogo: leagueLogo || '',
          } as EspnEventData;
        });
      } catch (err) {
        return [];
      }
    };

    const requests = [
      fetchLeague(ESPN_ALL_SCOREBOARDS),
      ...TOP_ESPN_LEAGUES.map(lg => fetchLeague(`https://site.api.espn.com/apis/site/v2/sports/soccer/${lg}/scoreboard`))
    ];

    const settled = await Promise.allSettled(requests);
    for (const r of settled) {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        for (const item of r.value) {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            events.push(item);
          }
        }
      }
    }

    return events;
  }, 10);
}

function matchesEspnEvent(match: Match, espn: EspnEventData): boolean {
  // 1. Direct team name comparison
  const hSim = teamSimilarity(match.homeTeam.name, espn.homeTeam.displayName) ||
               teamSimilarity(match.homeTeam.name, espn.homeTeam.name);
  const aSim = teamSimilarity(match.awayTeam.name, espn.awayTeam.displayName) ||
               teamSimilarity(match.awayTeam.name, espn.awayTeam.name);

  if (hSim >= 1.0 && aSim >= 1.0) {
    return true;
  }

  // 2. Cross team similarity (in case home/away reversed in title)
  const cross1 = teamSimilarity(match.homeTeam.name, espn.awayTeam.displayName) ||
                 teamSimilarity(match.homeTeam.name, espn.awayTeam.name);
  const cross2 = teamSimilarity(match.awayTeam.name, espn.homeTeam.displayName) ||
                 teamSimilarity(match.awayTeam.name, espn.homeTeam.name);

  if (cross1 >= 1.0 && cross2 >= 1.0) {
    return true;
  }

  // 3. Fallback to teamsMatch
  return teamsMatch(match.title, espn.name);
}

export async function enrichMatchesWithLiveScores(matches: Match[]): Promise<Match[]> {
  const espnEvents = await fetchEspnLiveScoreboards();
  const matchedEspnIds = new Set<string>();
  const now = Date.now();

  const enriched: Match[] = [];

  for (const m of matches) {
    const base: Match = { ...m };

    // 1. Normalize tournament and logo
    const normalized = normalizeTournament(base.tournament, base.leagueLogo);
    base.tournament = normalized.name;
    base.leagueLogo = normalized.logo || base.leagueLogo;
    base.country = normalized.country || base.country;
    base.priority = normalized.priority;

    // 2. Find matching ESPN live event
    const espn = espnEvents.find(e => matchesEspnEvent(base, e));

    if (espn) {
      matchedEspnIds.add(espn.id);

      // Determine correct home/away alignment
      const isReversed = (teamSimilarity(base.homeTeam.name, espn.awayTeam.displayName) >= 1.0) &&
                         (teamSimilarity(base.awayTeam.name, espn.homeTeam.displayName) >= 1.0);

      const hScore = isReversed ? espn.awayTeam.score : espn.homeTeam.score;
      const aScore = isReversed ? espn.homeTeam.score : espn.awayTeam.score;

      base.homeScore = hScore;
      base.awayScore = aScore;

      // Badges
      if (!base.homeTeam.badge || base.homeTeam.badge.includes('ui-avatars')) {
        const badge = isReversed ? espn.awayTeam.logo : espn.homeTeam.logo;
        if (badge) base.homeTeam.badge = badge;
      }
      if (!base.awayTeam.badge || base.awayTeam.badge.includes('ui-avatars')) {
        const badge = isReversed ? espn.homeTeam.logo : espn.awayTeam.logo;
        if (badge) base.awayTeam.badge = badge;
      }

      // Live status, clock, and detail
      if (espn.state === 'in') {
        base.status = 'live';
        base.currentMinute = espn.detail || espn.displayClock || 'LIVE';
        base.currentMinuteNumber = espn.clock > 0 ? Math.floor(espn.clock / 60) : (espn.detail.includes('HT') ? 45 : 60);
        base.note = '🔴 LIVE';
      } else if (espn.state === 'post') {
        base.status = 'finished' as any;
        base.currentMinute = espn.detail.toLowerCase().includes('post') ? 'Postponed' : 'FT';
        base.currentMinuteNumber = 90;
        base.note = espn.detail.toLowerCase().includes('post') ? 'Postponed' : 'FT';
      } else if (espn.state === 'pre') {
        base.status = 'upcoming';
        base.currentMinute = '';
        base.currentMinuteNumber = -1;
      }
    } else {
      // Unmatched match: check kickoff time sanity
      const kickoffTime = base.timestamp ? new Date(base.timestamp).getTime() : 0;
      const diffMinutes = kickoffTime ? Math.floor((now - kickoffTime) / 60000) : -1;

      if (kickoffTime && diffMinutes > 125) {
        // Match already completed
        base.status = 'finished' as any;
        base.currentMinute = 'FT';
        base.currentMinuteNumber = 90;
      } else if (kickoffTime && diffMinutes >= 0 && diffMinutes <= 125) {
        if (base.status === 'live' || (base.sources && base.sources.length > 0)) {
          base.status = 'live';
          if (!base.currentMinute || base.currentMinute === 'LIVE') {
            base.currentMinute = diffMinutes <= 90 ? `${diffMinutes}'` : '90+';
            base.currentMinuteNumber = diffMinutes;
          }
        }
      }
    }

    enriched.push(base);
  }

  // 3. Inject top-tier live matches from ESPN that are currently active if they aren't already present
  const liveEspnEvents = espnEvents.filter(e => e.state === 'in' && !matchedEspnIds.has(e.id));

  for (const espn of liveEspnEvents) {
    const tournamentMeta = normalizeTournament(espn.leagueName || 'Football', espn.leagueLogo);
    // Only inject recognizable major tournaments (tier 0-3) to avoid obscure clutter
    if (tournamentMeta.priority > 3) continue;

    const slug = `${espn.homeTeam.name}-${espn.awayTeam.name}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const fallbackChannels = [
      { name: 'Sky Sports Premier League', url: 'https://v3.cdnlive.tv/skysportspremierleague/tracks-v1a1/mono.m3u8' },
      { name: 'TNT Sports 1', url: 'https://v3.cdnlive.tv/tntsports1/tracks-v1a1/mono.m3u8' },
      { name: 'beIN Sports 1', url: 'https://v3.cdnlive.tv/beinsports1en/tracks-v1a1/mono.m3u8' },
    ];

    enriched.push({
      id: `espn-${espn.id}`,
      title: `${espn.homeTeam.displayName} vs ${espn.awayTeam.displayName}`,
      sport: 'football',
      status: 'live',
      timestamp: espn.kickoffTime || Date.now(),
      tournament: tournamentMeta.name,
      country: tournamentMeta.country,
      priority: tournamentMeta.priority,
      homeTeam: {
        name: espn.homeTeam.displayName,
        badge: espn.homeTeam.logo || '',
      },
      awayTeam: {
        name: espn.awayTeam.displayName,
        badge: espn.awayTeam.logo || '',
      },
      leagueLogo: tournamentMeta.logo || espn.leagueLogo || '',
      poster: '',
      venue: '',
      note: '🔴 LIVE',
      sources: fallbackChannels.map((c, idx) => ({
        source: 'cdnlive',
        id: `espn-${slug}-${idx}`,
        url: c.url,
        label: `82 Broadcast ${idx + 1} (${c.name})`,
        quality: 'HD',
      })),
      fallbackChannels,
      currentMinute: espn.detail || espn.displayClock || 'LIVE',
      currentMinuteNumber: espn.clock > 0 ? Math.floor(espn.clock / 60) : 45,
      homeScore: espn.homeTeam.score,
      awayScore: espn.awayTeam.score,
    });
  }

  return enriched;
}
