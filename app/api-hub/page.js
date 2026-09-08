'use client';

import { useState } from 'react';
import { 
  Database, 
  Terminal, 
  Copy, 
  Check, 
  ExternalLink, 
  ArrowLeft, 
  Shield, 
  Zap, 
  Cpu, 
  Code, 
  Clock, 
  Layers, 
  Share2 
} from 'lucide-react';
import EightyTwoBadge from '@/components/EightyTwoBadge';

export default function ApiHubPage() {
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [expandedIndex, setExpandedIndex] = useState(null);
  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3008';

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const localEndpoints = [
    {
      id: 'matches',
      name: 'Fetch Aggregated 82 Matches',
      path: '/api/matches',
      method: 'GET',
      description: 'Retrieves all active and scheduled football matches aggregated from multi-provider streams (Streamed.pk, CDNLive, WatchFooty), sorted dynamically: live fixtures first, followed by league priority and kickoff timestamps.',
      sampleResponse: `{
  "matches": [
    {
      "id": "streamed-real-madrid-vs-inter-milan-2594629",
      "title": "Real Madrid vs Inter Milan",
      "status": "live",
      "timestamp": 1788894000000,
      "tournament": "UEFA Champions League",
      "homeTeam": { 
        "name": "Real Madrid", 
        "badge": "https://streamed.pk/api/images/proxy/..." 
      },
      "awayTeam": { 
        "name": "Inter Milan", 
        "badge": "https://streamed.pk/api/images/proxy/..." 
      },
      "homeScore": 1,
      "awayScore": 0,
      "currentMinute": "68'",
      "sources": [
        {
          "source": "streamed-admin",
          "id": "ppv-real-madrid-vs-inter-milan",
          "label": "82 Server 1 (TNT Sports 1)"
        }
      ]
    }
  ]
}`
    },
    {
      id: 'match-details',
      name: 'Get Match Details & Lineups',
      path: '/api/match/[matchId]',
      method: 'GET',
      description: 'Fetches granular match statistics, venue telemetry, boxscore metrics, team rosters, and real-time live commentary event streams for a given 82 match ID.',
      sampleResponse: `{
  "id": "streamed-real-madrid-vs-inter-milan-2594629",
  "title": "Real Madrid vs Inter Milan",
  "venue": "Santiago Bernabéu",
  "status": "live",
  "homeScore": 1,
  "awayScore": 0,
  "boxscore": {
    "possession": { "home": "56%", "away": "44%" },
    "shots": { "home": 14, "away": 8 },
    "fouls": { "home": 6, "away": 9 }
  },
  "commentary": [
    {
      "minute": "68'",
      "type": "goal",
      "text": "GOAL! Real Madrid 1, Inter Milan 0. Brilliant conversion inside the penalty box."
    }
  ]
}`
    },
    {
      id: 'resolve-streams',
      name: 'Resolve 82 Multi-Server Streams',
      path: '/api/streams/[matchId]',
      method: 'GET',
      description: 'Retrieves all available live stream servers (embed players, direct HLS playlists, and fallback channels) with quality indicators and signed redirect security.',
      sampleResponse: `{
  "matchTitle": "Real Madrid vs Inter Milan",
  "matchStatus": "live",
  "streams": [
    {
      "name": "82 Server 1 (TNT Sports 1)",
      "url": "https://embed.st/embed/admin/ppv-real-madrid-vs-inter-milan/1",
      "quality": "HD",
      "provider": "streamed",
      "proxiedUrl": "/api/stream-redirect?u=..."
    },
    {
      "name": "82 Server 2 (CDNLive)",
      "url": "https://cdnlivetv.tv/api/v1/channels/player/...",
      "quality": "HD",
      "provider": "cdnlive"
    }
  ],
  "defaultUrl": "https://embed.st/embed/admin/ppv-real-madrid-vs-inter-milan/1",
  "isDirectHls": false
}`
    },
    {
      id: 'logo-proxies',
      name: 'Binary Asset Proxy Routes',
      path: '/api/v1/[type]/[id]',
      method: 'GET',
      description: 'Proxies binary image data for leagues, team badges, and match posters with local 24-hour server caching. Valid types: "league-logo", "team-logo", "poster".',
      sampleResponse: `[Binary Image Stream (image/png or image/jpeg)
Cache-Control: public, max-age=86400, s-maxage=86400]`
    }
  ];

  const upstreamApis = [
    {
      name: 'Streamed.pk Engine',
      url: 'https://streamed.pk',
      badge: 'Live Feeds',
      description: 'Primary streaming aggregator providing multi-language broadcast embeds and high-definition sports video streams.',
    },
    {
      name: 'CDNLive TV Network',
      url: 'https://cdnlivetv.tv',
      badge: 'Channels',
      description: 'Global sports television broadcast feed registry with comprehensive coverage across international football tournaments.',
    },
    {
      name: 'WatchFooty Statistics',
      url: 'https://watchfooty.st',
      badge: 'Telemetry',
      description: 'Granular match telemetry, live clock synchronizations, real-time boxscores, and comprehensive league database.',
    }
  ];

  return (
    <div className="min-h-screen py-6 animate-fade-in text-slate-900 dark:text-slate-100">
      
      {/* 82 Glow Atmosphere */}
      <div className="glow-orb glow-orb-orange w-[350px] h-[350px] top-10 left-10" />
      <div className="glow-orb glow-orb-navy w-[350px] h-[350px] top-60 right-10" />

      <div className="relative z-10 space-y-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col gap-4">
          <div>
            <a 
              href="/" 
              id="back-home-btn"
              className="inline-flex items-center gap-2 text-xs font-bold px-3.5 py-1.5 rounded-lg border border-slate-200 dark:border-[#1e2e48] bg-white dark:bg-[#141c2e] text-slate-700 dark:text-slate-300 hover:text-[#ff6b35] dark:hover:text-[#ff6b35] hover:border-[#ff6b35]/40 hover:shadow-md active:scale-95 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-[#ff6b35]" />
              <span>Back to 82 Fixtures</span>
            </a>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-2xl bg-gradient-to-r from-white via-slate-50 to-orange-50/20 dark:from-[#0a0f1c] dark:via-[#0d1527] dark:to-[#141c2e] border border-slate-200/80 dark:border-[#1e2e48] shadow-md">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 dark:bg-[#ff6b35]/15 border border-orange-200 dark:border-[#ff6b35]/30 px-3 py-0.5 text-xs font-black text-[#ff6b35]">
                <Zap className="h-3.5 w-3.5 text-[#ff6b35]" />
                82 DEVELOPER ECOSYSTEM
              </div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                82 <span className="text-[#ff6b35]">API</span> DEVELOPER HUB
              </h1>
              <p className="text-sm text-slate-600 dark:text-[#8a96b8] leading-relaxed">
                Explore 82 LIVE FOOTBALL system endpoints, copy API signatures, inspect data payloads, and integrate streaming telemetry into your applications.
              </p>
            </div>

            <div className="shrink-0 flex items-center justify-center filter drop-shadow-[0_0_15px_rgba(255,107,53,0.3)]">
              <EightyTwoBadge size={80} speed={1} />
            </div>
          </div>
        </div>

        {/* Section 1: Developer Playbook / Instructions */}
        <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 border border-slate-200/80 dark:border-[#1e2e48]">
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#1e2e48] pb-4">
            <Terminal className="h-5 w-5 text-[#ff6b35]" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">82 Architecture & Developer Playbook</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs leading-relaxed text-slate-600 dark:text-[#8a96b8]">
            
            <div className="space-y-4">
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-[#ff6b35]" />
                  1. Multi-Provider Ingestion Engine
                </h3>
                <p>
                  82 LIVE FOOTBALL queries and aggregates live feeds across multiple independent scraping and API networks in real-time, matching team signatures using fuzzy string similarity and prioritizing HD server feeds.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#ff6b35]" />
                  2. Cache Revalidation System
                </h3>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Match Fixtures</strong>: SWR cache with 15s refresh window to guarantee accurate match minute times and scores.</li>
                  <li><strong>Stream Channels</strong>: Revalidates every 20 seconds, ensuring working server rotation without flooding origin APIs.</li>
                  <li><strong>Image Assets</strong>: Team badges and league crests are cached for 24 hours.</li>
                </ul>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Layers className="h-4 w-4 text-[#ff6b35]" />
                  3. Eighty-Two Branding
                </h3>
                <p>
                  Built on the official <strong>Eighty-Two Brand Kit</strong> with Atomic Orange (<code className="font-mono text-[#ff6b35]">#ff6b35</code>) and Dark Slate Navy (<code className="font-mono text-[#8a96b8]">#141c2e</code>) tokens, providing cybernetic precision and clean aesthetics.
                </p>
              </div>

              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Cpu className="h-4 w-4 text-[#ff6b35]" />
                  4. Environment Setup
                </h3>
                <p>
                  Configure the backend using the declared keys in <code className="font-mono bg-slate-100 dark:bg-[#141c2e] px-1 py-0.5 rounded text-[#ff6b35]">.env.local</code>:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><code className="font-mono">STREAM_SECRET</code>: Cryptographic secret for signing playback URLs.</li>
                  <li><code className="font-mono">REDIS_URL</code> & <code className="font-mono">REDIS_TOKEN</code>: Optional Upstash Redis endpoint for distributed memory caching.</li>
                </ul>
              </div>
            </div>

          </div>
        </div>

        {/* Section 2: Local Application Endpoints */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Code className="h-5 w-5 text-[#ff6b35]" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">82 Endpoint Directory</h2>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {localEndpoints.map((endpoint, index) => {
              const fullUrl = `${origin}${endpoint.path}`;
              const isExpanded = expandedIndex === index;

              return (
                <div 
                  key={endpoint.id}
                  className="glass-panel rounded-xl p-5 md:p-6 space-y-4 border border-slate-200/80 dark:border-[#1e2e48] hover:border-[#ff6b35]/40 transition-colors shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded bg-[#ff6b35]/15 text-[#ff6b35] border border-[#ff6b35]/30">
                        {endpoint.method}
                      </span>
                      <h3 className="font-black text-sm text-slate-900 dark:text-white">
                        {endpoint.name}
                      </h3>
                    </div>
                    <code className="text-[11px] font-mono text-[#ff6b35]">
                      {endpoint.path}
                    </code>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-[#8a96b8] leading-relaxed">
                    {endpoint.description}
                  </p>

                  {/* Copy URL Row */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-slate-100 dark:bg-[#07090f] border border-slate-200 dark:border-[#1e2e48]">
                    <span className="text-[10px] font-mono text-slate-400 select-none">URL:</span>
                    <input 
                      type="text" 
                      readOnly 
                      value={fullUrl} 
                      className="flex-1 bg-transparent outline-none font-mono text-[10px] text-slate-800 dark:text-slate-200 overflow-x-auto" 
                    />
                    <button
                      onClick={() => copyToClipboard(fullUrl, index)}
                      className="p-1.5 rounded-md hover:bg-slate-200 dark:hover:bg-[#141c2e] text-slate-500 hover:text-[#ff6b35] dark:hover:text-[#ff6b35] active:scale-90 transition-all cursor-pointer"
                      title="Copy URL"
                    >
                      {copiedIndex === index ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  {/* Response Payload Block */}
                  <div className="space-y-2">
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : index)}
                      className="text-[11px] font-bold text-[#ff6b35] hover:text-[#ff8554] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>{isExpanded ? 'Hide' : 'Show'} Sample Response Payload</span>
                      <ChevronToggle isExpanded={isExpanded} />
                    </button>

                    {isExpanded && (
                      <div className="relative rounded-lg overflow-hidden border border-slate-200 dark:border-[#1e2e48]">
                        <div className="absolute right-2 top-2 z-20">
                          <button
                            onClick={() => copyToClipboard(endpoint.sampleResponse, `payload-${index}`)}
                            className="p-1.5 rounded bg-slate-200/60 hover:bg-slate-200 dark:bg-[#141c2e] dark:hover:bg-[#1a2540] text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                            title="Copy payload"
                          >
                            {copiedIndex === `payload-${index}` ? (
                              <Check className="h-3 w-3 text-emerald-500" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </button>
                        </div>
                        <pre className="p-4 bg-[#07090f] text-slate-200 font-mono text-[10px] overflow-x-auto max-h-[250px] leading-relaxed">
                          {endpoint.sampleResponse}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Upstream Feeds */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Share2 className="h-5 w-5 text-[#ff6b35]" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Upstream Streaming Providers</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {upstreamApis.map((api, idx) => (
              <a 
                key={api.name}
                href={api.url}
                target="_blank"
                rel="noopener noreferrer"
                className="glass-panel glass-panel-hover rounded-xl p-5 block space-y-3 cursor-pointer group border border-slate-200/80 dark:border-[#1e2e48]"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-orange-100 dark:bg-[#ff6b35]/15 text-[#ff6b35] border border-orange-200 dark:border-[#ff6b35]/30">
                    {api.badge}
                  </span>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#ff6b35] transition-colors" />
                </div>
                
                <h3 className="font-black text-sm text-slate-900 dark:text-white group-hover:text-[#ff6b35] transition-colors">
                  {api.name}
                </h3>
                
                <p className="text-xs text-slate-500 dark:text-[#8a96b8] leading-relaxed">
                  {api.description}
                </p>
                
                <div className="text-[10px] font-mono text-[#ff6b35] group-hover:underline flex items-center gap-1">
                  <span>Visit Upstream Site</span>
                  <ArrowUpRight className="h-3 w-3" />
                </div>
              </a>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function ChevronToggle({ isExpanded }) {
  return (
    <svg 
      className={`h-3 w-3 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ArrowUpRight({ className }) {
  return (
    <svg 
      className={className} 
      fill="none" 
      viewBox="0 0 24 24" 
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}
