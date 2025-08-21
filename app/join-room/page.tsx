"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Music, ArrowLeft, Users, Hash } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function JoinRoomPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    roomCode: "",
    userName: "",
  })
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.roomCode.trim() || !formData.userName.trim()) return

    setIsJoining(true)
    setError("")

    // Simulate API call to check if room exists
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // For demo purposes, accept any 6-character room code
    if (formData.roomCode.length !== 6) {
      setError("Room code must be 6 characters long")
      setIsJoining(false)
      return
    }

    // Store user data
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        name: formData.userName,
        isAdmin: false,
      }),
    )

    // Redirect to room
    router.push(`/room/${formData.roomCode.toUpperCase()}`)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (error) setError("")
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

      {/* Join Room Form */}
      <section className="py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-accent" />
            </div>
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-foreground font-sans">Join a Room</h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Enter the room code to join an existing listening session
            </p>
          </div>

          <Card className="border-2 border-accent/10">
            <CardHeader>
              <CardTitle className="text-xl md:text-2xl font-bold font-sans">Room Access</CardTitle>
              <CardDescription>Get the room code from your friend and enter your name to join</CardDescription>
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
                  <Label htmlFor="roomCode" className="text-sm font-semibold">
                    Room Code *
                  </Label>
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="roomCode"
                      placeholder="ABC123"
                      value={formData.roomCode}
                      onChange={(e) => handleInputChange("roomCode", e.target.value.toUpperCase())}
                      className="text-lg font-mono tracking-wider pl-12 text-center"
                      maxLength={6}
                      required
                    />
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <p className="text-xs text-muted-foreground">
                    Room codes are 6 characters long (letters and numbers)
                  </p>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold text-base md:text-lg py-4 md:py-6"
                    disabled={isJoining || !formData.roomCode.trim() || !formData.userName.trim()}
                  >
                    {isJoining ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                        Joining Room...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Join Room
                      </div>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/50 border-0 mt-8">
            <CardContent className="p-6 text-center">
              <h3 className="font-semibold mb-3 font-sans">What happens next?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div>
                  <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-accent font-bold">1</span>
                  </div>
                  <p>Join the room instantly</p>
                </div>
                <div>
                  <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-accent font-bold">2</span>
                  </div>
                  <p>Listen to synchronized music</p>
                </div>
                <div>
                  <div className="w-8 h-8 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-accent font-bold">3</span>
                  </div>
                  <p>Chat with other listeners</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
