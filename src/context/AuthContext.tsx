"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { ACCESS_TOKEN_KEY } from "@/lib/api/config";
import { authService } from "@/services/authService";

export interface UserProfile {
  id?: string;
  fullName: string;
  phone: string;
  token?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  login: (fullName: string, phone: string, token?: string) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isLoading: true,
  user: null,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

const AUTH_STORAGE_KEY = "sayra_user_auth";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.fullName || parsed.phone)) {
          return parsed;
        }
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    return !!token || !!user;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const me = await authService.getMe();
      if (me) {
        setUser((prev) => {
          const updated: UserProfile = {
            id: me.id,
            fullName: me.fullName || prev?.fullName || "کاربر سایرا",
            phone: me.phone || prev?.phone || "",
            token,
          };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
        setIsLoggedIn(true);
      }
    } catch (e: unknown) {
      // If token is invalid or expired (401), clear session
      const status = (e as { status?: number })?.status;
      if (status === 401) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (fullName: string, phone: string, token?: string) => {
    const newUser: UserProfile = { fullName, phone, token };
    setUser(newUser);
    setIsLoggedIn(true);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      if (token) {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
      }
    } catch {
      // Ignore storage error
    }
  };

  const logout = () => {
    setUser(null);
    setIsLoggedIn(false);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // Ignore storage error
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
