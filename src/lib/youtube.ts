import { Video } from './types';

export interface YouTubeApiResponse {
  items: {
    id: {
      videoId: string;
    };
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        high: {
          url: string;
        };
      };
      publishedAt: string;
      channelTitle: string;
    };
    statistics?: {
      viewCount: string;
      likeCount: string;
    };
    contentDetails?: {
      duration: string;
    };
  }[];
}

export function mapYouTubeApiResponse(response: YouTubeApiResponse): Video[] {
  return response.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnail: item.snippet.thumbnails.high.url,
    thumbnailUrl: item.snippet.thumbnails.high.url,
    publishedAt: item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle,
    creator: item.snippet.channelTitle,
    views: item.statistics?.viewCount || '0',
    viewCount: item.statistics?.viewCount || '0',
    duration: item.contentDetails?.duration || '',
    likeCount: item.statistics?.likeCount,
    videoUrl: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    platform: 'youtube' as const,
  }));
} 