import fs from 'fs';
import path from 'path';
import { Match, Channel, StreamSource } from '../types';
import { StreamProvider } from './types';
import { fetchWithTimeout } from './baseProvider';
import { teamsMatch, getLeaguePriority, getCountryForLeague } from '../utils/matching';
import { getCacheManager } from '../cache/cacheManager';
import logger from '../logger';

const SPORTS_DATA_ENDPOINTS = [
  'https://cdn.jsdelivr.net/gh/sm-monirulislam/Upcoming-and-Live-Sports-Data@main/Sports_data.json',
  'https://raw.githubusercontent.com/sm-monirulislam/Upcoming-and-Live-Sports-Data/main/Sports_data.json',
];
const TIMEOUT_MS = 10000;

interface RawStream {
  channel_name?: string;
  stream_url?: string;
  user_agent?: string;
  referer?: string;
  kid?: string;
  key?: string;
}

interface RawSportsEvent {
  status: string;
  Category: string;
  event_name: string;
  eventInfo?: {
    teamA?: string;
    teamB?: string;
    teamAFlag?: string;
    teamBFlag?: string;
    eventName?: string;
    event_logo?: string;
    startTime?: string;
  };
  streams?: RawStream[];
}

export function parseSportsDataKickoff(timeStr?: string): number {
  if (!timeStr) return Date.now();
  // Format: "07/11/2026 06:30:00 PM" (DD/MM/YYYY hh:mm:ss A) in BD time (UTC+6)
  const parts = timeStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})\s+([AP]M)/i);
  if (!parts) {
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? Date.now() : d.getTime();
  }
  const [_, day, month, year, hoursStr, mins, secs, meridiem] = parts;
  let hours = parseInt(hoursStr, 10);
  if (meridiem.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (meridiem.toUpperCase() === 'AM' && hours === 12) hours = 0;
  // Convert from BD (UTC+6) to UTC epoch
  const utcHours = hours - 6;
  return new Date(Date.UTC(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10), utcHours, parseInt(mins, 10), parseInt(secs, 10))).getTime();
}

export class SportsDataProvider implements StreamProvider {
  id = 'sportsdata';
  name = 'Live Sports Engine';

  async fetchRawEvents(): Promise<RawSportsEvent[]> {
    const cache = getCacheManager();
    return cache.swr('sportsdata_raw_events', async () => {
      let lastErr: any = null;
      for (const endpoint of SPORTS_DATA_ENDPOINTS) {
        try {
          const data = await fetchWithTimeout(endpoint, TIMEOUT_MS);
          if (data && Array.isArray(data.matches)) {
            const football = data.matches.filter((m: RawSportsEvent) => (m.Category || '').toLowerCase() === 'football');
            if (football.length > 0) {
              // Asynchronously save to local disk cache for complete offline resilience
              try {
                const cachePath = path.join(process.cwd(), 'data', 'sports_data_cache.json');
                fs.mkdirSync(path.dirname(cachePath), { recursive: true });
                fs.writeFile(cachePath, JSON.stringify(data), () => {});
              } catch (e) {}
              return football;
            }
          }
        } catch (err) {
          lastErr = err;
        }
      }
      logger.error('All SportsData endpoints failed, checking memory fallback', lastErr);
      const existing = await cache.get<RawSportsEvent[]>('sportsdata_raw_events');
      if (existing && existing.length > 0) {
        logger.warn('Returning previously cached SportsData events due to fetch failure');
        return existing;
      }

      // Check local persistent disk fallback cache
      try {
        const cachePath = path.join(process.cwd(), 'data', 'sports_data_cache.json');
        if (fs.existsSync(cachePath)) {
          const raw = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
          if (raw && Array.isArray(raw.matches)) {
            const diskFootball = raw.matches.filter((m: RawSportsEvent) => (m.Category || '').toLowerCase() === 'football');
            if (diskFootball.length > 0) {
              logger.warn('Loaded SportsData fallback events from local disk cache', { count: diskFootball.length });
              return diskFootball;
            }
          }
        }
      } catch (diskErr) {
        logger.error('Failed loading SportsData disk cache', diskErr);
      }

      return [];
    }, 300);
  }

