"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Autoplay from "embla-carousel-autoplay";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselPrevious,
  CarouselNext,
  type CarouselApi,
} from "@/components/ui/carousel";
import { BannerItem } from "@/types/home";

const DEFAULT_ASPECT = "aspect-[2/1] sm:aspect-[2.4/1] lg:aspect-[3.2/1]";

export interface BannerSliderProps {
  banners?: BannerItem[];
  isLoading?: boolean;
  autoplayDelay?: number;
  className?: string;
  /** کلاس‌های aspect-ratio اسلاید؛ برای گالری صفحه جزئیات کوتاه‌تر می‌شود */
  aspectClassName?: string;
  ariaLabel?: string;
}

const toPersianDigits = (num: number | string): string => {
  return String(num).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d, 10)]);
};

export const BannerSlider: React.FC<BannerSliderProps> = ({
  banners = [],
  isLoading = false,
  autoplayDelay = 5000,
  className = "",
  aspectClassName = DEFAULT_ASPECT,
  ariaLabel = "بنرهای تبلیغاتی",
}) => {
  const [failedBannerIds, setFailedBannerIds] = useState<string[]>([]);
  const [api, setApi] = useState<CarouselApi>();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  // Filter out failed banners
  const validBanners = useMemo(() => {
    return banners.filter((b) => !failedBannerIds.includes(b.id));
  }, [banners, failedBannerIds]);

  const slidesCount = validBanners.length;

  const handleImageError = useCallback((id: string) => {
    setFailedBannerIds((prev) => [...prev, id]);
  }, []);

  const autoplayPlugin = useMemo(() => {
    return Autoplay({
      delay: autoplayDelay,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    });
  }, [autoplayDelay]);

  const emblaOptions = useMemo(() => {
    const isSingle = slidesCount <= 1;
    return {
      loop: slidesCount >= 3,
      rewind: slidesCount === 2,
      direction: "rtl" as const,
      align: "start" as const,
      duration: 30,
      dragFree: false,
      skipSnaps: false,
      containScroll: false as const,
      watchDrag: !isSingle,
    };
  }, [slidesCount]);

  const plugins = useMemo(() => {
    if (slidesCount <= 1) return [];
    return [autoplayPlugin];
  }, [slidesCount, autoplayPlugin]);

  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      setSelectedIndex(api.selectedScrollSnap());
    };

    api.on("select", handleSelect);
    api.on("reInit", handleSelect);

    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api]);

  // Reduced motion support
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const autoplay = api?.plugins()?.autoplay;
      if (autoplay) {
        autoplay.stop();
        queueMicrotask(() => setIsPlaying(false));
      }
    }
  }, [api]);

  // Visibility change handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      const autoplay = api?.plugins()?.autoplay;
      if (!autoplay) return;
      if (document.hidden) {
        autoplay.stop();
      } else if (isPlaying) {
        autoplay.play();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [api, isPlaying]);

  const toggleAutoplay = useCallback(() => {
    const autoplay = api?.plugins()?.autoplay;
    if (!autoplay) return;

    if (autoplay.isPlaying()) {
      autoplay.stop();
      setIsPlaying(false);
    } else {
      autoplay.play();
      setIsPlaying(true);
    }
  }, [api]);

  const scrollTo = useCallback(
    (index: number) => {
      if (api) api.scrollTo(index);
    },
    [api]
  );

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (!api) return;
      const apiWithClickAllowed = api as unknown as { clickAllowed?: () => boolean };
      if (typeof apiWithClickAllowed.clickAllowed === "function" && !apiWithClickAllowed.clickAllowed()) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [api]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`w-full rounded-card overflow-hidden bg-[var(--bg-card)] animate-pulse ${aspectClassName} ${className}`} />
    );
  }

  // Empty state or all failed
  if (slidesCount === 0) {
    return null;
  }

  return (
    <div
      aria-label={ariaLabel}
      aria-live={isPlaying ? "off" : "polite"}
      className={`relative group/slider rounded-card ${className}`}
    >
      <Carousel
        setApi={setApi}
        opts={emblaOptions}
        plugins={plugins}
        className="w-full rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <div onClickCapture={handleContainerClick} className="rounded-card overflow-hidden cursor-grab active:cursor-grabbing select-none">
          <CarouselContent className="-mr-3 lg:-mr-4">
            {validBanners.map((item, index) => {
              const href = item.href;
              const isExternal = href ? /^https?:\/\//.test(href) : false;

              const slideContent = (
                <picture className="block w-full h-full">
                  {item.desktopImageUrl && (
                    <source media="(min-width: 1024px)" srcSet={item.desktopImageUrl} />
                  )}
                  <img
                    src={item.imageUrl}
                    alt={item.alt}
                    draggable={false}
                    onError={() => handleImageError(item.id)}
                    loading={index === 0 ? "eager" : "lazy"}
                    {...(index === 0 ? ({ fetchPriority: "high" } as React.ImgHTMLAttributes<HTMLImageElement>) : { decoding: "async" })}
                    className="w-full h-full object-cover select-none pointer-events-none"
                  />
                </picture>
              );

              let framed: React.ReactNode;
              if (!href) {
                framed = <div className="block w-full h-full">{slideContent}</div>;
              } else if (isExternal) {
                framed = (
                  <a
                    href={href}
                    target={item.openInNewTab !== false ? "_blank" : "_self"}
                    rel="noopener noreferrer"
                    aria-label={item.alt}
                    className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {slideContent}
                  </a>
                );
              } else {
                framed = (
                  <Link
                    href={href}
                    aria-label={item.alt}
                    className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    {slideContent}
                  </Link>
                );
              }

              return (
                <CarouselItem
                  key={item.id}
                  aria-label={`${toPersianDigits(index + 1)} از ${toPersianDigits(slidesCount)}`}
                  className="basis-[92%] sm:basis-[80%] lg:basis-full pr-3 lg:pr-4"
                >
                  <div className={`rounded-card overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] w-full ${aspectClassName}`}>
                    {framed}
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </div>

        {/* Desktop Side Navigation Arrows */}
        {slidesCount > 1 && (
          <div className="hidden lg:block pointer-events-none">
            <CarouselNext
              aria-label="بنر بعدی"
              className="pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--bg-body)]/70 backdrop-blur border border-[var(--border-color)] text-[var(--text-white)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all duration-300 opacity-0 group-hover/slider:opacity-100 group-focus-within/slider:opacity-100 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white focus-visible:opacity-100 z-10"
            />
            <CarouselPrevious
              aria-label="بنر قبلی"
              className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--bg-body)]/70 backdrop-blur border border-[var(--border-color)] text-[var(--text-white)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all duration-300 opacity-0 group-hover/slider:opacity-100 group-focus-within/slider:opacity-100 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white focus-visible:opacity-100 z-10"
            />
          </div>
        )}
      </Carousel>

      {/* Pagination Dots & Play/Pause Controls */}
      {slidesCount > 1 && (
        <div className="mt-3 absolute bottom-2 left-0 right-0 flex items-center justify-center gap-2">
          {/* Play/Pause Toggle Button */}
          <button
            type="button"
            onClick={toggleAutoplay}
            aria-label={isPlaying ? "توقف پخش خودکار" : "شروع پخش خودکار"}
            className="w-6 h-6 flex items-center justify-center text-[var(--text-subtle)] hover:text-[var(--text-white)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
          >
            {isPlaying ? (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Dots */}
          <div className="flex items-center gap-1.5">
            {validBanners.map((_, index) => {
              const isActive = index === selectedIndex;
              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollTo(index)}
                  aria-label={`رفتن به بنر ${toPersianDigits(index + 1)}`}
                  aria-current={isActive ? "true" : "false"}
                  className={`h-1.5 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${
                    isActive
                      ? "w-5 bg-[var(--primary)]"
                      : "w-1.5 bg-[var(--foreground)] hover:bg-[var(--text-subtle)]"
                  }`}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};