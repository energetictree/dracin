import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import type { SubtitleTrack } from '@/types/drama';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitleUrl?: string;
  subtitles?: SubtitleTrack[];
  onClose?: () => void;
  currentEpisode?: number;
  totalEpisodes?: number;
  onNextEpisode?: () => void;
  autoPlayNext?: boolean;
}

export function VideoPlayer({ 
  src, 
  poster, 
  title, 
  subtitleUrl,
  subtitles,
  onClose, 
  currentEpisode, 
  totalEpisodes, 
  onNextEpisode,
  autoPlayNext = true
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeSubtitleLang, setActiveSubtitleLang] = useState<string>('en'); // Default to English

  // Use subtitles array if provided, otherwise fall back to single subtitleUrl
  const availableSubtitles = subtitles || (subtitleUrl ? [{
    url: subtitleUrl,
    language: 'en',
    label: 'English',
    isDefault: true
  }] : []);

  useEffect(() => {
    if (!videoRef.current) return;

    // Initialize Video.js player
    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered');
    videoRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      html5: {
        vhs: {
          overrideNative: true,
          limitRenditionByPlayerDimensions: true,
          useDevicePixelRatio: true,
        },
        nativeTextTracks: false,
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
      controls: true,
      fluid: false,
      responsive: true,
      preload: 'auto',
      poster: poster,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      inactivityTimeout: 0,
      userActions: {
        doubleClick: true,
        hotkeys: true
      },
      fullscreen: {
        enabled: true,
        nativeControlsForTouch: false,
      },
      controlBar: {
        children: [
          'playToggle',
          'volumePanel',
          'currentTimeDisplay',
          'timeDivider',
          'durationDisplay',
          'progressControl',
          'liveDisplay',
          'seekToLive',
          'remainingTimeDisplay',
          'customControlSpacer',
          'playbackRateMenuButton',
          'chaptersButton',
          'descriptionsButton',
          'subsCapsButton',
          'audioTrackButton',
          'fullscreenToggle',
        ],
      },
      textTrackSettings: false,
    });

    playerRef.current = player;

    // Loading events
    player.on('loadstart', () => {
      console.log('[VideoPlayer] loadstart');
      setIsLoading(true);
    });

    player.on('loadeddata', () => {
      console.log('[VideoPlayer] loadeddata, readyState:', player.readyState());
      if (player.readyState() >= 2) {
        setIsLoading(false);
      }
    });

    player.on('canplay', () => {
      console.log('[VideoPlayer] canplay');
      setIsLoading(false);
    });

    player.on('canplaythrough', () => {
      console.log('[VideoPlayer] canplaythrough');
      setIsLoading(false);
    });

    player.on('playing', () => {
      console.log('[VideoPlayer] playing');
      setIsLoading(false);
    });

    player.on('waiting', () => {
      console.log('[VideoPlayer] waiting');
      if (player.paused()) {
        setIsLoading(true);
      }
    });

    player.on('error', () => {
      console.error('[VideoPlayer] error:', player.error());
      setIsLoading(false);
    });

    // Handle video ended
    player.on('ended', () => {
      console.log('[VideoPlayer] video ended');
      if (autoPlayNext && onNextEpisode && currentEpisode && totalEpisodes && currentEpisode < totalEpisodes) {
        onNextEpisode();
      }
    });

    // Handle fullscreen change
    const handleFullscreenChange = () => {
      const fs = player.isFullscreen() || false;
      console.log('[VideoPlayer] fullscreen change:', fs);
      setIsFullscreen(fs);
      
      if (!fs) {
        setTimeout(() => {
          player.trigger('resize');
        }, 100);
      }
    };
    
    player.on('fullscreenchange', handleFullscreenChange);

    // Transform the video URL
    const decryptUrl = `https://api.sansekai.my.id/api/dramabox/decrypt-stream?url=${encodeURIComponent(src)}`;
    
    player.src({
      src: decryptUrl,
      type: 'application/x-mpegURL',
    });
    
    // Add all subtitle tracks
    if (availableSubtitles.length > 0) {
      player.ready(() => {
        console.log('[VideoPlayer] Adding subtitle tracks:', availableSubtitles);
        
        availableSubtitles.forEach((sub, index) => {
          const isDefault = sub.isDefault || index === 0;
          
          // Add via Video.js API
          const track = player.addRemoteTextTrack({
            kind: 'subtitles',
            src: sub.url,
            srclang: sub.language,
            label: sub.label,
            default: isDefault,
            mode: isDefault ? 'showing' : 'disabled'
          }, true);
          
          if (track) {
            // Set track mode for Video.js TextTrack object
            const textTrack = track as unknown as { mode: string };
            textTrack.mode = isDefault ? 'showing' : 'disabled';
          }
          
          // Also add via HTML video element for Safari
          const tech = player.tech({ IWillNotUseThisInPlugins: true });
          if (tech && tech.el) {
            const videoEl = tech.el() as HTMLVideoElement;
            if (videoEl) {
              const trackEl = document.createElement('track');
              trackEl.kind = 'subtitles';
              trackEl.src = sub.url;
              trackEl.srclang = sub.language;
              trackEl.label = sub.label;
              trackEl.default = isDefault;
              videoEl.appendChild(trackEl);
            }
          }
        });
        
        // Set initial active language
        const defaultSub = availableSubtitles.find(s => s.isDefault) || availableSubtitles[0];
        if (defaultSub) {
          setActiveSubtitleLang(defaultSub.language);
        }
      });
    }
    
    // Failsafe: hide loading after 8 seconds max
    const failsafeTimer = setTimeout(() => {
      console.log('[VideoPlayer] failsafe: forcing loading off after timeout');
      setIsLoading(false);
    }, 8000);
    
    // Additional failsafe: try to play after ready
    player.ready(() => {
      console.log('[VideoPlayer] player ready');
      // Force loading off if still loading after player is ready
      setTimeout(() => {
        setIsLoading((current) => {
          if (current) {
            console.log('[VideoPlayer] ready-failsafe: forcing loading off');
            return false;
          }
          return current;
        });
      }, 3000);
    });

    return () => {
      clearTimeout(failsafeTimer);
      
      if (playerRef.current) {
        if (playerRef.current.isFullscreen()) {
          playerRef.current.exitFullscreen();
        }
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, poster, availableSubtitles, autoPlayNext, currentEpisode, totalEpisodes, onNextEpisode]);

  // Handle subtitle language switch
  const handleSubtitleChange = (language: string) => {
    const player = playerRef.current;
    if (!player) return;
    
    const tracks = player.textTracks();
    
    // Convert TextTrackList to array for iteration
    const trackArray = Array.from(tracks as unknown as TextTrack[]);
    
    trackArray.forEach((track) => {
      if (track.kind === 'subtitles') {
        track.mode = track.language === language ? 'showing' : 'disabled';
      }
    });
    
    setActiveSubtitleLang(language);
    console.log('[VideoPlayer] Switched to subtitle:', language);
  };

  return (
    <div className={`video-player-container w-full bg-black ${isFullscreen ? 'is-fullscreen' : ''}`}>
      {/* Player Header - Hidden when fullscreen */}
      {!isFullscreen && (
        <div className="player-header flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-green-700">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-green-400 font-bold text-sm truncate">{title || 'VIDEO_PLAYER.EXE'}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Subtitle Language Selector */}
            {availableSubtitles.length > 0 && (
              <select
                value={activeSubtitleLang}
                onChange={(e) => handleSubtitleChange(e.target.value)}
                className="px-2 py-1 text-xs font-bold bg-gray-800 text-green-400 border border-green-600 rounded"
                title="Select Subtitle Language"
              >
                <option value="">CC Off</option>
                {availableSubtitles.map((sub) => (
                  <option key={sub.language} value={sub.language}>
                    {sub.label}
                  </option>
                ))}
              </select>
            )}
            {onClose && (
              <button 
                className="w-6 h-6 bg-red-500 flex items-center justify-center text-white hover:bg-red-400"
                onClick={onClose}
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}

      {/* Next Episode Button - Hidden when fullscreen */}
      {!isFullscreen && onNextEpisode && typeof currentEpisode === 'number' && typeof totalEpisodes === 'number' && currentEpisode < totalEpisodes && (
        <div className="next-episode-container px-4 py-3 bg-black border-b-2 border-green-600">
          <button
            onClick={onNextEpisode}
            className="w-full py-3 px-4 bg-green-700 hover:bg-green-600 active:bg-green-500 text-white font-bold flex items-center justify-center gap-3 transition-colors"
          >
            <span>NEXT EPISODE</span>
            <span className="text-green-300 text-sm">({currentEpisode + 1} / {totalEpisodes})</span>
          </button>
        </div>
      )}

      {/* Video Container */}
      <div className="video-wrapper relative bg-black">
        <div ref={videoRef} className="video-element w-full h-full" />
        
        {/* Loading Overlay */}
        {isLoading && (
          <div 
            className="absolute inset-0 bg-black flex flex-col items-center justify-center z-10"
          >
            <div className="loading-dots text-4xl mb-4" />
            <p className="text-green-400 text-sm font-bold">LOADING VIDEO...</p>
          </div>
        )}
      </div>

      {/* Retro styling for video.js controls */}
      <style>{`
        /* Container styling */
        .video-player-container {
          display: flex;
          flex-direction: column;
        }
        
        .player-header {
          flex-shrink: 0;
        }
        
        .next-episode-container {
          flex-shrink: 0;
        }
        
        /* Video wrapper */
        .video-wrapper {
          position: relative;
          width: 100%;
          height: auto;
          min-height: 200px;
          aspect-ratio: 16 / 9;
        }
        
        @media (max-height: 600px) {
          .video-wrapper {
            aspect-ratio: unset;
            height: calc(100vh - 120px);
            min-height: 180px;
          }
        }
        
        .video-element {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
        }
        
        /* Video.js base styles */
        .video-js {
          width: 100% !important;
          height: 100% !important;
          position: relative !important;
          padding-top: 0 !important;
        }
        
        .video-js video,
        .video-js .vjs-tech {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
        }
        
        /* Control bar */
        .video-js .vjs-control-bar {
          background: rgba(0, 0, 0, 0.95) !important;
          border-top: 1px solid #22c55e;
          position: absolute !important;
          bottom: 0 !important;
          left: 0 !important;
          right: 0 !important;
          height: 50px !important;
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          z-index: 100 !important;
        }
        
        .video-js.vjs-user-inactive .vjs-control-bar,
        .video-js.vjs-user-active .vjs-control-bar,
        .video-js.vjs-paused .vjs-control-bar,
        .video-js.vjs-playing .vjs-control-bar {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Fullscreen */
        .video-js.vjs-fullscreen {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 2147483647 !important;
        }
        
        /* Big play button */
        .video-js .vjs-big-play-button {
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid #22c55e;
          border-radius: 0;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          margin: 0 !important;
        }
        
        .video-js .vjs-big-play-button:hover {
          background: rgba(34, 197, 94, 0.3);
        }
        
        /* Progress bar */
        .video-js .vjs-play-progress {
          background: #22c55e !important;
        }
        
        .video-js .vjs-slider {
          background: rgba(34, 197, 94, 0.3);
        }
        
        .video-js .vjs-volume-level {
          background: #22c55e !important;
        }
        
        .video-js .vjs-control:focus {
          text-shadow: 0 0 1em #22c55e;
        }
        
        .video-js .vjs-time-control,
        .video-js .vjs-remaining-time,
        .video-js .vjs-playback-rate .vjs-playback-rate-value {
          color: #22c55e;
        }
        
        /* Subtitle styling */
        .video-js .vjs-text-track-display {
          z-index: 101 !important;
        }
        
        .video-js .vjs-text-track-cue {
          background: rgba(0, 0, 0, 0.8) !important;
          color: #fff !important;
          font-size: 16px !important;
          font-weight: bold !important;
          text-shadow: 1px 1px 2px black !important;
        }
        
        /* Safari subtitle fixes */
        video::-webkit-media-text-track-container {
          z-index: 101 !important;
        }
        
        video::-webkit-media-text-track-display {
          background: rgba(0, 0, 0, 0.8) !important;
        }
        
        /* Prevent zoom on mobile */
        .video-js * {
          touch-action: manipulation;
        }
        
        /* Hide default loading spinner */
        .video-js .vjs-loading-spinner {
          display: none !important;
        }
        
        /* Poster */
        .vjs-poster {
          background-size: contain !important;
        }
        
        /* Mobile menu buttons */
        .vjs-subs-caps-button,
        .vjs-playback-rate-menu-button {
          display: flex !important;
        }
      `}</style>
    </div>
  );
}
