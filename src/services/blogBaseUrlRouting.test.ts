import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { blogApiService } from "./blogApiService";
import { API_BASE_URL, BLOG_API_BASE_URL } from "@/lib/api/config";
import { gamingCenterService } from "./gamingCenterService";

describe("Blog Base URL Routing & Isolation", () => {
  const originalFetch = globalThis.fetch;
  let interceptedUrls: string[] = [];

  beforeEach(() => {
    interceptedUrls = [];
    globalThis.fetch = (async (url: string | URL | Request) => {
      const urlStr = String(url);
      interceptedUrls.push(urlStr);

      return new Response(
        JSON.stringify({
          data: { id: 1, title: "Mocked", slug: "test-slug" },
          messagesList: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("verifies BLOG_API_BASE_URL is defined distinctly as http://blog.sayra-booking.ir", () => {
    expect(BLOG_API_BASE_URL).toBe("http://blog.sayra-booking.ir");
    expect(BLOG_API_BASE_URL).not.toBe(API_BASE_URL);
  });

  it("routes getArticles to BLOG_API_BASE_URL", async () => {
    await blogApiService.getArticles({ page: 1, page_size: 5 });
    expect(interceptedUrls.length).toBe(1);
    expect(interceptedUrls[0]).toBe("http://blog.sayra-booking.ir/articles/?page=1&page_size=5");
    expect(interceptedUrls[0].startsWith(BLOG_API_BASE_URL)).toBe(true);
  });

  it("routes getArticleBySlug to BLOG_API_BASE_URL", async () => {
    await blogApiService.getArticleBySlug("test-slug");
    expect(interceptedUrls.length).toBe(1);
    expect(interceptedUrls[0]).toBe("http://blog.sayra-booking.ir/articles/test-slug/");
    expect(interceptedUrls[0].startsWith(BLOG_API_BASE_URL)).toBe(true);
  });

  it("routes getCategories to BLOG_API_BASE_URL", async () => {
    await blogApiService.getCategories();
    expect(interceptedUrls.length).toBe(1);
    expect(interceptedUrls[0]).toBe("http://blog.sayra-booking.ir/categories/");
    expect(interceptedUrls[0].startsWith(BLOG_API_BASE_URL)).toBe(true);
  });

  it("routes getTags to BLOG_API_BASE_URL", async () => {
    await blogApiService.getTags();
    expect(interceptedUrls.length).toBe(1);
    expect(interceptedUrls[0]).toBe("http://blog.sayra-booking.ir/tags/");
    expect(interceptedUrls[0].startsWith(BLOG_API_BASE_URL)).toBe(true);
  });

  it("routes getMediaList to BLOG_API_BASE_URL", async () => {
    await blogApiService.getMediaList(1, 10);
    expect(interceptedUrls.length).toBe(1);
    expect(interceptedUrls[0]).toBe("http://blog.sayra-booking.ir/media/?page=1&page_size=10");
    expect(interceptedUrls[0].startsWith(BLOG_API_BASE_URL)).toBe(true);
  });

  it("routes getAuthors to BLOG_API_BASE_URL", async () => {
    await blogApiService.getAuthors();
    expect(interceptedUrls.length).toBe(1);
    expect(interceptedUrls[0]).toBe("http://blog.sayra-booking.ir/authors/");
    expect(interceptedUrls[0].startsWith(BLOG_API_BASE_URL)).toBe(true);
  });

  it("preserves API_BASE_URL for non-blog service requests", async () => {
    await gamingCenterService.listGamingCenters();
    expect(interceptedUrls.length).toBe(1);
    expect(interceptedUrls[0]).toBe(`${API_BASE_URL}/gamingCenters`);
    expect(interceptedUrls[0].startsWith(API_BASE_URL)).toBe(true);
    expect(interceptedUrls[0].startsWith(BLOG_API_BASE_URL)).toBe(false);
  });
});
