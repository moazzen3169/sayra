import { AnalyticsReportData, AnalyticsTrendPoint } from "@/types/analytics";

export const MOCK_TREND_7D: AnalyticsTrendPoint[] = [
  { date: "۱۴۰۳/۰۷/۰۵", label: "شنبه", reservationsCount: 32, grossAmount: 7200000, completedAmount: 6800000, newUsers: 5, ticketsCount: 2 },
  { date: "۱۴۰۳/۰۷/۰۶", label: "یکشنبه", reservationsCount: 45, grossAmount: 9800000, completedAmount: 9100000, newUsers: 8, ticketsCount: 1 },
  { date: "۱۴۰۳/۰۷/۰۷", label: "دوشنبه", reservationsCount: 38, grossAmount: 8100000, completedAmount: 7800000, newUsers: 4, ticketsCount: 3 },
  { date: "۱۴۰۳/۰۷/۰۸", label: "سه‌شنبه", reservationsCount: 52, grossAmount: 11500000, completedAmount: 10800000, newUsers: 9, ticketsCount: 2 },
  { date: "۱۴۰۳/۰۷/۰۹", label: "چهارشنبه", reservationsCount: 68, grossAmount: 15200000, completedAmount: 14500000, newUsers: 12, ticketsCount: 4 },
  { date: "۱۴۰۳/۰۷/۱۰", label: "پنجشنبه", reservationsCount: 85, grossAmount: 19800000, completedAmount: 19000000, newUsers: 18, ticketsCount: 5 },
  { date: "۱۴۰۳/۰۷/۱۱", label: "جمعه", reservationsCount: 60, grossAmount: 13800000, completedAmount: 13200000, newUsers: 10, ticketsCount: 2 },
];

export const MOCK_TREND_30D: AnalyticsTrendPoint[] = [
  { date: "۱۴۰۳/۰۶/۱۵", label: "هفته ۱", reservationsCount: 280, grossAmount: 62000000, completedAmount: 58000000, newUsers: 42, ticketsCount: 12 },
  { date: "۱۴۰۳/۰۶/۲۲", label: "هفته ۲", reservationsCount: 310, grossAmount: 69000000, completedAmount: 65000000, newUsers: 50, ticketsCount: 15 },
  { date: "۱۴۰۳/۰۶/۲۹", label: "هفته ۳", reservationsCount: 340, grossAmount: 76000000, completedAmount: 72000000, newUsers: 55, ticketsCount: 10 },
  { date: "۱۴۰۳/۰۷/۰۶", label: "هفته ۴", reservationsCount: 380, grossAmount: 85400000, completedAmount: 81200000, newUsers: 66, ticketsCount: 19 },
];

export const MOCK_TREND_90D: AnalyticsTrendPoint[] = [
  { date: "۱۴۰۳/۰۴/۰۱", label: "تیر", reservationsCount: 1100, grossAmount: 240000000, completedAmount: 228000000, newUsers: 180, ticketsCount: 45 },
  { date: "۱۴۰۳/۰۵/۰۱", label: "مرداد", reservationsCount: 1250, grossAmount: 280000000, completedAmount: 265000000, newUsers: 210, ticketsCount: 52 },
  { date: "۱۴۰۳/۰۶/۰۱", label: "شهریور", reservationsCount: 1410, grossAmount: 310000000, completedAmount: 295000000, newUsers: 245, ticketsCount: 48 },
];

export const MOCK_GAMECENTER_PERFORMANCE = [
  {
    gamecenterId: "gc-1",
    gamecenterName: "گیمنت ولکان",
    city: "تهران",
    reservationsCount: 142,
    totalAmount: 32400000,
    completionRate: 94.5,
    rating: 4.8,
  },
  {
    gamecenterId: "gc-2",
    gamecenterName: "گیمنت سایبر",
    city: "تهران",
    reservationsCount: 98,
    totalAmount: 22100000,
    completionRate: 91.0,
    rating: 4.6,
  },
  {
    gamecenterId: "gc-3",
    gamecenterName: "گیمنت اینفینیتی",
    city: "تبریز",
    reservationsCount: 75,
    totalAmount: 18500000,
    completionRate: 96.2,
    rating: 4.9,
  },
  {
    gamecenterId: "gc-4",
    gamecenterName: "گیمنت پکس",
    city: "شیراز",
    reservationsCount: 65,
    totalAmount: 12400000,
    completionRate: 88.5,
    rating: 4.5,
  },
];

export const MOCK_ANALYTICS_REPORT: AnalyticsReportData = {
  timePeriodLabel: "۷ روز گذشته",
  kpis: {
    totalReservations: { current: 380, previous: 335, changePercent: 13.4 },
    grossAmount: { current: 85400000, previous: 74200000, changePercent: 15.1 },
    completedAmount: { current: 81200000, previous: 70500000, changePercent: 15.2 },
    activeUsers: { current: 66, previous: 54, changePercent: 22.2 },
    ticketResolutionRate: { current: 88.2, previous: 81.5, changePercent: 6.7 },
  },
  trendData: MOCK_TREND_7D,
  gamecenterPerformance: MOCK_GAMECENTER_PERFORMANCE,
  forecast: {
    isAvailable: true,
    method: "میانگین متحرک وزنی ساده (Simple Weighted Moving Average)",
    historicalWindow: "۴ هفته گذشته (۲۸ روز اخیر)",
    assumptions: [
      "تداوم الگوی رفتاری کاربران در روزهای پایانی هفته (پنجشنبه و جمعه)",
      "ثابت ماندن تعداد گیمنت‌های فعال در پلتفرم",
      "عدم وقوع اختلال در درگاه پرداخت بانکی",
    ],
    limitations: [
      "پیش‌بینی بر اساس داده‌های محدود تاریخی صورت گرفته و رویدادهای غیرمنتظره یا مناسبت‌های خاص در نظر گرفته نشده‌اند.",
      "تغییرات فصلی در تعطلات مدارس و دانشگاه‌ها مدلسازی نشده است.",
    ],
    forecastPoints: [
      { date: "۱۴۰۳/۰۷/۱۲", label: "شنبه بعدی", predictedReservations: 38, predictedAmount: 8500000 },
      { date: "۱۴۰۳/۰۷/۱۳", label: "یکشنبه بعدی", predictedReservations: 48, predictedAmount: 10200000 },
      { date: "۱۴۰3/۰۷/۱۴", label: "دوشنبه بعدی", predictedReservations: 42, predictedAmount: 9100000 },
      { date: "۱۴۰۳/۰۷/۱۵", label: "سه‌شنبه بعدی", predictedReservations: 55, predictedAmount: 12000000 },
      { date: "۱۴۰۳/۰۷/۱۶", label: "چهارشنبه بعدی", predictedReservations: 72, predictedAmount: 16000000 },
      { date: "۱۴۰۳/۰۷/۱۷", label: "پنجشنبه بعدی", predictedReservations: 90, predictedAmount: 21000000 },
      { date: "۱۴۰۳/۰۷/۱۸", label: "جمعه بعدی", predictedReservations: 65, predictedAmount: 14500000 },
    ],
  },
};
