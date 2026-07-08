import { getAccessToken } from "./index";

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

async function request(endpoint, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers, credentials: "include" });
  const data = await res.json();
  
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
  return data;
}

export const chatAPI = {
  getConversations: () => request("/chat/conversations"),
  createConversation: (type, hotelId = null) => 
    request("/chat/conversations", { method: "POST", body: JSON.stringify({ type, hotelId }) }),
  getMessages: (conversationId) => request(`/chat/conversations/${conversationId}/messages`),
};
