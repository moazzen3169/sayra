"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { BlogPostPreviewModal } from "./BlogPostPreviewModal";
import { BlockEditorFields, BlockSettingsEditor } from "./BlockEditorFields";
import { adminService } from "@/services/adminService";
import { BLOG_API_BASE_URL } from "@/lib/api/config";
import type {
  AdminBlogPostInput,
  BlogBlockType,
  BlogCategory,
  BlogContentBlock,
  BlogPostDetail,
  BlogPostStatus,
} from "@/types/blog";
import type { TagDto } from "@/types/blogApi";

interface BlogPostEditorProps {
  mode: "create" | "edit";
  initialData?: BlogPostDetail | null;
}

const BLOCK_GROUPS: Array<{
  group: string;
  items: Array<{ type: BlogBlockType; label: string; short: string }>;
}> = [
  {
    group: "متن و ساختار",
    items: [
      { type: "heading", label: "عنوان (Heading)", short: "تیتر" },
      { type: "paragraph", label: "پاراگراف (Paragraph)", short: "متن" },
      { type: "quote", label: "نقل‌قول (Quote)", short: "نقل‌قول" },
      { type: "table", label: "جدول (Table)", short: "جدول" },
      { type: "code", label: "کد (Code)", short: "کد" },
      { type: "divider", label: "جداکننده (Divider)", short: "جداکننده" },
    ],
  },
  {
    group: "رسانه",
    items: [
      { type: "image", label: "تصویر (Image)", short: "تصویر" },
      { type: "gallery", label: "گالری (Gallery)", short: "گالری" },
      { type: "video", label: "ویدئو (Video)", short: "ویدئو" },
      { type: "embed", label: "محتوای خارجی (Embed)", short: "Embed" },
    ],
  },
  {
    group: "تعاملی و پیشرفته",
    items: [
      { type: "button", label: "دکمه (Button)", short: "دکمه" },
      { type: "accordion", label: "آکاردئون (Accordion)", short: "آکاردئون" },
      { type: "faq", label: "سوالات متداول (FAQ)", short: "FAQ" },
      { type: "location", label: "موقعیت مکانی (Location)", short: "مکان" },
      { type: "timeline", label: "خط زمانی (Timeline)", short: "تایم‌لاین" },
      { type: "related_articles", label: "مقالات مرتبط", short: "مقالات مرتبط" },
    ],
  },
];

const BLOCK_LABELS: Record<string, string> = Object.fromEntries(
  BLOCK_GROUPS.flatMap((g) => g.items.map((i) => [i.type, i.label]))
);

function createBlockId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function createDefaultBlock(type: BlogBlockType, order: number): BlogContentBlock {
  const base = { id: createBlockId(), version: 1, order };

  switch (type) {
    case "heading":
      return { ...base, type, level: 2, text: "" };
    case "paragraph":
      return { ...base, type, content: [{ type: "text", value: "" }], text: "" };
    case "image":
      return { ...base, type, media_id: 0, caption: "", alt: "", lazy: true, object_fit: "cover" };
    case "gallery":
      return { ...base, type, media_ids: [], layout: "grid", aspect_ratio: "16:9" };
    case "quote":
      return { ...base, type, text: "", citation: "" };
    case "table":
      return { ...base, type, headers: ["ستون اول", "ستون دوم"], rows: [["", ""]] };
    case "code":
      return { ...base, type, code: "", language: "typescript", show_line_numbers: true };
    case "divider":
      return { ...base, type, style: "solid" };
    case "video":
      return { ...base, type, provider: "youtube", external_url: "", controls: true, autoplay: false };
    case "embed":
      return { ...base, type, url: "", embed_type: "iframe", width: 600, height: 400 };
    case "button":
      return { ...base, type, label: "", url: "", target: "_blank", style_preset: "primary" };
    case "accordion":
      return { ...base, type, items: [{ title: "", content: "" }] };
    case "faq":
      return { ...base, type, questions: [{ q: "", a: "" }] };
    case "location":
      return {
        ...base,
        type,
        title: "",
        address: { country: "Iran", province: "", city: "", street: "" },
        coordinates: { latitude: 35.6892, longitude: 51.389 },
        geo: { type: "Point", coordinates: [51.389, 35.6892] },
        contact: {},
        opening_hours: [],
        map: { provider: "google", zoom: 15 },
        description: "",
      };
    case "timeline":
      return {
        ...base,
        type,
        title: "",
        events: [
          {
            id: `ev_${Date.now().toString(36)}_1`,
            date: { type: "year", value: "" },
            title: "",
            description: "",
          },
        ],
        orientation: "vertical",
      };
    case "related_articles":
      return { ...base, type, article_ids: [] };
  }
}

