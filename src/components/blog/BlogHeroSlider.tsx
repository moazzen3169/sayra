"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { isAbortError } from "@/lib/api/client";
import { formatBlogDate, formatReadingMinutes } from "@/lib/blog";
import { toPersianDigits } from "@/lib/format";
import { blogService } from "@/services/blogService";
import type { BlogPostSummary } from "@/types/blog";

const ASPECT = "aspect-[4/3] sm:aspect-[2/1] lg:aspect-[3/1]";

/** اسلایدر مقاله‌های برگزیده؛ بدون پخش خودکار */
export const BlogHeroSlider: React.FC = () => {
  const [posts, setPosts] = useState<BlogPostSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    blogService
      .getFeatured(controller.signal)
      .then(setPosts)
      .catch((e) => {
        if (!isAbortError(e)) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setSelected(api.selectedScrollSnap());
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api]);

  // جلوگیری از کلیک ناخواسته بعد از درگ
  const handleClickCapture = useCallback(
    (e: React.MouseEvent) => {
      const embla = api as unknown as { clickAllowed?: () => boolean } | undefined;
      if (embla?.clickAllowed && !embla.clickAllowed()) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    [api]
  );

  // بخش اختیاری است؛ در خطا یا خالی بودن پنهان می‌شود
  if (failed || (posts && posts.length === 0)) return null;

  if (!posts) {
    return (
      <div aria-busy="true">
        <Skeleton className={`w-full ${ASPECT}`} />
      </div>
    );
  }

  const count = posts.length;
  const arrowCls =
    "hidden lg:flex w-11 h-11 bg-[var(--bg-body)]/80 backdrop-blur";

  return (
    <section aria-label="مقاله‌های برگزیده" className="flex flex-col gap-3">
      <Carousel
        setApi={setApi}
        opts={{
          direction: "rtl",
          align: "start",
          loop: count >= 3,
          duration: 28,
          watchDrag: count > 1,
        }}
        className="w-full"
      >
        <div
          onClickCapture={handleClickCapture}
          className="select-none overflow-hidden rounded-card"
        >
          <CarouselContent className="-mr-3 lg:-mr-4">
            {posts.map((post, index) => (
              <CarouselItem
                key={post.id}
                aria-label={`${toPersianDigits(index + 1)} از ${toPersianDigits(count)}`}
                className="basis-[92%] pr-3 sm:basis-[80%] lg:basis-full lg:pr-4"
              >
                <div
                  className={`relative w-full overflow-hidden rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] ${ASPECT}`}
                >
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group absolute inset-0 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  >
                    <img
                      src={post.coverUrl}
                      alt=""
                      draggable={false}
                      loading={index === 0 ? "eager" : "lazy"}
                      className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-[var(--bg-body)] via-[var(--bg-body)]/60 to-transparent" />

                    <div className="absolute inset-x-0 bottom-0 flex max-w-[640px] flex-col gap-2 p-4 lg:p-6">
                      <Badge variant="neutral" className="self-start">
                        {post.categoryLabel}
                      </Badge>
                      <h2 className="line-clamp-2 text-base font-bold leading-7 text-[var(--text-white)] lg:text-xl lg:leading-8">
                        {post.title}
                      </h2>
                      <p className="hidden line-clamp-2 text-xs leading-5 text-[var(--text-muted)] sm:block">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                        <span>{formatBlogDate(post.publishedAt)}</span>
                        <span className="flex items-center gap-1">
                          <Icon name="clock" size={16} />
                          {formatReadingMinutes(post.readingMinutes)}
                        </span>
                      </div>
                    </div>
                  </Link>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>

        {count > 1 && (
          <>
            <CarouselPrevious aria-label="مقاله‌ی قبلی" className={arrowCls} />
            <CarouselNext aria-label="مقاله‌ی بعدی" className={arrowCls} />
          </>
        )}
      </Carousel>

      {count > 1 && (
        <div className="flex items-center justify-center">
          {posts.map((post, index) => {
            const active = index === selected;
            return (
              <button
                key={post.id}
                type="button"
                onClick={() => api?.scrollTo(index)}
                aria-label={`رفتن به مقاله‌ی ${toPersianDigits(index + 1)}`}
                aria-current={active ? "true" : undefined}
                className="flex h-6 w-6 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    active
                      ? "w-5 bg-[var(--primary)]"
                      : "w-1.5 bg-[var(--foreground)]"
                  }`}
                />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};