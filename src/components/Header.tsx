'use client'

import React, { useState } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch }) => {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSearch) {
      onSearch(searchQuery)
    }
  }

  return (
    <header className="bg-white shadow-md">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-primary">TruckTok</h1>
          </div>
          
          <form onSubmit={handleSubmit} className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search custom truck videos..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-primary"
              >
                <MagnifyingGlassIcon className="h-5 w-5" />
              </button>
            </div>
          </form>

          <nav>
            <ul className="flex space-x-6">
              <li>
                <a href="#" className="text-gray-600 hover:text-primary">
                  Trending
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-primary">
                  Categories
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-600 hover:text-primary">
                  About
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </header>
  )
} 