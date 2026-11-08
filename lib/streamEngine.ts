import crypto from 'crypto';
import logger from './logger';
import { Match, Channel } from './types';
import { getMatchStats, getLeagues, getTopTeams } from './providers/watchFooty';
import { CdnLiveProvider } from './providers/cdnLive';
import { SportsDataProvider } from './providers/sportsData';
import { enrichMatchesWithLiveScores } from './providers/espnScores';
import { getCacheManager } from './cache/cacheManager';
import { teamsMatch } from './utils/matching';

const SECRET_KEY = process.env.STREAM_SECRET || 'default_stream_hmac_secret_key_123_abc';

export { getMatchStats, getLeagues, getTopTeams };

const providers = [
  new SportsDataProvider(),
];

export function getStreamRedirectUrl(originalUrl: string): string {
  const encoded = Buffer.from(originalUrl).toString('base64url');
  const expires = Date.now() + 4 * 60 * 60 * 1000; // 4 hours expiration
  const signature = crypto
    .createHmac('sha256', SECRET_KEY)
    .update(`${encoded}:${expires}`)
    .digest('hex');
  return `/api/stream-redirect?u=${encoded}&expires=${expires}&sig=${signature}`;
}

export async function getMatches(): Promise<Match[]> {
  const cache = getCacheManager();
  return cache.swr('all_matches', async () => {
    const results = await Promise.allSettled(providers.map(p => p.fetchMatches()));
    
    const allMatches: Match[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') {
        allMatches.push(...r.value);
      }
    }

    if (allMatches.length === 0) return [];

    // Deduplicate and merge matches across providers
    const mergedList: Match[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < allMatches.length; i++) {
      if (usedIndices.has(i)) continue;
      const base = { ...allMatches[i] };
      usedIndices.add(i);

      for (let j = i + 1; j < allMatches.length; j++) {
        if (usedIndices.has(j)) continue;
        const candidate = allMatches[j];

        // Check if fixtures are genuinely the same: same ID, or matching teams within similar timeframe / tournament
        const timeDiffHours = Math.abs((base.timestamp || 0) - (candidate.timestamp || 0)) / (1000 * 60 * 60);
        const baseTourn = (base.tournament || '').toLowerCase();
        const candTourn = (candidate.tournament || '').toLowerCase();
        const isCompatibleTournament = !baseTourn || !candTourn || baseTourn === 'football' || candTourn === 'football' || baseTourn === candTourn;
        const isSameFixture = base.id === candidate.id || (
          teamsMatch(base.title, candidate.title) && (isCompatibleTournament || timeDiffHours <= 3)
        );

        if (isSameFixture) {
          usedIndices.add(j);
          // Merge metadata
          if (candidate.status === 'live') base.status = 'live';
          if (!base.homeTeam.badge && candidate.homeTeam.badge) base.homeTeam.badge = candidate.homeTeam.badge;
          if (!base.awayTeam.badge && candidate.awayTeam.badge) base.awayTeam.badge = candidate.awayTeam.badge;
          if (!base.leagueLogo && candidate.leagueLogo) base.leagueLogo = candidate.leagueLogo;
          if (!base.poster && candidate.poster) base.poster = candidate.poster;
          if (candidate.tournament && (!base.tournament || base.tournament === 'Football')) base.tournament = candidate.tournament;
          if (candidate.country && !base.country) base.country = candidate.country;
          if (candidate.currentMinute) base.currentMinute = candidate.currentMinute;
          if (candidate.currentMinuteNumber > 0) base.currentMinuteNumber = candidate.currentMinuteNumber;
          if (candidate.homeScore > 0 || candidate.awayScore > 0) {
            base.homeScore = candidate.homeScore;
            base.awayScore = candidate.awayScore;
          }
          if (candidate.sources && candidate.sources.length > 0) {
            base.sources = [...(base.sources || []), ...candidate.sources];
          }
          if (candidate.fallbackChannels && candidate.fallbackChannels.length > 0) {
            base.fallbackChannels = [...(base.fallbackChannels || []), ...candidate.fallbackChannels];
          }
        }
      }

      mergedList.push(base);
    }

    // Enrich with authoritative real-time livescores, accurate clocks and verified status
    const enrichedList = await enrichMatchesWithLiveScores(mergedList);

    // Save full list (including finished) to cache for direct match lookup
    await cache.set('all_matches_full', enrichedList, 180);

    // Filter for active fixtures (live and upcoming) for listings
    const activeMatches = enrichedList.filter(m => m.status === 'live' || m.status === 'upcoming');

    // Sort: Live matches first (by prestige priority, then streams, then kickoff), then upcoming (by kickoff, then priority)
    activeMatches.sort((a, b) => {
      if (a.status === 'live' && b.status !== 'live') return -1;
      if (b.status === 'live' && a.status !== 'live') return 1;

      if (a.status === 'live' && b.status === 'live') {
        if (a.priority !== b.priority) return a.priority - b.priority;
        const aHasStreams = (a.sources?.length || 0) > 0 ? 0 : 1;
        const bHasStreams = (b.sources?.length || 0) > 0 ? 0 : 1;
        if (aHasStreams !== bHasStreams) return aHasStreams - bHasStreams;
        return a.timestamp - b.timestamp;
      }

      // Upcoming fixtures
      if (Math.abs(a.timestamp - b.timestamp) > 30 * 60 * 1000) {
        return a.timestamp - b.timestamp;
      }
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.timestamp - b.timestamp;
    });

    return activeMatches;
  }, 60);
}

