import { describe, expect, it, mock } from "bun:test";
import { apiClient } from "@/lib/api/client";
import { ownerService, pickNumber } from "@/services/ownerService";
import type { Earning, OwnerAnalyticsSummary } from "@/types/owner";

describe("ownerService.financial data integration (Phase 8)", () => {
  it("extracts withdrawable amount safely with pickNumber", () => {
    expect(pickNumber({ withdrawableAmount: 500000 }, ["withdrawableAmount"])).toBe(500000);
    expect(pickNumber({ withdrawableRevenue: 450000 }, ["withdrawableAmount", "withdrawableRevenue"])).toBe(450000);
    expect(pickNumber({ netRevenue: "300000" }, ["netRevenue"])).toBe(300000);
    expect(pickNumber({}, ["withdrawableAmount"])).toBeNull();
    expect(pickNumber(null, ["withdrawableAmount"])).toBeNull();
  });

  it("calls GET /gamingCenters/{id}/analytics/summary and returns server-authoritative data without mock fallback", async () => {
    const originalGet = apiClient.get;
    const mockSummary: OwnerAnalyticsSummary = {
      totalIncome: 9500000,
      totalReservations: 32,
      activeStationsCount: 6,
      withdrawableAmount: 7200000,
      netRevenue: 7200000,
      totalRevenue: 9500000,
      currency: "تومان",
    };

    apiClient.get = mock((url: string, opts?: any) => {
      expect(url).toBe("/gamingCenters/gc-99/analytics/summary");
      if (opts?.query?.startDate) {
        expect(opts.query.startDate).toBe("2026-04-01T00:00:00.000Z");
      }
      return Promise.resolve({
        data: mockSummary,
        status: 200,
        ok: true,
      });
    }) as any;

    try {
      const summary = await ownerService.getAnalyticsSummary("gc-99", {
        startDate: "2026-04-01T00:00:00.000Z",
      });
      expect(summary.withdrawableAmount).toBe(7200000);
      expect(summary.totalIncome).toBe(9500000);
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("unwraps data envelope in getAnalyticsSummary when wrapped inside { success: true, data }", async () => {
    const originalGet = apiClient.get;
    apiClient.get = mock(() => {
      return Promise.resolve({
        data: {
          success: true,
          data: {
            withdrawableAmount: 6400000,
            currency: "تومان",
          },
        },
        status: 200,
        ok: true,
      });
    }) as any;

    try {
      const summary = await ownerService.getAnalyticsSummary("gc-99");
      expect(summary.withdrawableAmount).toBe(6400000);
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("propagates backend errors in getAnalyticsSummary without returning fake numbers", async () => {
    const originalGet = apiClient.get;
    apiClient.get = mock(() => Promise.reject(new Error("500 Server Error"))) as any;

    try {
      await expect(ownerService.getAnalyticsSummary("gc-99")).rejects.toThrow("500 Server Error");
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("fetches commissions with pagination and status filters from GET /gamingCenters/{id}/commissions", async () => {
    const originalGet = apiClient.get;
    const mockList: Earning[] = [
      {
        id: "earning-101",
        reservationId: "res-1",
        status: "CHARGED",
        commissionAmount: 50000,
        currency: "تومان",
      },
      {
        id: "earning-102",
        reservationId: "res-2",
        status: "REFUNDED",
        commissionAmount: 0,
        currency: "تومان",
      },
    ];

    apiClient.get = mock((url: string, opts?: any) => {
      expect(url).toBe("/gamingCenters/gc-99/commissions");
      expect(opts?.query?.page).toBe(2);
      expect(opts?.query?.pageSize).toBe(10);
      expect(opts?.query?.status).toBe("CHARGED");
      return Promise.resolve({
        data: mockList,
        status: 200,
        ok: true,
        meta: {
          pagination: {
            total: 2,
            page: 2,
            pageSize: 10,
            totalPages: 1,
          },
        },
      });
    }) as any;

    try {
      const result = await ownerService.listCommissionsPaginated("gc-99", {
        page: 2,
        pageSize: 10,
        status: "CHARGED",
      });

      expect(result.items.length).toBe(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(2);
      expect(result.items[0].commissionAmount).toBe(50000);
      expect(result.items[1].status).toBe("REFUNDED");
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("unwraps commissions when payload is structured as { data: Earning[], meta: { pagination } }", async () => {
    const originalGet = apiClient.get;
    apiClient.get = mock(() => {
      return Promise.resolve({
        data: {
          data: [
            {
              id: "earning-200",
              reservationId: "res-50",
              status: "ACCRUED",
              commissionAmount: 42000,
              currency: "تومان",
            },
          ],
          meta: {
            pagination: {
              total: 1,
              page: 1,
              pageSize: 20,
              totalPages: 1,
            },
          },
        },
        status: 200,
        ok: true,
      });
    }) as any;

    try {
      const result = await ownerService.listCommissionsPaginated("gc-99");
      expect(result.items.length).toBe(1);
      expect(result.items[0].id).toBe("earning-200");
      expect(result.total).toBe(1);
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("propagates error on commissions request failure without falling back to mock commissions", async () => {
    const originalGet = apiClient.get;
    apiClient.get = mock(() => Promise.reject(new Error("Network Error"))) as any;

    try {
      await expect(ownerService.listCommissionsPaginated("gc-99")).rejects.toThrow("Network Error");
    } finally {
      apiClient.get = originalGet;
    }
  });

  it("requestWithdrawal raises descriptive contract gap error and refuses fake operation", async () => {
    await expect(ownerService.requestWithdrawal()).rejects.toThrow(
      "اندپوینت ثبت درخواست برداشت در مستندات کنونی OpenAPI (v1.0-LOCKED) تعریف نشده است"
    );
  });
});
