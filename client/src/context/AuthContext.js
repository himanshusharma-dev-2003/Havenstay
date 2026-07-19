import { createContext, useContext, useState, useEffect } from "react";
import { authAPI } from "../api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount: try to restore session via refresh token cookie
  useEffect(() => {
    (async () => {
      try {
        const data = await authAPI.getMe();
        if (data && data.user) {
          setUser(data.user);
        }
      } catch {
        // no valid session — that's fine
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    await authAPI.login(email, password);
    // server sets httpOnly cookies; fetch current user
    const data = await authAPI.getMe();
    setUser(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    await authAPI.register(name, email, password);
    const data = await authAPI.getMe();
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    try { await authAPI.logout(); } catch {}
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
