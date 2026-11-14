"use client";

import React, { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AppImage } from "@/components/common/AppImage";
import { BlogPostPreviewModal } from "./BlogPostPreviewModal";

import type {
  BlogPostDetail,
  BlogPostStatus,
  BlogCategory,
  BlogContentBlock,
  AdminBlogPostInput,
  BlogBlockType,
} from "@/types/blog";

import type { TagDto, AuthorProfileDto } from "@/types/blogApi";

import { adminService } from "@/services/adminService";

interface BlogPostFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialData?: BlogPostDetail | null;
  onSuccess: (post: BlogPostDetail) => void;
}

interface BlogPostFormContentProps extends BlogPostFormModalProps {}

const BLOCK_OPTIONS: Array<{
  type: BlogBlockType;
  label: string;
}> = [
  { type: "heading", label: "عنوان (Heading)" },
  { type: "paragraph", label: "پاراگراف (Paragraph)" },
  { type: "image", label: "تصویر (Image)" },
  { type: "gallery", label: "گالری (Gallery)" },
  { type: "quote", label: "نقل‌قول (Quote)" },
  { type: "table", label: "جدول (Table)" },
  { type: "code", label: "کد (Code)" },
  { type: "divider", label: "جداکننده (Divider)" },
  { type: "video", label: "ویدئو (Video)" },
  { type: "embed", label: "محتوای خارجی (Embed)" },
  { type: "button", label: "دکمه (Button)" },
  { type: "accordion", label: "آکاردئون (Accordion)" },
  { type: "faq", label: "سوالات متداول (FAQ)" },
  { type: "location", label: "موقعیت مکانی (Location)" },
  { type: "timeline", label: "خط زمانی (Timeline)" },
  {
    type: "related_articles",
    label: "مقالات مرتبط (Related Articles)",
  },
];

