import { Clock, TrendingUp, Star, Monitor, Search, X } from 'lucide-react';
import { useState } from 'react';

interface MobileNavProps {
  onOpenLatest: () => void;
  onOpenTrending: () => void;
  onOpenForYou: () => void;
  onOpenVIP: () => void;
  onSearch: (query: string) => void;
  // Window count and close all hidden on mobile since only 1 window possible
  activeWindowCount?: number;
  onCloseAll?: () => void;
}

export function MobileNav({ 
  onOpenLatest, 
  onOpenTrending, 
  onOpenForYou, 
  onOpenVIP,
  onSearch,
}: MobileNavProps) {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery);
      setSearchQuery('');
      setShowSearch(false);
    }
  };

  return (
    <>
      {/* Search Modal */}
      {showSearch && (
        <div className="mobile-overlay flex items-start justify-center pt-20" onClick={() => setShowSearch(false)}>
          <div className="bg-gray-900 border-2 border-green-600 p-4 w-[90vw] max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-green-400 font-bold">SEARCH_DRAMA</span>
              <button onClick={() => setShowSearch(false)} className="text-green-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSearch}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter drama name..."
                className="retro-input w-full mb-4"
                autoFocus
              />
              <button type="submit" className="retro-btn-primary w-full">
                SEARCH
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="mobile-nav flex items-center justify-around py-2 px-1">
        <NavButton 
          icon={<Clock className="w-5 h-5" />} 
          label="LATEST" 
          onClick={onOpenLatest}
        />
        <NavButton 
          icon={<TrendingUp className="w-5 h-5" />} 
          label="TREND" 
          onClick={onOpenTrending}
        />
        
        {/* Search Button - Center */}
        <button 
          className="flex flex-col items-center gap-1 p-2 -mt-4"
          onClick={() => setShowSearch(true)}
        >
          <div className="w-14 h-14 bg-green-600 border-2 border-green-400 rounded-full flex items-center justify-center shadow-lg shadow-green-900/50">
            <Search className="w-6 h-6 text-black" />
          </div>
        </button>
        
        <NavButton 
          icon={<Star className="w-5 h-5" />} 
          label="FORYOU" 
          onClick={onOpenForYou}
        />
        <NavButton 
          icon={<Monitor className="w-5 h-5" />} 
          label="VIP" 
          onClick={onOpenVIP}
        />
      </div>

      {/* Window Counter Badge - Hidden on mobile since only 1 window possible */}
      {/* {activeWindowCount > 0 && (
        <button 
          className="fixed top-4 right-4 bg-green-600 text-black px-3 py-1 text-sm font-bold border-2 border-green-400 z-50"
          onClick={onCloseAll}
        >
          {activeWindowCount} WIN
        </button>
      )} */}
    </>
  );
}

function NavButton({ 
  icon, 
  label, 
  onClick 
}: { 
  icon: React.ReactNode; 
  label: string; 
  onClick: () => void;
}) {
  return (
    <button 
      className="flex flex-col items-center gap-1 p-2 min-w-[60px] touch-target"
      onClick={onClick}
    >
      <span className="text-green-400">{icon}</span>
      <span className="text-[10px] text-green-500 font-mono">{label}</span>
    </button>
  );
}
