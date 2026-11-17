"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { BlogPostEditor } from "@/components/admin/blog/BlogPostEditor";
import { Skeleton } from "@/components/ui/Skeleton";
import { Icon } from "@/components/ui/Icon";
import { adminService } from "@/services/adminService";
import type { BlogPostDetail } from "@/types/blog";

export default function EditBlogPostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ? decodeURIComponent(params.slug) : "";

  const [fetchState, setFetchState] = useState<{
    slug: string;
    post: BlogPostDetail | null;
    notFound: boolean;
  } | null>(null);

  useEffect(() => {
    if (!slug) return;

    let cancelled = false;
    adminService
      .getBlogPostById(slug)
      .then((res) => {
        if (cancelled) return;
        setFetchState({
          slug,
          post: res ?? null,
          notFound: !res,
        });
      })
      .catch(() => {
        if (!cancelled) {
          setFetchState({ slug, post: null, notFound: true });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const current = fetchState && fetchState.slug === slug ? fetchState : null;
  const loading = Boolean(slug) && !current;
  const notFound = !slug || Boolean(current?.notFound);
  const post = current?.post ?? null;

  if (loading) {
    return (
      <AdminPageContainer>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-16 w-full rounded-card" />
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <Skeleton className="h-96 rounded-card lg:col-span-8" />
            <Skeleton className="h-96 rounded-card lg:col-span-4" />
          </div>
        </div>
      </AdminPageContainer>
    );
  }

  if (notFound || !post) {
    return (
      <AdminPageContainer>
        <div className="flex flex-col items-center justify-center gap-4 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-12 text-center">
          <Icon name="alert" size={32} className="text-[var(--accent-red)]" />
          <h1 className="text-base font-bold text-[var(--text-white)]">
            مقاله مورد نظر یافت نشد
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            ممکن است این مقاله حذف شده یا شناسه (Slug) آن تغییر کرده باشد.
          </p>
          <Link
            href="/admin/blog"
            className="rounded-card bg-[var(--primary)] px-4 py-2 text-xs font-bold text-black transition-opacity hover:opacity-90"
          >
            بازگشت به مدیریت وبلاگ
          </Link>
        </div>
      </AdminPageContainer>
    );
  }

  return <BlogPostEditor mode="edit" initialData={post} />;
}
