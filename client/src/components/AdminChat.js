import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { chatAPI } from "../api/chat";
import { getAccessToken } from "../api";
import { Spinner } from "./UI";

const SOCKET_URL = process.env.REACT_APP_API_URL ? process.env.REACT_APP_API_URL.replace('/api', '') : "http://localhost:5000";

export default function AdminChat() {
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, activeConv]);

  useEffect(() => {
    const token = getAccessToken();
    const newSocket = io(SOCKET_URL, { auth: { token } });
    setSocket(newSocket);

    const loadConvs = async () => {
      try {
        const res = await chatAPI.getConversations();
        setConversations(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadConvs();

    newSocket.on("admin_notification", () => {
      // Refresh conversations to show new messages at top
      loadConvs();
    });

    return () => newSocket.disconnect();
  }, []);

  const selectConversation = async (conv) => {
    setActiveConv(conv);
    if (socket) socket.emit("join_conversation", conv._id);
    try {
      const res = await chatAPI.getMessages(conv._id);
      setMessages(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!socket || !activeConv) return;
    
    const handler = (msg) => {
      if (msg.conversationId === activeConv._id) {
        setMessages(prev => [...prev, msg]);
      }
    };
    socket.on("new_message", handler);
    return () => socket.off("new_message", handler);
  }, [socket, activeConv]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (!input.trim() || !socket || !activeConv) return;
    
    socket.emit("send_message", {
      conversationId: activeConv._id,
      text: input,
    });
    setInput("");
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 24, height: 600 }}>
      {/* Sidebar */}
      <div style={{ background: "#111009", border: "1px solid rgba(184,148,63,0.2)", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "20px", borderBottom: "1px solid rgba(184,148,63,0.2)" }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: "#f5efe6" }}>Conversations</h3>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.length === 0 && <div style={{ padding: 20, color: "#9a8e7e" }}>No active chats</div>}
          {conversations.map(c => {
            const isActive = activeConv?._id === c._id;
            const user = c.participants[0] || {};
            return (
              <div 
                key={c._id} 
                onClick={() => selectConversation(c)}
                style={{ 
                  padding: "16px 20px", 
                  cursor: "pointer", 
                  borderBottom: "1px solid rgba(184,148,63,0.1)",
                  background: isActive ? "rgba(184,148,63,0.1)" : "transparent",
                  borderLeft: isActive ? "3px solid #b8943f" : "3px solid transparent"
                }}
              >
                <div style={{ color: "#f5efe6", fontWeight: 500 }}>{user.name || "Unknown"}</div>
                <div style={{ fontSize: 12, color: "#9a8e7e", marginTop: 4 }}>
                  {c.type === "hotel" ? `Hotel: ${c.hotelId?.name || "Unknown"}` : "Support Request"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ background: "#111009", border: "1px solid rgba(184,148,63,0.2)", display: "flex", flexDirection: "column" }}>
        {activeConv ? (
          <>
            <div style={{ padding: "20px", borderBottom: "1px solid rgba(184,148,63,0.2)", display: "flex", justifyContent: "space-between" }}>
              <div style={{ color: "#f5efe6", fontWeight: 600 }}>{activeConv.participants[0]?.name}</div>
              <div style={{ color: "#b8943f", fontSize: 12, textTransform: "uppercase" }}>{activeConv.type}</div>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {messages.map(m => {
                const isAdmin = m.sender !== activeConv.participants[0]?._id;
                return (
                  <div key={m._id} style={{ alignSelf: isAdmin ? "flex-end" : "flex-start", maxWidth: "70%" }}>
                    <div style={{
                      padding: "10px 16px",
                      borderRadius: isAdmin ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                      background: isAdmin ? "#b8943f" : "#1a1813",
                      color: isAdmin ? "#111009" : "#f5efe6",
                      border: isAdmin ? "none" : "1px solid rgba(184,148,63,0.2)",
                      fontSize: 14
                    }}>
                      {m.text}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} style={{ padding: 16, borderTop: "1px solid rgba(184,148,63,0.2)", display: "flex", gap: 8 }}>
              <input 
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type a reply..."
                style={{ flex: 1, background: "#0a0806", border: "1px solid rgba(184,148,63,0.3)", padding: "12px 16px", borderRadius: 24, color: "#f5efe6", outline: "none" }}
              />
              <button type="submit" style={{ background: "#b8943f", color: "#111009", border: "none", padding: "0 24px", borderRadius: 24, cursor: "pointer", fontWeight: 600 }}>
                Send
              </button>
            </form>
          </>
        ) : (
          <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", color: "#9a8e7e" }}>
            Select a conversation to start chatting
          </div>
        )}
      </div>
    </div>
  );
}
