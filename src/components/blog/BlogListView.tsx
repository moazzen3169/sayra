"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { BottomBar } from "@/components/BottomBar";
import { BlogHeroSlider } from "@/components/blog/BlogHeroSlider";
import {
  BlogPostCard,
  BlogPostCardSkeleton,
} from "@/components/blog/BlogPostCard";
import { BlogSidebar } from "@/components/blog/BlogSidebar";
import { BlogSortSheet } from "@/components/blog/BlogSortSheet";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Icon } from "@/components/ui/Icon";
import { isAbortError } from "@/lib/api/client";
import {
  DEFAULT_BLOG_SORT,
  getBlogSortLabel,
  parseBlogSort,
} from "@/lib/blog";
import { toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { blogService } from "@/services/blogService";
import type {
  BlogCategory,
  BlogPostSummary,
  BlogSeries,
  BlogSort,
  BlogTag,
} from "@/types/blog";

const PAGE_SIZE = 6;

interface ListState {
  filterKey: string;
  limit: number;
  items: BlogPostSummary[];
  total: number;
  error?: string;
}

export interface BlogListViewProps {
  initialItems?: BlogPostSummary[];
  initialTotal?: number;
}

export const BlogListView: React.FC<BlogListViewProps> = ({
  initialItems,
  initialTotal,
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // وضعیت فیلترها از URL خوانده می‌شود
  const urlQuery = params.get("q") ?? "";
  const category = params.get("category") ?? "all";
  const series = params.get("series") ?? "";
  const tag = params.get("tag") ?? "";
  const onlyHot = params.get("hot") === "1" || params.get("hot") === "true";
  const sort: BlogSort = parseBlogSort(params.get("sort"));

  const [query, setQuery] = useState(urlQuery);
  const [sortOpen, setSortOpen] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[] | null>(null);
  const [seriesList, setSeriesList] = useState<BlogSeries[] | null>(null);
  const [tagsList, setTagsList] = useState<BlogTag[] | null>(null);
  const [popularPosts, setPopularPosts] = useState<BlogPostSummary[] | null>(null);
  const [reload, setReload] = useState(0);
  const [more, setMore] = useState({ key: "", count: PAGE_SIZE });

  const initialFilterKey = `${urlQuery}|${category}|${series}|${tag}|${onlyHot ? "1" : "0"}|${sort}|0`;
  const [result, setResult] = useState<ListState | null>(
    initialItems && initialItems.length > 0
      ? {
          filterKey: initialFilterKey,
          limit: PAGE_SIZE,
          items: initialItems,
          total: initialTotal ?? initialItems.length,
        }
      : null
  );
  const editedRef = useRef(false);

  // همگام‌سازی ورودی جستجو هنگام تغییر URL (مثلاً کلیک روی حذف فیلتر)
  useEffect(() => {
    if (!editedRef.current) {
      setQuery(urlQuery);
    }
  }, [urlQuery]);

  const updateParams = useCallback(
    (next: Record<string, string | null>) => {
      const qs = new URLSearchParams(params.toString());
      Object.entries(next).forEach(([key, value]) => {
        if (value) qs.set(key, value);
        else qs.delete(key);
      });
      const s = qs.toString();
      router.replace(s ? `${pathname}?${s}` : pathname, { scroll: false });
    },
    [params, pathname, router]
  );

  // جستجو با تأخیر به URL منتقل می‌شود
  useEffect(() => {
    if (!editedRef.current) return;
    const timer = window.setTimeout(() => {
      editedRef.current = false;
      updateParams({ q: query.trim() || null });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query, updateParams]);

  // واکشی داده‌های سایدبار (دسته‌بندی‌ها، سری‌ها، تگ‌ها و پربازدیدترین مطالب)
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

  const filterKey = `${urlQuery}|${category}|${series}|${tag}|${onlyHot ? "1" : "0"}|${sort}|${reload}`;
  const limit = more.key === filterKey ? more.count : PAGE_SIZE;

  useEffect(() => {
    if (
      initialItems &&
      initialItems.length > 0 &&
      reload === 0 &&
      !urlQuery &&
      category === "all" &&
      !series &&
      !tag &&
      !onlyHot &&
      sort === DEFAULT_BLOG_SORT &&
      limit === PAGE_SIZE
    ) {
      return;
    }

    const controller = new AbortController();
    blogService
      .list(
        {
          q: urlQuery,
          category: category === "all" ? undefined : category,
          series: series || undefined,
          tag: tag || undefined,
          isHot: onlyHot ? true : undefined,
          sort,
          limit,
        },
        controller.signal
      )
      .then((r) =>
        setResult({ filterKey, limit, items: r.items, total: r.total })
      )
      .catch((e) => {
        if (isAbortError(e)) return;
        setResult({
          filterKey,
          limit,
          items: [],
          total: 0,
          error: getErrorMessage(e),
        });
      });
    return () => controller.abort();
  }, [filterKey, urlQuery, category, series, tag, onlyHot, sort, limit]);

  const current = result && result.filterKey === filterKey ? result : null;
  const loading = !current;
  const loadingMore = !!current && !current.error && current.limit !== limit;
  const hasMore =
    !!current && !current.error && current.items.length < current.total;

  // اگر لیست تگ‌های اختصاصی خالی بود، از تگ‌های واقعی مقاله‌های موجود استفاده شود
  const effectiveTags = useMemo<BlogTag[] | null>(() => {
    if (tagsList === null) return null;
    if (tagsList.length > 0) return tagsList;
    if (!current || current.items.length === 0) return [];
    const seen = new Set<string>();
    const derived: BlogTag[] = [];
    for (const post of current.items) {
      for (const t of post.tags || []) {
        const trimmed = t.trim();
        if (trimmed && !seen.has(trimmed)) {
          seen.add(trimmed);
          derived.push({
            id: trimmed,
            name: trimmed,
            slug: trimmed,
          });
        }
      }
    }
    return derived;
  }, [tagsList, current]);

  const hasActiveFilter =
    !!urlQuery ||
    !!query ||
    category !== "all" ||
    !!series ||
    !!tag ||
    onlyHot ||
    sort !== DEFAULT_BLOG_SORT;

  const handleQueryChange = (value: string) => {
    editedRef.current = true;
    setQuery(value);
  };

  const resetFilters = () => {
    editedRef.current = false;
    setQuery("");
    updateParams({
      q: null,
      category: null,
      series: null,
      tag: null,
      hot: null,
      sort: null,
    });
  };

  const handleCategoryChange = (id: string) =>
    updateParams({ category: id === "all" ? null : id });

  const handleSeriesChange = (id: string) =>
    updateParams({ series: id || null });

  const handleTagChange = (tagName: string) =>
    updateParams({ tag: tagName || null });

  const handleOnlyHotChange = (nextHot: boolean) =>
    updateParams({ hot: nextHot ? "1" : null });

  const handleSortChange = (next: BlogSort) =>
    updateParams({ sort: next === DEFAULT_BLOG_SORT ? null : next });

  const activeCategoryLabel = useMemo(() => {
    if (category === "all") return null;
    return categories?.find((c) => c.id === category)?.label ?? category;
  }, [categories, category]);

  const activeSeriesTitle = useMemo(() => {
    if (!series) return null;
    return seriesList?.find((s) => s.id === series)?.title ?? `سری #${toPersianDigits(series)}`;
  }, [seriesList, series]);

  const emptyTitle = urlQuery
    ? `نتیجه‌ای برای «${urlQuery}» پیدا نشد`
    : tag
      ? `مقاله‌ای با برچسب «${tag}» پیدا نشد`
      : series
        ? "در این سری هنوز مقاله‌ای منتشر نشده است"
        : category !== "all"
          ? "در این دسته هنوز مقاله‌ای نیست"
          : "هنوز مقاله‌ای منتشر نشده است";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-body)] pb-28 text-[var(--text-white)] lg:pb-0">
      <Header />
      <div className="flex flex-1 flex-col pt-[var(--header-m-h)] lg:pt-[var(--header-h)]">
        <main className="mx-auto flex w-full max-w-[var(--max-app-width)] flex-1 flex-col gap-6 px-4 pb-8 pt-5 lg:gap-8 lg:px-8 lg:pt-8">
        {/* اسلایدر مقاله‌های داغ (Hot) */}
        <BlogHeroSlider />

        {/* نوار سریع جستجو و مرتب‌سازی مخصوص موبایل (در دسکتاپ در بالا سمت چپ سایدبار قرار دارد) */}
        <div className="flex items-center gap-2 lg:hidden">
          <div className="relative min-w-0 flex-1">
            <Icon
              name="search"
              size={20}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="جستجو در مقاله‌ها..."
              aria-label="جستجو در مقاله‌ها"
              autoComplete="off"
              className="h-11 w-full rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] pl-10 pr-11 text-sm text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)] [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => handleQueryChange("")}
                aria-label="پاک کردن جستجو"
                className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-white)]"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setSortOpen(true)}
            aria-haspopup="dialog"
            className="flex h-11 shrink-0 items-center gap-1.5 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3.5 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/50"
          >
            <Icon name="sort" size={16} className="text-[var(--primary)]" />
            <span>{getBlogSortLabel(sort)}</span>
          </button>
        </div>

        {/* چیدمان دو ستونه: سمت راست ۳ کارت پست وبلاگ، سمت چپ سایدبار چندبخشی */}
        <div className="flex w-full flex-col items-start gap-6 lg:flex-row lg:gap-8">
          {/* ستون سمت راست: لیست کارت‌های پست وبلاگ (۳ کارت در هر ردیف دسکتاپ) */}
          <section
            aria-label="لیست مقاله‌های وبلاگ"
            aria-busy={loading}
            className="flex min-w-0 flex-1 w-full flex-col gap-4"
          >
            {/* هدر بالای کارت‌های وبلاگ و نمایش فیلترهای فعال */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base font-bold text-[var(--text-white)]">
                  مقاله‌های وبلاگ
                </h1>
                {current && !current.error && (
                  <span
                    aria-live="polite"
                    className="rounded-full bg-[var(--foreground)]/60 px-2.5 py-0.5 text-xs font-bold text-[var(--text-muted)]"
                  >
                    {toPersianDigits(current.total)} مقاله
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {activeCategoryLabel && (
                  <button
                    type="button"
                    onClick={() => handleCategoryChange("all")}
                    className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--primary)]/40 bg-[var(--primary-muted)] px-3 text-xs font-bold text-[var(--primary)]"
                  >
                    <span>دسته: {activeCategoryLabel}</span>
                    <Icon name="close" size={16} />
                  </button>
                )}

                {activeSeriesTitle && (
                  <button
                    type="button"
                    onClick={() => handleSeriesChange("")}
                    className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--primary)]/40 bg-[var(--primary-muted)] px-3 text-xs font-bold text-[var(--primary)]"
                  >
                    <span>سری: {activeSeriesTitle}</span>
                    <Icon name="close" size={16} />
                  </button>
                )}

                {tag && (
                  <button
                    type="button"
                    onClick={() => handleTagChange("")}
                    className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--primary)]/40 bg-[var(--primary-muted)] px-3 text-xs font-bold text-[var(--primary)]"
                  >
                    <span>تگ: #{tag}</span>
                    <Icon name="close" size={16} />
                  </button>
                )}

                {onlyHot && (
                  <button
                    type="button"
                    onClick={() => handleOnlyHotChange(false)}
                    className="flex h-8 items-center gap-1.5 rounded-full border border-[var(--primary)]/40 bg-[var(--primary-muted)] px-3 text-xs font-bold text-[var(--primary)]"
                  >
                    <span>فقط مطالب داغ</span>
                    <Icon name="close" size={16} />
                  </button>
                )}

                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="flex h-8 items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
                  >
                    <span>حذف فیلترها</span>
                  </button>
                )}
              </div>
            </div>

            {/* شبکه ۳ ستونه کارت‌های پست وبلاگ در سمت راست */}
            {current?.error ? (
              <ErrorState
                title="بارگذاری مقاله‌ها انجام نشد"
                description={current.error}
                onRetry={() => setReload((v) => v + 1)}
              />
            ) : loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <BlogPostCardSkeleton key={i} />
                ))}
              </div>
            ) : current && current.items.length === 0 ? (
              <EmptyState
                title={emptyTitle}
                description={
                  hasActiveFilter
                    ? "عبارت کوتاه‌تری امتحان کنید یا فیلترها را تغییر دهید."
                    : undefined
                }
                actionLabel={hasActiveFilter ? "حذف فیلترها" : undefined}
                onAction={hasActiveFilter ? resetFilters : undefined}
              />
            ) : (
              current && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {current.items.map((post) => (
                    <BlogPostCard key={post.id} post={post} />
                  ))}
                </div>
              )
            )}

            {hasMore && (
              <Button
                variant="secondary"
                size="lg"
                isLoading={loadingMore}
                onClick={() =>
                  setMore({ key: filterKey, count: limit + PAGE_SIZE })
                }
                className="self-center px-8"
              >
                نمایش مقاله‌های بیشتر
              </Button>
            )}
          </section>

          {/* ستون سمت چپ: سایدبار یک‌ستونه شامل جستجو/فیلتر/مرتب‌سازی (بالا سمت چپ)، دسته‌بندی‌ها، سری‌ها، تگ‌ها و لینک‌های مهم و پربازدید */}
          <div className="w-full shrink-0 lg:w-[330px] xl:w-[360px]">
            <BlogSidebar
              query={query}
              onQueryChange={handleQueryChange}
              sort={sort}
              onSortChange={handleSortChange}
              onlyHot={onlyHot}
              onOnlyHotChange={handleOnlyHotChange}
              categories={categories}
              selectedCategory={category}
              onCategoryChange={handleCategoryChange}
              seriesList={seriesList}
              selectedSeries={series}
              onSeriesChange={handleSeriesChange}
              tagsList={effectiveTags}
              selectedTag={tag}
              onTagChange={handleTagChange}
              popularPosts={popularPosts}
              hasActiveFilter={hasActiveFilter}
              onResetFilters={resetFilters}
            />
          </div>
        </div>
        </main>
      </div>

      {sortOpen && (
        <BlogSortSheet
          value={sort}
          onChange={handleSortChange}
          onClose={() => setSortOpen(false)}
        />
      )}

      <Footer />
      <BottomBar activeTab="news" />
    </div>
  );
};
