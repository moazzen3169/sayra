"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { BlogArticleContent } from "@/components/blog/BlogArticleContent";
import { BlogPostCard } from "@/components/blog/BlogPostCard";
import { BlogPromoBanner } from "@/components/blog/BlogPromoBanner";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError, isAbortError } from "@/lib/api/client";
import { formatBlogDate, formatReadingMinutes } from "@/lib/blog";
import { getErrorMessage } from "@/lib/reservationUi";
import { blogService } from "@/services/blogService";
import type { BlogPostDetail, BlogPostSummary } from "@/types/blog";

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

const MetaItem: React.FC<{ icon: "user" | "calendar" | "clock"; text: string }> = ({
  icon,
  text,
}) => (
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

export const BlogPostView: React.FC<{ slug: string }> = ({ slug }) => {
  const router = useRouter();
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<DetailState | null>(null);
  const [related, setRelated] = useState<RelatedState | null>(null);
  const [shareState, setShareState] = useState<ShareState>("idle");

  const key = `${slug}|${reload}`;

  useEffect(() => {
    const controller = new AbortController();
    blogService
      .getBySlug(slug, controller.signal)
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
  }, [slug, key]);

  useEffect(() => {
    const controller = new AbortController();
    blogService
      .getRelated(slug, controller.signal)
      .then((items) => setRelated({ slug, items }))
      .catch((e) => {
        if (!isAbortError(e)) setRelated({ slug, items: [] });
      });
    return () => controller.abort();
  }, [slug]);

  const current = state && state.key === key ? state : null;
  const post = current?.post;
  const relatedItems = related && related.slug === slug ? related.items : [];

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/blog");
    }
  };

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
    <div className="flex min-h-screen flex-col bg-[var(--bg-body)] pb-12 text-[var(--text-white)]">
      {/* دسکتاپ: هدر اصلی ؛ موبایل: هدر صفحه‌ی داخلی */}
      <div className="hidden lg:block">
        <Header unreadNotificationsCount={0} />
      </div>
      <PageHeader title="وبلاگ" onBack={goBack} className="lg:hidden" />

      {/* بنر چسبان موبایل با ارتفاع دقیق ۸۰px و قابلیت مخفی‌سازی در زیر هدر */}
      <BlogPromoBanner variant="mobile" />

      <main className="mx-auto flex w-full max-w-[var(--max-app-width)] flex-1 flex-col gap-8 px-4 pt-4 lg:px-8 lg:pt-[calc(var(--header-h,80px))]">


        {/* دو قسمت اصلی صفحه در دسکتاپ (قسمت اول: محتوای وبلاگ حدود ۸۰٪ ، قسمت دوم: کارت تبلیغ ۲۰٪) */}
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
                        <Link
          href="/blog"
          className="hidden h-11 items-center gap-1.5 self-start text-xs font-bold text-[var(--text-muted)] transition-colors hover:text-[var(--primary)] lg:flex"
        >
          <Icon name="back" size={16} />
          <span>همه‌ی مقاله‌ها</span>
        </Link>
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
                    <MetaItem icon="calendar" text={formatBlogDate(post.publishedAt)} />
                    <MetaItem
                      icon="clock"
                      text={`${formatReadingMinutes(post.readingMinutes)} مطالعه`}
                    />
                  </div>
                </header>

                <div className="aspect-[16/9] w-full overflow-hidden rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]">
                  <img
                    src={post.coverUrl}
                    alt={post.title}
                    className="h-full w-full object-cover"
                  />
                </div>

                <BlogArticleContent blocks={post.content} />

                <footer className="flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-4">
                  {post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {post.tags.map((tag) => (
                        <Link
                          key={tag}
                          href={`/blog?q=${encodeURIComponent(tag)}`}
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
                    <Icon name={shareState === "copied" ? "check" : "share"} size={16} />
                    <span aria-live="polite">{shareLabel}</span>
                  </button>
                </footer>
              </article>
            )}
          </div>

          {/* قسمت دوم: کارت تبلیغ ۲۰٪ ثابت چسبان تا بخش پست‌های پیشنهادی در دسکتاپ */}
          <div className="hidden lg:block lg:w-[280px] xl:w-[320px] shrink-0 sticky top-[calc(var(--header-h,80px)+1.5rem)] self-start z-10">
            <BlogPromoBanner variant="desktop" />
          </div>
        </div>

        {/* بخش پست‌های پیشنهادی (پایین‌تر از دو ستون قرار گرفته تا کارت چسبان قبل از این بخش متوقف شود) */}
        {post && relatedItems.length > 0 && (
          <section className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-8">
            <SectionTitle title="مقاله‌های مرتبط" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {relatedItems.map((item) => (
                <BlogPostCard key={item.id} post={item} />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};