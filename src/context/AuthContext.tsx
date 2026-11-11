
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import { AUTH_USER_KEY } from "@/lib/api/config";
import { authService } from "@/services/authService";

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
} from "@/lib/token";

import { cleanPhoneNumber } from "@/lib/format";
import { isAbortError } from "@/lib/api/client";

// --------------------------------------------------
// Types
// --------------------------------------------------

export interface UserProfile {
  id?: string;
  fullName: string;
  phone: string;
  role?: string;
  token?: string;
  actorType?: string;
  gamingCenterId?: string;
}

export type UserRole = "ADMIN" | "MANAGER" | "USER";

interface AuthContextType {
  isLoggedIn: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  role: UserRole;

  login: (
    fullName: string,
    phone: string,
    token?: string,
    refreshToken?: string,
    role?: string
  ) => void;

  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// --------------------------------------------------
// JWT Helpers
// --------------------------------------------------

export function parseJwtRole(
  token?: string | null
): string | undefined {
  if (!token) return undefined;

  try {
    const parts = token.split(".");

    if (parts.length < 2) return undefined;

    const base64 = parts[1]
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const paddedBase64 = base64.padEnd(
      Math.ceil(base64.length / 4) * 4,
      "="
    );

    const jsonPayload = decodeURIComponent(
      atob(paddedBase64)
        .split("")
        .map(
          (char) =>
            "%" +
            ("00" + char.charCodeAt(0).toString(16)).slice(-2)
        )
        .join("")
    );

    const parsed = JSON.parse(jsonPayload);

    return (
      parsed?.role ||
      parsed?.userRole ||
      (Array.isArray(parsed?.roles)
        ? parsed.roles[0]
        : undefined)
    );
  } catch {
    return undefined;
  }
}

// --------------------------------------------------
// Role Normalization
// --------------------------------------------------

export function normalizeUserRole(
  rawRole?: string | null,
  actorType?: string | null
): UserRole {
  const normalizedRole = String(rawRole ?? "")
    .trim()
    .toUpperCase();

  const normalizedActor = String(actorType ?? "")
    .trim()
    .toUpperCase();

  // مشتری هرگز نقش مدیریتی نمی‌گیرد.
  if (normalizedActor === "CUSTOMER") {
    return "USER";
  }

  if (
    [
      "ADMIN",
      "SUPER_ADMIN",
      "PLATFORM_ADMIN",
    ].includes(normalizedRole)
  ) {
    return "ADMIN";
  }

  if (
    [
      "MANAGER",
      "OWNER",
      "STAFF",
    ].includes(normalizedRole)
  ) {
    return "MANAGER";
  }

  return "USER";
}

// --------------------------------------------------
// API Response Helpers
// --------------------------------------------------

/**
 * پشتیبانی از هر دو ساختار:
 *
 * { id, role, actorType }
 *
 * و:
 *
 * { success: true, data: { id, role, actorType } }
 *
 * همچنین پاسخ Axios:
 *
 * { data: { success: true, data: {...} } }
 */
function extractApiData(response: any): any {
  if (!response) return null;

  let result = response?.data ?? response;

  if (
    result?.success === true &&
    result?.data
  ) {
    result = result.data;
  }

  return result;
}

/**
 * ساخت پروفایل استاندارد از اطلاعات API
 */
function buildUserProfile(
  response: any,
  token: string,
  previousUser?: UserProfile | null
): UserProfile {
  const data = extractApiData(response);

  if (!data || typeof data !== "object") {
    throw new Error("Invalid user response");
  }

  // نقش واقعی API اولویت دارد.
  const apiRole =
    typeof data.role === "string" &&
    data.role.trim()
      ? data.role.trim()
      : undefined;

  // در نبود نقش API، JWT بررسی می‌شود.
  const jwtRole = parseJwtRole(token);

  // نقش قبلی فقط آخرین گزینه جایگزین است.
  const resolvedRole =
    apiRole ||
    jwtRole ||
    previousUser?.role ||
    "USER";

  const resolvedActorType =
    data.actorType ??
    previousUser?.actorType;

  const updatedUser: UserProfile = {
    id: data.id ?? previousUser?.id,

    fullName:
      data.fullName ??
      previousUser?.fullName ??
      "",

    phone: cleanPhoneNumber(
      data.phone ??
      previousUser?.phone ??
      ""
    ),

    role: resolvedRole,

    actorType: resolvedActorType,

    gamingCenterId:
      data.gamingCenterId ??
      previousUser?.gamingCenterId,

    token,
  };

  return updatedUser;
}

// --------------------------------------------------
// Local Storage Helpers
// --------------------------------------------------

function getSavedUser(token: string): UserProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const saved = localStorage.getItem(AUTH_USER_KEY);

    if (!saved) return null;

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      typeof parsed !== "object"
    ) {
      return null;
    }

    return {
      ...parsed,
      token,
    };
  } catch {
    return null;
  }
}

function saveUser(user: UserProfile): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(
      AUTH_USER_KEY,
      JSON.stringify(user)
    );
  } catch {
    // Storage may be unavailable.
  }
}

function getErrorStatus(error: any): number | undefined {
  return (
    error?.status ??
    error?.response?.status
  );
}

// --------------------------------------------------
// Context
// --------------------------------------------------

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

