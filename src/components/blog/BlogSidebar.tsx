"use client";

import React from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { SafeImage } from "@/components/ui/SafeImage";
import { BLOG_SORT_OPTIONS, formatReadingMinutes } from "@/lib/blog";
import { toPersianDigits } from "@/lib/format";
import { PLACEHOLDERS } from "@/lib/media";
import type {
  BlogCategory,
  BlogPostSummary,
  BlogSeries,
  BlogSort,
  BlogTag,
} from "@/types/blog";

export interface BlogSidebarProps {
  query: string;
  onQueryChange: (value: string) => void;
  sort: BlogSort;
  onSortChange: (sort: BlogSort) => void;
  onlyHot: boolean;
  onOnlyHotChange: (onlyHot: boolean) => void;
  categories: BlogCategory[] | null;
  selectedCategory: string;
  onCategoryChange: (id: string) => void;
  seriesList: BlogSeries[] | null;
  selectedSeries: string;
  onSeriesChange: (id: string) => void;
  tagsList: BlogTag[] | null;
  selectedTag: string;
  onTagChange: (tagName: string) => void;
  popularPosts: BlogPostSummary[] | null;
  hasActiveFilter: boolean;
  onResetFilters: () => void;
}

interface ImportantLinkItem {
  href: string;
  label: string;
  subtitle: string;
  icon: IconName;
}

const IMPORTANT_LINKS: ImportantLinkItem[] = [
  {
    href: "/gamecenters",
    label: "لیست گیمنت‌ها و رزرو آنلاین",
    subtitle: "جستجو و رزرو سانس در گیمنت‌های شهر",
    icon: "gamepad",
  },
  {
    href: "/gamecenters?category=discounted",
    label: "گیمنت‌های تخفیف‌دار",
    subtitle: "مشاهده گیمنت‌های دارای تخفیف فعال",
    icon: "tag",
  },
  {
    href: "/reservations",
    label: "رزروهای من",
    subtitle: "پیگیری وضعیت رزروها و سانس‌ها",
    icon: "calendar",
  },
  {
    href: "/support",
    label: "پشتیبانی و تیکت‌ها",
    subtitle: "ارتباط مستقیم با واحد پشتیبانی سایرا",
    icon: "ticket",
  },
  {
    href: "/about",
    label: "درباره سایرا",
    subtitle: "آشنایی با پلتفرم رزرو آنلاین گیمنت",
    icon: "info",
  },
  {
    href: "/terms",
    label: "قوانین و مقررات",
    subtitle: "شرایط استفاده و قوانین رزرو در سایرا",
    icon: "list",
  },
];

const SidebarSectionHeader: React.FC<{
  icon: IconName;
  title: string;
  action?: React.ReactNode;
}> = ({ icon, title, action }) => (
  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-child bg-[var(--primary-muted)] text-[var(--primary)]">
        <Icon name={icon} size={16} />
      </span>
      <h2 className="text-sm font-bold text-[var(--text-white)]">{title}</h2>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);

