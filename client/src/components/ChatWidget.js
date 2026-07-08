import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { useAuth } from "../context/AuthContext";
import { chatAPI } from "../api/chat";
import { getAccessToken } from "../api";
import { Spinner } from "./UI";

const SOCKET_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : "http://localhost:5000";

export default function ChatWidget({ hotel = null }) {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [socket, setSocket] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  useEffect(() => {
    if (!user || !isOpen) return;

    const token = getAccessToken();
    const newSocket = io(SOCKET_URL, {
      auth: { token }
    });
    setSocket(newSocket);

    // Initialize conversation
    const initChat = async () => {
      setLoading(true);
      try {
        const type = hotel ? "hotel" : "support";
        const hotelId = hotel ? hotel._id : null;
        
        const resConv = await chatAPI.createConversation(type, hotelId);
        const conv = resConv.data;
        setConversation(conv);
        
        newSocket.emit("join_conversation", conv._id);

        const resMsg = await chatAPI.getMessages(conv._id);
        setMessages(resMsg.data);
      } catch (err) {
        console.error("Failed to init chat", err);
      } finally {
        setLoading(false);
      }
    };
    initChat();

    newSocket.on("new_message", (msg) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [user, isOpen, hotel]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket || !conversation) return;
    
    socket.emit("send_message", {
      conversationId: conversation._id,
      text: input,
    });
    setInput("");
  };

  if (!user || user.role === "admin") return null;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
      {!isOpen ? (
        <button 
          onClick={() => setIsOpen(true)}
          style={{
            background: "linear-gradient(135deg, #b8943f 0%, #d4af6a 100%)",
            color: "#111009",
            border: "none",
            borderRadius: "50%",
            width: 60, height: 60,
            cursor: "pointer",
            boxShadow: "0 10px 20px rgba(0,0,0,0.3)",
            display: "flex", justifyContent: "center", alignItems: "center"
          }}
        >
          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </button>
      ) : (
        <div style={{
          width: 340, height: 480,
          background: "#111009",
          border: "1px solid rgba(184,148,63,0.3)",
          borderRadius: 16,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 20px 40px rgba(0,0,0,0.5)"
        }}>
          {/* Header */}
          <div style={{ background: "#1a1813", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(184,148,63,0.2)" }}>
            <div>
              <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#f5efe6", fontWeight: 600 }}>
                {hotel ? `Chat with ${hotel.name}` : "Restrip Support"}
              </div>
              <div style={{ fontSize: 11, color: "#b8943f", textTransform: "uppercase", letterSpacing: 1 }}>
                Usually replies in minutes
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} style={{ background: "transparent", border: "none", color: "#9a8e7e", cursor: "pointer" }}>✕</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {loading ? <Spinner /> : (
              messages.map(m => {
                const isMe = m.sender === user.id || m.sender === user._id;
                return (
                  <div key={m._id} style={{ alignSelf: isMe ? "flex-end" : "flex-start", maxWidth: "80%" }}>
                    <div style={{
                      padding: "10px 16px",
                      borderRadius: isMe ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isMe ? "#b8943f" : "#1a1813",
                      color: isMe ? "#111009" : "#f5efe6",
                      fontSize: 14,
                      lineHeight: 1.5,
                      border: isMe ? "none" : "1px solid rgba(184,148,63,0.2)"
                    }}>
                      {m.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} style={{ padding: "16px", borderTop: "1px solid rgba(184,148,63,0.2)", display: "flex", gap: 8, background: "#1a1813" }}>
            <input 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Type your message..."
              style={{
                flex: 1,
                background: "#0a0806",
                border: "1px solid rgba(184,148,63,0.3)",
                padding: "10px 16px",
                borderRadius: 20,
                color: "#f5efe6",
                outline: "none",
                fontSize: 14
              }}
            />
            <button type="submit" disabled={!input.trim()} style={{
              background: input.trim() ? "#b8943f" : "#333",
              color: "#111009",
              border: "none",
              borderRadius: "50%",
              width: 40, height: 40,
              cursor: input.trim() ? "pointer" : "not-allowed",
              display: "flex", justifyContent: "center", alignItems: "center"
            }}>
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
