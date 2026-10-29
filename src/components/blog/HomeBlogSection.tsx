"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BlogPostCard, BlogPostCardSkeleton } from "@/components/blog/BlogPostCard";
import { blogService } from "@/services/blogService";
import type { BlogPostSummary } from "@/types/blog";

export const HomeBlogSection: React.FC = () => {
  const [posts, setPosts] = useState<BlogPostSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPosts() {
      try {
        setIsLoading(true);
        const result = await blogService.list(
          { sort: "newest", limit: 4 },
          controller.signal
        );
        setPosts(result.items);
      } catch (error) {
        if ((error as Error)?.name !== "AbortError") {
          setPosts([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }

    void loadPosts();

    return () => controller.abort();
  }, []);

  // اگر مقاله‌ای برای نمایش موجود نباشد، بخش وبلاگ را نشان نده.
  if (!isLoading && posts.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="home-blog-heading" className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2
            id="home-blog-heading"
            className="text-base font-bold text-[var(--text-white)]"
          >
            تازه‌های وبلاگ سایرا
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            راهنماها و مطالب تازه دنیای گیمینگ
          </p>
        </div>

        <Link
          href="/blog"
          className="shrink-0 text-xs font-bold text-[var(--primary)] transition-opacity hover:opacity-80"
        >
          همه مقاله‌ها
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <BlogPostCardSkeleton key={index} />
            ))
          : posts.map((post) => <BlogPostCard key={post.id} post={post} />)}
      </div>
    </section>
  );
};
