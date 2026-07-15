// src/context/AuthContext.tsx — Auth state, login/logout, admin guard

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { api } from "@/lib/api";
import type { ApiUser } from "@/types/api";

interface AuthState {
  user: ApiUser | null;
  token: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    token: localStorage.getItem("nt_token"),
  });
  const [isLoading, setIsLoading] = useState(true);

  // On mount, verify existing token and fetch user
  useEffect(() => {
    const token = localStorage.getItem("nt_token");
    if (!token) {
      setIsLoading(false);
      return;
    }
    api
      .get<ApiUser>("/auth/me")
      .then((user) => setAuth({ user, token }))
      .catch(() => {
        localStorage.removeItem("nt_token");
        localStorage.removeItem("nt_user");
        setAuth({ user: null, token: null });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api.post<{ user: ApiUser; token: string }>(
      "/auth/login",
      { email, password }
    );
    // Enforce admin-only access before saving anything
    if (data.user.role !== "admin") {
      throw new Error("Access denied. Admins only.");
    }
    localStorage.setItem("nt_token", data.token);
    localStorage.setItem("nt_user", JSON.stringify(data.user));
    setAuth({ user: data.user, token: data.token });
  };

  const logout = () => {
    localStorage.removeItem("nt_token");
    localStorage.removeItem("nt_user");
    setAuth({ user: null, token: null });
  };

  return (
    <AuthContext.Provider
      value={{
        ...auth,
        login,
        logout,
        isAdmin: auth.user?.role === "admin",
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
