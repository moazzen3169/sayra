"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BlogArticleContent,
  extractArticleHeadings,
} from "@/components/blog/BlogArticleContent";
import { ArticleGamingCentersSection } from "@/components/blog/ArticleGamingCentersSection";
import type { ArticleGamingCentersSectionData } from "@/types/blog";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { BottomBar } from "@/components/BottomBar";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError, isAbortError } from "@/lib/api/client";
import {
  DEFAULT_BLOG_SORT,
  formatBlogDate,
  formatReadingMinutes,
} from "@/lib/blog";
import { toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { blogService } from "@/services/blogService";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import type {
  BlogCategory,
  BlogPostDetail,
  BlogPostSummary,
  BlogSeries,
  BlogSort,
  BlogTag,
} from "@/types/blog";

interface DetailState {
  key: string;
  post?: BlogPostDetail;
  error?: string;
  notFound?: boolean;
}

interface RelatedState {
  slug: string;
  items: BlogPostSummary[];
}

type ShareState = "idle" | "copied" | "failed";

const MetaItem: React.FC<{
  icon: "user" | "calendar" | "clock" | "star";
  text: string;
  highlight?: boolean;
}> = ({ icon, text, highlight = false }) => (
  <span
    className={`inline-flex items-center gap-1.5 ${
      highlight ? "font-semibold text-[var(--text-white)]" : "text-[var(--text-muted)]"
    }`}
  >
    <Icon
      name={icon}
      size={15}
      className={highlight ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}
    />
    <span>{text}</span>
  </span>
);

const DetailSkeleton: React.FC = () => (
  <div aria-busy="true" className="flex flex-col gap-6">
    <div className="flex flex-col gap-3">
      <Skeleton className="h-6 w-20" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
    <Skeleton className="aspect-[16/9] w-full" />
    <div className="flex flex-col gap-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  </div>
);

export const BlogPostView: React.FC<{
  slug: string;
  initialPost?: BlogPostDetail;
  gamingCentersSection?: ArticleGamingCentersSectionData | null;
}> = ({ slug, initialPost, gamingCentersSection }) => {
  const decodedSlug = decodeURIComponent(slug);

  const router = useRouter();
  const [reload, setReload] = useState(0);
  const key = `${decodedSlug}|${reload}`;
  const [state, setState] = useState<DetailState | null>(
    initialPost
      ? {
          key: `${decodedSlug}|0`,
          post: initialPost,
        }
      : null
  );
  const [related, setRelated] = useState<RelatedState | null>(null);
  const [shareState, setShareState] = useState<ShareState>("idle");
  const [readProgress, setReadProgress] = useState(0);
  const [sidebarQuery, setSidebarQuery] = useState("");
  const [categories, setCategories] = useState<BlogCategory[] | null>(null);
  const [seriesList, setSeriesList] = useState<BlogSeries[] | null>(null);
  const [tagsList, setTagsList] = useState<BlogTag[] | null>(null);
  const [popularPosts, setPopularPosts] = useState<BlogPostSummary[] | null>(null);

useEffect(() => {
  if (
    initialPost &&
    reload === 0 &&
    (initialPost.slug === decodedSlug || initialPost.slug === slug)
  ) {
    return;
  }

  const controller = new AbortController();

  blogService
    .getBySlug(decodedSlug, controller.signal)
    .then((post) => setState({ key, post }))
    .catch((e) => {
      if (isAbortError(e)) return;

      setState({
        key,
        error: getErrorMessage(e),
        notFound: e instanceof ApiError && e.code === "NOT_FOUND",
      });
    });

  return () => controller.abort();
}, [decodedSlug, key]);



useEffect(() => {
  const controller = new AbortController();

  blogService
    .getRelated(decodedSlug, controller.signal)
    .then((items) => setRelated({ slug: decodedSlug, items }))
    .catch((e) => {
      if (!isAbortError(e)) {
        setRelated({ slug: decodedSlug, items: [] });
      }
    });

  return () => controller.abort();
}, [decodedSlug]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    blogService
      .getCategories(signal)
      .then(setCategories)
      .catch((e) => {
        if (!isAbortError(e)) setCategories([]);
      });

    blogService
      .getSeries(signal)
      .then(setSeriesList)
      .catch((e) => {
        if (!isAbortError(e)) setSeriesList([]);
      });

    blogService
      .getTags(signal)
      .then(setTagsList)
      .catch((e) => {
        if (!isAbortError(e)) setTagsList([]);
      });

    blogService
      .getPopular(4, signal)
      .then(setPopularPosts)
      .catch((e) => {
        if (!isAbortError(e)) setPopularPosts([]);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const trimmed = sidebarQuery.trim();
    if (!trimmed) return;
    const timer = window.setTimeout(() => {
      router.push(`/blog?q=${encodeURIComponent(trimmed)}`);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [sidebarQuery, router]);

  const navigateToBlog = (params: Record<string, string | null>) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v) qs.set(k, v);
    });
    const s = qs.toString();
    router.push(s ? `/blog?${s}` : "/blog");
  };



  const current = state && state.key === key ? state : null;
  const post = current?.post;
  const relatedItems = related && related.slug === decodedSlug ? related.items : [];
  const headings = useMemo(
    () => (post ? extractArticleHeadings(post.content) : []),
    [post]
  );

  useEffect(() => {
    const updateProgress = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setReadProgress(0);
        return;
      }
      const ratio = Math.min(100, Math.max(0, (scrollTop / docHeight) * 100));
      setReadProgress(ratio);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, [decodedSlug]);

  const handleShare = async () => {
    if (!post) return;
    const url = window.location.href;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: post.title, url });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch {
      setShareState("failed");
    }
    window.setTimeout(() => setShareState("idle"), 2000);
  };

  const shareLabel =
    shareState === "copied"
      ? "پیوند کپی شد"
      : shareState === "failed"
        ? "کپی انجام نشد"
        : "اشتراک‌گذاری";

  return (
    <div
      dir="rtl"
      className="flex min-h-screen flex-col bg-[var(--bg-body)] pb-28 text-[var(--text-white)] lg:pb-0"
    >
      <Header />

      {/* نوار ظریف پیشرفت مطالعه مقاله */}
      {post && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2.5px] bg-transparent"
        >
          <div
            className="h-full bg-[var(--primary)] transition-[width] duration-150 ease-out"
            style={{ width: `${readProgress}%` }}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col pt-[var(--header-m-h)] lg:pt-[var(--header-h)]">
        <main className="mx-auto flex w-full max-w-[var(--max-app-width)] flex-1 flex-col gap-10 px-4 pb-10 pt-5 lg:gap-12 lg:px-8 lg:pt-8">
        {/* دو قسمت اصلی صفحه در دسکتاپ (قسمت اول: محتوای وبلاگ ، قسمت دوم: سایدبار وبلاگ) */}
        <div className="flex w-full flex-col items-start gap-6 lg:flex-row lg:gap-8">
          {/* قسمت اول: جزییات و کل محتوای وبلاگ */}
          <div className="flex w-full min-w-0 flex-1 flex-col gap-6">
            {!current && (
              <div className="w-full">
                <DetailSkeleton />
              </div>
            )}

            {current?.notFound && (
              <EmptyState
                title="مقاله‌ای که دنبالش هستید پیدا نشد"
                description="ممکن است این مقاله حذف شده یا نشانی آن تغییر کرده باشد."
                actionLabel="مشاهده همه‌ی مقاله‌ها"
                onAction={() => router.push("/blog")}
              />
            )}

            {current?.error && !current.notFound && (
              <ErrorState
                title="بارگذاری مقاله انجام نشد"
                description={current.error}
                onRetry={() => setReload((v) => v + 1)}
              />
            )}

            {post && (
              <article
                dir="rtl"
                className="flex w-full flex-col gap-6 text-right lg:gap-8 lg:rounded-2xl lg:border lg:border-[var(--border-subtle)]/80 lg:bg-[#16161B] lg:p-10"
              >
                {/* مسیر صفحه (Breadcrumb) */}
                <nav
                  aria-label="مسیر صفحه"
                  className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)] lg:text-[13px]"
                >
                  <Link
                    href="/"
                    className="transition-colors hover:text-[var(--primary)]"
                  >
                    سایرا
                  </Link>
                  <Icon
                    name="chevron"
                    size={14}
                    className="rotate-90 text-[var(--text-muted)]/60"
                  />
                  <Link
                    href="/blog"
                    className="transition-colors hover:text-[var(--primary)]"
                  >
                    وبلاگ
                  </Link>
                  {post.categoryLabel && (
                    <>
                      <Icon
                        name="chevron"
                        size={14}
                        className="rotate-90 text-[var(--text-muted)]/60"
                      />
                      <Link
                        href={`/blog?category=${encodeURIComponent(post.category)}`}
                        className="transition-colors hover:text-[var(--primary)]"
                      >
                        {post.categoryLabel}
                      </Link>
                    </>
                  )}
                  <Icon
                    name="chevron"
                    size={14}
                    className="rotate-90 text-[var(--text-muted)]/60"
                  />
                  <span className="max-w-[200px] truncate font-medium text-[var(--text-white)]/90 sm:max-w-md">
                    {post.title}
                  </span>
                </nav>

                {/* هدر مقاله: دسته‌بندی، عنوان، چکیده و متادیتا */}
                <header className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/blog?category=${encodeURIComponent(post.category)}`}
                    >
                      <Badge
                        variant="neutral"
                        className="transition-colors hover:border-[var(--primary)]/50 hover:text-[var(--primary)]"
                      >
                        {post.categoryLabel}
                      </Badge>
                    </Link>
                    {post.featured && (
                      <Badge variant="primary" className="gap-1">
                        <Icon name="star" size={14} filled />
                        <span>مقاله ویژه</span>
                      </Badge>
                    )}
                  </div>

                  <h1 className="font-peyda text-[22px] font-extrabold leading-[1.55] tracking-tight text-[var(--text-white)] sm:text-[26px] sm:leading-[1.5] lg:text-[32px] lg:leading-[1.45]">
                    {post.title}
                  </h1>

                  {post.excerpt && (
                    <p className="font-vazir text-[14.5px] leading-[1.9] text-[var(--text-muted)] sm:text-[15.5px] lg:text-[16.5px] lg:leading-[1.95]">
                      {post.excerpt}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[var(--border-subtle)] py-3.5 text-xs lg:text-[13px]">
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                      {post.authorName && (
                        <MetaItem icon="user" text={post.authorName} highlight />
                      )}
                      {post.publishedAt && (
                        <MetaItem
                          icon="calendar"
                          text={formatBlogDate(post.publishedAt)}
                        />
                      )}
                      <MetaItem
                        icon="clock"
                        text={`${formatReadingMinutes(post.readingMinutes)} مطالعه`}
                      />
                      {typeof post.viewsCount === "number" && post.viewsCount > 0 && (
                        <MetaItem
                          icon="star"
                          text={`${toPersianDigits(post.viewsCount)} بازدید`}
                        />
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={handleShare}
                      aria-label={shareLabel}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/50 hover:text-[var(--primary)]"
                    >
                      <Icon
                        name={shareState === "copied" ? "check" : "share"}
                        size={15}
                        className={
                          shareState === "copied"
                            ? "text-[var(--primary)]"
                            : undefined
                        }
                      />
                      <span aria-live="polite">{shareLabel}</span>
                    </button>
                  </div>
                </header>

                {/* تصویر شاخص مقاله */}
                <div className="aspect-[16/9] w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                  <SafeImage
                    src={post.coverUrl}
                    alt={post.title}
                    fallbackSrc={PLACEHOLDERS.banner}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* فهرست مطالب خودکار (در صورت وجود ۲ سرتیتر یا بیشتر) */}
                {headings.length >= 2 && (
                  <details
                    open
                    className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/60 p-4 md:p-5"
                  >
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 font-peyda text-sm font-bold text-[var(--text-white)] md:text-[15px]">
                      <span className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--primary-muted)] text-[var(--primary)]">
                          <Icon name="list" size={16} />
                        </span>
                        <span>فهرست مطالب</span>
                      </span>
                      <Icon
                        name="chevron"
                        size={16}
                        className="text-[var(--text-muted)] transition-transform duration-200 group-open:rotate-180"
                      />
                    </summary>
                    <ol className="mt-3.5 flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3.5 font-vazir text-[13.5px] leading-7 md:text-[14.5px]">
                      {headings.map((item, idx) => (
                        <li
                          key={item.id}
                          className={item.level >= 3 ? "ps-5" : undefined}
                        >
                          <a
                            href={`#${item.id}`}
                            className="group/toc flex items-baseline gap-2 text-[var(--text-muted)] transition-colors hover:text-[var(--primary)]"
                          >
                            <span className="shrink-0 font-peyda text-xs font-bold text-[var(--primary)]/80">
                              {toPersianDigits(idx + 1)}.
                            </span>
                            <span className="group-hover/toc:underline underline-offset-4">
                              {item.text}
                            </span>
                          </a>
                        </li>
                      ))}
                    </ol>
                  </details>
                )}

                {/* بدنه اصلی مقاله */}
                <div className="w-full py-1">
                  <BlogArticleContent
                    blocks={post.content}
                    relatedArticles={
                      post.relatedArticles?.length
                        ? post.relatedArticles
                        : relatedItems
                    }
                  />
                </div>

                {/* گیم‌نت‌های مرتبط با مقاله */}
                <ArticleGamingCentersSection
                  section={gamingCentersSection ?? post.gamingCentersSection}
                  fallbackCity={post.rankingCity}
                />

                {/* فوتر مقاله: برچسب‌ها، اشتراک‌گذاری و بازگشت */}
                <footer className="flex flex-col gap-5 border-t border-[var(--border-subtle)] pt-6">
                  {post.tags.length > 0 && (
                    <div className="flex flex-col gap-2.5">
                      <span className="flex items-center gap-1.5 font-peyda text-xs font-bold text-[var(--text-muted)]">
                        <Icon name="tag" size={14} className="text-[var(--primary)]" />
                        <span>برچسب‌های مقاله</span>
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <Link
                            key={tag}
                            href={`/blog?tag=${encodeURIComponent(tag)}`}
                            className="inline-flex h-9 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/60 hover:text-[var(--primary)]"
                          >
                            #{tag}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)]/60 p-4">
                    <button
                      type="button"
                      onClick={handleShare}
                      className="inline-flex h-10 items-center gap-2 rounded-card border border-[var(--border-color)] bg-[var(--foreground)]/50 px-4 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/60 hover:text-[var(--primary)] md:text-[13px]"
                    >
                      <Icon
                        name={shareState === "copied" ? "check" : "share"}
                        size={16}
                        className={
                          shareState === "copied"
                            ? "text-[var(--primary)]"
                            : undefined
                        }
                      />
                      <span aria-live="polite">{shareLabel}</span>
                    </button>

                    <Link
                      href="/blog"
                      className="inline-flex h-10 items-center gap-1.5 text-xs font-bold text-[var(--primary)] transition-opacity hover:opacity-80 md:text-[13px]"
                    >
                      <span>مشاهده همه مقاله‌ها</span>
                      <Icon name="arrow-left" size={16} />
                    </Link>
                  </div>
                </footer>
              </article>
            )}
          </div>

          {/* قسمت دوم: سایدبار صفحه اصلی وبلاگ */}
          <div className="w-full shrink-0 lg:w-[330px] xl:w-[360px]">
            <BlogSidebar
              query={sidebarQuery}
              onQueryChange={setSidebarQuery}
              sort={DEFAULT_BLOG_SORT}
              onSortChange={(next: BlogSort) =>
                navigateToBlog({
                  sort: next === DEFAULT_BLOG_SORT ? null : next,
                })
              }
              onlyHot={false}
              onOnlyHotChange={(nextHot) =>
                navigateToBlog({ hot: nextHot ? "1" : null })
              }
              categories={categories}
              selectedCategory={post?.category ?? "all"}
              onCategoryChange={(id) =>
                navigateToBlog({ category: id === "all" ? null : id })
              }
              seriesList={seriesList}
              selectedSeries=""
              onSeriesChange={(id) => navigateToBlog({ series: id || null })}
              tagsList={tagsList}
              selectedTag=""
              onTagChange={(tagName) =>
                navigateToBlog({ tag: tagName || null })
              }
              popularPosts={popularPosts}
              hasActiveFilter={false}
              onResetFilters={() => {
                setSidebarQuery("");
                router.push("/blog");
              }}
            />
          </div>
        </div>

        {/* بخش پست‌های پیشنهادی (پایین‌تر از دو ستون قرار گرفته تا کارت چسبان قبل از این بخش متوقف شود) */}
        {post && relatedItems.length > 0 && (
          <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-8">
            <SectionTitle title="مقاله‌های مرتبط" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
              {relatedItems.map((item) => (
                <BlogPostCard key={item.id} post={item} />
              ))}
            </div>
          </section>
        )}
        </main>
      </div>
      <Footer />
      <BottomBar activeTab="news" />
    </div>
  );
};
