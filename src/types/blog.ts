export type BlogSort = "newest" | "oldest" | "popular" | "shortest";

export interface BlogCategory {
  id: string;
  label: string;
}

/** ⚠️ ساختار زیر در OpenAPI فعلی (v1.0-LOCKED) وجود ندارد و نیازمند تأیید بک‌اند است. */
export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  /** شناسه‌ی دسته */
  category: string;
  categoryLabel: string;
  authorName: string;
  /** ISO */
  publishedAt: string;
  readingMinutes: number;
  tags: string[];
  featured?: boolean;
  /** فقط برای مرتب‌سازی؛ نمایش داده نمی‌شود */
  viewsCount?: number;
}

export type BlogContentBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[] }
  | { type: "quote"; text: string };

export interface BlogPostDetail extends BlogPostSummary {
  content: BlogContentBlock[];
}