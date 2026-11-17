import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { formatDayLabel } from "@/lib/reservationUi";
import {
  AnalyticsFilterParams,
  AnalyticsReportData,
  AnalyticsTrendPoint,
} from "@/types/analytics";

function getRangeDates(dateRange: AnalyticsFilterParams["dateRange"]) {
  const end = new Date();
  const daysMap: Record<AnalyticsFilterParams["dateRange"], number> = {
    "7d": 7,
    "30d": 30,
    "90d": 90,
    "12m": 365,
  };
  const labelMap: Record<AnalyticsFilterParams["dateRange"], string> = {
    "7d": "۷ روز گذشته",
    "30d": "۳۰ روز گذشته",
    "90d": "۹۰ روز گذشته",
    "12m": "۱۲ ماه گذشته",
  };
  const start = new Date(end.getTime() - daysMap[dateRange] * 24 * 60 * 60 * 1000);
  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    periodLabel: labelMap[dateRange],
  };
}

function calcChangePercent(current: number, previous: number): number {
  if (!previous) return current > 0 ? 100 : 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

export const analyticsService = {
  /**
   * Fetch executive dashboard and analytical report data from real backend endpoints.
   */
  async getAnalyticsReport(
    params: AnalyticsFilterParams,
    signal?: AbortSignal
  ): Promise<AnalyticsReportData> {
    const { dateRange = "7d", gamecenterId = "all", city = "all" } = params;
    const { startDate, endDate, periodLabel } = getRangeDates(dateRange);

    const query: Record<string, string> = {
      startDate,
      endDate,
    };
    if (gamecenterId && gamecenterId !== "all") {
      query.gamingCenterId = gamecenterId;
    }
    if (city && city !== "all") {
      query.city = city;
    }

    const [reportRes, ticketStatsRes] = await Promise.allSettled([
      apiClient.get<any>(ENDPOINTS.platformAdmin.reports, { query, signal }),
      apiClient.get<any>(ENDPOINTS.adminTickets.statistics, { signal }),
    ]);

    if (reportRes.status === "rejected") {
      throw reportRes.reason;
    }

    const raw = reportRes.value?.data?.data || reportRes.value?.data || {};
    const financials = raw.financials || {};
    const reservations = raw.reservations || {};
    const users = raw.users || {};
    const gamingCenters = raw.gamingCenters || {};
    const comparison = raw.comparison || {};
    const rawTimeSeries = Array.isArray(raw.timeSeries) ? raw.timeSeries : [];
    const rawTopCenters = Array.isArray(gamingCenters.topGamingCenters)
      ? gamingCenters.topGamingCenters
      : [];

    const trendData: AnalyticsTrendPoint[] = rawTimeSeries.map((pt: any) => {
      const dateStr = String(pt.date || "");
      const formattedLabel = dateStr ? formatDayLabel(dateStr) || dateStr : "-";
      return {
        date: dateStr,
        label: formattedLabel,
        reservationsCount: Number(pt.reservationCount ?? pt.reservationsCount ?? 0),
        grossAmount: Number(pt.revenue ?? pt.grossAmount ?? 0),
        completedAmount: Number(pt.completedRevenue ?? pt.revenue ?? 0),
        newUsers: Number(pt.newUsers ?? 0),
        ticketsCount: Number(pt.ticketsCount ?? 0),
      };
    });

    const totalReservationsCurrent = Number(reservations.totalReservations ?? 0);
    const totalReservationsPrev = Number(
      comparison.previousReservations ?? comparison.reservations?.totalReservations ?? 0
    );

    const grossCurrent = Number(financials.totalRevenue ?? 0);
    const grossPrev = Number(
      comparison.previousRevenue ?? comparison.financials?.totalRevenue ?? 0
    );

    const completedCurrent = Number(
      financials.totalPaidAmount ?? financials.gamingCentersRevenue ?? financials.totalRevenue ?? 0
    );
    const completedPrev = Number(
      comparison.previousPaidAmount ?? comparison.financials?.totalPaidAmount ?? 0
    );

    const activeUsersCurrent = Number(users.activeUsers ?? users.totalUsers ?? 0);
    const activeUsersPrev = Number(
      comparison.previousActiveUsers ?? comparison.users?.activeUsers ?? 0
    );

    let ticketResolutionRate = 0;
    if (ticketStatsRes.status === "fulfilled") {
      const tStats = ticketStatsRes.value?.data?.data || ticketStatsRes.value?.data || {};
      const totalTickets = Number(tStats.total ?? tStats.totalTickets ?? 0);
      const resolvedTickets = Number(
        tStats.resolved ??
          tStats.closed ??
          Number(tStats.answered ?? 0) + Number(tStats.closed ?? 0)
      );
      if (typeof tStats.resolutionRate === "number") {
        ticketResolutionRate = Number(tStats.resolutionRate.toFixed(1));
      } else if (totalTickets > 0) {
        ticketResolutionRate = Number(((resolvedTickets / totalTickets) * 100).toFixed(1));
      }
    }

    let gamecenterPerformance = rawTopCenters.map((c: any) => {
      const totalRes = Number(c.reservationsCount ?? c.totalReservations ?? 0);
      const completedRes = Number(c.completedReservations ?? totalRes);
      const completionRate =
        typeof c.completionRate === "number"
          ? c.completionRate
          : totalRes > 0
            ? Math.round((completedRes / totalRes) * 100)
            : 0;

      const cityVal =
        typeof c.city === "string"
          ? c.city
          : c.city && typeof c.city === "object"
            ? String(c.city.name || c.city.title || "-")
            : "-";

      return {
        gamecenterId: String(c.id ?? c.gamingCenterId ?? ""),
        gamecenterName: String(c.name ?? c.gamingCenterName ?? "-"),
        city: cityVal,
        reservationsCount: totalRes,
        totalAmount: Number(c.revenue ?? c.totalAmount ?? 0),
        completionRate,
        rating: Number(c.rating ?? c.raiting ?? 0),
      };
    });

    if (city && city !== "all") {
      gamecenterPerformance = gamecenterPerformance.filter(
        (g: { city: string }) => g.city === city
      );
    }

    return {
      timePeriodLabel: periodLabel,
      kpis: {
        totalReservations: {
          current: totalReservationsCurrent,
          previous: totalReservationsPrev,
          changePercent: calcChangePercent(totalReservationsCurrent, totalReservationsPrev),
        },
        grossAmount: {
          current: grossCurrent,
          previous: grossPrev,
          changePercent: calcChangePercent(grossCurrent, grossPrev),
        },
        completedAmount: {
          current: completedCurrent,
          previous: completedPrev,
          changePercent: calcChangePercent(completedCurrent, completedPrev),
        },
        activeUsers: {
          current: activeUsersCurrent,
          previous: activeUsersPrev,
          changePercent: calcChangePercent(activeUsersCurrent, activeUsersPrev),
        },
        ticketResolutionRate: {
          current: ticketResolutionRate,
          previous: 0,
          changePercent: 0,
        },
      },
      trendData,
      gamecenterPerformance,
      forecast: {
        isAvailable: false,
        unavailableReason:
          "مدل پیش‌بینی خودکار تنها زمانی فعال می‌شود که داده‌های تاریخی کافی توسط سرور ارائه شود.",
      },
    };
  },
};
