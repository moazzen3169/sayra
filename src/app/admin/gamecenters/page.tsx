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
import {
  BulkDeleteConfirmationModal,
  BulkDeleteResult,
} from "@/components/admin/BulkDeleteConfirmationModal";
import { AdminGamecenter, AdminGamecenterVerificationStatus } from "@/types/admin";
import { adminService } from "@/services/adminService";

const VERIFICATION_META: Record<
  AdminGamecenterVerificationStatus,
  { label: string; variant: "success" | "warning" | "danger" | "neutral" }
> = {
  APPROVED: { label: "تأیید شده", variant: "success" },
  PENDING: { label: "در انتظار بررسی", variant: "warning" },
  REJECTED: { label: "رد شده", variant: "danger" },
  NOT_SUBMITTED: { label: "ثبت نشده", variant: "neutral" },
};

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

  // Row-level loading states for quick toggles
  const [togglingActiveId, setTogglingActiveId] = useState<string | null>(null);
  const [togglingBookingId, setTogglingBookingId] = useState<string | null>(null);

  // Modals & Actions
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingGc, setEditingGc] = useState<AdminGamecenter | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
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
    const controller = new AbortController();
    let active = true;

    const run = async () => {
      try {
        const res = await adminService.getGamecenters(
          {
            search,
            status: statusFilter,
            city: cityFilter,
            sortBy,
            sortOrder,
            page,
            pageSize: 10,
          },
          controller.signal
        );
        if (!active) return;
        setData(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);
        setIsError(false);
      } catch {
        if (!active || controller.signal.aborted) return;
        setIsError(true);
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
      controller.abort();
    };
  }, [search, statusFilter, cityFilter, sortBy, sortOrder, page]);

  const handleToggleStatus = async (gc: AdminGamecenter) => {
    if (togglingActiveId === gc.id) return;
    setTogglingActiveId(gc.id);
    try {
      const updated = await adminService.toggleGamecenterStatus(gc.id);
      setData((prev) =>
        prev.map((item) => (item.id === gc.id ? { ...item, isActive: updated.isActive } : item))
      );
      showFeedback(
        "success",
        `وضعیت گیمنت «${gc.name}» به ${updated.isActive ? "فعال" : "غیرفعال"} تغییر یافت.`
      );
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در تغییر وضعیت گیمنت.");
    } finally {
      setTogglingActiveId(null);
    }
  };

  const handleToggleOnlineBooking = async (gc: AdminGamecenter) => {
    if (togglingBookingId === gc.id) return;
    const currentVal = gc.allowOnlineBooking ?? true;
    const nextVal = !currentVal;
    setTogglingBookingId(gc.id);
    try {
      await adminService.toggleGamecenterOnlineBooking(gc.id, nextVal);
      setData((prev) =>
        prev.map((item) => (item.id === gc.id ? { ...item, allowOnlineBooking: nextVal } : item))
      );
      showFeedback(
        "success",
        `رزرو آنلاین گیمنت «${gc.name}» ${nextVal ? "فعال" : "غیرفعال"} شد.`
      );
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در تغییر وضعیت رزرو آنلاین گیمنت.");
    } finally {
      setTogglingBookingId(null);
    }
  };

  const handleOpenDeleteModal = async (gc: AdminGamecenter) => {
    setDeletingGc(gc);
    try {
      const [tickets, reviews, reservations] = await Promise.all([
        adminService.getGamecenterTickets(gc.id),
        adminService.getGamecenterReviews(gc.slug || gc.id),
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

  const handleBulkDeleteCompleted = (result: BulkDeleteResult) => {
    if (result.total === 0) {
      showFeedback("danger", "هیچ گیمنتی برای حذف یافت نشد.");
    } else if (result.failed === 0) {
      showFeedback("success", `تمامی ${result.deleted} گیمنت با موفقیت حذف شدند.`);
    } else {
      showFeedback(
        "danger",
        `${result.deleted} گیمنت حذف شد، اما حذف ${result.failed} گیمنت با خطا مواجه شد.`
      );
    }
    setPage(1);
    loadGamecenters();
  };

  const columns: Column<AdminGamecenter>[] = [
    {
      key: "name",
      header: "نام گیمنت",
      render: (gc) => (
        <Link
          href={`/admin/gamecenters/${gc.id}`}
          className="font-bold text-sm text-[var(--text-white)] hover:text-[var(--primary)] transition-colors"
        >
          {gc.name}
        </Link>
      ),
    },
    {
      key: "owner",
      header: "نام مسئول",
      render: (gc) => (
        <span className="text-sm font-medium text-[var(--text-white)]">
          {gc.ownerName || "-"}
        </span>
      ),
    },
    {
      key: "city",
      header: "شهر گیمنت",
      render: (gc) => (
        <span className="text-sm font-medium text-[var(--text-white)]">
          {gc.city || "-"}
        </span>
      ),
    },
    {
      key: "status",
      header: "وضعیت فعال بودن",
      render: (gc) => (
        <button
          type="button"
          onClick={() => handleToggleStatus(gc)}
          disabled={togglingActiveId === gc.id}
          title="برای تغییر سریع وضعیت فعال بودن کلیک کنید"
          className="focus:outline-none cursor-pointer disabled:opacity-50"
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
      key: "verification",
      header: "وضعیت احراز هویت",
      render: (gc) => {
        const status = gc.verificationStatus ?? "NOT_SUBMITTED";
        const meta = VERIFICATION_META[status];
        return <Badge variant={meta.variant}>{meta.label}</Badge>;
      },
    },
    {
      key: "onlineBooking",
      header: "وضعیت رزرو",
      render: (gc) => {
        const bookingEnabled = gc.allowOnlineBooking ?? true;
        return (
          <button
            type="button"
            onClick={() => handleToggleOnlineBooking(gc)}
            disabled={togglingBookingId === gc.id}
            title="برای تغییر سریع وضعیت رزرو آنلاین کلیک کنید"
            className="focus:outline-none cursor-pointer disabled:opacity-50"
          >
            {bookingEnabled ? (
              <Badge variant="success">رزرو فعال</Badge>
            ) : (
              <Badge variant="danger">رزرو غیرفعال</Badge>
            )}
          </button>
        );
      },
    },
    {
      key: "actions",
      header: "عملیات",
      className: "text-left",
      render: (gc) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={() => {
              setEditingGc(gc);
              setIsFormModalOpen(true);
            }}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--foreground)]/40 transition-colors cursor-pointer"
            title="ویرایش اطلاعات"
            aria-label={`ویرایش اطلاعات ${gc.name}`}
          >
            <Icon name="edit" size={18} />
          </button>
          <Link
            href={`/admin/gamecenters/${gc.id}`}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] hover:bg-[var(--foreground)]/40 transition-colors"
            title="مشاهده تمامی اطلاعات و جزئیات"
            aria-label={`مشاهده جزئیات ${gc.name}`}
          >
            <Icon name="eye" size={18} />
          </Link>
          <button
            type="button"
            onClick={() => handleOpenDeleteModal(gc)}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors cursor-pointer"
            title="حذف گیمنت"
            aria-label={`حذف ${gc.name}`}
          >
            <Icon name="trash" size={18} />
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
              مشاهده، ویرایش و مدیریت سریع گیمنت‌های ثبت‌شده در پلتفرم ({total} مرکز)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button
              variant="danger"
              onClick={() => setIsBulkDeleteModalOpen(true)}
              disabled={isLoading || total === 0}
              className="flex items-center gap-2"
            >
              <Icon name="trash" size={18} />
              <span>حذف تمامی گیمنت‌ها</span>
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setEditingGc(null);
                setIsFormModalOpen(true);
              }}
              className="flex items-center gap-2"
            >
              <Icon name="plus" size={18} />
              <span>ثبت گیمنت جدید</span>
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

        {/* Filter Bar */}
        <AdminFilterBar
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="جستجو نام گیمنت، اسلاگ، نام مسئول یا تلفن..."
        >
          {/* Quick Status Tabs */}
          <div className="flex items-center gap-1 p-1 rounded-card bg-foreground/30 border border-border-subtle">
            {[
              { id: "all", label: "همه" },
              { id: "active", label: "فعال" },
              { id: "inactive", label: "غیرفعال" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-child text-xs font-bold transition-colors cursor-pointer ${
                  statusFilter === tab.id
                    ? "bg-primary text-on-primary"
                    : "text-text-muted hover:text-text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* City Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted font-medium">شهر:</span>
            <select
              value={cityFilter}
              onChange={(e) => {
                setCityFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-card bg-foreground/40 border border-border-subtle text-xs text-text-white outline-none focus:border-primary cursor-pointer"
            >
              <option value="all" className="bg-card-bg">همه شهرها</option>
              {Array.from(new Set(data.map((item) => item.city).filter((c) => c && c !== "-"))).map(
                (cityName) => (
                  <option key={cityName} value={cityName} className="bg-card-bg">
                    {cityName}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-text-muted font-medium">مرتب‌سازی:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                setSortBy(sb);
                setSortOrder(so as "asc" | "desc");
              }}
              className="h-10 px-3 rounded-card bg-foreground/40 border border-border-subtle text-xs text-text-white outline-none focus:border-primary cursor-pointer"
            >
              <option value="createdAt-desc" className="bg-card-bg">جدیدترین</option>
              <option value="createdAt-asc" className="bg-card-bg">قدیمی‌ترین</option>
              <option value="name-asc" className="bg-card-bg">نام (الف تا ی)</option>
              <option value="rating-desc" className="bg-card-bg">بیشترین امتیاز</option>
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

      {/* Bulk Delete Confirmation Modal */}
      <BulkDeleteConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        itemPluralLabel="گیمنت‌ها"
        totalCount={total}
        onConfirm={(onProgress) => adminService.deleteAllGamecenters(onProgress)}
        onCompleted={handleBulkDeleteCompleted}
      />
    </AdminPageContainer>
  );
}
