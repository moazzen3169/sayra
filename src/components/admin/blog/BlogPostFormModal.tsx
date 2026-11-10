"use client";

import React, { useState, useEffect, useRef } from "react";
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
import type { TagDto, AuthorProfileDto } from "@/types/blogApi";
import { adminService } from "@/services/adminService";
import { AppImage } from "@/components/common/AppImage";

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
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Form Fields initialized lazily without useEffect setState
  const [title, setTitle] = useState(() => initialData?.title || "");
  const [slug, setSlug] = useState(() => initialData?.slug || "");
  const [category, setCategory] = useState(() => initialData?.category || "1");
  const [authorName, setAuthorName] = useState(() => initialData?.authorName || "تحریریه‌ی سایرا");
  const [readingMinutes, setReadingMinutes] = useState(() => initialData?.readingMinutes || 5);
  const [featured, setFeatured] = useState(() => Boolean(initialData?.featured));
  const [excerpt, setExcerpt] = useState(() => initialData?.excerpt || "");
  const [coverUrl, setCoverUrl] = useState(() => initialData?.coverUrl || "/img/gamnet-1.webp");
  const [coverImageId, setCoverImageId] = useState<string | number | null>(() => null);
  const [status, setStatus] = useState<BlogPostStatus>(() => initialData?.status || "DRAFT");
  const [contentBlocks, setContentBlocks] = useState<BlogContentBlock[]>(() =>
    initialData?.content && initialData.content.length > 0
      ? [...initialData.content]
      : [{ type: "paragraph", text: "" }]
  );

  // Tags & Authors real integration state
  const [allAvailableTags, setAllAvailableTags] = useState<TagDto[]>([]);
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>(() => initialData?.tags || []);
  const [newTagInput, setNewTagInput] = useState("");
  const [authors, setAuthors] = useState<AuthorProfileDto[]>([]);

  // Media upload state
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Load fresh article details from server when editing an existing post
  useEffect(() => {
    let isMounted = true;
    if (initialData?.slug) {
      adminService.getBlogPostById(initialData.slug).then((fresh) => {
        if (!isMounted || !fresh) return;
        if (fresh.title) setTitle(fresh.title);
        if (fresh.slug) setSlug(fresh.slug);
        if (fresh.category) setCategory(fresh.category);
        if (fresh.authorName) setAuthorName(fresh.authorName);
        if (fresh.readingMinutes) setReadingMinutes(fresh.readingMinutes);
        if (fresh.featured !== undefined) setFeatured(fresh.featured);
        if (fresh.excerpt) setExcerpt(fresh.excerpt);
        if (fresh.coverUrl) setCoverUrl(fresh.coverUrl);
        if (fresh.tags?.length) setSelectedTagNames(fresh.tags);
        if (fresh.status) setStatus(fresh.status);
        if (fresh.content?.length) setContentBlocks(fresh.content);
      }).catch(console.warn);
    }
    return () => {
      isMounted = false;
    };
  }, [initialData?.slug]);

  useEffect(() => {
    adminService.getBlogCategories().then(setCategories).catch(console.warn);
    adminService.getTagsList().then(setAllAvailableTags).catch(console.warn);
    adminService.getAuthorsList().then(setAuthors).catch(console.warn);
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

  // Tag management handlers
  const handleToggleTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;
    setSelectedTagNames((prev) =>
      prev.includes(trimmed)
        ? prev.filter((t) => t !== trimmed)
        : [...prev, trimmed]
    );
  };

  const handleAddNewTag = async () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;

    // Check if already selected
    if (selectedTagNames.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setNewTagInput("");
      return;
    }

    // Check if exists in allAvailableTags
    const existing = allAvailableTags.find(
      (t) =>
        t.name.trim().toLowerCase() === trimmed.toLowerCase() ||
        t.slug.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (existing) {
      setSelectedTagNames((prev) => [...prev, existing.name]);
    } else {
      // Create new tag via backend API
      try {
        const rawSlug = trimmed
          .toLowerCase()
          .replace(/[^\w\s-]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim();
        const slug = rawSlug.length > 0 ? rawSlug : `tag-${Date.now().toString(36)}`;
        const created = await adminService.createTag({ name: trimmed, slug });
        setAllAvailableTags((prev) => [...prev, created]);
        setSelectedTagNames((prev) => [...prev, created.name]);
      } catch {
        // Fallback: still add to selected tags so ensureTagsExist will try to resolve it
        setSelectedTagNames((prev) => [...prev, trimmed]);
      }
    }
    setNewTagInput("");
  };

  const handleRemoveSelectedTag = (tagName: string) => {
    setSelectedTagNames((prev) => prev.filter((t) => t !== tagName));
  };

  // Media upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMediaUploadError(null);

    // Validate type (image only)
    if (!file.type.startsWith("image/")) {
      setMediaUploadError("فقط فایل‌های تصویری مجاز هستند (PNG, JPEG, WebP, etc.).");
      return;
    }

    // Validate size (max 10MB)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setMediaUploadError("حجم تصویر نمی‌تواند بیشتر از ۱۰ مگابایت باشد.");
      return;
    }

    setIsUploadingMedia(true);
    try {
      const media = await adminService.uploadMedia({
        file,
        title: title || file.name,
        alt_text: title || "تصویر شاخص مقاله",
      });
      if (media.url) {
        setCoverUrl(media.url);
      }
      if (media.id != null) {
        setCoverImageId(media.id);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setMediaUploadError(e.message || "خطا در آپلود تصویر در سرور.");
    } finally {
      setIsUploadingMedia(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSave = async (submitStatus: BlogPostStatus) => {
    setError(null);
    setFieldErrors({});

    const newFieldErrors: { [key: string]: string } = {};

    if (!title.trim()) {
      newFieldErrors.title = "لطفاً عنوان مقاله را وارد کنید.";
    }
    if (!slug.trim()) {
      newFieldErrors.slug = "لطفاً شناسه (Slug) مقاله را وارد کنید.";
    } else if (!/^[-a-zA-Z0-9_]+$/.test(slug.trim())) {
      newFieldErrors.slug = "شناسه مقاله فقط می‌تواند شامل حروف انگلیسی، اعداد، خط فاصله (-) و زیرخط (_) باشد.";
    }
    if (!excerpt.trim()) {
      newFieldErrors.excerpt = "لطفاً خلاصه / چکیده مقاله را وارد کنید.";
    }

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError("لطفاً خطاهای مشخص‌شده در فرم را بررسی نمایید.");
      return;
    }

    setIsSubmitting(true);

    const tags = selectedTagNames;
    const payload: AdminBlogPostInput = {
      title: title.trim(),
      slug: slug.trim(),
      category,
      authorName: authorName.trim() || "تحریریه‌ی سایرا",
      readingMinutes: Number(readingMinutes) || 5,
      featured,
      excerpt: excerpt.trim(),
      coverUrl: coverUrl.trim() || "/img/gamnet-1.webp",
      coverImageId: coverImageId != null ? coverImageId : undefined,
      tags,
      status: submitStatus,
      content: contentBlocks,
    };

    try {
      let result: BlogPostDetail;
      if (initialData) {
        result = await adminService.updateBlogPost(initialData.slug || initialData.id, payload);
      } else {
        result = await adminService.createBlogPost(payload);
      }
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const e = err as Error & { details?: Record<string, unknown>; status?: number };
      if (e.status === 403) {
        setError("شما دسترسی لازم برای ویرایش یا ایجاد مقاله را ندارید (403 Forbidden).");
      } else if (e.status === 401) {
        setError("نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.");
      } else if (e.details && typeof e.details === "object") {
        const detailsObj = e.details as Record<string, string[] | string>;
        const mappedErrors: { [key: string]: string } = {};
        for (const [k, v] of Object.entries(detailsObj)) {
          mappedErrors[k] = Array.isArray(v) ? v.join(" ") : String(v);
        }
        setFieldErrors(mappedErrors);
        setError(e.message || "خطای اعتبارسنجی فیلدهای ارسالی.");
      } else {
        setError(e.message || "خطا در برقراری ارتباط با سرور. اطلاعات فرم حفظ شده است.");
      }
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
    tags: selectedTagNames,
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
                {authors.length > 0 ? (
                  <select
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full h-11 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                  >
                    {authors.map((a) => (
                      <option key={a.user} value={a.display_name} className="bg-[var(--bg-card)]">
                        {a.display_name}
                      </option>
                    ))}
                    {!authors.some((a) => a.display_name === authorName) && (
                      <option value={authorName} className="bg-[var(--bg-card)]">
                        {authorName}
                      </option>
                    )}
                  </select>
                ) : (
                  <Input
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    placeholder="مثلاً: تحریریه‌ی سایرا"
                  />
                )}
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
                  error={fieldErrors.title}
                />
                {fieldErrors.title && (
                  <span className="text-[11px] text-[var(--accent-red)] font-bold mt-1 block">
                    {fieldErrors.title}
                  </span>
                )}
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
                  error={fieldErrors.slug}
                />
                {fieldErrors.slug && (
                  <span className="text-[11px] text-[var(--accent-red)] font-bold mt-1 block">
                    {fieldErrors.slug}
                  </span>
                )}
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
                  className={`w-full p-3 rounded-card bg-[var(--foreground)]/30 border text-xs text-[var(--text-white)] outline-none resize-y leading-relaxed ${
                    fieldErrors.excerpt
                      ? "border-[var(--accent-red)] focus:border-[var(--accent-red)]"
                      : "border-[var(--border-subtle)] focus:border-[var(--primary)]"
                  }`}
                />
                {fieldErrors.excerpt && (
                  <span className="text-[11px] text-[var(--accent-red)] font-bold mt-1 block">
                    {fieldErrors.excerpt}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="block text-xs font-bold text-[var(--text-muted)]">
                  برچسب‌ها (انتخاب و ایجاد تگ واقعی)
                </label>

                {/* Selected Tags Pills */}
                <div className="flex flex-wrap items-center gap-1.5 min-h-[36px] p-2 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)]">
                  {selectedTagNames.length === 0 ? (
                    <span className="text-xs text-[var(--text-subtle)]">
                      هیچ برچسبی انتخاب نشده است.
                    </span>
                  ) : (
                    selectedTagNames.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-xs text-[var(--primary)] font-bold"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveSelectedTag(tag)}
                          className="hover:text-[var(--accent-red)] transition-colors cursor-pointer"
                          title="حذف برچسب"
                        >
                          <Icon name="close" size={12} />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Tag Input & Add Button */}
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddNewTag();
                        }
                      }}
                      placeholder="نام برچسب جدید یا جستجو در تگ‌ها..."
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleAddNewTag}
                    disabled={!newTagInput.trim()}
                    className="shrink-0"
                  >
                    + افزودن برچسب
                  </Button>
                </div>

                {/* Available Suggested Tags from Backend */}
                {allAvailableTags.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-[var(--text-muted)] font-medium">
                      برچسب‌های موجود در سرور:
                    </span>
                    {allAvailableTags.map((tag) => {
                      const isSelected = selectedTagNames.includes(tag.name);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => handleToggleTag(tag.name)}
                          className={`text-xs px-2 py-0.5 rounded-lg border transition-colors cursor-pointer ${
                            isSelected
                              ? "bg-[var(--primary)] text-on-primary border-[var(--primary)] font-bold"
                              : "bg-[var(--foreground)]/30 text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-white"
                          }`}
                        >
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 5: Cover Image */}
          <div className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--primary)]">
                ۵. تصویر شاخص (آپلود مستقیم یا آدرس اینترنتی)
              </span>
              {coverImageId != null && (
                <span className="text-[11px] text-[var(--accent-green)] font-bold">
                  شناسه رسانه در سرور: {coverImageId}
                </span>
              )}
            </div>

            {mediaUploadError && (
              <div className="p-2.5 rounded-card bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold flex items-center gap-2">
                <Icon name="alert" size={16} />
                <span>{mediaUploadError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex-1 w-full flex flex-col gap-3">
                {/* Upload Button & Status */}
                <div className="flex items-center gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                    disabled={isUploadingMedia}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingMedia}
                    className="flex items-center gap-2 shrink-0"
                  >
                    <Icon name="upload" size={16} />
                    <span>{isUploadingMedia ? "در حال آپلود فایل..." : "انتخاب و آپلود تصویر"}</span>
                  </Button>
                  <span className="text-xs text-[var(--text-muted)]">
                    حداکثر ۱۰ مگابایت (JPG, PNG, WebP)
                  </span>
                </div>

                {/* Direct URL Input */}
                <div>
                  <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                    یا آدرس تصویر شاخص (URL)
                  </label>
                  <Input
                    value={coverUrl}
                    onChange={(e) => {
                      setCoverUrl(e.target.value);
                      setCoverImageId(null);
                    }}
                    placeholder="/img/gamnet-1.webp"
                    className="dir-ltr text-right"
                  />
                </div>
              </div>

              {coverUrl && (
                <div className="w-28 h-20 rounded-card overflow-hidden bg-[var(--foreground)] border border-[var(--border-subtle)] shrink-0 relative">
                  <AppImage
                    src={coverUrl}
                    fallbackSrc="/img/gamnet-1.webp"
                    alt="پیش‌نمایش تصویر"
                    className="w-full h-full object-cover"
                    objectFit="cover"
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
