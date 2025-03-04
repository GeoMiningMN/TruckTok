import React from 'react'
import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TruckTok - Custom Truck Videos Worldwide',
  description: 'Discover amazing custom truck videos from around the world',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-100`}>
        <main className="min-h-screen">
          {children}
        </main>
      </body>
    </html>
  )
}
