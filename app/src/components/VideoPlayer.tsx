import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitleUrl?: string;
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
  onClose, 
  currentEpisode, 
  totalEpisodes, 
  onNextEpisode,
  autoPlayNext = true
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        nativeTextTracks: false, // Important for Safari
        nativeAudioTracks: false,
        nativeVideoTracks: false,
      },
      controls: true,
      fluid: false, // Changed to false for better mobile control
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
      const fs = player.isFullscreen();
      console.log('[VideoPlayer] fullscreen change:', fs);
      setIsFullscreen(fs);
      
      // Force player to recalculate size on fullscreen change
      if (!fs) {
        // Small delay to let the browser settle
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
    
    // Add subtitle track with Safari compatibility
    if (subtitleUrl) {
      player.ready(() => {
        console.log('[VideoPlayer] Adding subtitle track:', subtitleUrl);
        
        // Method 1: Using Video.js addRemoteTextTrack
        const track = player.addRemoteTextTrack({
          kind: 'subtitles',
          src: subtitleUrl,
          srclang: 'en',
          label: 'English',
          default: true,
          mode: 'showing'
        }, true); // Changed to true for manual cleanup
        
        // Force the track to show - important for Safari
        if (track) {
          track.mode = 'showing';
          
          // Safari-specific: ensure track is properly loaded
          if (track.track) {
            track.track.mode = 'showing';
          }
          
          console.log('[VideoPlayer] Subtitle track added:', track);
        }
        
        // Method 2: Also add via HTML video element for Safari
        const tech = player.tech({ IWillNotUseThisInPlugins: true });
        if (tech && tech.el) {
          const videoEl = tech.el() as HTMLVideoElement;
          if (videoEl) {
            // Remove any existing tracks
            while (videoEl.querySelector('track')) {
              const existingTrack = videoEl.querySelector('track');
              if (existingTrack) {
                videoEl.removeChild(existingTrack);
              }
            }
            
            // Add new track element
            const trackEl = document.createElement('track');
            trackEl.kind = 'subtitles';
            trackEl.src = subtitleUrl;
            trackEl.srclang = 'en';
            trackEl.label = 'English';
            trackEl.default = true;
            videoEl.appendChild(trackEl);
            
            console.log('[VideoPlayer] Track element added to video for Safari');
          }
        }
      });
    }
    
    // Failsafe: hide loading after 10 seconds
    const failsafeTimer = setTimeout(() => {
      console.log('[VideoPlayer] failsafe: forcing loading off');
      setIsLoading(false);
    }, 10000);

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
  }, [src, poster, subtitleUrl, autoPlayNext, currentEpisode, totalEpisodes, onNextEpisode]);

  return (
    <div className={`video-player-container w-full bg-black ${isFullscreen ? 'is-fullscreen' : ''}`}>
      {/* Player Header - Hidden when fullscreen */}
      {!isFullscreen && (
        <div className="player-header flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-green-700">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="text-green-400 font-bold text-sm truncate">{title || 'VIDEO_PLAYER.EXE'}</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Subtitle Toggle Button */}
            {subtitleUrl && (
              <button
                className={`px-2 py-1 text-xs font-bold rounded ${
                  subtitleEnabled 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-700 text-gray-400'
                }`}
                onClick={() => {
                  const player = playerRef.current;
                  if (player) {
                    const tracks = player.textTracks();
                    for (let i = 0; i < tracks.length; i++) {
                      const track = tracks[i];
                      if (track.kind === 'subtitles') {
                        track.mode = subtitleEnabled ? 'disabled' : 'showing';
                      }
                    }
                    setSubtitleEnabled(!subtitleEnabled);
                  }
                }}
              >
                CC
              </button>
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

      {/* Video Container - Fixed aspect ratio for mobile */}
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
        
        /* Video wrapper - maintain aspect ratio */
        .video-wrapper {
          position: relative;
          width: 100%;
          height: auto;
          min-height: 200px;
          aspect-ratio: 16 / 9;
        }
        
        /* On very small screens, ensure minimum height */
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
        
        /* Ensure video fills container */
        .video-js video,
        .video-js .vjs-tech {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
        }
        
        /* Control bar styling */
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
        
        /* Ensure controls never hide */
        .video-js.vjs-user-inactive .vjs-control-bar,
        .video-js.vjs-user-active .vjs-control-bar,
        .video-js.vjs-paused .vjs-control-bar,
        .video-js.vjs-playing .vjs-control-bar {
          display: flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        
        /* Fullscreen styles */
        .video-js.vjs-fullscreen {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          width: 100vw !important;
          height: 100vh !important;
          z-index: 2147483647 !important;
        }
        
        /* Big play button centered */
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
        
        /* Progress bar colors */
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
        
        /* Subtitle styling for better visibility */
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
        
        /* Safari-specific subtitle fixes */
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
        
        /* Poster image */
        .vjs-poster {
          background-size: contain !important;
        }
        
        /* Mobile menu button always visible */
        .vjs-subs-caps-button,
        .vjs-playback-rate-menu-button {
          display: flex !important;
        }
      `}</style>
    </div>
  );
}
