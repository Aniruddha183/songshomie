const { createServer } = require("http");
const { Server } = require("socket.io");
const { parse } = require("url");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Store rooms and their data
const rooms = new Map();

app.prepare().then(() => {
  // Create HTTP server
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("Internal server error");
    }
  });

  // Initialize Socket.IO with CORS enabled
  const io = new Server(httpServer, {
    cors: {
      origin:
        process.env.NODE_ENV === "production"
          ? [
              process.env.FRONTEND_URL || "https://your-app.railway.app",
              "https://your-app.railway.app",
              "https://your-custom-domain.com", // if you have one
            ]
          : ["http://localhost:3000", "http://127.0.0.1:3000"],
      methods: ["GET", "POST"],
      credentials: false,
    },
    allowEIO3: true,
    transports: ["websocket", "polling"],
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // Join room
    socket.on("join-room", (data) => {
      const { roomId, user } = data;
      console.log(
        `👤 User ${user.name} (${user.id}) trying to join room ${roomId}`
      );

      // Validate input
      if (!roomId || !user || !user.name) {
        console.log("❌ Invalid room join data");
        socket.emit("room-error", { message: "Invalid room data" });
        return;
      }

      // Create room if it doesn't exist
      if (!rooms.has(roomId)) {
        const newRoom = {
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
        };

        rooms.set(roomId, newRoom);
        console.log(`🏠 Created new room ${roomId} by ${user.name}`);
      }

      const room = rooms.get(roomId);

      // Check if room is full
      if (room.participants.size >= room.settings.maxParticipants) {
        console.log(`⚠️ Room ${roomId} is full`);
        socket.emit("room-error", { message: "Room is full" });
        return;
      }

      // Check if user is already in room (reconnection case)
      let existingSocketId = null;
      for (const [sockId, participant] of room.participants.entries()) {
        if (participant.id === user.id) {
          existingSocketId = sockId;
          break;
        }
      }

      // Remove old connection if exists
      if (existingSocketId && existingSocketId !== socket.id) {
        room.participants.delete(existingSocketId);
        console.log(`🔄 Removed old connection for user ${user.name}`);
      }

      // Add user to room
      const participantData = {
        id: user.id,
        name: user.name,
        isAdmin: room.participants.size === 0 ? true : user.isAdmin || false, // First user becomes admin
        joinedAt: new Date().toISOString(),
        isOnline: true,
      };

      // Update room creator if first user
      if (room.participants.size === 0) {
        room.creator = user.name;
      }

      room.participants.set(socket.id, participantData);
      socket.join(roomId);

      // Notify others about new participant (only if there are others)
      const participantsList = Array.from(room.participants.values());
      if (room.participants.size > 1) {
        socket.to(roomId).emit("user-joined", {
          user: user.name,
          participants: participantsList,
        });
        console.log(
          `📢 Notified ${room.participants.size - 1} users about ${
            user.name
          } joining`
        );
      }

      // Send current room state to new user
      socket.emit("room-state", {
        room: {
          id: room.id,
          name: room.name,
          description: room.description,
          creator: room.creator,
          settings: room.settings,
        },
        participants: participantsList,
        messages: room.messages,
        playbackState: room.playbackState,
        serverTime: Date.now(),
      });

      console.log(
        `✅ User ${user.name} joined room ${roomId} (${room.participants.size} total)`
      );
      console.log(
        `👥 Current participants: ${participantsList
          .map((p) => p.name)
          .join(", ")}`
      );
    });

    // Handle sync requests
    socket.on("request-sync", (data) => {
      const room = rooms.get(data.roomId);
      if (room) {
        const currentServerTime = Date.now();
        let calculatedTime = room.playbackState.currentTime;

        if (
          room.playbackState.isPlaying &&
          room.playbackState.serverStartTime &&
          room.playbackState.playbackStartTime !== null
        ) {
          const elapsedTime =
            (currentServerTime - room.playbackState.serverStartTime) / 1000;
          calculatedTime = room.playbackState.playbackStartTime + elapsedTime;
        }

        socket.emit("sync-update", {
          playbackState: {
            ...room.playbackState,
            currentTime: calculatedTime,
          },
          serverTime: currentServerTime,
        });
      }
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);

      // Find and remove user from all rooms
      for (const [roomId, room] of rooms.entries()) {
        if (room.participants.has(socket.id)) {
          const user = room.participants.get(socket.id);
          room.participants.delete(socket.id);

          // Notify others
          socket.to(roomId).emit("user-left", {
            user: user.name,
            participants: Array.from(room.participants.values()),
          });

          console.log(`👋 User ${user.name} left room ${roomId}`);

          // If room is empty, delete it
          if (room.participants.size === 0) {
            rooms.delete(roomId);
            console.log(`🗑️ Room ${roomId} deleted (empty)`);
          }
          break;
        }
      }
    });

    // Handle chat messages
    socket.on("send-message", (data) => {
      const { roomId, message, user } = data;
      const room = rooms.get(roomId);

      if (room && room.participants.has(socket.id)) {
        const chatMessage = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Make ID unique
          user,
          message,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          roomId,
        };

        room.messages.push(chatMessage);
        io.to(roomId).emit("new-message", chatMessage);
        console.log(`💬 Message from ${user} in room ${roomId}: ${message}`);
      }
    });

    // Handle adding songs
    socket.on("add-song", (data) => {
      const { roomId, song } = data;
      const room = rooms.get(roomId);

      if (room && room.participants.has(socket.id)) {
        const newSong = {
          id: Date.now().toString(),
          ...song,
          addedAt: new Date().toISOString(),
        };

        room.playbackState.playlist.push(newSong);

        // If no current song, set the first one
        if (
          !room.playbackState.currentSong &&
          room.playbackState.playlist.length === 1
        ) {
          room.playbackState.currentSong = newSong;
          room.playbackState.currentIndex = 0;
        }

        io.to(roomId).emit("playlist-updated", room.playbackState);
        console.log(`🎵 Song added to room ${roomId}: ${newSong.title}`);
      }
    });

    // Handle playback controls
    socket.on("playback-control", (data) => {
      const { roomId, action, payload, userId } = data;
      const room = rooms.get(roomId);

      if (room && room.participants.has(socket.id)) {
        const user = room.participants.get(socket.id);

        // Check permissions
        if (!user.isAdmin && !room.settings.allowGuestControl) {
          socket.emit("permission-denied", {
            message: "Only admins can control playback",
          });
          return;
        }

        const currentServerTime = Date.now();

        switch (action) {
          case "play":
            room.playbackState.isPlaying = true;
            room.playbackState.serverStartTime = currentServerTime;
            room.playbackState.playbackStartTime =
              payload?.currentTime || room.playbackState.currentTime;
            room.playbackState.lastSyncTime = currentServerTime;
            break;
          case "pause":
            room.playbackState.isPlaying = false;
            if (
              room.playbackState.serverStartTime &&
              room.playbackState.playbackStartTime !== null
            ) {
              const elapsedTime =
                (currentServerTime - room.playbackState.serverStartTime) / 1000;
              room.playbackState.currentTime =
                room.playbackState.playbackStartTime + elapsedTime;
            }
            room.playbackState.serverStartTime = null;
            room.playbackState.playbackStartTime = null;
            room.playbackState.lastSyncTime = currentServerTime;
            break;
          case "seek":
            room.playbackState.currentTime = payload.currentTime;
            if (room.playbackState.isPlaying) {
              room.playbackState.serverStartTime = currentServerTime;
              room.playbackState.playbackStartTime = payload.currentTime;
            }
            room.playbackState.lastSyncTime = currentServerTime;
            break;
          case "next":
            if (
              room.playbackState.currentIndex <
              room.playbackState.playlist.length - 1
            ) {
              room.playbackState.currentIndex++;
              room.playbackState.currentSong =
                room.playbackState.playlist[room.playbackState.currentIndex];
              room.playbackState.currentTime = 0;
              if (room.playbackState.isPlaying) {
                room.playbackState.serverStartTime = currentServerTime;
                room.playbackState.playbackStartTime = 0;
              }
              room.playbackState.lastSyncTime = currentServerTime;
            }
            break;
          case "previous":
            if (room.playbackState.currentIndex > 0) {
              room.playbackState.currentIndex--;
              room.playbackState.currentSong =
                room.playbackState.playlist[room.playbackState.currentIndex];
              room.playbackState.currentTime = 0;
              if (room.playbackState.isPlaying) {
                room.playbackState.serverStartTime = currentServerTime;
                room.playbackState.playbackStartTime = 0;
              }
              room.playbackState.lastSyncTime = currentServerTime;
            }
            break;
          case "volume":
            room.playbackState.volume = payload.volume;
            room.playbackState.lastSyncTime = currentServerTime;
            break;
        }

        io.to(roomId).emit("playback-state-changed", {
          playbackState: room.playbackState,
          serverTime: currentServerTime,
        });

        console.log(
          `🎮 Playback control in room ${roomId}: ${action} by ${user.name}`
        );
      }
    });

    // Handle user management actions
    socket.on("user-action", (data) => {
      const { roomId, action, targetUserId, payload } = data;
      const room = rooms.get(roomId);

      if (room && room.participants.has(socket.id)) {
        const adminUser = room.participants.get(socket.id);

        if (!adminUser.isAdmin) {
          socket.emit("permission-denied", {
            message: "Only admins can perform this action",
          });
          return;
        }

        switch (action) {
          case "kick-user":
            if (targetUserId) {
              const targetSocket = Array.from(room.participants.entries()).find(
                ([_, participant]) => participant.id === targetUserId
              )?.[0];

              if (targetSocket) {
                const targetUser = room.participants.get(targetSocket);
                room.participants.delete(targetSocket);

                io.to(targetSocket).emit("kicked-from-room", {
                  message: `You were removed from the room by ${adminUser.name}`,
                });
                io.to(targetSocket).socketsLeave(roomId);

                io.to(roomId).emit("user-left", {
                  user: targetUser.name,
                  participants: Array.from(room.participants.values()),
                });

                console.log(
                  `🚫 User ${targetUser.name} kicked from room ${roomId} by ${adminUser.name}`
                );
              }
            }
            break;
          case "transfer-admin":
            if (targetUserId) {
              const targetSocket = Array.from(room.participants.entries()).find(
                ([_, participant]) => participant.id === targetUserId
              )?.[0];

              if (targetSocket) {
                adminUser.isAdmin = false;
                const targetUser = room.participants.get(targetSocket);
                targetUser.isAdmin = true;
                room.creator = targetUser.name;

                io.to(roomId).emit("admin-transferred", {
                  newAdmin: targetUser.name,
                  participants: Array.from(room.participants.values()),
                });

                console.log(
                  `👑 Admin transferred from ${adminUser.name} to ${targetUser.name} in room ${roomId}`
                );
              }
            }
            break;
          case "update-settings":
            if (payload) {
              room.settings = { ...room.settings, ...payload };
              io.to(roomId).emit("room-settings-updated", room.settings);
              console.log(
                `⚙️ Room settings updated in ${roomId} by ${adminUser.name}`
              );
            }
            break;
        }
      }
    });

    // Handle room closure
    socket.on("close-room", (data) => {
      const { roomId } = data;
      const room = rooms.get(roomId);

      if (room && room.participants.has(socket.id)) {
        const user = room.participants.get(socket.id);

        if (!user.isAdmin) {
          socket.emit("permission-denied", {
            message: "Only admins can close the room",
          });
          return;
        }

        io.to(roomId).emit("room-closed", {
          message: `Room closed by ${user.name}`,
        });

        rooms.delete(roomId);
        console.log(`🚪 Room ${roomId} closed by ${user.name}`);
      }
    });
  });

  // Start server on port 3000 (both Next.js and WebSocket)
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`🚀 Server ready on port ${PORT}`);
    console.log(`🔌 WebSocket server ready on port ${PORT}`);
    console.log(`📁 Rooms in memory: ${rooms.size}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  });
});
