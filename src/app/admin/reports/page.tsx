"use client";

import React, { useEffect, useState } from "react";
import { analyticsService } from "@/services/analyticsService";
import { KPI_DEFINITIONS, AnalyticsReportData, AnalyticsFilterParams } from "@/types/analytics";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AnalyticsChart } from "@/components/admin/AnalyticsChart";
import { AdminDataTable, Column } from "@/components/admin/AdminDataTable";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/lib/format";

export default function ReportsAdminPage() {
  const [data, setData] = useState<AnalyticsReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState<AnalyticsFilterParams["dateRange"]>("7d");
  const [selectedMetric, setSelectedMetric] = useState<"reservations" | "amount">("amount");
  const [selectedCity, setSelectedCity] = useState("all");

  useEffect(() => {
    setIsLoading(true);
    analyticsService
      .getAnalyticsReport({
        dateRange,
        metric: selectedMetric,
        city: selectedCity,
      })
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch(() => {
        setIsError(true);
        setIsLoading(false);
      });
  }, [dateRange, selectedMetric, selectedCity]);

  const performanceColumns: Column<AnalyticsReportData["gamecenterPerformance"][0]>[] = [
    {
      key: "gamecenterName",
      header: "نام گیمنت",
      render: (item) => (
        <span className="font-bold text-text-white">{item.gamecenterName}</span>
      ),
    },
    {
      key: "city",
      header: "شهر",
      render: (item) => <span className="text-text-muted">{item.city}</span>,
    },
    {
      key: "reservationsCount",
      header: "تعداد رزرو",
      render: (item) => (
        <span className="font-mono text-text-white">{item.reservationsCount}</span>
      ),
    },
    {
      key: "totalAmount",
      header: "مبلغ رزروها",
      render: (item) => (
        <span className="font-bold font-mono text-text-white">
          {formatPrice(item.totalAmount)}
        </span>
      ),
    },
    {
      key: "completionRate",
      header: "نرخ تکمیل",
      render: (item) => (
        <span className="font-mono text-accent-green font-bold">
          {item.completionRate}%
        </span>
      ),
    },
    {
      key: "rating",
      header: "امتیاز",
      render: (item) => (
        <div className="flex items-center gap-1 text-warning font-bold font-mono">
          <span>{item.rating}</span>
          <Icon name="star" size={12} />
        </div>
      ),
    },
  ];

  return (
    <AdminPageContainer>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-page-title text-text-white">گزارش‌ها و تحلیل جامع عملکرد</h1>
          <p className="text-secondary text-text-muted mt-1">
            تحلیل تغییرات عملکرد در طول زمان، مقایسه دوره‌ها و تفکیک درآمد و عملکرد گیمنت‌ها
          </p>
        </div>

        {/* Global Filter Bar */}
        <div className="flex flex-wrap items-center gap-2 bg-card-bg border border-border rounded-card p-2">
          {/* Date Range Selector */}
          <div className="flex items-center gap-1 border-l border-border-subtle pl-2">
            <span className="text-xs text-text-muted ml-1">بازه:</span>
            {[
              { id: "7d", label: "۷ روز" },
              { id: "30d", label: "۳۰ روز" },
              { id: "90d", label: "۹۰ روز" },
              { id: "12m", label: "۱۲ ماه" },
            ].map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setDateRange(b.id as any)}
                className={`px-2.5 py-1 text-xs rounded transition-colors font-bold ${
                  dateRange === b.id
                    ? "bg-primary text-primary-text"
                    : "text-text-muted hover:text-text-white hover:bg-foreground/20"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>

          {/* City Filter Selector */}
          <div className="flex items-center gap-1 pr-1">
            <span className="text-xs text-text-muted ml-1">شهر:</span>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="bg-foreground/30 border border-border-subtle text-text-white text-xs rounded px-2 py-1 focus:outline-none focus:border-primary"
            >
              <option value="all">همه شهرها</option>
              <option value="تهران">تهران</option>
              <option value="تبریز">تبریز</option>
              <option value="شیراز">شیراز</option>
            </select>
          </div>
        </div>
      </div>

      {/* Comparative KPI Cards */}
      <div>
        <h2 className="text-section-title text-text-white mb-4">
          شاخص‌های کلیدی عملکرد ({data?.timePeriodLabel || "دوره انتخاب‌شده"})
        </h2>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-card" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="bg-card-bg border border-border rounded-card p-6 text-center text-accent-red">
            خطا در بارگذاری گزارش‌های تحلیلی
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <AdminStatCard
              title={KPI_DEFINITIONS.total_reservations.title}
              value={data.kpis.totalReservations.current}
              unit="رزرو"
              description={KPI_DEFINITIONS.total_reservations.definition}
              definitionFormula={KPI_DEFINITIONS.total_reservations.formula}
              changePercent={data.kpis.totalReservations.changePercent}
              changeLabel="دوره قبل"
              iconName="calendar"
            />
            <AdminStatCard
              title={KPI_DEFINITIONS.gross_booking_value.title}
              value={formatPrice(data.kpis.grossAmount.current)}
              description={KPI_DEFINITIONS.gross_booking_value.definition}
              definitionFormula={KPI_DEFINITIONS.gross_booking_value.formula}
              changePercent={data.kpis.grossAmount.changePercent}
              changeLabel="دوره قبل"
              iconName="wallet"
            />
            <AdminStatCard
              title={KPI_DEFINITIONS.completed_reservations.title}
              value={formatPrice(data.kpis.completedAmount.current)}
              description={KPI_DEFINITIONS.completed_reservations.definition}
              definitionFormula={KPI_DEFINITIONS.completed_reservations.formula}
              changePercent={data.kpis.completedAmount.changePercent}
              changeLabel="دوره قبل"
              iconName="wallet"
            />
            <AdminStatCard
              title={KPI_DEFINITIONS.ticket_resolution_rate.title}
              value={`${data.kpis.ticketResolutionRate.current}%`}
              description={KPI_DEFINITIONS.ticket_resolution_rate.definition}
              definitionFormula={KPI_DEFINITIONS.ticket_resolution_rate.formula}
              changePercent={data.kpis.ticketResolutionRate.changePercent}
              changeLabel="دوره قبل"
              iconName="ticket"
            />
          </div>
        )}
      </div>

      {/* Main Analytical Chart & Metric Switcher */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h2 className="text-section-title text-text-white">تحلیل روند تاریخی شاخص‌ها</h2>
          <div className="flex items-center gap-1 bg-card-bg border border-border rounded-card p-1 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedMetric("amount")}
              className={`px-3 py-1 text-xs rounded font-bold transition-colors ${
                selectedMetric === "amount"
                  ? "bg-primary text-primary-text"
                  : "text-text-muted hover:text-text-white"
              }`}
            >
              ارزش مالی (تومان)
            </button>
            <button
              type="button"
              onClick={() => setSelectedMetric("reservations")}
              className={`px-3 py-1 text-xs rounded font-bold transition-colors ${
                selectedMetric === "reservations"
                  ? "bg-primary text-primary-text"
                  : "text-text-muted hover:text-text-white"
              }`}
            >
              تعداد رزروها
            </button>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-80 w-full rounded-card" />
        ) : !data ? null : (
          <AnalyticsChart
            title={
              selectedMetric === "amount"
                ? "روند درآمد ناخالص و رزروهای تکمیل‌شده"
                : "روند حجم رزروهای ثبت‌شده"
            }
            subtitle={
              selectedMetric === "amount"
                ? "مقایسه کل ارزش رزروها با رزروهای قطعی پرداخت‌شده در طول زمان"
                : "تغییرات تعداد رزروهای ثبت شده در بازه زمانی انتخاب‌شده"
            }
            unit={selectedMetric === "amount" ? "تومان" : "فقره رزرو"}
            timePeriod={data.timePeriodLabel}
            isCurrency={selectedMetric === "amount"}
            guideText={
              selectedMetric === "amount"
                ? "رنگ اصلی نشان‌دهنده مجموع ارزش سفارش‌ها و لایه دوم نشان‌دهنده ارزش رزروهای تکمیل‌شده است."
                : "طول میله نمایانگر تعداد کل رزروهای وارد شده به سیستم در آن نقطه زمانی است."
            }
            data={data.trendData.map((pt) => ({
              label: pt.label,
              value: selectedMetric === "amount" ? pt.grossAmount : pt.reservationsCount,
              secondaryValue:
                selectedMetric === "amount" ? pt.completedAmount : undefined,
              date: pt.date,
            }))}
          />
        )}
      </div>

      {/* Section 5: Forecasting Module */}
      <div className="bg-card-bg border border-border rounded-card p-5">
        <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-section-title text-text-white">پیش‌بینی تخمینی آینده (Forecasting)</h2>
            <span className="text-xs bg-accent-blue/10 text-accent-blue border border-accent-blue/20 px-2 py-0.5 rounded font-bold">
              مدل آماری پیش‌بینی
            </span>
          </div>
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full rounded-card" />
        ) : !data || !data.forecast.isAvailable ? (
          <div className="bg-foreground/20 border border-border-subtle rounded-card p-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-primary-muted flex items-center justify-center text-primary mx-auto">
              <Icon name="info" size={20} />
            </div>
            <h3 className="text-text-white font-bold text-body">پیش‌بینی غیرفعال است</h3>
            <p className="text-xs text-text-subtle max-w-xl mx-auto leading-relaxed">
              {data?.forecast.unavailableReason ||
                "به دلیل عدم وجود تاریخچه زمانی کافی و قابل اتکا، سیستم از ارائه پیش‌بینی تصادفی خودداری می‌کند."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Model Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-foreground/20 p-3 rounded-card border border-border-subtle">
              <div>
                <span className="text-text-muted font-bold">روش محاسباتی:</span>{" "}
                <span className="text-text-white">{data.forecast.method}</span>
              </div>
              <div>
                <span className="text-text-muted font-bold">پنجره تاریخچه مبنا:</span>{" "}
                <span className="text-text-white">{data.forecast.historicalWindow}</span>
              </div>
            </div>

            {/* Forecast Chart */}
            <AnalyticsChart
              title="پیش‌بینی تخمینی عملکرد هفته آتی"
              subtitle="پیش‌بینی رزروها و گردش مالی بر اساس داده‌های مشاهده‌شده بدون مداخله داده‌های موهومی"
              unit="تومان"
              timePeriod="۷ روز آتی"
              isCurrency={true}
              guideText="توجه: مقادیر پیش‌بینی‌شده حاصل مدلسازی ریاضی بوده و نباید با داده‌های واقعی ثبت‌شده اشتباه گرفته شوند."
              data={
                data.forecast.forecastPoints?.map((f) => ({
                  label: f.label,
                  value: f.predictedAmount,
                  date: f.date,
                })) || []
              }
            />

            {/* Assumptions & Limitations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
              <div className="bg-foreground/10 p-3 rounded border border-border-subtle">
                <h4 className="font-bold text-text-white mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent-green" />
                  فرضیات اصلی مدل:
                </h4>
                <ul className="list-disc list-inside text-text-muted space-y-1">
                  {data.forecast.assumptions?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-foreground/10 p-3 rounded border border-border-subtle">
                <h4 className="font-bold text-text-white mb-1.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-accent-red" />
                  محدودیت‌ها و عدم قطعیت:
                </h4>
                <ul className="list-disc list-inside text-text-muted space-y-1">
                  {data.forecast.limitations?.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gamecenter Performance Breakdown Table */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-section-title text-text-white">عملکرد تفکیکی مراکز بازی (گیمنت‌ها)</h2>
            <p className="text-secondary text-text-muted mt-0.5">
              مقایسه میزان رزرو، درآمد و رضایت مشتریان به تفکیک گیمنت
            </p>
          </div>
        </div>

        <AdminDataTable
          columns={performanceColumns}
          data={data?.gamecenterPerformance || []}
          keyExtractor={(item) => item.gamecenterId}
          isLoading={isLoading}
          isError={isError}
          errorMessage="خطا در بارگذاری جدول عملکرد گیمنت‌ها"
          emptyTitle="هیچ داده‌ای یافت نشد"
          emptyDescription="گیمنتی متناسب با فیلترهای انتخابی یافت نشد."
        />
      </div>
    </AdminPageContainer>
  );
}
