"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { GamecenterFormModal } from "@/components/admin/gamecenters/GamecenterFormModal";
import { DeleteConfirmationModal } from "@/components/admin/gamecenters/DeleteConfirmationModal";
import {
  AdminGamecenter,
  AdminTicket,
  AdminReview,
  AdminUserReservation,
} from "@/types/admin";
import { adminService } from "@/services/adminService";

export default function GamecenterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const gamecenterId = resolvedParams.id;

  const [gc, setGc] = useState<AdminGamecenter | null>(null);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [reservations, setReservations] = useState<AdminUserReservation[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Modals & Feedback
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(
    null
  );

  const showFeedback = (type: "success" | "danger", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const item = await adminService.getGamecenterById(gamecenterId);
      if (!item) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setGc(item);

      const [tktList, revList, resList] = await Promise.all([
        adminService.getGamecenterTickets(item.id),
        adminService.getGamecenterReviews(item.id),
        adminService.getGamecenterReservations(item.id),
      ]);

      setTickets(tktList);
      setReviews(revList);
      setReservations(resList);
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [gamecenterId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async () => {
    if (!gc) return;
    try {
      const updated = await adminService.toggleGamecenterStatus(gc.id);
      setGc(updated);
      showFeedback(
        "success",
        `وضعیت مرکز به ${updated.isActive ? "فعال" : "غیرفعال"} تغییر یافت.`
      );
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در تغییر وضعیت.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!gc) return;
    await adminService.deleteGamecenter(gc.id);
    window.location.href = "/admin/gamecenters";
  };

  if (isLoading) {
    return (
      <AdminPageContainer>
        <div className="flex flex-col gap-6 w-full">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full rounded-card" />
          <Skeleton className="h-48 w-full rounded-card" />
        </div>
      </AdminPageContainer>
    );
  }

  if (notFound || !gc) {
    return (
      <AdminPageContainer>
        <div className="flex flex-col gap-6 w-full items-center py-12">
          <EmptyState
            title="گیمنت مورد نظر یافت نشد"
            description="شناسه یا اطلاعات گیمنت مورد نظر در سیستم پیدا نشد."
          />
          <Link href="/admin/gamecenters">
            <Button variant="secondary" className="flex items-center gap-2">
              <Icon name="back" size={18} />
              <span>بازگشت به لیست گیمنت‌ها</span>
            </Button>
          </Link>
        </div>
      </AdminPageContainer>
    );
  }

  return (
    <AdminPageContainer>
      <div className="flex flex-col gap-6 w-full">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/gamecenters"
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--foreground)]/40 transition-colors"
              title="بازگشت به لیست"
            >
              <Icon name="back" size={20} />
            </Link>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-page-title text-[var(--text-white)]">{gc.name}</h1>
                {gc.isActive ? (
                  <Badge variant="success">فعال</Badge>
                ) : (
                  <Badge variant="danger">غیرفعال</Badge>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)] dir-ltr text-right">
                شناسه: {gc.id} • اسلاگ: {gc.slug}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleToggleStatus}>
              {gc.isActive ? "غیرفعال کردن" : "فعال‌سازی"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)}>
              ویرایش اطلاعات
            </Button>
            <Button variant="danger" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
              حذف گیمنت
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-card text-xs font-bold flex items-center gap-2 transition-all ${
              feedback.type === "success"
                ? "bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)]"
                : "bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)]"
            }`}
          >
            <Icon name={feedback.type === "success" ? "check" : "alert"} size={18} />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Main Details Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col gap-6">
          <h2 className="text-section-title text-[var(--text-white)] border-b border-[var(--border-subtle)] pb-3">
            اطلاعات جامع گیمنت
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-body">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">مسئول / مالکان:</span>
              <span className="font-bold text-[var(--text-white)]">{gc.ownerName}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">شماره تماس مسئول:</span>
              <span className="font-bold text-[var(--text-white)] dir-ltr text-right">
                {gc.ownerPhone}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">شهر:</span>
              <span className="font-bold text-[var(--primary)]">{gc.city}</span>
            </div>

            <div className="flex flex-col gap-1 md:col-span-2">
              <span className="text-xs text-[var(--text-muted)] font-medium">آدرس کامل:</span>
              <span className="font-medium text-[var(--text-white)]">{gc.address}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">امتیاز کاربران:</span>
              <div className="flex items-center gap-1.5 font-bold text-[var(--accent-star)]">
                <Icon name="star" size={16} />
                <span>{gc.rating ?? "۴.۵"} از ۵</span>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">تعداد دستگاه‌ها:</span>
              <span className="font-bold text-[var(--text-white)]">
                {gc.stationsCount ?? 0} دستگاه ثبت شده
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">تاریخ ثبت در پلتفرم:</span>
              <span className="font-medium text-[var(--text-white)]">{gc.createdAt}</span>
            </div>

            {gc.updatedAt && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[var(--text-muted)] font-medium">آخرین بروزرسانی:</span>
                <span className="font-medium text-[var(--text-white)]">{gc.updatedAt}</span>
              </div>
            )}
          </div>

          {gc.description && (
            <div className="flex flex-col gap-1.5 pt-4 border-t border-[var(--border-subtle)]">
              <span className="text-xs text-[var(--text-muted)] font-medium">توضیحات و امکانات:</span>
              <p className="text-xs text-[var(--text-white)] leading-relaxed">{gc.description}</p>
            </div>
          )}
        </div>

        {/* Section: Connected Tickets */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Icon name="ticket" size={20} className="text-[var(--primary)]" />
              <h2 className="text-section-title text-[var(--text-white)]">
                تیکت‌های پشتیبانی مرتبط ({tickets.length})
              </h2>
            </div>
          </div>

          {tickets.length === 0 ? (
            <EmptyState
              title="تیکتی یافت نشد"
              description="تاکنون هیچ تیکت پشتیبانی برای این گیمنت ثبت نشده است."
            />
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                >
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm text-[var(--text-white)]">{t.subject}</span>
                    <span className="text-xs text-[var(--text-muted)]">
                      ارسال کننده: {t.userName || "ناشناس"} • تاریخ: {t.createdAt}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={t.status === "OPEN" ? "danger" : "neutral"}>
                      {t.status === "OPEN" ? "باز / جدید" : "در حال بررسی"}
                    </Badge>
                    <Link
                      href={`/admin/tickets?ticketId=${t.id}`}
                      className="text-xs font-bold text-[var(--primary)] hover:underline"
                    >
                      مشاهده تیکت
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Connected Reviews */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Icon name="star" size={20} className="text-[var(--accent-star)]" />
              <h2 className="text-section-title text-[var(--text-white)]">
                نظرات ثبت‌شده کاربران ({reviews.length})
              </h2>
            </div>
          </div>

          {reviews.length === 0 ? (
            <EmptyState
              title="نظری ثبت نشده است"
              description="هنوز نظری توسط کاربران برای این گیمنت ثبت نگردیده است."
            />
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-[var(--text-white)]">{r.userName}</span>
                    <div className="flex items-center gap-1 text-xs font-bold text-[var(--accent-star)]">
                      <Icon name="star" size={14} />
                      <span>{r.rating}</span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--text-white)] leading-relaxed">{r.comment}</p>
                  <span className="text-xs text-[var(--text-subtle)]">{r.createdAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section: Connected Reservations */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Icon name="calendar" size={20} className="text-[var(--primary)]" />
              <h2 className="text-section-title text-[var(--text-white)]">
                سوابق رزروهای مرکز ({reservations.length})
              </h2>
            </div>
          </div>

          {reservations.length === 0 ? (
            <EmptyState
              title="رزروی ثبت نشده است"
              description="هیچ سابقه رزروی برای این مرکز در سیستم یافت نشد."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-bold">
                    <th className="py-2.5 px-3">کد رزرو</th>
                    <th className="py-2.5 px-3">کاربر</th>
                    <th className="py-2.5 px-3">دستگاه</th>
                    <th className="py-2.5 px-3">تاریخ و سانس</th>
                    <th className="py-2.5 px-3">مبلغ</th>
                    <th className="py-2.5 px-3">وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  {reservations.map((res) => (
                    <tr key={res.id} className="hover:bg-[var(--foreground)]/10">
                      <td className="py-3 px-3 font-bold text-[var(--primary)] dir-ltr text-right">
                        #{res.reservationCode}
                      </td>
                      <td className="py-3 px-3 text-[var(--text-white)]">
                        <Link
                          href={`/admin/users/${res.userId}`}
                          className="hover:text-[var(--primary)] transition-colors"
                        >
                          کاربر #{res.userId}
                        </Link>
                      </td>
                      <td className="py-3 px-3 text-[var(--text-white)]">{res.deviceName}</td>
                      <td className="py-3 px-3 text-[var(--text-white)]">
                        {res.date} • {res.timeSlot}
                      </td>
                      <td className="py-3 px-3 font-bold text-[var(--text-white)]">
                        {res.amount.toLocaleString("fa-IR")} تومان
                      </td>
                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            res.status === "CONFIRMED" || res.status === "COMPLETED"
                              ? "success"
                              : res.status === "PENDING"
                              ? "warning"
                              : "danger"
                          }
                        >
                          {res.status === "CONFIRMED"
                            ? "تأیید شده"
                            : res.status === "COMPLETED"
                            ? "تکمیل شده"
                            : res.status === "PENDING"
                            ? "در انتظار"
                            : "لغو شده"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit Form Modal */}
      {gc && (
        <GamecenterFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialData={gc}
          onSuccess={() => {
            showFeedback("success", "تغییرات گیمنت با موفقیت ویرایش شد.");
            loadData();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {gc && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          itemTitle={gc.name}
          itemType="gamecenter"
          relatedInfo={{
            ticketsCount: tickets.length,
            reviewsCount: reviews.length,
            reservationsCount: reservations.length,
          }}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </AdminPageContainer>
  );
}
