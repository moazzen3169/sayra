"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { stationApi } from "@/services/gaming-center/station.api";
import type {
  PhysicalStation,
  PhysicalStationsFilter,
  PhysicalStationsPaginationMeta,
} from "@/types/gaming-center/station.types";
import { isAbortError } from "@/lib/api/client";

export function useGamingCenterStations(
  gamingCenterSlug: string,
  filter: PhysicalStationsFilter = {}
) {
  const [stations, setStations] = useState<PhysicalStation[]>([]);
  const [meta, setMeta] = useState<PhysicalStationsPaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  // شروع با لودینگ در صورتی که slug وجود دارد تا پیام "هیچ دستگاهی پیدا نشد" فلش نزند
  const [isLoading, setIsLoading] = useState<boolean>(() => Boolean(gamingCenterSlug?.trim()));
  const [hasFetched, setHasFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const filterKey = JSON.stringify({
    catalogDeviceId: filter.catalogDeviceId,
    stationType: filter.stationType,
    page: filter.page,
    limit: filter.limit,
  });

  const fetchStations = useCallback(
    async (append = false) => {
      if (!gamingCenterSlug?.trim()) {
        setStations([]);
        setIsLoading(false);
        setHasFetched(true);
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
        const result = await stationApi.getPhysicalStations(
          gamingCenterSlug,
          filter,
          controller.signal
        );

        setStations((prev) => {
          if (!append) return result.stations;
          // Avoid duplicate stations when appending pages
          const existingIds = new Set(prev.map((s) => s.id));
          const newUnique = result.stations.filter((s) => !existingIds.has(s.id));
          return [...prev, ...newUnique];
        });
        setMeta(result.meta);
      } catch (err: unknown) {
        if (isAbortError(err)) return;
        setError((err as Error)?.message || "دریافت دستگاه‌ها با خطا مواجه شد. لطفاً دوباره تلاش کنید.");
      } finally {
        setIsLoading(false);
        setHasFetched(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [gamingCenterSlug, filterKey]
  );

  useEffect(() => {
    fetchStations(false);
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchStations]);

  return {
    stations,
    meta,
    isLoading,
    hasFetched,
    error,
    refetch: () => fetchStations(false),
    loadMore: () => {
      if (meta.page < meta.totalPages) {
        // can be used when pagination is needed
      }
    },
  };
}
