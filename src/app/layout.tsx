import React from 'react'
import './globals.css'

export const metadata = {
  title: 'MCP Chat Assistant',
  description: 'Find and use MCP servers with AI assistance',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <div className="min-h-screen bg-white">
          {children}
        </div>
      </body>
    </html>
  )
} 