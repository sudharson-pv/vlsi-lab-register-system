import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService";
import { connectSocket, disconnectSocket } from "../services/socket";

const STORAGE_KEY = "vlsi-auth";
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (session?.token) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      connectSocket(session.token);
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    disconnectSocket();
  }, [session]);

  useEffect(() => {
    if (!session?.token || session?.user?.gender) {
      return;
    }

    authService
      .me()
      .then((data) => {
        setSession((current) =>
          current
            ? {
                ...current,
                user: data.user,
              }
            : current,
        );
      })
      .catch(() => {
        setSession(null);
      });
  }, [session?.token, session?.user?.gender]);

  const login = async (payload) => {
    const data = await authService.login(payload);
    setSession({ token: data.token, user: data.user });
    return data.user;
  };

  const refreshProfile = async () => {
    if (!session?.token) {
      return null;
    }

    const data = await authService.me();
    setSession((current) =>
      current
        ? {
            ...current,
            user: data.user,
          }
        : current,
    );
    return data.user;
  };

  const logout = () => {
    setSession(null);
  };

  const value = useMemo(
    () => ({
      token: session?.token || null,
      user: session?.user || null,
      isAuthenticated: Boolean(session?.token),
      login,
      logout,
      refreshProfile,
    }),
    [session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
