"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole, loginUser, registerUser, getCurrentUser } from "./api";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (identifier: string, password: string, role?: UserRole) => Promise<User>;
  register: (data: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
    role: UserRole;
    department_id?: string;
    room_number?: string;
  }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Restore session immediately from localStorage for zero-delay UX
    try {
      const savedToken = localStorage.getItem("opd_auth_token");
      const savedUser = localStorage.getItem("opd_auth_user");
      if (savedToken && savedUser) {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(parsed);

        // Verify/refresh user state with backend in background
        getCurrentUser(savedToken)
          .then((verified) => {
            setUser(verified);
            localStorage.setItem("opd_auth_user", JSON.stringify(verified));
          })
          .catch((err) => {
            // Only wipe session if the server explicitly rejected the token as invalid/expired (401)
            // Never wipe session on network timeouts, CORS errors, or sleeping Render free tier!
            const errMsg = String(err?.message || "");
            if (errMsg.includes("401") || errMsg.includes("Invalid token")) {
              logout();
            } else {
              console.warn("Background auth refresh deferred (backend sleeping or unreachable):", err);
            }
          });
      }
    } catch (e) {
      console.error("Auth restoration error:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function login(identifier: string, password: string, role?: UserRole): Promise<User> {
    const res = await loginUser(identifier, password, role);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem("opd_auth_token", res.token);
    localStorage.setItem("opd_auth_user", JSON.stringify(res.user));
    return res.user;
  }

  async function register(data: {
    name: string;
    email?: string;
    phone?: string;
    password: string;
    role: UserRole;
    department_id?: string;
    room_number?: string;
  }): Promise<User> {
    const res = await registerUser(data);
    setToken(res.token);
    setUser(res.user);
    localStorage.setItem("opd_auth_token", res.token);
    localStorage.setItem("opd_auth_user", JSON.stringify(res.user));
    return res.user;
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("opd_auth_token");
    localStorage.removeItem("opd_auth_user");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
