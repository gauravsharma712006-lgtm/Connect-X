const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// IMPORTANT: Allow ngrok connections
const io = new Server(server, {
  cors: {
    origin: "*",  // Allow all origins for ngrok
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling']  // Support both transports
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

let waitingUser = null;
const rooms = new Map();

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);

  if (waitingUser && waitingUser.connected) {
    const roomId = `room-${Date.now()}`;
    socket.join(roomId);
    waitingUser.join(roomId);

    rooms.set(socket.id, { roomId, partner: waitingUser.id });
    rooms.set(waitingUser.id, { roomId, partner: socket.id });

    socket.emit("matched", { isCaller: true });
    waitingUser.emit("matched", { isCaller: false });
    
    console.log(`🔗 Matched in ${roomId}`);
    waitingUser = null;
  } else {
    waitingUser = socket;
    socket.emit("waiting");
  }

  socket.on("offer", (data) => {
    const room = rooms.get(socket.id);
    if (room) socket.to(room.roomId).emit("offer", data);
  });

  socket.on("answer", (data) => {
    const room = rooms.get(socket.id);
    if (room) socket.to(room.roomId).emit("answer", data);
  });

  socket.on("ice", (data) => {
    const room = rooms.get(socket.id);
    if (room) socket.to(room.roomId).emit("ice", data);
  });

  socket.on("disconnect", () => {
    console.log("❌ Disconnected:", socket.id);
    if (waitingUser === socket) waitingUser = null;
    
    const room = rooms.get(socket.id);
    if (room) {
      socket.to(room.roomId).emit("partner-left");
      rooms.delete(socket.id);
      rooms.delete(room.partner);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server on http://localhost:${PORT}`);
});
