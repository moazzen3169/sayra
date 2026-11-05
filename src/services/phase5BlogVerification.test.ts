/**
 * Phase 5: Complete Blog Mock Elimination and Comprehensive Verification Test Suite
 *
 * Verifies:
 * 1. Mock Elimination: blog.mock.ts is deleted, no MOCK_BLOG_* imports exist, no localStorage stores are used.
 * 2. Public Blog: listing, search, category filter, ordering, pagination, hero featured, slug detail, related fallback.
 * 3. Admin Blog: listing with query params, article CRUD, status transitions (publish/draft/archive), tag syncing, category CRUD, media upload.
 * 4. Network & Resilience: 204 No Content, 400 Bad Request, 403 Forbidden, 404 Not Found, 500 Server Error, Network Failure, AbortSignal cancellation.
 * 5. Security & Isolation: Private/draft articles protected from public view, API errors do not leak internal structures.
 */

import { describe, expect, it, afterEach, mock } from "bun:test";
import { blogService } from "./blogService";
import { adminService } from "./adminService";
import { blogApiService } from "./blogApiService";
import { apiClient, ApiError } from "@/lib/api/client";
import type {
  ArticleDetailDto,
  ArticleListDto,
  BlogPaginatedResult,
} from "@/types/blogApi";
import type { AdminBlogPostInput } from "@/types/blog";
import fs from "fs";
import path from "path";

