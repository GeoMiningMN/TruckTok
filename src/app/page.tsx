'use client'

import React, { useState } from 'react'
import { SocialVideoGrid } from '../components/SocialVideoGrid'
import { Header } from '../components/Header'

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (query: string) => {
    setSearchQuery(query)
  }

  return (
    <div className="min-h-screen">
      <Header onSearch={handleSearch} />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-center mb-8">
          Welcome to TruckTok
        </h1>
        <p className="text-xl text-center mb-12 text-gray-600">
          Discover amazing custom truck videos from around the world
        </p>
        <SocialVideoGrid searchQuery={searchQuery} />
      </main>
    </div>
  )
}
