
export type BlogSort = "newest" | "oldest" | "popular" | "shortest";

export interface BlogCategory {
  id: string;
  label: string;
}

export type BlogPostStatus = "PUBLISHED" | "DRAFT" | "ARCHIVED";

/** ساختار اطلاعات خلاصه مقاله */
export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  category: string;
  categoryLabel: string;
  authorName: string;
  publishedAt: string;
  createdAt?: string;
  updatedAt?: string;
  readingMinutes: number;
  tags: string[];
  featured?: boolean;
  status?: BlogPostStatus;
  viewsCount?: number;
}

export interface AdminBlogPostInput {
  slug: string;
  title: string;
  excerpt: string;
  coverUrl: string;
  coverImageId?: string | number | null;
  category: string;
  authorName: string;
  readingMinutes: number;
  tags: string[];
  tagIds?: number[];
  featured?: boolean;
  status: BlogPostStatus;
  publishedAt?: string;
  content: BlogContentBlock[];
}

/**
 * شناسه هر بلوک برای حفظ هویت آن در API و ویرایش‌های بعدی.
 * در بلوک‌های جدید ممکن است id هنوز تولید نشده باشد.
 */
export type BlogContentBlock =
  | { id?: string; type: "heading"; text: string }
  | { id?: string; type: "paragraph"; text: string }
  | { id?: string; type: "list"; items: string[] }
  | { id?: string; type: "quote"; text: string };

export interface BlogPostDetail extends BlogPostSummary {
  content: BlogContentBlock[];
}
