"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getMe, removeToken, setToken, User, login as apiLogin } from "./api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const res = await getMe();
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        removeToken();
      }
    } catch {
      removeToken();
    } finally {
      setLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<string | null> {
    const res = await apiLogin(email, password);
    if (res.success && res.data) {
      setToken(res.data.token);
      const meRes = await getMe();
      if (meRes.success && meRes.data) {
        setUser(meRes.data);
      }
      return null;
    }
    return res.error || "Error al iniciar sesión";
  }

  function logout() {
    removeToken();
    setUser(null);
    router.push("/login");
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
}
