"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Plus, Clock } from "lucide-react"

interface YouTubeTrack {
  id: string
  title: string
  artist: string
  duration: number
  thumbnail: string
  url: string
}

interface YouTubeMusicSearchProps {
  onAddSong: (song: { title: string; artist: string; duration: number; url: string; addedBy: string }) => void
  userName: string
}

export function YouTubeMusicSearch({ onAddSong, userName }: YouTubeMusicSearchProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<YouTubeTrack[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/youtube-search?q=${encodeURIComponent(searchQuery)}`)
      const data = await response.json()

      if (data.success) {
        // Ensure URLs are in the correct format for YouTube
        const formattedTracks = data.tracks.map((track: YouTubeTrack) => ({
          ...track,
          url: track.url.startsWith('http') ? track.url : `https://www.youtube.com/watch?v=${track.id}`,
        }))
        setSearchResults(formattedTracks)
        setShowResults(true)
      } else {
        console.error("Search failed:", data.error)
        // Show error message to user
        alert("Search failed. Please try again.")
      }
    } catch (error) {
      console.error("Search error:", error)
      alert("Network error. Please check your connection and try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddSong = (track: YouTubeTrack) => {
    // Ensure the URL is in the correct YouTube format
    const youtubeUrl = track.url.startsWith('http') 
      ? track.url 
      : `https://www.youtube.com/watch?v=${track.id}`

    onAddSong({
      title: track.title,
      artist: track.artist,
      duration: track.duration,
      url: youtubeUrl,
      addedBy: userName,
    })
    setShowResults(false)
    setSearchQuery("")
    setSearchResults([])
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for songs on YouTube..."
          className="flex-1"
        />
        <Button type="submit" disabled={isSearching || !searchQuery.trim()}>
          {isSearching ? (
            <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </Button>
      </form>

      {showResults && (
        <Card className="max-h-96 overflow-y-auto">
          <CardContent className="p-4">
            <div className="space-y-2">
              {searchResults.length > 0 ? (
                searchResults.map((track) => (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 p-3 rounded-lg border bg-muted/50 hover:bg-muted/70 transition-colors"
                  >
                    <img
                      src={track.thumbnail || "/placeholder.svg"}
                      alt={track.title}
                      className="w-12 h-12 rounded object-cover"
                      onError={(e) => {
                        // Fallback for broken thumbnail images
                        (e.target as HTMLImageElement).src = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAyNkM5IDI2IDkgMTQgMjAgMTRTMzEgMjYgMjAgMjZaIiBmaWxsPSIjOUM5Qzk3Ii8+Cjwvc3ZnPgo="
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate" title={track.title}>{track.title}</p>
                      <p className="text-sm text-muted-foreground truncate" title={track.artist}>{track.artist}</p>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span>{formatDuration(track.duration)}</span>
                    </div>
                    <Button size="sm" onClick={() => handleAddSong(track)} className="shrink-0">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No results found. Try a different search term.</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}