import { useEffect, useRef, useState } from "react";
import { connectSocket } from "../services/socket";
import { useAuth } from "../context/AuthContext";

const MAX_MESSAGES = 100;

const formatTime = (value) =>
  new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const normalizeMessage = (value) => {
  if (typeof value === "string") {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      text: value,
      sender: "Unknown",
      timestamp: new Date().toISOString(),
    };
  }

  return {
    id: value?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: value?.text || "",
    sender: value?.sender || value?.register_number || "Unknown",
    timestamp: value?.timestamp || new Date().toISOString(),
  };
};

const ChatBox = ({ title = "Lab Chat" }) => {
  const { token, user } = useAuth();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!token) {
      return undefined;
    }

    const socket = connectSocket(token);
    const handleMessage = (incoming) => {
      const normalized = normalizeMessage(incoming);

      if (!normalized.text.trim()) {
        return;
      }

      setMessages((current) => [...current, normalized].slice(-MAX_MESSAGES));
    };

    socket.on("chat_message", handleMessage);

    return () => {
      socket.off("chat_message", handleMessage);
    };
  }, [token]);

  useEffect(() => {
    const container = containerRef.current;

    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  const sendMessage = () => {
    const text = message.trim();

    if (!text || !token) {
      return;
    }

    const socket = connectSocket(token);
    socket.emit("chat_message", text);
    setMessage("");
  };

  return (
    <div className="panel-surface animate-rise p-6">
      <h3 className="font-display text-2xl font-semibold text-white">{title}</h3>
      <p className="mt-1 text-sm text-slate-300">
        Live messages for all signed-in users.
      </p>

      <div
        ref={containerRef}
        className="mt-4 max-h-64 space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-black/20 p-3"
      >
        {messages.length ? (
          messages.map((entry) => (
            <div
              key={entry.id}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2"
            >
              <p className="text-sm text-white">{entry.text}</p>
              <p className="mt-1 text-xs text-slate-400">
                {entry.sender} - {formatTime(entry.timestamp)}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">No messages yet.</p>
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="input-base"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              sendMessage();
            }
          }}
          placeholder={`Message as ${user?.student_name || "you"}`}
          maxLength={500}
        />
        <button type="button" className="btn-primary" onClick={sendMessage}>
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;