// --------------------------------------------------
// Auth Provider
// --------------------------------------------------

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  /**
   * مهم:
   * اطلاعات کاربر در اولین رندر خوانده نمی‌شود.
   * در نتیجه SSR و اولین رندر مرورگر یکسان هستند.
   */
  const [user, setUser] = useState<UserProfile | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // ------------------------------------------------
  // Authentication State
  // ------------------------------------------------

const isAuthenticated = Boolean(
  user && user.token
);

const isLoggedIn = isAuthenticated;

  // ------------------------------------------------
  // Login
  // ------------------------------------------------

  const login = useCallback(
    (
      fullName: string,
      phone: string,
      token?: string,
      refreshToken?: string,
      role?: string
    ) => {
      if (token) {
        setTokens({
          accessToken: token,
          refreshToken,
        });
      }

      const currentToken =
        token || getAccessToken() || "";

      const resolvedRole =
        role ||
        parseJwtRole(currentToken) ||
        "USER";

      const newUser: UserProfile = {
        fullName: fullName || "کاربر سایرا",

        phone: cleanPhoneNumber(phone),

        role: resolvedRole,

        token: currentToken || undefined,
      };

      setUser(newUser);

      saveUser(newUser);

      setIsLoading(false);
    },
    []
  );

  // ------------------------------------------------
  // Logout
  // ------------------------------------------------

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Local logout must always complete.
    } finally {
      clearTokens();

      try {
        localStorage.removeItem(AUTH_USER_KEY);
      } catch {
        // Ignore storage errors.
      }

      setUser(null);

      setIsLoading(false);
    }
  }, []);

  // ------------------------------------------------
  // Refresh User
  // ------------------------------------------------

  const refreshUser = useCallback(async () => {
    if (typeof window === "undefined") return;

    const token = getAccessToken();

    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await authService.getMe();

      if (!response) {
        throw new Error("Empty user response");
      }

      const updatedUser = buildUserProfile(
        response,
        token,
        getSavedUser(token)
      );

      setUser(updatedUser);

      saveUser(updatedUser);
    } catch (error: any) {
      if (isAbortError(error)) return;

      const status = getErrorStatus(error);

      if (
        status === 401 &&
        !getRefreshToken()
      ) {
        clearTokens();

        setUser(null);
      }

      // خطاهای شبکه و سرور باعث حذف نشست نمی‌شوند.
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ------------------------------------------------
  // Initial Authentication
  // ------------------------------------------------

  useEffect(() => {
    let active = true;

    async function initAuth() {
      try {
        const token = getAccessToken();

        // کاربر نشست معتبر ندارد.
        if (!token) {
          if (active) {
            setUser(null);
            setIsLoading(false);
          }

          return;
        }

        /**
         * ابتدا اطلاعات ذخیره‌شده را بازیابی می‌کنیم.
         * این عملیات فقط بعد از Hydration انجام می‌شود.
         */
        const cachedUser = getSavedUser(token);

        if (active && cachedUser) {
          setUser(cachedUser);
        }

        // دریافت اطلاعات معتبر از API
        try {
          const response = await authService.getMe();

          if (!active) return;

          if (!response) {
            throw new Error("Empty user response");
          }

          const updatedUser = buildUserProfile(
            response,
            token,
            cachedUser
          );

          setUser(updatedUser);

          saveUser(updatedUser);

          return;
        } catch (error: any) {
          if (!active || isAbortError(error)) return;

          const status = getErrorStatus(error);

          // فقط خطای 401 باعث تلاش برای Refresh می‌شود.
          if (status !== 401) {
            return;
          }
        }

        // --------------------------------------------
        // Refresh Token
        // --------------------------------------------

        const refreshToken = getRefreshToken();

        if (!refreshToken) {
          clearTokens();

          if (active) {
            setUser(null);
          }

          return;
        }

        try {
          const refreshResponse =
            await authService.refresh(refreshToken);

          if (!active) return;

          const refreshed = extractApiData(refreshResponse);

          if (!refreshed?.accessToken) {
            throw new Error("Invalid refresh response");
          }

          const newAccessToken = refreshed.accessToken;

          const newRefreshToken =
            refreshed.refreshToken || refreshToken;

          setTokens({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });

          // دریافت مجدد اطلاعات کاربر با توکن جدید
          const freshResponse =
            await authService.getMe();

          if (!active) return;

          if (!freshResponse) {
            throw new Error("Empty user response after refresh");
          }

          const updatedUser = buildUserProfile(
            freshResponse,
            newAccessToken,
            cachedUser
          );

          setUser(updatedUser);

          saveUser(updatedUser);
        } catch {
          if (active) {
            clearTokens();
            setUser(null);
          }
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

  // ------------------------------------------------
  // Resolve Role
  // ------------------------------------------------

  const role = normalizeUserRole(
    user?.role ||
      parseJwtRole(
        user?.token ||
        (typeof window !== "undefined"
          ? getAccessToken()
          : null)
      ),
    user?.actorType
  );

  // ------------------------------------------------
  // Debug (Development Only)
  // ------------------------------------------------

  if (process.env.NODE_ENV === "development") {
    // برای بررسی وضعیت احراز هویت
    // در صورت نیاز این بخش را فعال کن.
    /*
    console.log("AUTH DEBUG", {
      isLoggedIn,
      isLoading,
      role,
      userRole: user?.role,
      actorType: user?.actorType,
      gamingCenterId: user?.gamingCenterId,
    });
    */
  }

  // ------------------------------------------------
  // Provider
  // ------------------------------------------------

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

// --------------------------------------------------
// Hook
// --------------------------------------------------

export const useAuth = () => useContext(AuthContext);
