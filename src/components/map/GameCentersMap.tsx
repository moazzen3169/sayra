"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { DEFAULT_CITY, useCity } from "@/context/CityContext";
import { isAbortError } from "@/lib/api/client";
import { GAME_CENTERS_MAP_HEIGHT_CLASS } from "@/lib/gamecenterMap";
import { getErrorMessage } from "@/lib/reservationUi";
import { cn } from "@/lib/utils";
import { connectedGameCentersService } from "@/services/connectedGameCentersService";
import type { ValidGameCenterLocation } from "@/types/gamecenterMap";

const GameCentersMapSkeleton: React.FC = () => (
  <div
    aria-busy="true"
    className={cn(
      "relative w-full overflow-hidden rounded-card border border-[var(--border-color)] bg-[var(--bg-body)] p-3 flex flex-col justify-between",
      GAME_CENTERS_MAP_HEIGHT_CLASS
    )}
  >
    <span className="sr-only">در حال بارگذاری نقشه گیمنت‌ها</span>
    <div className="flex flex-col gap-2">
      <Skeleton aria-busy={undefined} className="h-8 w-8 rounded-card" />
      <Skeleton aria-busy={undefined} className="h-8 w-8 rounded-card" />
    </div>
    <div className="flex items-center justify-center">
      <Skeleton aria-busy={undefined} className="h-8 w-32 rounded-card" />
    </div>
    <div className="flex justify-end">
      <Skeleton aria-busy={undefined} className="h-4 w-28 rounded-child" />
    </div>
  </div>
);

const DynamicGameCentersMapCanvas = dynamic(
  () =>
    import("./GameCentersMapCanvas").then(
      (mod) => mod.GameCentersMapCanvas
    ),
  {
    ssr: false,
    loading: () => <GameCentersMapSkeleton />,
  }
);

export interface GameCentersMapProps {
  city?: string;
  enabled?: boolean;
  endpoint?: string;
  baseUrl?: string;
  title?: string;
  subtitle?: string;
  className?: string;
  onSelectCenter?: (center: ValidGameCenterLocation) => void;
}

export const GameCentersMap: React.FC<GameCentersMapProps> = ({
  city,
  enabled,
  endpoint,
  baseUrl,
  title = "گیمنتهای متصل به سایرا",
  subtitle = "موقعیت گیمنتهای عضو شبکه سایرا را روی نقشه پیدا کنید.",
  className,
  onSelectCenter,
}) => {
  const router = useRouter();
  const { selectedCity, isCityReady } = useCity();
  const effectiveCity = (city ?? selectedCity).trim() || DEFAULT_CITY;
  const isFetchEnabled = enabled ?? (city !== undefined ? true : isCityReady);

  const [centers, setCenters] = useState<ValidGameCenterLocation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState<boolean>(false);
  const [reloadToken, setReloadToken] = useState<number>(0);

  useEffect(() => {
    if (!isFetchEnabled) return;

    const controller = new AbortController();
    let active = true;

    async function loadCenters() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await connectedGameCentersService.getConnectedGameCenters({
          city: effectiveCity,
          endpoint,
          baseUrl,
          signal: controller.signal,
          forceRefresh: reloadToken > 0,
        });
        if (!active || controller.signal.aborted) return;
        setCenters(result.centers);
        setIsMock(result.isMock);
      } catch (err) {
        if (!active || controller.signal.aborted || isAbortError(err)) return;
        setCenters([]);
        setIsMock(false);
        setError(getErrorMessage(err));
      } finally {
        if (active && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadCenters();

    return () => {
      active = false;
      controller.abort();
    };
  }, [effectiveCity, isFetchEnabled, endpoint, baseUrl, reloadToken]);

  const handleSelectCenter = useCallback(
    (center: ValidGameCenterLocation) => {
      if (onSelectCenter) {
        onSelectCenter(center);
        return;
      }
      router.push(`/gamecenter/${encodeURIComponent(center.id)}`);
    },
    [onSelectCenter, router]
  );

  const handleRetry = useCallback(() => {
    setReloadToken((prev) => prev + 1);
  }, []);

  return (
    <section
      aria-labelledby="game-centers-map-heading"
      className={cn(
        "flex flex-col gap-3 scroll-mt-[var(--header-m-h)] lg:scroll-mt-[var(--header-h)]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1 min-w-0">
          <h2
            id="game-centers-map-heading"
            className="text-base font-bold text-[var(--text-white)]"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs leading-5 text-[var(--text-muted)]">
              {subtitle}
            </p>
          )}
        </div>

        {isMock && (
          <span className="shrink-0 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
            حالت آزمایشی
          </span>
        )}
      </div>

      {isLoading ? (
        <GameCentersMapSkeleton />
      ) : error ? (
        <ErrorState
          title="بارگذاری نقشه گیمنت‌ها انجام نشد"
          description={error}
          onRetry={handleRetry}
        />
      ) : (
        <DynamicGameCentersMapCanvas
          centers={centers}
          city={effectiveCity}
          onSelectCenter={handleSelectCenter}
        />
      )}
    </section>
  );
};
