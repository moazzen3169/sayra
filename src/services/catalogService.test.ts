import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { catalogService } from "./catalogService";
import { apiClient } from "@/lib/api/client";
import { mapCatalogDeviceToCategory } from "@/components/DeviceCategories";
import { groupStations } from "@/lib/devices";
import type { GameStationInfo } from "@/services/gamecenterDetailService";

describe("catalogService and Device Integration", () => {
  let originalGet: typeof apiClient.get;

  beforeEach(() => {
    originalGet = apiClient.get;
  });

  afterEach(() => {
    apiClient.get = originalGet;
  });

  it("1. listDevices sends GET /catalog/devices with query params and returns items", async () => {
    let capturedUrl = "";
    let capturedQuery: unknown = null;

    apiClient.get = mock(async (url: string, opts?: { query?: Record<string, unknown> }) => {
      capturedUrl = url;
      capturedQuery = opts?.query;
      return {
        data: {
          data: [
            {
              id: "dev-1",
              name: "PlayStation 5",
              deviceType: "PLAYSTATION",
              coverImageUrl: "https://example.com/ps5.jpg",
              isActive: true,
            },
          ],
        },
      } as unknown as ReturnType<typeof apiClient.get>;
    });

    const res = await catalogService.listDevices({
      page: 1,
      limit: 10,
      deviceType: "PLAYSTATION",
      isActive: true,
      search: "ps5",
    });

    expect(capturedUrl).toBe("/catalog/devices");
    expect(capturedQuery).toEqual({
      page: 1,
      limit: 10,
      deviceType: "PLAYSTATION",
      isActive: true,
      search: "ps5",
    });
    expect(res).toHaveLength(1);
    expect(res[0].id).toBe("dev-1");
    expect(res[0].name).toBe("PlayStation 5");
  });

  it("2. getDeviceById calls /catalog/devices/{id} and returns device object", async () => {
    let capturedUrl = "";

    apiClient.get = mock(async (url: string) => {
      capturedUrl = url;
      return {
        data: {
          data: {
            id: "dev-ps5",
            name: "PS5 Digital",
            deviceType: "PLAYSTATION",
            isActive: true,
          },
        },
      } as unknown as ReturnType<typeof apiClient.get>;
    });

    const res = await catalogService.getDeviceById("dev-ps5");
    expect(capturedUrl).toBe("/catalog/devices/dev-ps5");
    expect(res.id).toBe("dev-ps5");
    expect(res.name).toBe("PS5 Digital");
  });

  it("3. listGames sends GET /catalog/games with query and returns items", async () => {
    let capturedUrl = "";

    apiClient.get = mock(async (url: string) => {
      capturedUrl = url;
      return {
        data: {
          data: [
            {
              id: "game-1",
              title: "FC 25",
              supportedPlatforms: ["PLAYSTATION", "PC"],
              isActive: true,
            },
          ],
        },
      } as unknown as ReturnType<typeof apiClient.get>;
    });

    const res = await catalogService.listGames({ platform: "PLAYSTATION" });
    expect(capturedUrl).toBe("/catalog/games");
    expect(res).toHaveLength(1);
    expect(res[0].title).toBe("FC 25");
  });

  it("4. getGameById calls /catalog/games/{id} and returns game", async () => {
    let capturedUrl = "";

    apiClient.get = mock(async (url: string) => {
      capturedUrl = url;
      return {
        data: {
          data: {
            id: "game-fc",
            title: "EA Sports FC 25",
            supportedPlatforms: ["PLAYSTATION"],
            isActive: true,
          },
        },
      } as unknown as ReturnType<typeof apiClient.get>;
    });

    const res = await catalogService.getGameById("game-fc");
    expect(capturedUrl).toBe("/catalog/games/game-fc");
    expect(res.id).toBe("game-fc");
    expect(res.title).toBe("EA Sports FC 25");
  });

  it("5. mapCatalogDeviceToCategory maps various device types accurately", () => {
    const ps5Cat = mapCatalogDeviceToCategory({
      id: "cat-1",
      name: "PlayStation 5 Slim",
      deviceType: "PLAYSTATION",
      coverImageUrl: "/img/ps5-custom.png",
      isActive: true,
    });
    expect(ps5Cat.iconType).toBe("ps5");
    expect(ps5Cat.imageUrl).toBe("/img/ps5-custom.png");

    const xboxCat = mapCatalogDeviceToCategory({
      id: "cat-2",
      name: "Xbox Series X",
      deviceType: "XBOX",
      isActive: true,
    });
    expect(xboxCat.iconType).toBe("xbox");

    const vrCat = mapCatalogDeviceToCategory({
      id: "cat-3",
      name: "Meta Quest 3",
      deviceType: "VR",
      isActive: true,
    });
    expect(vrCat.iconType).toBe("vr");
  });

  it("6. groupStations preserves coverImageUrl from catalog/station if present", () => {
    const mockStations: GameStationInfo[] = [
      {
        id: "st-1",
        gamingCenterId: "gc-1",
        name: "PS5 VIP 1",
        stationType: "PLAYSTATION",
        deviceModel: "PS5",
        coverImageUrl: "https://example.com/ps5-cover.jpg",
        hourlyPrice: 85000,
        isActive: true,
      },
      {
        id: "st-2",
        gamingCenterId: "gc-1",
        name: "PS5 VIP 2",
        stationType: "PLAYSTATION",
        deviceModel: "PS5",
        hourlyPrice: 85000,
        isActive: true,
      },
    ];

    const groups = groupStations(mockStations);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("PS5");
    expect(groups[0].image).toBe("https://example.com/ps5-cover.jpg");
    expect(groups[0].capacity).toBe(2);
    expect(groups[0].minPrice).toBe(85000);
  });
});
