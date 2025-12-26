import { io } from "socket.io-client";

export const socket = io(
  import.meta.env.VITE_SOCKET_URL || "http://127.0.0.1:3001",
  {
    transports: ["websocket"],
    autoConnect: true,
  }
);

socket.on("connect", () => {
  console.log("🟢 Connected to realtime server:", socket.id);
  socket.emit("join", "admin"); // channel admin
});

socket.on("disconnect", () => {
  console.log("🔴 Realtime disconnected");
});
