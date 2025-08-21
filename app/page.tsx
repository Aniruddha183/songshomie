import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Music, Users, MessageCircle, Play, Headphones, Radio } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
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
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                How It Works
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 md:py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="mb-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 text-foreground leading-tight font-sans">
              Listen to Music
              <span className="text-primary block">Together</span>
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Create virtual rooms, invite friends, and enjoy synchronized music listening with real-time chat. No
              sign-up required - just enter your name and start vibing!
            </p>
          </div>

          {/* Quick Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-12">
            <Card className="border-2 border-primary/20 hover:border-primary/40 transition-colors cursor-pointer group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-primary/20 transition-colors">
                  <Radio className="w-6 h-6 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold font-sans">Create Room</CardTitle>
                <CardDescription>Start a new listening session and invite friends</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/create-room">
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                    Create New Room
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-2 border-accent/20 hover:border-accent/40 transition-colors cursor-pointer group">
              <CardHeader className="pb-4">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-4 group-hover:bg-accent/20 transition-colors">
                  <Users className="w-6 h-6 text-accent" />
                </div>
                <CardTitle className="text-xl font-bold font-sans">Join Room</CardTitle>
                <CardDescription>Enter a room code to join an existing session</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Input placeholder="Enter room code" className="text-center font-mono tracking-wider" />
                <Link href="/join-room">
                  <Button
                    variant="outline"
                    className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground font-semibold bg-transparent"
                  >
                    Join Room
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          {/* Demo Preview */}
          <div className="bg-card rounded-xl p-6 md:p-8 border border-border max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                <Play className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center md:text-left">
                <h3 className="font-bold text-lg font-sans">Currently Playing</h3>
                <p className="text-muted-foreground">Experience synchronized playback</p>
              </div>
            </div>
            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">Awesome Song Title</span>
                <span className="text-sm text-muted-foreground">3:24 / 4:12</span>
              </div>
              <div className="w-full bg-border rounded-full h-2">
                <div className="bg-primary h-2 rounded-full w-3/4"></div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 md:gap-4 text-sm text-muted-foreground justify-center md:justify-start">
              <div className="flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                <span>5 people listening</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4" />
                <span>12 messages</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-12 md:py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-foreground font-sans">Why Choose SyncTunes?</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need for the perfect group listening experience
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="text-center border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Music className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold font-sans">Perfect Sync</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Advanced synchronization technology ensures everyone hears the same beat at the same time, no matter
                  where they are.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="w-16 h-16 bg-accent/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-accent" />
                </div>
                <CardTitle className="text-xl font-bold font-sans">Live Chat</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Share your thoughts, reactions, and music discoveries with real-time messaging that keeps the
                  conversation flowing.
                </p>
              </CardContent>
            </Card>

            <Card className="text-center border-0 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-xl font-bold font-sans">No Sign-Up</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  Jump right in with just your name. No lengthy registration process, no email verification - just pure
                  music enjoyment.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-12 md:py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-black mb-4 text-foreground font-sans">How It Works</h2>
            <p className="text-lg md:text-xl text-muted-foreground">Get started in three simple steps</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-lg">
                1
              </div>
              <h3 className="text-xl font-bold mb-3 font-sans">Create or Join</h3>
              <p className="text-muted-foreground leading-relaxed">
                Start a new room or join an existing one with a simple room code. Just enter your name and you're ready
                to go.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-4 text-accent-foreground font-bold text-lg">
                2
              </div>
              <h3 className="text-xl font-bold mb-3 font-sans">Add Music</h3>
              <p className="text-muted-foreground leading-relaxed">
                Room creators can search and add songs from YouTube. Build the perfect playlist for your listening
                session.
              </p>
            </div>

            <div className="text-center">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-lg">
                3
              </div>
              <h3 className="text-xl font-bold mb-3 font-sans">Listen & Chat</h3>
              <p className="text-muted-foreground leading-relaxed">
                Enjoy synchronized music with friends while chatting in real-time. Share reactions, discover new songs,
                and vibe together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/30 py-8 md:py-12 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-lg">
              <Music className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-black font-sans">SyncTunes</span>
          </div>
          <p className="text-muted-foreground mb-6">Bringing people together through music, one room at a time.</p>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-foreground transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
