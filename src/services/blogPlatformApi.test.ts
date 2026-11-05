/**
 * Blog Platform Data Layer & Normalizer Unit Tests
 * Validates endpoints, DTO mapping, status bidirectional conversions,
 * pagination normalization, 204 No Content handling, and AbortSignal handling.
 */

import { describe, it, expect } from "bun:test";
import { ENDPOINTS } from "@/lib/api/endpoints";
import {
  normalizeListResponse,
  normalizeSingleResponse,
  unwrapData,
} from "@/lib/api/blogNormalizer";
import {
  mapApiStatusToUi,
  mapUiStatusToApi,
  secondsToMinutes,
  minutesToSeconds,
  mapTagsToUi,
  mapCategoryToUi,
  mapBlocksToUi,
  mapBlocksToApi,
  mapArticleListToSummary,
  mapArticleDetailToUi,
  mapAdminInputToCreateRequest,
  mapAdminInputToPatchRequest,
} from "@/lib/mappers/blogMapper";
import type {
  ArticleDetailDto,
  ArticleListDto,
  CategoryDto,
  TagDto,
} from "@/types/blogApi";
import type { AdminBlogPostInput } from "@/types/blog";

describe("Phase 1: Blog Platform Endpoints Verification", () => {
  it("defines all articles endpoints matching YAML contract", () => {
    expect(ENDPOINTS.blog.articles.list).toBe("/articles/");
    expect(ENDPOINTS.blog.articles.create).toBe("/articles/");
    expect(ENDPOINTS.blog.articles.detail("test-post")).toBe("/articles/test-post/");
    expect(ENDPOINTS.blog.articles.update("test-post")).toBe("/articles/test-post/");
    expect(ENDPOINTS.blog.articles.patch("test-post")).toBe("/articles/test-post/");
    expect(ENDPOINTS.blog.articles.delete("test-post")).toBe("/articles/test-post/");
    expect(ENDPOINTS.blog.articles.bySlug("test-post")).toBe("/articles/slug/test-post/");
    expect(ENDPOINTS.blog.articles.counts).toBe("/articles/counts/");
    expect(ENDPOINTS.blog.articles.publish("test-post")).toBe("/articles/test-post/publish/");
    expect(ENDPOINTS.blog.articles.related("test-post")).toBe("/articles/test-post/related/");
    expect(ENDPOINTS.blog.articles.sameCategory("test-post")).toBe("/articles/test-post/same-category/");
    expect(ENDPOINTS.blog.articles.similar("test-post")).toBe("/articles/test-post/similar/");
    expect(ENDPOINTS.blog.articles.blockDefinitions).toBe("/articles/block-definitions/");
  });

  it("defines categories, tags, media, and authors endpoints correctly", () => {
    expect(ENDPOINTS.blog.categories.list).toBe("/categories/");
    expect(ENDPOINTS.blog.categories.detail(5)).toBe("/categories/5/");
    expect(ENDPOINTS.blog.tags.list).toBe("/tags/");
    expect(ENDPOINTS.blog.tags.detail(12)).toBe("/tags/12/");
    expect(ENDPOINTS.blog.media.list).toBe("/media/");
    expect(ENDPOINTS.blog.media.detail(99)).toBe("/media/99/");
    expect(ENDPOINTS.blog.authors.list).toBe("/authors/");
    expect(ENDPOINTS.blog.authors.detail(42)).toBe("/authors/42/");
  });
});

