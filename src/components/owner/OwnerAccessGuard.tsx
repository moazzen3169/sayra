"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth, type UserProfile, type UserRole } from "@/context/AuthContext";
import {
  OwnerAccessState,
  OwnerPanelSkeleton,
} from "@/components/owner/OwnerAccessView";

/** مسیرهایی که برای ساخت گیمنت آزاد هستند */
const OPEN_PATHS = ["/owner/new"];

/** نقش‌های مجاز برای پنل مدیریت */
const ALLOWED_ROLES = ["MANAGER", "ADMIN"];

export function isOpenOwnerPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return OPEN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export function hasOwnerPanelAccess(params: {
  isLoggedIn: boolean;
  role?: UserRole | string | null;
  user?: Pick<UserProfile, "role" | "actorType"> | null;
}): boolean {
  const { isLoggedIn, role, user } = params;

  if (isLoggedIn !== true) return false;

  const normalizedRole = String(role ?? user?.role ?? "")
    .trim()
    .toUpperCase();

  const actorType = String(user?.actorType ?? "")
    .trim()
    .toUpperCase();

  if (actorType === "CUSTOMER") return false;

  return ALLOWED_ROLES.includes(normalizedRole);
}

export const OwnerAccessGuard: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const pathname = usePathname();
  const { isLoggedIn, role, user, isLoading, refreshUser } = useAuth();

  const currentToken = user?.token ?? null;
  const [reverifiedToken, setReverifiedToken] = useState<string | null>(null);
  const [isManualRetrying, setIsManualRetrying] = useState(false);
  const verifyingRef = useRef(false);
  const attemptedTokenRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!currentToken) {
      attemptedTokenRef.current = null;
      return;
    }

    if (attemptedTokenRef.current && attemptedTokenRef.current !== currentToken) {
      attemptedTokenRef.current = null;
    }
  }, [currentToken]);

  const isOpenPath = isOpenOwnerPath(pathname);

  const hasAccess = hasOwnerPanelAccess({
    isLoggedIn,
    role,
    user,
  });

  const hasReverified = Boolean(currentToken && reverifiedToken === currentToken);

  // If logged in but access appears denied, perform one silent authoritative check with /auth/me
  // before ever showing an access-denied screen (prevents stale client role from blocking managers).
  useEffect(() => {
    if (
      isOpenPath ||
      isLoading ||
      !isLoggedIn ||
      !currentToken ||
      hasAccess ||
      hasReverified ||
      verifyingRef.current ||
      attemptedTokenRef.current === currentToken
    ) {
      return;
    }

    verifyingRef.current = true;
    attemptedTokenRef.current = currentToken;
    const tokenBeingVerified = currentToken;

    Promise.resolve(refreshUser())
      .catch(() => undefined)
      .finally(() => {
        verifyingRef.current = false;
        if (isMountedRef.current) {
          setReverifiedToken(tokenBeingVerified);
        }
      });
  }, [isOpenPath, isLoading, isLoggedIn, hasAccess, hasReverified, currentToken, refreshUser]);

  const handleRetry = useCallback(async () => {
    if (verifyingRef.current) return;
    verifyingRef.current = true;
    setIsManualRetrying(true);
    const tokenBeingVerified = currentToken;
    if (tokenBeingVerified) {
      attemptedTokenRef.current = tokenBeingVerified;
    }
    try {
      await refreshUser();
    } finally {
      verifyingRef.current = false;
      if (isMountedRef.current) {
        setIsManualRetrying(false);
        setReverifiedToken(tokenBeingVerified);
      }
    }
  }, [currentToken, refreshUser]);

  if (isOpenPath) {
    return <>{children}</>;
  }

  if (isLoading || (isLoggedIn && !hasAccess && !hasReverified && Boolean(currentToken))) {
    return (
      <OwnerPanelSkeleton
        statusText={
          isLoading
            ? "در حال بررسی دسترسی و بارگذاری پنل مدیریت..."
            : "در حال تایید نهایی دسترسی مدیریت..."
        }
      />
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (!isLoggedIn) {
    return <OwnerAccessState variant="unauthenticated" pathname={pathname} />;
  }

  return (
    <OwnerAccessState
      variant="forbidden"
      pathname={pathname}
      onRetry={handleRetry}
      isRetrying={isManualRetrying}
    />
  );
};
