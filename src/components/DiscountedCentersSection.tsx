"use client";

import React, { useState, useEffect, useCallback } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { DiscountedCenter } from "@/types/home";
import { homeService } from "@/services/homeService";
import { DiscountedGamecenterCard } from "./DiscountedGamecenterCard";

export interface DiscountedCentersSectionProps {
  city?: string;
  className?: string;
}

export const DiscountedCentersSection: React.FC<DiscountedCentersSectionProps> = ({
  city,
  className = "",
}) => {
  const [items, setItems] = useState<DiscountedCenter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const isSingleCard = items.length === 1;

  const [emblaRef, emblaApi] = useEmblaCarousel({
    direction: "rtl",
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll: "auto",
    dragFree: false,
    loop: false,
    duration: 28,
    watchDrag: !isSingleCard,
  });

  useEffect(() => {
    if (!emblaApi) return;

    const updateScrollState = () => {
      setCanScrollPrev(emblaApi.canScrollPrev());
      setCanScrollNext(emblaApi.canScrollNext());
    };

    queueMicrotask(updateScrollState);

    emblaApi.on("select", updateScrollState);
    emblaApi.on("reInit", updateScrollState);

    return () => {
      emblaApi.off("select", updateScrollState);
      emblaApi.off("reInit", updateScrollState);
    };
  }, [emblaApi]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDiscountedCenters() {
      try {
        setIsLoading(true);
        const data = await homeService.getDiscountedCenters({
          city,
          signal: controller.signal,
        });
        setItems(data);
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          setItems([]);
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchDiscountedCenters();

    return () => {
      controller.abort();
    };
  }, [city]);

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const handleContainerClickCapture = useCallback(
    (e: React.MouseEvent) => {
      const emblaWithClickAllowed = emblaApi as unknown as { clickAllowed?: () => boolean };
      if (emblaWithClickAllowed?.clickAllowed && !emblaWithClickAllowed.clickAllowed()) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [emblaApi]
  );

  // If not loading and no items found (empty or error), do not render the section
  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="discounted-centers-heading"
      className={`flex flex-col gap-3 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-[var(--primary)] shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <h2
              id="discounted-centers-heading"
              className="font-extrabold text-base text-[var(--text-white)]"
            >
              گیمنت‌های تخفیف‌دار
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] pr-7">رزرو با قیمت ویژه</p>
        </div>

        {/* Arrow Navigation (Desktop/Tablet sm: and up, hidden on mobile or if single card) */}
        {!isSingleCard && !isLoading ? (
          <div className="hidden sm:flex items-center gap-1 bg-[var(--bg-card)] rounded-lg p-0.5 border border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              className="w-7 h-7 rounded bg-[var(--foreground)]/60 text-[var(--text-white)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-[#101014] transition-colors disabled:opacity-30 disabled:pointer-events-none"
              aria-label="گیمنت‌های قبلی"
              title="قبلی"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={scrollNext}
              disabled={!canScrollNext}
              className="w-7 h-7 rounded bg-[var(--foreground)]/60 text-[var(--text-white)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-[#101014] transition-colors disabled:opacity-30 disabled:pointer-events-none"
              aria-label="گیمنت‌های بعدی"
              title="بعدی"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>

      {/* Carousel Container */}
      {isLoading ? (
        <div className="flex gap-3 lg:gap-4 overflow-hidden -mx-4 px-4 pb-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={idx}
              className="animate-pulse bg-[var(--bg-card)] rounded-card border border-[var(--border-subtle)] h-[280px] w-[232px] min-w-[232px] shrink-0 sm:w-[248px] sm:min-w-[248px] lg:w-[calc((100%-48px)/4)] lg:min-w-[calc((100%-48px)/4)]"
            />
          ))}
        </div>
      ) : (
        <div
          ref={emblaRef}
          onClickCapture={handleContainerClickCapture}
          className="overflow-hidden -mx-4 px-4 pb-2 touch-pan-y cursor-grab active:cursor-grabbing select-none"
          role="region"
          aria-roledescription="carousel"
          aria-label="گیمنت‌های تخفیف‌دار"
        >
          <div className="flex gap-3 lg:gap-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="w-[232px] min-w-[232px] shrink-0 sm:w-[248px] sm:min-w-[248px] lg:w-[calc((100%-48px)/4)] lg:min-w-[calc((100%-48px)/4)] flex flex-col"
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} از ${items.length}`}
              >
                <DiscountedGamecenterCard center={item} />
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
