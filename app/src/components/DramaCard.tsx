import { useState } from 'react';
import { Play, Flame, User } from 'lucide-react';
import type { Drama } from '@/types/drama';

interface DramaCardProps {
  drama: Drama;
  index: number;
  onClick: () => void;
  isMobile?: boolean;
  hideHotCode?: boolean;  // Hide hotCode for search results
}

export function DramaCard({ drama, index, onClick, isMobile = false, hideHotCode = false }: DramaCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  if (isMobile) {
    // Mobile-optimized horizontal card
    return (
      <div 
        className="bg-gray-900 border border-green-700 cursor-pointer active:bg-green-900/30 transition-colors"
        onClick={onClick}
        onTouchStart={() => setIsPressed(true)}
        onTouchEnd={() => setIsPressed(false)}
        style={{ 
          transform: isPressed ? 'scale(0.98)' : 'scale(1)',
          transition: 'transform 0.1s'
        }}
      >
        <div className="flex gap-3 p-3">
          {/* Cover Image - 16:9 for mobile */}
          <div className="relative w-28 flex-shrink-0 aspect-[3/4] bg-gray-800 overflow-hidden">
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="loading-dots text-xl" />
              </div>
            )}
            <img
              src={drama.coverWap}
              alt={drama.bookName}
              className={`w-full h-full object-cover ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImageLoaded(true)}
              loading="lazy"
            />
            {drama.chapterCount > 0 && (
              <div className="absolute top-1 right-1 bg-black/80 border border-green-600 px-1 text-[10px] text-green-400">
                EP.{drama.chapterCount}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col">
            <h3 className="text-green-400 font-bold text-sm mb-1 line-clamp-2">
              {drama.bookName}
            </h3>
            
            {drama.protagonist && (
              <div className="flex items-center gap-1 text-green-600 text-xs mb-2">
                <User className="w-3 h-3" />
                <span className="truncate">{drama.protagonist}</span>
              </div>
            )}

            <p className="text-green-700 text-xs line-clamp-2 leading-relaxed flex-1">
              {drama.introduction}
            </p>

            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1 flex-wrap">
                {drama.tags.slice(0, 2).map((tag, i) => (
                  <span 
                    key={i}
                    className="text-[10px] bg-green-900/30 border border-green-700 text-green-500 px-1"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              {!hideHotCode && (
                <div className="flex items-center gap-1 text-yellow-400 text-xs">
                  <Flame className="w-3 h-3" />
                  <span>{drama.rankVo?.hotCode || '0'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop card (original)
  return (
    <div 
      className="retro-card cursor-pointer glitch group relative"
      onClick={onClick}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Card Header with Index */}
      <div className="flex items-center justify-between mb-2 border-b border-green-800 pb-2">
        <span className="text-green-600 text-sm">[{String(index + 1).padStart(3, '0')}]</span>
        {!hideHotCode && (
          <div className="flex items-center gap-1 text-yellow-400 text-sm">
            <Flame className="w-3 h-3" />
            <span>{drama.rankVo?.hotCode || '0'}</span>
          </div>
        )}
      </div>

      {/* Cover Image */}
      <div className="relative aspect-[3/4] mb-3 bg-gray-900 border border-green-700 overflow-hidden">
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="loading-dots text-2xl" />
          </div>
        )}
        <img
          src={drama.coverWap}
          alt={drama.bookName}
          className={`w-full h-full object-cover transition-transform duration-300 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          } group-hover:scale-110`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
        />
        
        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Play className="w-12 h-12 text-green-400" />
        </div>

        {/* Episode Count Badge */}
        {drama.chapterCount > 0 && (
          <div className="absolute top-2 right-2 bg-black/80 border border-green-600 px-2 py-1 text-xs text-green-400">
            EP.{drama.chapterCount}
          </div>
        )}
      </div>

      {/* Title */}
      <h3 className="text-green-400 font-bold text-lg mb-2 line-clamp-2 group-hover:text-green-300 transition-colors">
        {drama.bookName}
      </h3>

      {/* Protagonist */}
      {drama.protagonist && (
        <div className="flex items-center gap-1 text-green-600 text-sm mb-2">
          <User className="w-3 h-3" />
          <span className="truncate">{drama.protagonist}</span>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        {drama.tags.slice(0, 3).map((tag, i) => (
          <span 
            key={i}
            className="text-xs bg-green-900/30 border border-green-700 text-green-500 px-1 py-0.5"
          >
            {tag}
          </span>
        ))}
        {drama.tags.length > 3 && (
          <span className="text-xs text-green-600">+{drama.tags.length - 3}</span>
        )}
      </div>

      {/* Introduction */}
      <p className="text-green-600 text-sm line-clamp-3 leading-relaxed">
        {drama.introduction}
      </p>

      {/* Footer Info */}
      <div className="mt-3 pt-2 border-t border-green-800 flex items-center justify-between text-xs text-green-700">
        <span>ID: {drama.bookId.slice(-8)}</span>
        <span>{drama.shelfTime?.split(' ')[0] || 'N/A'}</span>
      </div>

      {/* Scan Line Effect */}
      <div className="absolute inset-0 pointer-events-none scanline opacity-0 group-hover:opacity-20" />
    </div>
  );
}
