"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AUTH_USER_KEY } from "@/lib/api/config";
import { authService, AuthUser } from "@/services/authService";
import { getAccessToken, setTokens, clearTokens } from "@/lib/token";

export interface UserProfile {
  id?: string;
  fullName: string;
  phone: string;
  token?: string;
}

interface AuthContextType {
  isLoggedIn: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  login: (fullName: string, phone: string, token?: string, refreshToken?: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isAuthenticated: false,
  isLoading: true,
  user: null,
  login: () => {},
  logout: async () => {},
  refreshUser: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const token = getAccessToken();
      if (!token) return null;
      const saved = localStorage.getItem(AUTH_USER_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.fullName || parsed.phone)) {
          return { ...parsed, token };
        }
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Authentication status strictly reflects presence of valid session and user
  const isAuthenticated = Boolean(user && (user.token || (typeof window !== "undefined" && getAccessToken())));
  const isLoggedIn = isAuthenticated;

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Always complete local logout even if remote logout fails
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  const login = useCallback((fullName: string, phone: string, token?: string, refreshToken?: string) => {
    if (token) {
      setTokens({ accessToken: token, refreshToken });
    }
    const currentToken = token || getAccessToken() || "";
    const newUser: UserProfile = {
      fullName: fullName || "کاربر سایرا",
      phone,
      token: currentToken || undefined,
    };
    setUser(newUser);
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const refreshUser = useCallback(async () => {
    if (typeof window === "undefined") return;
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me: AuthUser = await authService.getMe();
      if (me) {
        setUser((prev) => {
          const updated: UserProfile = {
            id: me.id,
            fullName: me.fullName || prev?.fullName || "",
            phone: me.phone || prev?.phone || "",
            token,
          };
          try {
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
          } catch {
            // Ignore
          }
          return updated;
        });
      }
    } catch {
      // Missing or invalid token should clear invalid user
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initAuth() {
      const token = getAccessToken();
      if (!token) {
        if (active) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const me = await authService.getMe();
        if (!active) return;
        if (me) {
          setUser((prev) => {
            const updated: UserProfile = {
              id: me.id,
              fullName: me.fullName || prev?.fullName || "",
              phone: me.phone || prev?.phone || "",
              token,
            };
            try {
              localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
            } catch {
              // Ignore
            }
            return updated;
          });
        }
      } catch {
        if (active) {
          clearTokens();
          setUser(null);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      active = false;
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
