import { Match, Channel } from '../types';
import { StreamProvider } from './types';
import { fetchWithTimeout } from './baseProvider';
import { teamsMatch } from '../utils/matching';
import { getCacheManager } from '../cache/cacheManager';
import logger from '../logger';

const CDN_LIVE_API = 'https://api.cdnlivetv.tv/api/v1/events/sports/?user=cdnlivetv&plan=free';
const TIMEOUT_MS = 5000;

interface CdnliveRawMatch {
  gameID: string;
  event?: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamIMG?: string;
  awayTeamIMG?: string;
  tournament: string;
  country: string;
  countryIMG?: string;
  status: string;
  start: string;
  end: string;
  channels: { id?: string; channel_name: string; url: string }[];
}

export class CdnLiveProvider implements StreamProvider {
  id = 'cdnlive';
  name = 'CDNLiveTV';

  async fetchRawMatches(): Promise<CdnliveRawMatch[]> {
    const cache = getCacheManager();
    return cache.swr('cdnlive_raw', async () => {
      try {
        const data = await fetchWithTimeout(CDN_LIVE_API, TIMEOUT_MS);
        const sportsData = data?.['cdn-live-tv'] || {};
        const soccerEvents = sportsData['Soccer'] || sportsData['Football'] || [];
        return Array.isArray(soccerEvents) ? soccerEvents : [];
      } catch (err) {
        logger.error('CDNLiveTV API request failed', err);
        return [];
      }
    }, 30);
  }

  async fetchMatches(): Promise<Match[]> {
    const events = await this.fetchRawMatches();
    const now = Date.now();
    return events.map(event => {
      let kickoffTime = 0;
      if (event.start) {
        const parsed = new Date(event.start.replace(' ', 'T') + 'Z').getTime();
        kickoffTime = isNaN(parsed) ? 0 : parsed;
      }
      const isExplicitLive = event.status === 'LIVE' || event.status === '1H' || event.status === '2H' || event.status === 'HT';
      const diffMinutes = kickoffTime ? Math.floor((now - kickoffTime) / 60000) : -1;
      const isTimeLive = kickoffTime && diffMinutes >= 0 && diffMinutes < 140;
      const isLive = isExplicitLive || isTimeLive;

      const channels = (event.channels || []).map((ch, idx) => ({
        source: 'cdnlive',
        id: ch.id || String(idx),
        url: ch.url,
        label: ch.channel_name || `Server ${idx + 1} (CDNLive)`,
        quality: 'HD'
      }));

      return {
        id: `cdnlive-${event.gameID}`,
        title: event.event || `${event.homeTeam || 'Home'} vs ${event.awayTeam || 'Away'}`,
        sport: 'football',
        status: (isLive ? 'live' : 'upcoming') as 'live' | 'upcoming',
        timestamp: kickoffTime || Date.now(),
        tournament: event.tournament || 'Football',
        country: event.country || '',
        priority: 3,
        homeTeam: { name: event.homeTeam || 'Home', badge: event.homeTeamIMG || '' },
        awayTeam: { name: event.awayTeam || 'Away', badge: event.awayTeamIMG || '' },
        leagueLogo: '',
        poster: '',
        venue: '',
        note: event.tournament || '',
        sources: channels,
        fallbackChannels: (event.channels || []).map(ch => ({ name: ch.channel_name || 'CDNLive', url: ch.url })),
        currentMinute: isLive ? (event.status !== 'NS' ? event.status : "LIVE") : '',
        currentMinuteNumber: isLive ? (diffMinutes >= 0 ? diffMinutes : 45) : -1,
        homeScore: 0,
        awayScore: 0
      };
    });
  }

  async resolveStreams(
    matchTitle: string,
    homeTeam: string,
    awayTeam: string,
    matchId: string,
    preFetchedMatch?: Match | null
  ): Promise<Channel[]> {
    try {
      const events = await this.fetchRawMatches();
      const rawId = matchId.replace(/^cdnlive-/, '');
      
      let targetEvent = events.find(e => e.gameID === rawId || e.gameID === matchId);
      if (!targetEvent) {
        targetEvent = events.find(e => {
          const eventTitle = e.event || `${e.homeTeam || ''} vs ${e.awayTeam || ''}`;
          return teamsMatch(matchTitle, eventTitle);
        });
      }

      if (targetEvent && targetEvent.channels) {
        return targetEvent.channels
          .filter(ch => ch.url)
          .map((ch, idx) => ({
            name: ch.channel_name || `Server ${idx + 1} (CDNLive)`,
            url: ch.url,
            provider: this.id,
            quality: 'HD',
          }));
      }

      if (preFetchedMatch?.fallbackChannels) {
        return preFetchedMatch.fallbackChannels.map((ch, idx) => ({
          name: ch.name || `Server ${idx + 1} (CDNLive)`,
          url: ch.url,
          provider: this.id,
          quality: 'HD',
        }));
      }

      return [];
    } catch (err) {
      logger.error('CDNLive streams resolution failed', err, { matchTitle });
      return [];
    }
  }
}
