"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { BlogPostPreviewModal } from "./BlogPostPreviewModal";
import type {
  BlogPostDetail,
  BlogPostStatus,
  BlogCategory,
  BlogContentBlock,
  AdminBlogPostInput,
} from "@/types/blog";
import { adminService } from "@/services/adminService";

interface BlogPostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: BlogPostDetail | null;
  onSuccess: (post: BlogPostDetail) => void;
}

interface BlogPostFormContentProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: BlogPostDetail | null;
  onSuccess: (post: BlogPostDetail) => void;
}

const BlogPostFormContent: React.FC<BlogPostFormContentProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields initialized lazily without useEffect setState
  const [title, setTitle] = useState(() => initialData?.title || "");
  const [slug, setSlug] = useState(() => initialData?.slug || "");
  const [category, setCategory] = useState(() => initialData?.category || "guides");
  const [authorName, setAuthorName] = useState(() => initialData?.authorName || "تحریریه‌ی سایرا");
  const [readingMinutes, setReadingMinutes] = useState(() => initialData?.readingMinutes || 5);
  const [featured, setFeatured] = useState(() => Boolean(initialData?.featured));
  const [excerpt, setExcerpt] = useState(() => initialData?.excerpt || "");
  const [coverUrl, setCoverUrl] = useState(() => initialData?.coverUrl || "/img/gamnet-1.webp");
  const [tagsInput, setTagsInput] = useState(() => (initialData?.tags ? initialData.tags.join(", ") : ""));
  const [status, setStatus] = useState<BlogPostStatus>(() => initialData?.status || "PUBLISHED");
  const [contentBlocks, setContentBlocks] = useState<BlogContentBlock[]>(() =>
    initialData?.content && initialData.content.length > 0
      ? [...initialData.content]
      : [{ type: "paragraph", text: "" }]
  );

  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    adminService.getBlogCategories().then(setCategories).catch(console.warn);
  }, []);

  // Convert title to a slug automatically
  const handleGenerateSlug = () => {
    if (!title.trim()) return;
    const generated = title
      .trim()
      .toLowerCase()
      .replace(/[^\w\u0600-\u06FF\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
    setSlug(generated);
  };

  // Block Content Handlers
  const handleAddBlock = (type: BlogContentBlock["type"]) => {
    if (type === "list") {
      setContentBlocks((prev) => [...prev, { type: "list", items: [""] }]);
    } else if (type === "heading") {
      setContentBlocks((prev) => [...prev, { type: "heading", text: "" }]);
    } else if (type === "quote") {
      setContentBlocks((prev) => [...prev, { type: "quote", text: "" }]);
    } else {
      setContentBlocks((prev) => [...prev, { type: "paragraph", text: "" }]);
    }
  };

  const handleRemoveBlock = (index: number) => {
    setContentBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    setContentBlocks((prev) => {
      const newBlocks = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= newBlocks.length) return prev;
      const temp = newBlocks[index];
      newBlocks[index] = newBlocks[targetIndex];
      newBlocks[targetIndex] = temp;
      return newBlocks;
    });
  };

  const handleUpdateBlockText = (index: number, text: string) => {
    setContentBlocks((prev) => {
      const newBlocks = [...prev];
      const target = newBlocks[index];
      if (target.type === "heading" || target.type === "paragraph" || target.type === "quote") {
        newBlocks[index] = { ...target, text };
      }
      return newBlocks;
    });
  };

  const handleUpdateListItem = (blockIndex: number, itemIndex: number, value: string) => {
    setContentBlocks((prev) => {
      const newBlocks = [...prev];
      const target = newBlocks[blockIndex];
      if (target.type === "list") {
        const newItems = [...target.items];
        newItems[itemIndex] = value;
        newBlocks[blockIndex] = { ...target, items: newItems };
      }
      return newBlocks;
    });
  };

  const handleAddListItem = (blockIndex: number) => {
    setContentBlocks((prev) => {
      const newBlocks = [...prev];
      const target = newBlocks[blockIndex];
      if (target.type === "list") {
        newBlocks[blockIndex] = { ...target, items: [...target.items, ""] };
      }
      return newBlocks;
    });
  };

  const handleRemoveListItem = (blockIndex: number, itemIndex: number) => {
    setContentBlocks((prev) => {
      const newBlocks = [...prev];
      const target = newBlocks[blockIndex];
      if (target.type === "list") {
        const newItems = target.items.filter((_, i) => i !== itemIndex);
        newBlocks[blockIndex] = { ...target, items: newItems };
      }
      return newBlocks;
    });
  };

  const parseTags = (): string[] => {
    return tagsInput
      .split(/[,،]/)
      .map((t) => t.trim())
      .filter(Boolean);
  };

  const handleSave = async (submitStatus: BlogPostStatus) => {
    setError(null);

    if (!title.trim()) {
      setError("لطفاً عنوان مقاله را وارد کنید.");
      return;
    }
    if (!slug.trim()) {
      setError("لطفاً شناسه (Slug) مقاله را وارد کنید.");
      return;
    }
    if (!excerpt.trim()) {
      setError("لطفاً خلاصه / چکیده مقاله را وارد کنید.");
      return;
    }

    setIsSubmitting(true);

    const tags = parseTags();
    const payload: AdminBlogPostInput = {
      title: title.trim(),
      slug: slug.trim(),
      category,
      authorName: authorName.trim() || "تحریریه‌ی سایرا",
      readingMinutes: Number(readingMinutes) || 5,
      featured,
      excerpt: excerpt.trim(),
      coverUrl: coverUrl.trim() || "/img/gamnet-1.webp",
      tags,
      status: submitStatus,
      content: contentBlocks,
    };

    try {
      let result: BlogPostDetail;
      if (initialData) {
        result = await adminService.updateBlogPost(initialData.id, payload);
      } else {
        result = await adminService.createBlogPost(payload);
      }
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "خطا در ثبت مقاله.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentPreviewPost: BlogPostDetail = {
    id: initialData ? initialData.id : "preview-id",
    title: title || "عنوان مقاله پیش‌نمایش",
    slug: slug || "preview-slug",
    category,
    categoryLabel: categories.find((c) => c.id === category)?.label || "عمومی",
    authorName: authorName || "تحریریه‌ی سایرا",
    readingMinutes: Number(readingMinutes) || 5,
    publishedAt: initialData?.publishedAt || new Date().toISOString(),
    excerpt: excerpt || "خلاصه و چکیده مقاله برای پیش‌نمایش...",
    coverUrl: coverUrl || "/img/gamnet-1.webp",
    tags: parseTags(),
    featured,
    status,
    content: contentBlocks,
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={initialData ? "ویرایش مقاله وبلاگ" : "ایجاد مقاله جدید"}
        className="max-w-[760px] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-6 py-2">
          {error && (
            <div className="p-3.5 rounded-card bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold flex items-center gap-2">
              <Icon name="alert" size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Main Info */}
          <div className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--primary)]">
              ۱. اطلاعات اصلی مقاله
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  دسته‌بندی مقاله *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[var(--bg-card)]">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  نویسنده مقاله
                </label>
                <Input
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="مثلاً: تحریریه‌ی سایرا"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  زمان تقریبی مطالعه (دقیقه)
                </label>
                <Input
                  type="number"
                  min={1}
                  value={readingMinutes}
                  onChange={(e) => setReadingMinutes(Number(e.target.value))}
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="featured-checkbox"
                  checked={featured}
                  onChange={(e) => setFeatured(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border-subtle)] accent-[var(--primary)] cursor-pointer"
                />
                <label
                  htmlFor="featured-checkbox"
                  className="text-xs text-[var(--text-white)] cursor-pointer font-medium"
                >
                  نمایش به‌عنوان مقاله ویژه (Featured)
                </label>
              </div>
            </div>
          </div>

          {/* Section 2: Title & Slug */}
          <div className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--primary)]">
              ۲. عنوان و شناسه (Slug)
            </span>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  عنوان مقاله *
                </label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="عنوان کامل مقاله را وارد کنید..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-[var(--text-muted)]">
                    شناسه یکتا (Slug) *
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateSlug}
                    className="text-xs text-[var(--primary)] hover:underline"
                  >
                    تولید خودکار از عنوان
                  </button>
                </div>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="choose-the-right-device"
                  className="dir-ltr text-right"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Content Editor / Blocks */}
          <div className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--primary)]">
                ۳. محتوای متن مقاله (بلوک‌های محتوایی)
              </span>
              <span className="text-xs text-[var(--text-subtle)]">
                {contentBlocks.length} بلوک
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {contentBlocks.map((block, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] flex flex-col gap-2 relative"
                >
                  <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                    <span className="text-xs font-bold text-[var(--text-white)] flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-[var(--foreground)]/60 text-[var(--text-muted)] text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      {block.type === "heading" && "تیتر (Heading)"}
                      {block.type === "paragraph" && "پاراگراف (Paragraph)"}
                      {block.type === "list" && "فهرست / لیست (List)"}
                      {block.type === "quote" && "نقل‌قول (Quote)"}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleMoveBlock(idx, "up")}
                        disabled={idx === 0}
                        className="p-1 text-[var(--text-subtle)] hover:text-white disabled:opacity-30"
                        title="انتقال به بالا"
                      >
                        <Icon name="chevron" size={16} className="rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveBlock(idx, "down")}
                        disabled={idx === contentBlocks.length - 1}
                        className="p-1 text-[var(--text-subtle)] hover:text-white disabled:opacity-30"
                        title="انتقال به پایین"
                      >
                        <Icon name="chevron" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(idx)}
                        className="p-1 text-[var(--accent-red)] hover:bg-[var(--accent-red)]/20 rounded"
                        title="حذف بلوک"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  </div>

                  {block.type === "heading" && (
                    <Input
                      value={block.text}
                      onChange={(e) => handleUpdateBlockText(idx, e.target.value)}
                      placeholder="عنوان یا تیتر بخش را وارد کنید..."
                    />
                  )}

                  {block.type === "paragraph" && (
                    <textarea
                      value={block.text}
                      onChange={(e) => handleUpdateBlockText(idx, e.target.value)}
                      placeholder="متن پاراگراف..."
                      rows={3}
                      className="w-full p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-y leading-relaxed"
                    />
                  )}

                  {block.type === "quote" && (
                    <textarea
                      value={block.text}
                      onChange={(e) => handleUpdateBlockText(idx, e.target.value)}
                      placeholder="متن نقل‌قول..."
                      rows={2}
                      className="w-full p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-y leading-relaxed border-s-4 border-s-[var(--primary)]"
                    />
                  )}

                  {block.type === "list" && (
                    <div className="flex flex-col gap-2 pt-1">
                      {block.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-center gap-2">
                          <span className="text-xs text-[var(--primary)] font-bold">•</span>
                          <Input
                            value={item}
                            onChange={(e) => handleUpdateListItem(idx, itemIdx, e.target.value)}
                            placeholder={`آیتم شماره ${itemIdx + 1}...`}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveListItem(idx, itemIdx)}
                            className="p-1.5 text-[var(--text-subtle)] hover:text-[var(--accent-red)] shrink-0"
                            title="حذف این مورد"
                          >
                            <Icon name="close" size={16} />
                          </button>
                        </div>
                      ))}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleAddListItem(idx)}
                        className="self-start mt-1 text-xs"
                      >
                        + افزودن مورد جدید به لیست
                      </Button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add Block Toolbar */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  افزودن بلوک جدید:
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddBlock("paragraph")}
                >
                  + پاراگراف
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddBlock("heading")}
                >
                  + تیتر
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddBlock("list")}
                >
                  + لیست
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddBlock("quote")}
                >
                  + نقل‌قول
                </Button>
              </div>
            </div>
          </div>

          {/* Section 4: SEO & Excerpt */}
          <div className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--primary)]">
              ۴. اطلاعات محتوایی و سئو
            </span>
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  خلاصه / چکیده مقاله *
                </label>
                <textarea
                  value={excerpt}
                  onChange={(e) => setExcerpt(e.target.value)}
                  placeholder="خلاصه کوتاهی از مقاله برای نمایش در کارت‌ها و نتایج..."
                  rows={2}
                  className="w-full p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-y leading-relaxed"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  برچسب‌ها (با کاما جدا کنید)
                </label>
                <Input
                  value={tagsInput}
                  onChange={(e) => setTagsInput(e.target.value)}
                  placeholder="راهنمای رزرو، انتخاب دستگاه، کنسول"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Cover Image */}
          <div className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--primary)]">
              ۵. تصویر شاخص
            </span>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  آدرس تصویر شاخص (URL)
                </label>
                <Input
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  placeholder="/img/gamnet-1.webp"
                  className="dir-ltr text-right"
                />
              </div>
              {coverUrl && (
                <div className="w-24 h-16 rounded-card overflow-hidden bg-[var(--foreground)] border border-[var(--border-subtle)] shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverUrl}
                    alt="پیش‌نمایش تصویر"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Section 6: Publishing Status */}
          <div className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--primary)]">
              ۶. وضعیت انتشار
            </span>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--text-white)]">
                <input
                  type="radio"
                  name="blog-status"
                  value="DRAFT"
                  checked={status === "DRAFT"}
                  onChange={() => setStatus("DRAFT")}
                  className="accent-[var(--primary)]"
                />
                <span>پیش‌نویس (DRAFT)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--text-white)]">
                <input
                  type="radio"
                  name="blog-status"
                  value="PUBLISHED"
                  checked={status === "PUBLISHED"}
                  onChange={() => setStatus("PUBLISHED")}
                  className="accent-[var(--primary)]"
                />
                <span>منتشرشده (PUBLISHED)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-[var(--text-white)]">
                <input
                  type="radio"
                  name="blog-status"
                  value="ARCHIVED"
                  checked={status === "ARCHIVED"}
                  onChange={() => setStatus("ARCHIVED")}
                  className="accent-[var(--primary)]"
                />
                <span>بایگانی‌شده (ARCHIVED)</span>
              </label>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <Button
              variant="secondary"
              onClick={() => setIsPreviewOpen(true)}
              className="flex items-center gap-1.5"
            >
              <Icon name="info" size={18} />
              <span>پیش‌نمایش</span>
            </Button>

            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
                انصراف
              </Button>
              <Button
                variant="ghost"
                onClick={() => handleSave("DRAFT")}
                isLoading={isSubmitting}
                className="border border-[var(--border-subtle)]"
              >
                ذخیره پیش‌نویس
              </Button>
              <Button
                variant="primary"
                onClick={() => handleSave(status)}
                isLoading={isSubmitting}
              >
                {initialData ? "ذخیره تغییرات" : "انتشار مقاله"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Live Preview Modal */}
      <BlogPostPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        post={currentPreviewPost}
      />
    </>
  );
};

export const BlogPostFormModal: React.FC<BlogPostFormModalProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <BlogPostFormContent
      key={props.initialData ? props.initialData.id : "new-blog-post"}
      {...props}
    />
  );
};
