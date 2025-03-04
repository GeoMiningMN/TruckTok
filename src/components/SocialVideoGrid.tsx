'use client'

import React, { useEffect, useState } from 'react'
import { VideoCard } from './VideoCard'
import { Video } from '../lib/types'

interface SocialVideoGridProps {
  searchQuery?: string;
}

export const SocialVideoGrid: React.FC<SocialVideoGridProps> = ({ searchQuery }) => {
  const [videos, setVideos] = useState<{
    youtube: Video[];
    tiktok: Video[];
    twitter: Video[];
  }>({
    youtube: [],
    tiktok: [],
    twitter: [],
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true)
        const queryParams = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : ''
        
        const [youtubeRes, tiktokRes, twitterRes] = await Promise.all([
          fetch(`/api/videos${queryParams}`),
          fetch(`/api/tiktok${queryParams}`),
          fetch(`/api/twitter${queryParams}`),
        ])

        const [youtubeData, tiktokData, twitterData] = await Promise.all([
          youtubeRes.ok ? youtubeRes.json() : [],
          tiktokRes.ok ? tiktokRes.json() : [],
          twitterRes.ok ? twitterRes.json() : [],
        ])

        setVideos({
          youtube: youtubeData,
          tiktok: tiktokData,
          twitter: twitterData,
        })
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

  const allEmpty = !videos.youtube.length && !videos.tiktok.length && !videos.twitter.length

  if (allEmpty) {
    return (
      <div className="text-center text-gray-600 py-8">
        No videos found. Try a different search term.
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* YouTube Column */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center mb-4">YouTube</h2>
        {videos.youtube.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {/* TikTok Column */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center mb-4">TikTok</h2>
        {videos.tiktok.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {/* Twitter Column */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-center mb-4">Twitter</h2>
        {videos.twitter.map((video) => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  )
} 