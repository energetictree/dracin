import { useState, useEffect } from 'react';
import { Play, Clock, User, Tag, Flame, Calendar, Film, ArrowLeft, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { fetchDramaDetail } from '@/services/dramaApiCached';
import type { Drama, DramaDetail as DramaDetailType } from '@/types/drama';
import { getLatestWatchedEpisode, isEpisodeWatched } from '@/lib/history';

interface DramaDetailProps {
  drama: Drama;
  isMobile?: boolean;
  onBack?: () => void;
  onPlayVideo?: (drama: Drama, episodeNum?: number) => void;
  defaultTab?: 'info' | 'episodes';
}

export function DramaDetail({ drama, isMobile = false, onBack, onPlayVideo, defaultTab = 'info' }: DramaDetailProps) {
  const [detail, setDetail] = useState<DramaDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'info' | 'episodes'>(defaultTab);
  const [showFullSynopsis, setShowFullSynopsis] = useState(false);
  const [episodePage, setEpisodePage] = useState(1);
  const [, setLatestWatchedEpisode] = useState<number>(0);
  
  // Use detail data if available, otherwise fall back to drama prop
  const displayData = detail || drama;
  
  // Check if we should show hotCode (hide for search results that don't have it)
  const showHotCode = displayData.rankVo?.hotCode && displayData.rankVo.hotCode !== '0';
  
  const EPISODES_PER_PAGE = isMobile ? 50 : 30;
  const totalEpisodePages = Math.ceil((displayData.chapterCount || 0) / EPISODES_PER_PAGE);
  
  const getEpisodesForPage = (page: number) => {
    const start = (page - 1) * EPISODES_PER_PAGE;
    const end = Math.min(start + EPISODES_PER_PAGE, displayData.chapterCount || 0);
    return Array.from({ length: end - start }, (_, i) => start + i + 1);
  };

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      setEpisodePage(1);
      const result = await fetchDramaDetail(drama.bookId);
      setDetail(result);
      
      // Load watched episode info
      const latestWatched = getLatestWatchedEpisode(drama.bookId);
      setLatestWatchedEpisode(latestWatched || 0);
      
      setLoading(false);
    };
    loadDetail();
  }, [drama.bookId]);

  const handlePlay = (episodeNum?: number) => {
    if (onPlayVideo) {
      // Use displayData which has full detail (including chapterCount from API)
      // Merge the original drama with displayData to ensure chapterCount is included
      const dramaToPlay: Drama = {
        ...drama,
        bookId: displayData.bookId,
        bookName: displayData.bookName,
        coverWap: displayData.coverWap,
        // Prioritize chapterCount from detail API (displayData)
        chapterCount: displayData.chapterCount || drama.chapterCount || 0,
        introduction: displayData.introduction || drama.introduction,
        tags: displayData.tags || drama.tags,
        tagV3s: displayData.tagV3s || drama.tagV3s,
        protagonist: displayData.protagonist || drama.protagonist,
        rankVo: displayData.rankVo || drama.rankVo,
        shelfTime: displayData.shelfTime || drama.shelfTime,
      };
      onPlayVideo(dramaToPlay, episodeNum);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-green-400 p-8">
        <div className="loading-dots text-4xl mb-4" />
        <p>LOADING_DETAIL_DATA...</p>
      </div>
    );
  }

  // Mobile-optimized layout
  if (isMobile) {
    return (
      <div className="h-full flex flex-col bg-black">
        {/* Header */}
        <div className="flex items-center gap-3 p-3 border-b border-green-700 bg-gray-900">
          {onBack && (
            <button 
              className="p-2 touch-target text-green-400"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-green-400 font-bold text-sm flex-1 line-clamp-1">{displayData.bookName}</h2>
        </div>

        <div className="flex-1 overflow-auto retro-scroll">
          {/* Cover Image - Full Width */}
          <div className="relative aspect-video w-full">
            <img
              src={displayData.coverWap}
              alt={displayData.bookName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
            <button 
              className="absolute bottom-4 left-4 right-4 retro-btn-primary flex items-center justify-center gap-2 py-3"
              onClick={() => handlePlay()}
            >
              <Play className="w-5 h-5" />
              WATCH NOW
            </button>
          </div>

          {/* Quick Stats */}
          <div className={`grid gap-2 p-3 ${showHotCode ? 'grid-cols-3' : 'grid-cols-2'}`}>
            <StatBox icon={<Film className="w-4 h-4" />} label="EPISODES" value={displayData.chapterCount} />
            {showHotCode && (
              <StatBox icon={<Flame className="w-4 h-4" />} label="HOT" value={displayData.rankVo?.hotCode || '0'} isYellow />
            )}
            <StatBox icon={<Calendar className="w-4 h-4" />} label="RELEASED" value={displayData.shelfTime?.split(' ')[0] || 'N/A'} />
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-3 mb-3">
            <TabButton 
              active={selectedTab === 'info'} 
              onClick={() => setSelectedTab('info')}
              label="INFO"
            />
            <TabButton 
              active={selectedTab === 'episodes'} 
              onClick={() => setSelectedTab('episodes')}
              label={`EPISODES (${displayData.chapterCount})`}
            />
          </div>

          {/* Tab Content */}
          <div className="px-3 pb-20">
            {selectedTab === 'info' ? (
              <div className="space-y-3">
                {/* Synopsis */}
                <div className="bg-gray-900 border border-green-700 p-3">
                  <h3 className="text-green-400 font-bold mb-2 text-sm">SYNOPSIS</h3>
                  <p className={`text-green-300 text-sm leading-relaxed ${!showFullSynopsis && 'line-clamp-4'}`}>
                    {displayData.introduction}
                  </p>
                  {displayData.introduction?.length > 150 && (
                    <button 
                      className="text-green-500 text-xs mt-2 flex items-center gap-1"
                      onClick={() => setShowFullSynopsis(!showFullSynopsis)}
                    >
                      {showFullSynopsis ? (
                        <><ChevronUp className="w-3 h-3" /> SHOW LESS</>
                      ) : (
                        <><ChevronDown className="w-3 h-3" /> READ MORE</>
                      )}
                    </button>
                  )}
                </div>

                {/* Cast */}
                {displayData.protagonist && (
                  <div className="bg-gray-900 border border-green-700 p-3">
                    <h3 className="text-green-400 font-bold mb-2 text-sm flex items-center gap-2">
                      <User className="w-4 h-4" />
                      CAST
                    </h3>
                    <p className="text-green-300 text-sm">{displayData.protagonist}</p>
                  </div>
                )}

                {/* Tags */}
                <div className="bg-gray-900 border border-green-700 p-3">
                  <h3 className="text-green-400 font-bold mb-2 text-sm flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    TAGS
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(displayData.tags || []).map((tag, i) => (
                      <span
                        key={i}
                        className="bg-green-900/40 border border-green-600 text-green-400 px-2 py-1 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Technical Info */}
                <div className="bg-gray-900 border border-green-700 p-3">
                  <h3 className="text-green-400 font-bold mb-2 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    TECHNICAL DATA
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-green-600">Book ID:</div>
                    <div className="text-green-400 font-mono">{displayData.bookId}</div>
                    <div className="text-green-600">Data Source:</div>
                    <div className="text-green-400">{drama.dataFrom}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {getEpisodesForPage(episodePage).map((epNum) => {
                  const isWatched = isEpisodeWatched(drama.bookId, epNum);
                  return (
                    <button
                      key={epNum}
                      className={`w-full border flex items-center justify-between p-3 active:bg-green-900/30 ${
                        isWatched 
                          ? 'bg-green-950/30 border-green-900/50' 
                          : 'bg-gray-900 border-green-800'
                      }`}
                      onClick={() => handlePlay(epNum)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-mono text-xs w-10 ${isWatched ? 'text-green-800' : 'text-green-600'}`}>
                          EP.{String(epNum).padStart(2, '0')}
                        </span>
                        <span className={`text-sm ${isWatched ? 'text-green-700' : 'text-green-400'}`}>
                          Episode {epNum}
                        </span>
                      </div>
                      {isWatched ? (
                        <Check className="w-4 h-4 text-green-700" />
                      ) : (
                        <Play className="w-4 h-4 text-green-600" />
                      )}
                    </button>
                  );
                })}
                {totalEpisodePages > 1 && (
                  <div className="flex items-center justify-between pt-4 pb-2">
                    <button
                      className="retro-btn py-2 px-3 flex items-center gap-1 disabled:opacity-50"
                      onClick={() => setEpisodePage(p => Math.max(1, p - 1))}
                      disabled={episodePage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      PREV
                    </button>
                    <span className="text-green-400 text-sm">
                      PAGE {episodePage} / {totalEpisodePages}
                    </span>
                    <button
                      className="retro-btn py-2 px-3 flex items-center gap-1 disabled:opacity-50"
                      onClick={() => setEpisodePage(p => Math.min(totalEpisodePages, p + 1))}
                      disabled={episodePage === totalEpisodePages}
                    >
                      NEXT
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop layout (original)
  return (
    <div className="h-full flex flex-col">
      {/* Header with Back Button */}
      <div className="flex items-center gap-4 mb-4 border-b border-green-700 pb-3">
        {onBack && (
          <button 
            className="retro-btn py-1 px-3 flex items-center gap-2"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4" />
            BACK
          </button>
        )}
        <h2 className="text-xl text-green-400 font-bold truncate">{displayData.bookName}</h2>
      </div>

      <div className="flex-1 flex gap-6 overflow-auto">
        {/* Left Column - Cover */}
        <div className="w-1/3 flex-shrink-0">
          <div className="aspect-[3/4] border-2 border-green-600 bg-gray-900 relative">
            <img
              src={displayData.coverWap}
              alt={displayData.bookName}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <button 
                className="retro-btn-primary w-full flex items-center justify-center gap-2 py-3"
                onClick={() => handlePlay()}
              >
                <Play className="w-5 h-5" />
                WATCH NOW
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between bg-green-900/20 border border-green-700 px-3 py-2">
              <span className="text-green-600 flex items-center gap-2">
                <Film className="w-4 h-4" />
                Episodes
              </span>
              <span className="text-green-400 font-bold">{displayData.chapterCount}</span>
            </div>
            {showHotCode && (
              <div className="flex items-center justify-between bg-green-900/20 border border-green-700 px-3 py-2">
                <span className="text-green-600 flex items-center gap-2">
                  <Flame className="w-4 h-4" />
                  Popularity
                </span>
                <span className="text-yellow-400 font-bold">{displayData.rankVo?.hotCode}</span>
              </div>
            )}
            <div className="flex items-center justify-between bg-green-900/20 border border-green-700 px-3 py-2">
              <span className="text-green-600 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Released
              </span>
              <span className="text-green-400">{displayData.shelfTime?.split(' ')[0] || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Right Column - Info */}
        <div className="flex-1 flex flex-col">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              className={`retro-btn ${selectedTab === 'info' ? 'bg-green-600 text-white' : ''}`}
              onClick={() => setSelectedTab('info')}
            >
              INFORMATION
            </button>
            <button
              className={`retro-btn ${selectedTab === 'episodes' ? 'bg-green-600 text-white' : ''}`}
              onClick={() => setSelectedTab('episodes')}
            >
              EPISODES ({displayData.chapterCount})
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto retro-scroll">
            {selectedTab === 'info' ? (
              <div className="space-y-4">
                {/* Synopsis */}
                <div className="retro-card">
                  <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                    <span className="text-green-600">[</span>
                    SYNOPSIS
                    <span className="text-green-600">]</span>
                  </h3>
                  <p className="text-green-300 leading-relaxed">
                    {displayData.introduction}
                  </p>
                </div>

                {/* Cast */}
                {displayData.protagonist && (
                  <div className="retro-card">
                    <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" />
                      CAST
                    </h3>
                    <p className="text-green-300">{displayData.protagonist}</p>
                  </div>
                )}

                {/* Tags */}
                <div className="retro-card">
                  <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    TAGS
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(displayData.tags || []).map((tag, i) => (
                      <span
                        key={i}
                        className="bg-green-900/40 border border-green-600 text-green-400 px-3 py-1 text-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Technical Info */}
                <div className="retro-card">
                  <h3 className="text-green-400 font-bold mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    TECHNICAL DATA
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-green-600">Book ID:</div>
                    <div className="text-green-400 font-mono">{displayData.bookId}</div>
                    <div className="text-green-600">Data Source:</div>
                    <div className="text-green-400">{drama.dataFrom}</div>
                    <div className="text-green-600">Card Type:</div>
                    <div className="text-green-400">{drama.cardType}</div>
                    <div className="text-green-600">Rank Type:</div>
                    <div className="text-green-400">{displayData.rankVo?.rankType || 'N/A'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {getEpisodesForPage(episodePage).map((epNum) => {
                  const isWatched = isEpisodeWatched(drama.bookId, epNum);
                  return (
                    <button
                      key={epNum}
                      className={`w-full flex items-center justify-between group py-2 px-3 border ${
                        isWatched 
                          ? 'bg-green-950/20 border-green-800/50 opacity-70' 
                          : 'retro-btn hover:bg-green-900/30'
                      }`}
                      onClick={() => handlePlay(epNum)}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`font-mono w-12 ${isWatched ? 'text-green-800' : 'text-green-600'}`}>
                          EP.{String(epNum).padStart(2, '0')}
                        </span>
                        <span className={`group-hover:text-green-300 ${isWatched ? 'text-green-700' : 'text-green-400'}`}>
                          Episode {epNum}
                        </span>
                      </div>
                      {isWatched ? (
                        <Check className="w-4 h-4 text-green-700" />
                      ) : (
                        <Play className="w-4 h-4 text-green-600 group-hover:text-green-400" />
                      )}
                    </button>
                  );
                })}
                {totalEpisodePages > 1 && (
                  <div className="flex items-center justify-between pt-4 pb-2 border-t border-green-800 mt-4">
                    <button
                      className="retro-btn py-2 px-4 flex items-center gap-2 disabled:opacity-50"
                      onClick={() => setEpisodePage(p => Math.max(1, p - 1))}
                      disabled={episodePage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      PREVIOUS
                    </button>
                    <span className="text-green-400 font-mono">
                      PAGE {episodePage} / {totalEpisodePages}
                    </span>
                    <button
                      className="retro-btn py-2 px-4 flex items-center gap-2 disabled:opacity-50"
                      onClick={() => setEpisodePage(p => Math.min(totalEpisodePages, p + 1))}
                      disabled={episodePage === totalEpisodePages}
                    >
                      NEXT
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile stat box component
function StatBox({ 
  icon, 
  label, 
  value, 
  isYellow = false 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
  isYellow?: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-green-700 p-2 text-center">
      <div className="text-green-600 flex justify-center mb-1">{icon}</div>
      <div className={`text-lg font-bold ${isYellow ? 'text-yellow-400' : 'text-green-400'}`}>{value}</div>
      <div className="text-[10px] text-green-600">{label}</div>
    </div>
  );
}

// Mobile tab button
function TabButton({ 
  active, 
  onClick, 
  label 
}: { 
  active: boolean; 
  onClick: () => void; 
  label: string;
}) {
  return (
    <button
      className={`flex-1 py-2 text-xs font-bold border ${
        active 
          ? 'bg-green-600 text-white border-green-400' 
          : 'bg-gray-900 text-green-600 border-green-800'
      }`}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