export const BlogSidebar: React.FC<BlogSidebarProps> = ({
  query,
  onQueryChange,
  sort,
  onSortChange,
  onlyHot,
  onOnlyHotChange,
  categories,
  selectedCategory,
  onCategoryChange,
  seriesList,
  selectedSeries,
  onSeriesChange,
  tagsList,
  selectedTag,
  onTagChange,
  popularPosts,
  hasActiveFilter,
  onResetFilters,
}) => {
  const categoryItems: BlogCategory[] = [
    { id: "all", label: "همه دسته‌بندی‌ها" },
    ...(categories ?? []),
  ];

  return (
    <aside
      aria-label="سایدبار وبلاگ"
      className="flex w-full flex-col gap-4"
    >
      {/* ۱. بالا سمت چپ: جستجو + فیلتر و مرتب‌سازی */}
      <section
        aria-label="جستجو، فیلتر و مرتب‌سازی"
        className="flex flex-col gap-4 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
      >
        <SidebarSectionHeader
          icon="search"
          title="جستجو، فیلتر و مرتب‌سازی"
          action={
            hasActiveFilter ? (
              <button
                type="button"
                onClick={onResetFilters}
                className="text-xs font-bold text-[var(--primary)] transition-opacity hover:opacity-80"
              >
                پاک‌سازی همه
              </button>
            ) : null
          }
        />

        {/* فیلد جستجو */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="blog-sidebar-search"
            className="text-xs font-bold text-[var(--text-muted)]"
          >
            جستجو در وبلاگ
          </label>
          <div className="relative">
            <Icon
              name="search"
              size={20}
              className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              id="blog-sidebar-search"
              type="search"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="عنوان، موضوع یا کلیدواژه..."
              autoComplete="off"
              className="h-11 w-full rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 pl-10 pr-11 text-sm text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)] [&::-webkit-search-cancel-button]:appearance-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                aria-label="پاک کردن جستجو"
                className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-white)]"
              >
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
        </div>

        {/* مرتب‌سازی */}
        <div className="flex flex-col gap-2">
          <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
            <Icon name="sort" size={16} />
            <span>مرتب‌سازی بر اساس</span>
          </span>
          <div
            role="radiogroup"
            aria-label="مرتب‌سازی مقاله‌ها"
            className="grid grid-cols-2 gap-2"
          >
            {BLOG_SORT_OPTIONS.map((opt) => {
              const active = sort === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => onSortChange(opt.id)}
                  className={`flex h-10 items-center justify-center rounded-card border px-2.5 text-xs font-bold transition-colors ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary)]"
                      : "border-[var(--border-subtle)] bg-[var(--foreground)]/30 text-[var(--text-white)] hover:border-[var(--primary)]/50"
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* فیلتر سریع مطالب داغ */}
        <div className="flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-3">
          <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)]">
            <Icon name="filter" size={16} />
            <span>فیلتر سریع</span>
          </span>
          <button
            type="button"
            aria-pressed={onlyHot}
            onClick={() => onOnlyHotChange(!onlyHot)}
            className={`flex h-11 w-full items-center justify-between rounded-card border px-3.5 text-xs font-bold transition-colors ${
              onlyHot
                ? "border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary)]"
                : "border-[var(--border-subtle)] bg-[var(--foreground)]/30 text-[var(--text-white)] hover:border-[var(--primary)]/50"
            }`}
          >
            <span className="flex items-center gap-2">
              <Icon
                name="star"
                size={16}
                filled={onlyHot}
                className={onlyHot ? "text-[var(--primary)]" : "text-[var(--accent-star)]"}
              />
              <span>فقط مقاله‌های داغ و برگزیده</span>
            </span>
            {onlyHot && <Icon name="check" size={16} />}
          </button>
        </div>
      </section>

      {/* ۲. دسته‌بندی‌ها */}
      <section
        aria-label="دسته‌بندی‌های وبلاگ"
        className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
      >
        <SidebarSectionHeader icon="list" title="دسته‌بندی‌ها" />

        {categories === null ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-card" />
            ))}
          </div>
        ) : (
          <div
            role="group"
            aria-label="فیلتر بر اساس دسته‌بندی"
            className="flex flex-col gap-1.5"
          >
            {categoryItems.map((cat) => {
              const active = cat.id === selectedCategory;
              return (
                <button
                  key={cat.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onCategoryChange(cat.id)}
                  className={`flex h-10 w-full items-center justify-between rounded-card border px-3 text-xs font-bold transition-colors ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-muted)] text-[var(--primary)]"
                      : "border-transparent bg-[var(--foreground)]/30 text-[var(--text-white)] hover:border-[var(--border-color)] hover:bg-[var(--foreground)]/50"
                  }`}
                >
                  <span className="truncate">{cat.label}</span>
                  {active ? (
                    <Icon name="check" size={16} />
                  ) : (
                    <Icon
                      name="chevron"
                      size={16}
                      className="rotate-90 text-[var(--text-muted)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ۳. سری‌ها (مجموعه‌های مقالات) */}
      <section
        aria-label="سری‌های مقالات"
        className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
      >
        <SidebarSectionHeader
          icon="monitor"
          title="سری‌های مقالات"
          action={
            selectedSeries ? (
              <button
                type="button"
                onClick={() => onSeriesChange("")}
                className="text-xs font-bold text-[var(--primary)] hover:underline"
              >
                همه سری‌ها
              </button>
            ) : null
          }
        />

        {seriesList === null ? (
          <div className="flex flex-col gap-2" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-card" />
            ))}
          </div>
        ) : seriesList.length === 0 ? (
          <p className="py-2 text-xs text-[var(--text-muted)]">
            در حال حاضر سری آموزشی فعالی ثبت نشده است.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {seriesList.map((series, index) => {
              const active = selectedSeries === series.id;
              return (
                <button
                  key={series.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onSeriesChange(active ? "" : series.id)
                  }
                  className={`flex w-full items-start gap-3 rounded-card border p-3 text-right transition-colors ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary-muted)]"
                      : "border-[var(--border-subtle)] bg-[var(--foreground)]/30 hover:border-[var(--primary)]/50"
                  }`}
                >
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-child text-xs font-bold ${
                      active
                        ? "bg-[var(--primary)] text-on-primary"
                        : "bg-[var(--bg-card)] text-[var(--text-muted)]"
                    }`}
                  >
                    {toPersianDigits(index + 1)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span
                      className={`truncate text-xs font-bold ${
                        active
                          ? "text-[var(--primary)]"
                          : "text-[var(--text-white)]"
                      }`}
                    >
                      {series.title}
                    </span>
                    {series.description && (
                      <span className="line-clamp-1 text-xs text-[var(--text-muted)]">
                        {series.description}
                      </span>
                    )}
                  </div>
                  {active && (
                    <Icon
                      name="check"
                      size={16}
                      className="mt-1 shrink-0 text-[var(--primary)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ۴. تگ‌ها (برچسب‌ها) */}
      <section
        aria-label="تگ‌ها و برچسب‌ها"
        className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
      >
        <SidebarSectionHeader
          icon="tag"
          title="تگ‌ها و برچسب‌ها"
          action={
            selectedTag ? (
              <button
                type="button"
                onClick={() => onTagChange("")}
                className="text-xs font-bold text-[var(--primary)] hover:underline"
              >
                حذف تگ
              </button>
            ) : null
          }
        />

        {tagsList === null ? (
          <div className="flex flex-wrap gap-2" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-20 rounded-full" />
            ))}
          </div>
        ) : tagsList.length === 0 ? (
          <p className="py-2 text-xs text-[var(--text-muted)]">
            برچسبی برای نمایش وجود ندارد.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tagsList.map((tag) => {
              const active =
                selectedTag === tag.name || selectedTag === tag.slug;
              return (
                <button
                  key={tag.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() =>
                    onTagChange(active ? "" : tag.name)
                  }
                  className={`flex h-9 items-center gap-1 rounded-full border px-3 text-xs font-bold transition-colors ${
                    active
                      ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                      : "border-[var(--border-subtle)] bg-[var(--foreground)]/40 text-[var(--text-white)] hover:border-[var(--primary)]/50 hover:text-[var(--primary)]"
                  }`}
                >
                  <span>#{tag.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* ۵. لینک‌های مهم و پربازدید */}
      <section
        aria-label="مقاله‌های پربازدید و لینک‌های مهم"
        className="flex flex-col gap-4 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
      >
        {/* بخش الف: پربازدیدترین مقاله‌ها */}
        <div className="flex flex-col gap-3">
          <SidebarSectionHeader icon="star" title="پربازدیدترین مطالب" />

          {popularPosts === null ? (
            <div className="flex flex-col gap-3" aria-busy="true">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-14 w-16 shrink-0 rounded-child" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : popularPosts.length === 0 ? (
            <p className="py-1 text-xs text-[var(--text-muted)]">
              هنوز مقاله‌ای ثبت نشده است.
            </p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {popularPosts.map((post, idx) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="group flex items-center gap-3 rounded-card border border-transparent bg-[var(--foreground)]/25 p-2 transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--foreground)]/45"
                >
                  <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-child bg-[var(--foreground)]">
                    <SafeImage
                      src={post.coverUrl}
                      alt={post.title}
                      loading="lazy"
                      fallbackSrc={PLACEHOLDERS.banner}
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--bg-body)]/85 text-xs font-bold text-[var(--primary)]">
                      {toPersianDigits(idx + 1)}
                    </span>
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <h3 className="line-clamp-2 text-xs font-bold leading-5 text-[var(--text-white)] transition-colors group-hover:text-[var(--primary)]">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Icon name="clock" size={16} />
                        {formatReadingMinutes(post.readingMinutes)}
                      </span>
                      {typeof post.viewsCount === "number" && post.viewsCount > 0 && (
                        <span>
                          • {toPersianDigits(post.viewsCount)} بازدید
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* بخش ب: لینک‌های مهم و کاربردی */}
        <div className="flex flex-col gap-3 border-t border-[var(--border-subtle)] pt-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-child bg-[var(--primary-muted)] text-[var(--primary)]">
              <Icon name="navigation" size={16} />
            </span>
            <h3 className="text-sm font-bold text-[var(--text-white)]">
              لینک‌های مهم و کاربردی
            </h3>
          </div>

          <nav aria-label="لینک‌های مهم سایرا" className="flex flex-col gap-1.5">
            {IMPORTANT_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center justify-between gap-2.5 rounded-card border border-transparent bg-[var(--foreground)]/25 px-3 py-2.5 transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--foreground)]/50"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-child bg-[var(--bg-card)] text-[var(--text-muted)] transition-colors group-hover:text-[var(--primary)]">
                    <Icon name={item.icon} size={16} />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-xs font-bold text-[var(--text-white)] transition-colors group-hover:text-[var(--primary)]">
                      {item.label}
                    </span>
                    <span className="truncate text-xs text-[var(--text-muted)]">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
                <Icon
                  name="arrow-left"
                  size={16}
                  className="shrink-0 text-[var(--text-muted)] transition-transform group-hover:-translate-x-0.5 group-hover:text-[var(--primary)]"
                />
              </Link>
            ))}
          </nav>
        </div>
      </section>
    </aside>
  );
};
