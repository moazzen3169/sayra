"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BlogArticleContent } from "@/components/blog/BlogArticleContent";
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
  icon: "user" | "calendar" | "clock";
  text: string;
}> = ({ icon, text }) => (
  <span className="flex items-center gap-1.5">
    <Icon name={icon} size={16} />
    {text}
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
    <div className="flex min-h-screen flex-col bg-[var(--bg-body)] pb-28 text-[var(--text-white)] lg:pb-0">
      <Header />

      <div className="flex flex-1 flex-col pt-[var(--header-m-h)] lg:pt-[var(--header-h)]">
        <main className="mx-auto flex w-full max-w-[var(--max-app-width)] flex-1 flex-col gap-8 px-4 pt-4 lg:px-8 lg:pt-8">
        {/* دو قسمت اصلی صفحه در دسکتاپ (قسمت اول: محتوای وبلاگ ، قسمت دوم: سایدبار وبلاگ) */}
        <div className="flex w-full flex-col items-start gap-8 lg:flex-row">
          {/* قسمت اول: جزییات و کل محتوای وبلاگ */}
          <div className="flex-1 min-w-0 w-full flex flex-col gap-6">
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
              <article className="flex w-full flex-col gap-6">
                <nav
                  aria-label="مسیر صفحه"
                  className="flex flex-wrap items-center gap-1.5 text-xs text-[var(--text-muted)]"
                >
                  <Link href="/" className="transition-colors hover:text-[var(--primary)]">
                    سایرا
                  </Link>
                  <span aria-hidden="true">/</span>
                  <Link href="/blog" className="transition-colors hover:text-[var(--primary)]">
                    وبلاگ
                  </Link>
                  {post.categoryLabel && (
                    <>
                      <span aria-hidden="true">/</span>
                      <Link
                        href={`/blog?category=${encodeURIComponent(post.category)}`}
                        className="transition-colors hover:text-[var(--primary)]"
                      >
                        {post.categoryLabel}
                      </Link>
                    </>
                  )}
                  <span aria-hidden="true">/</span>
                  <span className="max-w-[200px] truncate text-[var(--text-white)] sm:max-w-md">
                    {post.title}
                  </span>
                </nav>
                <header className="flex flex-col gap-3">
                  <Link
                    href={`/blog?category=${encodeURIComponent(post.category)}`}
                    className="self-start"
                  >
                    <Badge variant="neutral">{post.categoryLabel}</Badge>
                  </Link>
                  <h1 className="text-xl font-bold leading-9 text-[var(--text-white)] sm:text-2xl">
                    {post.title}
                  </h1>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--text-muted)]">
                    <MetaItem icon="user" text={post.authorName} />
                    <MetaItem
                      icon="calendar"
                      text={formatBlogDate(post.publishedAt)}
                    />
                    <MetaItem
                      icon="clock"
                      text={`${formatReadingMinutes(post.readingMinutes)} مطالعه`}
                    />
                  </div>
                </header>

                <div className="aspect-[16/9] w-full overflow-hidden rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]">
                  <SafeImage
                    src={post.coverUrl}
                    alt={post.title}
                    fallbackSrc={PLACEHOLDERS.banner}
                    className="h-full w-full object-cover"
                  />
                </div>

                <BlogArticleContent
                  blocks={post.content}
                  relatedArticles={
                    post.relatedArticles?.length
                      ? post.relatedArticles
                      : relatedItems
                  }
                />

                <ArticleGamingCentersSection
                  section={gamingCentersSection ?? post.gamingCentersSection}
                  fallbackCity={post.rankingCity}
                />

                <footer className="flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-4">
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/blog?tag=${encodeURIComponent(tag)}`}
                          className="flex h-10 items-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/60 hover:text-[var(--primary)]"
                        >
                          {tag}
                        </Link>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleShare}
                    className="flex h-11 items-center gap-2 self-start rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)] px-4 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--border-color)]"
                  >
                    <Icon
                      name={shareState === "copied" ? "check" : "share"}
                      size={16}
                    />
                    <span aria-live="polite">{shareLabel}</span>
                  </button>
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