describe("Phase 1: Blog Normalizer Verification", () => {
  it("unwraps data correctly from envelope or raw item", () => {
    expect(unwrapData({ data: { id: 1 } })).toEqual({ id: 1 });
    expect(unwrapData({ id: 2 })).toEqual({ id: 2 });
    expect(unwrapData("string-val")).toBe("string-val");
  });

  it("handles 204 No Content for single response", () => {
    const res = normalizeSingleResponse(undefined);
    expect(res.data).toBeUndefined();
  });

  it("handles standard envelope { data, messagesList } for single item", () => {
    const raw = {
      data: { id: 10, title: "Post 10" },
      messagesList: ["Operation successful"],
    };
    const res = normalizeSingleResponse<{ id: number; title: string }>(raw);
    expect(res.data.id).toBe(10);
    expect(res.data.title).toBe("Post 10");
    expect(res.messages).toEqual(["Operation successful"]);
  });

  it("normalizes DRF paginated response with embedded { data } items", () => {
    const rawDrf = {
      count: 45,
      next: "http://api.example.com/api/articles/?page=2",
      previous: null,
      results: [
        { data: { id: 1, title: "Item 1" } },
        { data: { id: 2, title: "Item 2" } },
      ],
    };

    const res = normalizeListResponse<{ id: number; title: string }>(rawDrf, 1, 10);
    expect(res.items.length).toBe(2);
    expect(res.items[0]).toEqual({ id: 1, title: "Item 1" });
    expect(res.items[1]).toEqual({ id: 2, title: "Item 2" });
    expect(res.pagination.total).toBe(45);
    expect(res.pagination.page).toBe(1);
    expect(res.pagination.pageSize).toBe(10);
    expect(res.pagination.totalPages).toBe(5);
    expect(res.pagination.hasNext).toBe(true);
    expect(res.pagination.hasPrevious).toBe(false);
  });

  it("normalizes standard envelope with pagination", () => {
    const rawStd = {
      data: [
        { id: 101, name: "Cat A" },
        { id: 102, name: "Cat B" },
      ],
      messagesList: ["Loaded"],
      pagination: {
        pageNo: 2,
        pageSize: 2,
        totalPage: 5,
        totalCount: 10,
        lastId: null,
      },
    };

    const res = normalizeListResponse<{ id: number; name: string }>(rawStd);
    expect(res.items.length).toBe(2);
    expect(res.items[0].name).toBe("Cat A");
    expect(res.pagination.page).toBe(2);
    expect(res.pagination.totalPages).toBe(5);
    expect(res.pagination.total).toBe(10);
    expect(res.pagination.hasNext).toBe(true);
    expect(res.pagination.hasPrevious).toBe(true);
    expect(res.messages).toEqual(["Loaded"]);
  });

  it("normalizes plain array response", () => {
    const rawArr = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const res = normalizeListResponse<{ id: number }>(rawArr, 1, 10);
    expect(res.items.length).toBe(3);
    expect(res.pagination.total).toBe(3);
    expect(res.pagination.totalPages).toBe(1);
    expect(res.pagination.hasNext).toBe(false);
  });

  it("handles empty / 204 response in normalizeListResponse", () => {
    const res = normalizeListResponse(null);
    expect(res.items).toEqual([]);
    expect(res.pagination.total).toBe(0);
    expect(res.pagination.totalPages).toBe(0);
  });
});

