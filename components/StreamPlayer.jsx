'use client';

import { useState, useEffect, useRef } from 'react';
import { Maximize, RefreshCw, AlertCircle, ShieldAlert, Shield, Cpu, Play, Pause, Volume2, Volume1, VolumeX } from 'lucide-react';
import EightyTwoBadge from './EightyTwoBadge';

export default function StreamPlayer({ streamUrl, channels, matchTitle, matchStatus }) {
  const isUpcoming = matchStatus === 'upcoming';
  const [activeChannel, setActiveChannel] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [streamStatus, setStreamStatus] = useState('loading');
  const [loadTimeout, setLoadTimeout] = useState(null);
  
  // Custom video state hooks
  const [hlsLoaded, setHlsLoaded] = useState(false);
  const [shakaLoaded, setShakaLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [sandboxShield, setSandboxShield] = useState(false);
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  const iframeRef = useRef(null);
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const hlsInstanceRef = useRef(null);
  const shakaInstanceRef = useRef(null);
  const tryNextSourceRef = useRef(null);

  const validChannels = (channels || []).filter(ch => 
    ch && 
    ch.url && 
    !ch.url.toLowerCase().includes('watchfooty') && 
    !ch.name?.toLowerCase().includes('watchfooty')
  );

  const allChannels = validChannels.length > 0 
    ? validChannels 
    : (streamUrl && !streamUrl.toLowerCase().includes('watchfooty') 
        ? [{ name: '82 Server 1', url: streamUrl, proxiedUrl: streamUrl }] 
        : []);

  const currentChannel = allChannels[activeChannel] || null;
  const currentUrl = currentChannel?.url || currentChannel?.proxiedUrl || (streamUrl && !streamUrl.toLowerCase().includes('watchfooty') ? streamUrl : '');

  // Detect stream source types
  const isHls = Boolean(currentUrl && (currentUrl.includes('.m3u8') || currentUrl.includes('/hls/')));
  const isDash = Boolean(currentUrl && currentUrl.includes('.mpd'));
  const isDirectVideo = isHls || isDash || Boolean(currentUrl && currentUrl.includes('.mp4'));
  const isDirectHls = isDirectVideo; // Used for UI conditionals

  const tryNextSource = () => {
    setActiveChannel(prev => (prev + 1) % (allChannels.length || 1));
  };
  tryNextSourceRef.current = tryNextSource;

  const handleLoad = () => {
    setIsLoading(false);
    setStreamStatus('active');
    if (loadTimeout) clearTimeout(loadTimeout);
  };

  const handleError = () => {
    setIsLoading(false);
    if (allChannels.length > 1) {
      tryNextSource();
    } else {
      setStreamStatus('error');
    }
    if (loadTimeout) clearTimeout(loadTimeout);
  };

  // Dynamically load hls.js from CDN if an HLS stream is selected
  useEffect(() => {
    if (!isHls) return;
    if (typeof window !== 'undefined' && window.Hls) {
      setHlsLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js';
    script.async = true;
    script.onload = () => {
      setHlsLoaded(true);
    };
    script.onerror = () => {
      if (allChannels.length > 1) {
        tryNextSourceRef.current?.();
      } else {
        setStreamStatus('error');
      }
    };
    document.body.appendChild(script);
  }, [isHls]);

  // Dynamically load shaka-player from CDN if a DASH stream is selected
  useEffect(() => {
    if (!isDash) return;
    if (typeof window !== 'undefined' && window.shaka) {
      setShakaLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/shaka-player@4.7.11/dist/shaka-player.compiled.min.js';
    script.async = true;
    script.onload = () => {
      try {
        window.shaka?.polyfill?.installAll();
      } catch (e) {}
      setShakaLoaded(true);
    };
    script.onerror = () => {
      if (allChannels.length > 1) {
        tryNextSourceRef.current?.();
      } else {
        setStreamStatus('error');
      }
    };
    document.body.appendChild(script);
  }, [isDash]);

  // Video element binding effect (HLS, DASH, MP4)
  useEffect(() => {
    if (!isDirectVideo || !videoRef.current) return;

    const video = videoRef.current;
    
    if (hlsInstanceRef.current) {
      hlsInstanceRef.current.destroy();
      hlsInstanceRef.current = null;
    }
    if (shakaInstanceRef.current) {
      shakaInstanceRef.current.destroy();
      shakaInstanceRef.current = null;
    }

    setIsLoading(true);
    setStreamStatus('loading');
    setIsPlaying(true);

    let stallTimer = null;

    if (isDash && shakaLoaded && window.shaka) {
      const player = new window.shaka.Player(video);
      shakaInstanceRef.current = player;

      const drm = currentChannel?.drm;
      if (drm?.kid && drm?.key) {
        player.configure({
          drm: {
            clearKeys: {
              [drm.kid]: drm.key
            }
          }
        });
      }

      player.addEventListener('error', (event) => {
        console.warn('[82 Player DASH Error]', event);
        if (allChannels.length > 1) {
          tryNextSourceRef.current?.();
        } else {
          setStreamStatus('error');
        }
      });

      player.load(currentUrl).then(() => {
        setIsLoading(false);
        setStreamStatus('active');
        video.play().catch(() => {});
      }).catch((err) => {
        console.warn('[82 Player DASH Load Error]', err);
        if (allChannels.length > 1) {
          tryNextSourceRef.current?.();
        } else {
          setStreamStatus('error');
        }
      });

      return () => {
        if (shakaInstanceRef.current) {
          shakaInstanceRef.current.destroy();
          shakaInstanceRef.current = null;
        }
      };
    } else if (isHls) {
      // Safari / iOS Native HLS support
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = currentUrl;
        const onLoadedMetadata = () => {
          setIsLoading(false);
          setStreamStatus('active');
          video.play().catch(() => {});
        };
        const onNativeError = () => {
          if (allChannels.length > 1) {
            tryNextSourceRef.current?.();
          } else {
            setStreamStatus('error');
          }
        };
        const onWaiting = () => {
          if (stallTimer) clearTimeout(stallTimer);
          stallTimer = setTimeout(() => {
            if (allChannels.length > 1) {
              console.warn('[82 Player Native] 4s buffer stall detected. Switching server.');
              tryNextSourceRef.current?.();
            }
          }, 4500);
        };
        const onPlaying = () => {
          if (stallTimer) {
            clearTimeout(stallTimer);
            stallTimer = null;
          }
        };
        
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('error', onNativeError);
        video.addEventListener('waiting', onWaiting);
        video.addEventListener('playing', onPlaying);
        
        return () => {
          if (stallTimer) clearTimeout(stallTimer);
          video.removeEventListener('loadedmetadata', onLoadedMetadata);
          video.removeEventListener('error', onNativeError);
          video.removeEventListener('waiting', onWaiting);
          video.removeEventListener('playing', onPlaying);
        };
      } else if (hlsLoaded && window.Hls) {
        // Modern Chrome/Firefox Hls.js setup with Ultra-Low-Latency & stall detection
        const hls = new window.Hls({
          enableWorker: true,
          liveSyncDurationCount: 2,
          liveMaxLatencyDurationCount: 4,
          maxBufferLength: 10,
          maxMaxBufferLength: 20,
          maxBufferSize: 30 * 1024 * 1024,
          manifestLoadingTimeOut: 5000,
          manifestLoadingMaxRetry: 2,
          levelLoadingTimeOut: 5000,
          fragLoadingTimeOut: 6000,
          fragLoadingMaxRetry: 2,
        });
        hlsInstanceRef.current = hls;

        hls.on(window.Hls.Events.BUFFER_STALLED, () => {
          if (stallTimer) clearTimeout(stallTimer);
          stallTimer = setTimeout(() => {
            if (allChannels.length > 1) {
              console.warn('[82 Player HLS] 4s buffer stall detected. Auto-switching server.');
              tryNextSourceRef.current?.();
            }
          }, 4500);
        });

        hls.on(window.Hls.Events.FRAG_BUFFERED, () => {
          if (stallTimer) {
            clearTimeout(stallTimer);
            stallTimer = null;
          }
        });

        hls.loadSource(currentUrl);
        hls.attachMedia(video);

        hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          setStreamStatus('active');
          video.play().catch(() => {});
        });

        hls.on(window.Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                if (allChannels.length > 1) {
                  tryNextSourceRef.current?.();
                } else {
                  hls.startLoad();
                }
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                hls.recoverMediaError();
                break;
              default:
                if (allChannels.length > 1) {
                  tryNextSourceRef.current?.();
                } else {
                  setStreamStatus('error');
                  hls.destroy();
                }
                break;
            }
          }
        });

        return () => {
          if (stallTimer) clearTimeout(stallTimer);
          if (hlsInstanceRef.current) {
            hlsInstanceRef.current.destroy();
            hlsInstanceRef.current = null;
          }
        };
      }
    } else if (currentUrl.includes('.mp4')) {
      video.src = currentUrl;
      video.play().catch(() => {});
      setIsLoading(false);
      setStreamStatus('active');
    }
  }, [currentUrl, isDirectVideo, isHls, isDash, hlsLoaded, shakaLoaded]);

  // General connection timeout for iframes
  useEffect(() => {
    if (isDirectVideo) return;
    setIsLoading(true);
    setStreamStatus('loading');
    const timeout = setTimeout(() => {
      setIsLoading(false);
      setStreamStatus('active'); // Assume active if frame didn't throw error
    }, 8000);
    setLoadTimeout(timeout);
    return () => clearTimeout(timeout);
  }, [currentUrl, isDirectVideo]);

  const reloadStream = () => {
    setIsLoading(true);
    setStreamStatus('loading');
    if (isDirectVideo) {
      if (videoRef.current) {
        const video = videoRef.current;
        if (hlsInstanceRef.current) {
          hlsInstanceRef.current.loadSource(currentUrl);
          hlsInstanceRef.current.startLoad();
        } else if (shakaInstanceRef.current) {
          shakaInstanceRef.current.load(currentUrl).catch(() => {});
        } else {
          video.src = '';
          video.src = currentUrl;
          video.load();
        }
      }
    } else {
      if (iframeRef.current) {
        iframeRef.current.src = currentUrl;
      }
    }
  };

  const toggleFullscreen = () => {
    const el = playerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (el.requestFullscreen) {
      el.requestFullscreen();
    }
  };

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      const nextMute = !isMuted;
      videoRef.current.muted = nextMute;
      setIsMuted(nextMute);
      if (nextMute) {
        setVolume(0);
      } else {
        setVolume(0.8);
        videoRef.current.volume = 0.8;
      }
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Player window container */}
      <div 
        ref={playerRef} 
        className={`relative overflow-hidden bg-black shadow-2xl transition-all duration-500 ease-out group ${
          isTheaterMode 
            ? 'w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] rounded-none border-y border-[#1e2e48] h-[45vh] sm:h-[55vh] md:h-[65vh] lg:h-[70vh] xl:h-[75vh]' 
            : 'w-full rounded-2xl border border-slate-200 dark:border-[#1e2e48]'
        }`}
        style={isTheaterMode ? undefined : { aspectRatio: '16/9' }}
      >
        {/* Loading Spinner Screen */}
        {isLoading && streamStatus !== 'error' && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#07090f]">
            <div className="relative flex items-center justify-center">
              <EightyTwoBadge size={64} speed={1.8} />
            </div>
            <p className="mt-4 text-xs font-black uppercase tracking-widest text-[#ff6b35] font-mono">82 Live Engine Initializing...</p>
            <p className="mt-1 text-[11px] text-slate-400">
              {isDash ? 'Connecting DASH Live Stream' : isHls ? 'Connecting HLS Direct Stream Feed' : 'Resolving 82 Multi-Server Feed'}
            </p>
          </div>
        )}

        {/* Stream Load Error Screen */}
        {streamStatus === 'error' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07090f]/98 px-6 text-center">
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <p className="text-sm font-bold text-white">Stream Server Unavailable</p>
            <p className="mt-1.5 text-xs text-slate-400 max-w-sm">
              The selected feed is temporarily unreachable. Switch to an alternate server.
            </p>
            <div className="mt-5 flex gap-2.5">
              <button
                onClick={tryNextSource}
                className="rounded-lg bg-gradient-to-r from-[#ff6b35] to-[#e0531f] px-4 py-2 text-xs font-black text-white hover:from-[#ff8554] hover:to-[#ff6b35] transition-all shadow-lg shadow-[#ff6b35]/25 cursor-pointer"
              >
                Switch Server
              </button>
              <button
                onClick={reloadStream}
                className="rounded-lg bg-[#141c2e] border border-[#1e2e48] px-4 py-2 text-xs font-bold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Retry Feed
              </button>
            </div>
          </div>
        )}

        {/* Timeout Screen */}
        {streamStatus === 'offline' && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#07090f]/98 px-6 text-center">
            <div className="mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="h-6 w-6 text-amber-400" />
            </div>
            <p className="text-sm font-bold text-white">82 Stream Connection Timeout</p>
            <p className="mt-1.5 text-xs text-slate-400 max-w-sm">
              The provider response took too long. Switch to an alternate 82 server.
            </p>
            <button
              onClick={tryNextSource}
              className="mt-5 rounded-lg bg-gradient-to-r from-[#ff6b35] to-[#e0531f] px-4 py-2 text-xs font-black text-white hover:from-[#ff8554] hover:to-[#ff6b35] transition-all shadow-lg shadow-[#ff6b35]/25 cursor-pointer"
            >
              Switch Server
            </button>
          </div>
        )}

        {/* Video Player or Iframe Embed */}
        {isDirectVideo ? (
          <video
            ref={videoRef}
            className="absolute inset-0 h-full w-full object-contain bg-black cursor-pointer"
            playsInline
            onClick={handlePlayPause}
          />
        ) : sandboxShield ? (
          <iframe
            key={`${currentUrl}-secured`}
            ref={iframeRef}
            src={currentUrl}
            className="absolute inset-0 h-full w-full"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media"
            onLoad={handleLoad}
            onError={handleError}
            sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
          />
        ) : (
          <iframe
            key={`${currentUrl}-compat`}
            ref={iframeRef}
            src={currentUrl}
            className="absolute inset-0 h-full w-full"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media"
            onLoad={handleLoad}
            onError={handleError}
          />
        )}

        {/* Play Icon Center Overlay (When Paused) */}
        {isDirectVideo && !isPlaying && streamStatus === 'active' && (
          <div 
            onClick={handlePlayPause}
            className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-[1.5px] cursor-pointer animate-fade-in"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#ff6b35] text-white shadow-[0_0_30px_rgba(255,107,53,0.7)] border border-white/20 transform scale-100 hover:scale-110 active:scale-95 transition-all duration-300">
              <Play className="h-7 w-7 fill-white ml-1" />
            </div>
          </div>
        )}

        {/* Upcoming Status Banner overlay */}
        {isUpcoming && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/90 px-6 text-center">
            <ShieldAlert className="h-10 w-10 text-[#ff6b35] mb-3" />
            <p className="text-sm font-bold text-white">Fixture Has Not Started Yet</p>
            <p className="mt-1 text-xs text-slate-400 max-w-xs">
              Live stream feeds will synchronize automatically near kick-off.
            </p>
          </div>
        )}

        {/* Floating details overlay (Top left) */}
        <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
          <span className="rounded-full bg-black/80 backdrop-blur-md border border-[#1e2e48] px-3 py-1 text-xs font-bold text-white shadow-lg">
            {matchTitle}
          </span>
          {streamStatus === 'active' && matchStatus === 'live' && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-600 border border-red-500/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white shadow-lg animate-pulse">
              <span className="h-1.5 w-1.5 rounded-full bg-white" />
              82 Live Stream
            </span>
          )}
        </div>

        {/* CUSTOM VIDEO CONTROLS OVERLAY (Only for Direct Video) */}
        {isDirectVideo && streamStatus === 'active' && (
          <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col gap-2.5">
            
            {/* Live timeline indicator */}
            <div className="flex items-center gap-3">
              <div className="h-1.5 flex-1 rounded-full bg-slate-800 overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 right-0 bg-gradient-to-r from-[#ff6b35] to-orange-500 rounded-full" />
              </div>
              <span className="flex items-center gap-1 text-[10px] font-black uppercase text-red-500 tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                Live
              </span>
            </div>

            {/* Custom Control Buttons Toolbar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {/* Play/Pause Button */}
                <button
                  onClick={handlePlayPause}
                  className="rounded-lg bg-white/10 hover:bg-white/20 p-2 text-white transition-all active:scale-90 cursor-pointer"
                  title={isPlaying ? "Pause" : "Play"}
                >
                  {isPlaying ? <Pause className="h-4 w-4 fill-white" /> : <Play className="h-4 w-4 fill-white" />}
                </button>

                {/* Volume / Mute slider control */}
                <div className="flex items-center gap-2 group/volume">
                  <button
                    onClick={handleMuteToggle}
                    className="rounded-lg bg-white/10 hover:bg-white/20 p-2 text-white transition-all active:scale-90 cursor-pointer"
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4 text-slate-400" /> : volume < 0.4 ? <Volume1 className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-0 group-hover/volume:w-20 focus:w-20 transition-all duration-300 h-1 appearance-none rounded-full bg-slate-800 accent-[#ff6b35] cursor-pointer outline-none"
                  />
                </div>

                {/* Status Indicator */}
                <span className="inline-flex items-center gap-1.5 rounded-md bg-[#ff6b35]/15 border border-[#ff6b35]/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-[#ff6b35]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#ff6b35] animate-ping" />
                  {isDash ? '82 DASH Ultra Player' : '82 Ultra-Low Latency Player'}
                </span>
              </div>

              {/* Right panel controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={reloadStream}
                  className="rounded-lg bg-white/10 hover:bg-white/20 p-2 text-slate-200 hover:text-white transition-all active:scale-90 cursor-pointer"
                  title="Reload 82 Server"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="rounded-lg bg-white/10 hover:bg-white/20 p-2 text-slate-200 hover:text-white transition-all active:scale-90 cursor-pointer"
                  title="Toggle Fullscreen"
                >
                  <Maximize className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        )}
      </div>

      {/* Dynamic Security/Compatibility Alert */}
      {!isDirectVideo && sandboxShield && (
        <div className="bg-orange-50 dark:bg-[#141c2e] border border-orange-200 dark:border-[#ff6b35]/25 rounded-xl p-4 text-xs text-slate-700 dark:text-slate-300 leading-relaxed animate-fade-in space-y-2.5 shadow-sm">
          <div className="flex items-center gap-2 text-[#ff6b35] font-black">
            <Shield className="h-4 w-4 text-[#ff6b35]" />
            <span>82 Ad-Shield Active (Popup & Ad Blocker)</span>
          </div>
          <p className="text-[11.5px] text-slate-600 dark:text-[#8a96b8] leading-normal">
            The stream is contained in a secure sandbox preventing unauthorized redirects and intrusive advertisements.
          </p>
        </div>
      )}

      {/* Dynamic Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 glass-panel p-4 rounded-xl shadow-md border border-slate-200/80 dark:border-[#1e2e48]">
        
        {/* Left Side: Security Warning or Ad-Shield Toggle */}
        {!isDirectVideo ? (
          <div className="flex items-center gap-3 bg-slate-100 dark:bg-[#07090f] p-2.5 rounded-lg border border-slate-200 dark:border-[#1e2e48] w-full lg:w-auto shadow-inner">
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${sandboxShield ? 'bg-green-500' : 'bg-[#ff6b35] animate-pulse'}`} />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Ad-Shield {sandboxShield ? 'ON' : 'OFF'}
                </span>
              </div>
              <span className="text-[9px] text-slate-500 dark:text-[#8a96b8] mt-0.5 leading-none block">
                {sandboxShield ? "Blocking redirects & popups" : "Standard playback mode"}
              </span>
            </div>
            <button
              onClick={() => setSandboxShield(!sandboxShield)}
              className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ml-auto lg:ml-2 ${
                sandboxShield ? 'bg-green-600' : 'bg-slate-300 dark:bg-[#141c2e]'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  sandboxShield ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 text-left bg-slate-100 dark:bg-[#07090f] p-2.5 rounded-lg border border-slate-200 dark:border-[#1e2e48] w-full lg:w-auto shadow-inner">
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#ff6b35]">
                {isDash ? '82 DASH Ultra Player' : '82 Native Player Active'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-[#8a96b8] mt-0.5 leading-none block">
                Direct live stream feed decoded with zero advertisements.
              </span>
            </div>
          </div>
        )}

        {/* Right Side: Viewport Controls Group */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#07090f] p-1.5 rounded-lg border border-slate-200 dark:border-[#1e2e48] w-full lg:w-auto justify-end shadow-inner">
          {/* Refresh button */}
          <button
            onClick={reloadStream}
            className="rounded-md bg-white dark:bg-[#141c2e] hover:bg-slate-50 dark:hover:bg-[#1a2540] px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all active:scale-95 flex items-center gap-1.5 text-xs font-black border border-slate-200 dark:border-[#1e2e48] shadow-sm cursor-pointer"
            title="Reload 82 Server"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reload</span>
          </button>

          {/* Theater Mode Toggle button */}
          <button
            onClick={() => setIsTheaterMode(!isTheaterMode)}
            className={`rounded-md px-3 py-1.5 transition-all active:scale-95 flex items-center gap-1.5 text-xs font-black border cursor-pointer ${
              isTheaterMode 
                ? 'border-[#ff6b35]/50 bg-[#ff6b35]/15 text-[#ff6b35] shadow-sm' 
                : 'border-slate-200 dark:border-[#1e2e48] bg-white dark:bg-[#141c2e] hover:bg-slate-50 dark:hover:bg-[#1a2540] text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white shadow-sm'
            }`}
            title={isTheaterMode ? "Exit Theater Mode" : "Enter Theater Mode"}
          >
            <Cpu className={`h-3.5 w-3.5 ${isTheaterMode ? 'animate-pulse text-[#ff6b35]' : ''}`} />
            <span>{isTheaterMode ? "Normal" : "Theater"}</span>
          </button>

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="rounded-md bg-white dark:bg-[#141c2e] hover:bg-slate-50 dark:hover:bg-[#1a2540] px-3 py-1.5 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all active:scale-95 flex items-center gap-1.5 text-xs font-black border border-slate-200 dark:border-[#1e2e48] shadow-sm cursor-pointer"
            title="Toggle Fullscreen"
          >
            <Maximize className="h-3.5 w-3.5" />
            <span>Fullscreen</span>
          </button>
        </div>

      </div>

      {/* Dedicated Servers Selection Panel */}
      <div className="glass-panel p-4 rounded-xl shadow-md border border-slate-200/80 dark:border-[#1e2e48]">
        {allChannels.length > 0 ? (
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 flex-wrap">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-[#8a96b8] flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#ff6b35]" />
                82 Stream Servers Available ({allChannels.length})
              </span>
              <span className="text-[9px] text-slate-500 dark:text-slate-500 font-semibold leading-none normal-case">
                Supported: <span className="text-[#ff6b35] font-black">HD 1080p</span> &middot; <span className="text-slate-400 font-bold">Standard 720p/480p</span>
              </span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {allChannels.map((ch, idx) => (
                <button
                  key={idx}
                  onClick={() => { setActiveChannel(idx); }}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-black transition-all cursor-pointer ${
                    activeChannel === idx
                      ? 'border-[#ff6b35] bg-[#ff6b35]/15 text-[#ff6b35] shadow-md shadow-[#ff6b35]/20 scale-[1.02]'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-[#1e2e48] dark:bg-[#07090f] dark:text-slate-400 dark:hover:bg-[#141c2e] dark:hover:text-white'
                  }`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${activeChannel === idx ? 'bg-[#ff6b35] animate-pulse' : 'bg-slate-400 dark:bg-slate-700'}`} />
                  <span>{ch.name || `82 Server ${idx + 1}`}</span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                    ch.url?.includes('.m3u8')
                      ? 'text-emerald-400 bg-emerald-500/15'
                      : ch.url?.includes('.mpd')
                      ? 'text-cyan-400 bg-cyan-500/15'
                      : 'text-[#ff6b35] bg-[#ff6b35]/15'
                  }`}>
                    {ch.url?.includes('.m3u8') ? 'HLS' : (ch.url?.includes('.mpd') ? 'DASH' : (ch.quality || 'HD'))}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <span className="text-xs text-slate-500 font-semibold">Resolving 82 stream feeds...</span>
        )}
      </div>

    </div>
  );
}
