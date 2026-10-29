"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { BlogArticleContent } from "@/components/blog/BlogArticleContent";
import type { BlogPostDetail } from "@/types/blog";

interface BlogPostPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: BlogPostDetail | null;
}

export const BlogPostPreviewModal: React.FC<BlogPostPreviewModalProps> = ({
  isOpen,
  onClose,
  post,
}) => {
  if (!post) return null;

  const getStatusBadge = () => {
    switch (post.status) {
      case "PUBLISHED":
        return <Badge variant="success">منتشرشده</Badge>;
      case "DRAFT":
        return <Badge variant="warning">پیش‌نویس</Badge>;
      case "ARCHIVED":
        return <Badge variant="neutral">بایگانی‌شده</Badge>;
      default:
        return <Badge variant="success">منتشرشده</Badge>;
    }
  };

  const formattedDate = post.publishedAt
    ? new Date(post.publishedAt).toLocaleDateString("fa-IR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "تاریخ انتشار ثبت نشده";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="پیش‌نمایش مقاله وبلاگ"
      className="max-w-[720px] max-h-[90vh] overflow-y-auto"
    >
      <div className="flex flex-col gap-6 py-2">
        {/* Header Metadata */}
        <div className="flex flex-col gap-3 pb-4 border-b border-[var(--border-subtle)]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30">
                {post.categoryLabel || "عمومی"}
              </span>
              {getStatusBadge()}
              {post.featured && (
                <Badge variant="primary" className="bg-[var(--accent-star)]/20 text-[var(--accent-star)] border-[var(--accent-star)]/40">
                  مقاله ویژه
                </Badge>
              )}
            </div>
            <span className="text-xs text-[var(--text-subtle)] dir-ltr font-mono">
              /blog/{post.slug}
            </span>
          </div>

          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-white)] leading-snug">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--text-muted)] pt-1">
            <span className="flex items-center gap-1.5">
              <Icon name="user" size={16} />
              <span>{post.authorName || "تحریریه‌ی سایرا"}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="calendar" size={16} />
              <span>{formattedDate}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Icon name="clock" size={16} />
              <span>{post.readingMinutes} دقیقه مطالعه</span>
            </span>
          </div>
        </div>

        {/* Cover Image */}
        {post.coverUrl && (
          <div className="relative w-full h-64 md:h-80 rounded-card overflow-hidden bg-[var(--foreground)] border border-[var(--border-subtle)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={post.coverUrl}
              alt={post.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        )}

        {/* Excerpt Callout */}
        {post.excerpt && (
          <div className="p-4 rounded-card bg-[var(--foreground)]/30 border-s-4 border-[var(--primary)] text-xs md:text-sm text-[var(--text-white)]/90 leading-relaxed">
            <span className="font-bold text-[var(--primary)] block mb-1">خلاصه مقاله:</span>
            {post.excerpt}
          </div>
        )}

        {/* Content Blocks */}
        <div className="p-4 rounded-card bg-[var(--bg-body)] border border-[var(--border-subtle)]">
          {post.content && post.content.length > 0 ? (
            <BlogArticleContent blocks={post.content} />
          ) : (
            <p className="text-xs text-[var(--text-subtle)] text-center py-6">
              محتوای متنی برای این مقاله ثبت نشده است.
            </p>
          )}
        </div>

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--text-muted)]">برچسب‌ها:</span>
            {post.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-2.5 py-0.5 text-xs rounded-full bg-[var(--foreground)]/40 text-[var(--text-muted)] border border-[var(--border-subtle)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
};
