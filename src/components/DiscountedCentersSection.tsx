"use client";

import React, { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { homeService } from "@/services/homeService";
import { DiscountedCenter } from "@/types/home";
import { DiscountedGamecenterCard } from "@/components/DiscountedGamecenterCard";

export interface DiscountedCentersSectionProps {
  city?: string;
  className?: string;
}

export const DiscountedCentersSection: React.FC<DiscountedCentersSectionProps> = ({
  city,
  className = "",
}) => {
  const [centers, setCenters] = useState<DiscountedCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: "rtl",
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll: "auto",
    dragFree: false,
    loop: false,
    duration: 28,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollButtons = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", updateScrollButtons);
    emblaApi.on("reInit", updateScrollButtons);
    emblaApi.on("init", updateScrollButtons);
    return () => {
      emblaApi.off("select", updateScrollButtons);
      emblaApi.off("reInit", updateScrollButtons);
      emblaApi.off("init", updateScrollButtons);
    };
  }, [emblaApi, updateScrollButtons]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        setIsLoading(true);
        setError(false);
        const data = await homeService.getDiscountedCenters({
          city,
          signal: controller.signal,
        });
        setCenters(data);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setError(true);
          setCenters([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    loadData();

    return () => {
      controller.abort();
    };
  }, [city]);

  // Prevent drag-click navigation
  const onClickCapture = useCallback(
    (e: React.MouseEvent) => {
      if (emblaApi) {
        const engine = emblaApi.internalEngine() as unknown as {
          clickAllowed?: () => boolean;
        };
        if (typeof engine.clickAllowed === "function" && !engine.clickAllowed()) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    },
    [emblaApi]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // If error or empty after loading, render nothing
  if (!isLoading && (error || centers.length === 0)) {
    return null;
  }

  const isSingleCard = centers.length === 1;

  return (
    <section
      aria-labelledby="discounted-section-title"
      className={`flex flex-col gap-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[var(--primary)] shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
              <line x1="7" y1="7" x2="7.01" y2="7" />
            </svg>
            <h2
              id="discounted-section-title"
              className="font-extrabold text-base text-[var(--text-white)]"
            >
              گیمنت‌های تخفیف‌دار
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] pr-7">
            رزرو با قیمت ویژه
          </p>
        </div>

        {/* Navigation Arrows - visible from sm up */}
        {!isLoading && !isSingleCard && (
          <div className="hidden sm:flex items-center gap-1 bg-[var(--bg-card)] rounded-lg p-0.5 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              aria-label="گیمنت‌های قبلی"
              className="w-7 h-7 rounded bg-[var(--foreground)]/60 text-[var(--text-white)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-[#101014] disabled:opacity-30 disabled:hover:bg-[var(--foreground)]/60 disabled:hover:text-[var(--text-white)] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              type="button"
              onClick={scrollNext}
              disabled={!canScrollNext}
              aria-label="گیمنت‌های بعدی"
              className="w-7 h-7 rounded bg-[var(--foreground)]/60 text-[var(--text-white)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-[#101014] disabled:opacity-30 disabled:hover:bg-[var(--foreground)]/60 disabled:hover:text-[var(--text-white)] transition-colors cursor-pointer disabled:cursor-not-allowed"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Carousel Container */}
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label="گیمنت‌های تخفیف‌دار"
        className="w-full"
      >
        {isLoading ? (
          /* Loading Skeletons */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3 lg:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="bg-[var(--bg-card)] rounded-card border border-[var(--border-subtle)] overflow-hidden flex flex-col h-[270px] animate-pulse"
              >
                <div className="w-full aspect-[16/11] bg-[var(--foreground)]" />
                <div className="p-3 flex flex-col gap-2 flex-1 justify-between">
                  <div className="space-y-2">
                    <div className="h-3 w-1/3 bg-[var(--foreground)] rounded" />
                    <div className="h-4 w-3/4 bg-[var(--foreground)] rounded" />
                    <div className="h-3 w-1/2 bg-[var(--foreground)] rounded" />
                  </div>
                  <div className="h-9 w-full bg-[var(--foreground)]/50 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Embla Carousel Viewport */
          <div
            ref={emblaRef}
            onClickCapture={onClickCapture}
            className="overflow-hidden -mx-4 px-4 sm:-mx-0 sm:px-0 cursor-grab active:cursor-grabbing select-none touch-pan-y"
          >
            <div className="flex gap-3 lg:gap-4">
              {centers.map((center, index) => (
                <div
                  key={center.id}
                  role="group"
                  aria-roledescription="slide"
                  aria-label={`${index + 1} از ${centers.length}`}
                  className="shrink-0 grow-0 min-w-0 w-[232px] sm:w-[248px] lg:w-[calc((100%-3*16px)/4)]"
                >
                  <DiscountedGamecenterCard center={center} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
