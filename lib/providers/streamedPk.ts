import { Match, Channel } from '../types';
import { StreamProvider } from './types';
import { fetchWithTimeout } from './baseProvider';
import { teamsMatch } from '../utils/matching';
import { getCacheManager } from '../cache/cacheManager';
import logger from '../logger';

const STREAMED_API = 'https://streamed.pk/api/matches/football';
const STREAMED_STREAM = 'https://streamed.pk/api/stream';
const TIMEOUT_MS = 5000;
const SHORT_TIMEOUT = 3000;

interface StreamedRawMatch {
  id: string;
  title: string;
  category: string;
  date: number;
  poster?: string;
  popular?: boolean;
  teams?: {
    home?: { name: string; badge?: string };
    away?: { name: string; badge?: string };
  };
  sources?: { source: string; id: string }[];
}

export class StreamedPkProvider implements StreamProvider {
  id = 'streamed';
  name = 'Streamed.pk';

  async fetchRawMatches(): Promise<StreamedRawMatch[]> {
    const cache = getCacheManager();
    return cache.swr('streamed_raw', async () => {
      try {
        const data = await fetchWithTimeout(STREAMED_API, TIMEOUT_MS);
        return Array.isArray(data) ? data : [];
      } catch (err) {
        logger.error('Streamed.pk API request failed', err);
        return [];
      }
    }, 20);
  }

  async fetchMatches(): Promise<Match[]> {
    const raw = await this.fetchRawMatches();
    const now = Date.now();
    return raw.map(m => {
      const kickoffTime = m.date || 0;
      const diffMinutes = kickoffTime ? Math.floor((now - kickoffTime) / 60000) : -1;
      const isLive = kickoffTime && diffMinutes >= -15 && diffMinutes < 140;

      const homeName = m.teams?.home?.name || m.title.split(' vs ')[0] || 'Home';
      const awayName = m.teams?.away?.name || m.title.split(' vs ')[1] || 'Away';
      
      const homeBadge = m.teams?.home?.badge
        ? (m.teams.home.badge.startsWith('http') ? m.teams.home.badge : `https://streamed.pk/api/images/proxy/${m.teams.home.badge}.webp`)
        : '';
      const awayBadge = m.teams?.away?.badge
        ? (m.teams.away.badge.startsWith('http') ? m.teams.away.badge : `https://streamed.pk/api/images/proxy/${m.teams.away.badge}.webp`)
        : '';
      const poster = m.poster
        ? (m.poster.startsWith('http') ? m.poster : `https://streamed.pk${m.poster}`)
        : '';

      const sources = (m.sources || []).map((s, idx) => ({
        source: `streamed-${s.source}`,
        id: s.id,
        url: `${STREAMED_STREAM}/${s.source}/${s.id}`,
        label: `Server ${idx + 1} (${s.source.toUpperCase()})`,
        quality: 'HD'
      }));

      return {
        id: `streamed-${m.id}`,
        title: m.title || `${homeName} vs ${awayName}`,
        sport: 'football',
        status: (isLive ? 'live' : 'upcoming') as 'live' | 'upcoming',
        timestamp: kickoffTime || Date.now(),
        tournament: m.category === 'football' ? 'Football' : (m.category || 'Football'),
        country: '',
        priority: m.popular ? 1 : 2,
        homeTeam: { name: homeName, badge: homeBadge },
        awayTeam: { name: awayName, badge: awayBadge },
        leagueLogo: '',
        poster: poster,
        venue: '',
        note: m.popular ? '🔥 Popular Match' : '',
        sources,
        fallbackChannels: [],
        currentMinute: isLive ? (diffMinutes >= 0 && diffMinutes <= 90 ? `${diffMinutes}'` : "LIVE") : '',
        currentMinuteNumber: isLive ? (diffMinutes >= 0 ? diffMinutes : 0) : -1,
        homeScore: 0,
        awayScore: 0
      };
    });
  }

  private async resolveStreamedStream(source: string, id: string): Promise<{ url: string; quality: string; name?: string }[]> {
    try {
      const url = `${STREAMED_STREAM}/${source}/${id}`;
      const data = await fetchWithTimeout(url, SHORT_TIMEOUT);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((s: any) => ({
          url: s.embedUrl || s.url || '',
          quality: s.hd ? 'HD' : 'SD',
          name: s.language ? `${s.language} (Stream ${s.streamNo || 1})` : `Stream ${s.streamNo || 1}`,
        }));
      }
      if (data?.url || data?.embedUrl || data?.streamUrl || data?.iframe) {
        return [{
          url: data.url || data.embedUrl || data.streamUrl || data.iframe,
          quality: 'HD',
        }];
      }
      return [];
    } catch (err) {
      return [];
    }
  }

  async resolveStreams(
    matchTitle: string,
    homeTeam: string,
    awayTeam: string,
    matchId: string,
    preFetchedMatch?: Match | null
  ): Promise<Channel[]> {
    try {
      const rawMatches = await this.fetchRawMatches();
      const cleanId = matchId.replace(/^streamed-/, '');
      
      let targetMatch = rawMatches.find(m => m.id === cleanId || m.id === matchId);
      if (!targetMatch) {
        targetMatch = rawMatches.find(m => teamsMatch(matchTitle, m.title));
      }

      const sourcesToResolve: { source: string; id: string }[] = [];
      if (targetMatch && targetMatch.sources) {
        sourcesToResolve.push(...targetMatch.sources);
      }

      if (preFetchedMatch?.sources) {
        for (const s of preFetchedMatch.sources) {
          if (s.source.startsWith('streamed-')) {
            const rawSrc = s.source.replace('streamed-', '');
            if (!sourcesToResolve.some(item => item.source === rawSrc && item.id === s.id)) {
              sourcesToResolve.push({ source: rawSrc, id: s.id });
            }
          }
        }
      }

      if (sourcesToResolve.length === 0) return [];

      const streamTasks = sourcesToResolve.map(src =>
        this.resolveStreamedStream(src.source, src.id)
      );

      const streamResults = await Promise.allSettled(streamTasks);
      const channels: Channel[] = [];
      let serverIndex = 1;

      for (const r of streamResults) {
        if (r.status === 'fulfilled') {
          for (const su of r.value) {
            if (su.url) {
              channels.push({
                name: su.name || `Server ${serverIndex++}`,
                url: su.url,
                provider: this.id,
                quality: su.quality || 'HD',
              });
            }
          }
        }
      }

      return channels;
    } catch (err) {
      logger.error('Streamed.pk streams resolution failed', err, { matchTitle });
      return [];
    }
  }
}
