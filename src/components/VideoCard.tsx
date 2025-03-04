'use client'

import React from 'react'
import Image from 'next/image'
import { YouTubeVideo } from '../lib/youtube'

interface VideoCardProps {
  video: YouTubeVideo
}

export const VideoCard: React.FC<VideoCardProps> = ({ video }) => {
  return (
    <a 
      href={video.videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
    >
      <div className="relative aspect-video">
        <Image
          src={video.thumbnail}
          alt={video.title}
          fill
          className="object-cover"
        />
        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 text-sm rounded">
          {video.duration}
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-lg mb-2 line-clamp-2">
          {video.title}
        </h3>
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>{video.creator}</span>
          <span>{video.views} views</span>
        </div>
      </div>
    </a>
  )
} 