import { NextResponse } from 'next/server'

// Define environment variable types
type Env = {
  X_API_KEY: string;
  X_API_SECRET: string;
  X_ACCESS_TOKEN: string;
  X_ACCESS_TOKEN_SECRET: string;
}

// Type assertion for process.env with proper type casting
const env = process.env as unknown as Env;

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author: {
    username: string;
  };
  entities?: {
    media?: Array<{
      media_url_https?: string;
      variants?: Array<{
        content_type: string;
        url: string;
      }>;
    }>;
  };
}

interface TwitterResponse {
  data?: Tweet[];
  errors?: Array<{
    message: string;
    code: number;
  }>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || 'custom trucks'

  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN

    if (!bearerToken) {
      console.error('Missing Twitter Bearer Token')
      throw new Error('Missing Twitter API credentials')
    }

    // Make the API request with Bearer Token
    const encodedQuery = encodeURIComponent(query)
    const url = `https://api.twitter.com/2/tweets/search/recent?query=${encodedQuery}&tweet.fields=created_at,entities&expansions=author_id&user.fields=username&media.fields=media_url_https,variants&max_results=10`
    
    console.log('Making search request with query:', query)
    console.log('Request URL:', url)
    console.log('Bearer Token length:', bearerToken.length)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${bearerToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twitter API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        requestUrl: response.url,
        headers: Object.fromEntries(response.headers.entries())
      })
      throw new Error(`Twitter API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as TwitterResponse
    console.log('Twitter API response:', JSON.stringify(data, null, 2))

    if (data.errors) {
      console.error('Twitter API returned errors:', data.errors)
      throw new Error(`Twitter API errors: ${data.errors.map(e => e.message).join(', ')}`)
    }

    const videos = data.data?.map((tweet: Tweet) => ({
      id: tweet.id,
      title: tweet.text,
      description: tweet.text,
      thumbnail: tweet.entities?.media?.[0]?.media_url_https || 'https://picsum.photos/400/300',
      thumbnailUrl: tweet.entities?.media?.[0]?.media_url_https || 'https://picsum.photos/400/300',
      publishedAt: tweet.created_at,
      views: '0', // Twitter API v2 doesn't provide view counts
      viewCount: '0',
      duration: '0:00', // Twitter API v2 doesn't provide video duration
      creator: `@${tweet.author.username}`,
      channelTitle: `@${tweet.author.username}`,
      videoUrl: `https://twitter.com/i/status/${tweet.id}`,
      platform: 'twitter' as const
    })) || []

    return NextResponse.json(videos)
  } catch (error) {
    console.error('Error fetching Twitter videos:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch Twitter videos',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function formatViews(viewCount: number): string {
  if (viewCount >= 1000000) {
    return `${(viewCount / 1000000).toFixed(1)}M`
  }
  if (viewCount >= 1000) {
    return `${(viewCount / 1000).toFixed(1)}K`
  }
  return viewCount.toString()
}

function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
} 