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
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import type { BlogPostSummary } from "@/types/blog";

const HERO_ASPECT = "aspect-[4/3] sm:aspect-[2.2/1] lg:aspect-[3.2/1]";

/**
 * اسلایدر مقاله‌های داغ و برگزیده (is_hot = true)
 * طراحی‌شده بر اساس دیزاین سیستم سایرا
 */
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

  // در صورت خطا یا نبود مقاله داغ، اسلایدر پنهان می‌شود
  if (failed || (posts && posts.length === 0)) return null;

  if (!posts) {
    return (
      <div aria-busy="true" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-8 w-24" />
        </div>
        <Skeleton className={`w-full rounded-card ${HERO_ASPECT}`} />
      </div>
    );
  }

  const count = posts.length;

  return (
    <section
      aria-label="مقاله‌های داغ و برگزیده"
      className="flex flex-col gap-3"
    >
      <Carousel
        setApi={setApi}
        opts={{
          direction: "rtl",
          align: "start",
          loop: count >= 3,
          duration: 28,
          watchDrag: count > 1,
        }}
        className="flex w-full flex-col gap-3"
      >
        {/* هدر اسلایدر مطالب داغ */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-card border border-[var(--primary)]/30 bg-[var(--primary-muted)] text-[var(--primary)]">
              <Icon name="star" size={16} filled />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-section-title text-[var(--text-white)]">
                  داغ‌ترین مطالب وبلاگ
                </h2>
                <Badge variant="primary">ویژه</Badge>
              </div>
              <p className="text-secondary text-[var(--text-muted)]">
                منتخب مقاله‌های داغ و پرمخاطب سایرا
              </p>
            </div>
          </div>

          {count > 1 && (
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-1 text-xs font-bold text-[var(--text-muted)] sm:inline-flex">
                {toPersianDigits(selected + 1)} از {toPersianDigits(count)}
              </span>
              <div className="hidden items-center gap-1.5 sm:flex">
                <CarouselPrevious
                  aria-label="مقاله‌ی قبلی"
                  className="static h-11 w-11 translate-x-0 translate-y-0 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-on-primary disabled:pointer-events-none disabled:opacity-30"
                />
                <CarouselNext
                  aria-label="مقاله‌ی بعدی"
                  className="static h-11 w-11 translate-x-0 translate-y-0 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-on-primary disabled:pointer-events-none disabled:opacity-30"
                />
              </div>
            </div>
          )}
        </div>

        {/* بدنه اسلایدر */}
        <div
          onClickCapture={handleClickCapture}
          className="select-none overflow-hidden rounded-card"
        >
          <CarouselContent className="-mr-3 lg:-mr-4">
            {posts.map((post, index) => (
              <CarouselItem
                key={post.id}
                aria-label={`${toPersianDigits(index + 1)} از ${toPersianDigits(count)}`}
                className="basis-[94%] pr-3 sm:basis-[88%] lg:basis-full lg:pr-4"
              >
                <Link
                  href={`/blog/${post.slug}`}
                  className={`group relative block w-full overflow-hidden rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] transition-colors hover:border-[var(--primary)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white ${HERO_ASPECT}`}
                >
                  <SafeImage
                    src={post.coverUrl}
                    alt={post.title || ""}
                    draggable={false}
                    loading={index === 0 ? "eager" : "lazy"}
                    fallbackSrc={PLACEHOLDERS.banner}
                    className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />

                  {/* لایه گرادیان منطبق با جهت RTL برای خوانایی کامل متن */}
                  <div className="absolute inset-0 bg-linear-to-t from-[var(--bg-body)] via-[var(--bg-body)]/75 to-transparent" />
                  <div className="hidden lg:block absolute inset-0 bg-linear-to-l from-[var(--bg-body)]/95 via-[var(--bg-body)]/65 to-transparent" />

                  {/* نشان بالا سمت چپ */}
                  {typeof post.viewsCount === "number" && post.viewsCount > 0 && (
                    <div className="absolute left-4 top-4 hidden items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-body)]/80 px-3 py-1.5 text-xs font-bold text-[var(--text-white)] backdrop-blur-sm sm:flex">
                      <Icon name="star" size={16} className="text-[var(--accent-star)]" filled />
                      <span>{toPersianDigits(post.viewsCount)} بازدید</span>
                    </div>
                  )}

                  {/* محتوای کارت اسلاید */}
                  <div className="absolute inset-x-0 bottom-0 flex max-w-[720px] flex-col gap-2.5 p-4 sm:p-6 lg:p-8">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="primary" className="gap-1">
                        <Icon name="star" size={16} filled />
                        <span>مقاله داغ</span>
                      </Badge>
                      <Badge variant="neutral">{post.categoryLabel}</Badge>
                      {post.tags.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="hidden rounded-full border border-[var(--border-color)] bg-[var(--bg-body)]/70 px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] sm:inline-flex"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <h3 className="line-clamp-2 text-base font-bold leading-7 text-[var(--text-white)] transition-colors group-hover:text-[var(--primary)] sm:text-lg lg:text-2xl lg:leading-9">
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p className="hidden line-clamp-2 text-xs leading-6 text-[var(--text-muted)] sm:block lg:text-sm">
                        {post.excerpt}
                      </p>
                    )}

                    <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)]/80 pt-3 text-xs text-[var(--text-muted)]">
                      <div className="flex flex-wrap items-center gap-4">
                        {post.authorName && (
                          <span className="flex items-center gap-1.5 font-medium text-[var(--text-white)]">
                            <Icon name="user" size={16} className="text-[var(--primary)]" />
                            <span>{post.authorName}</span>
                          </span>
                        )}
                        {post.publishedAt && (
                          <span className="flex items-center gap-1.5">
                            <Icon name="calendar" size={16} />
                            <span>{formatBlogDate(post.publishedAt)}</span>
                          </span>
                        )}
                        <span className="flex items-center gap-1.5">
                          <Icon name="clock" size={16} />
                          <span>{formatReadingMinutes(post.readingMinutes)} مطالعه</span>
                        </span>
                      </div>

                      <span className="hidden items-center gap-1.5 text-xs font-bold text-[var(--primary)] lg:inline-flex">
                        <span>مطالعه مقاله</span>
                        <Icon name="arrow-left" size={16} />
                      </span>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
        </div>
      </Carousel>

      {/* نشانگر نقاط اسلایدر */}
      {count > 1 && (
        <div className="flex items-center justify-center gap-1">
          {posts.map((post, index) => {
            const active = index === selected;
            return (
              <button
                key={post.id}
                type="button"
                onClick={() => api?.scrollTo(index)}
                aria-label={`رفتن به مقاله‌ی ${toPersianDigits(index + 1)}`}
                aria-current={active ? "true" : undefined}
                className="flex h-8 w-8 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <span
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    active
                      ? "w-6 bg-[var(--primary)]"
                      : "w-2 bg-[var(--foreground)] hover:bg-[var(--text-muted)]"
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
