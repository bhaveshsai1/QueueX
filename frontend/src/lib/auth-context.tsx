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
    // Restore session from localStorage
    try {
      const savedToken = localStorage.getItem("opd_auth_token");
      const savedUser = localStorage.getItem("opd_auth_user");
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
        // Verify with backend
        getCurrentUser(savedToken)
          .then((verified) => {
            setUser(verified);
            localStorage.setItem("opd_auth_user", JSON.stringify(verified));
          })
          .catch(() => {
            // Token expired or invalid
            logout();
          });
      }
    } catch (e) {
      console.error(e);
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

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

