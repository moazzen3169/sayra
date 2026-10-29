import { ApiError } from "@/lib/api/client";
import { normalizeSearchText } from "@/lib/blog";
import {
  MOCK_BLOG_CATEGORIES,
  MOCK_BLOG_POSTS,
  findMockPost,
} from "@/lib/mocks/blog.mock";
import type {
  BlogCategory,
  BlogPostDetail,
  BlogPostSummary,
  BlogSort,
} from "@/types/blog";

/**
 * نیازمند Clarification با بک‌اند:
 * در OpenAPI نسخه v1.0-LOCKED هیچ Endpoint عمومی برای وبلاگ وجود ندارد.
 * تا مشخص شدن قرارداد، این سرویس از داده‌ی نمونه می‌خواند.
 * پس از تعریف API، فقط بدنه‌ی توابع این فایل با apiClient و ENDPOINTS.blog عوض شود
 * (فیلتر/مرتب‌سازی/صفحه‌بندی باید سمت سرور باشد).
 */

export interface BlogListParams {
  q?: string;
  category?: string;
  sort?: BlogSort;
  limit?: number;
}

export interface BlogListResult {
  items: BlogPostSummary[];
  total: number;
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true }
    );
  });
}

const time = (p: BlogPostSummary) => Date.parse(p.publishedAt);

function sortPosts(list: BlogPostSummary[], sort: BlogSort): BlogPostSummary[] {
  const copy = [...list];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => time(a) - time(b));
    case "popular":
      return copy.sort((a, b) => (b.viewsCount ?? 0) - (a.viewsCount ?? 0));
    case "shortest":
      return copy.sort((a, b) => a.readingMinutes - b.readingMinutes);
    case "newest":
    default:
      return copy.sort((a, b) => time(b) - time(a));
  }
}

function getPublishedPosts(): BlogPostDetail[] {
  let posts: BlogPostDetail[] = MOCK_BLOG_POSTS.map((summary) => {
    const detail = findMockPost(summary.slug);
    return detail || { ...summary, content: [] };
  });

  if (typeof window !== "undefined") {
    try {
      const blogSaved = localStorage.getItem("sayra_admin_blog_posts");
      if (blogSaved) posts = JSON.parse(blogSaved);
    } catch (e) {
      console.warn("Failed to read admin blog store", e);
    }
  }

  return posts.filter((p) => (p.status ?? "PUBLISHED") === "PUBLISHED");
}

export const blogService = {
  async getCategories(signal?: AbortSignal): Promise<BlogCategory[]> {
    await wait(100, signal);
    return MOCK_BLOG_CATEGORIES;
  },

  async list(
    params: BlogListParams = {},
    signal?: AbortSignal
  ): Promise<BlogListResult> {
    await wait(250, signal);

    const published = getPublishedPosts();
    const q = params.q ? normalizeSearchText(params.q) : "";
    const filtered = published.filter((p) => {
      if (params.category && p.category !== params.category) return false;
      if (!q) return true;
      const haystack = normalizeSearchText(
        [p.title, p.excerpt, p.categoryLabel, p.tags.join(" ")].join(" ")
      );
      return haystack.includes(q);
    });

    const sorted = sortPosts(filtered, params.sort ?? "newest");
    const limit = params.limit ?? 6;
    return { items: sorted.slice(0, limit), total: sorted.length };
  },

  async getFeatured(signal?: AbortSignal): Promise<BlogPostSummary[]> {
    await wait(150, signal);
    const published = getPublishedPosts();
    return sortPosts(
      published.filter((p) => p.featured),
      "newest"
    ).slice(0, 4);
  },

  async getBySlug(slug: string, signal?: AbortSignal): Promise<BlogPostDetail> {
    await wait(250, signal);
    const published = getPublishedPosts();
    const post = published.find((p) => p.slug === slug);
    if (!post) {
      throw new ApiError(404, "NOT_FOUND", "مقاله پیدا نشد.");
    }
    return post;
  },

  async getRelated(
    slug: string,
    signal?: AbortSignal
  ): Promise<BlogPostSummary[]> {
    await wait(200, signal);
    const published = getPublishedPosts();
    const current = published.find((p) => p.slug === slug);
    const others = sortPosts(
      published.filter((p) => p.slug !== slug),
      "newest"
    );
    const sameCategory = others.filter((p) => p.category === current?.category);
    const rest = others.filter((p) => p.category !== current?.category);
    return [...sameCategory, ...rest].slice(0, 3);
  },
};