export async function getLiveMatches(): Promise<Match[]> {
  const matches = await getMatches();
  return matches.filter(m => m.status === 'live');
}

export async function getMatchDetails(matchId: string): Promise<Match | null> {
  const cache = getCacheManager();
  const fullList = await cache.get<Match[]>('all_matches_full');
  const matches = fullList && fullList.length > 0 ? fullList : await getMatches();

  const cleanId = matchId.replace(/^(streamed-|cdnlive-|sportsdata-|espn-)/, '');
  const found = matches.find(m => 
    m.id === matchId || 
    m.id === cleanId || 
    m.id.endsWith(cleanId) ||
    m.id.includes(cleanId)
  );
  if (found) return found;

  return null;
}

export async function resolveAllStreams(
  matchTitle: string,
  matchId: string,
  homeTeam: string,
  awayTeam: string,
  preFetchedMatch: Match | null = null
): Promise<{ url: string; proxiedUrl: string; channels: Channel[]; serverCount: number }> {
  const cache = getCacheManager();
  const cacheKey = `streams_${matchId}`;

  return cache.swr(cacheKey, async () => {
    const resolveTasks = providers.map(async provider => {
      try {
        return await provider.resolveStreams(matchTitle, homeTeam, awayTeam, matchId, preFetchedMatch);
      } catch (err) {
        logger.error(`Provider ${provider.name} failed resolving streams`, err, { matchId });
        return [];
      }
    });

    const results = await Promise.allSettled(resolveTasks);
    const allServers: Channel[] = [];

    for (const r of results) {
      if (r.status === 'fulfilled') {
        allServers.push(...r.value);
      }
    }

    // Filter out any idle, dead, or watchfooty servers
    const filteredServers = allServers.filter(s => 
      s.url && 
      !s.url.toLowerCase().includes('watchfooty') && 
      !s.name?.toLowerCase().includes('watchfooty') &&
      !s.url.toLowerCase().includes('v3.cdnlive.tv')
    );

    if (filteredServers.length === 0) {
      throw new Error('No streams available from any provider');
    }

    const qualityOrder: Record<string, number> = { 'FHD': 0, 'HD': 0, '1080p': 0, '720p': 1, 'SD': 2 };
    filteredServers.sort((a, b) => {
      const aUrl = (a.url || '').toLowerCase();
      const bUrl = (b.url || '').toLowerCase();
      const aName = (a.name || '').toUpperCase();
      const bName = (b.name || '').toUpperCase();

      const aIsAd = aUrl.includes('genoads');
      const bIsAd = bUrl.includes('genoads');
      if (aIsAd && !bIsAd) return 1;
      if (!aIsAd && bIsAd) return -1;

      const aIsPremium = /SKY|FUBO|BEIN|PARAMOUNT|TNT|SUPERSPORT|DAZN|CANAL|OPTUS|PREMIER/.test(aName);
      const bIsPremium = /SKY|FUBO|BEIN|PARAMOUNT|TNT|SUPERSPORT|DAZN|CANAL|OPTUS|PREMIER/.test(bName);
      if (aIsPremium && !bIsPremium) return -1;
      if (!aIsPremium && bIsPremium) return 1;

      const aHls = aUrl.includes('.m3u8') ? 0 : 1;
      const bHls = bUrl.includes('.m3u8') ? 0 : 1;
      if (aHls !== bHls) return aHls - bHls;
      return (qualityOrder[a.quality || 'SD'] || 2) - (qualityOrder[b.quality || 'SD'] || 2);
    });

    const seenUrls = new Set<string>();
    const uniqueServers: Channel[] = [];
    let serverIndex = 1;

    for (const server of filteredServers) {
      if (server.url && !seenUrls.has(server.url)) {
        seenUrls.add(server.url);
        uniqueServers.push({
          ...server,
          name: server.name || `82 Server ${serverIndex++}`,
          proxiedUrl: getStreamRedirectUrl(server.url),
        });
      }
    }

    return {
      url: uniqueServers[0].url,
      proxiedUrl: uniqueServers[0].proxiedUrl || getStreamRedirectUrl(uniqueServers[0].url),
      channels: uniqueServers,
      serverCount: uniqueServers.length,
    };
  }, 10);
}
