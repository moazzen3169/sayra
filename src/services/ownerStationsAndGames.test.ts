import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { ownerService } from "./ownerService";
import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

describe("ownerService: Station & Games Management", () => {
  const centerId = "gc-123";
  const stationId = "st-456";

  beforeEach(() => {
    // Save original fetch
  });

  it("updates station via PATCH /gamingCenters/{centerId}/stations/{stationId}", async () => {
    let capturedUrl = "";
    let capturedMethod = "";
    let capturedBody: any = null;

    const originalPatch = apiClient.patch;
    apiClient.patch = (async (url: string, body: any) => {
      capturedUrl = url;
      capturedMethod = "PATCH";
      capturedBody = body;
      return { data: { id: stationId, name: body.name, hourlyPrice: body.hourlyRate } };
    }) as any;

    try {
      const res = await ownerService.updateStation(centerId, stationId, {
        name: "PS5 VIP #1",
        type: "CONSOLE",
        hourlyRate: 180000,
        isActive: true,
      });

      expect(capturedUrl).toBe(ENDPOINTS.owner.stationDetail(centerId, stationId));
      expect(capturedBody).toEqual({
        name: "PS5 VIP #1",
        type: "CONSOLE",
        hourlyRate: 180000,
        isActive: true,
      });
      expect(res.name).toBe("PS5 VIP #1");
    } finally {
      apiClient.patch = originalPatch;
    }
  });

  it("deletes station via DELETE /gamingCenters/{centerId}/stations/{stationId}", async () => {
    let capturedUrl = "";
    let capturedMethod = "";

    const originalDelete = apiClient.delete;
    apiClient.delete = (async (url: string) => {
      capturedUrl = url;
      capturedMethod = "DELETE";
      return { data: { success: true } };
    }) as any;

    try {
      await ownerService.deleteStation(centerId, stationId);
      expect(capturedUrl).toBe(ENDPOINTS.owner.stationDetail(centerId, stationId));
    } finally {
      apiClient.delete = originalDelete;
    }
  });

  it("adds games from catalog via POST /gamingCenters/{centerId}/stations/games/from-catalog", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    const originalPost = apiClient.post;
    apiClient.post = (async (url: string, body: any) => {
      capturedUrl = url;
      capturedBody = body;
      return {
        data: {
          success: true,
          data: {
            gamingCenterId: centerId,
            addedGames: ["EA Sports FC 25", "Mortal Kombat 1"],
            allGames: ["GTA V", "EA Sports FC 25", "Mortal Kombat 1"],
          },
        },
      };
    }) as any;

    try {
      const res = await ownerService.addGamesFromCatalog(centerId, ["game-1", "game-2"]);
      expect(capturedUrl).toBe(ENDPOINTS.owner.gamesFromCatalog(centerId));
      expect(capturedBody).toEqual({ gameCatalogIds: ["game-1", "game-2"] });
      expect(res.addedGames).toEqual(["EA Sports FC 25", "Mortal Kombat 1"]);
      expect(res.allGames).toEqual(["GTA V", "EA Sports FC 25", "Mortal Kombat 1"]);
    } finally {
      apiClient.post = originalPost;
    }
  });

  it("lists stations with catalogDeviceId query filter", async () => {
    let capturedUrl = "";
    let capturedQuery: any = null;

    const originalGet = apiClient.get;
    apiClient.get = (async (url: string, opts: any) => {
      capturedUrl = url;
      capturedQuery = opts?.query;
      return {
        data: [
          { id: "st-1", name: "PC 1", catalogDeviceId: "cat-10", stationType: "PC" },
        ],
      };
    }) as any;

    try {
      const res = await ownerService.listStations(centerId, { catalogDeviceId: "cat-10" });
      expect(capturedUrl).toBe(ENDPOINTS.owner.stations(centerId));
      expect(capturedQuery).toEqual({ catalogDeviceId: "cat-10" });
      expect(res.length).toBe(1);
      expect(res[0].id).toBe("st-1");
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("extracts stations from nested pagination envelope ({ data: { data: [...] } })", async () => {
    const originalGet = apiClient.get;
    const samplePayload = {
      data: [
        {
          id: "cmw9tkgif000zk9bmr9ek3z85",
          gamingCenterId: "cmw2lzu520017123lfuvfmtcd",
          name: "asdasda #1",
          stationType: "XBOX",
          deviceTypeId: null,
          catalogDeviceId: "cmw680iug000hhm6eo0jejtuf",
          coverImageUrl: "/uploads/7f0815fc-bd2c-4279-9f9c-7a825f7ab207.png",
          isVip: false,
          hourlyPrice: 10101010,
          minRentHours: 1,
          maxRentHours: 8,
          defaultDurationHours: 1,
          incrementMinutes: 30,
          isActive: true,
          createdAt: "2026-11-09T22:15:03.832Z",
          updatedAt: "2026-11-09T22:15:03.832Z",
        },
        {
          id: "cmw8ikyqh002p8quhtmsd9zh2",
          gamingCenterId: "cmw2lzu520017123lfuvfmtcd",
          name: "بیلیارد #3",
          stationType: "PC",
          deviceTypeId: null,
          catalogDeviceId: "cmw6874xe000rhm6ep3789a3k",
          coverImageUrl: "/uploads/cbea77da-e313-4eab-8797-07521b86dadb.png",
          isVip: false,
          hourlyPrice: 200000,
          minRentHours: 1,
          maxRentHours: 8,
          defaultDurationHours: 1,
          incrementMinutes: 30,
          isActive: true,
          createdAt: "2026-11-09T00:19:45.498Z",
          updatedAt: "2026-11-09T00:19:45.498Z",
        },
        {
          id: "cmw7tasit0008bp5ih2bzfc03",
          gamingCenterId: "cmw2lzu520017123lfuvfmtcd",
          name: "mamadps #4",
          stationType: "PLAYSTATION",
          deviceTypeId: null,
          catalogDeviceId: "cmw67yses000chm6eh0bwm2o1",
          coverImageUrl: ".\\public\\img\\ps5.png",
          isVip: false,
          hourlyPrice: 185000,
          minRentHours: 1,
          maxRentHours: 8,
          defaultDurationHours: 1,
          incrementMinutes: 30,
          isActive: true,
          createdAt: "2026-11-08T12:32:00.484Z",
          updatedAt: "2026-11-08T12:32:00.484Z",
        },
      ],
      meta: {
        total: 15,
        page: 1,
        limit: 10,
        totalPages: 2,
      },
    };

    apiClient.get = (async () => ({
      data: samplePayload,
    })) as any;

    try {
      const res = await ownerService.listStations(centerId);
      expect(res.length).toBe(3);
      expect(res[0].id).toBe("cmw9tkgif000zk9bmr9ek3z85");
      expect(res[0].name).toBe("asdasda #1");
      expect(res[1].name).toBe("بیلیارد #3");
      expect(res[2].name).toBe("mamadps #4");
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("removes a game and saves the updated games list via PATCH /gamingCenters/{id}", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    const originalPatch = apiClient.patch;
    apiClient.patch = (async (url: string, body: any) => {
      capturedUrl = url;
      capturedBody = body;
      return { data: { success: true } };
    }) as any;

    try {
      const { ownerGamesService } = await import("./ownerGamesService");
      const updated = await ownerGamesService.removeCenterGame(
        centerId,
        "Mortal Kombat 1",
        ["GTA V", "EA Sports FC 25", "Mortal Kombat 1"]
      );

      expect(capturedUrl).toBe(ENDPOINTS.owner.center(centerId));
      expect(capturedBody).toEqual({
        games: ["GTA V", "EA Sports FC 25"],
      });
      expect(updated).toEqual(["GTA V", "EA Sports FC 25"]);
    } finally {
      apiClient.patch = originalPatch;
    }
  });
});
