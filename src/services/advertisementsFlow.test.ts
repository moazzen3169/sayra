import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ownerService } from "@/services/ownerService";
import { adminService } from "@/services/adminService";
import { homeService } from "@/services/homeService";
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

  describe("Owner Advertisement Submission & Banner Upload", () => {
    it("lists advertisements for a gaming center", async () => {
      let requestedUrl = "";
      apiClient.get = (async (url: string, opts?: any) => {
        requestedUrl = url;
        return {
          status: 200,
          data: {
            success: true,
            data: [
              {
                id: "ad-1",
                title: "کمپین نوروز",
                bannerUrl: "https://cdn.example.com/banner.png",
                destinationUrl: "/gamecenter/volcan-net",
                status: "PENDING",
                durationDays: 30,
                createdAt: "2026-03-20T00:00:00.000Z",
              },
            ],
          },
        };
      }) as any;

      const ads = await ownerService.listAdvertisements("gc-123");
      expect(requestedUrl).toContain("/gamingCenters/gc-123/advertisements");
      expect(ads.length).toBe(1);
      expect(ads[0].title).toBe("کمپین نوروز");
      expect(ads[0].destinationUrl).toBe("/gamecenter/volcan-net");
    });

    it("uploads advertisement banner file with required multipart field 'banner'", async () => {
      let receivedFormData: FormData | null = null;
      let requestedUrl = "";

      apiClient.post = (async (url: string, data: any) => {
        requestedUrl = url;
        receivedFormData = data;
        return {
          status: 200,
          data: {
            success: true,
            data: {
              url: "https://api.sayragame.ir/uploads/ads/banner-new.jpg",
              thumbUrl: "https://api.sayragame.ir/uploads/ads/thumb-new.jpg",
            },
          },
        };
      }) as any;

      const fakeFile = new File(["dummy binary image"], "banner.jpg", { type: "image/jpeg" });
      const uploadRes = await ownerService.uploadAdvertisementBanner("gc-123", fakeFile);

      expect(requestedUrl).toContain("/gamingCenters/gc-123/advertisements/upload");
      expect(receivedFormData).not.toBeNull();
      expect(receivedFormData?.has("banner")).toBe(true);
      expect(uploadRes.url).toBe("https://api.sayragame.ir/uploads/ads/banner-new.jpg");
    });

    it("submits new advertisement request with auto-filled destinationUrl and duration", async () => {
      let postedPayload: any = null;
      let requestedUrl = "";

      apiClient.post = (async (url: string, data: any) => {
        requestedUrl = url;
        postedPayload = data;
        return {
          status: 201,
          data: {
            success: true,
            data: {
              id: "ad-created-1",
              title: data.title,
              description: data.description,
              bannerUrl: data.bannerUrl,
              destinationUrl: data.destinationUrl,
              proposedDurationDays: data.proposedDurationDays,
              status: "PENDING",
              createdAt: new Date().toISOString(),
            },
          },
        };
      }) as any;

      const newAd = await ownerService.createAdvertisement("gc-123", {
        title: "مسابقات فیفا در ولکان",
        description: "جوایز ارزنده برای برندگان",
        bannerUrl: "https://cdn.example.com/fifa-banner.png",
        destinationUrl: "/gamecenter/volcan-net",
        proposedDurationDays: 14,
      });

      expect(requestedUrl).toContain("/gamingCenters/gc-123/advertisements");
      expect(postedPayload.title).toBe("مسابقات فیفا در ولکان");
      expect(postedPayload.bannerUrl).toBe("https://cdn.example.com/fifa-banner.png");
      expect(postedPayload.destinationUrl).toBe("/gamecenter/volcan-net");
      expect(postedPayload.proposedDurationDays).toBe(14);
      expect(newAd.status).toBe("PENDING");
    });
  });

  describe("Admin Advertisement Review, Approval, & Rejection", () => {
    it("fetches ad requests for admin review", async () => {
      let requestedUrl = "";
      apiClient.get = (async (url: string, opts?: any) => {
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

    it("falls back to default mock banners when public slider returns empty list", async () => {
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
      expect(banners.length).toBeGreaterThan(0);
      expect(banners[0].imageUrl).toBeDefined();
    });
  });
});
