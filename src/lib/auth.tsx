"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "./api";

export type AdminUser = { id: string; name: string; email: string; role: string };

type AuthState = {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const TOKEN_KEY = "sm_admin_token";
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  const clear = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const load = useCallback(
    async (t: string | null) => {
      if (!t) return clear();
      try {
        const me = await api<{ user: AdminUser }>("/auth/me", { token: t });
        // Only the store owner (admin) and approved vendors may use the dashboard.
        if (me.user.role !== "admin" && me.user.role !== "vendor") return clear();
        setToken(t);
        setUser(me.user);
      } catch {
        clear();
      }
    },
    [clear],
  );

  useEffect(() => {
    // Read the saved token after the first render so server and client markup match.
    (async () => {
      const saved = await Promise.resolve(localStorage.getItem(TOKEN_KEY));
      await load(saved);
      setLoading(false);
    })();
  }, [load]);

  const value: AuthState = {
    user,
    token,
    loading,
    signIn: async (email, password) => {
      const res = await api<{ token: string; user: AdminUser }>("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      if (res.user.role !== "admin" && res.user.role !== "vendor") throw new Error("This dashboard is for the store owner and approved vendors");
      localStorage.setItem(TOKEN_KEY, res.token);
      setToken(res.token);
      setUser(res.user);
    },
    signOut: clear,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
