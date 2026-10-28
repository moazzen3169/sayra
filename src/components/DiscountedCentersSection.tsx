"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
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
  const [api, setApi] = useState<CarouselApi>();

  const isSingleCard = items.length === 1;

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

  const handleContainerClickCapture = useCallback(
    (e: React.MouseEvent) => {
      const emblaWithClickAllowed = api as unknown as { clickAllowed?: () => boolean };
      if (emblaWithClickAllowed?.clickAllowed && !emblaWithClickAllowed.clickAllowed()) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [api]
  );

  // If not loading and no items found (empty or error), do not render the section
  if (!isLoading && items.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="discounted-centers-heading"
      className={`flex  rounded-card flex-col gap-3 p-4 bg-primary ${className}`}
    >
      <Carousel
        setApi={setApi}
        opts={{
          direction: "rtl",
          align: "start",
          containScroll: "trimSnaps",
          slidesToScroll: "auto",
          dragFree: false,
          loop: false,
          duration: 28,
          watchDrag: !isSingleCard,
        }}
        className="w-full flex flex-col gap-3"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <svg
                className="w-5 h-5 text-[var(--text-black)] shrink-0"
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
                className="font-black text-base text-[var(--text-black)]"
              >
                گیمنت‌های تخفیف‌دار
              </h2>
            </div>
            <p className="text-xs text-[var(--text-black)] pr-7">رزرو با قیمت ویژه</p>
          </div>

          {/* Navigation Arrows (Desktop/Tablet sm: and up, hidden on mobile or if single card) */}
          {!isSingleCard && !isLoading ? (
            <div className=" flex items-center gap-1 relative h-8  bg-[var(--bg-card)] rounded-lg p-0.5 border border-[var(--border-subtle)]">
              <CarouselPrevious
                className="static translate-y-0 translate-x-0 w-7 h-7 rounded bg-[var(--foreground)]/60 border-none text-[var(--text-white)] hover:bg-[var(--primary)] hover:text-on-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title="قبلی"
              />
              <CarouselNext
                className="static translate-y-0 translate-x-0 w-7 h-7 rounded bg-[var(--foreground)]/60 border-none text-[var(--text-white)] hover:bg-[var(--primary)] hover:text-on-primary transition-colors disabled:opacity-30 disabled:pointer-events-none"
                title="بعدی"
              />
            </div>
          ) : null}
        </div>

        {/* Carousel Container */}
        {isLoading ? (
          <div className="flex gap-2 overflow-hidden -mx-4 px-4 pb-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse bg-[var(--bg-card)] rounded-card border border-[var(--border-subtle)] h-[280px] w-[220px] min-w-[220px] shrink-0 sm:w-[240px] sm:min-w-[240px] lg:w-[calc((100%-24px)/4)] lg:min-w-[calc((100%-24px)/4)]"
              />
            ))}
          </div>
        ) : (
          <div onClickCapture={handleContainerClickCapture} className="-mx-4 px-4 pb-2 select-none">
            <CarouselContent className="gap-2 -mr-2">
              {items.map((item, index) => (
                <CarouselItem
                  key={item.id}
                  aria-label={`${index + 1} از ${items.length}`}
                  className="pr-2 basis-[220px] sm:basis-[240px] lg:basis-[calc((100%-24px)/4)] flex flex-col min-w-[220px] sm:min-w-[240px]"
                >
                  <DiscountedGamecenterCard center={item} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </div>
        )}
      </Carousel>
    </section>
  );
};