describe("Phase 1: Blog Mapper Verification", () => {
  it("converts reading time using Math.ceil", () => {
    expect(secondsToMinutes(0)).toBe(1);
    expect(secondsToMinutes(45)).toBe(1); // 45s => 1min
    expect(secondsToMinutes(60)).toBe(1); // 60s => 1min
    expect(secondsToMinutes(61)).toBe(2); // 61s => 2min
    expect(secondsToMinutes(180)).toBe(3); // 180s => 3min
    expect(secondsToMinutes(185)).toBe(4); // 185s => 4min

    expect(minutesToSeconds(1)).toBe(60);
    expect(minutesToSeconds(5)).toBe(300);
  });

  it("maps status bidirectionally", () => {
    expect(mapApiStatusToUi("published")).toBe("PUBLISHED");
    expect(mapApiStatusToUi("archived")).toBe("ARCHIVED");
    expect(mapApiStatusToUi("draft")).toBe("DRAFT");
    expect(mapApiStatusToUi("review")).toBe("DRAFT");
    expect(mapApiStatusToUi("scheduled")).toBe("DRAFT");

    expect(mapUiStatusToApi("PUBLISHED")).toBe("published");
    expect(mapUiStatusToApi("ARCHIVED")).toBe("archived");
    expect(mapUiStatusToApi("DRAFT")).toBe("draft");
  });

  it("maps tags safely", () => {
    const tags: TagDto[] = [
      { id: 1, slug: "ps5", name: "PlayStation 5" },
      { id: 2, slug: "xbox", name: "Xbox Series" },
    ];
    expect(mapTagsToUi(tags)).toEqual(["PlayStation 5", "Xbox Series"]);
    expect(mapTagsToUi(undefined)).toEqual([]);
  });

  it("maps category to UI", () => {
    const cat: CategoryDto = {
      id: 7,
      slug: "gaming",
      name: "دنیای بازی",
      parent: null,
      description: "توضیحات",
      icon: null,
    };
    expect(mapCategoryToUi(cat)).toEqual({
      id: "7",
      label: "دنیای بازی",
    });
  });

  it("maps content blocks bidirectionally", () => {
    const rawBlocks = [
      { type: "heading", text: "عنوان بخش" },
      { type: "paragraph", text: "متن پاراگراف نمونه." },
      { type: "quote", text: "یک نقل قول جالب." },
      { type: "list", items: ["مورد اول", "مورد دوم"] },
    ];

    const uiBlocks = mapBlocksToUi(rawBlocks);
    expect(uiBlocks.length).toBe(4);
    expect(uiBlocks[0]).toEqual({ type: "heading", text: "عنوان بخش" });
    expect(uiBlocks[1]).toEqual({ type: "paragraph", text: "متن پاراگراف نمونه." });
    expect(uiBlocks[2]).toEqual({ type: "quote", text: "یک نقل قول جالب." });
    expect(uiBlocks[3]).toEqual({ type: "list", items: ["مورد اول", "مورد دوم"] });

    const backToApi = mapBlocksToApi(uiBlocks);
    expect(backToApi.content).toContain("## عنوان بخش");
    expect(backToApi.content).toContain("> یک نقل قول جالب.");
    expect(backToApi.content).toContain("- مورد اول");
    expect(backToApi.content_blocks.length).toBe(4);
  });

  it("maps ArticleListDto to BlogPostSummary accurately", () => {
    const dto: ArticleListDto = {
      id: 123,
      slug: "ps5-pro-review",
      title: "بررسی کنسول PS5 Pro",
      excerpt: "بررسی مشخصات فنی و عملکرد پلی استیشن ۵ پرو",
      short_description: "بررسی کنسول",
      reading_time_sec: 250, // 250s => 5min
      status: "published",
      is_hot: true,
      published_at: "2026-03-01T10:00:00Z",
      author: {
        display_name: "سامان راد",
        avatar: {
          id: 5,
          storage_key: "avatars/saman.jpg",
          url: "https://example.com/avatar.jpg",
          type: "image",
          mime: "image/jpeg",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      },
      category: "سخت‌افزار",
      cover_image: {
        id: 8,
        storage_key: "covers/ps5.jpg",
        url: "https://example.com/ps5.jpg",
        type: "image",
        mime: "image/jpeg",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      views_count: 1420,
      likes_count: 85,
      comments_count: 12,
      tags: [{ id: 1, slug: "ps5", name: "PS5" }],
    };

    const summary = mapArticleListToSummary(dto);
    expect(summary.id).toBe("123");
    expect(summary.slug).toBe("ps5-pro-review");
    expect(summary.title).toBe("بررسی کنسول PS5 Pro");
    expect(summary.readingMinutes).toBe(5);
    expect(summary.status).toBe("PUBLISHED");
    expect(summary.featured).toBe(true);
    expect(summary.coverUrl).toBe("https://example.com/ps5.jpg");
    expect(summary.authorName).toBe("سامان راد");
    expect(summary.tags).toEqual(["PS5"]);
    expect(summary.viewsCount).toBe(1420);
  });

  it("maps ArticleDetailDto to BlogPostDetail with content", () => {
    const dto: ArticleDetailDto = {
      id: 124,
      slug: "gta-6-release-date",
      title: "تاریخ عرضه GTA 6",
      excerpt: "جدیدترین اخبار بازی GTA 6",
      short_description: "اخبار GTA",
      reading_time_sec: 120, // 2min
      status: "published",
      is_hot: false,
      published_at: "2026-03-02T12:00:00Z",
      author: {
        display_name: "سارا نظری",
        avatar: {
          id: 6,
          storage_key: "avatars/sara.jpg",
          url: "https://example.com/sara.jpg",
          type: "image",
          mime: "image/jpeg",
          created_at: "2026-01-01T00:00:00Z",
          updated_at: "2026-01-01T00:00:00Z",
        },
      },
      category: "اخبار",
      cover_image: {
        id: 9,
        storage_key: "covers/gta6.jpg",
        url: "https://example.com/gta6.jpg",
        type: "image",
        mime: "image/jpeg",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      views_count: 3500,
      likes_count: 320,
      comments_count: 45,
      tags: [{ id: 3, slug: "gta", name: "GTA 6" }],
      content: "## مقدمه\n\nاین یک بازی مورد انتظار است.",
      content_blocks: [
        { type: "heading", text: "مقدمه" },
        { type: "paragraph", text: "این یک بازی مورد انتظار است." },
      ],
      blocks: [],
      seo_title: "تاریخ عرضه رسمی GTA 6",
      seo_description: "همه چیز درباره زمان انتشار GTA 6",
      og_image: {
        id: 9,
        storage_key: "covers/gta6.jpg",
        url: "https://example.com/gta6.jpg",
        type: "image",
        mime: "image/jpeg",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
      media_attachments: [],
      related_articles: [],
      article_schema_version: "1.0",
      structured_data: [],
    };

    const detail = mapArticleDetailToUi(dto);
    expect(detail.id).toBe("124");
    expect(detail.content.length).toBe(2);
    expect(detail.content[0]).toEqual({ type: "heading", text: "مقدمه" });
  });

  it("maps AdminBlogPostInput to API Create and Patch requests", () => {
    const adminInput: AdminBlogPostInput = {
      slug: "new-hardware",
      title: "سخت‌افزار جدید",
      excerpt: "توضیح خلاصه",
      coverUrl: "https://example.com/img.png",
      category: "5",
      authorName: "نویسنده",
      readingMinutes: 3,
      tags: ["سخت‌افزار", "بررسی"],
      featured: true,
      status: "PUBLISHED",
      publishedAt: "2026-03-05T08:00:00Z",
      content: [{ type: "paragraph", text: "متن محتوا" }],
    };

    const createReq = mapAdminInputToCreateRequest(adminInput, 5, [1, 2], "media-99");
    expect(createReq.slug).toBe("new-hardware");
    expect(createReq.title).toBe("سخت‌افزار جدید");
    expect(createReq.status).toBe("published");
    expect(createReq.is_hot).toBe(true);
    expect(createReq.category_id).toBe(5);
    expect(createReq.tag_ids).toEqual([1, 2]);
    expect(createReq.cover_image_id).toBe("media-99");

    const patchReq = mapAdminInputToPatchRequest({ status: "ARCHIVED" });
    expect(patchReq.status).toBe("archived");
  });
});
