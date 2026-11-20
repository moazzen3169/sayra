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
        hourlyPrice: 180000,
        isActive: true,
      });

      expect(capturedUrl).toBe(ENDPOINTS.owner.stationDetail(centerId, stationId));
      expect(capturedBody).toEqual({
        name: "PS5 VIP #1",
        type: "CONSOLE",
        hourlyRate: 180000,
        hourlyPrice: 180000,
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

  it("fetches all pages when stations endpoint is paginated across multiple pages", async () => {
    const originalGet = apiClient.get;
    const requestedPages: Array<number | undefined> = [];

    apiClient.get = (async (_url: string, opts: any) => {
      const page = opts?.query?.page ?? 1;
      requestedPages.push(opts?.query?.page);
      if (page === 1) {
        return {
          data: {
            data: [
              { id: "st-pc", name: "PC 1", stationType: "PC", catalogDeviceId: "cat-pc" },
              { id: "st-ps4", name: "PS4 1", stationType: "PLAYSTATION", catalogDeviceId: "cat-ps4" },
              { id: "st-xbox", name: "Xbox 1", stationType: "XBOX", catalogDeviceId: "cat-xbox" },
            ],
            meta: { total: 4, page: 1, limit: 3, totalPages: 2 },
          },
        };
      }
      return {
        data: {
          data: [
            { id: "st-ps5", name: "PS5 1", stationType: "PLAYSTATION", catalogDeviceId: "cat-ps5" },
          ],
          meta: { total: 4, page: 2, limit: 3, totalPages: 2 },
        },
      };
    }) as any;

    try {
      const res = await ownerService.listStations(centerId);
      expect(requestedPages).toEqual([undefined, 2]);
      expect(res.map((s) => s.id)).toEqual(["st-pc", "st-ps4", "st-xbox", "st-ps5"]);
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("lists selected center games via GET /gamingCenters/{id}/stations/games", async () => {
    let capturedUrl = "";
    const originalGet = apiClient.get;
    apiClient.get = (async (url: string) => {
      capturedUrl = url;
      return {
        data: {
          success: true,
          data: [
            {
              id: "g-fc25",
              title: "EA Sports FC 25",
              coverImageUrl: "/uploads/fc25.png",
              supportedPlatforms: ["PLAYSTATION", "PC"],
              genre: "Sports",
            },
            "GTA V",
          ],
        },
      };
    }) as any;

    try {
      const { ownerGamesService } = await import("./ownerGamesService");
      const games = await ownerGamesService.listCenterGames(centerId);

      expect(capturedUrl).toBe(ENDPOINTS.owner.games(centerId));
      expect(games.length).toBe(2);
      expect(games[0].id).toBe("g-fc25");
      expect(games[0].title).toBe("EA Sports FC 25");
      expect(games[0].supportedPlatforms).toEqual(["PLAYSTATION", "PC"]);
      expect(games[0].genre).toBe("Sports");
      expect(games[1].id).toBe("GTA V");
      expect(games[1].title).toBe("GTA V");
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("removes a game via DELETE /gamingCenters/{id}/stations/games/{gameId}", async () => {
    let capturedUrl = "";

    const originalDelete = apiClient.delete;
    apiClient.delete = (async (url: string) => {
      capturedUrl = url;
      return { data: { success: true } };
    }) as any;

    try {
      const { ownerGamesService } = await import("./ownerGamesService");
      await ownerGamesService.removeCenterGame(centerId, "Mortal Kombat 1");

      expect(capturedUrl).toBe(ENDPOINTS.owner.gameDetail(centerId, "Mortal Kombat 1"));
    } finally {
      apiClient.delete = originalDelete;
    }
  });

  it("adds games from catalog via ownerGamesService.addGamesFromCatalog and normalizes titles", async () => {
    let capturedUrl = "";
    let capturedBody: any = null;

    const originalPost = apiClient.post;
    apiClient.post = (async (url: string, body: any) => {
      capturedUrl = url;
      capturedBody = body;
      return {
        data: {
          addedGames: ["FC 25", { title: "GTA V" }],
          allGames: ["FC 25", { title: "GTA V" }, "gta v"],
        },
      };
    }) as any;

    try {
      const { ownerGamesService } = await import("./ownerGamesService");
      const res = await ownerGamesService.addGamesFromCatalog(centerId, ["g1", "g2"]);

      expect(capturedUrl).toBe(ENDPOINTS.owner.gamesFromCatalog(centerId));
      expect(capturedBody).toEqual({ gameCatalogIds: ["g1", "g2"] });
      expect(res.addedGames).toEqual(["FC 25", "GTA V"]);
      expect(res.allGames).toEqual(["FC 25", "GTA V"]);
    } finally {
      apiClient.post = originalPost;
    }
  });
});
