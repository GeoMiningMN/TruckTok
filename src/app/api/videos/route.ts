import { NextResponse } from 'next/server'
import { Video } from '@/lib/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || 'custom trucks'

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=12&q=${encodeURIComponent(
        query
      )}&type=video&videoCategoryId=2&key=${process.env.YOUTUBE_API_KEY}`
    )
    const searchData = await response.json()

    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(',')
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoIds}&key=${process.env.YOUTUBE_API_KEY}`
    )
    const videosData = await videosResponse.json()

    const videos: Video[] = videosData.items.map((video: any) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.high.url,
      thumbnailUrl: video.snippet.thumbnails.high.url,
      publishedAt: video.snippet.publishedAt,
      channelTitle: video.snippet.channelTitle,
      creator: video.snippet.channelTitle,
      views: formatViews(video.statistics.viewCount),
      viewCount: video.statistics.viewCount,
      duration: formatDuration(video.contentDetails.duration),
      likeCount: video.statistics.likeCount,
      videoUrl: `https://www.youtube.com/watch?v=${video.id}`,
      platform: 'youtube' as const
    }))

    return NextResponse.json(videos)
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 })
  }
}

function formatViews(viewCount: string): string {
  const count = parseInt(viewCount, 10)
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`
  }
  return viewCount
}

function formatDuration(duration: string): string {
  const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/)
  if (!match) return '0:00'

  const hours = (match[1] || '').replace('H', '')
  const minutes = (match[2] || '').replace('M', '')
  const seconds = (match[3] || '').replace('S', '')

  const parts = []
  if (hours) parts.push(hours)
  parts.push(minutes || '0')
  parts.push(seconds.padStart(2, '0') || '00')

  return parts.join(':')
} 