/**
 * Phase 2: Public Blog Migration Tests
 *
 * Verifies that:
 * 1. blogService integrates exclusively with real backend API contracts (via blogApiService and apiClient).
 * 2. No mock fallback or localStorage stores are used in public routes.
 * 3. Sorting, filtering, search, and pagination are delegated to the server.
 * 4. getFeatured requests is_hot=true.
 * 5. getBySlug fetches full details and throws 404 for missing or non-published posts.
 * 6. getRelated fetches related articles with tag/category fallback without fabricating synthetic data.
 * 7. getCategories returns API categories mapped to UI model.
 */

import { describe, expect, it, afterEach, mock } from "bun:test";
import { blogService, mapBlogSortToOrdering } from "./blogService";
import { blogApiService } from "./blogApiService";
import { ApiError } from "@/lib/api/client";
import type {
  ArticleDetailDto,
  ArticleListDto,
  BlogPaginatedResult,
  CategoryDto,
} from "@/types/blogApi";

describe("Phase 2: Public Blog API Migration", () => {
  const originalGetArticles = blogApiService.getArticles;
  const originalGetArticleBySlug = blogApiService.getArticleBySlug;
  const originalGetCategories = blogApiService.getCategories;
  const originalGetRelatedArticles = blogApiService.getRelatedArticles;
  const originalGetSimilarArticles = blogApiService.getSimilarArticles;

  afterEach(() => {
    blogApiService.getArticles = originalGetArticles;
    blogApiService.getArticleBySlug = originalGetArticleBySlug;
    blogApiService.getCategories = originalGetCategories;
    blogApiService.getRelatedArticles = originalGetRelatedArticles;
    blogApiService.getSimilarArticles = originalGetSimilarArticles;
  });

  describe("mapBlogSortToOrdering", () => {
    it("maps UI sort options to proper DRF ordering query strings", () => {
      expect(mapBlogSortToOrdering("newest")).toBe("-published_at");
      expect(mapBlogSortToOrdering("oldest")).toBe("published_at");
      expect(mapBlogSortToOrdering("popular")).toBe("-views_count");
      expect(mapBlogSortToOrdering("shortest")).toBe("reading_time_sec");
      expect(mapBlogSortToOrdering(undefined)).toBe("-published_at");
    });
  });

  describe("blogService.getCategories", () => {
    it("fetches categories from backend API and maps to UI categories", async () => {
      const mockCategories: CategoryDto[] = [
        { id: 101, name: "راهنماهای بازی", slug: "game-guides" },
        { id: 102, name: "سخت‌افزار", slug: "hardware" },
      ];

      blogApiService.getCategories = mock(async () => mockCategories);

      const categories = await blogService.getCategories();
      expect(categories).toHaveLength(2);
      expect(categories[0]).toEqual({
        id: "101",
        label: "راهنماهای بازی",
      });
      expect(categories[1]).toEqual({
        id: "102",
        label: "سخت‌افزار",
      });
    });

    it("propagates API errors without falling back to mock categories", async () => {
      blogApiService.getCategories = mock(async () => {
        throw new ApiError(500, "SERVER_ERROR", "خطای سرور");
      });

      await expect(blogService.getCategories()).rejects.toThrow("خطای سرور");
    });
  });

  describe("blogService.list", () => {
    it("delegates search, category filter, pagination and ordering to backend API", async () => {
      let capturedParams: Record<string, unknown> = {};

      const mockResponse: BlogPaginatedResult<ArticleListDto> = {
        items: [
          {
            id: 1,
            slug: "ps5-pro-review",
            title: "بررسی پلی‌استیشن ۵ پرو",
            excerpt: "خلاصه بررسی کنسول جدید سونی",
            reading_time_sec: 300,
            status: "published",
            is_hot: false,
            published_at: "2025-01-15T12:00:00Z",
            category: "سخت‌افزار",
            views_count: 1500,
            cover_image: {
              id: 99,
              url: "https://example.com/cover.webp",
              file_type: "image",
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z",
            },
            author: { id: 5, display_name: "نویسنده بررسی" },
          },
          {
            id: 2,
            slug: "draft-article",
            title: "پیش‌نویس غیرقابل نمایش",
            status: "draft",
            reading_time_sec: 120,
          },
        ],
        pagination: {
          page: 2,
          pageSize: 6,
          total: 25,
          totalPages: 5,
          hasNext: true,
          hasPrevious: true,
        },
      };

      blogApiService.getArticles = mock(async (params) => {
        capturedParams = params as Record<string, unknown>;
        return mockResponse;
      });

      const result = await blogService.list({
        q: "پلی استیشن",
        category: "hardware",
        sort: "popular",
        page: 2,
        pageSize: 6,
      });

      expect(capturedParams.page).toBe(2);
      expect(capturedParams.page_size).toBe(6);
      expect(capturedParams.search).toBe("پلی استیشن");
      expect(capturedParams.category).toBe("hardware");
      expect(capturedParams.ordering).toBe("-views_count");
      expect(capturedParams.visibility).toBe("public");

      // Filtered out unpublished articles
      expect(result.items).toHaveLength(1);
      expect(result.items[0].slug).toBe("ps5-pro-review");
      expect(result.items[0].readingMinutes).toBe(5); // 300s / 60
      expect(result.total).toBe(25);
      expect(result.page).toBe(2);
      expect(result.totalPages).toBe(5);
      expect(result.hasNext).toBe(true);
      expect(result.hasPrevious).toBe(true);
    });

    it("propagates server failures without mock fallback", async () => {
      blogApiService.getArticles = mock(async () => {
        throw new ApiError(503, "SERVICE_UNAVAILABLE", "سرویس وبلاگ در دسترس نیست");
      });

      await expect(blogService.list({})).rejects.toThrow("سرویس وبلاگ در دسترس نیست");
    });
  });

  describe("blogService.getFeatured", () => {
    it("requests hot articles using is_hot=true filter from backend", async () => {
      let isHotParam: boolean | undefined;

      const mockResponse: BlogPaginatedResult<ArticleListDto> = {
        items: [
          {
            id: 10,
            slug: "hot-news-1",
            title: "خبر داغ گیمینگ",
            excerpt: "توضیحات خبر",
            reading_time_sec: 180,
            status: "published",
            is_hot: true,
            published_at: "2025-01-20T10:00:00Z",
            cover_image: {
              id: 1,
              url: "https://example.com/hot.webp",
              file_type: "image",
              created_at: "2025-01-01T00:00:00Z",
              updated_at: "2025-01-01T00:00:00Z",
            },
          },
        ],
        pagination: {
          page: 1,
          pageSize: 4,
          total: 1,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      blogApiService.getArticles = mock(async (params) => {
        isHotParam = params.is_hot;
        return mockResponse;
      });

      const featured = await blogService.getFeatured();

      expect(isHotParam).toBe(true);
      expect(featured).toHaveLength(1);
      expect(featured[0].slug).toBe("hot-news-1");
      expect(featured[0].featured).toBe(true);
    });

    it("returns empty array if no featured articles exist without mock generation", async () => {
      blogApiService.getArticles = mock(async () => ({
        items: [],
        pagination: {
          page: 1,
          pageSize: 4,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false,
        },
      }));

      const featured = await blogService.getFeatured();
      expect(featured).toEqual([]);
    });
  });

  describe("blogService.getBySlug", () => {
    it("retrieves published article details with structured content", async () => {
      const mockDetail: ArticleDetailDto = {
        id: 77,
        slug: "gta-6-release-date",
        title: "تاریخ عرضه بازی GTA VI",
        excerpt: "بررسی تمام شایعات و اخبار موثق",
        status: "published",
        reading_time_sec: 360,
        published_at: "2025-02-01T15:30:00Z",
        category: "اخبار",
        author: { id: 3, display_name: "تحریریه گیمینگ" },
        tags: [{ id: 1, name: "GTA" }, { id: 2, name: "Rockstar" }],
        cover_image: {
          id: 50,
          url: "https://example.com/gta.webp",
          file_type: "image",
          created_at: "2025-01-01T00:00:00Z",
          updated_at: "2025-01-01T00:00:00Z",
        },
        blocks: [
          { type: "heading", text: "مقدمه" },
          { type: "paragraph", text: "راک‌استار بالاخره جزئیات را اعلام کرد." },
        ],
      };

      blogApiService.getArticleBySlug = mock(async () => mockDetail);

      const post = await blogService.getBySlug("gta-6-release-date");
      expect(post.slug).toBe("gta-6-release-date");
      expect(post.title).toBe("تاریخ عرضه بازی GTA VI");
      expect(post.authorName).toBe("تحریریه گیمینگ");
      expect(post.tags).toEqual(["GTA", "Rockstar"]);
      expect(post.content).toHaveLength(2);
      expect(post.content[0]).toEqual({ type: "heading", text: "مقدمه" });
    });

    it("throws 404 ApiError when article does not exist", async () => {
      blogApiService.getArticleBySlug = mock(async () => {
        throw new ApiError(404, "NOT_FOUND", "مقاله‌ای یافت نشد.");
      });

      await expect(blogService.getBySlug("non-existent-post")).rejects.toThrow("مقاله‌ای یافت نشد.");
    });

    it("throws 404 ApiError when article exists but is in draft status", async () => {
      const draftDetail: ArticleDetailDto = {
        id: 88,
        slug: "unpublished-draft",
        title: "مقاله محرمانه",
        status: "draft",
        reading_time_sec: 60,
      };

      blogApiService.getArticleBySlug = mock(async () => draftDetail);

      await expect(blogService.getBySlug("unpublished-draft")).rejects.toThrow("مقاله پیدا نشد.");
    });
  });

  describe("blogService.getRelated", () => {
    it("fetches related articles by tags and falls back to similar articles without fabricating data", async () => {
      const mockRelated: ArticleListDto[] = [
        {
          id: 301,
          slug: "related-1",
          title: "مقاله مرتبط اول",
          status: "published",
          reading_time_sec: 240,
        },
      ];

      blogApiService.getRelatedArticles = mock(async () => mockRelated);

      const items = await blogService.getRelated("current-slug");
      expect(items).toHaveLength(1);
      expect(items[0].slug).toBe("related-1");
    });

    it("falls back to similar articles when tag-based related returns empty", async () => {
      const mockSimilar: ArticleListDto[] = [
        {
          id: 302,
          slug: "similar-1",
          title: "مقاله مشابه دسته",
          status: "published",
          reading_time_sec: 180,
        },
      ];

      blogApiService.getRelatedArticles = mock(async () => []);
      blogApiService.getSimilarArticles = mock(async () => mockSimilar);

      const items = await blogService.getRelated("current-slug");
      expect(items).toHaveLength(1);
      expect(items[0].slug).toBe("similar-1");
    });

    it("returns empty array when neither related nor similar articles exist without synthesizing mock data", async () => {
      blogApiService.getRelatedArticles = mock(async () => []);
      blogApiService.getSimilarArticles = mock(async () => []);

      const items = await blogService.getRelated("lonely-slug");
      expect(items).toEqual([]);
    });
  });
});
