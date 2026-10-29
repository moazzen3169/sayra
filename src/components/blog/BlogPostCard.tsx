import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatBlogDate, formatReadingMinutes } from "@/lib/blog";
import type { BlogPostSummary } from "@/types/blog";

export const BlogPostCard: React.FC<{ post: BlogPostSummary }> = ({ post }) => (
  <Link
    href={`/blog/${post.slug}`}
    className="group flex h-full flex-col overflow-hidden rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] transition-colors hover:border-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
  >
    <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-[var(--foreground)]">
      <img
        src={post.coverUrl}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="h-full w-full object-cover"
      />
      <Badge variant="neutral" className="absolute right-3 top-3">
        {post.categoryLabel}
      </Badge>
    </div>

    <div className="flex flex-1 flex-col gap-2 p-4">
      <h3 className="line-clamp-2 text-sm font-bold leading-6 text-[var(--text-white)] transition-colors group-hover:text-[var(--primary)]">
        {post.title}
      </h3>
      <p className="line-clamp-2 text-xs leading-5 text-[var(--text-muted)]">
        {post.excerpt}
      </p>

      <div className="mt-auto flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3 text-xs text-[var(--text-muted)]">
        <span>{formatBlogDate(post.publishedAt)}</span>
        <span className="flex items-center gap-1">
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
    className="flex flex-col overflow-hidden rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)]"
  >
    <Skeleton className="aspect-[16/10] w-full rounded-none" />
    <div className="flex flex-col gap-3 p-4">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <Skeleton className="mt-2 h-4 w-1/2" />
    </div>
  </div>
);