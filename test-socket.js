// test-socket.js - Simple test to verify WebSocket connection
const { io } = require("socket.io-client");

console.log("🧪 Testing WebSocket connection...");

const socket = io("http://localhost:3000", {
  transports: ["polling", "websocket"],
  timeout: 5000,
});

socket.on("connect", () => {
  console.log("✅ Connected to server!");
  console.log("Socket ID:", socket.id);
  
  // Test joining a room
  const testUser = {
    id: "test_user_123",
    name: "Test User",
    isAdmin: true,
  };
  
  socket.emit("join-room", { 
    roomId: "TEST_ROOM", 
    user: testUser 
  });
  
  console.log("📨 Sent join-room event");
});

socket.on("connect_error", (error) => {
  console.error("❌ Connection failed:", error.message);
  process.exit(1);
});

socket.on("room-state", (data) => {
  console.log("✅ Received room state:", {
    roomId: data.room.id,
    participants: data.participants.length,
    creator: data.room.creator
  });
  
  console.log("🎉 Test completed successfully!");
  socket.disconnect();
  process.exit(0);
});

socket.on("room-error", (error) => {
  console.error("❌ Room error:", error.message);
  socket.disconnect();
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error("⏰ Test timed out");
  socket.disconnect();
  process.exit(1);
}, 10000);