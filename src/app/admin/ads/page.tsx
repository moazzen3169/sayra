"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminDataTable, Column } from "@/components/admin/AdminDataTable";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AdRequestDetailModal } from "@/components/admin/ads/AdRequestDetailModal";
import { AdminCreateAdModal } from "@/components/admin/ads/AdminCreateAdModal";
import { Modal } from "@/components/ui/Modal";
import { AdminAdRequest } from "@/types/admin";
import { adminService } from "@/services/adminService";

export default function AdsAdminPage() {
  const [data, setData] = useState<AdminAdRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("submittedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modal State
  const [selectedAd, setSelectedAd] = useState<AdminAdRequest | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [removingAd, setRemovingAd] = useState<AdminAdRequest | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [quickApprovingId, setQuickApprovingId] = useState<string | null>(null);

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(null);

  const showFeedback = (type: "success" | "danger", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadAdRequests = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await adminService.getAdRequests({
        search,
        status: statusFilter,
        sortBy,
        sortOrder,
        page,
        pageSize: 10,
      });
      setData(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);

      // Refresh currently selected item if detail modal is open
      if (selectedAd) {
        const updatedItem = res.items.find((item) => item.id === selectedAd.id);
        if (updatedItem) {
          setSelectedAd(updatedItem);
        }
      }
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, sortBy, sortOrder, page, selectedAd?.id]);

  useEffect(() => {
    loadAdRequests();
  }, [loadAdRequests]);

  const handleOpenDetail = (ad: AdminAdRequest) => {
    setSelectedAd(ad);
    setIsDetailModalOpen(true);
  };

  const handleQuickApprove = async (ad: AdminAdRequest) => {
    setQuickApprovingId(ad.id);
    try {
      await adminService.updateAdRequestStatus(ad.id, "APPROVED", "تأیید سریع توسط ادمین");
      showFeedback("success", `تبلیغ «${ad.title}» با موفقیت تأیید شد.`);
      loadAdRequests();
    } catch (err: unknown) {
      showFeedback("danger", (err as Error)?.message || "خطا در تأیید تبلیغ.");
    } finally {
      setQuickApprovingId(null);
    }
  };

  const handleConfirmRemove = async () => {
    if (!removingAd) return;
    setIsRemoving(true);
    try {
      await adminService.deleteAdRequest(removingAd.id);
      showFeedback("success", `تبلیغ «${removingAd.title}» با موفقیت برداشته شد.`);
      setRemovingAd(null);
      loadAdRequests();
    } catch (err: unknown) {
      showFeedback("danger", (err as Error)?.message || "خطا در برداشتن تبلیغ.");
    } finally {
      setIsRemoving(false);
    }
  };

  const getStatusBadge = (status: AdminAdRequest["status"]) => {
    switch (status) {
      case "APPROVED":
      case "ACTIVE":
        return <Badge variant="success">تأیید شده</Badge>;
      case "REJECTED":
        return <Badge variant="danger">لغو / رد شده</Badge>;
      case "EXPIRED":
        return <Badge variant="neutral">منقضی شده</Badge>;
      case "PENDING":
      default:
        return <Badge variant="warning">در انتظار بررسی</Badge>;
    }
  };

  const columns: Column<AdminAdRequest>[] = [
    {
      key: "gamecenterName",
      header: "گیمنت",
      render: (ad) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-sm text-text-white">{ad.gamecenterName}</span>
          <span className="text-xs text-text-subtle dir-ltr text-right">{ad.gamecenterId || "-"}</span>
        </div>
      ),
    },
    {
      key: "ownerName",
      header: "صاحب گیمنت",
      render: (ad) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs text-text-white">{ad.ownerName}</span>
          <span className="text-xs text-text-muted dir-ltr text-right">{ad.ownerPhone}</span>
        </div>
      ),
    },
    {
      key: "title",
      header: "جزئیات تبلیغ",
      render: (ad) => (
        <div className="flex flex-col gap-0.5 max-w-[260px]">
          <span className="font-bold text-xs text-text-white truncate">{ad.title}</span>
          <span className="text-xs text-text-muted truncate">{ad.description || "-"}</span>
          <span className="text-xs text-primary">مدت: {ad.durationDays} روز</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      render: (ad) => getStatusBadge(ad.status),
    },
    {
      key: "submittedAt",
      header: "تاریخ ثبت",
      render: (ad) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-text-white">{ad.submittedAt}</span>
          {ad.updatedAt && (
            <span className="text-xs text-text-subtle">ویرایش: {ad.updatedAt}</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "عملیات",
      className: "text-left",
      render: (ad) => (
        <div className="flex items-center justify-end gap-1.5">
          {ad.status === "PENDING" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleQuickApprove(ad)}
              disabled={quickApprovingId === ad.id}
              className="flex items-center gap-1"
            >
              <Icon name="check" size={14} />
              <span>{quickApprovingId === ad.id ? "..." : "تأیید"}</span>
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenDetail(ad)}
            className="flex items-center gap-1"
          >
            <Icon name="info" size={14} />
            <span>جزئیات</span>
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => setRemovingAd(ad)}
            title="برداشتن دستی تبلیغ"
            className="flex items-center gap-1"
          >
            <Icon name="close" size={14} />
            <span>برداشتن</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPageContainer>
      <div className="flex flex-col gap-6 w-full">
        {/* Header Title & Create Action */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border-subtle pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-page-title text-text-white">مدیریت تبلیغات</h1>
            <p className="text-secondary text-text-muted">
              بررسی درخواست‌های تبلیغاتی، برداشتن دستی تبلیغ یا ایجاد تبلیغ تأییدشده توسط مدیر ({total} مورد)
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 shrink-0"
          >
            <Icon name="tag" size={18} />
            <span>ایجاد تبلیغ تأیید شده</span>
          </Button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-card text-xs font-bold flex items-center gap-2 transition-all ${
              feedback.type === "success"
                ? "bg-accent-green/15 border border-accent-green/30 text-accent-green"
                : "bg-accent-red/15 border border-accent-red/30 text-accent-red"
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
          searchPlaceholder="جستجو عنوان تبلیغ، گیمنت، صاحب یا تلفن..."
        >
          {/* Quick Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-card bg-foreground/30 border border-border-subtle">
            {[
              { id: "all", label: "همه" },
              { id: "PENDING", label: "در انتظار" },
              { id: "APPROVED", label: "تأیید شده" },
              { id: "ACTIVE", label: "فعال" },
              { id: "REJECTED", label: "رد شده" },
              { id: "EXPIRED", label: "منقضی" },
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
              <option value="submittedAt-desc" className="bg-card-bg">جدیدترین</option>
              <option value="submittedAt-asc" className="bg-card-bg">قدیمی‌ترین</option>
              <option value="title-asc" className="bg-card-bg">عنوان (الف تا ی)</option>
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
          onRetry={loadAdRequests}
          emptyTitle="درخواست تبلیغی یافت نشد"
          emptyDescription="با توجه به فیلترهای انتخاب‌شده، درخواستی جهت مدیریت تبلیغات وجود ندارد."
        />

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[var(--text-muted)]">
              نمایش صفحه {page} از {totalPages} (مجموع {total} درخواست)
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

      {/* Ad Detail Modal */}
      <AdRequestDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedAd(null);
        }}
        adRequest={selectedAd}
        onStatusUpdated={() => {
          showFeedback("success", "تغییرات تبلیغ با موفقیت اعمال شد.");
          loadAdRequests();
        }}
      />

      {/* Admin Create Approved Ad Modal */}
      <AdminCreateAdModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          showFeedback("success", "تبلیغ جدید با وضعیت تأیید شده ایجاد و منتشر شد.");
          loadAdRequests();
        }}
      />

      {/* Confirm Manual Removal Modal */}
      <Modal
        isOpen={Boolean(removingAd)}
        onClose={() => !isRemoving && setRemovingAd(null)}
        title="برداشتن دستی تبلیغ"
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-muted leading-relaxed">
            آیا از برداشتن و حذف کامل تبلیغ{" "}
            <span className="font-bold text-text-white">«{removingAd?.title}»</span> مطمئن هستید؟
          </p>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRemovingAd(null)}
              disabled={isRemoving}
            >
              انصراف
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={handleConfirmRemove}
              disabled={isRemoving}
            >
              {isRemoving ? "در حال برداشتن..." : "تأیید و برداشتن تبلیغ"}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminPageContainer>
  );
}
