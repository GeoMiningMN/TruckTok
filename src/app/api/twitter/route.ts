import { NextResponse } from 'next/server'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      X_API_KEY: string
      X_API_SECRET: string
    }
  }
}

interface Tweet {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics?: {
    view_count?: number;
  };
  attachments?: {
    media?: Array<{
      preview_image_url?: string;
      duration_ms?: number;
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
    const apiKey = process.env.X_API_KEY
    const apiSecret = process.env.X_API_SECRET

    if (!apiKey || !apiSecret) {
      console.error('Missing credentials:', { hasApiKey: !!apiKey, hasApiSecret: !!apiSecret })
      throw new Error('Missing X API credentials')
    }

    // Get Bearer Token
    const basicAuth = Buffer.from(`${apiKey}:${apiSecret}`).toString('base64')
    console.log('Attempting to get bearer token...')
    
    const tokenResponse = await fetch('https://api.twitter.com/oauth2/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('X API token error:', {
        status: tokenResponse.status,
        statusText: tokenResponse.statusText,
        error: errorText
      })
      throw new Error(`Failed to get access token: ${tokenResponse.status} ${tokenResponse.statusText}`)
    }

    const tokenData = await tokenResponse.json() as { access_token: string }
    const bearerToken = tokenData.access_token
    console.log('Successfully obtained bearer token')

    // Make the API request
    const encodedQuery = encodeURIComponent(`${query} filter:videos`)
    console.log('Making search request with query:', query)
    
    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodedQuery}&tweet.fields=public_metrics,created_at&expansions=author_id,attachments.media_keys&media.fields=preview_image_url,url,duration_ms`,
      {
        headers: {
          'Authorization': `Bearer ${bearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('X API error response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText
      })
      throw new Error(`X API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json() as TwitterResponse
    console.log('X API response:', JSON.stringify(data, null, 2))

    if (data.errors) {
      console.error('X API returned errors:', data.errors)
      throw new Error(`X API errors: ${data.errors.map(e => e.message).join(', ')}`)
    }

    const videos = data.data?.map((tweet: Tweet) => ({
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