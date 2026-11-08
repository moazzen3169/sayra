"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { deviceCategoryApi } from "@/services/gaming-center/device-category.api";
import type { DeviceCategory } from "@/types/gaming-center/device-category.types";
import { isAbortError } from "@/lib/api/client";

export function useDeviceCategories(gamingCenterSlug: string) {
  const [categories, setCategories] = useState<DeviceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!gamingCenterSlug?.trim()) {
      setCategories([]);
      setIsLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const data = await deviceCategoryApi.getDeviceCategories(gamingCenterSlug, controller.signal);
      setCategories(data);
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      setError((err as Error)?.message || "خطا در دریافت دسته‌بندی‌های دستگاه‌ها");
    } finally {
      setIsLoading(false);
    }
  }, [gamingCenterSlug]);

  useEffect(() => {
    fetchCategories();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchCategories]);

  return {
    categories,
    isLoading,
    error,
    refetch: fetchCategories,
  };
}
