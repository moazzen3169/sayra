import { AnalyticsFilterParams, AnalyticsReportData } from "@/types/analytics";
import {
  MOCK_ANALYTICS_REPORT,
  MOCK_TREND_7D,
  MOCK_TREND_30D,
  MOCK_TREND_90D,
} from "@/lib/mocks/analytics.mock";

export const analyticsService = {
  /**
   * Fetch executive dashboard and analytical report data.
   * Dynamically adjusts trends, KPIs and filters based on parameters.
   */
  async getAnalyticsReport(params: AnalyticsFilterParams): Promise<AnalyticsReportData> {
    const { dateRange = "7d", gamecenterId = "all", city = "all" } = params;

    let selectedTrend = MOCK_TREND_7D;
    let periodLabel = "۷ روز گذشته";
    let isForecastAvailable = true;

    if (dateRange === "30d") {
      selectedTrend = MOCK_TREND_30D;
      periodLabel = "۳۰ روز گذشته";
    } else if (dateRange === "90d") {
      selectedTrend = MOCK_TREND_90D;
      periodLabel = "۹۰ روز گذشته";
    } else if (dateRange === "12m") {
      // For 12m, historical window is insufficient for accurate monthly prediction model
      selectedTrend = MOCK_TREND_90D;
      periodLabel = "۱۲ ماه گذشته";
      isForecastAvailable = false;
    }

    // Filter gamecenter performance list
    let filteredPerformance = [...MOCK_ANALYTICS_REPORT.gamecenterPerformance];
    if (gamecenterId && gamecenterId !== "all") {
      filteredPerformance = filteredPerformance.filter((g) => g.gamecenterId === gamecenterId);
    }
    if (city && city !== "all") {
      filteredPerformance = filteredPerformance.filter((g) => g.city === city);
    }

    // Multiply amounts/counts if a single gamecenter is selected to reflect mock subset
    const multiplier = gamecenterId !== "all" ? 0.35 : 1;

    const adjustedTrend = selectedTrend.map((pt) => ({
      ...pt,
      reservationsCount: Math.round(pt.reservationsCount * multiplier),
      grossAmount: Math.round(pt.grossAmount * multiplier),
      completedAmount: Math.round(pt.completedAmount * multiplier),
    }));

    const totalRes = adjustedTrend.reduce((acc, curr) => acc + curr.reservationsCount, 0);
    const grossAmt = adjustedTrend.reduce((acc, curr) => acc + curr.grossAmount, 0);
    const completedAmt = adjustedTrend.reduce((acc, curr) => acc + curr.completedAmount, 0);

    const report: AnalyticsReportData = {
      ...MOCK_ANALYTICS_REPORT,
      timePeriodLabel: periodLabel,
      kpis: {
        totalReservations: {
          current: totalRes,
          previous: Math.round(totalRes * 0.88),
          changePercent: 13.6,
        },
        grossAmount: {
          current: grossAmt,
          previous: Math.round(grossAmt * 0.87),
          changePercent: 14.9,
        },
        completedAmount: {
          current: completedAmt,
          previous: Math.round(completedAmt * 0.87),
          changePercent: 14.9,
        },
        activeUsers: MOCK_ANALYTICS_REPORT.kpis.activeUsers,
        ticketResolutionRate: MOCK_ANALYTICS_REPORT.kpis.ticketResolutionRate,
      },
      trendData: adjustedTrend,
      gamecenterPerformance: filteredPerformance,
      forecast: isForecastAvailable
        ? {
            ...MOCK_ANALYTICS_REPORT.forecast,
            forecastPoints: MOCK_ANALYTICS_REPORT.forecast.forecastPoints?.map((p) => ({
              ...p,
              predictedReservations: Math.round(p.predictedReservations * multiplier),
              predictedAmount: Math.round(p.predictedAmount * multiplier),
            })),
          }
        : {
            isAvailable: false,
            unavailableReason:
              "تاریخچه ۱۲ ماهه متوالی با تفکیک روزانه/هفتگی دیتابیس برای اجرای مدل پیش‌بینی در دسترس نیست. حداقل ۳ ماه تاریخچه منسجم برای فعال‌سازی پیش‌بینی سالانه مورد نیاز است.",
          },
    };

    return Promise.resolve(report);
  },
};
