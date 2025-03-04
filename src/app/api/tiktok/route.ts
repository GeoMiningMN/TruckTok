import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || 'custom trucks'

  try {
    // Note: This is a mock implementation since TikTok's API requires business account verification
    // You'll need to replace this with actual TikTok API calls once you have API access
    const mockTikTokVideos = [
      {
        id: 'tiktok1',
        title: 'Amazing Custom Truck Build #trucks',
        thumbnail: 'https://picsum.photos/400/600',
        views: '1.2M',
        duration: '0:30',
        creator: '@truckbuilder',
        videoUrl: 'https://www.tiktok.com/@truckbuilder/video/1',
        platform: 'tiktok'
      },
      // Add more mock videos here
    ]

    return NextResponse.json(mockTikTokVideos)
  } catch (error) {
    console.error('Error fetching TikTok videos:', error)
    return NextResponse.json({ error: 'Failed to fetch TikTok videos' }, { status: 500 })
  }
} 