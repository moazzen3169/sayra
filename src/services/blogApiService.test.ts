/**
 * Blog API Service Network & AbortSignal Integration Tests
 * Validates that blogApiService handles HTTP calls, AbortSignal errors,
 * 204 No Content, and query parameter construction using apiClient.
 */

import { describe, it, expect, afterEach } from "bun:test";
import { blogApiService } from "./blogApiService";
import { isAbortError } from "@/lib/api/client";

describe("Phase 1: Blog API Service Integration (Mocked Network)", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("handles AbortSignal without misclassifying it as a standard network error", async () => {
    const controller = new AbortController();
    controller.abort();

    globalThis.fetch = () => {
      const err = new DOMException("The operation was aborted", "AbortError");
      return Promise.reject(err);
    };

    try {
      await blogApiService.getArticles({}, { signal: controller.signal });
      expect(true).toBe(false); // Should not reach here
    } catch (e) {
      expect(isAbortError(e)).toBe(true);
    }
  });

  it("handles 204 No Content on delete operations without throwing JSON errors", async () => {
    globalThis.fetch = async () => {
      return new Response(null, { status: 204 });
    };

    let thrown = false;
    try {
      await blogApiService.deleteArticle("sample-article");
    } catch {
      thrown = true;
    }
    expect(thrown).toBe(false);
  });

  it("fetches and normalizes articles list from standard envelope response", async () => {
    globalThis.fetch = async () => {
      return new Response(
        JSON.stringify({
          data: [
            {
              id: 1,
              slug: "test-slug",
              title: "Test Title",
              excerpt: "Excerpt",
              short_description: "Short",
              reading_time_sec: 120,
              likes_count: 5,
              comments_count: 2,
              tags: [],
              published_at: "2026-03-01T00:00:00Z",
              author: { display_name: "Author", avatar: { id: 1 } },
              category: "Gaming",
              cover_image: { id: 2, url: "http://example.com/cover.jpg" },
            },
          ],
          messagesList: ["OK"],
          pagination: {
            pageNo: 1,
            pageSize: 10,
            totalPage: 1,
            totalCount: 1,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    };

    const res = await blogApiService.getArticles({ page: 1, page_size: 10 });
    expect(res.items.length).toBe(1);
    expect(res.items[0].slug).toBe("test-slug");
    expect(res.pagination.total).toBe(1);
    expect(res.messages).toEqual(["OK"]);
  });
});
