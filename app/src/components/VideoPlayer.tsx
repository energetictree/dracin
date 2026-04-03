import { useEffect, useMemo, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { SkipBack, SkipForward } from 'lucide-react';
import type { SubtitleTrack } from '@/types/drama';
import { getPlayerPreferences, savePlayerPreferences } from '@/lib/playerPrefs';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitleUrl?: string;
  subtitles?: SubtitleTrack[];
  onClose?: () => void;
  currentEpisode?: number;
  totalEpisodes?: number;
  onPrevEpisode?: () => void;
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
  onPrevEpisode,
  onNextEpisode,
  autoPlayNext = true
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ReturnType<typeof videojs> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Load preferences from localStorage on mount
  const prefs = useMemo(() => getPlayerPreferences(), []);
  
  const [activeSubtitleLang, setActiveSubtitleLang] = useState<string>(prefs.subtitleLanguage);
  const [autoNextEnabled, setAutoNextEnabled] = useState(prefs.autoNextEnabled);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(prefs.autoPlayEnabled);
  
  // Ref to track if we should autoplay on next source change (for Auto Play feature)
  const shouldAutoPlayRef = useRef(false);

  // Use subtitles array if provided, otherwise fall back to single subtitleUrl
  // Memoized to prevent unnecessary re-renders
  const availableSubtitles = useMemo(() => {
    return subtitles || (subtitleUrl ? [{
      url: subtitleUrl,
      language: 'en',
      label: 'English',
      isDefault: true
    }] : []);
  }, [subtitles, subtitleUrl]);

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

    // Handle video ended - auto next / auto play
    player.on('ended', () => {
      console.log('[VideoPlayer] video ended, autoNextEnabled:', autoNextEnabled, 'autoPlayEnabled:', autoPlayEnabled);
      
      const hasNextEpisode = onNextEpisode && currentEpisode && totalEpisodes && currentEpisode < totalEpisodes;
      
      if (hasNextEpisode) {
        if (autoPlayEnabled) {
          // Auto Play: Exit fullscreen, set flag, then load next episode
          console.log('[VideoPlayer] Auto Play: Exiting fullscreen and loading next episode');
          shouldAutoPlayRef.current = true;
          
          // Exit fullscreen first to avoid glitches during transition
          if (player.isFullscreen()) {
            player.exitFullscreen();
          }
          
          // Small delay to ensure fullscreen exit completes before loading next
          setTimeout(() => {
            onNextEpisode();
          }, 300);
        } else if (autoNextEnabled) {
          // Auto Next: Go to next episode but don't autoplay (exit fullscreen, user clicks play)
          console.log('[VideoPlayer] Auto Next: Loading next episode (paused)');
          if (player.isFullscreen()) {
            player.exitFullscreen();
          }
          onNextEpisode();
        }
      }
    });
    
    // Handle autoplay on load if shouldAutoPlay flag is set
    if (shouldAutoPlayRef.current) {
      shouldAutoPlayRef.current = false; // Reset the flag
      
      console.log('[VideoPlayer] Auto Play: Setting up autoplay');
      
      // Wait for video to be ready to play
      const handleCanPlay = () => {
        console.log('[VideoPlayer] Auto Play: Video ready, entering fullscreen and playing');
        
        // First enter fullscreen, then play
        const enterFullscreenAndPlay = () => {
          player.requestFullscreen().then(() => {
            // Play after entering fullscreen
            setTimeout(() => {
              const playPromise = player.play();
              if (playPromise) {
                playPromise.catch((err) => {
                  console.log('[VideoPlayer] Auto Play: Autoplay prevented by browser:', err);
                });
              }
            }, 300);
          }).catch(() => {
            console.log('[VideoPlayer] Auto Play: Could not enter fullscreen, playing anyway');
            player.play().catch(() => {});
          });
        };
        
        enterFullscreenAndPlay();
      };
      
      // Use 'canplay' event which fires when video is ready to play
      player.one('canplay', handleCanPlay);
      
      // Fallback: if canplay already fired or takes too long, try after a delay
      setTimeout(() => {
        if (player.readyState() >= 2) { // HAVE_CURRENT_DATA or better
          handleCanPlay();
        }
      }, 1500);
    }

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

    // Use proxy for decrypt-stream (backup API handles this, primary is blocked)
    const decryptUrl = `/api-proxy/decrypt-stream?url=${encodeURIComponent(src)}`;
    
    console.log('[VideoPlayer] Loading video via proxy:', decryptUrl.substring(0, 100) + '...');
    
    player.src({
      src: decryptUrl,
      type: 'video/mp4',
    });
    
    // Note: Autoplay disabled - user must click play manually
    
    // Add all subtitle tracks
    if (availableSubtitles.length > 0) {
      player.ready(() => {
        console.log('[VideoPlayer] Adding subtitle tracks:', availableSubtitles, 'User preference:', activeSubtitleLang);
        
        // Check if user's preferred language is available
        const hasPreferredLang = availableSubtitles.some(s => s.language === activeSubtitleLang);
        const targetLang = hasPreferredLang ? activeSubtitleLang : availableSubtitles[0]?.language;
        
        availableSubtitles.forEach((sub) => {
          // Use user's preference if available, otherwise use sub's default or first track
          const isDefault = sub.language === targetLang;
          
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
            const textTrack = track.track;
            if (textTrack) {
              textTrack.mode = isDefault ? 'showing' : 'disabled';
            }
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
        // Always exit fullscreen on cleanup to avoid glitches
        if (playerRef.current.isFullscreen()) {
          playerRef.current.exitFullscreen();
        }
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [src, poster, subtitles, subtitleUrl, autoNextEnabled, autoPlayEnabled, autoPlayNext, currentEpisode, totalEpisodes, onNextEpisode, onPrevEpisode]);

  // Handle subtitle language switch
  const handleSubtitleChange = (language: string) => {
    const player = playerRef.current;
    if (!player) return;
    
    // Update Video.js text tracks
    const tracks = player.textTracks();
    const trackArray = Array.from(tracks as unknown as TextTrack[]);
    
    trackArray.forEach((track) => {
      if (track.kind === 'subtitles') {
        track.mode = track.language === language ? 'showing' : 'disabled';
      }
    });
    
    // Also update native HTML track elements (important for fullscreen/Safari)
    const tech = player.tech({ IWillNotUseThisInPlugins: true });
    if (tech && tech.el) {
      const videoEl = tech.el() as HTMLVideoElement;
      if (videoEl) {
        const htmlTracks = videoEl.querySelectorAll('track');
        htmlTracks.forEach((trackEl) => {
          if (trackEl.kind === 'subtitles') {
            trackEl.default = trackEl.srclang === language;
            // Force reload by removing and re-adding if needed
            if (trackEl.srclang === language) {
              trackEl.setAttribute('default', '');
            } else {
              trackEl.removeAttribute('default');
            }
          }
        });
      }
    }
    
    setActiveSubtitleLang(language);
    savePlayerPreferences({ subtitleLanguage: language });
    console.log('[VideoPlayer] Switched to subtitle:', language);
  };

  // Handle Auto Next toggle
  const handleAutoNextChange = (enabled: boolean) => {
    setAutoNextEnabled(enabled);
    savePlayerPreferences({ autoNextEnabled: enabled });
    console.log('[VideoPlayer] Auto Next:', enabled);
  };

  // Handle Auto Play toggle
  const handleAutoPlayChange = (enabled: boolean) => {
    setAutoPlayEnabled(enabled);
    savePlayerPreferences({ autoPlayEnabled: enabled });
    console.log('[VideoPlayer] Auto Play:', enabled);
  };

  return (
    <div className={`video-player-container w-full bg-black ${isFullscreen ? 'is-fullscreen' : ''}`}>
      {/* Player Header - Hidden when fullscreen */}
      {!isFullscreen && (
        <div className="player-header flex items-center justify-between px-3 py-2 bg-gray-900 border-b border-green-700">
          {/* Left spacer */}
          <div className="w-6" />
          
          {/* Center controls */}
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
            {/* Auto Next Toggle - Default ON */}
            {onNextEpisode && (
              <label className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-gray-800 text-green-400 border border-green-600 rounded cursor-pointer" title="Auto go to next episode when finished">
                <input
                  type="checkbox"
                  checked={autoNextEnabled}
                  onChange={(e) => handleAutoNextChange(e.target.checked)}
                  className="w-3 h-3 accent-green-500"
                />
                <span>Auto Next</span>
              </label>
            )}
            {/* Auto Play Toggle - Default OFF */}
            {onNextEpisode && (
              <label className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-gray-800 text-yellow-400 border border-yellow-600 rounded cursor-pointer" title="Auto-play next episode when finished (fullscreen)">
                <input
                  type="checkbox"
                  checked={autoPlayEnabled}
                  onChange={(e) => handleAutoPlayChange(e.target.checked)}
                  className="w-3 h-3 accent-yellow-500"
                />
                <span>Auto Play</span>
              </label>
            )}
          </div>
          
          {/* Right side - close button */}
          <div className="w-6">
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

      {/* Episode Navigation Buttons - Hidden when fullscreen */}
      {!isFullscreen && typeof currentEpisode === 'number' && typeof totalEpisodes === 'number' && totalEpisodes > 1 && (
        <div className="episode-nav-container px-4 py-3 bg-black border-b-2 border-green-600">
          <div className="flex items-center justify-center gap-4">
            {/* Previous Episode Button */}
            {onPrevEpisode && (
              <button
                onClick={onPrevEpisode}
                disabled={currentEpisode <= 1}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded font-bold transition-colors ${
                  currentEpisode <= 1
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-green-700 hover:bg-green-600 active:bg-green-500 text-white'
                }`}
                title={currentEpisode > 1 ? `Episode ${currentEpisode - 1}` : 'First episode'}
              >
                <SkipBack className="w-5 h-5" />
                <span className="text-sm">PREV</span>
              </button>
            )}
            
            {/* Episode Counter */}
            <div className="text-green-400 font-bold text-sm px-2">
              {currentEpisode} / {totalEpisodes}
            </div>
            
            {/* Next Episode Button */}
            {onNextEpisode && (
              <button
                onClick={onNextEpisode}
                disabled={currentEpisode >= totalEpisodes}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded font-bold transition-colors ${
                  currentEpisode >= totalEpisodes
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : 'bg-green-700 hover:bg-green-600 active:bg-green-500 text-white'
                }`}
                title={currentEpisode < totalEpisodes ? `Episode ${currentEpisode + 1}` : 'Last episode'}
              >
                <span className="text-sm">NEXT</span>
                <SkipForward className="w-5 h-5" />
              </button>
            )}
          </div>
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
        
        /* Subtitle styling - Normal and Fullscreen */
        .video-js .vjs-text-track-display,
        .video-js.vjs-fullscreen .vjs-text-track-display {
          z-index: 101 !important;
        }
        
        .video-js .vjs-text-track-cue,
        .video-js.vjs-fullscreen .vjs-text-track-cue {
          background: rgba(0, 0, 0, 0.8) !important;
          color: #DAA520 !important;
          font-size: 32px !important;
          font-weight: bold !important;
          text-shadow: 2px 2px 4px black !important;
        }
        
        /* Fullscreen specific - make subtitles even larger */
        .video-js.vjs-fullscreen .vjs-text-track-cue {
          font-size: 48px !important;
        }
        
        /* Safari subtitle fixes */
        video::-webkit-media-text-track-container,
        video.vjs-fullscreen::-webkit-media-text-track-container {
          z-index: 101 !important;
        }
        
        video::-webkit-media-text-track-display,
        video.vjs-fullscreen::-webkit-media-text-track-display {
          background: rgba(0, 0, 0, 0.8) !important;
        }
        
        video::-webkit-media-text-track-display span,
        video.vjs-fullscreen::-webkit-media-text-track-display span {
          color: #DAA520 !important;
          font-weight: bold !important;
          text-shadow: 2px 2px 4px black !important;
        }
        
        video::-webkit-media-text-track-display span {
          font-size: 32px !important;
        }
        
        video.vjs-fullscreen::-webkit-media-text-track-display span {
          font-size: 48px !important;
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
