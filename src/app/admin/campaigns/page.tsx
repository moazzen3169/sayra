"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminDataTable, Column } from "@/components/admin/AdminDataTable";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { CampaignFormWizardModal } from "@/components/admin/campaigns/CampaignFormWizardModal";
import { CampaignDetailsModal } from "@/components/admin/campaigns/CampaignDetailsModal";
import { CampaignDeleteModal } from "@/components/admin/campaigns/CampaignDeleteModal";
import { FutureFeaturesRoadmapCard } from "@/components/admin/campaigns/FutureFeaturesRoadmapCard";
import type {
  AdminCampaign,
  CampaignStatus,
  DiscountType,
  CampaignScopeType,
  TargetAudienceType,
} from "@/types/admin";
import { adminService } from "@/services/adminService";

export default function CampaignsAdminPage() {
  const [data, setData] = useState<AdminCampaign[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [discountTypeFilter, setDiscountTypeFilter] = useState("all");
  const [scopeTypeFilter, setScopeTypeFilter] = useState("all");
  const [targetAudienceFilter, setTargetAudienceFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<AdminCampaign | null>(null);

  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [viewingCampaign, setViewingCampaign] = useState<AdminCampaign | null>(null);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState<AdminCampaign | null>(null);

  // Notification feedback
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(
    null
  );

  const showFeedback = (type: "success" | "danger", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadCampaigns = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await adminService.getCampaigns({
        search,
        status: statusFilter,
        discountType: discountTypeFilter,
        scopeType: scopeTypeFilter,
        targetAudience: targetAudienceFilter,
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
  }, [
    search,
    statusFilter,
    discountTypeFilter,
    scopeTypeFilter,
    targetAudienceFilter,
    sortBy,
    sortOrder,
    page,
  ]);

  useEffect(() => {
    loadCampaigns();
  }, [loadCampaigns]);

  const handleToggleStatus = async (cmp: AdminCampaign) => {
    try {
      const updated = await adminService.toggleCampaignStatus(cmp.id);
      const newStatusText = updated.status === "ACTIVE" ? "فعال" : "غیرفعال";
      showFeedback("success", `وضعیت کمپین «${updated.title}» به ${newStatusText} تغییر یافت.`);
      loadCampaigns();
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در تغییر وضعیت کمپین.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingCampaign) return;
    try {
      await adminService.deleteCampaign(deletingCampaign.id);
      showFeedback("success", `کمپین «${deletingCampaign.title}» با موفقیت حذف گردید.`);
      loadCampaigns();
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در حذف کمپین.");
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case "ACTIVE":
        return <Badge variant="success">فعال</Badge>;
      case "INACTIVE":
        return <Badge variant="neutral">غیرفعال</Badge>;
      case "SCHEDULED":
        return <Badge variant="warning">زمان‌بندی‌شده</Badge>;
      case "EXPIRED":
        return <Badge variant="danger">منقضی‌شده</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getAudienceLabel = (aud: TargetAudienceType) => {
    switch (aud) {
      case "ALL":
        return "همه کاربران";
      case "NEW_USERS":
        return "کاربران جدید";
      case "FIRST_RESERVATION":
        return "اولین رزرو";
      case "REGULAR_CUSTOMERS":
        return "مشتریان دائمی";
      case "SPECIFIC_USERS":
        return "کاربران خاص";
      default:
        return aud;
    }
  };

  const getScopeLabel = (cmp: AdminCampaign) => {
    switch (cmp.scopeType) {
      case "GLOBAL":
        return "سراسر پلتفرم";
      case "SPECIFIC_GAMECENTERS":
        return cmp.applicableGamecenterNames?.length
          ? `${cmp.applicableGamecenterNames.length} گیمنت`
          : "گیمنت‌های مشخص";
      case "DEVICE_TYPES":
        return cmp.applicableDeviceTypes?.length
          ? cmp.applicableDeviceTypes.join("، ")
          : "انواع دستگاه";
      default:
        return cmp.scopeType;
    }
  };

  const activeCount = data.filter((c) => c.status === "ACTIVE").length;
  const totalUsages = data.reduce((acc, c) => acc + c.usedCount, 0);

  const columns: Column<AdminCampaign>[] = [
    {
      key: "title",
      header: "عنوان و کد کوپن",
      render: (cmp) => (
        <div className="flex flex-col gap-1 max-w-[240px]">
          <button
            type="button"
            onClick={() => {
              setViewingCampaign(cmp);
              setIsDetailsOpen(true);
            }}
            className="font-bold text-sm text-[var(--text-white)] hover:text-[var(--primary)] transition-colors text-right cursor-pointer truncate"
          >
            {cmp.title}
          </button>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs font-bold text-[var(--primary)] dir-ltr bg-[var(--foreground)]/40 px-1.5 py-0.5 rounded border border-[var(--border-subtle)]">
              {cmp.code}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "discount",
      header: "نوع و مقدار تخفیف",
      render: (cmp) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-bold text-xs text-[var(--text-white)]">
            {cmp.discountType === "PERCENTAGE"
              ? `${cmp.discountValue}٪`
              : `${cmp.discountValue.toLocaleString("fa-IR")} تومان`}
          </span>
          <span className="text-[11px] text-[var(--text-subtle)]">
            {cmp.maxDiscountAmount
              ? `سقف ${cmp.maxDiscountAmount.toLocaleString("fa-IR")} تومان`
              : cmp.discountType === "PERCENTAGE"
              ? "بدون سقف"
              : "مبلغ ثابت"}
          </span>
        </div>
      ),
    },
    {
      key: "targetAudience",
      header: "مخاطب هدف",
      render: (cmp) => (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-[var(--foreground)]/50 text-[var(--text-white)] border border-[var(--border-subtle)]">
          {getAudienceLabel(cmp.targetAudience)}
        </span>
      ),
    },
    {
      key: "scope",
      header: "دامنه شمول",
      render: (cmp) => (
        <span className="text-xs text-[var(--text-muted)] font-medium">
          {getScopeLabel(cmp)}
        </span>
      ),
    },
    {
      key: "dateRange",
      header: "بازه زمانی",
      render: (cmp) => (
        <div className="flex flex-col gap-0.5 text-xs text-[var(--text-muted)]">
          <span>از {cmp.startDate}</span>
          <span>تا {cmp.endDate}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      render: (cmp) => getStatusBadge(cmp.status),
    },
    {
      key: "usages",
      header: "تعداد استفاده",
      render: (cmp) => (
        <div className="flex flex-col gap-1 min-w-[100px]">
          <span className="text-xs font-bold text-[var(--text-white)]">
            {cmp.usedCount.toLocaleString("fa-IR")}{" "}
            {cmp.totalUsageLimit ? `/ ${cmp.totalUsageLimit.toLocaleString("fa-IR")}` : "بار"}
          </span>
          {cmp.totalUsageLimit && (
            <div className="w-full h-1.5 rounded-full bg-[var(--foreground)] overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((cmp.usedCount / cmp.totalUsageLimit) * 100)
                  )}%`,
                }}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "عملیات",
      className: "text-left",
      render: (cmp) => (
        <div className="flex items-center justify-end gap-1">
          {/* Quick Toggle Status */}
          <button
            type="button"
            onClick={() => handleToggleStatus(cmp)}
            className={`px-2 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
              cmp.status === "ACTIVE"
                ? "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)] hover:bg-[var(--accent-warning)]/30"
                : "bg-[var(--accent-green)]/15 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/30"
            }`}
            title={cmp.status === "ACTIVE" ? "غیرفعال‌سازی" : "فعال‌سازی"}
          >
            {cmp.status === "ACTIVE" ? "غیرفعال" : "فعال"}
          </button>

          {/* Details Modal Trigger */}
          <button
            type="button"
            onClick={() => {
              setViewingCampaign(cmp);
              setIsDetailsOpen(true);
            }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--foreground)]/40 transition-colors cursor-pointer"
            title="مشاهده جزئیات کامل"
          >
            <Icon name="info" size={18} />
          </button>

          {/* Edit Trigger */}
          <button
            type="button"
            onClick={() => {
              setEditingCampaign(cmp);
              setIsWizardOpen(true);
            }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] hover:bg-[var(--foreground)]/40 transition-colors cursor-pointer"
            title="ویرایش کمپین"
          >
            <Icon name="user" size={18} />
          </button>

          {/* Delete Trigger */}
          <button
            type="button"
            onClick={() => {
              setDeletingCampaign(cmp);
              setIsDeleteOpen(true);
            }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:bg-[var(--foreground)]/40 transition-colors cursor-pointer"
            title="حذف کمپین"
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
            <h1 className="text-page-title text-[var(--text-white)]">
              مدیریت کمپین‌ها و کدهای تخفیف
            </h1>
            <p className="text-secondary text-[var(--text-muted)]">
              تعریف کدهای تخفیف سراسری، کمپین‌های مناسبتی، انتخاب گروه مخاطبان و دامنه شمول رزروها ({total} کمپین)
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingCampaign(null);
              setIsWizardOpen(true);
            }}
            className="flex items-center gap-2 shrink-0"
          >
            <Icon name="star" size={18} />
            <span>ایجاد کمپین جدید</span>
          </Button>
        </div>

        {/* Stats Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <AdminStatCard
            title="کل کمپین‌های ثبت‌شده"
            value={total}
            unit="کمپین"
            iconName="star"
            description="مجموع تمام کمپین‌ها و کدهای تخفیف"
          />
          <AdminStatCard
            title="کمپین‌های فعال"
            value={activeCount}
            unit="کمپین فعال"
            iconName="check"
            description="کمپین‌های قابل استفاده در رزرو جاری"
          />
          <AdminStatCard
            title="مجموع دفعات استفاده"
            value={totalUsages}
            unit="بار"
            iconName="ticket"
            description="مجموع رزروهای انجام‌شده با کوپن"
          />
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
          searchPlaceholder="جستجوی عنوان کمپین، کد کوپن یا توضیحات..."
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
              <option value="ACTIVE" className="bg-[var(--bg-card)]">فعال</option>
              <option value="INACTIVE" className="bg-[var(--bg-card)]">غیرفعال</option>
              <option value="SCHEDULED" className="bg-[var(--bg-card)]">زمان‌بندی‌شده</option>
              <option value="EXPIRED" className="bg-[var(--bg-card)]">منقضی‌شده</option>
            </select>
          </div>

          {/* Discount Type Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">نوع تخفیف:</span>
            <select
              value={discountTypeFilter}
              onChange={(e) => {
                setDiscountTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-card)]">همه انواع</option>
              <option value="PERCENTAGE" className="bg-[var(--bg-card)]">درصدی (٪)</option>
              <option value="FIXED_AMOUNT" className="bg-[var(--bg-card)]">مبلغ ثابت</option>
            </select>
          </div>

          {/* Scope Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">دامنه شمول:</span>
            <select
              value={scopeTypeFilter}
              onChange={(e) => {
                setScopeTypeFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-card)]">همه دامنه‌ها</option>
              <option value="GLOBAL" className="bg-[var(--bg-card)]">سراسری</option>
              <option value="SPECIFIC_GAMECENTERS" className="bg-[var(--bg-card)]">گیمنت‌های مشخص</option>
              <option value="DEVICE_TYPES" className="bg-[var(--bg-card)]">نوع دستگاه</option>
            </select>
          </div>

          {/* Audience Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">مخاطب:</span>
            <select
              value={targetAudienceFilter}
              onChange={(e) => {
                setTargetAudienceFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-card)]">همه گروه‌ها</option>
              <option value="ALL" className="bg-[var(--bg-card)]">همه کاربران</option>
              <option value="NEW_USERS" className="bg-[var(--bg-card)]">کاربران جدید</option>
              <option value="FIRST_RESERVATION" className="bg-[var(--bg-card)]">اولین رزرو</option>
              <option value="REGULAR_CUSTOMERS" className="bg-[var(--bg-card)]">مشتریان دائمی</option>
              <option value="SPECIFIC_USERS" className="bg-[var(--bg-card)]">کاربران خاص</option>
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
              <option value="createdAt-desc" className="bg-[var(--bg-card)]">جدیدترین تاریخ ثبت</option>
              <option value="createdAt-asc" className="bg-[var(--bg-card)]">قدیمی‌ترین تاریخ ثبت</option>
              <option value="title-asc" className="bg-[var(--bg-card)]">عنوان (الف تا ی)</option>
              <option value="usedCount-desc" className="bg-[var(--bg-card)]">بیشترین میزان استفاده</option>
              <option value="discountValue-desc" className="bg-[var(--bg-card)]">بیشترین مقدار تخفیف</option>
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
          onRetry={loadCampaigns}
          emptyTitle="کمپینی یافت نشد"
          emptyDescription="با توجه به فیلترهای انتخاب‌شده، هیچ کمپین یا کد تخفیفی ثبت نشده است."
        />

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[var(--text-muted)]">
              نمایش صفحه {page} از {totalPages} (مجموع {total} کمپین)
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

        {/* Future Features Roadmap Card */}
        <FutureFeaturesRoadmapCard />
      </div>

      {/* Form Wizard Modal */}
      <CampaignFormWizardModal
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false);
          setEditingCampaign(null);
        }}
        initialData={editingCampaign}
        onSuccess={() => {
          showFeedback(
            "success",
            editingCampaign
              ? "اطلاعات کمپین با موفقیت بروزرسانی شد."
              : "کمپین تخفیف جدید با موفقیت ایجاد گردید."
          );
          loadCampaigns();
        }}
      />

      {/* Details View Modal */}
      <CampaignDetailsModal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setViewingCampaign(null);
        }}
        campaign={viewingCampaign}
        onEdit={(cmp) => {
          setEditingCampaign(cmp);
          setIsWizardOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingCampaign && (
        <CampaignDeleteModal
          isOpen={isDeleteOpen}
          onClose={() => {
            setIsDeleteOpen(false);
            setDeletingCampaign(null);
          }}
          campaignTitle={deletingCampaign.title}
          campaignCode={deletingCampaign.code}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </AdminPageContainer>
  );
}
