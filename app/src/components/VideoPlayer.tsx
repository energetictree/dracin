import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
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
  onClose, 
  currentEpisode, 
  totalEpisodes, 
  onNextEpisode,
  autoPlayNext = true
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
      },
      controls: true,
      fluid: true,
      responsive: true,
      preload: 'auto',
      poster: poster,
      playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 2],
      inactivityTimeout: 0,
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
    });

    playerRef.current = player;

    // Loading events - set up BEFORE setting source
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
      // Only show loading if we're not already playing
      if (player.paused()) {
        setIsLoading(true);
      }
    });

    // Add error handling
    player.on('error', () => {
      console.error('[VideoPlayer] error:', player.error());
      setIsLoading(false);
    });

    // Handle video ended - auto play next episode
    player.on('ended', () => {
      console.log('[VideoPlayer] video ended');
      if (autoPlayNext && onNextEpisode && currentEpisode && totalEpisodes && currentEpisode < totalEpisodes) {
        onNextEpisode();
      }
    });

    // Handle fullscreen change
    player.on('fullscreenchange', () => {
      console.log('[VideoPlayer] fullscreen change:', player.isFullscreen());
      if (player.isFullscreen()) {
        // Force body to allow fullscreen
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }
    });

    // Transform the video URL to use the decrypt-stream API
    const decryptUrl = `https://api.sansekai.my.id/api/dramabox/decrypt-stream?url=${encodeURIComponent(src)}`;
    
    // Set source AFTER event handlers are attached
    player.src({
      src: decryptUrl,
      type: 'application/x-mpegURL', // HLS streams
    });
    
    // Failsafe: hide loading after 10 seconds max
    const failsafeTimer = setTimeout(() => {
      console.log('[VideoPlayer] failsafe: forcing loading off');
      setIsLoading(false);
    }, 10000);

    return () => {
      clearTimeout(failsafeTimer);
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, poster]);

  return (
    <div className="w-full bg-black">
      {/* Player Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-green-700">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="text-green-400 font-bold text-sm truncate">{title || 'VIDEO_PLAYER.EXE'}</span>
        </div>
        {onClose && (
          <button 
            className="w-6 h-6 bg-red-500 flex items-center justify-center text-white hover:bg-red-400"
            onClick={onClose}
          >
            ✕
          </button>
        )}
      </div>

      {/* Next Episode Button - moved to top for visibility */}
      {onNextEpisode && currentEpisode && totalEpisodes && currentEpisode < totalEpisodes && (
        <div className="next-episode-btn px-4 py-3 bg-black border-b-2 border-green-600">
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
      <div className="w-full bg-black relative video-container">
        <div ref={videoRef} className="w-full h-full video-element-wrapper" />
        
        {/* Loading Overlay */}
        {isLoading && (
          <div 
            className="absolute inset-0 bg-black flex flex-col items-center justify-center"
            style={{ zIndex: 5 }}
          >
            <div className="loading-dots text-4xl mb-4" />
            <p className="text-green-400 text-sm font-bold">LOADING VIDEO...</p>
          </div>
        )}
      </div>



      {/* Extra space below video for scrolling - ensures controls are visible on mobile */}
      <div className="scroll-spacer h-48 bg-black" />

      {/* Retro styling for video.js controls */}
      <style>{`
        /* Player wrapper - min height for scrolling */
        .player-wrapper {
          min-height: 120vh;
        }
        /* Video container */
        .video-container {
          height: 50vh;
          min-height: 250px;
          position: relative;
        }
        /* Video element wrapper */
        .video-element-wrapper {
          width: 100%;
          height: 100%;
        }
        /* Video.js base styles */
        .video-js {
          width: 100% !important;
          height: 100% !important;
        }
        /* Fullscreen styles - ONLY apply when actually fullscreen */
        .video-js.vjs-fullscreen {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 2147483647 !important;
        }
        /* Video in fullscreen */
        .video-js.vjs-fullscreen video,
        .video-js.vjs-fullscreen .vjs-tech {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
        }
        /* Hide next episode button and spacer when fullscreen */
        .video-js.vjs-fullscreen ~ .next-episode-btn,
        .video-js.vjs-fullscreen ~ .scroll-spacer {
          display: none !important;
        }
        /* Force parent containers to allow fullscreen */
        html:has(.video-js.vjs-fullscreen),
        body:has(.video-js.vjs-fullscreen) {
          overflow: hidden !important;
        }
        /* Override any parent overflow constraints */
        *:has(> .video-js.vjs-fullscreen) {
          overflow: visible !important;
          position: static !important;
        }
        .vjs-poster {
          background-size: contain !important;
        }
        .video-js video,
        .video-js .vjs-tech {
          object-fit: contain !important;
          width: 100% !important;
          height: 100% !important;
        }
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
          transform: translateZ(0);
        }
        .video-js.vjs-paused .vjs-control-bar,
        .video-js.vjs-playing .vjs-control-bar,
        .video-js.vjs-user-active .vjs-control-bar,
        .video-js.vjs-user-inactive .vjs-control-bar {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        /* Never hide controls */
        .video-js.vjs-user-inactive.vjs-playing .vjs-control-bar {
          opacity: 1 !important;
        }
        .video-js .vjs-big-play-button {
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid #22c55e;
          border-radius: 0;
          top: 50% !important;
          left: 50% !important;
          transform: translate(-50%, -50%) !important;
          margin: 0 !important;
          position: absolute !important;
        }
        .video-js .vjs-big-play-button:hover {
          background: rgba(34, 197, 94, 0.3);
        }
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
        .video-js .vjs-time-control {
          color: #22c55e;
        }
        .video-js .vjs-remaining-time {
          color: #22c55e;
        }
        .video-js .vjs-playback-rate .vjs-playback-rate-value {
          color: #22c55e;
        }
        /* Prevent zoom on mobile */
        .video-js * {
          touch-action: manipulation;
        }
        /* Hide video.js default loading spinner */
        .video-js .vjs-loading-spinner {
          display: none !important;
        }
      `}</style>
    </div>
  );
}
