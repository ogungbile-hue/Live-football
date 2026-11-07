import { NextRequest, NextResponse } from 'next/server';
import { getMatchDetails, resolveAllStreams } from '@/lib/streamEngine';

export const revalidate = 15; // stream links change less frequently, 15s is safe

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;
  try {
    const match = await getMatchDetails(matchId);
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    const homeTeam = match.homeTeam?.name || '';
    const awayTeam = match.awayTeam?.name || '';

    const resolved = await resolveAllStreams(match.title, matchId, homeTeam, awayTeam, match);

    return NextResponse.json({
      matchTitle: match.title,
      matchStatus: match.status,
      streams: resolved.channels || [],
      defaultUrl: resolved.proxiedUrl,
      isDirectHls: resolved.proxiedUrl.includes('.m3u8') || resolved.proxiedUrl.includes('.mpd') || resolved.proxiedUrl.includes('.mp4')
    });
  } catch (err: any) {
    const fallbackMatch = await getMatchDetails(matchId);
    if (fallbackMatch?.sources && fallbackMatch.sources.length > 0) {
      const fallbackChannels = fallbackMatch.sources.map((s, idx) => ({
        name: s.label || `82 Server ${idx + 1}`,
        url: s.url,
        proxiedUrl: s.url,
        quality: s.quality || 'HD',
        drm: s.drm,
        headers: s.headers,
      }));
      return NextResponse.json({
        matchTitle: fallbackMatch.title,
        matchStatus: fallbackMatch.status,
        streams: fallbackChannels,
        defaultUrl: fallbackChannels[0].url,
        isDirectHls: true,
      });
    }
    return NextResponse.json(
      { error: 'Failed to resolve stream routes: ' + err.message },
      { status: 500 }
    );
  }
}
