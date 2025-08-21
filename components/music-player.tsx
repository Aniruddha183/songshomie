"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Volume2,
  Music,
  Wifi,
  WifiOff,
  Globe,
} from "lucide-react";
import type { PlaybackState } from "@/lib/websocket-server";

// Declare YouTube API types
declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface MusicPlayerProps {
  playbackState: PlaybackState;
  onPlaybackControl: (action: string, payload?: any) => void;
  isAdmin: boolean;
  getSyncedCurrentTime: () => number;
  serverTimeOffset: number;
  isConnected?: boolean;
}

export function MusicPlayer({
  playbackState,
  onPlaybackControl,
  isAdmin,
  getSyncedCurrentTime,
  serverTimeOffset,
  isConnected = true,
}: MusicPlayerProps) {
  const playerRef = useRef<any>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const [localCurrentTime, setLocalCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [syncStatus, setSyncStatus] = useState<
    "synced" | "syncing" | "out-of-sync" | "local"
  >("synced");
  const [isYTReady, setIsYTReady] = useState(false);
  const [playerState, setPlayerState] = useState<number>(-1);
  const [apiError, setApiError] = useState(false);
  const [syncPaused, setSyncPaused] = useState(false);
  const timeUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Enhanced refs to track sync corrections and prevent excessive seeking
  const lastSyncCorrectionRef = useRef<number>(0);
  const consecutiveSyncCorrectionsRef = useRef<number>(0);
  const isSeekingRef = useRef<boolean>(false);
  const playerReadyRef = useRef<boolean>(false);

  // Extract YouTube video ID from URL
  const getYouTubeVideoId = (url: string): string | null => {
    const regExp =
      /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Get YouTube thumbnail URL
  const getThumbnailUrl = (videoId: string): string => {
    // Use maxresdefault for highest quality, fallback to hqdefault if not available
    return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  };

  // Load YouTube IFrame API
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

      window.onYouTubeIframeAPIReady = () => {
        setIsYTReady(true);
      };
    } else {
      setIsYTReady(true);
    }
  }, []);

  // Handle player state changes more gracefully
  const handlePlayerStateChange = (event: any) => {
    const newState = event.data;
    setPlayerState(newState);

    // Reset seeking and sync correction tracking when playback starts
    if (newState === window.YT.PlayerState.PLAYING) {
      playerReadyRef.current = true;
      // Give the player time to stabilize before allowing sync corrections
      setTimeout(() => {
        isSeekingRef.current = false;
        consecutiveSyncCorrectionsRef.current = 0;
        lastSyncCorrectionRef.current = Date.now(); // Prevent immediate sync correction
      }, 3000); // 3 seconds buffer
    }

    // Handle video ended
    if (newState === window.YT.PlayerState.ENDED) {
      onPlaybackControl("next");
    }

    // Handle buffering - pause sync corrections during buffering
    if (newState === window.YT.PlayerState.BUFFERING) {
      isSeekingRef.current = true; // Prevent sync corrections while buffering
      setTimeout(() => {
        if (playerReadyRef.current) {
          isSeekingRef.current = false;
        }
      }, 5000);
    }

    // Handle paused state
    if (newState === window.YT.PlayerState.PAUSED) {
      isSeekingRef.current = false;
    }
  };

  // Initialize player when YT API is ready and we have a song
  useEffect(() => {
    if (!isYTReady || !playbackState.currentSong || !playerContainerRef.current)
      return;

    const videoId = getYouTubeVideoId(playbackState.currentSong.url);
    const thumbnailUrl = videoId ? getThumbnailUrl(videoId) : null;
    if (!videoId) {
      console.error("Invalid YouTube URL:", playbackState.currentSong.url);
      return;
    }

    // Destroy existing player
    if (playerRef.current) {
      playerRef.current.destroy();
    }

    // Reset all tracking variables
    lastSyncCorrectionRef.current = 0;
    consecutiveSyncCorrectionsRef.current = 0;
    isSeekingRef.current = false;
    playerReadyRef.current = false;
    setApiError(false);
    setSyncPaused(false);

    // Create new player
    playerRef.current = new window.YT.Player(playerContainerRef.current, {
      height: "0", // Hidden player
      width: "0",
      videoId: videoId,
      playerVars: {
        autoplay: playbackState.isPlaying ? 1 : 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        playsinline: 1,
      },
      events: {
        onReady: (event: any) => {
          console.log("YouTube player ready");
          setApiError(false); // Reset error state on successful load
          event.target.setVolume(playbackState.volume * 100);

          // Seek to current time if needed (with improved logic)
          if (isConnected) {
            const syncTime = getSyncedCurrentTime();
            if (syncTime > 0) {
              isSeekingRef.current = true;
              event.target.seekTo(syncTime, true);
              setTimeout(() => {
                isSeekingRef.current = false;
                lastSyncCorrectionRef.current = Date.now(); // Prevent immediate corrections
                playerReadyRef.current = true;
              }, 3000); // Increased buffer time
            } else {
              playerReadyRef.current = true;
            }
          } else {
            playerReadyRef.current = true;
          }

          // Start playing if should be playing
          if (playbackState.isPlaying) {
            event.target.playVideo();
          }
        },
        onStateChange: handlePlayerStateChange,
        onError: (event: any) => {
          console.error("YouTube player error:", event.data);

          // Handle different error types
          switch (event.data) {
            case 2: // Invalid video ID
            case 100: // Video not found or private
            case 101: // Video not available in embedded players
            case 150: // Video not available in embedded players
              setApiError(true);
              setTimeout(() => {
                onPlaybackControl("next");
              }, 2000);
              break;
            default:
              // For other errors, try to reload after delay
              setTimeout(() => {
                if (playerRef.current && playbackState.currentSong) {
                  const videoId = getYouTubeVideoId(
                    playbackState.currentSong.url
                  );
                  if (videoId && playerRef.current.loadVideoById) {
                    playerRef.current.loadVideoById(videoId);
                  }
                }
              }, 5000);
          }
        },
      },
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [isYTReady, playbackState.currentSong?.url]);

  // Handle play/pause state changes (improved)
  useEffect(() => {
    if (!playerRef.current || !isYTReady || !playerReadyRef.current) return;

    // Check if methods are available
    if (
      !playerRef.current.playVideo ||
      !playerRef.current.pauseVideo ||
      !playerRef.current.seekTo
    ) {
      return;
    }

    if (
      playbackState.isPlaying &&
      playerState !== window.YT?.PlayerState?.PLAYING
    ) {
      // Only sync time if not currently seeking and not recently corrected
      if (isConnected && !isSeekingRef.current && !syncPaused) {
        const now = Date.now();
        const timeSinceLastCorrection = now - lastSyncCorrectionRef.current;

        if (timeSinceLastCorrection > 5000) {
          // Wait at least 5 seconds between corrections
          const syncTime = getSyncedCurrentTime();
          const currentTime = playerRef.current.getCurrentTime?.() || 0;
          const timeDifference = Math.abs(syncTime - currentTime);

          // Only seek if difference is very significant and we haven't been correcting too much
          if (timeDifference > 3 && consecutiveSyncCorrectionsRef.current < 1) {
            isSeekingRef.current = true;
            playerRef.current.seekTo(syncTime, true);
            lastSyncCorrectionRef.current = now;
            consecutiveSyncCorrectionsRef.current++;

            setTimeout(() => {
              isSeekingRef.current = false;
            }, 2000);
          }
        }
      }

      if (typeof playerRef.current.playVideo === "function") {
        playerRef.current.playVideo();
      }
    } else if (
      !playbackState.isPlaying &&
      playerState === window.YT?.PlayerState?.PLAYING
    ) {
      if (typeof playerRef.current.pauseVideo === "function") {
        playerRef.current.pauseVideo();
      }
    }
  }, [playbackState.isPlaying, isConnected, getSyncedCurrentTime]);

  // Handle volume changes (improved)
  useEffect(() => {
    if (!playerRef.current || !isYTReady || !playerReadyRef.current) return;

    const setVolume = () => {
      if (playerRef.current && playerRef.current.setVolume) {
        playerRef.current.setVolume(playbackState.volume * 100);
      }
    };

    if (playerRef.current.getPlayerState) {
      setVolume();
    } else {
      const timer = setTimeout(setVolume, 200);
      return () => clearTimeout(timer);
    }
  }, [playbackState.volume, isYTReady, playerReadyRef.current]);

  // Auto-resume sync after cooldown period
  useEffect(() => {
    if (syncPaused) {
      const timer = setTimeout(() => {
        setSyncPaused(false);
        consecutiveSyncCorrectionsRef.current = 0;
      }, 30000); // 30-second cooldown

      return () => clearTimeout(timer);
    }
  }, [syncPaused]);

  // Enhanced time tracking and sync logic
  useEffect(() => {
    if (!playerRef.current || !isYTReady || !playerReadyRef.current) return;

    if (timeUpdateIntervalRef.current) {
      clearInterval(timeUpdateIntervalRef.current);
    }

    const updateTime = () => {
      if (!isDragging && playerRef.current && !isSeekingRef.current) {
        try {
          // Check if player methods are available
          if (
            !playerRef.current.getCurrentTime ||
            typeof playerRef.current.getCurrentTime !== "function"
          ) {
            return;
          }

          const currentTime = playerRef.current.getCurrentTime() || 0;
          setLocalCurrentTime(currentTime);

          // Enhanced sync check for connected mode
          if (isConnected && playbackState.isPlaying && !syncPaused) {
            const syncedTime = getSyncedCurrentTime();
            const timeDifference = Math.abs(syncedTime - currentTime);
            const now = Date.now();
            const timeSinceLastCorrection = now - lastSyncCorrectionRef.current;

            // More conservative sync thresholds and better rate limiting
            if (
              timeDifference > 5 && // Increased threshold to 5 seconds
              timeSinceLastCorrection > 15000 && // Increased to 15 seconds between corrections
              consecutiveSyncCorrectionsRef.current < 1 && // Only allow 1 correction before pause
              playerState === window.YT?.PlayerState?.PLAYING // Only sync when actually playing
            ) {
              console.log(
                `Performing sync correction: ${timeDifference.toFixed(
                  2
                )}s difference`
              );
              setSyncStatus("out-of-sync");

              if (
                playerRef.current.seekTo &&
                typeof playerRef.current.seekTo === "function"
              ) {
                isSeekingRef.current = true;
                playerRef.current.seekTo(syncedTime, true);
                lastSyncCorrectionRef.current = now;
                consecutiveSyncCorrectionsRef.current++;

                // Extended recovery time
                setTimeout(() => {
                  isSeekingRef.current = false;
                }, 3000); // Increased from 2000ms

                // Pause sync if we've had to correct
                if (consecutiveSyncCorrectionsRef.current >= 1) {
                  setSyncPaused(true);
                }
              }
            } else if (timeDifference > 2 && timeDifference <= 5) {
              setSyncStatus("syncing");
            } else if (timeDifference <= 2) {
              setSyncStatus("synced");
              // Only reset correction count if we've been in sync for a while
              if (timeSinceLastCorrection > 30000) {
                consecutiveSyncCorrectionsRef.current = 0;
              }
            }
          } else if (!isConnected) {
            setSyncStatus("local");
          } else if (syncPaused) {
            setSyncStatus("syncing");
          }
        } catch (error) {
          console.error("Error getting player time:", error);
        }
      }
    };

    // Increased delay and interval for better stability
    const timer = setTimeout(() => {
      timeUpdateIntervalRef.current = setInterval(updateTime, 2000); // Increased to 2 seconds
    }, 5000); // Increased initial delay to 5 seconds

    return () => {
      clearTimeout(timer);
      if (timeUpdateIntervalRef.current) {
        clearInterval(timeUpdateIntervalRef.current);
      }
    };
  }, [
    isDragging,
    playbackState.isPlaying,
    isConnected,
    getSyncedCurrentTime,
    isYTReady,
    playerReadyRef.current,
    syncPaused,
  ]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handlePlayPause = () => {
    if (!isAdmin || !playerRef.current || !playerReadyRef.current) return;

    try {
      if (
        !playerRef.current.getCurrentTime ||
        typeof playerRef.current.getCurrentTime !== "function"
      ) {
        console.warn("Player methods not ready yet");
        return;
      }

      const currentTime = playerRef.current.getCurrentTime() || 0;
      onPlaybackControl(playbackState.isPlaying ? "pause" : "play", {
        currentTime,
      });
    } catch (error) {
      console.error("Error in play/pause:", error);
    }
  };

  const handleSeek = (value: number[]) => {
    if (!isAdmin || !playerRef.current || !playerReadyRef.current) return;

    const newTime = value[0];
    setLocalCurrentTime(newTime);

    try {
      if (
        playerRef.current.seekTo &&
        typeof playerRef.current.seekTo === "function"
      ) {
        isSeekingRef.current = true;
        playerRef.current.seekTo(newTime, true);

        // Reset seeking flag and sync correction tracking
        setTimeout(() => {
          isSeekingRef.current = false;
          lastSyncCorrectionRef.current = Date.now();
          consecutiveSyncCorrectionsRef.current = 0;
          setSyncPaused(false); // Reset sync pause on manual seek
        }, 2000);
      }
      onPlaybackControl("seek", { currentTime: newTime });
    } catch (error) {
      console.error("Error seeking:", error);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (!isAdmin) return;
    onPlaybackControl("volume", { volume: value[0] / 100 });
  };

  const getSyncIcon = () => {
    switch (syncStatus) {
      case "synced":
        return <Wifi className="w-3 h-3 text-green-500" />;
      case "syncing":
        return <Wifi className="w-3 h-3 text-yellow-500" />;
      case "out-of-sync":
        return <WifiOff className="w-3 h-3 text-red-500" />;
      case "local":
        return <Globe className="w-3 h-3 text-blue-500" />;
    }
  };

  const getSyncStatusText = () => {
    switch (syncStatus) {
      case "synced":
        return "In Sync";
      case "syncing":
        return syncPaused ? "Sync Paused" : "Syncing...";
      case "out-of-sync":
        return "Out of Sync";
      case "local":
        return "Local Mode";
    }
  };

  const currentTime = isDragging ? localCurrentTime : localCurrentTime;
  const duration = playbackState.currentSong?.duration || 0;
  const videoId = getYouTubeVideoId(playbackState.currentSong?.url || "");
  const thumbnailUrl = videoId ? getThumbnailUrl(videoId) : null;
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Now Playing
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {getSyncIcon()}
            <span>{getSyncStatusText()}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {playbackState.currentSong ? (
          <>
            <div className="text-center py-4">
              {/* Thumbnail with overlay */}
              <div className="relative w-32 h-32 mx-auto mb-4 rounded-lg overflow-hidden">
                {thumbnailUrl ? (
                  <>
                    {/* Background thumbnail image */}
                    <img
                      src={thumbnailUrl}
                      alt={`${playbackState.currentSong.title} thumbnail`}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to hqdefault if maxresdefault fails
                        const target = e.target as HTMLImageElement;
                        if (target.src.includes("maxresdefault")) {
                          target.src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                        }
                      }}
                    />
                    {/* Dark overlay */}
                    <div className="absolute inset-0 bg-black/60" />
                    {/* Song information overlay */}
                    <div className="absolute inset-0 flex flex-col justify-center items-center p-3 text-white">
                      <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mb-2">
                        <Music className="w-4 h-4 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-center leading-tight line-clamp-2">
                        {playbackState.currentSong.title}
                      </h3>
                      <p className="text-xs text-white/80 mt-1 text-center">
                        {playbackState.currentSong.artist}
                      </p>
                    </div>
                  </>
                ) : (
                  // Fallback when no thumbnail
                  <div className="w-full h-full bg-muted rounded-lg flex items-center justify-center">
                    <Music className="w-16 h-16 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Song info below thumbnail */}
              <h3 className="text-xl font-semibold mb-1">
                {playbackState.currentSong.title}
              </h3>
              <p className="text-muted-foreground">
                {playbackState.currentSong.artist}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Added by {playbackState.currentSong.addedBy}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Slider
                value={[Math.max(0, Math.min(currentTime, duration))]}
                max={duration}
                step={1}
                onValueChange={handleSeek}
                onValueCommit={() => setIsDragging(false)}
                onPointerDown={() => setIsDragging(true)}
                className="w-full bg-neutral-200"
                disabled={!isAdmin}
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{formatTime(Math.max(0, currentTime))}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Controls */}
            {isAdmin && (
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPlaybackControl("previous")}
                  disabled={playbackState.currentIndex <= 0}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  className="rounded-full w-12 h-12"
                  onClick={handlePlayPause}
                  disabled={!playerReadyRef.current}
                >
                  {playbackState.isPlaying ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPlaybackControl("next")}
                  disabled={
                    playbackState.currentIndex >=
                    playbackState.playlist.length - 1
                  }
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-2 ml-4">
                  <Volume2 className="w-4 h-4" />
                  <Slider
                    value={[playbackState.volume * 100]}
                    max={100}
                    step={1}
                    onValueChange={handleVolumeChange}
                    className="w-20"
                  />
                </div>
              </div>
            )}

            {/* Error Notice */}
            {apiError && (
              <div className="text-center text-sm text-red-500 bg-red-50 p-3 rounded-lg">
                YouTube API temporarily unavailable. Trying to skip to next
                song...
              </div>
            )}

            {/* Sync Status Notice */}
            {syncPaused && (
              <div className="text-center text-sm text-yellow-600 bg-yellow-50 p-3 rounded-lg">
                Sync temporarily paused to prevent playback interruptions. Will
                resume automatically.
              </div>
            )}

            {/* Local Mode Notice */}
            {!isConnected && (
              <div className="text-center text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                Playing in local mode - playback won't sync with other users
                until reconnected
              </div>
            )}

            {/* Hidden YouTube Player */}
            <div ref={playerContainerRef} style={{ display: "none" }} />
          </>
        ) : (
          <div className="text-center py-8">
            <div className="w-32 h-32 bg-muted rounded-lg flex items-center justify-center mx-auto mb-4">
              <Music className="w-16 h-16 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No song selected</h3>
            <p className="text-muted-foreground">
              Add songs to the playlist to start playing
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
