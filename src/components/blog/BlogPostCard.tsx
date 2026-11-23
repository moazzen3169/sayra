import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatBlogDate, formatReadingMinutes } from "@/lib/blog";
import { SafeImage } from "@/components/ui/SafeImage";
import { PLACEHOLDERS } from "@/lib/media";
import type { BlogPostSummary } from "@/types/blog";

export const BlogPostCard: React.FC<{ post: BlogPostSummary }> = ({ post }) => (
  <Link
    href={`/blog/${post.slug}`}
    className="group flex h-full flex-col overflow-hidden rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] transition-colors hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
  >
    <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-[var(--foreground)]">
      <SafeImage
        src={post.coverUrl}
        alt={post.title || "مقاله آموزشی سایرا"}
        fill
        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        loading="lazy"
        fallbackSrc={PLACEHOLDERS.banner}
        draggable={false}
        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
      />
      <div className="absolute right-3 top-3 flex flex-wrap items-center gap-1.5">
        <Badge variant="neutral">{post.categoryLabel}</Badge>
        {post.featured && (
          <Badge variant="primary" className="gap-1">
            <Icon name="star" size={16} filled />
            <span>داغ</span>
          </Badge>
        )}
      </div>
    </div>

    <div className="flex flex-1 flex-col gap-2.5 p-4">
      <h3 className="line-clamp-2 text-sm font-bold leading-6 text-[var(--text-white)] transition-colors group-hover:text-[var(--primary)]">
        {post.title}
      </h3>
      <p className="line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
        {post.excerpt}
      </p>

      {post.tags && post.tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          {post.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-2 py-0.5 text-xs font-medium text-[var(--text-muted)]"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-muted)]">
        <span className="truncate">{formatBlogDate(post.publishedAt) || post.authorName}</span>
        <span className="flex shrink-0 items-center gap-1">
          <Icon name="clock" size={16} />
          {formatReadingMinutes(post.readingMinutes)}
        </span>
      </div>
    </div>
  </Link>
);

export const BlogPostCardSkeleton: React.FC = () => (
  <div
    aria-hidden="true"
    className="flex h-full flex-col overflow-hidden rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)]"
  >
    <Skeleton
      aria-busy={undefined}
      className="aspect-[16/10] w-full rounded-none shrink-0"
    />
    <div className="flex flex-1 flex-col gap-2.5 p-4">
      <div className="flex flex-col gap-1.5">
        <Skeleton aria-busy={undefined} className="h-5 w-4/5 rounded-child" />
        <Skeleton aria-busy={undefined} className="h-5 w-2/3 rounded-child" />
      </div>
      <div className="flex flex-col gap-1.5">
        <Skeleton aria-busy={undefined} className="h-4 w-full rounded-child" />
        <Skeleton aria-busy={undefined} className="h-4 w-3/4 rounded-child" />
      </div>
      <div className="flex items-center gap-1.5 pt-0.5">
        <Skeleton aria-busy={undefined} className="h-6 w-14 rounded-full" />
        <Skeleton aria-busy={undefined} className="h-6 w-16 rounded-full" />
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
        <Skeleton aria-busy={undefined} className="h-4 w-20 rounded-child" />
        <Skeleton aria-busy={undefined} className="h-4 w-16 rounded-child" />
      </div>
    </div>
  </div>
);
