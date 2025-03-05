import { NextResponse } from 'next/server'
import crypto from 'crypto'

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      X_API_KEY: string
      X_API_SECRET: string
      X_ACCESS_TOKEN: string
      X_ACCESS_TOKEN_SECRET: string
    }
  }
}

interface TwitterParameters {
  oauth_consumer_key: string
  oauth_nonce: string
  oauth_signature_method: string
  oauth_timestamp: string
  oauth_token: string
  oauth_version: string
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
    const apiKey = process.env.X_API_KEY
    const apiSecret = process.env.X_API_SECRET
    const accessToken = process.env.X_ACCESS_TOKEN
    const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET

    if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
      console.error('Missing X API credentials:', {
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasAccessToken: !!accessToken,
        hasAccessTokenSecret: !!accessTokenSecret
      })
      throw new Error('Missing X API credentials')
    }

    // Create the OAuth 1.0a signature
    const timestamp = Math.floor(Date.now() / 1000).toString()
    const nonce = crypto.randomBytes(32).toString('hex')

    const parameters: TwitterParameters = {
      oauth_consumer_key: apiKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      oauth_token: accessToken,
      oauth_version: '1.0'
    }

    const baseUrl = 'https://api.twitter.com/2/tweets/search/recent'
    const encodedQuery = encodeURIComponent(`${query} has:videos`)

    // Generate signature
    const signatureBaseString = [
      'GET',
      encodeURIComponent(baseUrl),
      encodeURIComponent(
        Object.keys(parameters)
          .sort()
          .map(key => `${key}=${parameters[key as keyof TwitterParameters]}`)
          .join('&')
      )
    ].join('&')

    const signingKey = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessTokenSecret)}`
    const signature = crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64')

    // Create Authorization header
    const authHeader = 'OAuth ' + Object.entries({
      ...parameters,
      oauth_signature: signature
    })
      .map(([key, value]) => `${key}="${encodeURIComponent(value)}"`)
      .join(', ')

    console.log('Making request to X API with query:', query)
    
    const response = await fetch(
      `${baseUrl}?query=${encodedQuery}&tweet.fields=public_metrics,created_at&expansions=author_id,attachments.media_keys&media.fields=preview_image_url,url,duration_ms`,
      {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('X API error:', {
        status: response.status,
        statusText: response.statusText,
        errorText,
        headers: Array.from(response.headers).reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {})
      })
      throw new Error(`X API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json() as TwitterResponse
    console.log('X API response:', JSON.stringify(data, null, 2))

    if (!data.data || !Array.isArray(data.data)) {
      console.warn('Unexpected X API response format:', data)
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