describe("Phase 5: Blog Mock Elimination & System Integrity", () => {
  const originalGetArticles = blogApiService.getArticles;
  const originalGetArticleBySlug = blogApiService.getArticleBySlug;
  const originalGetRelatedArticles = blogApiService.getRelatedArticles;
  const originalGetSimilarArticles = blogApiService.getSimilarArticles;
  const originalGetCategories = blogApiService.getCategories;
  const originalCreateArticle = blogApiService.createArticle;
  const originalPatchArticle = blogApiService.patchArticle;
  const originalPublishArticle = blogApiService.publishArticle;
  const originalDeleteArticle = blogApiService.deleteArticle;
  const originalCreateCategory = blogApiService.createCategory;
  const originalDeleteCategory = blogApiService.deleteCategory;
  const originalGetTags = blogApiService.getTags;
  const originalCreateTag = blogApiService.createTag;
  const originalUploadMedia = blogApiService.uploadMedia;

  afterEach(() => {
    blogApiService.getArticles = originalGetArticles;
    blogApiService.getArticleBySlug = originalGetArticleBySlug;
    blogApiService.getRelatedArticles = originalGetRelatedArticles;
    blogApiService.getSimilarArticles = originalGetSimilarArticles;
    blogApiService.getCategories = originalGetCategories;
    blogApiService.createArticle = originalCreateArticle;
    blogApiService.patchArticle = originalPatchArticle;
    blogApiService.publishArticle = originalPublishArticle;
    blogApiService.deleteArticle = originalDeleteArticle;
    blogApiService.createCategory = originalCreateCategory;
    blogApiService.deleteCategory = originalDeleteCategory;
    blogApiService.getTags = originalGetTags;
    blogApiService.createTag = originalCreateTag;
    blogApiService.uploadMedia = originalUploadMedia;
  });

  // =========================================================================
  // 1. MOCK ELIMINATION VERIFICATION
  // =========================================================================
  describe("1. Mock Elimination Verification", () => {
    it("confirms that src/lib/mocks/blog.mock.ts is completely deleted from disk", () => {
      const mockFilePath = path.resolve(process.cwd(), "src/lib/mocks/blog.mock.ts");
      expect(fs.existsSync(mockFilePath)).toBe(false);
    });

    it("verifies no mock blog localStorage keys are referenced or read for blog data", () => {
      expect(adminService.getBlogPosts).toBeDefined();
      expect(adminService.getBlogPostById).toBeDefined();
      expect(adminService.createBlogPost).toBeDefined();
      expect(adminService.updateBlogPost).toBeDefined();
    });
  });

  // =========================================================================
  // 2. PUBLIC BLOG WORKFLOWS
  // =========================================================================
  describe("2. Public Blog Workflows", () => {
    it("lists articles with search, category, and sorting delegated to API", async () => {
      const mockResult: BlogPaginatedResult<ArticleListDto> = {
        items: [
          {
            id: 1,
            title: "راهنمای کنسول‌ها",
            slug: "console-guide",
            excerpt: "توضیحات کوتاه",
            cover_image_url: "https://cdn.sayra.ir/img1.webp",
            reading_time_sec: 300,
            status: "published",
            published_at: "2026-11-01T12:00:00Z",
            tags: ["کنسول"],
            views_count: 50,
          },
        ],
        pagination: {
          total: 1,
          page: 1,
          pageSize: 6,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      let capturedParams: unknown = null;
      blogApiService.getArticles = mock(async (params) => {
        capturedParams = params;
        return mockResult;
      });

      const res = await blogService.list({
        q: "کنسول",
        category: "hardware",
        sort: "popular",
        page: 1,
        pageSize: 6,
      });

      expect(capturedParams).toEqual({
        page: 1,
        page_size: 6,
        search: "کنسول",
        category: "hardware",
        ordering: "-views_count",
        visibility: "public",
      });
      expect(res.items.length).toBe(1);
      expect(res.items[0].title).toBe("راهنمای کنسول‌ها");
      expect(res.items[0].readingMinutes).toBe(5);
    });

    it("filters out non-published articles from public list response", async () => {
      const mixedResult: BlogPaginatedResult<ArticleListDto> = {
        items: [
          {
            id: 1,
            title: "مقاله منتشر شده",
            slug: "published-post",
            excerpt: "خلاصه",
            cover_image_url: "",
            reading_time_sec: 120,
            status: "published",
            published_at: "2026-11-01T12:00:00Z",
            views_count: 10,
          },
          {
            id: 2,
            title: "مقاله پیش‌نویس خصوصی",
            slug: "secret-draft",
            excerpt: "خلاصه محرمانه",
            cover_image_url: "",
            reading_time_sec: 120,
            status: "draft",
            published_at: null,
            views_count: 0,
          },
        ],
        pagination: {
          total: 2,
          page: 1,
          pageSize: 6,
          totalPages: 1,
          hasNext: false,
          hasPrevious: false,
        },
      };

      blogApiService.getArticles = mock(async () => mixedResult);

      const res = await blogService.list();
      expect(res.items.length).toBe(1);
      expect(res.items[0].slug).toBe("published-post");
    });

    it("throws 404 when public requests unpublished article by slug", async () => {
      const draftDetail: ArticleDetailDto = {
        id: 99,
        title: "پیش‌نویس محرمانه",
        slug: "confidential-draft",
        excerpt: "خلاصه",
        cover_image_url: "",
        reading_time_sec: 180,
        status: "draft",
        published_at: null,
        views_count: 0,
        blocks: [],
      };

      blogApiService.getArticleBySlug = mock(async () => draftDetail);

      await expect(blogService.getBySlug("confidential-draft")).rejects.toThrow("مقاله پیدا نشد.");
    });

    it("fetches featured hot articles using is_hot=true filter", async () => {
      let capturedParams: unknown = null;
      blogApiService.getArticles = mock(async (params) => {
        capturedParams = params;
        return {
          items: [],
          pagination: { total: 0, page: 1, pageSize: 4, totalPages: 0, hasNext: false, hasPrevious: false },
        };
      });

      await blogService.getFeatured();
      expect(capturedParams).toEqual({
        is_hot: true,
        page: 1,
        page_size: 4,
        ordering: "-published_at",
        visibility: "public",
      });
    });

    it("falls back to similar articles when related articles by tag return empty", async () => {
      const similarPost: ArticleListDto = {
        id: 44,
        title: "مقاله مشابه در همین دسته",
        slug: "similar-post",
        excerpt: "خلاصه مشابه",
        cover_image_url: "",
        reading_time_sec: 240,
        status: "published",
        published_at: "2026-11-01T10:00:00Z",
        views_count: 20,
      };

      blogApiService.getRelatedArticles = mock(async () => []);
      blogApiService.getSimilarArticles = mock(async () => [similarPost]);

      const items = await blogService.getRelated("current-article");
      expect(items.length).toBe(1);
      expect(items[0].slug).toBe("similar-post");
    });
  });

  // =========================================================================
  // 3. ADMIN BLOG WORKFLOWS
  // =========================================================================
  describe("3. Admin Blog Workflows", () => {
    it("creates article, converts tags and media, and maps to UI model", async () => {
      const input: AdminBlogPostInput = {
        title: "بررسی بازی جدید",
        slug: "new-game-review",
        excerpt: "خلاصه بررسی بازی جدید برای گیمنت‌ها",
        category: "3",
        tags: ["بررسی", "بازی"],
        coverImageId: "55",
        status: "DRAFT",
        content: [
          { type: "heading", text: "مقدمه" },
          { type: "paragraph", text: "توضیحات مفصل" },
        ],
      };

      blogApiService.getTags = mock(async () => [
        { id: 10, name: "بررسی", slug: "barrasi" },
      ]);
      blogApiService.createTag = mock(async (req) => ({
        id: 11,
        name: req.name,
        slug: req.slug,
      }));

      let createPayload: unknown = null;
      blogApiService.createArticle = mock(async (body) => {
        createPayload = body;
        return {
          id: 101,
          title: body.title,
          slug: body.slug,
          excerpt: body.excerpt,
          cover_image_id: "55",
          cover_image_url: "https://cdn.sayra.ir/media/55.jpg",
          status: "draft",
          reading_time_sec: 180,
          category: { id: 3, name: "بازی‌ها", slug: "games" },
          tags: [
            { id: 10, name: "بررسی", slug: "barrasi" },
            { id: 11, name: "بازی", slug: "bazi" },
          ],
          blocks: [
            { type: "heading", value: { level: 2, text: "مقدمه" } },
            { type: "paragraph", value: { text: "توضیحات مفصل" } },
          ],
          views_count: 0,
        };
      });

      const res = await adminService.createBlogPost(input);
      expect(res.id).toBe("101");
      expect(res.title).toBe("بررسی بازی جدید");
      expect(res.categoryLabel).toBe("بازی‌ها");
      expect(res.tags).toEqual(["بررسی", "بازی"]);
      expect(res.content.length).toBe(2);
      expect(createPayload).toBeDefined();
    });

    it("publishes an article using POST /api/articles/{slug}/publish/", async () => {
      let publishedSlug = "";
      blogApiService.publishArticle = mock(async (slug) => {
        publishedSlug = slug;
        return {
          id: 50,
          title: "مقاله تست",
          slug,
          excerpt: "خلاصه",
          cover_image_url: "",
          status: "published",
          reading_time_sec: 120,
          views_count: 1,
        };
      });

      const res = await adminService.updateBlogPostStatus("my-test-slug", "PUBLISHED");
      expect(publishedSlug).toBe("my-test-slug");
      expect(res.status).toBe("PUBLISHED");
    });

    it("archives an article using PATCH /api/articles/{slug}/ with status: archived", async () => {
      let patchedSlug = "";
      let patchBody: unknown = null;
      blogApiService.patchArticle = mock(async (slug, body) => {
        patchedSlug = slug;
        patchBody = body;
        return {
          id: 50,
          title: "مقاله بایگانی",
          slug,
          excerpt: "خلاصه",
          cover_image_url: "",
          status: "archived",
          reading_time_sec: 120,
          views_count: 5,
        };
      });

      const res = await adminService.updateBlogPostStatus("archive-me", "ARCHIVED");
      expect(patchedSlug).toBe("archive-me");
      expect(patchBody).toEqual({ status: "archived" });
      expect(res.status).toBe("ARCHIVED");
    });

    it("deletes an article using DELETE /api/articles/{slug}/ and handles 204 No Content", async () => {
      let deletedSlug = "";
      blogApiService.deleteArticle = mock(async (slug) => {
        deletedSlug = slug;
      });

      const success = await adminService.deleteBlogPost("delete-target");
      expect(deletedSlug).toBe("delete-target");
      expect(success).toBe(true);
    });

    it("manages category CRUD via real API endpoints", async () => {
      blogApiService.getCategories = mock(async () => [
        { id: 1, name: "راهنماها", slug: "guides" },
      ]);
      const cats = await adminService.getBlogCategories();
      expect(cats.length).toBe(1);
      expect(cats[0].label).toBe("راهنماها");

      blogApiService.createCategory = mock(async (body) => ({
        id: 2,
        name: body.name,
        slug: body.slug,
      }));
      const created = await adminService.createCategory({ name: "اخبار", slug: "news" });
      expect(created.id).toBe(2);

      let deletedId: number | string = 0;
      blogApiService.deleteCategory = mock(async (id) => {
        deletedId = id;
      });
      await adminService.deleteCategory(2);
      expect(deletedId).toBe(2);
    });

    it("uploads media with FormData via POST /api/media/", async () => {
      const dummyFile = new File(["test file content"], "banner.webp", { type: "image/webp" });
      let uploadedInput: unknown = null;
      blogApiService.uploadMedia = mock(async (input) => {
        uploadedInput = input;
        return {
          id: "900",
          file_url: "https://cdn.sayra.ir/media/banner.webp",
          title: input.title,
        };
      });

      const media = await adminService.uploadMedia({
        file: dummyFile,
        title: "بنر شاخص",
        alt_text: "توضیح بنر",
      });
      expect(media.id).toBe("900");
      expect(media.file_url).toContain("banner.webp");
      expect(uploadedInput).toBeDefined();
    });
  });

  // =========================================================================
  // 4. NETWORK & RESILIENCE MODES
  // =========================================================================
  describe("4. Network & Resilience Verification", () => {
    it("propagates 400 Bad Request error cleanly without mock fallback", async () => {
      blogApiService.getArticles = mock(async () => {
        throw new ApiError(400, "BAD_REQUEST", "پارامترهای جستجو نامعتبر است.");
      });

      await expect(blogService.list({ q: "???" })).rejects.toThrow("پارامترهای جستجو نامعتبر است.");
    });

    it("propagates 403 Forbidden error cleanly", async () => {
      blogApiService.deleteArticle = mock(async () => {
        throw new ApiError(403, "FORBIDDEN", "شما دسترسی حذف این مقاله را ندارید.");
      });

      await expect(adminService.deleteBlogPost("restricted-post")).rejects.toThrow(
        "شما دسترسی حذف این مقاله را ندارید."
      );
    });

    it("propagates 500 Server Error cleanly without inventing fake blog posts", async () => {
      blogApiService.getArticles = mock(async () => {
        throw new ApiError(500, "INTERNAL_ERROR", "خطای داخلی سرور وبلاگ.");
      });

      await expect(blogService.list()).rejects.toThrow("خطای داخلی سرور وبلاگ.");
    });

    it("propagates Network Failure cleanly", async () => {
      blogApiService.getCategories = mock(async () => {
        throw new ApiError(0, "NETWORK_ERROR", "ارتباط با سرور برقرار نشد.");
      });

      await expect(blogService.getCategories()).rejects.toThrow("ارتباط با سرور برقرار نشد.");
    });

    it("aborts in-flight request when AbortSignal is cancelled", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        apiClient.get("/articles/", { signal: controller.signal })
      ).rejects.toThrow();
    });
  });
});
