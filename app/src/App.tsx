import { useState, useEffect, useCallback, useRef } from 'react';
import { Terminal, Search, TrendingUp, Clock, Star, X, Minus, Monitor, Cpu, HardDrive, Menu, ArrowLeft, Maximize2, Minimize2, History, Play, Trash2 } from 'lucide-react';
import { fetchLatestDramas, fetchTrendingDramas, fetchForYouDramas, fetchVIPDramas, searchDramas, getEpisodeVideoUrl, getFirstEpisodeVideoUrl } from '@/services/dramaApiCached';
import type { Drama, WindowState, ViewMode, VideoData } from '@/types/drama';
import { DramaCard } from '@/components/DramaCard';
import { DramaDetail } from '@/components/DramaDetail';
import { TerminalPanel } from '@/components/TerminalPanel';
import { BootSequence } from '@/components/BootSequence';
import { MobileNav } from '@/components/MobileNav';
import { VideoPlayer } from '@/components/VideoPlayer';
import { useMobile } from '@/hooks/useMobile';
import { getSession, type UserSession } from '@/config/auth';
import { addToHistory, getWatchHistory, removeFromHistory, type WatchHistoryItem, getTimeAgo } from '@/lib/history';

function App() {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [, setActiveWindowId] = useState<string | null>(null);
  const [highestZIndex, setHighestZIndex] = useState(100);
  const [isBooting, setIsBooting] = useState(true);
  const [, setUserSession] = useState<UserSession | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  // Mobile back navigation - track previous mode
  const [mobilePreviousMode, setMobilePreviousMode] = useState<ViewMode | null>(null);
  const [mobilePreviousData, setMobilePreviousData] = useState<Drama | string | null>(null);
  const [playerReturnDrama, setPlayerReturnDrama] = useState<Drama | null>(null);
  const [currentEpisodeNum, setCurrentEpisodeNum] = useState<number>(1);
  const [totalEpisodeCount, setTotalEpisodeCount] = useState<number>(0);
  const [showMobileTerminal, setShowMobileTerminal] = useState(false);
  
  // Dragging state
  const [draggingWindow, setDraggingWindow] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  const { isMobile } = useMobile();

  // Clock update
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Boot sequence with login check
  useEffect(() => {
    // Check if user has a valid session
    const session = getSession();
    if (session) {
      setUserSession(session);
      setIsBooting(false);
      addLog(`SYSTEM: Welcome back, ${session.username}`);
      addLog('SYSTEM: Dracin Terminal v1.0 loaded');
      return;
    }
    
    // If no session, show boot sequence
    addLog('SYSTEM: Boot sequence started');
  }, []);

  // Handle user login from boot sequence
  const handleLogin = useCallback((username: string) => {
    const session = getSession();
    setUserSession(session);
    setIsBooting(false);
    addLog(`SYSTEM: User authenticated - ${username}`);
    addLog('SYSTEM: Dracin Terminal v1.0 loaded');
  }, []);

  // Global mouse move/up handlers for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!draggingWindow) return;
      
      const win = windows.find(w => w.id === draggingWindow);
      if (!win || win.isMaximized) return;

      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;

      // Keep window within viewport bounds
      const maxX = window.innerWidth - win.size.width;
      const maxY = window.innerHeight - win.size.height - 40; // Account for taskbar

      setWindows(prev => prev.map(w => 
        w.id === draggingWindow 
          ? { 
              ...w, 
              position: {
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY)),
              }
            }
          : w
      ));
    };

    const handleMouseUp = () => {
      setDraggingWindow(null);
    };

    if (draggingWindow) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingWindow, windows]);

  const addLog = useCallback((message: string) => {
    setTerminalOutput(prev => [...prev.slice(-20), `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const openWindow = useCallback((mode: ViewMode, title: string, data?: Drama | string | null, videoData?: VideoData, defaultTab?: 'info' | 'episodes') => {
    // On mobile, replace existing window instead of stacking
    if (isMobile) {
      const newWindow: WindowState = {
        id: `win-mobile`,
        title,
        mode,
        isActive: true,
        isMinimized: false,
        isMaximized: false,
        zIndex: 100,
        position: { x: 0, y: 0 },
        size: { width: window.innerWidth, height: window.innerHeight },
        data,
        videoData,
        defaultTab
      };
      setWindows([newWindow]);
      addLog(`LOADED: ${title}`);
      return;
    }

    // Desktop: calculate position with offset for new windows
    const existingCount = windows.length;
    const offsetX = (existingCount * 30) % 200;
    const offsetY = (existingCount * 30) % 150;

    const newWindow: WindowState = {
      id: `win-${Date.now()}`,
      title,
      mode,
      isActive: true,
      isMinimized: false,
      isMaximized: false,
      zIndex: highestZIndex + 1,
      position: { x: 200 + offsetX, y: 80 + offsetY },
      size: { width: 800, height: 600 },
      data,
      videoData,
      defaultTab
    };
    
    setWindows(prev => prev.map(w => ({ ...w, isActive: false })).concat(newWindow));
    setActiveWindowId(newWindow.id);
    setHighestZIndex(prev => prev + 1);
    addLog(`LOADED: ${title}`);
  }, [highestZIndex, addLog, isMobile, windows.length]);

  const closeWindow = useCallback((id: string) => {
    setWindows(prev => prev.filter(w => w.id !== id));
    addLog(`CLOSED: Window ${id}`);
  }, [addLog]);

  const closeAllWindows = useCallback(() => {
    setWindows([]);
    addLog('CLOSED: All windows');
  }, [addLog]);

  const minimizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => 
      w.id === id ? { ...w, isMinimized: true, isActive: false } : w
    ));
    addLog(`MINIMIZED: Window ${id}`);
  }, [addLog]);

  const maximizeWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => {
      if (w.id !== id) return w;
      
      if (w.isMaximized) {
        // Restore to previous state
        return {
          ...w,
          isMaximized: false,
          position: w.previousState?.position || w.position,
          size: w.previousState?.size || w.size,
          previousState: undefined,
        };
      } else {
        // Maximize
        return {
          ...w,
          isMaximized: true,
          previousState: {
            position: w.position,
            size: w.size,
          },
          position: { x: 0, y: 0 },
          size: { width: window.innerWidth, height: window.innerHeight - 40 }, // Account for taskbar
        };
      }
    }));
    addLog(`MAXIMIZED/RESTORED: Window ${id}`);
  }, [addLog]);

  const activateWindow = useCallback((id: string) => {
    setWindows(prev => prev.map(w => ({
      ...w,
      isActive: w.id === id,
      zIndex: w.id === id ? highestZIndex + 1 : w.zIndex
    })));
    setActiveWindowId(id);
    setHighestZIndex(prev => prev + 1);
  }, [highestZIndex]);

  const handleTitleBarMouseDown = useCallback((e: React.MouseEvent, windowId: string) => {
    // Don't drag if clicking buttons
    if ((e.target as HTMLElement).closest('button')) return;
    
    const win = windows.find(w => w.id === windowId);
    if (!win || win.isMaximized) return;

    dragOffset.current = {
      x: e.clientX - win.position.x,
      y: e.clientY - win.position.y,
    };
    setDraggingWindow(windowId);
    activateWindow(windowId);
    e.preventDefault();
  }, [windows, activateWindow]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      openWindow('search', `SEARCH: ${searchQuery.toUpperCase()}`, searchQuery.trim());
      setSearchQuery('');
    }
  }, [searchQuery, openWindow]);

  const handleMobileSearch = useCallback((query: string) => {
    if (query.trim()) {
      openWindow('search', `SEARCH: ${query.toUpperCase()}`, query.trim());
    }
  }, [openWindow]);

  const handleDramaClick = useCallback((drama: Drama) => {
    // Save current mode for back navigation (mobile only)
    if (isMobile && windows.length > 0) {
      const currentWindow = windows[windows.length - 1];
      setMobilePreviousMode(currentWindow.mode);
      setMobilePreviousData(currentWindow.data || null);
    }
    openWindow('detail', drama.bookName.toUpperCase(), drama);
  }, [openWindow, isMobile, windows]);

  const handlePlayVideo = useCallback(async (drama: Drama, episodeNum?: number) => {
    const epNum = episodeNum || 1;
    addLog(`LOADING VIDEO: ${drama.bookName} Episode ${epNum}...`);
    
    // Save to watch history (only latest episode per drama)
    addToHistory({
      bookId: drama.bookId,
      bookName: drama.bookName,
      coverWap: drama.coverWap,
      episodeNum: epNum,
      totalEpisodes: drama.chapterCount || 0,
    });
    
    // Save drama and episode info
    setPlayerReturnDrama(drama);
    setCurrentEpisodeNum(epNum);
    setTotalEpisodeCount(drama.chapterCount || 0);
    
    // Open loading window immediately
    openWindow('loading', `LOADING: ${drama.bookName} EP.${epNum}`, drama);
    
    try {
      let videoResult;
      
      if (episodeNum) {
        // Play specific episode
        videoResult = await getEpisodeVideoUrl(drama.bookId, episodeNum, '720');
      } else {
        // Play first episode
        videoResult = await getFirstEpisodeVideoUrl(drama.bookId);
        episodeNum = videoResult?.episodeNum || 1;
      }
      
      if (videoResult && videoResult.url) {
        openWindow('player', `PLAYER: ${drama.bookName}${episodeNum ? ` EP.${episodeNum}` : ''}`, drama, {
          src: videoResult.url,
          poster: drama.coverWap,
          title: `${drama.bookName}${episodeNum ? ` - Episode ${episodeNum}` : ''}`
        });
        addLog(`VIDEO LOADED: Quality ${videoResult.quality}`);
      } else {
        addLog('ERROR: Failed to load video - No video URL found');
        // Fallback to sample video for testing
        openWindow('player', `PLAYER: ${drama.bookName}${episodeNum ? ` EP.${episodeNum}` : ''}`, drama, {
          src: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
          poster: drama.coverWap,
          title: `${drama.bookName}${episodeNum ? ` - Episode ${episodeNum}` : ''} (SAMPLE)`
        });
      }
    } catch (error) {
      addLog('ERROR: Failed to load video');
      console.error('Video load error:', error);
    }
  }, [openWindow, addLog]);

  const handleNextEpisode = useCallback(() => {
    if (playerReturnDrama && currentEpisodeNum < totalEpisodeCount) {
      const nextEp = currentEpisodeNum + 1;
      handlePlayVideo(playerReturnDrama, nextEp);
    }
  }, [playerReturnDrama, currentEpisodeNum, totalEpisodeCount, handlePlayVideo]);

  const handleClosePlayer = useCallback(() => {
    // Go back to detail view with episodes tab open
    if (playerReturnDrama) {
      openWindow('detail', `DETAIL: ${playerReturnDrama.bookName}`, playerReturnDrama, undefined, 'episodes');
      setPlayerReturnDrama(null);
    } else {
      closeWindow('win-mobile');
    }
  }, [playerReturnDrama, openWindow, closeWindow]);

  const handleBackFromDetail = useCallback(() => {
    // Go back to previous mode if available, otherwise go to latest
    if (mobilePreviousMode) {
      const titleMap: Record<ViewMode, string> = {
        'latest': 'DRAMA_LATEST.EXE',
        'trending': 'DRAMA_TRENDING.EXE',
        'foryou': 'DRAMA_FORYOU.EXE',
        'vip': 'DRAMA_VIP.EXE',
        'search': mobilePreviousData && typeof mobilePreviousData === 'string' 
          ? `SEARCH: ${mobilePreviousData.toUpperCase()}` 
          : 'SEARCH.EXE',
        'detail': 'DETAIL.EXE',
        'player': 'PLAYER.EXE',
        'loading': 'LOADING.EXE',
        'history': 'WATCH_HISTORY.EXE'
      };
      openWindow(mobilePreviousMode, titleMap[mobilePreviousMode], mobilePreviousData);
      // Clear previous mode after using it
      setMobilePreviousMode(null);
      setMobilePreviousData(null);
    } else {
      openWindow('latest', 'DRAMA_LATEST.EXE');
    }
  }, [openWindow, mobilePreviousMode, mobilePreviousData]);

  if (isBooting) {
    return <BootSequence onLogin={handleLogin} />;
  }

  // MOBILE LAYOUT
  if (isMobile) {
    return (
      <div className="h-screen bg-black retro-grid-bg flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <div className="bg-gray-800 border-b-2 border-green-600 px-3 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-green-400" />
            <span className="text-green-400 font-bold text-sm">DRACIN</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-black text-green-400 px-2 py-1 border border-green-600 text-xs">
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <button 
              className="p-1 text-green-400"
              onClick={() => setShowMobileMenu(!showMobileMenu)}
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="absolute top-12 right-2 bg-gray-900 border-2 border-green-600 z-50 min-w-[150px]">
            <button 
              className="w-full text-left px-4 py-3 text-green-400 border-b border-green-800 flex items-center gap-2"
              onClick={() => { openWindow('latest', 'DRAMA_LATEST.EXE'); setShowMobileMenu(false); }}
            >
              <Clock className="w-4 h-4" /> LATEST
            </button>
            <button 
              className="w-full text-left px-4 py-3 text-green-400 border-b border-green-800 flex items-center gap-2"
              onClick={() => { openWindow('trending', 'DRAMA_TRENDING.EXE'); setShowMobileMenu(false); }}
            >
              <TrendingUp className="w-4 h-4" /> TRENDING
            </button>
            <button 
              className="w-full text-left px-4 py-3 text-green-400 border-b border-green-800 flex items-center gap-2"
              onClick={() => { openWindow('foryou', 'DRAMA_FORYOU.EXE'); setShowMobileMenu(false); }}
            >
              <Star className="w-4 h-4" /> FOR YOU
            </button>
            <button 
              className="w-full text-left px-4 py-3 text-green-400 border-b border-green-800 flex items-center gap-2"
              onClick={() => { openWindow('vip', 'DRAMA_VIP.EXE'); setShowMobileMenu(false); }}
            >
              <Monitor className="w-4 h-4" /> VIP
            </button>
            <button 
              className="w-full text-left px-4 py-3 text-green-400 border-b border-green-800 flex items-center gap-2"
              onClick={() => { openWindow('history', 'WATCH_HISTORY.EXE'); setShowMobileMenu(false); }}
            >
              <History className="w-4 h-4" /> HISTORY
            </button>
            <button 
              className="w-full text-left px-4 py-3 text-green-400 flex items-center gap-2"
              onClick={() => { setShowMobileTerminal(true); setShowMobileMenu(false); }}
            >
              <Terminal className="w-4 h-4" /> TERMINAL
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 relative overflow-hidden">
          {windows.length === 0 ? (
            <div key="home-screen" className="h-full flex flex-col items-center justify-center p-6 z-0">
              <img src="/images/retro-tv.png" alt="Retro TV" className="w-24 h-24 mb-4 opacity-90" />
              <h1 className="text-green-400 text-2xl font-bold mb-2">DRACIN</h1>
              <p className="text-green-600 text-center mb-8">Select a category to browse dramas</p>
              
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <HomeButton 
                  icon={<Clock className="w-6 h-6" />}
                  label="LATEST"
                  onClick={() => openWindow('latest', 'DRAMA_LATEST.EXE')}
                />
                <HomeButton 
                  icon={<TrendingUp className="w-6 h-6" />}
                  label="TRENDING"
                  onClick={() => openWindow('trending', 'DRAMA_TRENDING.EXE')}
                />
                <HomeButton 
                  icon={<Star className="w-6 h-6" />}
                  label="FOR YOU"
                  onClick={() => openWindow('foryou', 'DRAMA_FORYOU.EXE')}
                />
                <HomeButton 
                  icon={<Monitor className="w-6 h-6" />}
                  label="VIP"
                  onClick={() => openWindow('vip', 'DRAMA_VIP.EXE')}
                />
              </div>
            </div>
          ) : (
            windows.filter(w => !w.isMinimized).map(window => (
              <div
                key={`win-${window.id}-${window.mode}`}
                className="absolute inset-0 bg-black flex flex-col z-10"
              >
                {/* Mobile Window Title Bar */}
                <div className="bg-gradient-to-r from-blue-800 to-blue-600 text-white px-3 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {window.mode === 'detail' && (
                      <button 
                        onClick={handleBackFromDetail}
                        className="p-1 touch-target"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    )}
                    <Terminal className="w-4 h-4 flex-shrink-0" />
                    <span className="text-xs font-bold truncate">{window.title}</span>
                  </div>
                  <button 
                    className="w-6 h-6 bg-red-500 flex items-center justify-center text-white"
                    onClick={() => closeWindow(window.id)}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Window Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {window.mode === 'loading' ? (
                    <div className="flex flex-col items-center justify-center h-full text-green-400 p-8 bg-black">
                      <div className="loading-dots text-4xl mb-4" />
                      <p className="text-xl font-bold">LOADING VIDEO...</p>
                      <p className="text-sm text-green-600 mt-2">Fetching episode data</p>
                    </div>
                  ) : window.mode === 'player' && window.videoData ? (
                    <div className="player-wrapper">
                      <VideoPlayer 
                        key={window.videoData.src}
                        src={window.videoData.src}
                        poster={window.videoData.poster}
                        title={window.videoData.title}
                        onClose={handleClosePlayer}
                        currentEpisode={currentEpisodeNum}
                        totalEpisodes={totalEpisodeCount}
                        onNextEpisode={handleNextEpisode}
                        autoPlayNext={true}
                      />
                    </div>
                  ) : window.mode === 'detail' && window.data && typeof window.data !== 'string' ? (
                    <DramaDetail 
                      drama={window.data} 
                      isMobile={true}
                      onBack={handleBackFromDetail}
                      onPlayVideo={handlePlayVideo}
                      defaultTab={window.defaultTab}
                    />
                  ) : (
                    <MobileWindowContent 
                      mode={window.mode} 
                      data={window.data}
                      onDramaClick={handleDramaClick}
                      onPlayVideo={handlePlayVideo}
                    />
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Terminal Panel */}
        <TerminalPanel 
          output={terminalOutput} 
          isMobile={true} 
          forceExpanded={showMobileTerminal}
          onClose={() => setShowMobileTerminal(false)}
        />

        {/* Mobile Bottom Navigation */}
        <MobileNav 
          onOpenLatest={() => openWindow('latest', 'DRAMA_LATEST.EXE')}
          onOpenTrending={() => openWindow('trending', 'DRAMA_TRENDING.EXE')}
          onOpenForYou={() => openWindow('foryou', 'DRAMA_FORYOU.EXE')}
          onOpenVIP={() => openWindow('vip', 'DRAMA_VIP.EXE')}
          onSearch={handleMobileSearch}
          activeWindowCount={windows.length}
          onCloseAll={closeAllWindows}
        />
      </div>
    );
  }

  // DESKTOP LAYOUT
  return (
    <div className="min-h-screen bg-black retro-grid-bg flex flex-col overflow-hidden">
      {/* Desktop Background */}
      <div className="flex-1 relative p-4">
        {/* Desktop Icons */}
        <div className="absolute top-4 left-4 flex flex-col gap-6">
          <DesktopIcon 
            icon={<Clock className="w-8 h-8" />} 
            label="LATEST.EXE" 
            onClick={() => openWindow('latest', 'DRAMA_LATEST.EXE')}
          />
          <DesktopIcon 
            icon={<TrendingUp className="w-8 h-8" />} 
            label="TRENDING.EXE" 
            onClick={() => openWindow('trending', 'DRAMA_TRENDING.EXE')}
          />
          <DesktopIcon 
            icon={<Star className="w-8 h-8" />} 
            label="FORYOU.EXE" 
            onClick={() => openWindow('foryou', 'DRAMA_FORYOU.EXE')}
          />
          <DesktopIcon 
            icon={<Monitor className="w-8 h-8" />} 
            label="VIP.EXE" 
            onClick={() => openWindow('vip', 'DRAMA_VIP.EXE')}
          />
        </div>

        {/* Windows */}
        {windows.map((window) => (
          !window.isMinimized && (
            <div
              key={window.id}
              className="absolute retro-window-dark"
              style={{
                top: `${window.position.y}px`,
                left: `${window.position.x}px`,
                width: `${window.size.width}px`,
                height: `${window.size.height}px`,
                zIndex: window.zIndex,
              }}
              onClick={() => activateWindow(window.id)}
            >
              {/* Title Bar - Draggable */}
              <div 
                className={`retro-titlebar flex items-center justify-between ${window.isActive ? 'retro-titlebar-active' : 'bg-gray-600'} cursor-move`}
                onMouseDown={(e) => handleTitleBarMouseDown(e, window.id)}
              >
                <div className="flex items-center gap-2 pointer-events-none">
                  <Terminal className="w-4 h-4" />
                  <span>{window.title}</span>
                </div>
                <div className="flex gap-1">
                  <button 
                    className="w-5 h-5 bg-gray-300 border border-white border-r-gray-800 border-b-gray-800 flex items-center justify-center text-black hover:bg-gray-200"
                    onClick={(e) => { e.stopPropagation(); minimizeWindow(window.id); }}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button 
                    className="w-5 h-5 bg-gray-300 border border-white border-r-gray-800 border-b-gray-800 flex items-center justify-center text-black hover:bg-gray-200"
                    onClick={(e) => { e.stopPropagation(); maximizeWindow(window.id); }}
                  >
                    {window.isMaximized ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </button>
                  <button 
                    className="w-5 h-5 bg-red-500 border border-white border-r-gray-800 border-b-gray-800 flex items-center justify-center text-white hover:bg-red-400"
                    onClick={(e) => { e.stopPropagation(); closeWindow(window.id); }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Window Content */}
              <div className="p-4 h-[calc(100%-32px)] overflow-auto retro-scroll bg-black">
                {window.mode === 'loading' ? (
                  <div className="flex flex-col items-center justify-center h-full text-green-400">
                    <div className="loading-dots text-4xl mb-4" />
                    <p className="text-xl font-bold">LOADING VIDEO...</p>
                    <p className="text-sm text-green-600 mt-2">Fetching episode data</p>
                  </div>
                ) : window.mode === 'player' && window.videoData ? (
                  <VideoPlayer 
                    key={window.videoData.src}
                    src={window.videoData.src}
                    poster={window.videoData.poster}
                    title={window.videoData.title}
                    onClose={() => closeWindow(window.id)}
                    currentEpisode={currentEpisodeNum}
                    totalEpisodes={totalEpisodeCount}
                    onNextEpisode={handleNextEpisode}
                    autoPlayNext={true}
                  />
                ) : window.mode === 'detail' && window.data && typeof window.data !== 'string' ? (
                  <DramaDetail 
                    drama={window.data} 
                    isMobile={false}
                    onPlayVideo={handlePlayVideo}
                    defaultTab={window.defaultTab}
                  />
                ) : (
                  <WindowContent 
                    mode={window.mode} 
                    data={window.data}
                    onDramaClick={handleDramaClick}
                  />
                )}
              </div>
            </div>
          )
        ))}

        {/* Minimized Windows Bar */}
        {windows.some(w => w.isMinimized) && (
          <div className="absolute bottom-16 left-4 right-4 flex gap-2 flex-wrap">
            {windows.filter(w => w.isMinimized).map(window => (
              <button
                key={window.id}
                className="retro-btn text-xs py-1 px-2"
                onClick={() => {
                  setWindows(prev => prev.map(w => 
                    w.id === window.id ? { ...w, isMinimized: false } : w
                  ));
                  activateWindow(window.id);
                }}
              >
                {window.title}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Terminal Panel */}
      <TerminalPanel output={terminalOutput} isMobile={false} />

      {/* Taskbar */}
      <div className="bg-gray-300 border-t-2 border-gray-400 p-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button 
            className="retro-btn flex items-center gap-2"
            onClick={() => openWindow('latest', 'DRAMA_LATEST.EXE')}
          >
            <Terminal className="w-4 h-4" />
            START
          </button>
          
          <div className="h-6 w-px bg-gray-500 mx-2" />
          
          {/* Search Box */}
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="SEARCH_DRAMA..."
              className="retro-input text-sm py-1 w-48"
            />
          </form>
        </div>

        <div className="flex items-center gap-4 status-bar">
          <div className="flex items-center gap-1">
            <Cpu className="w-4 h-4" />
            <span>CPU: 12%</span>
          </div>
          <div className="flex items-center gap-1">
            <HardDrive className="w-4 h-4" />
            <span>MEM: 64MB</span>
          </div>
          <div className="bg-black text-green-400 px-2 py-1 border border-green-600">
            {currentTime.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile Home Button
function HomeButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button 
      className="bg-gray-900 border-2 border-green-700 p-4 flex flex-col items-center gap-2 active:bg-green-900/30 transition-colors"
      onClick={onClick}
    >
      <span className="text-green-400">{icon}</span>
      <span className="text-green-500 text-xs font-bold">{label}</span>
    </button>
  );
}

// Desktop Icon Component
function DesktopIcon({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button 
      className="flex flex-col items-center gap-1 p-2 hover:bg-green-900/30 rounded cursor-pointer group"
      onClick={onClick}
    >
      <div className="text-green-400 group-hover:text-green-300 drop-shadow-[0_0_5px_rgba(0,255,0,0.5)]">
        {icon}
      </div>
      <span className="text-green-400 text-xs text-center max-w-[80px] break-words bg-black/50 px-1">
        {label}
      </span>
    </button>
  );
}

// Mobile Window Content
function MobileWindowContent({ 
  mode, 
  data,
  onDramaClick,
  onPlayVideo,
}: { 
  mode: ViewMode; 
  data?: Drama | string | null;
  onDramaClick: (drama: Drama) => void;
  onPlayVideo?: (drama: Drama, episodeNum?: number) => void;
}) {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [itemToRemove, setItemToRemove] = useState<WatchHistoryItem | null>(null);
  // If data is a string, it's the initial search query
  const initialSearchQuery = typeof data === 'string' ? data : '';
  const [searchQuery, setSearchQuery] = useState('');
  
  // Set initial search query when data changes
  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);
  
  // Load history when in history mode
  useEffect(() => {
    if (mode === 'history') {
      setHistory(getWatchHistory());
      setLoading(false);
    }
  }, [mode]);

  // Handle remove history item
  const handleRemoveItem = (item: WatchHistoryItem) => {
    setItemToRemove(item);
  };

  const confirmRemoveItem = () => {
    if (itemToRemove) {
      removeFromHistory(itemToRemove.bookId);
      setHistory(getWatchHistory());
      setItemToRemove(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      
      try {
        let result: Drama[] = [];
        switch (mode) {
          case 'latest':
            result = await fetchLatestDramas();
            break;
          case 'trending':
            result = await fetchTrendingDramas();
            break;
          case 'foryou':
            result = await fetchForYouDramas();
            break;
          case 'vip':
            result = await fetchVIPDramas();
            break;
          case 'search':
            // For search mode, auto-search if initial query provided
            if (initialSearchQuery) {
              try {
                const searchResult = await searchDramas(initialSearchQuery);
                setDramas(searchResult);
              } catch (searchErr) {
                setError('SEARCH_FAILED');
              }
            }
            setLoading(false);
            return;
          default:
            result = [];
        }
        setDramas(result);
      } catch (err) {
        setError('FAILED_TO_LOAD_DATA');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [mode, data, initialSearchQuery]);

  // Handle search submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const result = await searchDramas(searchQuery);
      setDramas(result);
    } catch (err) {
      setError('SEARCH_FAILED');
    } finally {
      setLoading(false);
    }
  };

  // History View
  if (mode === 'history') {
    return (
      <div className="h-full flex flex-col">
        <div className="p-3 border-b border-green-800">
          <h2 className="text-green-400 font-bold text-sm">WATCH HISTORY</h2>
          <p className="text-green-600 text-xs mt-1">
            {history.length > 0 ? `${history.length} dramas` : 'No watch history'}
          </p>
        </div>
        
        {history.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-green-600 p-8">
            <Clock className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-center">No watch history yet.</p>
            <p className="text-center text-xs mt-2">Start watching dramas to see them here.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-3 pb-24 space-y-3">
            {history.map((item) => (
              <div
                key={item.bookId}
                className="bg-gray-900 border border-green-800 p-3 flex gap-3 active:bg-green-900/30 cursor-pointer"
                onClick={() => {
                  // Create drama object from history item
                  const drama: Drama = {
                    bookId: item.bookId,
                    bookName: item.bookName,
                    coverWap: item.coverWap,
                    chapterCount: item.totalEpisodes,
                    introduction: '',
                    tags: [],
                    tagV3s: [],
                    isEntry: 0,
                    index: 0,
                    protagonist: '',
                    dataFrom: 'history',
                    cardType: 0,
                    rankVo: { rankType: 0, hotCode: '0', sort: 0 },
                    markNamesConnectKey: ', ',
                    bookShelfTime: 0,
                    shelfTime: '',
                    inLibrary: false,
                  };
                  onDramaClick(drama);
                }}
              >
                <img
                  src={item.coverWap}
                  alt={item.bookName}
                  className="w-20 h-28 object-cover border border-green-700 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="text-green-400 font-bold text-sm line-clamp-2">{item.bookName}</h3>
                  <div className="mt-2 space-y-1">
                    <p className="text-green-500 text-xs">
                      Episode {item.episodeNum} / {item.totalEpisodes || '?'}
                    </p>
                    <p className="text-green-700 text-xs">
                      {getTimeAgo(item.watchedAt)}
                    </p>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-1.5 flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        const drama: Drama = {
                          bookId: item.bookId,
                          bookName: item.bookName,
                          coverWap: item.coverWap,
                          chapterCount: item.totalEpisodes,
                          introduction: '',
                          tags: [],
                          tagV3s: [],
                          isEntry: 0,
                          index: 0,
                          protagonist: '',
                          dataFrom: 'history',
                          cardType: 0,
                          rankVo: { rankType: 0, hotCode: '0', sort: 0 },
                          markNamesConnectKey: ', ',
                          bookShelfTime: 0,
                          shelfTime: '',
                          inLibrary: false,
                        };
                        onPlayVideo?.(drama, item.episodeNum);
                      }}
                    >
                      <Play className="w-3 h-3" /> RESUME
                    </button>
                    <button
                      className="text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-1.5 flex items-center gap-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveItem(item);
                      }}
                    >
                      <Trash2 className="w-3 h-3" /> REMOVE
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confirmation Dialog */}
        {itemToRemove && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border-2 border-green-600 p-4 max-w-sm w-full">
              <h3 className="text-green-400 font-bold text-sm mb-2">CONFIRM REMOVAL</h3>
              <p className="text-green-300 text-xs mb-4">
                Are you sure you want to remove <span className="font-bold">{itemToRemove.bookName}</span> from your watch history?
              </p>
              <div className="flex gap-2">
                <button
                  className="flex-1 text-xs bg-red-700 hover:bg-red-600 text-white px-3 py-2"
                  onClick={confirmRemoveItem}
                >
                  YES, REMOVE
                </button>
                <button
                  className="flex-1 text-xs bg-green-700 hover:bg-green-600 text-white px-3 py-2"
                  onClick={() => setItemToRemove(null)}
                >
                  CANCEL
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (mode === 'search') {
    return (
      <div className="p-3">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter drama name..."
              className="flex-1 retro-input"
              autoFocus
            />
            <button type="submit" className="retro-btn-primary">
              SEARCH
            </button>
          </div>
        </form>
        
        {loading ? (
          <div className="flex flex-col items-center justify-center h-32 text-green-400">
            <div className="loading-dots text-2xl mb-2" />
            <p>SEARCHING...</p>
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-8">{error}</div>
        ) : dramas.length > 0 ? (
          <div className="space-y-3">
            <p className="text-green-600 text-sm mb-2">Found {dramas.length} results:</p>
            {dramas.map((drama, index) => (
              <DramaCard 
                key={drama.bookId} 
                drama={drama} 
                index={index}
                onClick={() => onDramaClick(drama)}
                isMobile={true}
                hideHotCode={true}
              />
            ))}
          </div>
        ) : searchQuery ? (
          <div className="text-green-600 text-center py-8">
            <p>No results found for &quot;{searchQuery}&quot;</p>
            <p className="text-sm mt-2">Try a different search term</p>
          </div>
        ) : (
          <div className="text-green-600 text-center py-8">
            <p>Enter a drama name to search</p>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-green-400">
        <div className="loading-dots text-3xl mb-4" />
        <p>LOADING...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-red-500">
        <p className="text-xl mb-4">[ERROR]</p>
        <p>{error}</p>
      </div>
    );
  }

  if (dramas.length === 0) {
    return (
      <div className="text-green-600 text-center py-8">
        <p>No dramas available</p>
        <p className="text-sm mt-2 text-green-700">Mode: {mode}, Count: {dramas.length}</p>
        <p className="text-xs mt-1 text-green-800">Check console for API debug</p>
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      {dramas.map((drama, index) => (
        <DramaCard 
          key={drama.bookId} 
          drama={drama} 
          index={index}
          onClick={() => onDramaClick(drama)}
          isMobile={true}
        />
      ))}
    </div>
  );
}

// Desktop Window Content Component
function WindowContent({ 
  mode, 
  data,
  onDramaClick 
}: { 
  mode: ViewMode; 
  data?: Drama | string | null;
  onDramaClick: (drama: Drama) => void;
}) {
  const [dramas, setDramas] = useState<Drama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // If data is a string, it's the initial search query
  const initialSearchQuery = typeof data === 'string' ? data : '';
  const [searchQuery, setSearchQuery] = useState('');
  
  // Set initial search query when data changes
  useEffect(() => {
    if (initialSearchQuery) {
      setSearchQuery(initialSearchQuery);
    }
  }, [initialSearchQuery]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError('');
      
      try {
        let result: Drama[] = [];
        switch (mode) {
          case 'latest':
            result = await fetchLatestDramas();
            break;
          case 'trending':
            result = await fetchTrendingDramas();
            break;
          case 'foryou':
            result = await fetchForYouDramas();
            break;
          case 'vip':
            result = await fetchVIPDramas();
            break;
          case 'search':
            // For search mode, auto-search if initial query provided
            if (initialSearchQuery) {
              try {
                const searchResult = await searchDramas(initialSearchQuery);
                setDramas(searchResult);
              } catch (searchErr) {
                setError('SEARCH_FAILED');
              }
            }
            setLoading(false);
            return;
          default:
            result = [];
        }
        setDramas(result);
      } catch (err) {
        setError('FAILED_TO_LOAD_DATA');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [mode, data, initialSearchQuery]);

  // Handle search submission
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const result = await searchDramas(searchQuery);
      setDramas(result);
    } catch (err) {
      setError('SEARCH_FAILED');
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'search') {
    return (
      <div className="h-full flex flex-col">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter drama name..."
              className="flex-1 retro-input"
              autoFocus
            />
            <button type="submit" className="retro-btn-primary">
              SEARCH
            </button>
          </div>
        </form>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-32 text-green-400">
              <div className="loading-dots text-2xl mb-2" />
              <p>SEARCHING...</p>
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-8">{error}</div>
          ) : dramas.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <p className="text-green-600 text-sm col-span-full mb-2">Found {dramas.length} results:</p>
              {dramas.map((drama, index) => (
                <DramaCard 
                  key={drama.bookId} 
                  drama={drama} 
                  index={index}
                  onClick={() => onDramaClick(drama)}
                  isMobile={false}
                  hideHotCode={true}
                />
              ))}
            </div>
          ) : searchQuery ? (
            <div className="text-green-600 text-center py-8">
              <p>No results found for &quot;{searchQuery}&quot;</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          ) : (
            <div className="text-green-600 text-center py-8">
              <p>Enter a drama name to search</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-green-400">
        <div className="loading-dots text-4xl mb-4" />
        <p>LOADING_DATA...</p>
        <div className="w-64 h-4 border-2 border-green-600 mt-4 p-1">
          <div className="h-full bg-green-500 animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-500">
        <p className="text-2xl mb-4">[ERROR]</p>
        <p>{error}</p>
        <p className="text-sm mt-4 text-green-600">Press F5 to retry...</p>
      </div>
    );
  }

  if (dramas.length === 0) {
    return (
      <div className="text-green-600 text-center py-8">
        <p>No dramas available</p>
        <p className="text-sm mt-2 text-green-700">Mode: {mode}, Count: {dramas.length}</p>
        <p className="text-xs mt-1 text-green-800">Check console for API debug</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {dramas.map((drama, index) => (
        <DramaCard 
          key={drama.bookId} 
          drama={drama} 
          index={index}
          onClick={() => onDramaClick(drama)}
          isMobile={false}
        />
      ))}
    </div>
  );
}

export default App;
