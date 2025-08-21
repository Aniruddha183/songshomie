"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Music, X, Plus } from "lucide-react"
import type { Song } from "@/lib/websocket-server"

interface MusicUploadProps {
  onAddSong: (song: Omit<Song, "id" | "addedAt">) => void
  userName: string
}

export function MusicUpload({ onAddSong, userName }: MusicUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [songData, setSongData] = useState({
    title: "",
    artist: "",
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Check if it's an audio file
    if (!file.type.startsWith("audio/")) {
      alert("Please select an audio file")
      return
    }

    setIsUploading(true)

    try {
      // Create object URL for the audio file
      const audioUrl = URL.createObjectURL(file)

      // Get audio duration
      const audio = new Audio(audioUrl)
      await new Promise((resolve) => {
        audio.addEventListener("loadedmetadata", resolve)
      })

      // Auto-fill title from filename if not provided
      const title = songData.title || file.name.replace(/\.[^/.]+$/, "")

      const song: Omit<Song, "id" | "addedAt"> = {
        title,
        artist: songData.artist || "Unknown Artist",
        duration: Math.floor(audio.duration),
        url: audioUrl,
        addedBy: userName,
      }

      onAddSong(song)

      // Reset form
      setSongData({ title: "", artist: "" })
      setShowUploadForm(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      console.error("Error processing audio file:", error)
      alert("Error processing audio file")
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {!showUploadForm ? (
        <Button onClick={() => setShowUploadForm(true)} className="w-full gap-2">
          <Plus className="w-4 h-4" />
          Add Songs
        </Button>
      ) : (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Add Song</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowUploadForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Song Title (Optional)</Label>
                <Input
                  id="title"
                  placeholder="Leave empty to use filename"
                  value={songData.title}
                  onChange={(e) => setSongData((prev) => ({ ...prev, title: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="artist">Artist (Optional)</Label>
                <Input
                  id="artist"
                  placeholder="Artist name"
                  value={songData.artist}
                  onChange={(e) => setSongData((prev) => ({ ...prev, artist: e.target.value }))}
                />
              </div>

              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-2">Click to select an audio file</p>
                <p className="text-xs text-muted-foreground">Supports MP3, WAV, OGG, and other audio formats</p>
              </div>

              <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleFileSelect} className="hidden" />

              <Button type="submit" className="w-full" disabled={isUploading}>
                {isUploading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    Processing...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Music className="w-4 h-4" />
                    Select Audio File
                  </div>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
