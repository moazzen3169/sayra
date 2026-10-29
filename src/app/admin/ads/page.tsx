"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminDataTable, Column } from "@/components/admin/AdminDataTable";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AdRequestDetailModal } from "@/components/admin/ads/AdRequestDetailModal";
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

  const getStatusBadge = (status: AdminAdRequest["status"]) => {
    switch (status) {
      case "APPROVED":
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
          <span className="font-bold text-sm text-[var(--text-white)]">{ad.gamecenterName}</span>
          <span className="text-[11px] text-[var(--text-subtle)] dir-ltr text-right">{ad.gamecenterId}</span>
        </div>
      ),
    },
    {
      key: "ownerName",
      header: "صاحب گیمنت",
      render: (ad) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs text-[var(--text-white)]">{ad.ownerName}</span>
          <span className="text-xs text-[var(--text-muted)] dir-ltr text-right">{ad.ownerPhone}</span>
        </div>
      ),
    },
    {
      key: "title",
      header: "جزئیات درخواست تبلیغات",
      render: (ad) => (
        <div className="flex flex-col gap-0.5 max-w-[260px]">
          <span className="font-bold text-xs text-[var(--text-white)] truncate">{ad.title}</span>
          <span className="text-[11px] text-[var(--text-muted)] truncate">{ad.description}</span>
          <span className="text-[10px] text-[var(--primary)]">مدت: {ad.durationDays} روز</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "وضعیت درخواست",
      render: (ad) => getStatusBadge(ad.status),
    },
    {
      key: "submittedAt",
      header: "تاریخ ثبت",
      render: (ad) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-[var(--text-white)]">{ad.submittedAt}</span>
          {ad.updatedAt && (
            <span className="text-[10px] text-[var(--text-subtle)]">ویرایش: {ad.updatedAt}</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "عملیات",
      className: "text-left",
      render: (ad) => (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => handleOpenDetail(ad)}
            className="flex items-center gap-1.5"
          >
            <Icon name="info" size={16} />
            <span>مشاهده جزئیات و اقدام</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPageContainer>
      <div className="flex flex-col gap-6 w-full">
        {/* Header Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-page-title text-[var(--text-white)]">مدیریت درخواست‌های تبلیغات</h1>
            <p className="text-secondary text-[var(--text-muted)]">
              بررسی درخواست‌های تبلیغاتی گیمنت‌ها، بنرهای پیشنهادی، تصمیم‌گیری جهت انتشار یا لغو ({total} درخواست)
            </p>
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
          searchPlaceholder="جستجو عنوان تبلیغ، گیمنت، صاحب یا تلفن..."
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
              <option value="all" className="bg-[var(--bg-card)]">همه درخواست‌ها</option>
              <option value="PENDING" className="bg-[var(--bg-card)]">در انتظار بررسی</option>
              <option value="APPROVED" className="bg-[var(--bg-card)]">تأیید شده (فعال)</option>
              <option value="REJECTED" className="bg-[var(--bg-card)]">رد / لغو شده</option>
              <option value="EXPIRED" className="bg-[var(--bg-card)]">منقضی شده</option>
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
              <option value="submittedAt-desc" className="bg-[var(--bg-card)]">جدیدترین</option>
              <option value="submittedAt-asc" className="bg-[var(--bg-card)]">قدیمی‌ترین</option>
              <option value="title-asc" className="bg-[var(--bg-card)]">عنوان (الف تا ی)</option>
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
          showFeedback("success", "نتیجه درخواست تبلیغات با موفقیت به‌روزرسانی شد.");
          loadAdRequests();
        }}
      />
    </AdminPageContainer>
  );
}
