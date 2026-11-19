"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminDataTable, Column } from "@/components/admin/AdminDataTable";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { SafeImage } from "@/components/ui/SafeImage";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { BannerSlider } from "@/components/BannerSlider";
import { AdRequestDetailModal } from "@/components/admin/ads/AdRequestDetailModal";
import { AdminCreateAdModal } from "@/components/admin/ads/AdminCreateAdModal";
import { Modal } from "@/components/ui/Modal";
import { AdminAdRequest } from "@/types/admin";
import { adminService } from "@/services/adminService";
import { PLACEHOLDERS } from "@/lib/media";
import { toPersianDigits } from "@/lib/format";

type ViewMode = "grid" | "table";

export default function AdsAdminPage() {
  const [data, setData] = useState<AdminAdRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // View & Preview State
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [showSliderPreview, setShowSliderPreview] = useState(false);

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
  const [feedback, setFeedback] = useState<{
    type: "success" | "danger";
    message: string;
  } | null>(null);

  const [reloadToken, setReloadToken] = useState(0);

  const showFeedback = (type: "success" | "danger", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000);
  };

  const loadAdRequests = useCallback(() => {
    setReloadToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const fetchAds = async () => {
      await Promise.resolve();
      if (!active || controller.signal.aborted) return;

      setIsLoading(true);
      setIsError(false);
      try {
        const res = await adminService.getAdRequests(
          {
            search,
            status: statusFilter,
            sortBy,
            sortOrder,
            page,
            pageSize: 12,
          },
          controller.signal
        );
        if (!active || controller.signal.aborted) return;

        setData(res.items);
        setTotal(res.total);
        setTotalPages(res.totalPages);

        setSelectedAd((prev) => {
          if (!prev) return prev;
          return res.items.find((item) => item.id === prev.id) ?? prev;
        });
      } catch (err: unknown) {
        if (!active || controller.signal.aborted) return;
        if ((err as { name?: string })?.name === "AbortError") return;
        setIsError(true);
      } finally {
        if (active && !controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchAds();

    return () => {
      active = false;
      controller.abort();
    };
  }, [search, statusFilter, sortBy, sortOrder, page, reloadToken]);

  const handleOpenDetail = (ad: AdminAdRequest) => {
    setSelectedAd(ad);
    setIsDetailModalOpen(true);
  };

  const handleQuickApprove = async (ad: AdminAdRequest) => {
    setQuickApprovingId(ad.id);
    try {
      await adminService.updateAdRequestStatus(
        ad.id,
        "APPROVED",
        "تأیید و انتشار توسط ادمین"
      );
      showFeedback("success", `بنر «${ad.title}» تأیید و منتشر شد.`);
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
      showFeedback("success", `بنر «${removingAd.title}» با موفقیت حذف شد.`);
      setRemovingAd(null);
      loadAdRequests();
    } catch (err: unknown) {
      showFeedback("danger", (err as Error)?.message || "خطا در حذف تبلیغ.");
    } finally {
      setIsRemoving(false);
    }
  };

  const getStatusBadge = (status: AdminAdRequest["status"]) => {
    switch (status) {
      case "APPROVED":
      case "ACTIVE":
        return <Badge variant="success">منتشرشده (فعال)</Badge>;
      case "REJECTED":
        return <Badge variant="danger">رد / لغو شده</Badge>;
      case "EXPIRED":
        return <Badge variant="neutral">منقضی شده</Badge>;
      case "PENDING":
      default:
        return <Badge variant="warning">در انتظار تأیید</Badge>;
    }
  };

  const activePreviewBanners = useMemo(() => {
    return data
      .filter(
        (ad) =>
          (ad.status === "APPROVED" || ad.status === "ACTIVE") &&
          Boolean(ad.bannerUrl)
      )
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .map((ad) => ({
        id: ad.id,
        imageUrl: ad.bannerUrl || PLACEHOLDERS.banner,
        alt: ad.title,
        href: ad.destinationUrl || undefined,
      }));
  }, [data]);

  const columns: Column<AdminAdRequest>[] = [
    {
      key: "bannerUrl",
      header: "تصویر بنر",
      render: (ad) => (
        <button
          type="button"
          onClick={() => handleOpenDetail(ad)}
          className="block w-28 aspect-[2.4/1] rounded-child overflow-hidden border border-border-subtle bg-black/50 hover:border-primary transition-colors cursor-pointer"
          title="مشاهده جزئیات بنر"
        >
          <SafeImage
            src={ad.bannerUrl}
            fallbackSrc={PLACEHOLDERS.banner}
            alt={ad.title}
            className="w-full h-full object-cover"
          />
        </button>
      ),
    },
    {
      key: "title",
      header: "عنوان و مقصد کلیک",
      render: (ad) => (
        <div className="flex flex-col gap-1 max-w-[260px]">
          <span className="font-bold text-xs text-text-white truncate">{ad.title}</span>
          {ad.description && (
            <span className="text-[11px] text-text-muted truncate">{ad.description}</span>
          )}
          <span className="text-[11px] text-primary font-mono truncate dir-ltr text-right">
            {ad.destinationUrl || "بدون لینک مقصد"}
          </span>
        </div>
      ),
    },
    {
      key: "gamecenterName",
      header: "منبع / گیمنت",
      render: (ad) =>
        ad.gamecenterName && ad.gamecenterName !== "-" ? (
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-xs text-text-white">{ad.gamecenterName}</span>
            {ad.ownerName && ad.ownerName !== "-" && (
              <span className="text-[11px] text-text-muted">{ad.ownerName}</span>
            )}
          </div>
        ) : (
          <Badge variant="neutral">بنر ادمین</Badge>
        ),
    },
    {
      key: "durationDays",
      header: "مدت و اولویت",
      render: (ad) => (
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-text-white font-medium">
            {toPersianDigits(ad.durationDays)} روز
          </span>
          {(ad.priority ?? 0) > 0 && (
            <span className="text-[11px] text-primary">
              اولویت: {toPersianDigits(ad.priority ?? 0)}
            </span>
          )}
          <span className="text-[11px] text-text-subtle">{ad.submittedAt}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      render: (ad) => getStatusBadge(ad.status),
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
              <span>{quickApprovingId === ad.id ? "..." : "تأیید و انتشار"}</span>
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
            title="حذف بنر"
            className="flex items-center gap-1"
          >
            <Icon name="trash" size={14} />
            <span>حذف</span>
          </Button>
        </div>
      ),
    },
  ];

  return (
    <AdminPageContainer>
      <div className="flex flex-col gap-6 w-full">
        {/* Header Title & Primary Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-border-subtle pb-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-page-title text-text-white">مدیریت تبلیغات و بنرها</h1>
              <Badge variant="neutral">{toPersianDigits(total)} مورد</Badge>
            </div>
            <p className="text-secondary text-text-muted">
              آپلود، زمان‌بندی و انتشار مستقیم بنرهای تبلیغاتی در اسلایدر صفحه اصلی پلتفرم
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activePreviewBanners.length > 0 && (
              <Button
                variant="secondary"
                size="md"
                onClick={() => setShowSliderPreview((prev) => !prev)}
                className="flex items-center gap-2"
              >
                <Icon name="image" size={16} />
                <span>
                  {showSliderPreview ? "بستن پیش‌نمایش اسلایدر" : "پیش‌نمایش اسلایدر"}
                </span>
              </Button>
            )}

            <Button
              variant="secondary"
              size="md"
              onClick={loadAdRequests}
              disabled={isLoading}
              className="flex items-center gap-1.5"
            >
              <span>بروزرسانی</span>
            </Button>

            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 shrink-0"
            >
              <Icon name="plus" size={18} />
              <span>افزودن و انتشار بنر جدید</span>
            </Button>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            role="status"
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

        {/* Live Homepage Slider Preview */}
        {showSliderPreview && activePreviewBanners.length > 0 && (
          <div className="rounded-card bg-card-bg border border-primary/30 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
                <span className="text-xs font-bold text-text-white">
                  پیش‌نمایش زنده اسلایدر صفحه اصلی ({toPersianDigits(activePreviewBanners.length)} بنر فعال در این صفحه)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowSliderPreview(false)}
                className="text-xs text-text-muted hover:text-text-white cursor-pointer"
              >
                بستن
              </button>
            </div>
            <BannerSlider
              banners={activePreviewBanners}
              aspectClassName="aspect-[2.4/1] sm:aspect-[3/1]"
              ariaLabel="پیش‌نمایش اسلایدر تبلیغاتی"
            />
          </div>
        )}

        {/* Filter Bar + View Switcher */}
        <AdminFilterBar
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="جستجو عنوان بنر، گیمنت یا لینک مقصد..."
        >
          {/* Quick Status Tabs */}
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-card bg-foreground/30 border border-border-subtle">
            {[
              { id: "all", label: "همه" },
              { id: "APPROVED", label: "منتشرشده" },
              { id: "ACTIVE", label: "فعال" },
              { id: "PENDING", label: "در انتظار" },
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
            <select
              aria-label="مرتب‌سازی"
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
              <option value="priority-desc" className="bg-card-bg">بالاترین اولویت</option>
              <option value="title-asc" className="bg-card-bg">عنوان (الف تا ی)</option>
            </select>
          </div>

          {/* Grid / Table View Toggle */}
          <div className="flex items-center gap-1 p-1 rounded-card bg-foreground/30 border border-border-subtle">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="نمای کارت"
              className={`px-2.5 py-1.5 rounded-child text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-primary text-on-primary"
                  : "text-text-muted hover:text-text-white"
              }`}
            >
              <Icon name="image" size={14} />
              <span>کارت</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-label="نمای جدول"
              className={`px-2.5 py-1.5 rounded-child text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === "table"
                  ? "bg-primary text-on-primary"
                  : "text-text-muted hover:text-text-white"
              }`}
            >
              <Icon name="list" size={14} />
              <span>جدول</span>
            </button>
          </div>
        </AdminFilterBar>

        {/* Content: Grid View or Table View */}
        {viewMode === "table" ? (
          <AdminDataTable
            columns={columns}
            data={data}
            keyExtractor={(item) => item.id}
            isLoading={isLoading}
            isError={isError}
            onRetry={loadAdRequests}
            emptyTitle="هیچ بنر یا درخواست تبلیغی یافت نشد"
            emptyDescription="برای انتشار اولین بنر در صفحه اصلی، روی دکمه «افزودن و انتشار بنر جدید» کلیک کنید."
          />
        ) : isError ? (
          <div className="bg-card-bg border border-border rounded-card p-6">
            <ErrorState
              description="خطا در دریافت لیست تبلیغات از سرور"
              onRetry={loadAdRequests}
            />
          </div>
        ) : isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="rounded-card bg-card-bg border border-border overflow-hidden p-3 flex flex-col gap-3"
              >
                <Skeleton className="aspect-[2.4/1] w-full rounded-child" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-9 flex-1" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="bg-card-bg border border-border rounded-card p-8 flex flex-col items-center gap-4">
            <EmptyState
              title="هیچ بنر تبلیغاتی یافت نشد"
              description="هنوز بنری با این فیلتر ثبت نشده است. می‌توانید همین الان یک بنر جدید آپلود و منتشر کنید."
            />
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Icon name="plus" size={16} />
              <span>افزودن اولین بنر</span>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {data.map((ad) => {
              const hasCenter =
                Boolean(ad.gamecenterName) && ad.gamecenterName !== "-";

              return (
                <article
                  key={ad.id}
                  className="group rounded-card bg-card-bg border border-border hover:border-primary/50 transition-all overflow-hidden flex flex-col justify-between shadow-sm"
                >
                  <div>
                    {/* Visual Banner Preview */}
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(ad)}
                      className="relative block w-full aspect-[2.4/1] bg-black/50 overflow-hidden border-b border-border-subtle cursor-pointer"
                    >
                      <SafeImage
                        src={ad.bannerUrl}
                        fallbackSrc={PLACEHOLDERS.banner}
                        alt={ad.title}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                      <div className="absolute top-2.5 right-2.5 z-10">
                        {getStatusBadge(ad.status)}
                      </div>
                      {(ad.priority ?? 0) > 0 && (
                        <span className="absolute top-2.5 left-2.5 z-10 px-2 py-0.5 rounded-full bg-black/75 border border-primary/40 text-[11px] font-bold text-primary">
                          اولویت {toPersianDigits(ad.priority ?? 0)}
                        </span>
                      )}
                    </button>

                    {/* Body Info */}
                    <div className="p-4 flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-bold text-text-white line-clamp-1">
                          {ad.title}
                        </h3>
                        <span className="text-[11px] font-medium text-text-muted shrink-0 bg-foreground/40 px-2 py-0.5 rounded-full">
                          {toPersianDigits(ad.durationDays)} روز
                        </span>
                      </div>

                      {ad.description && (
                        <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                          {ad.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                        <span className="text-text-subtle">
                          {hasCenter ? (
                            <>
                              گیمنت:{" "}
                              <strong className="text-text-white">
                                {ad.gamecenterName}
                              </strong>
                            </>
                          ) : (
                            <span className="text-text-muted">بنر مدیریتی ادمین</span>
                          )}
                        </span>
                        <span className="text-text-subtle">{ad.submittedAt}</span>
                      </div>

                      {ad.destinationUrl && (
                        <div className="px-2.5 py-1.5 rounded-child bg-body-bg/70 border border-border-subtle text-[11px] text-primary font-mono truncate dir-ltr text-right">
                          {ad.destinationUrl}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="px-4 py-3 bg-foreground/15 border-t border-border-subtle flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {ad.status === "PENDING" && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleQuickApprove(ad)}
                          disabled={quickApprovingId === ad.id}
                          className="flex items-center gap-1"
                        >
                          <Icon name="check" size={14} />
                          <span>
                            {quickApprovingId === ad.id ? "..." : "تأیید و انتشار"}
                          </span>
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
                    </div>

                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setRemovingAd(ad)}
                      aria-label={`حذف بنر ${ad.title}`}
                      className="flex items-center gap-1"
                    >
                      <Icon name="trash" size={14} />
                      <span>حذف</span>
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="text-xs text-[var(--text-muted)]">
              صفحه {toPersianDigits(page)} از {toPersianDigits(totalPages)} (مجموع{" "}
              {toPersianDigits(total)} مورد)
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
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    pNum === page
                      ? "bg-[var(--primary)] text-on-primary"
                      : "bg-[var(--foreground)]/30 text-[var(--text-muted)] hover:text-white"
                  }`}
                >
                  {toPersianDigits(pNum)}
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
          showFeedback("success", "تغییرات بنر با موفقیت اعمال شد.");
          loadAdRequests();
        }}
      />

      {/* Admin Create & Auto-Approve Ad Modal */}
      <AdminCreateAdModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          showFeedback(
            "success",
            "درخواست تبلیغ ارسال، تأیید خودکار شد و بنر در صفحه اصلی منتشر گردید."
          );
          loadAdRequests();
        }}
        onPartialCreated={() => {
          loadAdRequests();
        }}
      />

      {/* Confirm Manual Removal Modal */}
      <Modal
        isOpen={Boolean(removingAd)}
        onClose={() => !isRemoving && setRemovingAd(null)}
        title="حذف بنر تبلیغاتی"
        className="max-w-md"
      >
        <div className="flex flex-col gap-4">
          <p className="text-xs text-text-muted leading-relaxed">
            آیا از حذف کامل بنر{" "}
            <span className="font-bold text-text-white">«{removingAd?.title}»</span> از
            لیست و اسلایدر صفحه اصلی مطمئن هستید؟
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
              {isRemoving ? "در حال حذف..." : "تأیید و حذف بنر"}
            </Button>
          </div>
        </div>
      </Modal>
    </AdminPageContainer>
  );
}
