export interface Drama {
  bookId: string;
  bookName: string;
  coverWap: string;
  chapterCount: number;
  introduction: string;
  tags: string[];
  tagV3s: TagV3[];
  isEntry: number;
  index: number;
  protagonist: string;
  dataFrom: string;
  cardType: number;
  rankVo: RankVo;
  markNamesConnectKey: string;
  bookShelfTime: number;
  shelfTime: string;
  inLibrary: boolean;
}

export interface TagV3 {
  tagId: number;
  tagName: string;
  tagEnName: string;
}

export interface RankVo {
  rankType: number;
  hotCode: string;
  sort: number;
}

export interface DramaDetail {
  bookId: string;
  bookName: string;
  coverWap: string;
  chapterCount: number;
  introduction: string;
  tags: string[];
  tagV3s: TagV3[];
  protagonist: string;
  episodes?: Episode[];
  rankVo?: RankVo;
  shelfTime?: string;
  dataFrom?: string;
  cardType?: number;
}

export interface Episode {
  episodeId: string;
  episodeName: string;
  episodeOrder: number;
  videoUrl?: string;
}

export interface VideoQuality {
  quality: string;
  url: string;
}

export interface EpisodeVideo {
  episodeId: string;
  episodeName: string;
  episodeOrder: number;
  videoUrl?: string;
  qualities?: VideoQuality[];
}

// Alias for EpisodeVideo for backward compatibility
export type EpisodeData = EpisodeVideo;

// API Response types for /allepisode endpoint
export interface VideoPathItem {
  quality: number;
  videoPath: string;
  isDefault: number;
  isEntry: number;
  isVipEquity: number;
}

export interface CdnItem {
  cdnDomain: string;
  isDefault: number;
  videoPathList: VideoPathItem[];
}

export interface EpisodeDataFromApi {
  chapterId: string;
  chapterIndex: number;
  isCharge: number;
  chapterName: string;
  cdnList: CdnItem[];
}

export interface SearchResult {
  bookId: string;
  bookName: string;
  coverWap: string;
  chapterCount: number;
  introduction: string;
  tags: string[];
}

export type ViewMode = 'latest' | 'trending' | 'search' | 'detail' | 'foryou' | 'vip' | 'player' | 'loading' | 'history';

export interface WindowState {
  id: string;
  title: string;
  mode: ViewMode;
  isActive: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  zIndex: number;
  position: { x: number; y: number };
  size: { width: number; height: number };
  previousState?: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  };
  data?: Drama | string | null;  // Drama for detail/player, string for search query
  videoData?: {
    src: string;
    poster?: string;
    title?: string;
  };
  defaultTab?: 'info' | 'episodes';  // For detail view to show episodes tab by default
}

export interface VideoData {
  src: string;
  poster?: string;
  title?: string;
}
