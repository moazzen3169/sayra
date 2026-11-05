import { describe, it, expect } from "bun:test";
import {
  normalizeMediaUrl,
  resolveMediaUrl,
  extractMediaUrl,
  extractMediaItems,
  getMediaBaseOrigin,
  PLACEHOLDERS,
} from "@/lib/media";

describe("Media URL Resolution & Fallback Infrastructure", () => {
  it("getMediaBaseOrigin returns a valid base URL origin", () => {
    const origin = getMediaBaseOrigin();
    expect(origin).toBeDefined();
    expect(origin.startsWith("http://") || origin.startsWith("https://")).toBe(true);
  });

  it("normalizeMediaUrl preserves absolute URLs (http, https, blob, data)", () => {
    expect(normalizeMediaUrl("https://images.example.com/photo.jpg")).toBe(
      "https://images.example.com/photo.jpg"
    );
    expect(normalizeMediaUrl("http://51.20.249.108/uploads/sample.png")).toBe(
      "http://51.20.249.108/uploads/sample.png"
    );
    expect(normalizeMediaUrl("blob:http://localhost:3000/guid-123")).toBe(
      "blob:http://localhost:3000/guid-123"
    );
    expect(normalizeMediaUrl("data:image/png;base64,AAAA")).toBe(
      "data:image/png;base64,AAAA"
    );
  });

  it("normalizeMediaUrl preserves local frontend assets as relative paths", () => {
    expect(normalizeMediaUrl("/img/gamnet-1.webp")).toBe("/img/gamnet-1.webp");
    expect(normalizeMediaUrl("/images/default-banner.webp")).toBe(
      "/images/default-banner.webp"
    );
    expect(normalizeMediaUrl("/design/sayra.svg")).toBe("/design/sayra.svg");
    expect(normalizeMediaUrl("/fonts/Peyda-Bold.woff2")).toBe(
      "/fonts/Peyda-Bold.woff2"
    );
  });

  it("normalizeMediaUrl handles null, undefined, empty, or whitespace strings safely", () => {
    expect(normalizeMediaUrl(null)).toBe("");
    expect(normalizeMediaUrl(undefined)).toBe("");
    expect(normalizeMediaUrl("")).toBe("");
    expect(normalizeMediaUrl("    ")).toBe("");
  });

  it("normalizeMediaUrl resolves backend relative paths without duplicate /uploads/", () => {
    const base = getMediaBaseOrigin();
    expect(normalizeMediaUrl("/uploads/photos/my-photo.jpg")).toBe(
      `${base}/uploads/photos/my-photo.jpg`
    );
    expect(normalizeMediaUrl("uploads/photos/my-photo.jpg")).toBe(
      `${base}/uploads/photos/my-photo.jpg`
    );
    // Duplicate /uploads/uploads/ cleanup
    expect(normalizeMediaUrl("/uploads/uploads/my-photo.jpg")).toBe(
      `${base}/uploads/my-photo.jpg`
    );
  });

  it("resolveMediaUrl resolves string or object media and supports thumbnail preference", () => {
    const base = getMediaBaseOrigin();
    const media = {
      url: "/uploads/full.jpg",
      thumbUrl: "/uploads/thumbnails/thumb.jpg",
    };

    // When preferring thumbnail:
    expect(resolveMediaUrl(media, true)).toBe(
      `${base}/uploads/thumbnails/thumb.jpg`
    );

    // When preferring full URL:
    expect(resolveMediaUrl(media, false)).toBe(`${base}/uploads/full.jpg`);

    // When thumbUrl is missing:
    expect(resolveMediaUrl({ url: "/uploads/full.jpg" }, true)).toBe(
      `${base}/uploads/full.jpg`
    );

    // When direct string:
    expect(resolveMediaUrl("/uploads/raw.jpg")).toBe(`${base}/uploads/raw.jpg`);

    // When null or empty:
    expect(resolveMediaUrl(null)).toBe("");
    expect(resolveMediaUrl(undefined)).toBe("");
  });

  it("extractMediaUrl extracts correctly from nested structures", () => {
    expect(extractMediaUrl({ thumbUrl: "/uploads/thumb.jpg" })).toContain(
      "/uploads/thumb.jpg"
    );
    expect(extractMediaUrl({ media: { thumbUrl: "/uploads/t2.jpg" } })).toContain(
      "/uploads/t2.jpg"
    );
  });

  it("extractMediaItems parses items preserving thumbUrl and altText", () => {
    const payload = [
      {
        id: "1",
        url: "/uploads/1.jpg",
        thumbUrl: "/uploads/thumbnails/1.jpg",
        altText: "تصویر ۱",
      },
      {
        id: "2",
        url: "/uploads/2.jpg",
      },
    ];

    const items = extractMediaItems<any>(payload);
    expect(items.length).toBe(2);
    expect(items[0].url).toContain("/uploads/1.jpg");
    expect(items[0].thumbUrl).toContain("/uploads/thumbnails/1.jpg");
    expect(items[1].thumbUrl).toBeUndefined();
  });

  it("PLACEHOLDERS constants are defined for all key media types", () => {
    expect(PLACEHOLDERS.banner).toBe("/images/default-banner.webp");
    expect(PLACEHOLDERS.center).toBe("/images/default-center.webp");
    expect(PLACEHOLDERS.gallery).toBe("/images/default-gallery.webp");
    expect(PLACEHOLDERS.avatar).toBe("/images/default-avatar.webp");
  });
});
