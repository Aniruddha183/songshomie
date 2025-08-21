import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get("q")

  if (!query) {
    return NextResponse.json({ success: false, error: "Query parameter is required" })
  }

  try {
    // Using YouTube Data API v3
    const API_KEY = process.env.YOUTUBE_API_KEY
    if (!API_KEY) {
      return NextResponse.json({ success: false, error: "YouTube API key not configured" })
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoCategoryId=10&maxResults=10&q=${encodeURIComponent(
        query + " music",
      )}&key=${API_KEY}`,
    )

    if (!response.ok) {
      throw new Error("YouTube API request failed")
    }

    const data = await response.json()

    // Get video details for duration
    const videoIds = data.items.map((item: any) => item.id.videoId).join(",")
    const detailsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,snippet&id=${videoIds}&key=${API_KEY}`,
    )

    const detailsData = await detailsResponse.json()

    const tracks = detailsData.items.map((item: any) => {
      // Parse ISO 8601 duration (PT4M13S -> 253 seconds)
      const duration = item.contentDetails.duration
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/)
      const hours = Number.parseInt(match[1] || "0")
      const minutes = Number.parseInt(match[2] || "0")
      const seconds = Number.parseInt(match[3] || "0")
      const totalSeconds = hours * 3600 + minutes * 60 + seconds

      return {
        id: item.id,
        title: item.snippet.title,
        artist: item.snippet.channelTitle,
        duration: totalSeconds,
        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default.url,
        url: `https://www.youtube.com/watch?v=${item.id}`,
      }
    })

    return NextResponse.json({ success: true, tracks })
  } catch (error) {
    console.error("YouTube search error:", error)
    return NextResponse.json({ success: false, error: "Failed to search YouTube" })
  }
}
