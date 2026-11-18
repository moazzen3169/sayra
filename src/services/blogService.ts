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
  mapSeriesToUi,
  mapTagDtoToUi,
} from "@/lib/mappers/blogMapper";
import { blogApiService } from "@/services/blogApiService";
import type {
  BlogCategory,
  BlogPostDetail,
  BlogPostSummary,
  BlogSeries,
  BlogSort,
  BlogTag,
} from "@/types/blog";
import type {
  ArticleListQueryParams,
  CategoryDto,
  SeriesDto,
  TagDto,
} from "@/types/blogApi";

export interface BlogListParams {
  q?: string;
  category?: string;
  series?: number | string;
  tag?: string;
  isHot?: boolean;
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
   * GET /api/series/
   * Fetches active article series from API.
   */
  async getSeries(signal?: AbortSignal): Promise<BlogSeries[]> {
    try {
      const dtos: SeriesDto[] = await blogApiService.getSeries({ signal });
      return (dtos || [])
        .filter((item) => item.is_active !== false)
        .map(mapSeriesToUi);
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw err;
    }
  },

  /**
   * GET /api/tags/
   * Fetches blog tags from API.
   */
  async getTags(signal?: AbortSignal): Promise<BlogTag[]> {
    try {
      const dtos: TagDto[] = await blogApiService.getTags({ signal });
      return (dtos || []).map(mapTagDtoToUi);
    } catch (err) {
      if (isAbortError(err)) throw err;
      throw err;
    }
  },

  /**
   * GET /api/articles/
   * Fetches paginated published articles matching search, category, series, tag, and sort parameters.
   */
  async list(
    params: BlogListParams = {},
    signal?: AbortSignal
  ): Promise<BlogListResult> {
    try {
      const pageSize = params.pageSize ?? params.limit ?? 6;
      const page = params.page ?? 1;
      const ordering = mapBlogSortToOrdering(params.sort);

      const queryParams: ArticleListQueryParams = {
        page,
        page_size: pageSize,
        search: params.q?.trim() || undefined,
        category: params.category?.trim() || undefined,
        ordering,
        visibility: "public",
      };

      if (params.series !== undefined && params.series !== "") {
        const seriesNum = Number(params.series);
        if (!Number.isNaN(seriesNum) && seriesNum > 0) {
          queryParams.series = seriesNum;
        }
      }

      if (params.tag?.trim()) {
        queryParams.tags = [params.tag.trim()];
      }

      if (params.isHot !== undefined) {
        queryParams.is_hot = params.isHot;
      }

      const res = await blogApiService.getArticles(queryParams, { signal });

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
   * GET /api/articles/?ordering=-views_count
   * Fetches top most-visited published articles for sidebar.
   */
  async getPopular(
    limit: number = 4,
    signal?: AbortSignal
  ): Promise<BlogPostSummary[]> {
    try {
      const res = await blogApiService.getArticles(
        {
          page: 1,
          page_size: limit,
          ordering: "-views_count",
          visibility: "public",
        },
        { signal }
      );

      return (res.items || [])
        .map(mapArticleListToSummary)
        .filter((item) => item.status === "PUBLISHED")
        .slice(0, limit);
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
