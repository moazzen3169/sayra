"use client";

import React from "react";
import { Icon } from "@/components/ui/Icon";
import type { BlogCategory } from "@/types/blog";

interface BlogToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  categories: BlogCategory[] | null;
  category: string;
  onCategoryChange: (id: string) => void;
  sortLabel: string;
  onOpenSort: () => void;
}

export const BlogToolbar: React.FC<BlogToolbarProps> = ({
  query,
  onQueryChange,
  categories,
  category,
  onCategoryChange,
  sortLabel,
  onOpenSort,
}) => {
  const chips: BlogCategory[] = [{ id: "all", label: "همه" }, ...(categories ?? [])];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Icon
            name="search"
            size={20}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="جستجوی عنوان، موضوع یا برچسب"
            aria-label="جستجو در مقاله‌ها"
            autoComplete="off"
            className="h-11 w-full rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] pl-11 pr-11 text-sm text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)] [&::-webkit-search-cancel-button]:appearance-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange("")}
              aria-label="پاک کردن جستجو"
              className="absolute left-0 top-0 flex h-11 w-11 items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-white)]"
            >
              <Icon name="close" size={16} />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenSort}
          aria-haspopup="dialog"
          className="flex h-11 shrink-0 items-center gap-2 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 text-xs font-bold text-[var(--text-white)] transition-colors hover:border-[var(--primary)]/50"
        >
          <Icon name="filter" size={16} className="text-[var(--primary)]" />
          <span>مرتب‌سازی</span>
          <span className="hidden font-medium text-[var(--text-muted)] sm:inline">
            {sortLabel}
          </span>
        </button>
      </div>

      <div
        role="group"
        aria-label="دسته‌بندی مقاله‌ها"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0"
      >
        {chips.map((c) => {
          const active = c.id === category;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => onCategoryChange(c.id)}
              className={`h-10 shrink-0 rounded-full border px-4 text-xs font-bold transition-colors ${
                active
                  ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                  : "border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-white)] hover:border-[var(--primary)]/50"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};