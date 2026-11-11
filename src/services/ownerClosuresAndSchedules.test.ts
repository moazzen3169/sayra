import { describe, it, expect, beforeEach } from "bun:test";
import { ownerService } from "./ownerService";
import { gamingCenterService } from "./gamingCenterService";
import { apiClient } from "@/lib/api/client";
import type { GamingCenterClosure, GamingCenterSchedule } from "@/types/owner";

describe("Gaming Center Closures & Closed Days Management", () => {
  const centerId = "center-test-123";
  const slug = "test-game-center";

  beforeEach(() => {
    // Reset any mocks if necessary
  });

  describe("A. Owner Closures API & Validation", () => {
    it("rejects closure creation when title is empty or missing", async () => {
      await expect(
        ownerService.createClosure(centerId, {
          title: "   ",
          startDate: "2026-03-20T10:00:00Z",
          endDate: "2026-03-25T10:00:00Z",
        })
      ).rejects.toThrow("عنوان تعطیلی الزامی است.");
    });

    it("rejects closure creation when startDate >= endDate", async () => {
      await expect(
        ownerService.createClosure(centerId, {
          title: "تعمیرات سرور",
          startDate: "2026-03-25T10:00:00Z",
          endDate: "2026-03-20T10:00:00Z",
        })
      ).rejects.toThrow("تاریخ شروع تعطیلی باید قبل از تاریخ پایان باشد.");

      await expect(
        ownerService.createClosure(centerId, {
          title: "تعمیرات سرور",
          startDate: "2026-03-25T10:00:00Z",
          endDate: "2026-03-25T10:00:00Z",
        })
      ).rejects.toThrow("تاریخ شروع تعطیلی باید قبل از تاریخ پایان باشد.");
    });

    it("calls POST /gamingCenters/{centerId}/closures with valid payload", async () => {
      let requestedUrl = "";
      let requestedMethod = "";
      let requestedBody: any = null;

      const originalPost = apiClient.post;
      apiClient.post = (async (url: string, body?: any) => {
        requestedUrl = url;
        requestedMethod = "POST";
        requestedBody = body;
        return {
          data: {
            id: "closure-999",
            gamingCenterId: centerId,
            title: body.title,
            reason: body.reason,
            startDate: body.startDate,
            endDate: body.endDate,
          },
          status: 201,
          headers: new Headers(),
        };
      }) as any;

      try {
        const created = await ownerService.createClosure(centerId, {
          title: "تعطیلات نوروز",
          reason: "سال نو مبارک",
          startDate: "2026-03-20T00:00:00Z",
          endDate: "2026-03-24T23:59:59Z",
        });

        expect(requestedUrl).toContain(`/gamingCenters/${centerId}/closures`);
        expect(requestedMethod).toBe("POST");
        expect(requestedBody.title).toBe("تعطیلات نوروز");
        expect(requestedBody.reason).toBe("سال نو مبارک");
        expect(created.id).toBe("closure-999");
      } finally {
        apiClient.post = originalPost;
      }
    });

    it("calls DELETE /gamingCenters/{centerId}/closures/{closureId}", async () => {
      let requestedUrl = "";
      let requestedMethod = "";

      const originalDelete = apiClient.delete;
      apiClient.delete = (async (url: string) => {
        requestedUrl = url;
        requestedMethod = "DELETE";
        return { data: { success: true }, status: 200, headers: new Headers() };
      }) as any;

      try {
        await ownerService.deleteClosure(centerId, "closure-999");
        expect(requestedUrl).toContain(`/gamingCenters/${centerId}/closures/closure-999`);
        expect(requestedMethod).toBe("DELETE");
      } finally {
        apiClient.delete = originalDelete;
      }
    });

    it("calls GET /gamingCenters/{centerId}/closures and unpacks response", async () => {
      const originalGet = apiClient.get;
      apiClient.get = (async () => {
        return {
          data: {
            data: [
              {
                id: "c-1",
                title: "تعطیلی تست",
                startDate: "2026-04-01T00:00:00Z",
                endDate: "2026-04-02T00:00:00Z",
              },
            ],
          },
          status: 200,
          headers: new Headers(),
        };
      }) as any;

      try {
        const list = await ownerService.getClosures(centerId);
        expect(list.length).toBe(1);
        expect(list[0].id).toBe("c-1");
      } finally {
        apiClient.get = originalGet;
      }
    });
  });

  describe("B. Weekly Closed Days & Settings Update", () => {
    it("updates settings including closedDays (array of 0-6) and schedules", async () => {
      let requestedBody: any = null;
      const originalPut = apiClient.put;
      apiClient.put = (async (url: string, body?: any) => {
        requestedBody = body;
        return { data: { success: true }, status: 200, headers: new Headers() };
      }) as any;

      try {
        await ownerService.updateSettings(centerId, {
          workStartTime: "10:00",
          workEndTime: "23:00",
          closedDays: [5, 6], // پنج‌شنبه و جمعه
          schedules: [
            { dayOfWeek: 5, isClosed: true },
            { dayOfWeek: 6, isClosed: true },
          ],
        });

        expect(requestedBody.closedDays).toEqual([5, 6]);
        expect(requestedBody.schedules).toBeDefined();
        expect(requestedBody.schedules.length).toBe(2);
      } finally {
        apiClient.put = originalPut;
      }
    });
  });

  describe("C. Overlapping Closures Detection (findOverlappingClosures)", () => {
    const sampleClosures: GamingCenterClosure[] = [
      {
        id: "c-norooz",
        title: "تعطیلات نوروز",
        startDate: "2026-03-20T00:00:00Z",
        endDate: "2026-03-24T00:00:00Z",
      },
      {
        id: "c-server-maintenance",
        title: "تعمیرات سرور",
        reason: "ارتقا زیرساخت",
        startDate: "2026-04-10T14:00:00Z",
        endDate: "2026-04-10T18:00:00Z",
      },
    ];

    it("detects exact overlap during multi-day closure", () => {
      const overlaps = gamingCenterService.findOverlappingClosures(
        "2026-03-21T10:00:00Z",
        "2026-03-21T12:00:00Z",
        sampleClosures
      );
      expect(overlaps.length).toBe(1);
      expect(overlaps[0].title).toBe("تعطیلات نوروز");
    });

    it("detects overlap when reservation starts or ends during maintenance closure", () => {
      // رزرو از 13:00 تا 15:00، تعمیرات از 14:00 تا 18:00 -> تداخل دارد
      const overlaps = gamingCenterService.findOverlappingClosures(
        "2026-04-10T13:00:00Z",
        "2026-04-10T15:00:00Z",
        sampleClosures
      );
      expect(overlaps.length).toBe(1);
      expect(overlaps[0].id).toBe("c-server-maintenance");
    });

    it("returns empty array when reservation does not overlap with any closure", () => {
      // رزرو قبل از تعمیرات: 10:00 تا 12:00
      const overlapsBefore = gamingCenterService.findOverlappingClosures(
        "2026-04-10T10:00:00Z",
        "2026-04-10T12:00:00Z",
        sampleClosures
      );
      expect(overlapsBefore.length).toBe(0);

      // رزرو بعد از تعمیرات: 18:00 تا 20:00
      const overlapsAfter = gamingCenterService.findOverlappingClosures(
        "2026-04-10T18:00:00Z",
        "2026-04-10T20:00:00Z",
        sampleClosures
      );
      expect(overlapsAfter.length).toBe(0);
    });
  });

  describe("D. Full Day Closed Check (isDateFullyClosed)", () => {
    // 2026-03-21 is Saturday (Persian dayOfWeek = 0)
    // 2026-03-27 is Friday (Persian dayOfWeek = 6)
    // 2026-03-26 is Thursday (Persian dayOfWeek = 5)

    it("identifies weekly closed day via closedDays array", () => {
      const closedDays = [6]; // جمعه تعطیل است
      const resFriday = gamingCenterService.isDateFullyClosed("2026-03-27", [], closedDays);
      expect(resFriday.isClosed).toBe(true);
      expect(resFriday.reason).toContain("تعطیلی هفتگی");

      const resSaturday = gamingCenterService.isDateFullyClosed("2026-03-21", [], closedDays);
      expect(resSaturday.isClosed).toBe(false);
    });

    it("identifies weekly closed day via schedules isClosed flag", () => {
      const schedules: GamingCenterSchedule[] = [
        { dayOfWeek: 0, isClosed: false },
        { dayOfWeek: 6, isClosed: true }, // جمعه
      ];

      const resFriday = gamingCenterService.isDateFullyClosed("2026-03-27", [], undefined, schedules);
      expect(resFriday.isClosed).toBe(true);
    });

    it("identifies full day closure via active GamingCenterClosure record", () => {
      const closures: GamingCenterClosure[] = [
        {
          id: "c-norooz",
          title: "تعطیلات نوروز",
          reason: "سال نو",
          startDate: "2026-03-20T00:00:00.000Z",
          endDate: "2026-03-24T23:59:59.999Z",
        },
      ];

      const resNorooz = gamingCenterService.isDateFullyClosed("2026-03-21", closures);
      expect(resNorooz.isClosed).toBe(true);
      expect(resNorooz.reason).toContain("تعطیلات نوروز");
      expect(resNorooz.reason).toContain("سال نو");

      const resNormalDay = gamingCenterService.isDateFullyClosed("2026-03-26", closures);
      expect(resNormalDay.isClosed).toBe(false);
    });
  });
});
