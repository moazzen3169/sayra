"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { BannerItem } from "@/types/home";

export interface BannerSliderProps {
  banners?: BannerItem[];
  isLoading?: boolean;
  autoplayDelay?: number;
  className?: string;
}

const toPersianDigits = (num: number | string): string => {
  return String(num).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[parseInt(d, 10)]);
};

export const BannerSlider: React.FC<BannerSliderProps> = ({
  banners = [],
  isLoading = false,
  autoplayDelay = 5000,
  className = "",
}) => {
  const [failedBannerIds, setFailedBannerIds] = useState<string[]>([]);
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

  const [emblaRef, emblaApi] = useEmblaCarousel(emblaOptions, plugins);

  useEffect(() => {
    if (!emblaApi) return;

    const handleSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    };

    emblaApi.on("select", handleSelect);
    emblaApi.on("reInit", handleSelect);

    return () => {
      emblaApi.off("select", handleSelect);
      emblaApi.off("reInit", handleSelect);
    };
  }, [emblaApi]);

  // Reduced motion support
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const autoplay = emblaApi?.plugins()?.autoplay;
      if (autoplay) {
        autoplay.stop();
        queueMicrotask(() => setIsPlaying(false));
      }
    }
  }, [emblaApi]);

  // Visibility change handling
  useEffect(() => {
    const handleVisibilityChange = () => {
      const autoplay = emblaApi?.plugins()?.autoplay;
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
  }, [emblaApi, isPlaying]);

  const toggleAutoplay = useCallback(() => {
    const autoplay = emblaApi?.plugins()?.autoplay;
    if (!autoplay) return;

    if (autoplay.isPlaying()) {
      autoplay.stop();
      setIsPlaying(false);
    } else {
      autoplay.play();
      setIsPlaying(true);
    }
  }, [emblaApi]);

  const scrollTo = useCallback(
    (index: number) => {
      if (emblaApi) emblaApi.scrollTo(index);
    },
    [emblaApi]
  );

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent) => {
      if (!emblaApi) return;
      const apiWithClickAllowed = emblaApi as unknown as { clickAllowed?: () => boolean };
      if (typeof apiWithClickAllowed.clickAllowed === "function" && !apiWithClickAllowed.clickAllowed()) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [emblaApi]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scrollNext();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scrollPrev();
      }
    },
    [scrollNext, scrollPrev]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className={`w-full rounded-card overflow-hidden bg-[var(--bg-card)] animate-pulse aspect-[2/1] sm:aspect-[2.4/1] lg:aspect-[3.2/1] ${className}`} />
    );
  }

  // Empty state or all failed
  if (slidesCount === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="بنرهای تبلیغاتی"
      aria-live={isPlaying ? "off" : "polite"}
      onKeyDown={handleKeyDown}
      className={`relative group/slider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white rounded-card ${className}`}
      tabIndex={0}
    >
      {/* Carousel Viewport */}
      <div
        ref={emblaRef}
        onClickCapture={handleContainerClick}
        className="overflow-hidden rounded-card cursor-grab active:cursor-grabbing select-none"
      >
        <div className="flex -mr-3 lg:-mr-4 [will-change:transform]">
          {validBanners.map((item, index) => {
            const isExternal = /^https?:\/\//.test(item.href);

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

            return (
              <div
                key={item.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${toPersianDigits(index + 1)} از ${toPersianDigits(slidesCount)}`}
                className="flex-none w-[92%] sm:w-[80%] lg:w-full pr-3 lg:pr-4"
              >
                <div className="rounded-card overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-card)] aspect-[2/1] sm:aspect-[2.4/1] lg:aspect-[3.2/1] w-full">
                  {isExternal ? (
                    <a
                      href={item.href}
                      target={item.openInNewTab !== false ? "_blank" : "_self"}
                      rel="noopener noreferrer"
                      aria-label={item.alt}
                      className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {slideContent}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      aria-label={item.alt}
                      className="block w-full h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      {slideContent}
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Navigation Arrows (Desktop >= 1024px only) */}
      {slidesCount > 1 && (
        <div className="hidden lg:block pointer-events-none">
          {/* Next slide arrow (Left side in RTL) */}
          <button
            type="button"
            onClick={scrollNext}
            aria-label="بنر بعدی"
            className="pointer-events-auto absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--bg-body)]/70 backdrop-blur border border-[var(--border-color)] text-[var(--text-white)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all duration-300 opacity-0 group-hover/slider:opacity-100 group-focus-within/slider:opacity-100 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white focus-visible:opacity-100 z-10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Previous slide arrow (Right side in RTL) */}
          <button
            type="button"
            onClick={scrollPrev}
            aria-label="بنر قبلی"
            className="pointer-events-auto absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-[var(--bg-body)]/70 backdrop-blur border border-[var(--border-color)] text-[var(--text-white)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all duration-300 opacity-0 group-hover/slider:opacity-100 group-focus-within/slider:opacity-100 flex items-center justify-center focus-visible:ring-2 focus-visible:ring-white focus-visible:opacity-100 z-10"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}

      {/* Pagination Dots & Play/Pause Controls */}
      {slidesCount > 1 && (
        <div className="mt-3 flex items-center justify-center gap-2">
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
