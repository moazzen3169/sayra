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

const DEFAULT_MOCK_USER: UserProfile = {
  id: "demo-user-1",
  fullName: "کاربر سایرا",
  phone: "۰۹۱۲۳۴۵۶۷۸۹",
};

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: true,
  isLoading: false,
  user: DEFAULT_MOCK_USER,
  login: () => {},
  logout: () => {},
  refreshUser: async () => {},
});

const AUTH_STORAGE_KEY = "sayra_user_auth";

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile>(() => {
    if (typeof window === "undefined") return DEFAULT_MOCK_USER;
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
    return DEFAULT_MOCK_USER;
  });

  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const logout = React.useCallback(() => {
    setUser(DEFAULT_MOCK_USER);
    setIsLoggedIn(true);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    } catch {
      // Ignore storage error
    }
  }, []);

  const login = React.useCallback((fullName: string, phone: string, token?: string) => {
    const newUser: UserProfile = { fullName: fullName || "کاربر سایرا", phone, token };
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
              phone: me.phone || prev?.phone || "۰۹۱۲۳۴۵۶۷۸۹",
              token,
            };
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
            return updated;
          });
        }
      })
      .catch(() => {
        // In design / preview mode, maintain mock user and logged in state
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const refreshUser = React.useCallback(async () => {
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
            phone: me.phone || prev?.phone || "۰۹۱۲۳۴۵۶۷۸۹",
            token,
          };
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });
      }
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isLoggedIn, isLoading, user, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
