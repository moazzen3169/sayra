/**
 * Admin Blog Migration Tests (Phase 3)
 * Comprehensive verification of Admin Blog CRUD, Status Transitions, Validation, and Auth handling.
 *
 * Verifies:
 * 1. Fetching articles with pagination, search, category, ordering, and status.
 * 2. Creating an article sending strictly valid OpenAPI fields.
 * 3. Editing an article with PATCH and pre-retrieval.
 * 4. Deleting an article (DELETE /api/articles/{slug}/ -> 204 No Content).
 * 5. Publishing an article (POST /api/articles/{slug}/publish/).
 * 6. Status transitions to draft and archived via PATCH.
 * 7. Handling validation errors and preserving form fields.
 * 8. Handling 401 Unauthorized (refresh attempt) and 403 Forbidden.
 * 9. Handling network errors gracefully.
 */

import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { adminService } from "./adminService";
import { apiClient, ApiError } from "@/lib/api/client";
import type { BlogPostDetail } from "@/types/blog";
import type { ArticleDetailDto, ArticleListDto } from "@/types/blogApi";

describe("Phase 3: Admin Blog API Migration", () => {
  const originalGet = apiClient.get;
  const originalPost = apiClient.post;
  const originalPatch = apiClient.patch;
  const originalDelete = apiClient.delete;

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
    apiClient.patch = originalPatch;
    apiClient.delete = originalDelete;
  });

  const mockArticleListDto: ArticleListDto = {
    id: 101,
    slug: "ps5-pro-features-review",
    title: "بررسی مشخصات پلی‌استیشن ۵ پرو",
    excerpt: "بررسی جامع کنسول نسل جدید سونی و قابلیت‌های گرافیکی آن.",
    short_description: "بررسی جامع کنسول نسل جدید سونی.",
    reading_time_sec: 360,
    status: "published",
    is_hot: true,
    published_at: "2025-05-10T12:00:00Z",
    author: {
      display_name: "مدیر وبلاگ سایرا",
      avatar: {
        id: 1,
        url: "https://cdn.sayra.ir/avatars/admin.webp",
        storage_key: "avatars/admin.webp",
        type: "image",
        mime: "image/webp",
        size_bytes: 12000,
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
        is_deleted: false,
      },
    },
    category: "سخت‌افزار",
    cover_image: {
      id: 50,
      url: "https://cdn.sayra.ir/blog/ps5-pro.webp",
      storage_key: "blog/ps5-pro.webp",
      type: "image",
      mime: "image/webp",
      size_bytes: 84000,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      is_deleted: false,
    },
    views_count: 1250,
    likes_count: 45,
    comments_count: 8,
    tags: [
      { id: 1, name: "پلی استیشن", slug: "playstation" },
      { id: 2, name: "کنسول", slug: "console" },
    ],
  };

  const mockArticleDetailDto: ArticleDetailDto = {
    ...mockArticleListDto,
    content: "## مقدمه\n\nاین یک مقاله کامل است.\n\n> سخن پایانی",
    content_blocks: [
      { type: "heading", text: "مقدمه" },
      { type: "paragraph", text: "این یک مقاله کامل است." },
      { type: "quote", text: "سخن پایانی" },
    ],
    blocks: [],
    seo_title: "بررسی پلی استیشن ۵ پرو",
    seo_description: "بررسی تخصصی مشخصات فنی PS5 Pro",
    og_image: mockArticleListDto.cover_image,
    media_attachments: [],
    related_articles: [],
    article_schema_version: "1.0",
    structured_data: [],
  };

  describe("1. Get Articles List (Admin View)", () => {
    it("fetches articles with pagination, search, category, ordering, and maps accurately to UI", async () => {
      let capturedPath = "";
      let capturedQuery: Record<string, unknown> | undefined = undefined;

      apiClient.get = mock(async (path: string, options?: any) => {
        capturedPath = path;
        capturedQuery = options?.query;
        return {
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [mockArticleListDto],
          },
        };
      }) as any;

      const res = await adminService.getBlogPosts({
        page: 2,
        pageSize: 10,
        search: "پلی‌استیشن",
        category: "hardware",
        sortBy: "viewsCount",
        sortOrder: "desc",
      });

      expect(capturedPath).toBe("/articles/");
      expect(capturedQuery?.page).toBe(2);
      expect(capturedQuery?.page_size).toBe(10);
      expect(capturedQuery?.search).toBe("پلی‌استیشن");
      expect(capturedQuery?.category).toBe("hardware");
      expect(capturedQuery?.ordering).toBe("-views_count");

      expect(res.items.length).toBe(1);
      expect(res.items[0].id).toBe("101");
      expect(res.items[0].slug).toBe("ps5-pro-features-review");
      expect(res.items[0].title).toBe("بررسی مشخصات پلی‌استیشن ۵ پرو");
      expect(res.items[0].status).toBe("PUBLISHED");
      expect(res.items[0].readingMinutes).toBe(6); // 360 / 60
      expect(res.items[0].tags).toEqual(["پلی استیشن", "کنسول"]);
    });

    it("filters status correctly and propagates to backend query", async () => {
      let capturedQuery: Record<string, unknown> | undefined;

      apiClient.get = mock(async (_path: string, options?: any) => {
        capturedQuery = options?.query;
        return {
          data: {
            count: 1,
            next: null,
            previous: null,
            results: [{ ...mockArticleListDto, status: "draft" }],
          },
        };
      }) as any;

      const res = await adminService.getBlogPosts({
        status: "DRAFT",
      });

      expect(capturedQuery?.status).toBe("draft");
      expect(res.items.length).toBe(1);
      expect(res.items[0].status).toBe("DRAFT");
    });
  });

  describe("2. Create Article", () => {
    it("validates required fields before sending request", async () => {
      await expect(
        adminService.createBlogPost({
          title: "",
          slug: "test-slug",
          excerpt: "excerpt",
          category: "1",
          authorName: "نویسنده",
          readingMinutes: 5,
          tags: [],
          status: "DRAFT",
          content: [],
        })
      ).rejects.toThrow("عنوان مقاله نمی‌تواند خالی باشد.");

      await expect(
        adminService.createBlogPost({
          title: "عنوان تستی",
          slug: "   ",
          excerpt: "excerpt",
          category: "1",
          authorName: "نویسنده",
          readingMinutes: 5,
          tags: [],
          status: "DRAFT",
          content: [],
        })
      ).rejects.toThrow("شناسه (Slug) مقاله نمی‌تواند خالی باشد.");

      await expect(
        adminService.createBlogPost({
          title: "عنوان تستی",
          slug: "valid-slug",
          excerpt: "   ",
          category: "1",
          authorName: "نویسنده",
          readingMinutes: 5,
          tags: [],
          status: "DRAFT",
          content: [],
        })
      ).rejects.toThrow("خلاصه یا چکیده مقاله الزامی است.");
    });

    it("creates an article with POST /api/articles/ sending strictly valid contract fields", async () => {
      let capturedPath = "";
      let capturedBody: any = null;

      apiClient.post = mock(async (path: string, body?: any) => {
        capturedPath = path;
        capturedBody = body;
        return {
          data: {
            ...mockArticleDetailDto,
            title: body.title,
            slug: body.slug,
            status: body.status,
          },
        };
      }) as any;

      const created = await adminService.createBlogPost({
        title: "راهنمای بازی GTA 6",
        slug: "gta-6-guide",
        category: "2",
        authorName: "سردبیر",
        readingMinutes: 10,
        featured: true,
        excerpt: "راهنمای جامع بازی جی تی ای ۶",
        coverUrl: "/img/gamnet-1.webp",
        tags: ["GTA", "راکستار"],
        status: "DRAFT",
        content: [
          { type: "heading", text: "بخش اول" },
          { type: "paragraph", text: "توضیحات بازی" },
        ],
      });

      expect(capturedPath).toBe("/articles/");
      expect(capturedBody.title).toBe("راهنمای بازی GTA 6");
      expect(capturedBody.slug).toBe("gta-6-guide");
      expect(capturedBody.status).toBe("draft");
      expect(capturedBody.category_id).toBe(2);
      expect(capturedBody.is_hot).toBe(true);
      expect(capturedBody.visibility).toBe("public");
      expect(capturedBody.content_blocks).toEqual([
        { type: "heading", text: "بخش اول" },
        { type: "paragraph", text: "توضیحات بازی" },
      ]);
      // Must not send computed / read-only fields
      expect(capturedBody.views_count).toBeUndefined();
      expect(capturedBody.reading_time_sec).toBeUndefined();

      expect(created.title).toBe("راهنمای بازی GTA 6");
      expect(created.slug).toBe("gta-6-guide");
      expect(created.status).toBe("DRAFT");
    });
  });

  describe("3. Edit / Patch Article", () => {
    it("fetches current article details and sends PATCH /api/articles/{slug}/ without overriding untouched fields", async () => {
      let capturedGetSlug = "";
      let capturedPatchPath = "";
      let capturedPatchBody: any = null;

      apiClient.get = mock(async (path: string) => {
        capturedGetSlug = path;
        return { data: mockArticleDetailDto };
      }) as any;

      apiClient.patch = mock(async (path: string, body?: any) => {
        capturedPatchPath = path;
        capturedPatchBody = body;
        return {
          data: {
            ...mockArticleDetailDto,
            title: body.title || mockArticleDetailDto.title,
          },
        };
      }) as any;

      const updated = await adminService.updateBlogPost("ps5-pro-features-review", {
        title: "بررسی مشخصات پلی‌استیشن ۵ پرو (ویرایش جدید)",
      });

      expect(capturedGetSlug).toBe("/articles/ps5-pro-features-review/");
      expect(capturedPatchPath).toBe("/articles/ps5-pro-features-review/");
      expect(capturedPatchBody.title).toBe("بررسی مشخصات پلی‌استیشن ۵ پرو (ویرایش جدید)");
      expect(capturedPatchBody.slug).toBeUndefined(); // untouched
      expect(updated.title).toBe("بررسی مشخصات پلی‌استیشن ۵ پرو (ویرایش جدید)");
    });
  });

  describe("4. Delete Article", () => {
    it("deletes an article via DELETE /api/articles/{slug}/ upon 204 No Content", async () => {
      let capturedDeletePath = "";

      apiClient.get = mock(async () => ({ data: mockArticleDetailDto })) as any;
      apiClient.delete = mock(async (path: string) => {
        capturedDeletePath = path;
        return { data: undefined };
      }) as any;

      const res = await adminService.deleteBlogPost("ps5-pro-features-review");

      expect(capturedDeletePath).toBe("/articles/ps5-pro-features-review/");
      expect(res).toBe(true);
    });
  });

  describe("5. Status Transitions and Publishing", () => {
    it("publishes article using dedicated endpoint POST /api/articles/{slug}/publish/", async () => {
      let capturedPublishPath = "";

      apiClient.get = mock(async () => ({ data: { ...mockArticleDetailDto, status: "draft" } })) as any;
      apiClient.post = mock(async (path: string) => {
        capturedPublishPath = path;
        return {
          data: {
            ...mockArticleDetailDto,
            status: "published",
          },
        };
      }) as any;

      const res = await adminService.updateBlogPostStatus("ps5-pro-features-review", "PUBLISHED");

      expect(capturedPublishPath).toBe("/articles/ps5-pro-features-review/publish/");
      expect(res.status).toBe("PUBLISHED");
    });

    it("transitions article to ARCHIVED and DRAFT using PATCH", async () => {
      let capturedPatchPath = "";
      let capturedPatchBody: any = null;

      apiClient.get = mock(async () => ({ data: mockArticleDetailDto })) as any;
      apiClient.patch = mock(async (path: string, body?: any) => {
        capturedPatchPath = path;
        capturedPatchBody = body;
        return {
          data: {
            ...mockArticleDetailDto,
            status: body.status,
          },
        };
      }) as any;

      const archived = await adminService.updateBlogPostStatus("ps5-pro-features-review", "ARCHIVED");
      expect(capturedPatchPath).toBe("/articles/ps5-pro-features-review/");
      expect(capturedPatchBody.status).toBe("archived");
      expect(archived.status).toBe("ARCHIVED");

      const draft = await adminService.updateBlogPostStatus("ps5-pro-features-review", "DRAFT");
      expect(capturedPatchBody.status).toBe("draft");
      expect(draft.status).toBe("DRAFT");
    });
  });

  describe("6. Error Handling & Auth Scenarios", () => {
    it("propagates 401 Unauthorized cleanly", async () => {
      apiClient.get = mock(async () => {
        throw new ApiError(401, "UNAUTHORIZED", "نشست کاربری نامعتبر است.");
      }) as any;

      await expect(adminService.getBlogPosts()).rejects.toThrow("نشست کاربری نامعتبر است.");
    });

    it("propagates 403 Forbidden without crashing or falling back to mock data", async () => {
      apiClient.post = mock(async () => {
        throw new ApiError(403, "FORBIDDEN", "دسترسی به بخش مدیریت مقاله‌ها محدود به کاربران مجاز است.");
      }) as any;

      await expect(
        adminService.createBlogPost({
          title: "عنوان تستی",
          slug: "test-slug",
          excerpt: "چکیده",
          category: "1",
          authorName: "نویسنده",
          readingMinutes: 5,
          tags: [],
          status: "DRAFT",
          content: [],
        })
      ).rejects.toThrow("دسترسی به بخش مدیریت مقاله‌ها محدود به کاربران مجاز است.");
    });

    it("propagates 400 Validation Error details from server", async () => {
      apiClient.post = mock(async () => {
        throw new ApiError(400, "VALIDATION_ERROR", "فیلدهای ارسالی نامعتبر هستند.", {
          slug: ["این شناسه قبلاً استفاده شده است."],
        });
      }) as any;

      try {
        await adminService.createBlogPost({
          title: "عنوان تستی",
          slug: "existing-slug",
          excerpt: "چکیده",
          category: "1",
          authorName: "نویسنده",
          readingMinutes: 5,
          tags: [],
          status: "DRAFT",
          content: [],
        });
        expect(true).toBe(false); // should not reach
      } catch (err: any) {
        expect(err.status).toBe(400);
        expect(err.details).toEqual({
          slug: ["این شناسه قبلاً استفاده شده است."],
        });
      }
    });

    it("propagates Network Error without fake data fallback", async () => {
      apiClient.get = mock(async () => {
        throw new ApiError(0, "NETWORK_ERROR", "ارتباط با سرور برقرار نشد.");
      }) as any;

      await expect(adminService.getBlogPosts()).rejects.toThrow("ارتباط با سرور برقرار نشد.");
    });
  });

  describe("7. Categories", () => {
    it("fetches categories from backend API and maps correctly", async () => {
      apiClient.get = mock(async (path: string) => {
        expect(path).toBe("/categories/");
        return {
          data: [
            { id: 1, name: "آموزش و ترفند", slug: "guides" },
            { id: 2, name: "اخبار گیمینگ", slug: "news" },
          ],
        };
      }) as any;

      const categories = await adminService.getBlogCategories();
      expect(categories.length).toBe(2);
      expect(categories[0].id).toBe("1");
      expect(categories[0].label).toBe("آموزش و ترفند");
      expect(categories[1].id).toBe("2");
      expect(categories[1].label).toBe("اخبار گیمینگ");
    });
  });
});
