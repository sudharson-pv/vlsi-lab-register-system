import { io } from "socket.io-client";

let socketInstance = null;
let activeToken = null;

const resolveSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }

  if (import.meta.env.VITE_API_URL) {
    try {
      return new URL(import.meta.env.VITE_API_URL).origin;
    } catch (_error) {
      // Fall through to hostname-based fallback.
    }
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000`;
  }

  return "http://localhost:4000";
};

export const connectSocket = (token) => {
  const normalizedToken = token || null;

  if (socketInstance) {
    if (activeToken === normalizedToken) {
      return socketInstance;
    }

    socketInstance.disconnect();
  }

  activeToken = normalizedToken;

  socketInstance = io(resolveSocketUrl(), {
    auth: normalizedToken ? { token: normalizedToken } : {},
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });

  return socketInstance;
};

export const getSocket = () => socketInstance;

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }

  activeToken = null;
};
