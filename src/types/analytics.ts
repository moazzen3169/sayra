export interface KPIDefinition {
  id: string;
  title: string;
  definition: string;
  formula: string;
  source: string;
  isAvailable: boolean;
  unavailableReason?: string;
}

export const KPI_DEFINITIONS: Record<string, KPIDefinition> = {
  users_count: {
    id: "users_count",
    title: "تعداد کاربران",
    definition: "مجموع کاربران ثبت‌نام شده فعال در پلتفرم (شامل مشتریان عادی و صاحبان گیمنت)",
    formula: "Count(Users where isActive == true)",
    source: "داده‌های کاربران سیستم",
    isAvailable: true,
  },
  gamecenters_count: {
    id: "gamecenters_count",
    title: "تعداد گیمنت‌ها",
    definition: "مجموع مراکز بازی ثبت‌شده و فعال در پلتفرم سایرا",
    formula: "Count(Gamecenters where isActive == true)",
    source: "پایگاه داده مراکز بازی",
    isAvailable: true,
  },
  total_reservations: {
    id: "total_reservations",
    title: "تعداد کل رزروها",
    definition: "مجموع کلیه درخواست‌های رزرو ثبت‌شده (تکمیل‌شده، تاییدشده و لغو شده)",
    formula: "Count(Reservations)",
    source: "سیستم رزرو مرکزی",
    isAvailable: true,
  },
  completed_reservations: {
    id: "completed_reservations",
    title: "رزروهای تکمیل‌شده",
    definition: "تعداد رزروهایی که سانس بازی آن‌ها با موفقیت به پایان رسیده است",
    formula: "Count(Reservations where status == 'COMPLETED')",
    source: "سیستم رزرو مرکزی",
    isAvailable: true,
  },
  gross_booking_value: {
    id: "gross_booking_value",
    title: "مبلغ کل رزروها (ناخالص)",
    definition: "مجموع ارزش ریالی کلیه رزروهای ثبت‌شده شامل رزروهای پرداخت‌شده و در انتظار",
    formula: "Sum(Reservation.amount where paymentStatus in ['PAID', 'PENDING'])",
    source: "درگاه پرداخت و صورت‌حساب‌ها",
    isAvailable: true,
  },
  net_revenue: {
    id: "net_revenue",
    title: "درآمد خالص پلتفرم (کارمزد)",
    definition: "سهم درآمدی پلتفرم سایرا از رزروهای تکمیل‌شده (نرخ کارمزد ۱۰٪)",
    formula: "Sum(Completed_Reservation.amount) * 0.10",
    source: "محاسبه بر اساس نرخ کارمزد پلتفرم",
    isAvailable: true,
  },
  ticket_resolution_rate: {
    id: "ticket_resolution_rate",
    title: "نرخ پاسخگویی به تیکت‌ها",
    definition: "درصد تیکت‌های پشتیبانی پاسخ داده شده یا بسته شده نسبت به کل تیکت‌های دریافت شده",
    formula: "(Count(Tickets where status in ['ANSWERED', 'CLOSED']) / Count(Tickets)) * 100",
    source: "سیستم تیکتینگ پشتیبانی",
    isAvailable: true,
  },
  platform_profit: {
    id: "platform_profit",
    title: "سود خالص پلتفرم",
    definition: "سود واقعی پس از کسر هزینه‌های عملیاتی و مالی از درآمد پلتفرم",
    formula: "Net Revenue - Total Expenses",
    source: "نامشخص (عدم دسترسی به داده‌های مالی دقیق)",
    isAvailable: false,
    unavailableReason: "اطلاعات هزینه‌های سرور، پرسنلی و بازاریابی در سیستم ثبت نشده است.",
  },
  platform_expenses: {
    id: "platform_expenses",
    title: "مخارج عملیاتی",
    definition: "مجموع هزینه‌های جاری پلتفرم شامل زیرساخت، درگاه و پشتیبانی",
    formula: "Sum(Operational Expenses)",
    source: "نامشخص",
    isAvailable: false,
    unavailableReason: "اطلاعات مخارج پلتفرم قابل استنباط از مبلغ رزروها نبوده و ثبت نشده است.",
  },
};

export interface AnalyticsTrendPoint {
  date: string; // e.g., '۱۴۰۳/۰۷/۰۱'
  label: string; // e.g., 'شنبه' or 'مهر ۰۱'
  reservationsCount: number;
  grossAmount: number;
  completedAmount: number;
  newUsers: number;
  ticketsCount: number;
}

export interface AnalyticsFilterParams {
  dateRange: "7d" | "30d" | "90d" | "12m";
  gamecenterId?: string;
  city?: string;
  metric?: "reservations" | "amount" | "users" | "tickets";
}

export interface AnalyticsReportData {
  timePeriodLabel: string;
  kpis: {
    totalReservations: { current: number; previous: number; changePercent: number };
    grossAmount: { current: number; previous: number; changePercent: number };
    completedAmount: { current: number; previous: number; changePercent: number };
    activeUsers: { current: number; previous: number; changePercent: number };
    ticketResolutionRate: { current: number; previous: number; changePercent: number };
  };
  trendData: AnalyticsTrendPoint[];
  gamecenterPerformance: {
    gamecenterId: string;
    gamecenterName: string;
    city: string;
    reservationsCount: number;
    totalAmount: number;
    completionRate: number;
    rating: number;
  }[];
  forecast: {
    isAvailable: boolean;
    method?: string;
    historicalWindow?: string;
    assumptions?: string[];
    limitations?: string[];
    unavailableReason?: string;
    forecastPoints?: {
      date: string;
      label: string;
      predictedReservations: number;
      predictedAmount: number;
    }[];
  };
}
