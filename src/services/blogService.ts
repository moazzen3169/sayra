/**
 * Blog Service (Public Client & Server Layer)
 *
 * Fully integrated with real Blog Platform Backend APIs via blogApiService.
 * No mock data, synthetic articles, or localStorage fallbacks.
 */

import { ApiError, isAbortError } from "@/lib/api/client";
import {
  mapArticleDetailToUi,
  mapArticleListToSummary,
  mapCategoryToUi,
} from "@/lib/mappers/blogMapper";
import { blogApiService } from "@/services/blogApiService";
import type {
  BlogCategory,
  BlogPostDetail,
  BlogPostSummary,
  BlogSort,
} from "@/types/blog";
import type { CategoryDto } from "@/types/blogApi";

export interface BlogListParams {
  q?: string;
  category?: string;
  sort?: BlogSort;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface BlogListResult {
  items: BlogPostSummary[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

/**
 * Maps UI sorting option to DRF ordering field
 */
export function mapBlogSortToOrdering(sort?: BlogSort): string {
  switch (sort) {
    case "oldest":
      return "published_at";
    case "popular":
      return "-views_count";
    case "shortest":
      return "reading_time_sec";
    case "newest":
    default:
      return "-published_at";
  }
}

export const blogService = {
  /**
   * GET /api/categories/
   * Fetches blog categories from API.
   */
  async getCategories(signal?: AbortSignal): Promise<BlogCategory[]> {
    try {
      const dtos: CategoryDto[] = await blogApiService.getCategories({ signal });
      return (dtos || []).map(mapCategoryToUi);
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw err;
    }
  },

  /**
   * GET /api/articles/
   * Fetches paginated published articles matching search, category, and sort parameters.
   */
  async list(
    params: BlogListParams = {},
    signal?: AbortSignal
  ): Promise<BlogListResult> {
    try {
      const pageSize = params.pageSize ?? params.limit ?? 6;
      const page = params.page ?? 1;
      const ordering = mapBlogSortToOrdering(params.sort);

      const res = await blogApiService.getArticles(
        {
          page,
          page_size: pageSize,
          search: params.q?.trim() || undefined,
          category: params.category?.trim() || undefined,
          ordering,
          visibility: "public",
        },
        { signal }
      );

      // Only published articles in public display
      const items = (res.items || [])
        .map(mapArticleListToSummary)
        .filter((item) => item.status === "PUBLISHED");

      return {
        items,
        total: res.pagination?.total ?? items.length,
        page: res.pagination?.page ?? page,
        pageSize: res.pagination?.pageSize ?? pageSize,
        totalPages: res.pagination?.totalPages ?? (items.length ? 1 : 0),
        hasNext: res.pagination?.hasNext ?? false,
        hasPrevious: res.pagination?.hasPrevious ?? false,
      };
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw err;
    }
  },

  /**
   * GET /api/articles/?is_hot=true
   * Fetches featured hot articles from backend.
   */
  async getFeatured(signal?: AbortSignal): Promise<BlogPostSummary[]> {
    try {
      const res = await blogApiService.getArticles(
        {
          is_hot: true,
          page: 1,
          page_size: 4,
          ordering: "-published_at",
          visibility: "public",
        },
        { signal }
      );

      return (res.items || [])
        .map(mapArticleListToSummary)
        .filter((item) => item.status === "PUBLISHED");
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw err;
    }
  },

  /**
   * GET /api/articles/{slug}/
   * Fetches full article details by slug.
   */
  async getBySlug(slug: string, signal?: AbortSignal): Promise<BlogPostDetail> {
    try {
      const dto = await blogApiService.getArticleBySlug(slug, { signal });
      if (!dto || !dto.slug) {
        throw new ApiError(404, "NOT_FOUND", "مقاله پیدا نشد.");
      }

      const post = mapArticleDetailToUi(dto);
      // Unpublished articles must not be displayed publicly
      if (post.status !== "PUBLISHED") {
        throw new ApiError(404, "NOT_FOUND", "مقاله پیدا نشد.");
      }

      return post;
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw err;
    }
  },

  /**
   * GET /api/articles/{slug}/related/
   * Fetches related articles from API based on tags/category.
   * Falls back to /api/articles/{slug}/similar/ or sameCategory if needed without fabricating fake items.
   */
  async getRelated(
    slug: string,
    signal?: AbortSignal
  ): Promise<BlogPostSummary[]> {
    try {
      // 1. Try real related endpoint (tags-based)
      const relatedDtos = await blogApiService.getRelatedArticles(slug, { signal });
      let items = (relatedDtos || [])
        .map(mapArticleListToSummary)
        .filter((item) => item.slug !== slug && item.status === "PUBLISHED");

      // 2. If tag-based related returns empty, try similar (category-based)
      if (items.length === 0) {
        try {
          const similarDtos = await blogApiService.getSimilarArticles(slug, { signal });
          items = (similarDtos || [])
            .map(mapArticleListToSummary)
            .filter((item) => item.slug !== slug && item.status === "PUBLISHED");
        } catch {
          // Ignore fallback error
        }
      }

      return items.slice(0, 4);
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw err;
    }
  },
};
