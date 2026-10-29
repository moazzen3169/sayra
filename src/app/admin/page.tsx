"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { adminService } from "@/services/adminService";
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
          <h1 className="text-page-title text-text-white">داشبورد مدیریتی</h1>
          <p className="text-secondary text-text-muted mt-1">
            خلاصه جامع وضعیت عملکرد سیستم، رزروها و موارد نیازمند رسیدگی
          </p>
        </div>

        <div className="flex items-center gap-2 bg-card-bg border border-border rounded-card px-3 py-1.5 self-start sm:self-auto">
          <Icon name="calendar" size={16} className="text-text-muted" />
          <span className="text-secondary text-text-muted">محدوده زمان:</span>
          <span className="text-body font-bold text-text-white">هفته جاری</span>
        </div>
      </div>

      {/* Section 2: Key Indicators */}
      <div>
        <h2 className="text-section-title text-text-white mb-4">شاخص‌های کلیدی</h2>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-28 rounded-card" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="bg-card-bg border border-border rounded-card p-6 text-center text-accent-red">
            خطا در بارگذاری اطلاعات شاخص‌های کلیدی
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {data.stats.map((stat) => (
              <AdminStatCard
                key={stat.id}
                title={stat.title}
                value={stat.value}
                unit={stat.unit}
                description={stat.description}
                iconName={stat.iconName}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section 3: Reservation Trend Summary */}
        <div className="lg:col-span-2 bg-card-bg border border-border rounded-card p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-section-title text-text-white">روند رزروهای هفته</h2>
              <p className="text-secondary text-text-muted mt-0.5">
                تعداد و مجموع مبلغ رزروها به تفکیک روزهای هفته
              </p>
            </div>
            <div className="flex items-center gap-2 text-secondary text-text-muted">
              <span className="w-3 h-3 rounded-full bg-primary" />
              <span>رزروها</span>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="h-48 w-full rounded-card" />
          ) : !data || data.reservationTrend.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-body">
              اطلاعاتی برای نمایش روند رزروها در دست نیست
            </div>
          ) : (
            <div className="space-y-3 my-2">
              {data.reservationTrend.map((point, idx) => {
                const maxCount = Math.max(...data.reservationTrend.map((p) => p.count), 1);
                const widthPercent = Math.round((point.count / maxCount) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-secondary">
                      <span className="text-text-white font-bold">{point.label}</span>
                      <span className="text-text-muted">
                        {point.count} رزرو • {formatPrice(point.amount)}
                      </span>
                    </div>
                    <div className="w-full bg-foreground/30 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-300"
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
            <h2 className="text-section-title text-text-white">نیازمند رسیدگی</h2>
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
            <div className="space-y-3 flex-1 overflow-y-auto">
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
                    <span className="text-text-subtle">{item.date}</span>
                    <Link
                      href={item.link}
                      className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <span>بررسی</span>
                      <Icon name="back" size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 5: Recent Reservations Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-section-title text-text-white">آخرین رزروها</h2>
            <p className="text-secondary text-text-muted mt-0.5">
              خلاصه رزروهای اخیر ثبت‌شده در پلتفرم
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
