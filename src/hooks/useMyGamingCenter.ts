"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { isAbortError } from "@/lib/api/client";
import { getAccessToken } from "@/lib/token";
import { ownerService } from "@/services/ownerService";
import type { OwnerMe } from "@/types/owner";

export type MyGamingCenterStatus = "idle" | "loading" | "ready" | "error";

export interface MyGamingCenterState {
  status: MyGamingCenterStatus;
  /** کاربر دقیقاً یک گیمنت دارد (طبق پاسخ API) */
  hasCenter: boolean;
  /** کاربر مدیر سامانه است */
  isAdmin: boolean;
  centerId: string | null;
  refetch: () => void;
}

interface Resolved {
  hasCenter: boolean;
  isAdmin: boolean;
  centerId: string | null;
}

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "PLATFORM_ADMIN"];

/**
 * کش درون‌حافظه‌ای بر اساس توکن.
 * فقط نتیجه‌ی مثبت (دارای گیمنت یا ادمین) کش می‌شود؛
 * نتیجه‌ی «بدون گیمنت» عمداً کش نمی‌شود تا بعد از ساخت گیمنت، لینک بدون نیاز به رفرش اصلاح شود.
 */
let positiveCache: { token: string; value: Resolved } | null = null;

function resolveFromMe(me: OwnerMe): Resolved {
  const role = String(me.role ?? "").toUpperCase();
  const isAdmin = ADMIN_ROLES.includes(role);

  const centerId =
    me.gamingCenterId ||
    me.gamingCenters?.find((c) => Boolean(c?.id))?.id ||
    null;

  return {
    isAdmin,
    centerId,
    hasCenter: Boolean(centerId),
  };
}

export function useMyGamingCenter(): MyGamingCenterState {
  const { isLoggedIn } = useAuth();

  const [status, setStatus] = useState<MyGamingCenterStatus>("idle");
  const [resolved, setResolved] = useState<Resolved>({
    hasCenter: false,
    isAdmin: false,
    centerId: null,
  });
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => setReloadToken((v) => v + 1), []);

  useEffect(() => {
    if (!isLoggedIn) {
      positiveCache = null;
      setResolved({ hasCenter: false, isAdmin: false, centerId: null });
      setStatus("idle");
      return;
    }

    const token = getAccessToken();

    if (token && positiveCache && positiveCache.token === token) {
      setResolved(positiveCache.value);
      setStatus("ready");
      return;
    }

    const controller = new AbortController();
    let active = true;
    setStatus("loading");

    ownerService
      .getMe(controller.signal)
      .then((me) => {
        if (!active) return;
        const value = resolveFromMe(me);
        if (token && (value.hasCenter || value.isAdmin)) {
          positiveCache = { token, value };
        }
        setResolved(value);
        setStatus("ready");
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        setStatus("error");
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [isLoggedIn, reloadToken]);

  return {
    status,
    hasCenter: resolved.hasCenter,
    isAdmin: resolved.isAdmin,
    centerId: resolved.centerId,
    refetch,
  };
}