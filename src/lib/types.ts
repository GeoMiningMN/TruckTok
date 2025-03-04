export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  thumbnailUrl: string;  // alias for thumbnail to maintain compatibility
  publishedAt: string;
  channelTitle: string;
  creator: string;      // alias for channelTitle to maintain compatibility
  views: string;
  viewCount: string;    // alias for views to maintain compatibility
  duration: string;
  likeCount?: string;
  videoUrl: string;
  platform: 'youtube' | 'tiktok' | 'twitter';
}

// Type guard to check if a video is from YouTube
export function isYouTubeVideo(video: Video): boolean {
  return video.platform === 'youtube';
} 