import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { catalogService } from "./catalogService";
import { ownerService } from "./ownerService";
import { stationApi } from "./gaming-center/station.api";
import { groupReservationApi } from "./gaming-center/group-reservation.api";
import { apiClient, ApiError } from "@/lib/api/client";
import {
  clearExtraControllersForStations,
  getExtraSelectionHourlyTotal,
  getTotalSelectedExtraCount,
  setStationExtraControllerQuantity,
  toExtraControllerSelectionInputs,
  validateExtraControllerRows,
  type ExtraControllerSelectionMap,
} from "@/lib/extraControllers";
import type { StationExtraController } from "@/types/gaming-center/station.types";

describe("Extra Controllers & Device Types (OpenAPI)", () => {
  const originalGet = apiClient.get;
  const originalPost = apiClient.post;
  const originalPut = apiClient.put;
  const originalPatch = apiClient.patch;
  const originalDelete = apiClient.delete;

  beforeEach(() => {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
    apiClient.put = originalPut;
    apiClient.patch = originalPatch;
    apiClient.delete = originalDelete;
  });

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
    apiClient.put = originalPut;
    apiClient.patch = originalPatch;
    apiClient.delete = originalDelete;
  });

  it("1. catalogService manages device types with extraControllerEnabled", async () => {
    let capturedUrl = "";
    let capturedBody: unknown = null;

    apiClient.get = (async (url: string) => {
      capturedUrl = url;
      return {
        data: {
          success: true,
          data: [
            {
              id: "dt-ps5",
              name: "PlayStation 5",
              slug: "ps5",
              category: "PLAYSTATION",
              isActive: true,
              extraControllerEnabled: true,
            },
          ],
        },
      };
    }) as typeof apiClient.get;

    const publicTypes = await catalogService.listDeviceTypes({ isActive: true });
    expect(capturedUrl).toBe("/catalog/device-types");
    expect(publicTypes).toHaveLength(1);
    expect(publicTypes[0].extraControllerEnabled).toBe(true);

    apiClient.patch = (async (url: string, body: unknown) => {
      capturedUrl = url;
      capturedBody = body;
      return {
        data: {
          success: true,
          data: {
            id: "dt-ps5",
            name: "PlayStation 5",
            slug: "ps5",
            category: "PLAYSTATION",
            isActive: true,
            extraControllerEnabled: false,
          },
        },
      };
    }) as typeof apiClient.patch;

    const updated = await catalogService.updateAdminDeviceType("dt-ps5", {
      extraControllerEnabled: false,
    });
    expect(capturedUrl).toBe("/platform-admin/catalog/device-types/dt-ps5");
    expect(capturedBody).toEqual({ extraControllerEnabled: false });
    expect(updated.extraControllerEnabled).toBe(false);
  });

  it("2. ownerService creates station with deviceTypeId and extraControllers and replaces configs", async () => {
    let capturedUrl = "";
    let capturedBody: Record<string, unknown> | null = null;

    apiClient.post = (async (url: string, body: unknown) => {
      capturedUrl = url;
      capturedBody = body as Record<string, unknown>;
      return {
        data: {
          success: true,
          data: { id: "st-1", name: "PS5 #1", stationType: "PLAYSTATION", hourlyPrice: 120000 },
        },
      };
    }) as typeof apiClient.post;

    await ownerService.createStation("gc-1", {
      name: "PS5 #1",
      stationType: "PLAYSTATION",
      deviceTypeId: "dt-ps5",
      hourlyPrice: 120000,
      extraControllers: [
        { controllerType: "دسته PS5", quantity: 2, hourlyPrice: 30000, isActive: true },
        { controllerType: "دسته PS4", quantity: 1, hourlyPrice: 20000 },
      ],
    });

    expect(capturedUrl).toBe("/gamingCenters/gc-1/stations");
    expect(capturedBody?.deviceTypeId).toBe("dt-ps5");
    expect(capturedBody?.extraControllers).toEqual([
      { controllerType: "دسته PS5", quantity: 2, hourlyPrice: 30000, isActive: true },
      { controllerType: "دسته PS4", quantity: 1, hourlyPrice: 20000, isActive: true },
    ]);

    apiClient.put = (async (url: string, body: unknown) => {
      capturedUrl = url;
      capturedBody = body as Record<string, unknown>;
      return {
        data: {
          success: true,
          data: [
            {
              id: "ec-1",
              stationId: "st-1",
              controllerType: "دسته Xbox",
              quantity: 3,
              hourlyPrice: 25000,
              isActive: true,
            },
          ],
        },
      };
    }) as typeof apiClient.put;

    const replaced = await ownerService.replaceStationExtraControllers("gc-1", "st-1", [
      { controllerType: "دسته Xbox", quantity: 3, hourlyPrice: 25000 },
    ]);
    expect(capturedUrl).toBe("/gamingCenters/gc-1/stations/st-1/extra-controllers");
    expect(capturedBody).toEqual({
      extraControllers: [
        { controllerType: "دسته Xbox", quantity: 3, hourlyPrice: 25000, isActive: true },
      ],
    });
    expect(replaced).toHaveLength(1);
    expect(replaced[0].controllerType).toBe("دسته Xbox");
  });

  it("3. stationApi.getStationExtraControllers queries public endpoint with optional time window", async () => {
    let capturedUrl = "";
    let capturedQuery: unknown = null;

    apiClient.get = (async (url: string, opts?: { query?: unknown }) => {
      capturedUrl = url;
      capturedQuery = opts?.query;
      return {
        data: {
          success: true,
          data: [
            {
              id: "ec-ps5",
              stationId: "st-1",
              controllerType: "دسته PS5",
              quantity: 4,
              availableQuantity: 2,
              hourlyPrice: 35000,
              isActive: true,
            },
            {
              id: "ec-inactive",
              stationId: "st-1",
              controllerType: "دسته قدیمی",
              quantity: 1,
              hourlyPrice: 10000,
              isActive: false,
            },
          ],
        },
      };
    }) as typeof apiClient.get;

    const list = await stationApi.getStationExtraControllers("arena-club", "st-1", {
      startTime: "2026-11-20T16:00:00.000Z",
      endTime: "2026-11-20T18:00:00.000Z",
    });

    expect(capturedUrl).toBe("/public/gamingCenters/arena-club/stations/st-1/extra-controllers");
    expect(capturedQuery).toEqual({
      startTime: "2026-11-20T16:00:00.000Z",
      endTime: "2026-11-20T18:00:00.000Z",
    });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("ec-ps5");
    expect(list[0].availableQuantity).toBe(2);
  });

  it("4. groupReservationApi.checkoutGroupReservation forwards extraControllers per station item", async () => {
    let capturedUrl = "";
    let capturedBody: Record<string, unknown> | null = null;

    apiClient.post = (async (url: string, body: unknown) => {
      capturedUrl = url;
      capturedBody = body as Record<string, unknown>;
      return {
        data: {
          success: true,
          data: {
            holdId: "hold-1",
            paymentId: "pay-1",
            paymentUrl: "https://pay.example.com/1",
            expiresAt: "2026-11-20T16:10:00.000Z",
            amount: 310000,
          },
        },
      };
    }) as typeof apiClient.post;

    await groupReservationApi.checkoutGroupReservation(
      "arena-club",
      {
        startTime: "2099-11-20T16:00:00.000Z",
        durationMinutes: 120,
        items: [
          {
            stationId: "st-1",
            extraControllers: [{ extraControllerId: "ec-ps5", quantity: 2 }],
          },
          {
            stationId: "st-2",
          },
        ],
        customer: {
          fullName: "علی محمدی",
          phone: "09123456789",
        },
      },
      "idem-123"
    );

    expect(capturedUrl).toBe("/public/gamingCenters/arena-club/group-reservations/checkout");
    expect(capturedBody?.items).toEqual([
      {
        stationId: "st-1",
        extraControllers: [{ extraControllerId: "ec-ps5", quantity: 2 }],
      },
      {
        stationId: "st-2",
      },
    ]);
  });

  it("5. extraControllers helpers clamp quantities, compute totals, and serialize inputs", () => {
    const ps5Ctrl: StationExtraController = {
      id: "ec-ps5",
      stationId: "st-1",
      controllerType: "دسته PS5",
      quantity: 4,
      availableQuantity: 2,
      hourlyPrice: 30000,
      isActive: true,
    };
    const ps4Ctrl: StationExtraController = {
      id: "ec-ps4",
      stationId: "st-1",
      controllerType: "دسته PS4",
      quantity: 3,
      availableQuantity: 3,
      hourlyPrice: 20000,
      isActive: true,
    };

    let map: ExtraControllerSelectionMap = {};
    map = setStationExtraControllerQuantity(map, "st-1", ps5Ctrl, 5); // clamps to 2
    map = setStationExtraControllerQuantity(map, "st-1", ps4Ctrl, 1);

    expect(getTotalSelectedExtraCount(map, [{ id: "st-1" }])).toBe(3);
    expect(getExtraSelectionHourlyTotal(map, [{ id: "st-1" }])).toBe(80000);
    expect(toExtraControllerSelectionInputs(map, "st-1")).toEqual([
      { extraControllerId: "ec-ps5", quantity: 2 },
      { extraControllerId: "ec-ps4", quantity: 1 },
    ]);

    map = clearExtraControllersForStations(map, ["st-1"]);
    expect(getTotalSelectedExtraCount(map, [{ id: "st-1" }])).toBe(0);
  });

  it("6. validateExtraControllerRows parses Persian digits and detects duplicate or invalid rows", () => {
    const valid = validateExtraControllerRows([
      { localId: "1", controllerType: "دسته PS5", quantity: "۲", hourlyPrice: "۳۰۰۰۰", isActive: true },
      { localId: "2", controllerType: "دسته Xbox", quantity: "1", hourlyPrice: "25,000", isActive: true },
    ]);
    expect(valid.error).toBeUndefined();
    expect(valid.configs).toEqual([
      { controllerType: "دسته PS5", quantity: 2, hourlyPrice: 30000, isActive: true },
      { controllerType: "دسته Xbox", quantity: 1, hourlyPrice: 25000, isActive: true },
    ]);

    const dup = validateExtraControllerRows([
      { localId: "1", controllerType: "PS5", quantity: "1", hourlyPrice: "20000", isActive: true },
      { localId: "2", controllerType: "ps5", quantity: "2", hourlyPrice: "20000", isActive: true },
    ]);
    expect(dup.error).toBeDefined();

    const missingPrice = validateExtraControllerRows([
      { localId: "1", controllerType: "دسته PS4", quantity: "2", hourlyPrice: "", isActive: true },
    ]);
    expect(missingPrice.error).toBeDefined();
  });

  it("7. syncStationExtraControllers uses POST/PATCH/DELETE and replaceStationExtraControllers falls back on 400", async () => {
    const calls: Array<{ method: string; url: string; body?: unknown }> = [];

    apiClient.post = (async (url: string, body: unknown) => {
      calls.push({ method: "POST", url, body });
      return {
        data: {
          success: true,
          data: { id: "ec-new", stationId: "st-1", ...(body as Record<string, unknown>) },
        },
      };
    }) as typeof apiClient.post;

    apiClient.patch = (async (url: string, body: unknown) => {
      calls.push({ method: "PATCH", url, body });
      return {
        data: {
          success: true,
          data: { id: "ec-1", stationId: "st-1", ...(body as Record<string, unknown>) },
        },
      };
    }) as typeof apiClient.patch;

    apiClient.delete = (async (url: string) => {
      calls.push({ method: "DELETE", url });
      return { data: undefined };
    }) as typeof apiClient.delete;

    const existing: StationExtraController[] = [
      { id: "ec-1", stationId: "st-1", controllerType: "دسته PS5", quantity: 2, hourlyPrice: 30000, isActive: true },
      { id: "ec-2", stationId: "st-1", controllerType: "دسته PS4", quantity: 1, hourlyPrice: 20000, isActive: true },
    ];

    await ownerService.syncStationExtraControllers(
      "gc-1",
      "st-1",
      [
        { existingId: "ec-1", controllerType: "دسته PS5", quantity: 3, hourlyPrice: 35000, isActive: true },
        { controllerType: "دسته Xbox", quantity: 2, hourlyPrice: 25000, isActive: true },
      ],
      existing
    );

    expect(calls).toEqual([
      {
        method: "PATCH",
        url: "/gamingCenters/gc-1/stations/st-1/extra-controllers/ec-1",
        body: { controllerType: "دسته PS5", quantity: 3, hourlyPrice: 35000, isActive: true },
      },
      {
        method: "POST",
        url: "/gamingCenters/gc-1/stations/st-1/extra-controllers",
        body: { controllerType: "دسته Xbox", quantity: 2, hourlyPrice: 25000, isActive: true },
      },
      {
        method: "DELETE",
        url: "/gamingCenters/gc-1/stations/st-1/extra-controllers/ec-2",
      },
    ]);

    calls.length = 0;
    apiClient.put = (async () => {
      throw new ApiError(400, "VALIDATION_ERROR", "Invalid database operation payload.");
    }) as typeof apiClient.put;
    apiClient.get = (async () => ({
      data: { success: true, data: [] },
    })) as typeof apiClient.get;

    const fallbackRes = await ownerService.replaceStationExtraControllers("gc-1", "st-1", [
      { controllerType: "دسته PS5", quantity: 3, hourlyPrice: 35000, isActive: true },
    ]);
    expect(calls).toEqual([
      {
        method: "POST",
        url: "/gamingCenters/gc-1/stations/st-1/extra-controllers",
        body: { controllerType: "دسته PS5", quantity: 3, hourlyPrice: 35000, isActive: true },
      },
    ]);
    expect(fallbackRes).toHaveLength(1);
  });
});
