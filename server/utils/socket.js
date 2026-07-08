const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");

let io;

const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [process.env.CLIENT_URL, "http://localhost:3000"].filter(Boolean),
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected to socket: ${socket.user.id}`);

    // Join personal room for notifications
    socket.join(socket.user.id);

    // Join specific conversation room
    socket.on("join_conversation", (conversationId) => {
      socket.join(conversationId);
    });

    // Handle new message
    socket.on("send_message", async (data) => {
      try {
        const { conversationId, text } = data;
        
        const message = await Message.create({
          conversationId,
          sender: socket.user.id,
          text,
        });

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessageAt: new Date(),
        });

        // Broadcast to everyone in the conversation
        io.to(conversationId).emit("new_message", message);
        
        // Also notify admins if this is a new message from a user
        if (socket.user.role === "user") {
          io.to("admins").emit("admin_notification", { type: "new_message", message });
        }
      } catch (err) {
        console.error("Socket send_message error:", err);
      }
    });

    // If user is admin, join admins room
    if (socket.user.role === "admin") {
      socket.join("admins");
    }

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.id}`);
    });
  });

  return io;
};

const getIo = () => {
  if (!io) throw new Error("Socket.io not initialized!");
  return io;
};

module.exports = { initSocket, getIo };
