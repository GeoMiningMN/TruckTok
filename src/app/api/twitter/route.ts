import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q') || 'custom trucks'

  try {
    // Note: This is a mock implementation since Twitter's API requires authentication
    // You'll need to replace this with actual Twitter API calls once you have API access
    const mockTwitterVideos = [
      {
        id: 'twitter1',
        title: 'Check out this custom Peterbilt! 🚛 #trucks #customtrucks',
        thumbnail: 'https://picsum.photos/400/300',
        views: '50K',
        duration: '1:45',
        creator: '@truckspotter',
        videoUrl: 'https://twitter.com/truckspotter/status/1',
        platform: 'twitter'
      },
      // Add more mock videos here
    ]

    return NextResponse.json(mockTwitterVideos)
  } catch (error) {
    console.error('Error fetching Twitter videos:', error)
    return NextResponse.json({ error: 'Failed to fetch Twitter videos' }, { status: 500 })
  }
} 