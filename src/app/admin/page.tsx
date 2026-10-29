"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminService } from "@/services/adminService";
import { KPI_DEFINITIONS } from "@/types/analytics";
import { AdminDashboardData, AdminRecentReservation } from "@/types/admin";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { AdminDataTable, Column } from "@/components/admin/AdminDataTable";
import { Badge } from "@/components/ui/Badge";
import { StatusBadge } from "@/components/StatusBadge";
import { Icon } from "@/components/ui/Icon";
import { Skeleton } from "@/components/ui/Skeleton";
import { formatPrice } from "@/lib/format";

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    adminService
      .getDashboardData()
      .then((res) => {
        setData(res);
        setIsLoading(false);
      })
      .catch(() => {
        setIsError(true);
        setIsLoading(false);
      });
  }, []);

  const reservationColumns: Column<AdminRecentReservation>[] = [
    {
      key: "reservationCode",
      header: "کد رزرو",
      render: (item) => (
        <span className="font-bold text-primary font-mono dir-ltr inline-block">
          {item.reservationCode}
        </span>
      ),
    },
    {
      key: "customerName",
      header: "کاربر",
      render: (item) => (
        <div>
          <div className="font-bold text-text-white">{item.customerName}</div>
          <div className="text-secondary text-text-muted text-xs dir-ltr inline-block">
            {item.customerPhone}
          </div>
        </div>
      ),
    },
    {
      key: "gamecenterName",
      header: "گیمنت / دستگاه",
      render: (item) => (
        <div>
          <div className="font-bold text-text-white">{item.gamecenterName}</div>
          <div className="text-secondary text-text-muted text-xs">{item.deviceName}</div>
        </div>
      ),
    },
    {
      key: "timeSlot",
      header: "زمان",
      render: (item) => (
        <div>
          <div className="text-text-white">{item.date}</div>
          <div className="text-secondary text-text-muted text-xs">{item.timeSlot}</div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "مبلغ رزرو",
      render: (item) => (
        <span className="font-bold text-text-white">
          {formatPrice(item.amount)}
        </span>
      ),
    },
    {
      key: "status",
      header: "وضعیت رزرو",
      render: (item) => <StatusBadge status={item.status} />,
    },
    {
      key: "paymentStatus",
      header: "پرداخت",
      render: (item) => {
        const variants: Record<string, "success" | "warning" | "danger" | "neutral"> = {
          PAID: "success",
          PENDING: "warning",
          REFUNDED: "neutral",
          UNPAID: "danger",
        };
        const labels: Record<string, string> = {
          PAID: "پرداخت شده",
          PENDING: "در انتظار پرداخت",
          REFUNDED: "مسترد شده",
          UNPAID: "پرداخت نشده",
        };
        return (
          <Badge variant={variants[item.paymentStatus] || "neutral"}>
            {labels[item.paymentStatus] || item.paymentStatus}
          </Badge>
        );
      },
    },
  ];

  return (
    <AdminPageContainer>
      {/* Section 1: Header and Time Horizon */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border-subtle pb-4">
        <div>
          <h1 className="text-page-title text-text-white">داشبورد مدیریتی و پایش عملیات</h1>
          <p className="text-secondary text-text-muted mt-1">
            پاسخ سریع به وضعیت فعلی کسب‌وکار، سلامت پلتفرم و موارد نیازمند اقدام فوری
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card-bg border border-border rounded-card px-3 py-1.5 self-start sm:self-auto">
          <Icon name="calendar" size={16} className="text-text-muted" />
          <span className="text-secondary text-text-muted">محدوده زمانی:</span>
          <span className="text-body font-bold text-text-white">هفته جاری (۷ روز اخیر)</span>
        </div>
      </div>

      {/* Section 2: Key Indicators */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-section-title text-text-white">شاخص‌های کلیدی وضعیت آنلاین</h2>
          <Link
            href="/admin/reports"
            className="text-xs text-primary hover:underline font-bold inline-flex items-center gap-1"
          >
            <span>مشاهده گزارش‌های تفصیلی</span>
            <Icon name="back" size={12} />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32 rounded-card" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="bg-card-bg border border-border rounded-card p-6 text-center text-accent-red">
            خطا در بارگذاری اطلاعات شاخص‌های کلیدی
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {data.stats.map((stat) => {
              const def = KPI_DEFINITIONS[stat.id];
              return (
                <AdminStatCard
                  key={stat.id}
                  title={stat.title}
                  value={stat.value}
                  unit={stat.unit}
                  description={stat.description || def?.definition}
                  definitionFormula={def?.formula}
                  isAvailable={def ? def.isAvailable : true}
                  unavailableReason={def?.unavailableReason}
                  iconName={stat.iconName}
                />
              );
            })}
            {/* Explicit Unavailable Financial Metric Showcase (Profits & Expenses) */}
            <AdminStatCard
              title={KPI_DEFINITIONS.platform_profit.title}
              value="---"
              isAvailable={KPI_DEFINITIONS.platform_profit.isAvailable}
              unavailableReason={KPI_DEFINITIONS.platform_profit.unavailableReason}
              iconName="wallet"
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 3: Reservation Trend Summary */}
        <div className="lg:col-span-2 bg-card-bg border border-border rounded-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-section-title text-text-white">روند عملیاتی رزروها و گردش مالی هفته</h2>
              <p className="text-secondary text-text-muted mt-0.5">
                تعداد و مجموع مبلغ رزروها (تکمیل‌شده و در انتظار) به تفکیک روزهای هفته
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-text-muted">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-primary" />
                <span>تعداد رزرو</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-56 w-full rounded-card" />
          ) : !data || data.reservationTrend.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-body">
              اطلاعاتی برای نمایش روند رزروها در دست نیست
            </div>
          ) : (
            <div className="space-y-3.5 my-2">
              {data.reservationTrend.map((point, idx) => {
                const maxCount = Math.max(...data.reservationTrend.map((p) => p.count), 1);
                const widthPercent = Math.round((point.count / maxCount) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-text-white font-bold">{point.label}</span>
                      <span className="text-text-muted font-mono">
                        {point.count} رزرو • {formatPrice(point.amount)}
                      </span>
                    </div>
                    <div className="w-full bg-foreground/30 h-3 rounded-full overflow-hidden p-0.5 border border-border-subtle/30">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 4: Items Requiring Attention */}
        <div className="bg-card-bg border border-border rounded-card p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b border-border-subtle pb-3">
            <div>
              <h2 className="text-section-title text-text-white">عملیات نیازمند توجه فوری</h2>
              <p className="text-xs text-text-subtle mt-0.5">درخواست‌های معوق و تیکت‌های منتظر پاسخ</p>
            </div>
            <Badge variant="warning">{data?.pendingItems.length || 0} مورد</Badge>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 rounded-card" />
              ))}
            </div>
          ) : !data || data.pendingItems.length === 0 ? (
            <div className="py-8 text-center text-text-muted text-body">
              هیچ مورد معوقه‌ای برای رسیدگی وجود ندارد
            </div>
          ) : (
            <div className="space-y-3 flex-1 overflow-y-auto max-h-[320px] pr-1">
              {data.pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-foreground/20 border border-border-subtle rounded-card hover:border-border transition-colors flex flex-col justify-between gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-card-title text-text-white line-clamp-1">
                      {item.title}
                    </h3>
                    <Badge variant={item.badgeVariant || "warning"}>
                      {item.badgeText}
                    </Badge>
                  </div>
                  <p className="text-secondary text-text-muted text-xs line-clamp-1">
                    {item.subtitle}
                  </p>
                  <div className="flex items-center justify-between pt-1 border-t border-border-subtle/50 text-xs">
                    <span className="text-text-subtle font-mono">{item.date}</span>
                    <Link
                      href={item.link}
                      className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <span>بررسی و اقدام</span>
                      <Icon name="back" size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 5: Quick Access Links */}
      <div className="bg-card-bg border border-border rounded-card p-5">
        <h2 className="text-section-title text-text-white mb-3">دسترسی سریع به بخش‌های مدیریتی</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: "مدیریت گیمنت‌ها", icon: "gamepad", href: "/admin/gamecenters" },
            { label: "احراز هویت مالکین", icon: "user", href: "/admin/owners" },
            { label: "تیکت‌های پشتیبانی", icon: "ticket", href: "/admin/tickets" },
            { label: "کاربران سیستم", icon: "user", href: "/admin/users" },
            { label: "کمپین و تخفیف‌ها", icon: "star", href: "/admin/campaigns" },
            { label: "گزارش‌های جامع", icon: "calendar", href: "/admin/reports" },
          ].map((link, i) => (
            <Link
              key={i}
              href={link.href}
              className="flex items-center gap-2 p-3 rounded-card bg-foreground/20 border border-border-subtle hover:border-primary hover:bg-foreground/40 transition-colors text-text-white text-xs font-bold"
            >
              <Icon name={link.icon as any} size={16} className="text-primary shrink-0" />
              <span className="truncate">{link.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Section 6: Recent Reservations Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-section-title text-text-white">آخرین رزروهای ثبت‌شده</h2>
            <p className="text-secondary text-text-muted mt-0.5">
              لیست لحظه‌ای از رزروهای ورودی کاربران
            </p>
          </div>
        </div>

        <AdminDataTable
          columns={reservationColumns}
          data={data?.recentReservations || []}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="خطا در بارگذاری جدول آخرین رزروها"
          emptyTitle="هیچ رزروی یافت نشد"
          emptyDescription="تاکنون رزروی در سیستم ثبت نشده است."
        />
      </div>
    </AdminPageContainer>
  );
}