function createBlockId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `block-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function createDefaultBlock(
  type: BlogBlockType,
  order: number,
): BlogContentBlock {
  const base = {
    id: createBlockId(),
    version: 1,
    order,
  };

  switch (type) {
    case "heading":
      return {
        ...base,
        type,
        level: 2,
        text: "",
      };

    case "paragraph":
      return {
        ...base,
        type,
        content: [{ type: "text", value: "" }],
        text: "",
      };

    case "image":
      return {
        ...base,
        type,
        media_id: 0,
        caption: "",
        alt: "",
        lazy: true,
        object_fit: "cover",
      };

    case "gallery":
      return {
        ...base,
        type,
        media_ids: [],
        layout: "grid",
        aspect_ratio: "16:9",
      };

    case "quote":
      return {
        ...base,
        type,
        text: "",
        citation: "",
      };

    case "table":
      return {
        ...base,
        type,
        headers: ["ستون اول"],
        rows: [[""]],
      };

    case "code":
      return {
        ...base,
        type,
        code: "",
        language: "text",
        show_line_numbers: true,
      };

    case "divider":
      return {
        ...base,
        type,
        style: "solid",
      };

    case "video":
      return {
        ...base,
        type,
        provider: "youtube",
        external_url: "",
        controls: true,
        autoplay: false,
      };

    case "embed":
      return {
        ...base,
        type,
        url: "",
        embed_type: "iframe",
        width: 100,
        height: 400,
      };

    case "button":
      return {
        ...base,
        type,
        label: "",
        url: "",
        target: "_blank",
        style_preset: "primary",
      };

    case "accordion":
      return {
        ...base,
        type,
        items: [
          {
            title: "",
            content: "",
          },
        ],
      };

    case "faq":
      return {
        ...base,
        type,
        questions: [
          {
            q: "",
            a: "",
          },
        ],
      };

    case "location":
      return {
        ...base,
        type,
        title: "",
        address: {
          country: "",
          province: "",
          city: "",
          street: "",
        },
        coordinates: {
          latitude: 0,
          longitude: 0,
        },
        geo: {
          type: "Point",
          coordinates: [0, 0],
        },
        contact: {},
        opening_hours: [],
        map: {
          provider: "google",
          zoom: 15,
        },
        description: "",
      };

    case "timeline":
      return {
        ...base,
        type,
        title: "",
        events: [],
        orientation: "vertical",
      };

    case "related_articles":
      return {
        ...base,
        type,
        article_ids: [],
      };
  }
}

function getBlockLabel(type: string): string {
  return BLOCK_OPTIONS.find((item) => item.type === type)?.label || type;
}

function getBlockKey(block: BlogContentBlock, index: number): string {
  return block.id || `block-index-${index}`;
}

function serializeBlock(block: BlogContentBlock): string {
  if (block.type === "unsupported") {
    return JSON.stringify(block.raw, null, 2);
  }

  return JSON.stringify(block, null, 2);
}

/**
 * حذف بلوک‌های خالی و نرمال‌سازی محتوای مقاله قبل از ارسال به API
 */
const normalizeContentBlocks = (
  blocks: BlogContentBlock[],
): BlogContentBlock[] => {
  return blocks.reduce<BlogContentBlock[]>((result, block) => {
    if (block.type === "paragraph") {
      const text = block.text?.trim() ?? "";

      if (text.length > 0) {
        result.push({
          ...block,
          text,
        });
      }

      return result;
    }

    if (block.type === "heading") {
      const text = block.text?.trim() ?? "";

      if (text.length > 0) {
        result.push({
          ...block,
          text,
        });
      }

      return result;
    }

    if (block.type === "quote") {
      const text = block.text?.trim() ?? "";

      if (text.length > 0) {
        result.push({
          ...block,
          text,
        });
      }

      return result;
    }

    if (block.type === "list") {
      const items = block.items
        .filter((item) => typeof item === "string")
        .map((item) => item.trim())
        .filter((item) => item.length > 0);

      if (items.length > 0) {
        result.push({
          ...block,
          items,
        });
      }

      return result;
    }

    return result;
  }, []);
};

const BlogPostFormContent: React.FC<BlogPostFormContentProps> = ({
  isOpen,
  onClose,
  initialData,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [allAvailableTags, setAllAvailableTags] = useState<TagDto[]>([]);
  const [authors, setAuthors] = useState<AuthorProfileDto[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState(initialData?.title || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [category, setCategory] = useState(initialData?.category || "1");
  const [authorName, setAuthorName] = useState(
    initialData?.authorName || "تحریریه‌ی سایرا",
  );
  const [readingMinutes, setReadingMinutes] = useState(
    initialData?.readingMinutes || 5,
  );
  const [featured, setFeatured] = useState(Boolean(initialData?.featured));
  const [excerpt, setExcerpt] = useState(initialData?.excerpt || "");
  const [coverUrl, setCoverUrl] = useState(
    initialData?.coverUrl || "/img/gamnet-1.webp",
  );
  const [coverImageId, setCoverImageId] = useState<string | number | null>(
    null,
  );

  const [status, setStatus] = useState<BlogPostStatus>(
    initialData?.status || "DRAFT",
  );

const [contentBlocks, setContentBlocks] = useState<BlogContentBlock[]>(() =>
  initialData?.content && initialData.content.length > 0
    ? normalizeContentBlocks(initialData.content)
    : [
        {
          type: "paragraph",
          content: [{ type: "text", value: "" }],
          text: "",
        },
      ],
);

  /**
   * JSON drafts allow editing nested block properties without
   * losing fields that the current UI does not explicitly render.
   */
  const [blockDrafts, setBlockDrafts] = useState<Record<string, string>>({});

  const [blockJsonErrors, setBlockJsonErrors] = useState<
    Record<string, string>
  >({});

  const [newBlockType, setNewBlockType] = useState<BlogBlockType>("paragraph");

  const [selectedTagNames, setSelectedTagNames] = useState<string[]>(
    initialData?.tags || [],
  );

  const [newTagInput, setNewTagInput] = useState("");

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  /* -----------------------------------------------------------------------
     LOAD INITIAL ARTICLE
     ----------------------------------------------------------------------- */

  useEffect(() => {
    let isMounted = true;

    if (!initialData?.slug) {
      return () => {
        isMounted = false;
      };
    }

    adminService
      .getBlogPostById(initialData.slug)
      .then((fresh) => {
        if (!isMounted || !fresh) return;

        setTitle(fresh.title || "");
        setSlug(fresh.slug || "");
        setCategory(fresh.category || "1");
        setAuthorName(fresh.authorName || "تحریریه‌ی سایرا");
        setReadingMinutes(fresh.readingMinutes || 5);
        setFeatured(Boolean(fresh.featured));
        setExcerpt(fresh.excerpt || "");
        setCoverUrl(fresh.coverUrl || "/img/gamnet-1.webp");
        setSelectedTagNames(fresh.tags || []);
        setStatus(fresh.status || "DRAFT");

        if (fresh.content?.length) {
          setContentBlocks([...fresh.content]);
          setBlockDrafts({});
          setBlockJsonErrors({});
        }
      })
      .catch((err) => {
        console.warn("Failed to load article details:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [initialData?.slug]);

  /* -----------------------------------------------------------------------
     LOAD FORM DATA
     ----------------------------------------------------------------------- */

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      adminService.getBlogCategories(),
      adminService.getTagsList(),
      adminService.getAuthorsList(),
    ])
      .then(([categoryList, tagList, authorList]) => {
        if (!isMounted) return;

        setCategories(categoryList || []);
        setAllAvailableTags(tagList || []);
        setAuthors(authorList || []);
      })
      .catch((err) => {
        console.warn("Failed to load blog form data:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  /* -----------------------------------------------------------------------
     SLUG
     ----------------------------------------------------------------------- */

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

  /* -----------------------------------------------------------------------
     BLOCK MANAGEMENT
     ----------------------------------------------------------------------- */

  const handleAddBlock = () => {
    const block = createDefaultBlock(newBlockType, contentBlocks.length);

    setContentBlocks((previous) => [...previous, block]);
  };

  const handleRemoveBlock = (index: number) => {
    const removed = contentBlocks[index];
    const removedKey = getBlockKey(removed, index);

    setContentBlocks((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index),
    );

    setBlockDrafts((previous) => {
      const next = { ...previous };
      delete next[removedKey];
      return next;
    });

    setBlockJsonErrors((previous) => {
      const next = { ...previous };
      delete next[removedKey];
      return next;
    });
  };

  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    setContentBlocks((previous) => {
      const next = [...previous];
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= next.length) {
        return previous;
      }

      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];

      return next;
    });
  };

  const handleBlockJsonChange = (key: string, value: string) => {
    setBlockDrafts((previous) => ({
      ...previous,
      [key]: value,
    }));

    setBlockJsonErrors((previous) => {
      const next = { ...previous };
      delete next[key];
      return next;
    });
  };

  const handleBlockJsonBlur = (blockIndex: number, key: string) => {
    const draft = blockDrafts[key];

    if (draft === undefined) return;

    try {
      const parsed: unknown = JSON.parse(draft);

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("ساختار بلوک باید یک JSON Object باشد.");
      }

      const parsedBlock = parsed as Record<string, unknown>;

      setContentBlocks((previous) => {
        const next = [...previous];

        if (next[blockIndex]?.type === "unsupported") {
          const current = next[blockIndex];

          next[blockIndex] = {
            ...current,
            raw: parsedBlock,
          };
        } else {
          next[blockIndex] = parsedBlock as unknown as BlogContentBlock;
        }

        return next;
      });

      setBlockDrafts((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });

      setBlockJsonErrors((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "ساختار JSON معتبر نیست.";

      setBlockJsonErrors((previous) => ({
        ...previous,
        [key]: message,
      }));
    }
  };

  const getContentBlocksForSave = (): BlogContentBlock[] => {
    return contentBlocks.map((block, index) => {
      // پاراگراف متن عادی است و نباید JSON.parse شود.
      if (block.type === "paragraph") {
        const text = (block.text ?? "").trim();

        return {
          ...block,
          text,
          content: [{ type: "text", value: text }],
        } as BlogContentBlock;
      }

      // سایر بلوک‌ها همچنان با JSON پردازش می‌شوند.
      const key = getBlockKey(block, index);
      const draft = blockDrafts[key];

      if (draft === undefined) {
        return block;
      }

      let parsed: unknown;

      try {
        parsed = JSON.parse(draft);
      } catch {
        throw new Error(`ساختار JSON بلوک شماره ${index + 1} معتبر نیست.`);
      }

      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error(
          `محتوای بلوک شماره ${index + 1} باید یک JSON Object باشد.`,
        );
      }

      const parsedBlock = parsed as Record<string, unknown>;

      if (block.type === "unsupported") {
        return {
          ...block,
          raw: parsedBlock,
        };
      }

      return parsedBlock as unknown as BlogContentBlock;
    });
  };
  /* -----------------------------------------------------------------------
     TAGS
     ----------------------------------------------------------------------- */

  const handleToggleTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed) return;

    setSelectedTagNames((previous) =>
      previous.some((item) => item.toLowerCase() === trimmed.toLowerCase())
        ? previous.filter(
            (item) => item.toLowerCase() !== trimmed.toLowerCase(),
          )
        : [...previous, trimmed],
    );
  };

  const handleAddNewTag = async () => {
    const trimmed = newTagInput.trim();
    if (!trimmed) return;

    if (
      selectedTagNames.some(
        (tag) => tag.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setNewTagInput("");
      return;
    }

    const existing = allAvailableTags.find(
      (tag) =>
        tag.name.trim().toLowerCase() === trimmed.toLowerCase() ||
        tag.slug.trim().toLowerCase() === trimmed.toLowerCase(),
    );

    if (existing) {
      setSelectedTagNames((previous) => [...previous, existing.name]);
      setNewTagInput("");
      return;
    }

    try {
      const rawSlug = trimmed
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim();

      const tagSlug = rawSlug || `tag-${Date.now().toString(36)}`;

      const created = await adminService.createTag({
        name: trimmed,
        slug: tagSlug,
      });

      setAllAvailableTags((previous) => [...previous, created]);

      setSelectedTagNames((previous) => [...previous, created.name]);
    } catch {
      setSelectedTagNames((previous) => [...previous, trimmed]);
    }

    setNewTagInput("");
  };

  const handleRemoveSelectedTag = (tagName: string) => {
    setSelectedTagNames((previous) =>
      previous.filter((tag) => tag !== tagName),
    );
  };

  /* -----------------------------------------------------------------------
     COVER IMAGE UPLOAD
     ----------------------------------------------------------------------- */

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMediaUploadError(null);

    if (!file.type.startsWith("image/")) {
      setMediaUploadError("فقط فایل‌های تصویری مجاز هستند.");
      return;
    }

    const maxSize = 10 * 1024 * 1024;

    if (file.size > maxSize) {
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
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "خطا در آپلود تصویر.";

      setMediaUploadError(message);
    } finally {
      setIsUploadingMedia(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  /* -----------------------------------------------------------------------
     SAVE
     ----------------------------------------------------------------------- */

  const handleSave = async (submitStatus: BlogPostStatus) => {
    if (isSubmitting) return;

    setError(null);
    setFieldErrors({});

    const newFieldErrors: { [key: string]: string } = {};

    // اعتبارسنجی عنوان
    if (!title.trim()) {
      newFieldErrors.title = "لطفاً عنوان مقاله را وارد کنید.";
    }

    // اعتبارسنجی Slug
    const normalizedSlug = slug.trim();

    if (!normalizedSlug) {
      newFieldErrors.slug = "لطفاً شناسه (Slug) مقاله را وارد کنید.";
    } else if (!/^[-a-zA-Z0-9_]+$/.test(normalizedSlug)) {
      newFieldErrors.slug =
        "شناسه مقاله فقط می‌تواند شامل حروف انگلیسی، اعداد، خط فاصله (-) و زیرخط (_) باشد.";
    }

    // اعتبارسنجی خلاصه مقاله
    if (!excerpt.trim()) {
      newFieldErrors.excerpt = "لطفاً خلاصه / چکیده مقاله را وارد کنید.";
    }

    // اعتبارسنجی زمان مطالعه
    const normalizedReadingMinutes = Math.max(1, Number(readingMinutes) || 5);

    if (Object.keys(newFieldErrors).length > 0) {
      setFieldErrors(newFieldErrors);
      setError("لطفاً خطاهای مشخص‌شده در فرم را بررسی نمایید.");
      return;
    }

    /**
     * بسیار مهم:
     * بلوک‌های خالی قبل از ساخت payload حذف می‌شوند.
     * در نتیجه پاراگراف خالی به API ارسال نخواهد شد.
     */
    const normalizedContentBlocks = normalizeContentBlocks(contentBlocks);

    // به‌روزرسانی محتوای فرم با نسخه پاک‌سازی‌شده
    setContentBlocks(normalizedContentBlocks);

    setIsSubmitting(true);

    try {
      const payload: AdminBlogPostInput = {
        title: title.trim(),
        slug: normalizedSlug,
        category,
        authorName: authorName.trim() || "تحریریه‌ی سایرا",
        readingMinutes: normalizedReadingMinutes,
        featured,
        excerpt: excerpt.trim(),
        coverUrl: coverUrl.trim() || "/img/gamnet-1.webp",
        coverImageId: coverImageId != null ? coverImageId : undefined,
        tags: selectedTagNames
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0),
        status: submitStatus,

        // فقط بلوک‌های معتبر و غیرخالی ارسال می‌شوند
        content: normalizedContentBlocks,
      };

      let result: BlogPostDetail;

      if (initialData) {
        result = await adminService.updateBlogPost(
          initialData.slug || initialData.id,
          payload,
        );
      } else {
        result = await adminService.createBlogPost(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      const e = err as Error & {
        details?: Record<string, unknown>;
        status?: number;
      };

      if (e.status === 403) {
        setError(
          "شما دسترسی لازم برای ویرایش یا ایجاد مقاله را ندارید (403 Forbidden).",
        );
      } else if (e.status === 401) {
        setError("نشست کاربری شما منقضی شده است. لطفاً مجدداً وارد شوید.");
      } else if (e.details && typeof e.details === "object") {
        const detailsObj = e.details as Record<
          string,
          string[] | string | unknown
        >;

        const mappedErrors: { [key: string]: string } = {};

        for (const [key, value] of Object.entries(detailsObj)) {
          mappedErrors[key] = Array.isArray(value)
            ? value.join(" ")
            : String(value);
        }

        setFieldErrors(mappedErrors);
        setError(e.message || "خطای اعتبارسنجی فیلدهای ارسالی.");
      } else {
        setError(
          e.message ||
            "خطا در برقراری ارتباط با سرور. اطلاعات فرم حفظ شده است.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* -----------------------------------------------------------------------
     PREVIEW
     ----------------------------------------------------------------------- */

  const currentPreviewPost: BlogPostDetail = {
    id: initialData?.id || "preview-id",
    title: title || "عنوان مقاله پیش‌نمایش",
    slug: slug || "preview-slug",
    category,
    categoryLabel:
      categories.find((item) => item.id === category)?.label || "عمومی",
    authorName: authorName || "تحریریه‌ی سایرا",
    readingMinutes: Number(readingMinutes) || 5,
    publishedAt: initialData?.publishedAt || new Date().toISOString(),
    excerpt: excerpt || "خلاصه مقاله برای پیش‌نمایش",
    coverUrl: coverUrl || "/img/gamnet-1.webp",
    tags: selectedTagNames,
    featured,
    status,
    content: contentBlocks,
  };

  /* -----------------------------------------------------------------------
     RENDER
     ----------------------------------------------------------------------- */

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={initialData ? "ویرایش مقاله وبلاگ" : "ایجاد مقاله جدید"}
        className="max-w-[900px] max-h-[90vh] overflow-y-auto"
      >
        <div className="flex flex-col gap-6 py-2">
          {error && (
            <div className="p-3 rounded-card bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold flex items-center gap-2">
              <Icon name="alert" size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Main information */}

          <section className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <h3 className="text-xs font-bold text-[var(--primary)]">
              ۱. اطلاعات اصلی مقاله
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  دسته‌بندی مقاله *
                </label>

                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full h-11 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
                >
                  {categories.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      className="bg-[var(--bg-card)]"
                    >
                      {item.label}
                    </option>
                  ))}
                </select>

                {fieldErrors.category && (
                  <p className="text-xs text-[var(--accent-red)] mt-1">
                    {fieldErrors.category}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  نویسنده مقاله
                </label>

                {authors.length > 0 ? (
                  <select
                    value={authorName}
                    onChange={(event) => setAuthorName(event.target.value)}
                    className="w-full h-11 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none"
                  >
                    {authors.map((author) => (
                      <option
                        key={author.user}
                        value={author.display_name}
                        className="bg-[var(--bg-card)]"
                      >
                        {author.display_name}
                      </option>
                    ))}

                    {!authors.some(
                      (author) => author.display_name === authorName,
                    ) && (
                      <option
                        value={authorName}
                        className="bg-[var(--bg-card)]"
                      >
                        {authorName}
                      </option>
                    )}
                  </select>
                ) : (
                  <Input
                    value={authorName}
                    onChange={(event) => setAuthorName(event.target.value)}
                    placeholder="نام نویسنده"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                  زمان مطالعه (دقیقه)
                </label>

                <Input
                  type="number"
                  min={1}
                  value={readingMinutes}
                  onChange={(event) =>
                    setReadingMinutes(
                      Math.max(1, Number(event.target.value) || 1),
                    )
                  }
                />
              </div>

              <label className="flex items-center gap-2 pt-6 text-xs text-[var(--text-white)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={featured}
                  onChange={(event) => setFeatured(event.target.checked)}
                  className="w-4 h-4 accent-[var(--primary)]"
                />
                مقاله ویژه
              </label>
            </div>
          </section>

          {/* Title and slug */}

          <section className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <h3 className="text-xs font-bold text-[var(--primary)]">
              ۲. عنوان و شناسه مقاله
            </h3>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                عنوان مقاله *
              </label>

              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="عنوان کامل مقاله"
                error={fieldErrors.title}
              />

              {fieldErrors.title && (
                <p className="text-xs text-[var(--accent-red)] mt-1">
                  {fieldErrors.title}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)]">
                  Slug *
                </label>

                <button
                  type="button"
                  onClick={handleGenerateSlug}
                  className="text-xs text-[var(--primary)]"
                >
                  ساخت خودکار
                </button>
              </div>

              <Input
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="article-slug"
                error={fieldErrors.slug}
              />

              {fieldErrors.slug && (
                <p className="text-xs text-[var(--accent-red)] mt-1">
                  {fieldErrors.slug}
                </p>
              )}
            </div>
          </section>

          {/* Content blocks */}

          <section className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-[var(--primary)]">
                ۳. بلوک‌های محتوایی مقاله
              </h3>

              <span className="text-xs text-[var(--text-subtle)]">
                {contentBlocks.length} بلوک
              </span>
            </div>

            <div className="text-xs leading-6 text-[var(--text-muted)]">
              ساختار هر بلوک مطابق قرارداد API است. برای ویرایش فیلدهای اختصاصی،
              JSON همان بلوک را تغییر بده. فیلدهای id، version و type را حفظ کن.
            </div>

            {contentBlocks.map((block, index) => {
              const key = getBlockKey(block, index);

              const draft = blockDrafts[key] ?? serializeBlock(block);

              const blockType =
                block.type === "unsupported" ? block.originalType : block.type;

              return (
                <div
                  key={key}
                  className="flex flex-col gap-3 p-3 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 shrink-0 rounded-full bg-[var(--foreground)]/60 text-[var(--text-muted)] text-xs flex items-center justify-center">
                        {index + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[var(--text-white)] truncate">
                          {getBlockLabel(blockType)}
                        </div>
                        <div className="text-[10px] text-[var(--text-subtle)] truncate">
                          ID: {block.id || "بدون شناسه"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMoveBlock(index, "up")}
                        disabled={index === 0}
                        className="p-1 text-[var(--text-subtle)] disabled:opacity-30"
                        title="انتقال به بالا"
                      >
                        <Icon name="chevron" size={16} className="rotate-180" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMoveBlock(index, "down")}
                        disabled={index === contentBlocks.length - 1}
                        className="p-1 text-[var(--text-subtle)] disabled:opacity-30"
                        title="انتقال به پایین"
                      >
                        <Icon name="chevron" size={16} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveBlock(index)}
                        className="p-1 text-[var(--accent-red)]"
                        title="حذف بلوک"
                      >
                        <Icon name="close" size={16} />
                      </button>
                    </div>
                  </div>

                  {block.type === "unsupported" && (
                    <div className="p-2 rounded bg-[var(--accent-red)]/10 text-[var(--accent-red)] text-xs">
                      این بلوک در مدل فعلی شناخته‌شده نیست. اطلاعات اصلی آن حفظ
                      شده است؛ نوع آن را بدون بررسی قرارداد تغییر نده.
                    </div>
                  )}

                  {block.type === "paragraph" ? (
                    <textarea
                      value={block.text ?? ""}
                      onChange={(event) => {
                        const value = event.target.value;

                        setContentBlocks((previous) =>
                          previous.map((item, itemIndex) =>
                            itemIndex === index && item.type === "paragraph"
                              ? ({
                                  ...item,
                                  text: value,
                                  content: [{ type: "text", value }],
                                } as BlogContentBlock)
                              : item,
                          ),
                        );

                        setBlockDrafts((previous) => {
                          const next = { ...previous };
                          delete next[key];
                          return next;
                        });

                        setBlockJsonErrors((previous) => {
                          const next = { ...previous };
                          delete next[key];
                          return next;
                        });
                      }}
                      rows={6}
                      placeholder="متن پاراگراف را اینجا بنویسید..."
                      className="w-full p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-sm text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-y leading-7"
                      dir="auto"
                    />
                  ) : (
                    <textarea
                      value={draft}
                      onChange={(event) =>
                        handleBlockJsonChange(key, event.target.value)
                      }
                      onBlur={() => handleBlockJsonBlur(index, key)}
                      spellCheck={false}
                      rows={Math.min(
                        24,
                        Math.max(7, draft.split("\n").length + 1),
                      )}
                      className="w-full p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-y leading-6 font-mono"
                      dir="ltr"
                    />
                  )}

                  {blockJsonErrors[key] && (
                    <p className="text-xs text-[var(--accent-red)]">
                      {blockJsonErrors[key]}
                    </p>
                  )}
                </div>
              );
            })}

            {/* Add block */}

            <div className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-[var(--border-subtle)]">
              <select
                value={newBlockType}
                onChange={(event) =>
                  setNewBlockType(event.target.value as BlogBlockType)
                }
                className="flex-1 min-w-0 h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)]"
              >
                {BLOCK_OPTIONS.map((option) => (
                  <option
                    key={option.type}
                    value={option.type}
                    className="bg-[var(--bg-card)]"
                  >
                    {option.label}
                  </option>
                ))}
              </select>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleAddBlock}
              >
                <span>+ افزودن بلوک</span>
              </Button>
            </div>
          </section>

          {/* Excerpt */}

          <section className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <h3 className="text-xs font-bold text-[var(--primary)]">
              ۴. خلاصه و تگ‌ها
            </h3>

            <div>
              <label className="block text-xs font-bold text-[var(--text-muted)] mb-1.5">
                خلاصه مقاله *
              </label>

              <textarea
                value={excerpt}
                onChange={(event) => setExcerpt(event.target.value)}
                rows={3}
                placeholder="خلاصه مقاله برای کارت‌ها و نتایج جستجو"
                className="w-full p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-y leading-relaxed"
              />

              {fieldErrors.excerpt && (
                <p className="text-xs text-[var(--accent-red)] mt-1">
                  {fieldErrors.excerpt}
                </p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {selectedTagNames.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-xs text-[var(--primary)]"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveSelectedTag(tag)}
                    title="حذف تگ"
                  >
                    <Icon name="close" size={12} />
                  </button>
                </span>
              ))}

              {selectedTagNames.length === 0 && (
                <span className="text-xs text-[var(--text-subtle)]">
                  هنوز تگی انتخاب نشده است.
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={newTagInput}
                  onChange={(event) => setNewTagInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void handleAddNewTag();
                    }
                  }}
                  placeholder="نام تگ"
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => void handleAddNewTag()}
                disabled={!newTagInput.trim()}
              >
                افزودن
              </Button>
            </div>

            {allAvailableTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {allAvailableTags.map((tag) => {
                  const selected = selectedTagNames.some(
                    (name) => name.toLowerCase() === tag.name.toLowerCase(),
                  );

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag.name)}
                      className={`px-2 py-1 rounded-lg border text-xs ${
                        selected
                          ? "bg-[var(--primary)] text-on-primary border-[var(--primary)]"
                          : "bg-[var(--foreground)]/30 text-[var(--text-muted)] border-[var(--border-subtle)]"
                      }`}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Cover image */}

          <section className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold text-[var(--primary)]">
                ۵. تصویر شاخص مقاله
              </h3>

              {coverImageId != null && (
                <span className="text-[11px] text-[var(--accent-green)]">
                  Media ID: {coverImageId}
                </span>
              )}
            </div>

            {mediaUploadError && (
              <p className="text-xs text-[var(--accent-red)]">
                {mediaUploadError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 flex flex-col gap-3">
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
                >
                  <Icon name="upload" size={16} />
                  {isUploadingMedia ? "در حال آپلود..." : "آپلود تصویر"}
                </Button>

                <label className="text-xs text-[var(--text-muted)]">
                  یا آدرس تصویر شاخص
                </label>

                <Input
                  value={coverUrl}
                  onChange={(event) => {
                    setCoverUrl(event.target.value);
                    setCoverImageId(null);
                  }}
                  placeholder="https://..."
                />
              </div>

              {coverUrl && (
                <div className="w-32 h-24 rounded-card overflow-hidden border border-[var(--border-subtle)]">
                  <AppImage
                    src={coverUrl}
                    fallbackSrc="/img/gamnet-1.webp"
                    alt="تصویر شاخص"
                    className="w-full h-full object-cover"
                    objectFit="cover"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Status */}

          <section className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
            <h3 className="text-xs font-bold text-[var(--primary)]">
              ۶. وضعیت مقاله
            </h3>

            <div className="flex flex-wrap gap-4">
              {(
                [
                  ["DRAFT", "پیش‌نویس"],
                  ["PUBLISHED", "منتشرشده"],
                  ["ARCHIVED", "بایگانی‌شده"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className="flex items-center gap-2 text-xs text-[var(--text-white)] cursor-pointer"
                >
                  <input
                    type="radio"
                    name="blog-status"
                    value={value}
                    checked={status === value}
                    onChange={() => setStatus(value)}
                    className="accent-[var(--primary)]"
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>

          {/* Actions */}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsPreviewOpen(true)}
            >
              <Icon name="info" size={18} />
              پیش‌نمایش
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                انصراف
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => void handleSave("DRAFT")}
                isLoading={isSubmitting}
                disabled={isUploadingMedia}
              >
                ذخیره پیش‌نویس
              </Button>

              <Button
                type="button"
                variant="primary"
                onClick={() => void handleSave(status)}
                isLoading={isSubmitting}
                disabled={isUploadingMedia}
              >
                {initialData ? "ذخیره تغییرات" : "ذخیره مقاله"}
              </Button>
            </div>
          </div>
        </div>
      </Modal>

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