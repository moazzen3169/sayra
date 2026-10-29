"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { UserFormModal } from "@/components/admin/users/UserFormModal";
import { DeleteConfirmationModal } from "@/components/admin/gamecenters/DeleteConfirmationModal";
import {
  AdminUser,
  AdminTicket,
  AdminReview,
  AdminUserReservation,
} from "@/types/admin";
import { adminService } from "@/services/adminService";

export default function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const userId = resolvedParams.id;

  const [user, setUser] = useState<AdminUser | null>(null);
  const [reservations, setReservations] = useState<AdminUserReservation[]>([]);
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);

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
      const u = await adminService.getUserById(userId);
      if (!u) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setUser(u);

      const [resList, tktList, revList] = await Promise.all([
        adminService.getUserReservations(u.id),
        adminService.getUserTickets(u.id),
        adminService.getUserReviews(u.id),
      ]);

      setReservations(resList);
      setTickets(tktList);
      setReviews(revList);
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleStatus = async () => {
    if (!user) return;
    try {
      const updated = await adminService.toggleUserStatus(user.id);
      setUser(updated);
      showFeedback(
        "success",
        `وضعیت حساب کاربر به ${updated.isActive ? "فعال" : "غیرفعال"} تغییر یافت.`
      );
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در تغییر وضعیت حساب کاربر.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!user) return;
    await adminService.deleteUser(user.id);
    window.location.href = "/admin/users";
  };

  const getRoleBadge = (role: AdminUser["role"]) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="primary">مدیر سیستم</Badge>;
      case "OWNER":
        return <Badge variant="warning">صاحب گیمنت</Badge>;
      case "USER":
      default:
        return <Badge variant="neutral">کاربر عادی</Badge>;
    }
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

  if (notFound || !user) {
    return (
      <AdminPageContainer>
        <div className="flex flex-col gap-6 w-full items-center py-12">
          <EmptyState
            title="کاربر مورد نظر یافت نشد"
            description="حساب یا شناسه کاربر مورد نظر در سیستم پیدا نگردید."
          />
          <Link href="/admin/users">
            <Button variant="secondary" className="flex items-center gap-2">
              <Icon name="back" size={18} />
              <span>بازگشت به لیست کاربران</span>
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
              href="/admin/users"
              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--foreground)]/40 transition-colors"
              title="بازگشت به لیست"
            >
              <Icon name="back" size={20} />
            </Link>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-page-title text-[var(--text-white)]">{user.fullName}</h1>
                {getRoleBadge(user.role)}
                {user.isActive ? (
                  <Badge variant="success">فعال</Badge>
                ) : (
                  <Badge variant="danger">غیرفعال</Badge>
                )}
              </div>
              <span className="text-xs text-[var(--text-muted)] dir-ltr text-right">
                شناسه: {user.id}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={handleToggleStatus}>
              {user.isActive ? "غیرفعال کردن حساب" : "فعال‌سازی حساب"}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)}>
              ویرایش کاربر
            </Button>
            <Button variant="danger" size="sm" onClick={() => setIsDeleteModalOpen(true)}>
              حذف کاربر
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

        {/* Profile Details Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col gap-6">
          <h2 className="text-section-title text-[var(--text-white)] border-b border-[var(--border-subtle)] pb-3">
            اطلاعات پروفایل و حساب کاربر
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-body">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">نام و نام خانوادگی:</span>
              <span className="font-bold text-[var(--text-white)]">{user.fullName}</span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">شماره همراه:</span>
              <span className="font-bold text-[var(--text-white)] dir-ltr text-right">
                {user.phone}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">ایمیل:</span>
              <span className="font-bold text-[var(--text-white)] dir-ltr text-right">
                {user.email || "ثبت نشده"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">کد ملی:</span>
              <span className="font-bold text-[var(--text-white)] dir-ltr text-right">
                {user.nationalId || "ثبت نشده"}
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">نقش کاربر:</span>
              <div>{getRoleBadge(user.role)}</div>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-xs text-[var(--text-muted)] font-medium">تاریخ ثبت‌نام:</span>
              <span className="font-medium text-[var(--text-white)]">{user.createdAt}</span>
            </div>

            {user.updatedAt && (
              <div className="flex flex-col gap-1">
                <span className="text-xs text-[var(--text-muted)] font-medium">آخرین ویرایش:</span>
                <span className="font-medium text-[var(--text-white)]">{user.updatedAt}</span>
              </div>
            )}
          </div>
        </div>

        {/* Section: User Reservations */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Icon name="calendar" size={20} className="text-[var(--primary)]" />
              <h2 className="text-section-title text-[var(--text-white)]">
                سوابق رزروهای کاربر ({reservations.length})
              </h2>
            </div>
          </div>

          {reservations.length === 0 ? (
            <EmptyState
              title="سابقه‌ای یافت نشد"
              description="این کاربر تاکنون هیچ رزروی در پلتفرم ثبت نکرده است."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[var(--text-muted)] font-bold">
                    <th className="py-2.5 px-3">کد رزرو</th>
                    <th className="py-2.5 px-3">گیمنت</th>
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
                          href={`/admin/gamecenters/${res.gamecenterId}`}
                          className="font-bold hover:text-[var(--primary)] transition-colors"
                        >
                          {res.gamecenterName}
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

        {/* Section: User Tickets */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Icon name="ticket" size={20} className="text-[var(--primary)]" />
              <h2 className="text-section-title text-[var(--text-white)]">
                تیکت‌های ارسال‌شده کاربر ({tickets.length})
              </h2>
            </div>
          </div>

          {tickets.length === 0 ? (
            <EmptyState
              title="تیکتی ارسال نشده"
              description="این کاربر تاکنون تیکت پشتیبانی ارسال نکرده است."
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
                      مربوط به: {t.gamecenterName || "پشتیبانی عمومی"} • تاریخ: {t.createdAt}
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

        {/* Section: User Reviews */}
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
            <div className="flex items-center gap-2">
              <Icon name="star" size={20} className="text-[var(--accent-star)]" />
              <h2 className="text-section-title text-[var(--text-white)]">
                نظرات ثبت‌شده برای گیمنت‌ها ({reviews.length})
              </h2>
            </div>
          </div>

          {reviews.length === 0 ? (
            <EmptyState
              title="نظری ثبت نشده است"
              description="این کاربر تاکنون نظری برای گیمنتی ثبت نکرده است."
            />
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Link
                      href={`/admin/gamecenters/${r.gamecenterId}`}
                      className="font-bold text-xs text-[var(--primary)] hover:underline"
                    >
                      {r.gamecenterName}
                    </Link>
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
      </div>

      {/* Edit Form Modal */}
      {user && (
        <UserFormModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          initialData={user}
          onSuccess={() => {
            showFeedback("success", "اطلاعات کاربر با موفقیت ویرایش گردید.");
            loadData();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {user && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          itemTitle={user.fullName}
          itemType="user"
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