  async fetchMatches(): Promise<Match[]> {
    const events = await this.fetchRawEvents();
    const now = Date.now();

    return events.map((event, eventIdx) => {
      const info = event.eventInfo || {};
      const teamA = (info.teamA || event.event_name.split(' Vs ')[0] || 'Home').trim();
      const teamB = (info.teamB || event.event_name.split(' Vs ')[1] || 'Away').trim();
      const title = event.event_name || `${teamA} vs ${teamB}`;

      const kickoffTime = parseSportsDataKickoff(info.startTime);
      const diffMinutes = kickoffTime ? Math.floor((now - kickoffTime) / 60000) : -1;

      const isExplicitLive = (event.status || '').toUpperCase() === 'LIVE';
      const isTimeLive = kickoffTime && diffMinutes >= 0 && diffMinutes < 130;
      const isLive = isExplicitLive || isTimeLive;

      // Smart stream prioritization:
      // 1. Filter out known offline domains
      // 2. Deprioritize ad-wrapper networks (e.g. genoads)
      // 3. Prioritize high-quality official networks (Sky Sports, Fubo, BeIN, Paramount, TNT, SuperSport)
      const validStreams = (event.streams || []).filter(s => 
        s.stream_url && 
        s.stream_url.startsWith('http') &&
        !s.stream_url.toLowerCase().includes('v3.cdnlive.tv')
      );
      validStreams.sort((a, b) => {
        const aUrl = (a.stream_url || '').toLowerCase();
        const bUrl = (b.stream_url || '').toLowerCase();
        const aName = (a.channel_name || '').toUpperCase();
        const bName = (b.channel_name || '').toUpperCase();

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
        return aHls - bHls;
      });

      const tournament = info.eventName || 'Football';
      const homeBadge = info.teamAFlag || '';
      const awayBadge = info.teamBFlag || '';
      const leagueLogo = (info.event_logo || '').replace(/^http:/, 'https:');

      const slug = (title || `match-${eventIdx}`)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const sources: StreamSource[] = validStreams.map((s, idx) => ({
        source: 'sportsdata',
        id: `sd-${slug}-${idx}`,
        url: s.stream_url!,
        label: s.channel_name || `82 Server ${idx + 1} (${(s.stream_url || '').includes('.m3u8') ? 'HLS' : 'DASH'})`,
        quality: (s.channel_name || '').includes('FHD') ? 'FHD' : ((s.channel_name || '').includes('HD') ? 'HD' : 'SD'),
        drm: (s.kid && s.key) ? { kid: s.kid, key: s.key } : undefined,
        headers: {
          ...(s.user_agent ? { 'User-Agent': s.user_agent } : {}),
          ...(s.referer ? { 'Referer': s.referer } : {})
        }
      }));

      const fallbackChannels = validStreams.map((s, idx) => ({
        name: s.channel_name || `82 Live Feed ${idx + 1}`,
        url: s.stream_url!,
      }));

      return {
        id: `sportsdata-${slug}`,
        title,
        sport: 'football',
        status: (isLive ? 'live' : 'upcoming') as 'live' | 'upcoming',
        timestamp: kickoffTime || Date.now(),
        tournament,
        country: getCountryForLeague(tournament),
        priority: getLeaguePriority(tournament),
        homeTeam: { name: teamA, badge: homeBadge },
        awayTeam: { name: teamB, badge: awayBadge },
        leagueLogo,
        poster: '',
        venue: '',
        note: isLive ? '🔴 LIVE' : tournament,
        sources,
        fallbackChannels,
        currentMinute: isLive ? (diffMinutes >= 0 && diffMinutes <= 90 ? `${diffMinutes}'` : 'LIVE') : '',
        currentMinuteNumber: isLive ? (diffMinutes >= 0 ? diffMinutes : 45) : -1,
        homeScore: 0,
        awayScore: 0,
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
      // 1. If preFetchedMatch already has sportsdata streams, return them directly
      if (preFetchedMatch?.sources && preFetchedMatch.sources.length > 0) {
        const sdSources = preFetchedMatch.sources.filter(s => s.url && s.url.startsWith('http'));
        if (sdSources.length > 0) {
          return sdSources.map((s, idx) => ({
            name: s.label || `82 Server ${idx + 1}`,
            url: s.url,
            provider: this.id,
            quality: s.quality || 'HD',
            drm: s.drm,
            headers: s.headers,
          }));
        }
      }

      // 2. Look up in live raw events
      const events = await this.fetchRawEvents();
      const rawId = matchId.replace(/^sportsdata-/, '');

      let target = events.find(e => {
        const title = e.event_name || '';
        const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        return slug === rawId || slug.includes(rawId) || rawId.includes(slug);
      });

      if (!target) {
        target = events.find(e => teamsMatch(matchTitle, e.event_name));
      }

      if (target && target.streams) {
        const valid = target.streams.filter(s => 
          s.stream_url && 
          s.stream_url.startsWith('http') &&
          !s.stream_url.toLowerCase().includes('v3.cdnlive.tv')
        );
        // Prioritize .m3u8 HLS streams, then DASH
        valid.sort((a, b) => {
          const aHls = (a.stream_url || '').includes('.m3u8') ? 0 : 1;
          const bHls = (b.stream_url || '').includes('.m3u8') ? 0 : 1;
          return aHls - bHls;
        });

        if (valid.length > 0) {
          return valid.map((s, idx) => ({
            name: s.channel_name || `82 Server ${idx + 1}`,
            url: s.stream_url!,
            provider: this.id,
            quality: (s.channel_name || '').includes('FHD') ? 'FHD' : ((s.channel_name || '').includes('HD') ? 'HD' : 'SD'),
            drm: (s.kid && s.key) ? { kid: s.kid, key: s.key } : undefined,
            headers: {
              ...(s.user_agent ? { 'User-Agent': s.user_agent } : {}),
              ...(s.referer ? { 'Referer': s.referer } : {})
            }
          }));
        }
      }

      // 3. Fallback: Find general live sports broadcast streams from today's active pool
      const generalStreams: Channel[] = [];
      for (const ev of events) {
        for (const s of (ev.streams || [])) {
          if (s.stream_url && s.stream_url.includes('.m3u8') && !s.stream_url.toLowerCase().includes('v3.cdnlive.tv')) {
            const name = s.channel_name || '';
            if (name.includes('SKY') || name.includes('SPORT') || name.includes('STREAM') || name.includes('TNT') || name.includes('FUBO')) {
              if (!generalStreams.some(g => g.url === s.stream_url)) {
                generalStreams.push({
                  name: `82 Backup: ${name || 'Live Sports HD'}`,
                  url: s.stream_url,
                  provider: this.id,
                  quality: 'HD',
                  headers: {
                    ...(s.user_agent ? { 'User-Agent': s.user_agent } : {}),
                    ...(s.referer ? { 'Referer': s.referer } : {})
                  }
                });
              }
              if (generalStreams.length >= 3) break;
            }
          }
        }
        if (generalStreams.length >= 3) break;
      }

      return generalStreams;
    } catch (err) {
      logger.error('SportsData streams resolution failed', err, { matchTitle });
      return [];
    }
  }
}

