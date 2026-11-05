import { describe, it, expect, beforeEach } from "bun:test";
import { normalizeMediaUrl, extractMediaUrl, extractMediaItems } from "@/lib/media";
import { normalizeUserRole, parseJwtRole } from "@/context/AuthContext";
import { ownerService } from "@/services/ownerService";
import { mapMediaToGalleryImages } from "@/services/gamecenterDetailService";
import { setTokens, clearTokens } from "@/lib/token";

describe("Media URL Normalization & Upload Handling", () => {
  it("normalizeMediaUrl preserves absolute URLs", () => {
    expect(normalizeMediaUrl("https://example.com/photo.jpg")).toBe("https://example.com/photo.jpg");
    expect(normalizeMediaUrl("http://51.20.249.108/uploads/img.png")).toBe("http://51.20.249.108/uploads/img.png");
    expect(normalizeMediaUrl("blob:http://localhost:3000/123-abc")).toBe("blob:http://localhost:3000/123-abc");
    expect(normalizeMediaUrl("data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==")).toBe(
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg=="
    );
  });

  it("normalizeMediaUrl safely handles empty or null inputs", () => {
    expect(normalizeMediaUrl("")).toBe("");
    expect(normalizeMediaUrl(null)).toBe("");
    expect(normalizeMediaUrl(undefined)).toBe("");
    expect(normalizeMediaUrl("   ")).toBe("");
  });

  it("normalizeMediaUrl converts relative paths to absolute backend URLs", () => {
    const res1 = normalizeMediaUrl("/uploads/photos/101.jpg");
    expect(res1).toStartWith("http://");
    expect(res1).toContain("/uploads/photos/101.jpg");

    const res2 = normalizeMediaUrl("uploads/photos/102.jpg");
    expect(res2).toStartWith("http://");
    expect(res2).toContain("/uploads/photos/102.jpg");
  });

  it("extractMediaUrl extracts from diverse backend shapes", () => {
    expect(extractMediaUrl("https://cdn.example.com/a.jpg")).toBe("https://cdn.example.com/a.jpg");
    expect(extractMediaUrl({ url: "https://cdn.example.com/b.jpg" })).toBe("https://cdn.example.com/b.jpg");
    expect(extractMediaUrl({ imageUrl: "https://cdn.example.com/c.jpg" })).toBe("https://cdn.example.com/c.jpg");
    expect(extractMediaUrl({ path: "/uploads/d.jpg" })).toContain("/uploads/d.jpg");
    expect(extractMediaUrl({ filePath: "/uploads/e.jpg" })).toContain("/uploads/e.jpg");
    expect(extractMediaUrl({ data: { url: "https://cdn.example.com/f.jpg" } })).toBe("https://cdn.example.com/f.jpg");
    expect(extractMediaUrl({ media: { path: "/uploads/g.jpg" } })).toContain("/uploads/g.jpg");
    expect(extractMediaUrl({ file: { path: "/uploads/h.jpg" } })).toContain("/uploads/h.jpg");
    expect(extractMediaUrl([{ url: "https://cdn.example.com/first.jpg" }])).toBe("https://cdn.example.com/first.jpg");
  });

  it("extractMediaItems parses envelope arrays and normalizes URLs", () => {
    const rawEnvelope = {
      success: true,
      data: [
        { id: "m-1", url: "/uploads/slide1.jpg", altText: "تصویر ۱", purpose: "GALLERY" },
        { id: "m-2", path: "/uploads/slide2.jpg", altText: "تصویر ۲", purpose: "GALLERY" },
        { id: "m-3", url: "https://external.com/logo.png", altText: "لوگو", purpose: "LOGO" },
      ],
    };

    const items = extractMediaItems<any>(rawEnvelope);
    expect(items.length).toBe(3);
    expect(items[0].url).toContain("/uploads/slide1.jpg");
    expect(items[1].url).toContain("/uploads/slide2.jpg");
    expect(items[2].url).toBe("https://external.com/logo.png");
    expect(items[2].purpose).toBe("LOGO");
  });

  it("mapMediaToGalleryImages maps and normalizes public media for detail slider", () => {
    const publicMedia = [
      { id: "1", url: "/uploads/center-1.jpg", altText: "نمای سالن" },
      { id: "2", url: "https://cdn.example.com/center-2.jpg", altText: "کنسول‌ها" },
      { id: "3", url: "" }, // invalid
    ];

    const gallery = mapMediaToGalleryImages(publicMedia as any);
    expect(gallery.length).toBe(2);
    expect(gallery[0].url).toContain("/uploads/center-1.jpg");
    expect(gallery[0].alt).toBe("نمای سالن");
    expect(gallery[1].url).toBe("https://cdn.example.com/center-2.jpg");
  });
});

