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
      const token = localStorage.getItem(ACCESS_TOKEN_KEY);
      if (!token) return null;
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
    return !!token;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const logout = React.useCallback(() => {
    setUser(null);
    setIsLoggedIn(false);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // Ignore storage error
    }
  }, []);

  const login = React.useCallback((fullName: string, phone: string, token?: string) => {
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
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      // Use queueMicrotask to avoid synchronous state update in effect body warning
      queueMicrotask(() => setIsLoading(false));
      return;
    }

    let active = true;
    authService
      .getMe()
      .then((me) => {
        if (!active) return;
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
      })
      .catch((e: unknown) => {
        if (!active) return;
        const status = (e as { status?: number })?.status;
        if (status === 401 || status === 403) {
          logout();
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [logout]);

  const refreshUser = React.useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) {
      setUser(null);
      setIsLoggedIn(false);
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
      const status = (e as { status?: number })?.status;
      if (status === 401 || status === 403) {
        logout();
      }
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
