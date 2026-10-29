"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { BlogHeroSlider } from "@/components/blog/BlogHeroSlider";
import {
  BlogPostCard,
  BlogPostCardSkeleton,
} from "@/components/blog/BlogPostCard";
import { BlogSortSheet } from "@/components/blog/BlogSortSheet";
import { BlogToolbar } from "@/components/blog/BlogToolbar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { isAbortError } from "@/lib/api/client";
import {
  DEFAULT_BLOG_SORT,
  getBlogSortLabel,
  parseBlogSort,
} from "@/lib/blog";
import { toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { blogService } from "@/services/blogService";
import type { BlogCategory, BlogPostSummary, BlogSort } from "@/types/blog";

const PAGE_SIZE = 6;

interface ListState {
  filterKey: string;
  limit: number;
  items: BlogPostSummary[];
  total: number;
  error?: string;
}

export const BlogListView: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  // وضعیت فیلترها از URL خوانده می‌شود
  const urlQuery = params.get("q") ?? "";
  const category = params.get("category") ?? "all";
  const sort: BlogSort = parseBlogSort(params.get("sort"));

  const [city, setCity] = useState("تبریز");
  const [query, setQuery] = useState(urlQuery);
  const [sortOpen, setSortOpen] = useState(false);
  const [categories, setCategories] = useState<BlogCategory[] | null>(null);
  const [reload, setReload] = useState(0);
  const [more, setMore] = useState({ key: "", count: PAGE_SIZE });
  const [result, setResult] = useState<ListState | null>(null);
  const editedRef = useRef(false);

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

  useEffect(() => {
    const controller = new AbortController();
    blogService
      .getCategories(controller.signal)
      .then(setCategories)
      .catch(() => setCategories([]));
    return () => controller.abort();
  }, []);

  const filterKey = `${urlQuery}|${category}|${sort}|${reload}`;
  const limit = more.key === filterKey ? more.count : PAGE_SIZE;

  useEffect(() => {
    const controller = new AbortController();
    blogService
      .list(
        {
          q: urlQuery,
          category: category === "all" ? undefined : category,
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
  }, [filterKey, urlQuery, category, sort, limit]);

  const current = result && result.filterKey === filterKey ? result : null;
  const loading = !current;
  const loadingMore = !!current && !current.error && current.limit !== limit;
  const hasMore = !!current && !current.error && current.items.length < current.total;

  const hasActiveFilter = !!urlQuery || !!query || category !== "all";
  const showSlider = !urlQuery && category === "all";

  const handleQueryChange = (value: string) => {
    editedRef.current = true;
    setQuery(value);
  };

  const resetFilters = () => {
    editedRef.current = false;
    setQuery("");
    updateParams({ q: null, category: null });
  };

  const handleCategoryChange = (id: string) =>
    updateParams({ category: id === "all" ? null : id });

  const handleSortChange = (next: BlogSort) =>
    updateParams({ sort: next === DEFAULT_BLOG_SORT ? null : next });

  const emptyTitle = urlQuery
    ? `نتیجه‌ای برای «${urlQuery}» پیدا نشد`
    : category !== "all"
    ? "در این دسته هنوز مقاله‌ای نیست"
    : "هنوز مقاله‌ای منتشر نشده است";

  return (
    <div className="flex min-h-screen flex-col bg-[var(--bg-body)] pb-10 text-[var(--text-white)]">
      <Header
        locationName={city}
        unreadNotificationsCount={0}
        onCityChange={setCity}
      />

      <main className="flex flex-1 flex-col gap-6 px-4 pb-4 pt-[var(--header-h)] lg:gap-8 lg:px-8">
        <div className="flex flex-col gap-1 pt-4">
          <h1 className="text-page-title">وبلاگ سایرا</h1>
          <p className="text-xs text-[var(--text-muted)]">
            راهنما، نکته و مقاله برای رزرو بهتر و تجربه‌ی بازی بهتر
          </p>
        </div>

        {showSlider && <BlogHeroSlider />}

        <BlogToolbar
          query={query}
          onQueryChange={handleQueryChange}
          categories={categories}
          category={category}
          onCategoryChange={handleCategoryChange}
          sortLabel={getBlogSortLabel(sort)}
          onOpenSort={() => setSortOpen(true)}
        />

        <section className="flex flex-col gap-4" aria-busy={loading}>
          {current && !current.error && (
            <div className="flex items-center justify-between gap-3">
              <p aria-live="polite" className="text-xs text-[var(--text-muted)]">
                {toPersianDigits(current.total)} مقاله
              </p>
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex h-10 items-center text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  حذف فیلترها
                </button>
              )}
            </div>
          )}

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
                  ? "عبارت کوتاه‌تری امتحان کنید یا فیلترها را حذف کنید."
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
              onClick={() => setMore({ key: filterKey, count: limit + PAGE_SIZE })}
              className="self-center px-8"
            >
              نمایش مقاله‌های بیشتر
            </Button>
          )}
        </section>
      </main>

      {sortOpen && (
        <BlogSortSheet
          value={sort}
          onChange={handleSortChange}
          onClose={() => setSortOpen(false)}
        />
      )}
    </div>
  );
};