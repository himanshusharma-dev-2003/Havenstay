import { createContext, useContext, useState, useEffect } from "react";
import { authAPI, tokenStore } from "../api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore session using stored access token
  useEffect(() => {
    (async () => {
      try {
        // Only attempt restore if we have a stored token
        if (tokenStore.get()) {
          const data = await authAPI.getMe();
          if (data && data.user) {
            setUser(data.user);
          }
        }
      } catch {
        // Token invalid or expired — clear it
        tokenStore.clear();
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    // Store access token from response body
    if (data.accessToken) tokenStore.set(data.accessToken);
    // Use the user returned directly from login — no extra /me call needed
    const userData = data.user || (await authAPI.getMe()).user;
    setUser(userData);
    return data;
  };

  const register = async (name, email, password) => {
    const data = await authAPI.register(name, email, password);
    if (data.accessToken) tokenStore.set(data.accessToken);
    const userData = data.user || (await authAPI.getMe()).user;
    setUser(userData);
    return data;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    tokenStore.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
