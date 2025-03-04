'use client'

import React, { useEffect, useState } from 'react'
import { VideoCard } from './VideoCard'

interface YouTubeVideo {
  id: string;
  title: string;
  thumbnail: string;
  views: string;
  duration: string;
  creator: string;
  videoUrl: string;
}

interface TruckVideoGridProps {
  searchQuery?: string;
}

export const TruckVideoGrid: React.FC<TruckVideoGridProps> = ({ searchQuery }) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true)
        const queryParams = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''
        const response = await fetch(`/api/videos${queryParams}`)
        if (!response.ok) {
          throw new Error('Failed to fetch videos')
        }
        const data = await response.json()
        setVideos(data)
        setError(null)
      } catch (err) {
        setError('Failed to load videos. Please try again later.')
        console.error('Error fetching videos:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [searchQuery])

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center text-red-600 py-8">
        {error}
      </div>
    )
  }

  if (videos.length === 0) {
    return (
      <div className="text-center text-gray-600 py-8">
        No videos found. Try a different search term.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  )
} 