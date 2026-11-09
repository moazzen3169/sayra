"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AUTH_USER_KEY } from "@/lib/api/config";
import { authService, AuthUser } from "@/services/authService";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "@/lib/token";
import { isAbortError } from "@/lib/api/client";

export interface UserProfile {
  id?: string;
  fullName: string;
  phone: string;
  role?: string;
  token?: string;
}

export function parseJwtRole(token?: string | null): string | undefined {
  if (!token) return undefined;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return undefined;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const parsed = JSON.parse(jsonPayload);
    return parsed?.role || parsed?.userRole || (Array.isArray(parsed?.roles) ? parsed.roles[0] : undefined);
  } catch {
    return undefined;
  }
}

export function normalizeUserRole(rawRole?: string | null): "ADMIN" | "MANAGER" | "USER" {
  if (!rawRole) return "USER";
  const upper = rawRole.toUpperCase().trim();
  if (upper === "ADMIN" || upper === "SUPER_ADMIN" || upper === "PLATFORM_ADMIN") {
    return "ADMIN";
  }
  if (upper === "MANAGER" || upper === "OWNER" || upper === "STAFF") {
    return "MANAGER";
  }
  return "USER";
}

interface AuthContextType {
  isLoggedIn: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  role: "ADMIN" | "MANAGER" | "USER";
  login: (fullName: string, phone: string, token?: string, refreshToken?: string, role?: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  isLoggedIn: false,
  isAuthenticated: false,
  isLoading: true,
  user: null,
  role: "USER",
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
      try {
        localStorage.removeItem(AUTH_USER_KEY);
      } catch {
        // Ignore
      }
      setUser(null);
    }
  }, []);

  const login = useCallback(
    (fullName: string, phone: string, token?: string, refreshToken?: string, role?: string) => {
      if (token) {
        setTokens({ accessToken: token, refreshToken });
      }
      const currentToken = token || getAccessToken() || "";
      const resolvedRole = role || parseJwtRole(currentToken) || "USER";
      const newUser: UserProfile = {
        fullName: fullName || "کاربر سایرا",
        phone,
        role: resolvedRole,
        token: currentToken || undefined,
      };
      setUser(newUser);
      try {
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(newUser));
      } catch {
        // Ignore storage errors
      }
    },
    []
  );

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
          const resolvedRole = prev?.role || parseJwtRole(token) || (me as any)?.role || "USER";
          const updated: UserProfile = {
            id: me.id,
            fullName: me.fullName || prev?.fullName || "",
            phone: me.phone || prev?.phone || "",
            role: resolvedRole,
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
    } catch (err: any) {
      if (isAbortError(err)) return;
      // Only clear if confirmed 401 Unauthorized and refresh is not possible
      const status = err?.status;
      if (status === 401 && !getRefreshToken()) {
        clearTokens();
        setUser(null);
      }
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
            const resolvedRole = prev?.role || parseJwtRole(token) || (me as any)?.role || "USER";
            const updated: UserProfile = {
              id: me.id,
              fullName: me.fullName || prev?.fullName || "",
              phone: me.phone || prev?.phone || "",
              role: resolvedRole,
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
      } catch (err: any) {
        if (!active || isAbortError(err)) return;
        // Check if error is 401 Unauthorized
        const status = err?.status;
        const refreshToken = getRefreshToken();

        if (status === 401) {
          if (refreshToken) {
            // Attempt to refresh token rather than immediately purging session
            try {
              const refreshed = await authService.refresh(refreshToken);
              if (refreshed?.accessToken) {
                setTokens({ accessToken: refreshed.accessToken, refreshToken });
                const freshMe = await authService.getMe();
                if (freshMe && active) {
                  setUser((prev) => {
                    const resolvedRole = prev?.role || parseJwtRole(refreshed.accessToken) || (freshMe as any)?.role || "USER";
                    const updated: UserProfile = {
                      id: freshMe.id,
                      fullName: freshMe.fullName || prev?.fullName || "",
                      phone: freshMe.phone || prev?.phone || "",
                      role: resolvedRole,
                      token: refreshed.accessToken,
                    };
                    try {
                      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(updated));
                    } catch {}
                    return updated;
                  });
                  return;
                }
              }
            } catch {
              // Refresh failed
              clearTokens();
              setUser(null);
            }
          } else {
            clearTokens();
            setUser(null);
          }
        }
        // If it's a network error or other 5xx error, do NOT wipe tokens!
        // User retains their stored auth state and can retry when back online.
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

  const role = normalizeUserRole(user?.role || parseJwtRole(user?.token || (typeof window !== "undefined" ? getAccessToken() : null)));

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn,
        isAuthenticated,
        isLoading,
        user,
        role,
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