describe("Owner Media Upload Integration", () => {
  beforeEach(() => {
    setTokens({ accessToken: "test-token" });
  });

  it("uploadGalleryImage extracts normalized URL when backend returns wrapped url", async () => {
    const dummyFile = new File(["dummy content"], "photo.jpg", { type: "image/jpeg" });

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "uploaded-99",
            url: "/uploads/centers/gc-1/photo.jpg",
            purpose: "GALLERY",
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await ownerService.uploadGalleryImage("gc-1", dummyFile, { purpose: "GALLERY" });
    expect(res.id).toBe("uploaded-99");
    expect(res.url).toStartWith("http://");
    expect(res.url).toContain("/uploads/centers/gc-1/photo.jpg");
    expect(res.purpose).toBe("GALLERY");
  });

  it("uploadGalleryImage handles backend returning relative path", async () => {
    const dummyFile = new File(["dummy logo"], "logo.png", { type: "image/png" });

    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            path: "uploads/logo.png",
          },
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      );
    }) as unknown as typeof fetch;

    const res = await ownerService.uploadGalleryImage("gc-1", dummyFile, { purpose: "LOGO" });
    expect(res.url).toStartWith("http://");
    expect(res.url).toContain("/uploads/logo.png");
    expect(res.purpose).toBe("LOGO");
  });
});

describe("User Role Normalization & JWT Role Decoding", () => {
  it("normalizeUserRole maps admin roles to ADMIN", () => {
    expect(normalizeUserRole("ADMIN")).toBe("ADMIN");
    expect(normalizeUserRole("admin")).toBe("ADMIN");
    expect(normalizeUserRole("SUPER_ADMIN")).toBe("ADMIN");
    expect(normalizeUserRole("PLATFORM_ADMIN")).toBe("ADMIN");
  });

  it("normalizeUserRole maps manager and staff roles to MANAGER", () => {
    expect(normalizeUserRole("MANAGER")).toBe("MANAGER");
    expect(normalizeUserRole("manager")).toBe("MANAGER");
    expect(normalizeUserRole("OWNER")).toBe("MANAGER");
    expect(normalizeUserRole("owner")).toBe("MANAGER");
    expect(normalizeUserRole("STAFF")).toBe("MANAGER");
    expect(normalizeUserRole("staff")).toBe("MANAGER");
  });

  it("normalizeUserRole maps customer or unknown roles to USER", () => {
    expect(normalizeUserRole("CUSTOMER")).toBe("USER");
    expect(normalizeUserRole("customer")).toBe("USER");
    expect(normalizeUserRole("USER")).toBe("USER");
    expect(normalizeUserRole(undefined)).toBe("USER");
    expect(normalizeUserRole(null)).toBe("USER");
    expect(normalizeUserRole("")).toBe("USER");
  });

  it("parseJwtRole correctly extracts role from JWT payload", () => {
    // Header: {"alg":"HS256","typ":"JWT"} -> eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
    // Payload: {"id":"123","role":"MANAGER"} -> eyJpZCI6IjEyMyIsInJvbGUiOiJNQU5BR0VSIn0
    const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMyIsInJvbGUiOiJNQU5BR0VSIn0.signature";
    expect(parseJwtRole(token)).toBe("MANAGER");

    const adminToken = "header." + btoa(JSON.stringify({ role: "ADMIN" })) + ".sig";
    expect(parseJwtRole(adminToken)).toBe("ADMIN");

    const customerToken = "header." + btoa(JSON.stringify({ role: "CUSTOMER" })) + ".sig";
    expect(parseJwtRole(customerToken)).toBe("CUSTOMER");
  });

  it("parseJwtRole handles malformed or non-jwt tokens safely", () => {
    expect(parseJwtRole("not-a-token")).toBeUndefined();
    expect(parseJwtRole("")).toBeUndefined();
    expect(parseJwtRole(null)).toBeUndefined();
    expect(parseJwtRole(undefined)).toBeUndefined();
  });
});
