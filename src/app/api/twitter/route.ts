import { NextResponse } from 'next/server'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      TWITTER_BEARER_TOKEN: string
    }
  }
}

interface TwitterTweet {
  id: string
  text: string
  created_at: string
  author_id: string
  public_metrics?: {
    view_count?: number
  }
  attachments?: {
    media?: Array<{
      preview_image_url?: string
      duration_ms?: number
    }>
  }
}

interface TwitterResponse {
  data: TwitterTweet[]
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || 'custom trucks'

  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN

    if (!bearerToken) {
      console.error('Missing Twitter Bearer Token')
      throw new Error('Missing Twitter Bearer Token')
    }

    const baseUrl = 'https://api.twitter.com/2/tweets/search/recent'
    const encodedQuery = encodeURIComponent(`${query} has:videos`)
    
    console.log('Making request to Twitter API with query:', query)
    
    const response = await fetch(
      `${baseUrl}?query=${encodedQuery}&tweet.fields=public_metrics,created_at&expansions=author_id,attachments.media_keys&media.fields=preview_image_url,url,duration_ms`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Twitter API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        headers: Array.from(response.headers).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      })
      throw new Error(`Twitter API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as TwitterResponse
    console.log('Twitter API response:', JSON.stringify(data, null, 2))

    if (!data.data || !Array.isArray(data.data)) {
      console.warn('Unexpected Twitter API response format:', data)
      return NextResponse.json([])
    }

    const videos = data.data.map(tweet => ({
      id: tweet.id,
      title: tweet.text,
      description: tweet.text,
      thumbnail: tweet.attachments?.media?.[0]?.preview_image_url || 'https://picsum.photos/400/300',
      thumbnailUrl: tweet.attachments?.media?.[0]?.preview_image_url || 'https://picsum.photos/400/300',
      publishedAt: tweet.created_at,
      views: tweet.public_metrics?.view_count ? formatViews(tweet.public_metrics.view_count) : '0',
      viewCount: tweet.public_metrics?.view_count?.toString() || '0',
      duration: tweet.attachments?.media?.[0]?.duration_ms ? formatDuration(tweet.attachments.media[0].duration_ms) : '0:00',
      creator: `@${tweet.author_id}`,
      channelTitle: `@${tweet.author_id}`,
      videoUrl: `https://twitter.com/i/status/${tweet.id}`,
      platform: 'twitter' as const
    }))

    return NextResponse.json(videos)
  } catch (error) {
    console.error('Error in Twitter API route:', error)
    return NextResponse.json({ error: 'Failed to fetch Twitter videos' }, { status: 500 })
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