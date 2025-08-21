import { Server as SocketIOServer } from "socket.io"
import type { Server as HTTPServer } from "http"

export interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: string
  roomId: string
}

export interface RoomParticipant {
  id: string
  name: string
  isAdmin: boolean
  joinedAt: string
  isOnline: boolean
}

export interface Song {
  id: string
  title: string
  artist?: string
  duration: number
  url: string
  addedBy: string
  addedAt: string
}

export interface PlaybackState {
  currentSong: Song | null
  isPlaying: boolean
  currentTime: number
  volume: number
  playlist: Song[]
  currentIndex: number
  serverStartTime: number | null
  playbackStartTime: number | null
  lastSyncTime: number
}

export interface RoomSettings {
  allowGuestControl: boolean
  maxParticipants: number
  isPublic: boolean
  requireApproval: boolean
}

export interface RoomData {
  id: string
  name: string
  description?: string
  creator: string
  participants: Map<string, RoomParticipant>
  messages: ChatMessage[]
  playbackState: PlaybackState
  settings: RoomSettings
  createdAt: string
  syncInterval?: NodeJS.Timeout
}

class WebSocketManager {
  private io: SocketIOServer | null = null
  private rooms: Map<string, RoomData> = new Map()

  initialize(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    })

    this.io.on("connection", (socket) => {
      console.log("User connected:", socket.id)

      // Join room
      socket.on("join-room", (data: { roomId: string; user: RoomParticipant }) => {
        const { roomId, user } = data

        // Create room if it doesn't exist
        if (!this.rooms.has(roomId)) {
          this.rooms.set(roomId, {
            id: roomId,
            name: `Room ${roomId}`,
            creator: user.name,
            participants: new Map(),
            messages: [],
            playbackState: {
              currentSong: null,
              isPlaying: false,
              currentTime: 0,
              volume: 1,
              playlist: [],
              currentIndex: -1,
              serverStartTime: null,
              playbackStartTime: null,
              lastSyncTime: Date.now(),
            },
            settings: {
              allowGuestControl: false,
              maxParticipants: 50,
              isPublic: true,
              requireApproval: false,
            },
            createdAt: new Date().toISOString(),
          })
        }

        const room = this.rooms.get(roomId)!

        // Check if room is full
        if (room.participants.size >= room.settings.maxParticipants) {
          socket.emit("room-error", { message: "Room is full" })
          return
        }

        // Add user with online status
        const participantData: RoomParticipant = {
          ...user,
          joinedAt: new Date().toISOString(),
          isOnline: true,
        }
        room.participants.set(socket.id, participantData)

        socket.join(roomId)

        // Notify others about new participant
        socket.to(roomId).emit("user-joined", {
          user: user.name,
          participants: Array.from(room.participants.values()),
        })

        // Send current room state to new user with server time for sync
        socket.emit("room-state", {
          room: {
            id: room.id,
            name: room.name,
            description: room.description,
            creator: room.creator,
            settings: room.settings,
          },
          participants: Array.from(room.participants.values()),
          messages: room.messages,
          playbackState: room.playbackState,
          serverTime: Date.now(),
        })

        console.log(`User ${user.name} joined room ${roomId}`)
      })

      socket.on("request-sync", (data: { roomId: string }) => {
        const room = this.rooms.get(data.roomId)
        if (room) {
          const currentServerTime = Date.now()
          let calculatedTime = room.playbackState.currentTime

          if (
            room.playbackState.isPlaying &&
            room.playbackState.serverStartTime &&
            room.playbackState.playbackStartTime !== null
          ) {
            const elapsedTime = (currentServerTime - room.playbackState.serverStartTime) / 1000
            calculatedTime = room.playbackState.playbackStartTime + elapsedTime
          }

          socket.emit("sync-update", {
            playbackState: {
              ...room.playbackState,
              currentTime: calculatedTime,
            },
            serverTime: currentServerTime,
          })
        }
      })

      // Handle chat messages
      socket.on("send-message", (data: { roomId: string; message: string; user: string }) => {
        const { roomId, message, user } = data
        const room = this.rooms.get(roomId)

        if (room) {
          const chatMessage: ChatMessage = {
            id: Date.now().toString(),
            user,
            message,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            roomId,
          }

          room.messages.push(chatMessage)
          this.io!.to(roomId).emit("new-message", chatMessage)
          console.log(`Message from ${user} in room ${roomId}: ${message}`)
        }
      })

      // Handle adding songs to playlist
      socket.on("add-song", (data: { roomId: string; song: Omit<Song, "id" | "addedAt"> }) => {
        const { roomId, song } = data
        const room = this.rooms.get(roomId)

        if (room) {
          const newSong: Song = {
            ...song,
            id: Date.now().toString(),
            addedAt: new Date().toISOString(),
          }

          room.playbackState.playlist.push(newSong)

          if (!room.playbackState.currentSong && room.playbackState.playlist.length === 1) {
            room.playbackState.currentSong = newSong
            room.playbackState.currentIndex = 0
          }

          this.io!.to(roomId).emit("playlist-updated", room.playbackState)
          console.log(`Song "${newSong.title}" added to room ${roomId}`)
        }
      })

      // Handle playback controls
      socket.on("playback-control", (data: { roomId: string; action: string; payload?: any; userId: string }) => {
        const { roomId, action, payload, userId } = data
        const room = this.rooms.get(roomId)

        if (room) {
          const user = room.participants.get(socket.id)

          // Check permissions
          if (!user?.isAdmin && !room.settings.allowGuestControl) {
            socket.emit("permission-denied", { message: "Only admins can control playback" })
            return
          }

          const currentServerTime = Date.now()

          switch (action) {
            case "play":
              room.playbackState.isPlaying = true
              room.playbackState.serverStartTime = currentServerTime
              room.playbackState.playbackStartTime = payload?.currentTime || room.playbackState.currentTime
              room.playbackState.lastSyncTime = currentServerTime
              break
            case "pause":
              room.playbackState.isPlaying = false
              if (room.playbackState.serverStartTime && room.playbackState.playbackStartTime !== null) {
                const elapsedTime = (currentServerTime - room.playbackState.serverStartTime) / 1000
                room.playbackState.currentTime = room.playbackState.playbackStartTime + elapsedTime
              }
              room.playbackState.serverStartTime = null
              room.playbackState.playbackStartTime = null
              room.playbackState.lastSyncTime = currentServerTime
              break
            case "seek":
              room.playbackState.currentTime = payload.currentTime
              if (room.playbackState.isPlaying) {
                room.playbackState.serverStartTime = currentServerTime
                room.playbackState.playbackStartTime = payload.currentTime
              }
              room.playbackState.lastSyncTime = currentServerTime
              break
            case "next":
              if (room.playbackState.currentIndex < room.playbackState.playlist.length - 1) {
                room.playbackState.currentIndex++
                room.playbackState.currentSong = room.playbackState.playlist[room.playbackState.currentIndex]
                room.playbackState.currentTime = 0
                if (room.playbackState.isPlaying) {
                  room.playbackState.serverStartTime = currentServerTime
                  room.playbackState.playbackStartTime = 0
                }
                room.playbackState.lastSyncTime = currentServerTime
              }
              break
            case "previous":
              if (room.playbackState.currentIndex > 0) {
                room.playbackState.currentIndex--
                room.playbackState.currentSong = room.playbackState.playlist[room.playbackState.currentIndex]
                room.playbackState.currentTime = 0
                if (room.playbackState.isPlaying) {
                  room.playbackState.serverStartTime = currentServerTime
                  room.playbackState.playbackStartTime = 0
                }
                room.playbackState.lastSyncTime = currentServerTime
              }
              break
            case "volume":
              room.playbackState.volume = payload.volume
              room.playbackState.lastSyncTime = currentServerTime
              break
          }

          this.io!.to(roomId).emit("playback-state-changed", {
            playbackState: room.playbackState,
            serverTime: currentServerTime,
          })

          if (action === "play" && !room.syncInterval) {
            room.syncInterval = setInterval(() => {
              this.broadcastSync(roomId)
            }, 5000)
          } else if (action === "pause" && room.syncInterval) {
            clearInterval(room.syncInterval)
            room.syncInterval = undefined
          }
        }
      })

      // Handle user management actions
      socket.on("user-action", (data: { roomId: string; action: string; targetUserId?: string; payload?: any }) => {
        const { roomId, action, targetUserId, payload } = data
        const room = this.rooms.get(roomId)

        if (room) {
          const adminUser = room.participants.get(socket.id)

          if (!adminUser?.isAdmin) {
            socket.emit("permission-denied", { message: "Only admins can perform this action" })
            return
          }

          switch (action) {
            case "kick-user":
              if (targetUserId) {
                const targetSocket = Array.from(room.participants.entries()).find(
                  ([_, participant]) => participant.id === targetUserId,
                )?.[0]

                if (targetSocket) {
                  const targetUser = room.participants.get(targetSocket)!
                  room.participants.delete(targetSocket)

                  this.io!.to(targetSocket).emit("kicked-from-room", {
                    message: `You were removed from the room by ${adminUser.name}`,
                  })
                  this.io!.to(targetSocket).socketsLeave(roomId)

                  this.io!.to(roomId).emit("user-left", {
                    user: targetUser.name,
                    participants: Array.from(room.participants.values()),
                  })
                }
              }
              break
            case "transfer-admin":
              if (targetUserId) {
                const targetSocket = Array.from(room.participants.entries()).find(
                  ([_, participant]) => participant.id === targetUserId,
                )?.[0]

                if (targetSocket) {
                  // Remove admin from current user
                  adminUser.isAdmin = false
                  // Add admin to target user
                  const targetUser = room.participants.get(targetSocket)!
                  targetUser.isAdmin = true
                  room.creator = targetUser.name

                  this.io!.to(roomId).emit("admin-transferred", {
                    newAdmin: targetUser.name,
                    participants: Array.from(room.participants.values()),
                  })
                }
              }
              break
            case "update-settings":
              if (payload) {
                room.settings = { ...room.settings, ...payload }
                this.io!.to(roomId).emit("room-settings-updated", room.settings)
              }
              break
          }
        }
      })

      // Handle room closure
      socket.on("close-room", (data: { roomId: string }) => {
        const { roomId } = data
        const room = this.rooms.get(roomId)

        if (room) {
          const user = room.participants.get(socket.id)

          if (!user?.isAdmin) {
            socket.emit("permission-denied", { message: "Only admins can close the room" })
            return
          }

          // Notify all participants
          this.io!.to(roomId).emit("room-closed", {
            message: `Room closed by ${user.name}`,
          })

          // Clean up
          if (room.syncInterval) {
            clearInterval(room.syncInterval)
          }
          this.rooms.delete(roomId)
          console.log(`Room ${roomId} closed by ${user.name}`)
        }
      })

      // Handle user disconnect
      socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id)

        for (const [roomId, room] of this.rooms.entries()) {
          if (room.participants.has(socket.id)) {
            const user = room.participants.get(socket.id)!
            room.participants.delete(socket.id)

            socket.to(roomId).emit("user-left", {
              user: user.name,
              participants: Array.from(room.participants.values()),
            })

            if (room.participants.size === 0) {
              if (room.syncInterval) {
                clearInterval(room.syncInterval)
              }
              this.rooms.delete(roomId)
              console.log(`Room ${roomId} deleted (empty)`)
            }

            console.log(`User ${user.name} left room ${roomId}`)
          }
        }
      })
    })
  }

  private broadcastSync(roomId: string) {
    const room = this.rooms.get(roomId)
    if (!room || !room.playbackState.isPlaying) return

    const currentServerTime = Date.now()
    let calculatedTime = room.playbackState.currentTime

    if (room.playbackState.serverStartTime && room.playbackState.playbackStartTime !== null) {
      const elapsedTime = (currentServerTime - room.playbackState.serverStartTime) / 1000
      calculatedTime = room.playbackState.playbackStartTime + elapsedTime
    }

    this.io!.to(roomId).emit("sync-update", {
      playbackState: {
        ...room.playbackState,
        currentTime: calculatedTime,
      },
      serverTime: currentServerTime,
    })
  }

  getIO() {
    return this.io
  }
}

export const wsManager = new WebSocketManager()
