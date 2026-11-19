import { describe, it, expect, afterEach } from "bun:test";
import { adminService } from "@/services/adminService";
import { homeService } from "@/services/homeService";
import { ownerService } from "@/services/ownerService";
import { apiClient } from "@/lib/api/client";

describe("Advertisements Full Flow Integration", () => {
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

  describe("Owner/Manager Ads Capability Removed", () => {
    it("does not expose advertisement submission methods on ownerService", () => {
      expect((ownerService as Record<string, unknown>).listAdvertisements).toBeUndefined();
      expect((ownerService as Record<string, unknown>).createAdvertisement).toBeUndefined();
      expect((ownerService as Record<string, unknown>).uploadAdvertisementBanner).toBeUndefined();
    });
  });

  describe("Admin Two-Step Ad Creation & Auto-Approval", () => {
    it("uploads .avif and .webp banner files via platform-admin media upload", async () => {
      const uploadedFields: string[] = [];
      const requestedUrls: string[] = [];

      apiClient.post = (async (url: string, data: any) => {
        requestedUrls.push(url);
        if (data instanceof FormData) {
          uploadedFields.push(data.has("file") ? "file" : "other");
        }
        return {
          status: 200,
          data: {
            success: true,
            data: {
              url: "https://api.sayra-booking.ir/uploads/banner-summer.avif",
            },
          },
        };
      }) as any;

      const avifFile = new File(["dummy avif"], "banner.avif", { type: "" });
      const url1 = await adminService.uploadAdBanner("", avifFile);
      expect(url1).toBe("https://api.sayra-booking.ir/uploads/banner-summer.avif");

      const webpFile = new File(["dummy webp"], "banner.webp", { type: "image/webp" });
      const url2 = await adminService.uploadAdBanner("", webpFile);
      expect(url2).toBe("https://api.sayra-booking.ir/uploads/banner-summer.avif");

      expect(requestedUrls).toEqual([
        "/platform-admin/media/upload",
        "/platform-admin/media/upload",
      ]);
      expect(uploadedFields).toEqual(["file", "file"]);
    });

    it("sends admin ad request then automatically sends second approval request", async () => {
      const calls: { method: string; url: string; body: any }[] = [];
      const progressSteps: string[] = [];

      apiClient.post = (async (url: string, data: any) => {
        calls.push({ method: "POST", url, body: data });
        return {
          status: 201,
          data: {
            success: true,
            data: {
              id: "ad-admin-99",
              title: data.title,
              bannerUrl: data.bannerUrl,
              destinationUrl: data.destinationUrl,
              status: "PENDING",
              createdAt: "2026-11-19T12:00:00.000Z",
            },
          },
        };
      }) as any;

      apiClient.patch = (async (url: string, data: any) => {
        calls.push({ method: "PATCH", url, body: data });
        return {
          status: 200,
          data: {
            success: true,
            data: {
              id: "ad-admin-99",
              status: "APPROVED",
              decisionReason: data.decisionReason,
              durationDays: data.durationDays,
              priority: data.priority,
            },
          },
        };
      }) as any;

      const created = await adminService.createApprovedAd({
        title: "جشنواره تابستانه سایرا",
        description: "تخفیف ویژه رزرو آنلاین",
        bannerUrl: "https://api.sayra-booking.ir/uploads/banner.avif",
        destinationUrl: "/gamecenters",
        durationDays: 30,
        priority: 5,
        adminNote: "انتشار مستقیم ادمین",
        onProgress: (step) => progressSteps.push(step),
      });

      expect(progressSteps).toEqual(["creating", "approving"]);
      expect(calls.length).toBe(2);
      expect(calls[0].method).toBe("POST");
      expect(calls[0].url).toBe("/platform-admin/ad-requests");
      expect(calls[0].body.title).toBe("جشنواره تابستانه سایرا");
      expect(calls[0].body.bannerUrl).toBe("https://api.sayra-booking.ir/uploads/banner.avif");
      expect(calls[1].method).toBe("PATCH");
      expect(calls[1].url).toBe("/platform-admin/ad-requests/ad-admin-99/status");
      expect(calls[1].body.status).toBe("APPROVED");
      expect(created.id).toBe("ad-admin-99");
      expect(created.status).toBe("APPROVED");
    });
  });

  describe("Admin Advertisement Review, Approval, & Rejection", () => {
    it("fetches ad requests for admin review", async () => {
      let requestedUrl = "";
      apiClient.get = (async (url: string) => {
        requestedUrl = url;
        return {
          status: 200,
          data: {
            success: true,
            data: [
              {
                id: "ad-req-1",
                title: "بنر جشنواره ولکان",
                description: "تخفیف ویژه",
                bannerUrl: "/uploads/banner.jpg",
                destinationUrl: "/gamecenter/volcan",
                gamingCenterId: "gc-123",
                gamingCenterName: "گیمنت ولکان",
                ownerName: "علی مدیر",
                ownerPhone: "09121112233",
                status: "PENDING",
                durationDays: 30,
                createdAt: "2026-03-10T10:00:00.000Z",
              },
            ],
          },
        };
      }) as any;

      const res = await adminService.getAdRequests({ page: 1, pageSize: 10 });
      expect(requestedUrl).toContain("/platform-admin/ad-requests");
      expect(res.items.length).toBe(1);
      expect(res.items[0].title).toBe("بنر جشنواره ولکان");
      expect(res.items[0].destinationUrl).toBe("/gamecenter/volcan");
    });

    it("approves ad request via PATCH /platform-admin/ad-requests/{id}/status", async () => {
      let patchedUrl = "";
      let patchPayload: any = null;

      apiClient.patch = (async (url: string, data: any) => {
        patchedUrl = url;
        patchPayload = data;
        return {
          status: 200,
          data: {
            success: true,
            data: {
              id: "ad-req-1",
              status: "APPROVED",
              decisionReason: "تأیید شد",
            },
          },
        };
      }) as any;

      const result = await adminService.updateAdRequestStatus("ad-req-1", "APPROVED", "تأیید شد");
      expect(patchedUrl).toContain("/platform-admin/ad-requests/ad-req-1/status");
      expect(patchPayload.status).toBe("APPROVED");
      expect(result.status).toBe("APPROVED");
    });

    it("rejects ad request with reason via PATCH /platform-admin/ad-requests/{id}/status", async () => {
      let patchedUrl = "";
      let patchPayload: any = null;

      apiClient.patch = (async (url: string, data: any) => {
        patchedUrl = url;
        patchPayload = data;
        return {
          status: 200,
          data: {
            success: true,
            data: {
              id: "ad-req-1",
              status: "REJECTED",
              decisionReason: "کیفیت تصویر پایین است",
            },
          },
        };
      }) as any;

      const result = await adminService.updateAdRequestStatus("ad-req-1", "REJECTED", "کیفیت تصویر پایین است");
      expect(patchedUrl).toContain("/platform-admin/ad-requests/ad-req-1/status");
      expect(patchPayload.status).toBe("REJECTED");
      expect(patchPayload.decisionReason).toBe("کیفیت تصویر پایین است");
      expect(result.status).toBe("REJECTED");
    });
  });

  describe("Public Home Slider Display", () => {
    it("loads approved advertisements into home slider from /public/advertisements/slider", async () => {
      let requestedUrl = "";

      apiClient.get = (async (url: string) => {
        requestedUrl = url;
        return {
          status: 200,
          data: {
            success: true,
            data: [
              {
                id: "slide-1",
                title: "تخفیف ویژه ولکان",
                description: "۳۰ درصد تخفیف روزهای فرد",
                bannerUrl: "https://api.sayragame.ir/uploads/volcan-ad.jpg",
                destinationUrl: "/gamecenter/volcan-slug",
                priority: 10,
              },
            ],
          },
        };
      }) as any;

      const banners = await homeService.getBanners();
      expect(requestedUrl).toContain("/public/advertisements/slider");
      expect(banners.length).toBe(1);
      expect(banners[0].id).toBe("slide-1");
      expect(banners[0].imageUrl).toBe("https://api.sayragame.ir/uploads/volcan-ad.jpg");
      expect(banners[0].href).toBe("/gamecenter/volcan-slug");
      expect(banners[0].alt).toBe("تخفیف ویژه ولکان");
    });

    it("returns empty array when public slider returns empty list", async () => {
      apiClient.get = (async () => {
        return {
          status: 200,
          data: {
            success: true,
            data: [],
          },
        };
      }) as any;

      const banners = await homeService.getBanners();
      expect(banners).toEqual([]);
    });
  });
});
