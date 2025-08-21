"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Music, ArrowLeft, Users, Radio } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function CreateRoomPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    roomName: "",
    userName: "",
    description: "",
  })
  const [isCreating, setIsCreating] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.roomName.trim() || !formData.userName.trim()) return

    setIsCreating(true)

    // Generate a simple room ID (in real app, this would be from backend)
    const roomId = Math.random().toString(36).substring(2, 8).toUpperCase()

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Store room data in localStorage for now
    localStorage.setItem(
      "currentRoom",
      JSON.stringify({
        id: roomId,
        name: formData.roomName,
        description: formData.description,
        creator: formData.userName,
        createdAt: new Date().toISOString(),
        isAdmin: true,
      }),
    )

    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        name: formData.userName,
        isAdmin: true,
      }),
    )

    // Redirect to room
    router.push(`/room/${roomId}`)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-primary rounded-lg">
                <Music className="w-5 h-5 md:w-6 md:h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-foreground font-sans">SyncTunes</h1>
            </Link>
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Create Room Form */}
      <section className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Radio className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-foreground font-sans">Create Your Room</h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Set up a new listening session and invite your friends to join
            </p>
          </div>

          <Card className="border-2 border-primary/10">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl font-bold font-sans">Room Details</CardTitle>
              <CardDescription>Fill in the details below to create your music room</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="userName" className="text-sm font-semibold">
                    Your Name *
                  </Label>
                  <Input
                    id="userName"
                    placeholder="Enter your display name"
                    value={formData.userName}
                    onChange={(e) => handleInputChange("userName", e.target.value)}
                    className="text-lg"
                    required
                  />
                  <p className="text-xs text-muted-foreground">This is how others will see you in the room</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="roomName" className="text-sm font-semibold">
                    Room Name *
                  </Label>
                  <Input
                    id="roomName"
                    placeholder="e.g., Friday Night Vibes, Study Session, etc."
                    value={formData.roomName}
                    onChange={(e) => handleInputChange("roomName", e.target.value)}
                    className="text-lg"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-sm font-semibold">
                    Description (Optional)
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Tell others what kind of music you'll be playing..."
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base md:text-lg py-4 md:py-6"
                    disabled={isCreating || !formData.roomName.trim() || !formData.userName.trim()}
                  >
                    {isCreating ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Creating Room...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Create Room
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
            <Card className="bg-muted/50 border-0">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 font-sans">As Room Creator</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Control music playback</li>
                  <li>• Manage the playlist</li>
                  <li>• See all participants</li>
                </ul>
              </CardContent>
            </Card>
            <Card className="bg-muted/50 border-0">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-2 font-sans">Share Your Room</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Get a unique room code</li>
                  <li>• Share with friends</li>
                  <li>• No sign-up required for guests</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
