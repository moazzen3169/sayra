"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import type { AdminCampaign } from "@/types/admin";

interface CampaignDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: AdminCampaign | null;
  onEdit?: (campaign: AdminCampaign) => void;
}

export const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({
  isOpen,
  onClose,
  campaign,
  onEdit,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !campaign) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(campaign.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusBadge = () => {
    switch (campaign.status) {
      case "ACTIVE":
        return <Badge variant="success">فعال</Badge>;
      case "INACTIVE":
        return <Badge variant="neutral">غیرفعال</Badge>;
      case "SCHEDULED":
        return <Badge variant="warning">زمان‌بندی‌شده</Badge>;
      case "EXPIRED":
        return <Badge variant="danger">منقضی‌شده</Badge>;
      default:
        return <Badge variant="neutral">{campaign.status}</Badge>;
    }
  };

  const getAudienceLabel = () => {
    switch (campaign.targetAudience) {
      case "ALL":
        return "همه کاربران پلتفرم";
      case "NEW_USERS":
        return "کاربران جدید ثبت‌نامی";
      case "FIRST_RESERVATION":
        return "کاربران دارای اولین رزرو";
      case "REGULAR_CUSTOMERS":
        return "مشتریان دائمی و وفادار";
      case "SPECIFIC_USERS":
        return `کاربران خاص انتخاب‌شده (${campaign.specificUserNames?.length || 0} کاربر)`;
      default:
        return campaign.targetAudience;
    }
  };

  const getScopeLabel = () => {
    switch (campaign.scopeType) {
      case "GLOBAL":
        return "همه گیمنت‌های سراسر پلتفرم";
      case "SPECIFIC_GAMECENTERS":
        return `گیمنت‌های انتخاب‌شده (${campaign.applicableGamecenterNames?.length || 0} مرکز)`;
      case "DEVICE_TYPES":
        return `انواع دستگاه (${campaign.applicableDeviceTypes?.join("، ") || "عمومی"})`;
      default:
        return campaign.scopeType;
    }
  };

  const usageRatio = campaign.totalUsageLimit
    ? Math.min(100, Math.round((campaign.usedCount / campaign.totalUsageLimit) * 100))
    : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="جزئیات کامل کمپین تخفیف"
      className="max-w-[650px] max-h-[90vh] overflow-y-auto"
    >
      <div className="flex flex-col gap-6 py-2">
        {/* Header Card */}
        <div className="p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-[var(--text-white)]">{campaign.title}</h2>
              {getStatusBadge()}
            </div>
            {campaign.description && (
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                {campaign.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-subtle)] px-3 py-2 rounded-card shrink-0">
            <span className="text-xs text-[var(--text-subtle)] font-medium">کد تخفیف:</span>
            <span className="font-mono font-bold text-sm text-[var(--primary)] dir-ltr">
              {campaign.code}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--primary)] transition-colors cursor-pointer"
              title="کپی کد تخفیف"
            >
              <Icon name={copied ? "check" : "ticket"} size={16} />
            </button>
          </div>
        </div>

        {/* Financial Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-card bg-[var(--foreground)]/10 border border-[var(--border-subtle)] flex flex-col gap-1">
            <span className="text-xs text-[var(--text-muted)]">نوع و میزان تخفیف</span>
            <span className="text-sm font-bold text-[var(--text-white)]">
              {campaign.discountType === "PERCENTAGE"
                ? `${campaign.discountValue}٪ تخفیف`
                : `${campaign.discountValue.toLocaleString("fa-IR")} تومان تخفیف ثابت`}
            </span>
          </div>

          <div className="p-3.5 rounded-card bg-[var(--foreground)]/10 border border-[var(--border-subtle)] flex flex-col gap-1">
            <span className="text-xs text-[var(--text-muted)]">سقف تخفیف ریالی</span>
            <span className="text-sm font-bold text-[var(--text-white)]">
              {campaign.maxDiscountAmount
                ? `${campaign.maxDiscountAmount.toLocaleString("fa-IR")} تومان`
                : "بدون سقف"}
            </span>
          </div>

          <div className="p-3.5 rounded-card bg-[var(--foreground)]/10 border border-[var(--border-subtle)] flex flex-col gap-1">
            <span className="text-xs text-[var(--text-muted)]">حداقل مبلغ سفارش</span>
            <span className="text-sm font-bold text-[var(--text-white)]">
              {campaign.minOrderAmount
                ? `${campaign.minOrderAmount.toLocaleString("fa-IR")} تومان`
                : "بدون حداقل"}
            </span>
          </div>

          <div className="p-3.5 rounded-card bg-[var(--foreground)]/10 border border-[var(--border-subtle)] flex flex-col gap-1">
            <span className="text-xs text-[var(--text-muted)]">سقف استفاده هر کاربر</span>
            <span className="text-sm font-bold text-[var(--text-white)]">
              {campaign.perUserUsageLimit
                ? `${campaign.perUserUsageLimit.toLocaleString("fa-IR")} بار`
                : "نامحدود"}
            </span>
          </div>
        </div>

        {/* Scope and Audience */}
        <div className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
          <span className="text-xs font-bold text-[var(--primary)]">دامنه اجرا و مخاطب هدف</span>

          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-2">
              <span className="text-[var(--text-muted)]">دامنه اجرا (شمول):</span>
              <span className="font-bold text-[var(--text-white)] text-left">{getScopeLabel()}</span>
            </div>

            {campaign.applicableGamecenterNames && campaign.applicableGamecenterNames.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-1 border-b border-[var(--border-subtle)] pb-2">
                <span className="text-[var(--text-muted)]">گیمنت‌های مشمول:</span>
                <div className="flex flex-wrap gap-1.5">
                  {campaign.applicableGamecenterNames.map((name, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-[var(--foreground)]/40 text-[var(--text-white)] border border-[var(--border-subtle)] font-medium text-[11px]"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] pb-2 pt-1">
              <span className="text-[var(--text-muted)]">گروه مخاطب هدف:</span>
              <span className="font-bold text-[var(--text-white)] text-left">{getAudienceLabel()}</span>
            </div>

            {campaign.specificUserNames && campaign.specificUserNames.length > 0 && (
              <div className="flex flex-col gap-1.5 pt-1">
                <span className="text-[var(--text-muted)]">کاربران خاص انتخاب‌شده:</span>
                <div className="flex flex-wrap gap-1.5">
                  {campaign.specificUserNames.map((uName, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-[var(--foreground)]/40 text-[var(--text-white)] border border-[var(--border-subtle)] font-medium text-[11px]"
                    >
                      {uName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Date Range & Usage Progress */}
        <div className="flex flex-col gap-3 p-4 rounded-card bg-[var(--foreground)]/20 border border-[var(--border-subtle)]">
          <span className="text-xs font-bold text-[var(--primary)]">بازه زمانی و آمار استفاده</span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)]">تاریخ شروع:</span>
              <span className="font-bold text-[var(--text-white)]">{campaign.startDate}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[var(--text-muted)]">تاریخ پایان:</span>
              <span className="font-bold text-[var(--text-white)]">{campaign.endDate}</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[var(--text-muted)]">تعداد استفاده‌شده:</span>
              <span className="font-bold text-[var(--text-white)]">
                {campaign.usedCount.toLocaleString("fa-IR")}{" "}
                {campaign.totalUsageLimit
                  ? `از ${campaign.totalUsageLimit.toLocaleString("fa-IR")}`
                  : "بار (بدون سقف کل)"}
              </span>
            </div>

            {usageRatio !== null && (
              <div className="w-full h-2 rounded-full bg-[var(--foreground)] overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    usageRatio >= 100
                      ? "bg-[var(--accent-red)]"
                      : usageRatio >= 80
                      ? "bg-[var(--accent-warning)]"
                      : "bg-[var(--primary)]"
                  }`}
                  style={{ width: `${usageRatio}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Audit Timestamps */}
        <div className="flex items-center justify-between text-[11px] text-[var(--text-subtle)] px-1">
          <span>تاریخ ایجاد: {campaign.createdAt}</span>
          {campaign.updatedAt && <span>آخرین بروزرسانی: {campaign.updatedAt}</span>}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" onClick={onClose}>
            بستن
          </Button>
          {onEdit && (
            <Button
              variant="primary"
              onClick={() => {
                onClose();
                onEdit(campaign);
              }}
              className="flex items-center gap-1.5"
            >
              <Icon name="user" size={16} />
              <span>ویرایش این کمپین</span>
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
