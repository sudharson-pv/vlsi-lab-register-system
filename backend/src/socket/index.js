import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

let io = null;
const allowedOrigins = new Set(env.clientUrls);

const corsOrigin = (origin, callback) => {
  if (env.nodeEnv === "development") {
    callback(null, true);
    return;
  }

  if (!origin || allowedOrigins.has(origin)) {
    callback(null, true);
    return;
  }

  callback(new Error("Not allowed by CORS"));
};

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;

    if (!token) {
      return next();
    }

    try {
      socket.user = jwt.verify(token, env.jwtSecret);
      return next();
    } catch (error) {
      return next();
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.join("public");

    if (socket.user?.role) {
      socket.join(socket.user.role);
    }

    socket.on("chat_message", (value) => {
      const text = String(
        typeof value === "string" ? value : value?.text || "",
      ).trim();

      if (!text) {
        return;
      }

      const message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: text.slice(0, 500),
        sender: socket.user?.student_name || socket.user?.register_number || "Guest",
        register_number: socket.user?.register_number || null,
        role: socket.user?.role || "guest",
        timestamp: new Date().toISOString(),
      };

      console.log("Message:", message.text);
      io.emit("chat_message", message);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  return io;
};

export const getIo = () => io;
