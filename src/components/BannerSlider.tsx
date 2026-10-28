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
  /** نمایش دکمه بزرگنمایی */
  enableZoom?: boolean;
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
  const [isFullscreenOpen, setIsFullscreenOpen] = useState(false);
  const [fullscreenApi, setFullscreenApi] = useState<CarouselApi>();
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

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

  useEffect(() => {
    if (!fullscreenApi) return;

    const handleSelect = () => {
      setFullscreenIndex(fullscreenApi.selectedScrollSnap());
    };

    fullscreenApi.on("select", handleSelect);
    fullscreenApi.on("reInit", handleSelect);

    return () => {
      fullscreenApi.off("select", handleSelect);
      fullscreenApi.off("reInit", handleSelect);
    };
  }, [fullscreenApi]);

  // Handle ESC key for closing fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreenOpen) {
        setIsFullscreenOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreenOpen]);

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
      {/* Zoom / Expand Button */}
      {slidesCount > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFullscreenIndex(selectedIndex);
            setIsFullscreenOpen(true);
          }}
          aria-label="بزرگنمایی تصویر"
          title="بزرگنمایی تصویر"
          className="absolute bottom-3 right-3 z-20 w-9 h-9 rounded-full bg-[var(--bg-body)]/75 backdrop-blur-md border border-[var(--border-color)] text-[var(--text-white)] hover:text-[var(--primary)] hover:border-[var(--primary)] transition-all flex items-center justify-center active:scale-95 shadow-lg"
        >

<svg
  xmlns="http://www.w3.org/2000/svg"
  width="24"
  height="24"
  viewBox="0 0 24 24"
  fill="none"
  stroke="white"
  stroke-width="1"
  stroke-linecap="round"
  stroke-linejoin="round"
>
  <path d="M4 8v-2a2 2 0 0 1 2 -2h2" />
  <path d="M4 16v2a2 2 0 0 0 2 2h2" />
  <path d="M16 4h2a2 2 0 0 1 2 2v2" />
  <path d="M16 20h2a2 2 0 0 0 2 -2v-2" />
</svg>

        </button>
      )}

      <Carousel
        setApi={setApi}
        opts={emblaOptions}
        plugins={plugins}
        className="w-full  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
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

      {/* Fullscreen Slider Modal */}
      {isFullscreenOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 animate-fadeIn">
          {/* Top Bar */}
          <div className="flex items-center justify-between z-10 px-2 py-1 max-w-[1200px] w-full mx-auto">
            <span className="text-sm font-black text-[var(--text-white)] bg-[var(--bg-card)]/80 px-3 py-1.5 rounded-full border border-[var(--border-subtle)]">
              {toPersianDigits(fullscreenIndex + 1)} از {toPersianDigits(slidesCount)}
            </span>
            <button
              type="button"
              onClick={() => setIsFullscreenOpen(false)}
              aria-label="بستن بزرگنمایی"
              className="w-10 h-10 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-white)] hover:text-[var(--primary)] hover:border-[var(--primary)] flex items-center justify-center transition-all active:scale-95"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Center Image Carousel */}
          <div className="flex-1 flex items-center justify-center relative w-full my-auto max-w-[1200px] mx-auto overflow-hidden">
            <Carousel
              setApi={setFullscreenApi}
              opts={{
                loop: slidesCount >= 2,
                direction: "rtl",
                startIndex: selectedIndex,
              }}
              className="w-full h-full flex items-center justify-center"
            >
              <CarouselContent className="h-full flex items-center">
                {validBanners.map((item) => (
                  <CarouselItem key={item.id} className="basis-full h-full flex items-center justify-center p-2">
                    <img
                      src={item.imageUrl}
                      alt={item.alt}
                      draggable={false}
                      className="h-[95vh] w-full max-w-[1100px] object-contain select-none rounded-card border border-[var(--border-subtle)] shadow-2xl"
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>

              {slidesCount > 1 && (
                <>
                  <CarouselNext
                    aria-label="تصویر بعدی"
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[var(--bg-card)]/80 backdrop-blur border border-[var(--border-color)] text-[var(--text-white)] hover:text-[var(--primary)] hover:border-[var(--primary)] flex items-center justify-center z-20"
                  />
                  <CarouselPrevious
                    aria-label="تصویر قبلی"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[var(--bg-card)]/80 backdrop-blur border border-[var(--border-color)] text-[var(--text-white)] hover:text-[var(--primary)] hover:border-[var(--primary)] flex items-center justify-center z-20"
                  />
                </>
              )}
            </Carousel>
          </div>

          {/* Bottom Thumbnails / Dots indicator */}
          {slidesCount > 1 && (
            <div className="flex items-center justify-center gap-1.5 py-2 z-10">
              {validBanners.map((_, index) => {
                const isActive = index === fullscreenIndex;
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() => fullscreenApi?.scrollTo(index)}
                    aria-label={`رفتن به تصویر ${toPersianDigits(index + 1)}`}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? "w-6 bg-[var(--primary)]"
                        : "w-2 bg-[var(--foreground)] hover:bg-[var(--text-subtle)]"
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};