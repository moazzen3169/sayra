"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { AdminAdRequest } from "@/types/admin";
import { adminService } from "@/services/adminService";

interface AdRequestDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  adRequest: AdminAdRequest | null;
  onStatusUpdated: () => void;
}

export const AdRequestDetailModal: React.FC<AdRequestDetailModalProps> = ({
  isOpen,
  onClose,
  adRequest,
  onStatusUpdated,
}) => {
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | null>(null);
  const [decisionReason, setDecisionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen || !adRequest) return null;

  const isApproved = adRequest.status === "APPROVED";
  const isRejected = adRequest.status === "REJECTED";

  const getStatusBadge = () => {
    switch (adRequest.status) {
      case "APPROVED":
        return <Badge variant="success">تأیید شده (فعال)</Badge>;
      case "REJECTED":
        return <Badge variant="danger">لغو / رد شده</Badge>;
      case "EXPIRED":
        return <Badge variant="neutral">منقضی شده</Badge>;
      case "PENDING":
      default:
        return <Badge variant="warning">در انتظار تایید</Badge>;
    }
  };

  const handleConfirmAction = async () => {
    if (!actionType) return;
    if (actionType === "REJECT" && !decisionReason.trim()) {
      setErrorMessage("لطفاً دلیل رد یا لغو درخواست تبلیغ را وارد کنید.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const newStatus = actionType === "APPROVE" ? "APPROVED" : "REJECTED";
      await adminService.updateAdRequestStatus(
        adRequest.id,
        newStatus,
        decisionReason.trim() || undefined
      );

      setActionType(null);
      setDecisionReason("");
      onStatusUpdated();
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMessage(e.message || "خطا در بروزرسانی وضعیت درخواست تبلیغ.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--foreground)]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <Icon name="tag" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-base font-bold text-[var(--text-white)]">
                  جزئیات درخواست تبلیغات
                </h2>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                گیمنت: {adRequest.gamecenterName} • کد درخواست: {adRequest.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--foreground)]/40 transition-colors"
          >
            <Icon name="close" size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-card bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold flex items-center gap-2">
              <Icon name="alert" size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Gaming Center & Owner Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-[var(--foreground)]/20 border border-[var(--border-subtle)] rounded-card p-4 space-y-2 text-xs">
              <span className="text-[var(--text-muted)] font-bold block border-b border-[var(--border-subtle)] pb-1.5 text-[var(--primary)]">
                اطلاعات گیمنت
              </span>
              <div className="flex justify-between pt-1">
                <span className="text-[var(--text-muted)]">نام گیمنت:</span>
                <span className="font-bold text-[var(--text-white)]">{adRequest.gamecenterName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">شناسه گیمنت:</span>
                <span className="font-bold text-[var(--text-muted)] dir-ltr">{adRequest.gamecenterId}</span>
              </div>
            </div>

            <div className="bg-[var(--foreground)]/20 border border-[var(--border-subtle)] rounded-card p-4 space-y-2 text-xs">
              <span className="text-[var(--text-muted)] font-bold block border-b border-[var(--border-subtle)] pb-1.5 text-[var(--primary)]">
                اطلاعات صاحب گیمنت
              </span>
              <div className="flex justify-between pt-1">
                <span className="text-[var(--text-muted)]">نام و نام خانوادگی:</span>
                <span className="font-bold text-[var(--text-white)]">{adRequest.ownerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">شماره تماس:</span>
                <span className="font-bold text-[var(--text-white)] dir-ltr">{adRequest.ownerPhone}</span>
              </div>
            </div>
          </div>

          {/* Ad Campaign Details */}
          <div className="bg-[var(--foreground)]/20 border border-[var(--border-subtle)] rounded-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2 text-xs font-bold text-[var(--primary)]">
              <span>مشخصات تبلیغ و بنر</span>
              <span className="text-[var(--text-white)]">مدت نمایش: {adRequest.durationDays} روز</span>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">عنوان تبلیغ:</span>
                <span className="font-bold text-sm text-[var(--text-white)]">{adRequest.title}</span>
              </div>

              <div>
                <span className="text-[var(--text-muted)] block mb-0.5">توضیحات و پیام تبلیغاتی:</span>
                <p className="p-3 rounded-card bg-[var(--bg-body)] border border-[var(--border-subtle)] text-[var(--text-white)] leading-relaxed">
                  {adRequest.description}
                </p>
              </div>

              {adRequest.bannerUrl ? (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[var(--text-muted)] block">بنر تبلیغاتی پیوست:</span>
                  <div className="relative aspect-video bg-black/50 border border-[var(--border-subtle)] rounded-card overflow-hidden flex items-center justify-center p-2">
                    {/* eslint-disable-next-html-element-for-jsx */}
                    <img
                      src={adRequest.bannerUrl}
                      alt={adRequest.title}
                      className="max-h-full max-w-full object-contain rounded"
                    />
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-card bg-[var(--bg-body)] border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] text-center">
                  بنر تصویری آپلود نشده است (فقط تبلیغ متنی).
                </div>
              )}
            </div>
          </div>

          {/* Request Status & Previous Decision Reason */}
          <div className="bg-[var(--foreground)]/20 border border-[var(--border-subtle)] rounded-card p-4 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
              <span className="font-bold text-[var(--primary)]">وضعیت درخواست</span>
              <span className="text-[var(--text-muted)]">تاریخ ثبت: {adRequest.submittedAt}</span>
            </div>

            {adRequest.decisionReason && (
              <div className="p-3 rounded-card bg-[var(--bg-body)] border border-[var(--border-subtle)] mt-2">
                <span className="font-bold text-[var(--text-white)] block mb-1">دلیل تصمیم ثبت‌شده:</span>
                <span className="text-[var(--text-muted)]">{adRequest.decisionReason}</span>
              </div>
            )}
          </div>

          {/* Action Input Box */}
          {actionType && (
            <div className="p-4 rounded-card bg-[var(--bg-body)] border border-[var(--primary)]/40 space-y-3 animate-fadeIn">
              <h4 className="text-xs font-bold text-[var(--text-white)] flex items-center gap-2">
                <Icon name={actionType === "APPROVE" ? "check" : "alert"} size={16} />
                <span>
                  {actionType === "APPROVE" ? "تأیید و انتشار تبلیغ" : "رد یا لغو درخواست تبلیغ"}
                </span>
              </h4>

              <div>
                <label className="text-xs text-[var(--text-muted)] block mb-1">
                  توضیحات یا دلیل تصمیم {actionType === "REJECT" ? "(الزامی)" : "(اختیاری)"}:
                </label>
                <textarea
                  rows={3}
                  value={decisionReason}
                  onChange={(e) => setDecisionReason(e.target.value)}
                  placeholder={
                    actionType === "APPROVE"
                      ? "توضیحات اختیاری درباره انتشار بنر..."
                      : "علت رد یا لغو تبلیغ (مانند عدم رعایت قوانین یا کیفیت نامناسب تصویر)..."
                  }
                  className="w-full p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] resize-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  variant={actionType === "APPROVE" ? "primary" : "danger"}
                  size="sm"
                  onClick={handleConfirmAction}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "در حال ثبت..." : "ثبت تصمیم"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setActionType(null);
                    setDecisionReason("");
                    setErrorMessage("");
                  }}
                  disabled={isSubmitting}
                >
                  انصراف
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--foreground)]/20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {(!isApproved || isRejected) && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setActionType("APPROVE");
                  setErrorMessage("");
                }}
                disabled={isSubmitting || actionType === "APPROVE"}
                className="flex items-center gap-1.5"
              >
                <Icon name="check" size={16} />
                <span>{isRejected ? "اصلاح به تأیید شده" : "تأیید درخواست"}</span>
              </Button>
            )}

            {(!isRejected || isApproved) && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => {
                  setActionType("REJECT");
                  setErrorMessage("");
                }}
                disabled={isSubmitting || actionType === "REJECT"}
                className="flex items-center gap-1.5"
              >
                <Icon name="close" size={16} />
                <span>{isApproved ? "لغو تبلیغ تأیید شده" : "رد درخواست"}</span>
              </Button>
            )}
          </div>

          <Button variant="secondary" size="sm" onClick={onClose}>
            بستن
          </Button>
        </div>
      </div>
    </div>
  );
};