function getBlockPreviewText(block: BlogContentBlock): string {
  switch (block.type) {
    case "heading":
      return block.text ? `H${block.level}: ${block.text}` : "بدون متن";
    case "paragraph": {
      const txt = Array.isArray(block.content)
        ? block.content.map((n) => n.value || "").join("")
        : block.text || "";
      return txt.trim() ? txt.trim().slice(0, 60) : "پاراگراف خالی";
    }
    case "image":
      return block.media_id > 0 ? `رسانه #${block.media_id}` : "بدون تصویر";
    case "gallery":
      return `${block.media_ids.length} تصویر`;
    case "quote":
      return block.text ? block.text.slice(0, 50) : "نقل‌قول خالی";
    case "code":
      return block.language ? `زبان: ${block.language}` : "قطعه کد";
    case "video":
      return block.provider === "local"
        ? `ویدئو #${block.media_id || "-"}`
        : block.external_url || "ویدئو خارجی";
    case "button":
      return block.label || "دکمه بدون عنوان";
    case "faq":
      return `${block.questions.length} پرسش`;
    case "accordion":
      return `${block.items.length} آیتم`;
    case "location":
      return block.title || "موقعیت مکانی";
    case "timeline":
      return block.title || `${block.events.length} رویداد`;
    default:
      return "";
  }
}

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function slugifyTitle(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s_-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function resolvePreviewUrl(url?: string | null): string {
  if (!url || !url.trim()) return "";
  try {
    return new URL(url.trim(), BLOG_API_BASE_URL).toString();
  } catch {
    return url;
  }
}

const selectCls =
  "w-full h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]";
const textareaCls =
  "w-full p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-y leading-6";
const labelCls = "block text-[11px] font-bold text-[var(--text-muted)] mb-1.5";
const cardCls =
  "rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 flex flex-col gap-4";

export const BlogPostEditor: React.FC<BlogPostEditorProps> = ({
  mode,
  initialData,
}) => {
  const router = useRouter();
  const isEdit = mode === "edit" && Boolean(initialData);

  // Core metadata
  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [slugTouched, setSlugTouched] = useState(isEdit);
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [shortDescription, setShortDescription] = useState(
    initialData?.shortDescription || ""
  );
  const [languageCode, setLanguageCode] = useState(
    initialData?.languageCode || "fa"
  );

  // Publishing & Taxonomy
  const [status, setStatus] = useState<BlogPostStatus>(
    initialData?.status || "DRAFT"
  );
  const [visibility, setVisibility] = useState<"public" | "private" | "unlisted">(
    initialData?.visibility || "public"
  );
  const [featured, setFeatured] = useState(Boolean(initialData?.featured));
  const [publishedAt, setPublishedAt] = useState(
    toDatetimeLocalValue(initialData?.publishedAt)
  );
  const [category, setCategory] = useState(initialData?.category || "");
  const [categories, setCategories] = useState<BlogCategory[]>([]);

  // Tags
  const [selectedTags, setSelectedTags] = useState<string[]>(
    initialData?.tags || []
  );
  const [tagInput, setTagInput] = useState("");
  const [availableTags, setAvailableTags] = useState<TagDto[]>([]);

  // Media (Cover & OG)
  const [coverImageId, setCoverImageId] = useState<string>(
    initialData?.coverImageId || ""
  );
  const [coverUrl, setCoverUrl] = useState<string>(initialData?.coverUrl || "");
  const [ogImageId, setOgImageId] = useState<string>(
    initialData?.ogImageId || ""
  );
  const [ogImageUrl, setOgImageUrl] = useState<string>(
    initialData?.ogImageUrl || ""
  );
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingOg, setUploadingOg] = useState(false);

  // SEO
  const [seoTitle, setSeoTitle] = useState(initialData?.seoTitle || "");
  const [seoDescription, setSeoDescription] = useState(
    initialData?.seoDescription || ""
  );
  const [canonicalUrl, setCanonicalUrl] = useState(
    initialData?.canonicalUrl || ""
  );

  // Content Blocks
  const [blocks, setBlocks] = useState<BlogContentBlock[]>(() =>
    initialData?.content?.length
      ? initialData.content
      : [createDefaultBlock("paragraph", 1)]
  );
  const [collapsedIds, setCollapsedIds] = useState<Record<string, boolean>>({});
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // UI & Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);
  const ogInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminService
      .getBlogCategories()
      .then((cats) => {
        setCategories(cats);
        // Resolve category name -> category ID when editing
        if (cats.length > 0) {
          setCategory((prev) => {
            if (!prev) return cats[0].id;
            const byId = cats.find((c) => c.id === prev);
            if (byId) return byId.id;
            const byLabel = cats.find(
              (c) => c.label.trim().toLowerCase() === prev.trim().toLowerCase()
            );
            return byLabel ? byLabel.id : prev;
          });
        }
      })
      .catch(console.warn);

    adminService.getTagsList().then(setAvailableTags).catch(console.warn);
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched && !isEdit) {
      const generated = slugifyTitle(val);
      if (generated) setSlug(generated);
    }
  };

  const handleUploadImage = async (
    file: File,
    target: "cover" | "og"
  ) => {
    const setUploading = target === "cover" ? setUploadingCover : setUploadingOg;
    setUploading(true);
    setError(null);
    try {
      const media = await adminService.uploadMedia({
        file,
        title: file.name,
        alt_text: title.trim() || file.name,
      });
      if (media.id != null) {
        const url = resolvePreviewUrl(media.url);
        if (target === "cover") {
          setCoverImageId(String(media.id));
          setCoverUrl(url);
        } else {
          setOgImageId(String(media.id));
          setOgImageUrl(url);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در آپلود تصویر.");
    } finally {
      setUploading(false);
    }
  };

  const addTag = (rawTag: string) => {
    const t = rawTag.trim();
    if (!t) return;
    if (!selectedTags.includes(t)) {
      setSelectedTags((prev) => [...prev, t]);
    }
    setTagInput("");
  };

  const removeTag = (tagToRemove: string) => {
    setSelectedTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  // Block operations
  const addBlock = (type: BlogBlockType) => {
    const next = createDefaultBlock(type, blocks.length + 1);
    setBlocks((prev) => [...prev, next]);
  };

  const updateBlock = (index: number, updated: BlogContentBlock) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? updated : b)));
  };

  const removeBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const duplicateBlock = (index: number) => {
    setBlocks((prev) => {
      const target = prev[index];
      if (!target) return prev;
      const copy: BlogContentBlock = {
        ...JSON.parse(JSON.stringify(target)),
        id: createBlockId(),
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  };

  const moveBlock = (from: number, to: number) => {
    if (to < 0 || to >= blocks.length || from === to) return;
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleSave = async (submitStatus: BlogPostStatus) => {
    if (isSubmitting) return;
    setError(null);
    setSuccessMsg(null);
    setFieldErrors({});

    const nextFieldErrors: Record<string, string> = {};

    if (!title.trim()) {
      nextFieldErrors.title = "عنوان مقاله الزامی است.";
    }

    const normalizedSlug = slug.trim();
    if (!normalizedSlug) {
      nextFieldErrors.slug = "شناسه (Slug) مقاله الزامی است.";
    } else if (!/^[-a-zA-Z0-9_]+$/.test(normalizedSlug)) {
      nextFieldErrors.slug =
        "اسلاگ فقط می‌تواند شامل حروف انگلیسی، اعداد، خط فاصله (-) و زیرخط (_) باشد.";
    }

    if (!excerpt.trim()) {
      nextFieldErrors.excerpt = "خلاصه (Excerpt) مقاله الزامی است.";
    }

    if (canonicalUrl.trim()) {
      try {
        new URL(canonicalUrl.trim());
      } catch {
        nextFieldErrors.canonical_url = "نشانی Canonical باید یک URL معتبر (با http/https) باشد.";
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("لطفاً خطاهای مشخص‌شده در فرم را برطرف کنید.");
      return;
    }

    if (submitStatus === "PUBLISHED" && blocks.length === 0) {
      setError("برای انتشار مقاله، حداقل یک بلوک محتوایی لازم است.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload: AdminBlogPostInput = {
        languageCode,
        title: title.trim(),
        slug: normalizedSlug,
        excerpt: excerpt.trim(),
        shortDescription: shortDescription.trim() || excerpt.trim(),
        category,
        authorName: initialData?.authorName || "تحریریه سایرا",
        readingMinutes: initialData?.readingMinutes || 5,
        featured,
        coverUrl: coverUrl.trim(),
        coverImageId: coverImageId.trim() || (isEdit ? null : undefined),
        ogImageId: ogImageId.trim() || (isEdit ? null : undefined),
        tags: selectedTags,
        status: submitStatus,
        visibility,
        seoTitle: seoTitle.trim() || undefined,
        seoDescription: seoDescription.trim() || undefined,
        canonicalUrl: canonicalUrl.trim() || null,
        publishedAt: publishedAt ? new Date(publishedAt).toISOString() : null,
        content: blocks,
      };

      let saved: BlogPostDetail;
      if (isEdit && initialData) {
        saved = await adminService.updateBlogPost(
          initialData.slug || initialData.id,
          payload
        );
      } else {
        saved = await adminService.createBlogPost(payload);
      }

      setSuccessMsg(
        isEdit
          ? `تغییرات مقاله «${saved.title}» با موفقیت ذخیره شد.`
          : `مقاله «${saved.title}» با موفقیت ایجاد شد.`
      );

      setTimeout(() => {
        router.push("/admin/blog");
      }, 800);
    } catch (err: unknown) {
      const e = err as Error & {
        details?: Record<string, unknown>;
        status?: number;
      };
      if (e.status === 403) {
        setError("شما دسترسی لازم برای این عملیات را ندارید (403).");
      } else if (e.status === 401) {
        setError("نشست کاربری منقضی شده است. لطفاً مجدداً وارد شوید.");
      } else if (e.details && typeof e.details === "object") {
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(e.details)) {
          mapped[k] = Array.isArray(v) ? v.join(" ") : String(v);
        }
        setFieldErrors(mapped);
        setError(e.message || "خطای اعتبارسنجی در داده‌های ارسالی (400).");
      } else {
        setError(e.message || "خطا در ذخیره‌سازی مقاله.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const previewPost: BlogPostDetail = {
    id: initialData?.id || "preview",
    slug: slug.trim() || "preview",
    title: title.trim() || "پیش‌نمایش مقاله",
    excerpt: excerpt.trim(),
    coverUrl: coverUrl.trim() || "/img/gamnet-1.webp",
    category,
    categoryLabel:
      categories.find((c) => c.id === category)?.label || category || "عمومی",
    authorName: initialData?.authorName || "تحریریه سایرا",
    publishedAt: publishedAt || new Date().toISOString(),
    readingMinutes: Math.max(1, Math.ceil(blocks.length * 1.2)),
    tags: selectedTags,
    featured,
    status,
    visibility,
    content: blocks,
  };

  return (
    <AdminPageContainer>
      <div className="flex w-full flex-col gap-6 pb-12">
        {/* Sticky Action Header */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)]/95 p-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/blog"
              className="flex h-9 items-center gap-1.5 rounded-card border border-[var(--border-subtle)] px-3 text-xs font-bold text-[var(--text-muted)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
            >
              <Icon name="back" size={14} />
              <span>بازگشت به لیست</span>
            </Link>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[var(--text-white)] sm:text-lg">
                  {isEdit ? "ویرایش مقاله" : "ایجاد مقاله جدید"}
                </h1>
                <Badge
                  variant={
                    status === "PUBLISHED"
                      ? "success"
                      : status === "ARCHIVED"
                        ? "neutral"
                        : "warning"
                  }
                >
                  {status === "PUBLISHED"
                    ? "منتشرشده"
                    : status === "ARCHIVED"
                      ? "بایگانی‌شده"
                      : "پیش‌نویس"}
                </Badge>
              </div>
              {isEdit && initialData?.slug && (
                <span className="text-[11px] text-[var(--text-muted)]" dir="ltr">
                  /blog/{initialData.slug}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsPreviewOpen(true)}
            >
              <Icon name="info" size={14} />
              <span>پیش‌نمایش</span>
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleSave("DRAFT")}
              isLoading={isSubmitting}
              disabled={uploadingCover || uploadingOg}
            >
              <span>ذخیره پیش‌نویس</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => void handleSave(status === "ARCHIVED" ? "ARCHIVED" : "PUBLISHED")}
              isLoading={isSubmitting}
              disabled={uploadingCover || uploadingOg}
            >
              <Icon name="check" size={14} />
              <span>{isEdit ? "ذخیره و انتشار" : "انتشار مقاله"}</span>
            </Button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="flex flex-col gap-1.5 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/15 p-4 text-xs text-[var(--accent-red)]">
            <div className="flex items-center gap-2 font-bold">
              <Icon name="alert" size={16} />
              <span>{error}</span>
            </div>
            {Object.keys(fieldErrors).length > 0 && (
              <ul className="list-disc pr-5 text-[11px] leading-6">
                {Object.entries(fieldErrors).map(([k, v]) => (
                  <li key={k}>
                    <span className="font-bold">{k}:</span> {v}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {successMsg && (
          <div className="flex items-center gap-2 rounded-card border border-[var(--accent-green)]/30 bg-[var(--accent-green)]/15 p-4 text-xs font-bold text-[var(--accent-green)]">
            <Icon name="check" size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Main 2-Column Editor Grid */}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Right / Main Column: Title, Excerpt & Block Builder */}
          <div className="flex flex-col gap-6 lg:col-span-8">
            <section className={cardCls}>
              <h2 className="text-sm font-bold text-[var(--text-white)]">
                اطلاعات اصلی مقاله
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className={labelCls}>عنوان مقاله *</label>
                  <Input
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="عنوان جذاب و خوانا برای مقاله..."
                    error={fieldErrors.title}
                  />
                </div>

                <div className="sm:col-span-2">
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[11px] font-bold text-[var(--text-muted)]">
                      شناسه یکتا (Slug) *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const gen = slugifyTitle(title);
                        if (gen) setSlug(gen);
                      }}
                      className="text-[11px] font-semibold text-[var(--primary)] hover:underline"
                    >
                      تولید خودکار از عنوان انگلیسی
                    </button>
                  </div>
                  <Input
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="example-article-slug"
                    dir="ltr"
                    error={fieldErrors.slug}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>چکیده / خلاصه مقاله (Excerpt) *</label>
                  <textarea
                    rows={3}
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="خلاصه‌ای کوتاه از محتوای مقاله برای نمایش در لیست و شبکه‌های اجتماعی..."
                    className={textareaCls}
                  />
                  {fieldErrors.excerpt && (
                    <p className="mt-1 text-xs text-[var(--accent-red)]">
                      {fieldErrors.excerpt}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className={labelCls}>توضیح کوتاه (Short Description - اختیاری)</label>
                  <Input
                    value={shortDescription}
                    onChange={(e) => setShortDescription(e.target.value)}
                    placeholder="در صورت خالی بودن، مقدار چکیده استفاده می‌شود"
                  />
                </div>
              </div>
            </section>

            {/* Block Builder */}
            <section className={cardCls}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-bold text-[var(--text-white)]">
                    محتوای مقاله (Block Builder)
                  </h2>
                  <p className="text-[11px] text-[var(--text-muted)]">
                    پشتیبانی از ۱۶ نوع بلوک استاندارد بک‌اند — با کشیدن و رها کردن (Drag & Drop) یا دکمه‌های بالا/پایین مرتب کنید.
                  </p>
                </div>
                <span className="rounded-full bg-[var(--foreground)] px-3 py-1 text-xs font-bold text-[var(--primary)]">
                  {blocks.length} بلوک
                </span>
              </div>

              {/* Blocks List */}
              <div className="flex flex-col gap-3">
                {blocks.length === 0 ? (
                  <div className="rounded-card border border-dashed border-[var(--border-subtle)] p-8 text-center text-xs text-[var(--text-muted)]">
                    هنوز بلوکی اضافه نشده است. از نوار پایین یک بلوک انتخاب کنید.
                  </div>
                ) : (
                  blocks.map((block, index) => {
                    const bId = block.id || String(index);
                    const isCollapsed = Boolean(collapsedIds[bId]);
                    const label = BLOCK_LABELS[block.type] || block.type;
                    const preview = getBlockPreviewText(block);

                    return (
                      <div
                        key={bId}
                        draggable
                        onDragStart={() => setDragIndex(index)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIndex !== null && dragIndex !== index) {
                            moveBlock(dragIndex, index);
                          }
                          setDragIndex(null);
                        }}
                        onDragEnd={() => setDragIndex(null)}
                        className={`rounded-card border transition-colors ${
                          dragIndex === index
                            ? "border-[var(--primary)] bg-[var(--primary)]/5"
                            : "border-[var(--border-subtle)] bg-[var(--foreground)]/20"
                        }`}
                      >
                        {/* Block Header */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)]/60 px-3.5 py-2.5">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className="cursor-grab text-xs text-[var(--text-muted)] select-none"
                              title="بکشید و رها کنید"
                            >
                              ⋮⋮
                            </span>
                            <span className="rounded bg-[var(--primary)]/15 px-2 py-0.5 text-[11px] font-bold text-[var(--primary)]">
                              #{index + 1}
                            </span>
                            <span className="text-xs font-bold text-[var(--text-white)]">
                              {label}
                            </span>
                            {preview && (
                              <span className="hidden truncate text-[11px] text-[var(--text-muted)] sm:inline max-w-[220px]">
                                — {preview}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveBlock(index, index - 1)}
                              disabled={index === 0}
                              className="rounded px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--foreground)] hover:text-white disabled:opacity-30"
                              title="انتقال به بالا"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveBlock(index, index + 1)}
                              disabled={index === blocks.length - 1}
                              className="rounded px-2 py-1 text-xs text-[var(--text-muted)] hover:bg-[var(--foreground)] hover:text-white disabled:opacity-30"
                              title="انتقال به پایین"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => duplicateBlock(index)}
                              className="rounded px-2 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--foreground)] hover:text-white"
                              title="کپی بلوک"
                            >
                              کپی
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setCollapsedIds((prev) => ({
                                  ...prev,
                                  [bId]: !isCollapsed,
                                }))
                              }
                              className="rounded px-2 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--foreground)] hover:text-white"
                            >
                              {isCollapsed ? "باز کردن" : "بستن"}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeBlock(index)}
                              className="rounded px-2 py-1 text-xs text-[var(--accent-red)] hover:bg-[var(--accent-red)]/15"
                              title="حذف بلوک"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Block Body */}
                        {!isCollapsed && (
                          <div className="flex flex-col gap-3 p-3.5">
                            <BlockEditorFields
                              block={block}
                              onChange={(updated) => updateBlock(index, updated)}
                            />
                            <BlockSettingsEditor
                              settings={block.settings}
                              onChange={(nextSettings) =>
                                updateBlock(index, {
                                  ...block,
                                  settings: nextSettings,
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Add Block Palette */}
              <div className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/25 p-4">
                <span className="text-xs font-bold text-[var(--text-white)]">
                  + افزودن بلوک جدید
                </span>
                <div className="flex flex-col gap-2.5">
                  {BLOCK_GROUPS.map((grp) => (
                    <div key={grp.group} className="flex flex-wrap items-center gap-1.5">
                      <span className="min-w-[95px] text-[11px] font-semibold text-[var(--text-muted)]">
                        {grp.group}:
                      </span>
                      {grp.items.map((item) => (
                        <button
                          key={item.type}
                          type="button"
                          onClick={() => addBlock(item.type)}
                          className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--text-white)] transition-colors hover:border-[var(--primary)] hover:text-[var(--primary)]"
                        >
                          + {item.short}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* Left / Sidebar Column: Publish, Taxonomy, Media, SEO */}
          <aside className="flex flex-col gap-6 lg:col-span-4 lg:sticky lg:top-24">
            {/* Publish Settings */}
            <section className={cardCls}>
              <h2 className="text-sm font-bold text-[var(--text-white)]">
                تنظیمات انتشار
              </h2>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
                <div>
                  <label className={labelCls}>وضعیت مقاله</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as BlogPostStatus)}
                    className={selectCls}
                  >
                    <option value="DRAFT" className="bg-[var(--bg-card)]">پیش‌نویس (Draft)</option>
                    <option value="PUBLISHED" className="bg-[var(--bg-card)]">منتشرشده (Published)</option>
                    <option value="ARCHIVED" className="bg-[var(--bg-card)]">بایگانی‌شده (Archived)</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>سطح دسترسی (Visibility)</label>
                  <select
                    value={visibility}
                    onChange={(e) =>
                      setVisibility(
                        e.target.value as "public" | "private" | "unlisted"
                      )
                    }
                    className={selectCls}
                  >
                    <option value="public" className="bg-[var(--bg-card)]">عمومی (Public)</option>
                    <option value="unlisted" className="bg-[var(--bg-card)]">فقط با لینک (Unlisted)</option>
                    <option value="private" className="bg-[var(--bg-card)]">خصوصی (Private)</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>زبان مقاله (Language)</label>
                  <select
                    value={languageCode}
                    onChange={(e) => setLanguageCode(e.target.value)}
                    className={selectCls}
                  >
                    <option value="fa" className="bg-[var(--bg-card)]">فارسی (fa)</option>
                    <option value="en" className="bg-[var(--bg-card)]">انگلیسی (en)</option>
                  </select>
                </div>

                <div>
                  <label className={labelCls}>زمان‌بندی انتشار (اختیاری)</label>
                  <input
                    type="datetime-local"
                    value={publishedAt}
                    onChange={(e) => setPublishedAt(e.target.value)}
                    className={selectCls}
                    dir="ltr"
                  />
                </div>

                <label className="flex cursor-pointer items-center gap-2 pt-1 text-xs font-medium text-[var(--text-white)]">
                  <input
                    type="checkbox"
                    checked={featured}
                    onChange={(e) => setFeatured(e.target.checked)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                  <span>نمایش به عنوان مقاله ویژه (Hot)</span>
                </label>
              </div>
            </section>

            {/* Category & Tags */}
            <section className={cardCls}>
              <h2 className="text-sm font-bold text-[var(--text-white)]">
                دسته‌بندی و برچسب‌ها
              </h2>

              <div>
                <label className={labelCls}>دسته‌بندی</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={selectCls}
                >
                  <option value="" className="bg-[var(--bg-card)]">
                    انتخاب دسته‌بندی...
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[var(--bg-card)]">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>برچسب‌ها (Tags)</label>
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    placeholder="نام برچسب و Enter..."
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => addTag(tagInput)}
                  >
                    افزودن
                  </Button>
                </div>

                {selectedTags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1.5 rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-2.5 py-1 text-[11px] font-bold text-[var(--primary)]"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="hover:text-[var(--accent-red)]"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {availableTags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {availableTags
                      .filter((t) => !selectedTags.includes(t.name))
                      .slice(0, 10)
                      .map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => addTag(t.name)}
                          className="rounded-full border border-[var(--border-subtle)] px-2 py-0.5 text-[10px] text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)]"
                        >
                          + {t.name}
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </section>

            {/* Cover Image */}
            <section className={cardCls}>
              <h2 className="text-sm font-bold text-[var(--text-white)]">
                تصویر شاخص (Cover Image)
              </h2>

              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleUploadImage(file, "cover");
                  e.target.value = "";
                }}
              />

              {coverUrl ? (
                <div className="relative overflow-hidden rounded-card border border-[var(--border-subtle)]">
                  <img
                    src={coverUrl}
                    alt="تصویر شاخص"
                    className="aspect-video w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setCoverUrl("");
                      setCoverImageId("");
                    }}
                    className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[var(--accent-red)]"
                  >
                    حذف
                  </button>
                </div>
              ) : (
                <div className="rounded-card border border-dashed border-[var(--border-subtle)] p-6 text-center text-xs text-[var(--text-muted)]">
                  تصویر شاخص انتخاب نشده است
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => coverInputRef.current?.click()}
                  isLoading={uploadingCover}
                >
                  <Icon name="upload" size={14} />
                  <span>آپلود تصویر شاخص</span>
                </Button>
                {coverImageId && (
                  <span className="text-[11px] font-semibold text-[var(--accent-green)]">
                    Media ID: {coverImageId}
                  </span>
                )}
              </div>
            </section>

            {/* SEO & OpenGraph */}
            <section className={cardCls}>
              <h2 className="text-sm font-bold text-[var(--text-white)]">
                تنظیمات سئو (SEO & OpenGraph)
              </h2>

              <div>
                <label className={labelCls}>عنوان سئو (SEO Title)</label>
                <Input
                  value={seoTitle}
                  onChange={(e) => setSeoTitle(e.target.value)}
                  placeholder="عنوان نمایش در نتایج گوگل..."
                />
              </div>

              <div>
                <label className={labelCls}>توضیحات سئو (Meta Description)</label>
                <textarea
                  rows={2}
                  value={seoDescription}
                  onChange={(e) => setSeoDescription(e.target.value)}
                  placeholder="توضیحات متا برای موتورهای جستجو..."
                  className={textareaCls}
                />
              </div>

              <div>
                <label className={labelCls}>نشانی کانونیکال (Canonical URL)</label>
                <Input
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                  placeholder="https://sayra-booking.ir/blog/..."
                  dir="ltr"
                  error={fieldErrors.canonical_url}
                />
              </div>

              <div>
                <label className={labelCls}>تصویر اشتراک‌گذاری (OG Image)</label>
                <input
                  ref={ogInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleUploadImage(file, "og");
                    e.target.value = "";
                  }}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => ogInputRef.current?.click()}
                    isLoading={uploadingOg}
                  >
                    <Icon name="upload" size={14} />
                    <span>آپلود OG Image</span>
                  </Button>
                  {ogImageId && (
                    <span className="text-[11px] font-semibold text-[var(--accent-green)]">
                      ID: {ogImageId}
                    </span>
                  )}
                  {ogImageUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setOgImageId("");
                        setOgImageUrl("");
                      }}
                      className="text-[11px] text-[var(--accent-red)] hover:underline"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <BlogPostPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        post={previewPost}
      />
    </AdminPageContainer>
  );
};
