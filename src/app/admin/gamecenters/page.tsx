"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminDataTable, Column } from "@/components/admin/AdminDataTable";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { GamecenterFormModal } from "@/components/admin/gamecenters/GamecenterFormModal";
import { DeleteConfirmationModal } from "@/components/admin/gamecenters/DeleteConfirmationModal";
import { AdminGamecenter } from "@/types/admin";
import { adminService } from "@/services/adminService";

export default function GamecentersAdminPage() {
  const [data, setData] = useState<AdminGamecenter[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals & Actions
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingGc, setEditingGc] = useState<AdminGamecenter | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingGc, setDeletingGc] = useState<AdminGamecenter | null>(null);
  const [deletingRelatedInfo, setDeletingRelatedInfo] = useState<{
    ticketsCount?: number;
    reviewsCount?: number;
    reservationsCount?: number;
  }>({});

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(
    null
  );

  const showFeedback = (type: "success" | "danger", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadGamecenters = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await adminService.getGamecenters({
        search,
        status: statusFilter,
        city: cityFilter,
        sortBy,
        sortOrder,
        page,
        pageSize: 10,
      });
      setData(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, cityFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    loadGamecenters();
  }, [loadGamecenters]);

  const handleToggleStatus = async (gc: AdminGamecenter) => {
    try {
      const updated = await adminService.toggleGamecenterStatus(gc.id);
      showFeedback(
        "success",
        `وضعیت گیمنت «${updated.name}» به ${updated.isActive ? "فعال" : "غیرفعال"} تغییر یافت.`
      );
      loadGamecenters();
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در تغییر وضعیت گیمنت.");
    }
  };

  const handleOpenDeleteModal = async (gc: AdminGamecenter) => {
    setDeletingGc(gc);
    try {
      const [tickets, reviews, reservations] = await Promise.all([
        adminService.getGamecenterTickets(gc.id),
        adminService.getGamecenterReviews(gc.id),
        adminService.getGamecenterReservations(gc.id),
      ]);
      setDeletingRelatedInfo({
        ticketsCount: tickets.length,
        reviewsCount: reviews.length,
        reservationsCount: reservations.length,
      });
    } catch {
      setDeletingRelatedInfo({});
    }
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingGc) return;
    await adminService.deleteGamecenter(deletingGc.id);
    showFeedback("success", `گیمنت «${deletingGc.name}» با موفقیت حذف شد.`);
    loadGamecenters();
  };

  const columns: Column<AdminGamecenter>[] = [
    {
      key: "name",
      header: "نام و اسلاگ گیمنت",
      render: (gc) => (
        <div className="flex flex-col gap-0.5">
          <Link
            href={`/admin/gamecenters/${gc.id}`}
            className="font-bold text-sm text-[var(--text-white)] hover:text-[var(--primary)] transition-colors"
          >
            {gc.name}
          </Link>
          <span className="text-xs text-[var(--text-muted)] dir-ltr text-right">{gc.slug}</span>
        </div>
      ),
    },
    {
      key: "owner",
      header: "مسئول / مالکان",
      render: (gc) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-[var(--text-white)]">{gc.ownerName}</span>
          <span className="text-xs text-[var(--text-muted)] dir-ltr text-right">{gc.ownerPhone}</span>
        </div>
      ),
    },
    {
      key: "city",
      header: "شهر و آدرس",
      render: (gc) => (
        <div className="flex flex-col gap-0.5 max-w-[200px] truncate">
          <span className="text-xs font-bold text-[var(--primary)]">{gc.city}</span>
          <span className="text-xs text-[var(--text-muted)] truncate" title={gc.address}>
            {gc.address}
          </span>
        </div>
      ),
    },
    {
      key: "rating",
      header: "امتیاز",
      render: (gc) => (
        <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--accent-star)]">
          <Icon name="star" size={14} />
          <span>{gc.rating ?? "۴.۵"}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      render: (gc) => (
        <button
          type="button"
          onClick={() => handleToggleStatus(gc)}
          title="جهت تغییر سریع وضعیت کلیک کنید"
          className="focus:outline-none cursor-pointer"
        >
          {gc.isActive ? (
            <Badge variant="success">فعال</Badge>
          ) : (
            <Badge variant="danger">غیرفعال</Badge>
          )}
        </button>
      ),
    },
    {
      key: "actions",
      header: "عملیات",
      className: "text-left",
      render: (gc) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/admin/gamecenters/${gc.id}`}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--foreground)]/40 transition-colors"
            title="مشاهده جزئیات کامل"
          >
            <Icon name="info" size={18} />
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditingGc(gc);
              setIsFormModalOpen(true);
            }}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] hover:bg-[var(--foreground)]/40 transition-colors"
            title="ویرایش گیمنت"
          >
            <Icon name="user" size={18} />
          </button>
          <Link
            href={`/admin/tickets?gamecenterId=${gc.id}`}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-warning)] hover:bg-[var(--foreground)]/40 transition-colors"
            title="تیکت‌های مرتبط"
          >
            <Icon name="ticket" size={18} />
          </Link>
          <button
            type="button"
            onClick={() => handleOpenDeleteModal(gc)}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:bg-[var(--foreground)]/40 transition-colors"
            title="حذف گیمنت"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminPageContainer>
      <div className="flex flex-col gap-6 w-full">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-page-title text-[var(--text-white)]">مدیریت گیمنت‌ها</h1>
            <p className="text-secondary text-[var(--text-muted)]">
              مشاهده، ایجاد، ویرایش، تغییر وضعیت و مدیریت کامل گیمنت‌های عضو پلتفرم ({total} مرکز)
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingGc(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center gap-2 shrink-0"
          >
            <Icon name="gamepad" size={18} />
            <span>ثبت گیمنت جدید</span>
          </Button>
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

        {/* Filter Bar */}
        <AdminFilterBar
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="جستجو نام، اسلاگ، مسئول، تلفن..."
        >
          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">وضعیت:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-card)]">همه وضعیت‌ها</option>
              <option value="active" className="bg-[var(--bg-card)]">فقط فعال</option>
              <option value="inactive" className="bg-[var(--bg-card)]">فقط غیرفعال</option>
            </select>
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">شهر:</span>
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-card)]">همه شهرها</option>
              <option value="تهران" className="bg-[var(--bg-card)]">تهران</option>
              <option value="تبریز" className="bg-[var(--bg-card)]">تبریز</option>
              <option value="شیراز" className="bg-[var(--bg-card)]">شیراز</option>
              <option value="اصفهان" className="bg-[var(--bg-card)]">اصفهان</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">مرتب‌سازی:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                setSortBy(sb);
                setSortOrder(so as "asc" | "desc");
              }}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="createdAt-desc" className="bg-[var(--bg-card)]">جدیدترین</option>
              <option value="createdAt-asc" className="bg-[var(--bg-card)]">قدیمی‌ترین</option>
              <option value="name-asc" className="bg-[var(--bg-card)]">نام (الف تا ی)</option>
              <option value="rating-desc" className="bg-[var(--bg-card)]">بیشترین امتیاز</option>
            </select>
          </div>
        </AdminFilterBar>

        {/* Data Table */}
        <AdminDataTable
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={loadGamecenters}
          emptyTitle="گیمنتی یافت نشد"
          emptyDescription="با توجه به فیلترهای اعمال‌شده، هیچ گیمنتی یافت نشد."
        />

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[var(--text-muted)]">
              نمایش صفحه {page} از {totalPages} (مجموع {total} مرکز)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                قبلی
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    pNum === page
                      ? "bg-[var(--primary)] text-on-primary"
                      : "bg-[var(--foreground)]/30 text-[var(--text-muted)] hover:text-white"
                  }`}
                >
                  {pNum}
                </button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                بعدی
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <GamecenterFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={editingGc}
        onSuccess={() => {
          showFeedback(
            "success",
            editingGc ? "تغییرات گیمنت با موفقیت ثبت شد." : "گیمنت جدید با موفقیت ایجاد گردید."
          );
          loadGamecenters();
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingGc && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingGc(null);
          }}
          itemTitle={deletingGc.name}
          itemType="gamecenter"
          relatedInfo={deletingRelatedInfo}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </AdminPageContainer>
  );
}
