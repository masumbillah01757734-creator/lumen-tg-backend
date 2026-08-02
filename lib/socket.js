import { io } from "socket.io-client";

let socket = null;

export function getSocket() {
  if (socket) return socket;

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
    auth: { token },
    autoConnect: true,
    transports: ["websocket", "polling"],
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
