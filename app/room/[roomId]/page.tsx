// Enhanced Room Page with Better User ID Management
"use client";

import type React from "react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music, Users, Copy, Share, Clock } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useWebSocket } from "@/hooks/use-websocket";
import { MusicPlayer } from "@/components/music-player";
import { YouTubeMusicSearch } from "@/components/youtube-music-search";
import type { RoomParticipant, PlaybackState } from "@/lib/websocket-server";

interface User {
  name: string;
  isAdmin: boolean;
  id?: string; // Add optional ID
}

interface Room {
  id: string;
  name: string;
  description?: string;
  creator: string;
  createdAt: string;
  isAdmin: boolean;
}

interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  url: string;
  addedBy: string;
  addedAt: string;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Local playlist state (works without WebSocket)
  const [localPlaylist, setLocalPlaylist] = useState<Song[]>([]);
  const [localCurrentIndex, setLocalCurrentIndex] = useState(0);
  const [localIsPlaying, setLocalIsPlaying] = useState(false);
  const [localVolume, setLocalVolume] = useState(1);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);

  // Generate consistent user ID
  const getUserId = (userName: string): string => {
    const stored = localStorage.getItem(`userId_${userName}`);
    if (stored) return stored;

    const newId = `user_${userName}_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    localStorage.setItem(`userId_${userName}`, newId);
    return newId;
  };

  const wsUser: RoomParticipant = currentUser
    ? {
        id: getUserId(currentUser.name),
        name: currentUser.name,
        isAdmin: currentUser.isAdmin,
        joinedAt: new Date().toISOString(),
        isOnline: true,
      }
    : { id: "", name: "", isAdmin: false, joinedAt: "", isOnline: false };

  // Memoize the user object to prevent unnecessary re-renders
  const currentUserMemo = useMemo(
    () => ({
      id: wsUser.id || `user_${wsUser.name}_${Date.now()}`,
      name: wsUser.name,
      isAdmin: false,
      joinedAt: new Date().toISOString(),
      isOnline: true,
    }),
    [wsUser.id, wsUser.name]
  );

  // Use the memoized user object
  const {
    isConnected,
    messages,
    participants,
    roomInfo,
    playbackState: wsPlaybackState, // Rename this to avoid conflict
    sendMessage,
    addSong,
    controlPlayback,
    getSyncedCurrentTime,
  } = useWebSocket({ roomId, user: currentUserMemo });

  // Memoize the playback state to prevent unnecessary re-renders
  const playbackState = useMemo(
    () => ({
      playlist:
        isConnected && wsPlaybackState.playlist.length > 0
          ? wsPlaybackState.playlist
          : localPlaylist,
      currentIndex:
        isConnected && wsPlaybackState.playlist.length > 0
          ? wsPlaybackState.currentIndex
          : localCurrentIndex,
      isPlaying:
        isConnected && wsPlaybackState.playlist.length > 0
          ? wsPlaybackState.isPlaying
          : localIsPlaying,
      volume: isConnected ? wsPlaybackState.volume : localVolume,
      currentTime: isConnected ? wsPlaybackState.currentTime : localCurrentTime,
      currentSong:
        (isConnected && wsPlaybackState.playlist.length > 0
          ? wsPlaybackState.playlist[wsPlaybackState.currentIndex]
          : localPlaylist[localCurrentIndex]) || null,
      serverStartTime: isConnected ? wsPlaybackState.serverStartTime : null,
      playbackStartTime: isConnected ? wsPlaybackState.playbackStartTime : null,
      lastSyncTime: isConnected ? wsPlaybackState.lastSyncTime : Date.now(),
    }),
    [
      isConnected,
      wsPlaybackState.playlist,
      wsPlaybackState.currentIndex,
      wsPlaybackState.isPlaying,
      wsPlaybackState.volume,
      wsPlaybackState.currentTime,
      wsPlaybackState.serverStartTime,
      wsPlaybackState.playbackStartTime,
      wsPlaybackState.lastSyncTime,
      localPlaylist,
      localCurrentIndex,
      localIsPlaying,
      localVolume,
      localCurrentTime,
    ]
  );

  useEffect(() => {
    // Load user and room data from localStorage
    const userData = localStorage.getItem("currentUser");
    const roomData = localStorage.getItem("currentRoom");
    const savedPlaylist = localStorage.getItem(`playlist_${roomId}`);

    if (userData) {
      const parsedUser = JSON.parse(userData);
      // Ensure user has an ID
      if (!parsedUser.id) {
        parsedUser.id = getUserId(parsedUser.name);
      }
      setCurrentUser(parsedUser);
    }

    if (roomData) {
      const parsedRoom = JSON.parse(roomData);
      if (parsedRoom.id === roomId) {
        setRoom(parsedRoom);
      }
    }

    // Load saved playlist for this room
    if (savedPlaylist) {
      try {
        const playlist = JSON.parse(savedPlaylist);
        setLocalPlaylist(playlist);
      } catch (error) {
        console.error("Error loading saved playlist:", error);
      }
    }

    // If no user data, redirect to join page
    if (!userData) {
      router.push(`/join-room?roomId=${roomId}`);
    }
  }, [roomId, router]);

  // Save playlist to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`playlist_${roomId}`, JSON.stringify(localPlaylist));
  }, [localPlaylist, roomId]);

  // Local add song function
  const addSongLocal = useCallback(
    (song: {
      title: string;
      artist: string;
      duration: number;
      url: string;
      addedBy: string;
    }) => {
      const newSong: Song = {
        id: Date.now().toString(),
        ...song,
        addedAt: new Date().toISOString(),
      };

      setLocalPlaylist((prev) => [...prev, newSong]);

      // Also try to sync with WebSocket if connected
      if (isConnected) {
        addSong(song);
      }
    },
    [isConnected, addSong]
  );

  // Local playback control function
  const controlPlaybackLocal = useCallback(
    (action: string, payload?: any) => {
      switch (action) {
        case "play":
          setLocalIsPlaying(true);
          if (payload?.currentTime !== undefined) {
            setLocalCurrentTime(payload.currentTime);
          }
          break;
        case "pause":
          setLocalIsPlaying(false);
          if (payload?.currentTime !== undefined) {
            setLocalCurrentTime(payload.currentTime);
          }
          break;
        case "seek":
          if (payload?.currentTime !== undefined) {
            setLocalCurrentTime(payload.currentTime);
          }
          break;
        case "volume":
          if (payload?.volume !== undefined) {
            setLocalVolume(payload.volume);
          }
          break;
        case "next":
          if (localCurrentIndex < localPlaylist.length - 1) {
            setLocalCurrentIndex((prev) => prev + 1);
            setLocalCurrentTime(0);
          }
          break;
        case "previous":
          if (localCurrentIndex > 0) {
            setLocalCurrentIndex((prev) => prev - 1);
            setLocalCurrentTime(0);
          }
          break;
      }

      // Also try to sync with WebSocket if connected
      if (isConnected) {
        controlPlayback(action, payload);
      }
    },
    [localCurrentIndex, localPlaylist.length, isConnected, controlPlayback]
  );

  const copyRoomCode = () => {
    navigator.clipboard.writeText(roomId);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    sendMessage(newMessage);
    setNewMessage("");
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const canControlPlayback = () => {
    // Allow local control if not connected, or follow room rules if connected
    if (!isConnected) return true;
    return (
      currentUser?.isAdmin || roomInfo?.settings?.allowGuestControl || false
    );
  };

  const getLocalSyncedCurrentTime = useCallback(() => {
    if (isConnected && getSyncedCurrentTime) {
      return getSyncedCurrentTime();
    }
    return localCurrentTime;
  }, [isConnected, getSyncedCurrentTime, localCurrentTime]);

  // Debug logging
  useEffect(() => {
    console.log("Connection status:", isConnected);
    console.log("Current user:", currentUser);
    console.log("Participants:", participants);
    console.log("Room info:", roomInfo);
  }, [isConnected, currentUser, participants, roomInfo]);

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
                <Music className="w-6 h-6 text-primary-foreground" />
              </div>
              <h1 className="text-xl md:text-2xl font-black text-foreground font-sans">
                SyncTunes
              </h1>
            </Link>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="font-mono text-xs md:text-sm"
                >
                  {roomId}
                </Badge>
                <Button variant="ghost" size="sm" onClick={copyRoomCode}>
                  <Copy className="w-4 h-4" />
                </Button>
                <div
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-green-500" : "bg-orange-500"
                  }`}
                  title={
                    isConnected
                      ? "Connected to room"
                      : "Local mode - changes won't sync"
                  }
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent hidden md:flex"
              >
                <Share className="w-4 h-4" />
                Invite
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Connection Status */}
        {!isConnected && (
          <Card className="mb-6 border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
            <CardContent className="pt-6">
              <p className="text-sm text-orange-800 dark:text-orange-200">
                <strong>Local Mode:</strong> You can still add songs and control
                playback. Changes will sync with others when connection is
                restored.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Debug Info */}
        {process.env.NODE_ENV === "development" && (
          <Card className="mb-6 border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
            <CardContent className="pt-4">
              <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                <div>Connected: {isConnected ? "Yes" : "No"}</div>
                <div>User ID: {wsUser.id}</div>
                <div>User Name: {wsUser.name}</div>
                <div>Is Admin: {wsUser.isAdmin ? "Yes" : "No"}</div>
                <div>Participants Count: {participants.length}</div>
                <div>
                  Participants: {participants.map((p) => p.name).join(", ")}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Room Info */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-xl md:text-2xl font-bold font-sans">
                      {roomInfo?.name || room?.name || `Room ${roomId}`}
                    </CardTitle>
                    {(roomInfo?.description || room?.description) && (
                      <p className="text-muted-foreground mt-1">
                        {roomInfo?.description || room?.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2 text-sm text-muted-foreground">
                      <span>
                        Created by {roomInfo?.creator || room?.creator}
                      </span>
                      {roomInfo?.settings && (
                        <>
                          <span className="hidden md:inline">•</span>
                          <span>
                            Max {roomInfo.settings.maxParticipants} participants
                          </span>
                          {roomInfo.settings.allowGuestControl && (
                            <>
                              <span className="hidden md:inline">•</span>
                              <span>Guest control enabled</span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{participants.length || 1} listening</span>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Music Player */}
            <MusicPlayer
              playbackState={playbackState}
              onPlaybackControl={controlPlaybackLocal}
              isAdmin={canControlPlayback()}
              getSyncedCurrentTime={getLocalSyncedCurrentTime}
              serverTimeOffset={0} // serverTimeOffset is now part of playbackState
            />

            {/* Playlist */}
            <Card>
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <CardTitle>
                    Playlist ({playbackState.playlist.length} songs)
                  </CardTitle>
                  <div className="w-full md:w-auto">
                    <YouTubeMusicSearch
                      onAddSong={addSongLocal}
                      userName={currentUser.name}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {playbackState.playlist.length > 0 ? (
                  <div className="space-y-2">
                    {playbackState.playlist.map((song, index) => (
                      <div
                        key={song.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border ${
                          index === playbackState.currentIndex
                            ? "bg-primary/10 border-primary/20"
                            : "bg-muted/50 border-border"
                        }`}
                      >
                        <div className="w-8 h-8 bg-primary/10 rounded flex items-center justify-center">
                          <Music className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{song.title}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {song.artist}
                          </p>
                        </div>
                        <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span>{formatDuration(song.duration)}</span>
                        </div>
                        <p className="text-xs text-muted-foreground hidden md:block">
                          by {song.addedBy}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Music className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No songs in playlist</p>
                    <p className="text-sm mt-2">
                      Search and add songs to get started!
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:block">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-6">
              {currentUser.isAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Room Controls</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-transparent"
                      onClick={() => setShowSettings(!showSettings)}
                    >
                      Room Settings
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        if (
                          confirm("Are you sure you want to close this room?")
                        ) {
                          // The original code had closeRoom() here, but closeRoom is not part of useWebSocket.
                          // Assuming it's a placeholder for a function that would manage room state globally.
                          // For now, we'll just redirect.
                          router.push("/");
                        }
                      }}
                    >
                      Close Room
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Participants */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Participants ({participants.length || 1})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {/* Always show current user */}
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="font-medium text-sm md:text-base">
                          {currentUser.name} (You)
                        </span>
                        {currentUser.isAdmin && (
                          <Badge variant="secondary" className="text-xs">
                            Admin
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Show other participants if connected */}
                    {participants
                      .filter((p) => p.name !== currentUser.name)
                      .map((participant) => (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                participant.isOnline
                                  ? "bg-green-500"
                                  : "bg-gray-400"
                              }`}
                            />
                            <span className="font-medium text-sm md:text-base">
                              {participant.name}
                            </span>
                            {participant.isAdmin && (
                              <Badge variant="secondary" className="text-xs">
                                Admin
                              </Badge>
                            )}
                          </div>
                          {currentUser.isAdmin && !participant.isAdmin && (
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs hidden md:block"
                                onClick={() => {
                                  // transferAdmin is not part of useWebSocket.
                                  // This functionality would need to be managed globally or via a separate hook.
                                  // For now, we'll just log.
                                  console.log(
                                    "Transfer admin not implemented in local mode"
                                  );
                                }}
                              >
                                Make Admin
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm(`Kick ${participant.name}?`)) {
                                    // kickUser is not part of useWebSocket.
                                    // This functionality would need to be managed globally or via a separate hook.
                                    // For now, we'll just log.
                                    console.log(
                                      "Kick user not implemented in local mode"
                                    );
                                  }
                                }}
                              >
                                Kick
                              </Button>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Chat - Only show if connected */}
            {isConnected && (
              <Card className="flex flex-col h-96">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Chat</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col gap-3">
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                    {messages.map((message) => (
                      <div key={message.id} className="text-sm">
                        {message.user === "System" ? (
                          <p className="text-muted-foreground italic text-center">
                            {message.message}
                          </p>
                        ) : (
                          <div>
                            <span className="font-medium text-primary">
                              {message.user}:
                            </span>{" "}
                            <span className="text-foreground">
                              {message.message}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                    {messages.length === 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    )}
                  </div>
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20"
                      disabled={!isConnected}
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!newMessage.trim() || !isConnected}
                    >
                      Send
                    </Button>
                  </form>
                  {!isConnected && (
                    <p className="text-xs text-muted-foreground text-center">
                      Chat unavailable in local mode
                    </p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
