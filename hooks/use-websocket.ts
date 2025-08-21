"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import type {
  ChatMessage,
  RoomParticipant,
  PlaybackState,
  Song,
} from "@/lib/websocket-server";

interface UseWebSocketProps {
  roomId: string;
  user: RoomParticipant;
}

interface RoomSettings {
  allowGuestControl: boolean;
  maxParticipants: number;
  isPublic: boolean;
  requireApproval: boolean;
}

interface RoomState {
  room: {
    id: string;
    name: string;
    description?: string;
    creator: string;
    settings: RoomSettings;
  };
  participants: RoomParticipant[];
  messages: ChatMessage[];
  playbackState: PlaybackState;
  serverTime?: number;
}

export function useWebSocket({ roomId, user }: UseWebSocketProps) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<RoomParticipant[]>([]);
  const [roomInfo, setRoomInfo] = useState<RoomState["room"] | null>(null);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    volume: 1,
    playlist: [],
    currentIndex: -1,
    serverStartTime: null,
    playbackStartTime: null,
    lastSyncTime: Date.now(),
  });

  const [serverTimeOffset, setServerTimeOffset] = useState(0);
  const syncRequestRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const isConnectingRef = useRef(false); // Add this to prevent multiple connections

  useEffect(() => {
    if (!user.name || !roomId) {
      console.log("❌ Missing user name or roomId:", {
        user: user.name,
        roomId,
      });
      return;
    }

    // Prevent multiple connections
    if (isConnectingRef.current || socketRef.current?.connected) {
      console.log(" Connection already in progress or established");
      return;
    }

    console.log("🔄 Initializing WebSocket connection...", {
      user: user.name,
      roomId,
    });
    isConnectingRef.current = true;

    // Clear any existing reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    // Use environment variable or fallback to current origin
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ||
      (typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000");

    console.log("🔌 Connecting to:", socketUrl);

    // Initialize socket connection with better error handling
    socketRef.current = io(socketUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      forceNew: true,
      upgrade: true,
      rememberUpgrade: false,
    });

    const socket = socketRef.current;

    // Connection event handlers
    socket.on("connect", () => {
      console.log("✅ Connected to WebSocket server, socket ID:", socket.id);
      setIsConnected(true);
      isConnectingRef.current = false; // Reset connection flag

      // Clear any reconnect timeout on successful connection
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }

      // Create a unique user object with consistent ID
      const userWithId = {
        ...user,
        id:
          user.id ||
          `user_${user.name}_${Date.now()}_${Math.random()
            .toString(36)
            .substr(2, 9)}`,
      };

      console.log("🏠 Joining room with user:", userWithId, "Room:", roomId);
      // Join the room
      socket.emit("join-room", { roomId, user: userWithId });
    });

    socket.on("disconnect", (reason) => {
      console.log("❌ Disconnected from WebSocket server:", reason);
      setIsConnected(false);
      isConnectingRef.current = false; // Reset connection flag
    });

    socket.on("connect_error", (error) => {
      console.error("💥 Connection error:", error.message);
      setIsConnected(false);
      isConnectingRef.current = false; // Reset connection flag

      // Set a timeout to stop trying after a while
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("⏰ Stopping reconnection attempts");
          socket.disconnect();
        }, 30000); // Stop trying after 30 seconds
      }
    });

    socket.on("reconnect", (attemptNumber) => {
      console.log("🔄 Reconnected after", attemptNumber, "attempts");
      setIsConnected(true);
      isConnectingRef.current = false; // Reset connection flag

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = undefined;
      }
    });

    socket.on("reconnect_error", (error) => {
      console.error("🔄❌ Reconnection error:", error.message);
    });

    socket.on("reconnect_failed", () => {
      console.error("🚫 Reconnection failed - giving up");
      setIsConnected(false);
      isConnectingRef.current = false; // Reset connection flag
    });

    // Handle room state updates
    socket.on("room-state", (state: RoomState) => {
      console.log("📦 Received room state:", state);
      setRoomInfo(state.room);
      setParticipants(state.participants);
      setMessages(state.messages);
      setPlaybackState(state.playbackState);

      if (state.serverTime) {
        const clientTime = Date.now();
        setServerTimeOffset(state.serverTime - clientTime);
      }
    });

    // Handle new messages
    socket.on("new-message", (message: ChatMessage) => {
      console.log("💬 New message:", message);
      setMessages((prev) => [...prev, message]);
    });

    // Handle user joined
    socket.on(
      "user-joined",
      (data: { user: string; participants: RoomParticipant[] }) => {
        console.log("👤 User joined:", data);
        setParticipants(data.participants);
        const systemMessage: ChatMessage = {
          id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
          user: "System",
          message: `${data.user} joined the room`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          roomId,
        };
        setMessages((prev) => [...prev, systemMessage]);
      }
    );

    // Handle user left
    socket.on(
      "user-left",
      (data: { user: string; participants: RoomParticipant[] }) => {
        console.log("👤 User left:", data);
        setParticipants(data.participants);
        const systemMessage: ChatMessage = {
          id: `system_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Unique ID
          user: "System",
          message: `${data.user} left the room`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          roomId,
        };
        setMessages((prev) => [...prev, systemMessage]);
      }
    );

    // Handle playlist updates
    socket.on("playlist-updated", (newPlaybackState: PlaybackState) => {
      console.log("🎵 Playlist updated:", newPlaybackState);
      setPlaybackState(newPlaybackState);
    });

    // Handle playback state changes
    socket.on(
      "playback-state-changed",
      (data: { playbackState: PlaybackState; serverTime: number }) => {
        console.log("🎮 Playback state changed:", data);
        setPlaybackState(data.playbackState);
        const clientTime = Date.now();
        setServerTimeOffset(data.serverTime - clientTime);
      }
    );

    socket.on(
      "sync-update",
      (data: { playbackState: PlaybackState; serverTime: number }) => {
        setPlaybackState(data.playbackState);
        const clientTime = Date.now();
        setServerTimeOffset(data.serverTime - clientTime);
      }
    );

    // Handle admin events
    socket.on(
      "admin-transferred",
      (data: { newAdmin: string; participants: RoomParticipant[] }) => {
        console.log("👑 Admin transferred:", data);
        setParticipants(data.participants);
        const systemMessage: ChatMessage = {
          id: Date.now().toString(),
          user: "System",
          message: `${data.newAdmin} is now the room admin`,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          roomId,
        };
        setMessages((prev) => [...prev, systemMessage]);
      }
    );

    // Handle room settings updates
    socket.on("room-settings-updated", (settings: RoomSettings) => {
      setRoomInfo((prev) => (prev ? { ...prev, settings } : null));
    });

    // Handle being kicked
    socket.on("kicked-from-room", (data: { message: string }) => {
      alert(data.message);
      window.location.href = "/";
    });

    // Handle room closure
    socket.on("room-closed", (data: { message: string }) => {
      alert(data.message);
      window.location.href = "/";
    });

    // Handle permission denied
    socket.on("permission-denied", (data: { message: string }) => {
      alert(data.message);
    });

    // Handle room errors
    socket.on("room-error", (data: { message: string }) => {
      console.error("🚫 Room error:", data.message);
      alert(data.message);
      window.location.href = "/";
    });

    return () => {
      console.log("🧹 Cleaning up WebSocket connection");
      isConnectingRef.current = false; // Reset connection flag
      if (syncRequestRef.current) {
        clearTimeout(syncRequestRef.current);
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.removeAllListeners(); // Remove all listeners
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [roomId, user.name, user.id]); // Only depend on primitive values, not objects

  useEffect(() => {
    if (!isConnected || !playbackState.isPlaying) return;

    const requestSync = () => {
      if (socketRef.current && isConnected) {
        socketRef.current.emit("request-sync", { roomId });
      }
    };

    syncRequestRef.current = setInterval(requestSync, 10000);

    return () => {
      if (syncRequestRef.current) {
        clearInterval(syncRequestRef.current);
      }
    };
  }, [isConnected, playbackState.isPlaying, roomId]);

  const sendMessage = (message: string) => {
    if (socketRef.current && isConnected && message.trim()) {
      socketRef.current.emit("send-message", {
        roomId,
        message: message.trim(),
        user: user.name,
      });
    }
  };

  const addSong = (song: Omit<Song, "id" | "addedAt">) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("add-song", { roomId, song });
    }
  };

  const controlPlayback = (action: string, payload?: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("playback-control", {
        roomId,
        action,
        payload,
        userId: user.id,
      });
    }
  };

  const kickUser = (userId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("user-action", {
        roomId,
        action: "kick-user",
        targetUserId: userId,
      });
    }
  };

  const transferAdmin = (userId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("user-action", {
        roomId,
        action: "transfer-admin",
        targetUserId: userId,
      });
    }
  };

  const updateRoomSettings = (settings: Partial<RoomSettings>) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("user-action", {
        roomId,
        action: "update-settings",
        payload: settings,
      });
    }
  };

  const closeRoom = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit("close-room", { roomId });
    }
  };

  const getSyncedCurrentTime = (): number => {
    if (
      !playbackState.isPlaying ||
      !playbackState.serverStartTime ||
      playbackState.playbackStartTime === null
    ) {
      return playbackState.currentTime;
    }

    const currentClientTime = Date.now();
    const estimatedServerTime = currentClientTime + serverTimeOffset;
    const elapsedTime =
      (estimatedServerTime - playbackState.serverStartTime) / 1000;
    return playbackState.playbackStartTime + elapsedTime;
  };

  return {
    isConnected,
    messages,
    participants,
    roomInfo,
    playbackState,
    serverTimeOffset,
    sendMessage,
    addSong,
    controlPlayback,
    kickUser,
    transferAdmin,
    updateRoomSettings,
    closeRoom,
    getSyncedCurrentTime,
  };
}
