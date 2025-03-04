export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  channelTitle: string;
  viewCount?: string;
  likeCount?: string;
}

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
  }[];
}

export function mapYouTubeApiResponse(response: YouTubeApiResponse): YouTubeVideo[] {
  return response.items.map((item) => ({
    id: item.id.videoId,
    title: item.snippet.title,
    description: item.snippet.description,
    thumbnailUrl: item.snippet.thumbnails.high.url,
    publishedAt: item.snippet.publishedAt,
    channelTitle: item.snippet.channelTitle,
    viewCount: item.statistics?.viewCount,
    likeCount: item.statistics?.likeCount,
  }));
} 