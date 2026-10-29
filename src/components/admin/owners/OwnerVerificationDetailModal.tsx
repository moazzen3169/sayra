"use client";

import React, { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  AdminOwnerVerification,
  AdminVerificationDocument,
} from "@/types/admin";
import { adminService } from "@/services/adminService";

interface OwnerVerificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  verification: AdminOwnerVerification | null;
  onStatusUpdated: () => void;
}

export const OwnerVerificationDetailModal: React.FC<OwnerVerificationDetailModalProps> = ({
  isOpen,
  onClose,
  verification,
  onStatusUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<"info" | "documents" | "logs">("info");
  const [actionType, setActionType] = useState<"APPROVE" | "REJECT" | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [previewDocument, setPreviewDocument] = useState<AdminVerificationDocument | null>(null);

  if (!isOpen || !verification) return null;

  const isApproved = verification.status === "APPROVED";
  const isRejected = verification.status === "REJECTED";
  const isPending = verification.status === "PENDING";

  const getStatusBadge = () => {
    switch (verification.status) {
      case "APPROVED":
        return <Badge variant="success">تأیید شده</Badge>;
      case "REJECTED":
        return <Badge variant="danger">رد شده</Badge>;
      case "PENDING":
      default:
        return <Badge variant="warning">در انتظار بررسی</Badge>;
    }
  };

  const handleConfirmAction = async () => {
    if (!actionType) return;
    if (actionType === "REJECT" && !rejectionReason.trim()) {
      setErrorMessage("لطفاً دلیل رد درخواست را وارد کنید.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const newStatus = actionType === "APPROVE" ? "APPROVED" : "REJECTED";
      await adminService.updateOwnerVerificationStatus(
        verification.id,
        newStatus,
        actionType === "REJECT" ? rejectionReason.trim() : undefined
      );

      setActionType(null);
      setRejectionReason("");
      onStatusUpdated();
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMessage(e.message || "خطا در بروزرسانی وضعیت احراز هویت.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between bg-[var(--foreground)]/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
              <Icon name="check" size={22} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-[var(--text-white)]">
                  پنل بررسی احراز هویت: {verification.gamecenterName}
                </h2>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                صاحب گیمنت: {verification.ownerName} • شماره ثبت: {verification.id}
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

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 border-b border-[var(--border-subtle)] bg-[var(--bg-body)]">
          <button
            type="button"
            onClick={() => setActiveTab("info")}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "info"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-white"
            }`}
          >
            اطلاعات مالک و مرکز
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("documents")}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "documents"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-white"
            }`}
          >
            <span>مدارک و پاسخ‌ها</span>
            <span className="px-1.5 py-0.5 rounded-full bg-[var(--foreground)] text-[10px]">
              {verification.verificationData.documents.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("logs")}
            className={`py-3 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === "logs"
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-transparent text-[var(--text-muted)] hover:text-white"
            }`}
          >
            <span>سوابق بررسی ({verification.reviewLogs.length})</span>
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

          {activeTab === "info" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. اطلاعات صاحب گیمنت */}
              <div className="bg-[var(--foreground)]/20 border border-[var(--border-subtle)] rounded-card p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-sm font-bold text-[var(--primary)]">
                  <Icon name="user" size={18} />
                  <h3>۱. اطلاعات صاحب گیمنت</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">نام و نام خانوادگی:</span>
                    <span className="font-bold text-[var(--text-white)]">{verification.ownerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">شماره تماس:</span>
                    <span className="font-bold text-[var(--text-white)] dir-ltr">{verification.ownerPhone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">کد ملی:</span>
                    <span className="font-bold text-[var(--text-white)] dir-ltr">{verification.ownerNationalId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">شناسه کاربر:</span>
                    <span className="font-bold text-[var(--text-muted)] dir-ltr">{verification.ownerId}</span>
                  </div>
                </div>
              </div>

              {/* 2. اطلاعات گیمنت */}
              <div className="bg-[var(--foreground)]/20 border border-[var(--border-subtle)] rounded-card p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-sm font-bold text-[var(--primary)]">
                  <Icon name="gamepad" size={18} />
                  <h3>۲. اطلاعات گیمنت</h3>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">نام گیمنت:</span>
                    <span className="font-bold text-[var(--text-white)]">{verification.gamecenterName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">شهر:</span>
                    <span className="font-bold text-[var(--text-white)]">{verification.gamecenterCity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">آدرس کامل:</span>
                    <span className="font-bold text-[var(--text-white)] text-left leading-relaxed">{verification.gamecenterAddress}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--text-muted)]">تاریخ ثبت درخواست:</span>
                    <span className="font-bold text-[var(--text-white)]">{verification.submittedAt}</span>
                  </div>
                </div>
              </div>

              {/* 5. وضعیت فعلی بررسی */}
              <div className="md:col-span-2 bg-[var(--foreground)]/20 border border-[var(--border-subtle)] rounded-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary)]">
                    <Icon name="info" size={18} />
                    <h3>۵. وضعیت فعلی بررسی</h3>
                  </div>
                  {getStatusBadge()}
                </div>
                <div className="text-xs space-y-2 text-[var(--text-white)]">
                  <p>
                    <span className="text-[var(--text-muted)]">آخرین بروزرسانی: </span>
                    {verification.updatedAt || verification.submittedAt}
                  </p>
                  {verification.rejectionReason && (
                    <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/20 text-[var(--accent-red)]">
                      <span className="font-bold">دلیل رد درخواست: </span>
                      <span>{verification.rejectionReason}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "documents" && (
            <div className="space-y-6">
              {/* 3. پاسخ‌های ارسال‌شده */}
              <div className="bg-[var(--foreground)]/20 border border-[var(--border-subtle)] rounded-card p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-sm font-bold text-[var(--primary)]">
                  <Icon name="ticket" size={18} />
                  <h3>۳. اطلاعات و پاسخ‌های ارسال‌شده برای احراز هویت</h3>
                </div>
                <div className="space-y-2.5">
                  {verification.verificationData.submittedAnswers.length > 0 ? (
                    verification.verificationData.submittedAnswers.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-card bg-[var(--bg-body)] border border-[var(--border-subtle)] text-xs space-y-1">
                        <span className="font-bold text-[var(--text-white)] block">{item.question}</span>
                        <span className="text-[var(--text-muted)] block leading-relaxed">{item.answer}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">پاسخ متنی اضافه‌ای ثبت نشده است.</p>
                  )}
                </div>
              </div>

              {/* 4. مدارک و فایل‌های پیوست */}
              <div className="bg-[var(--foreground)]/20 border border-[var(--border-subtle)] rounded-card p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-sm font-bold text-[var(--primary)]">
                  <Icon name="tag" size={18} />
                  <h3>۴. مدارک و فایل‌های پیوست موجود</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {verification.verificationData.documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-[var(--bg-body)] border border-[var(--border-subtle)] rounded-card overflow-hidden flex flex-col justify-between group"
                    >
                      {/* File preview box */}
                      <div className="relative aspect-video bg-black/40 flex items-center justify-center overflow-hidden">
                        {doc.type === "image" ? (
                          <div className="relative w-full h-full flex items-center justify-center p-2">
                            {/* Preserve Aspect Ratio Display */}
                            {/* eslint-disable-next-html-element-for-jsx */}
                            <img
                              src={doc.url}
                              alt={doc.name}
                              className="max-h-full max-w-full object-contain rounded transition-transform group-hover:scale-105"
                            />
                            <button
                              type="button"
                              onClick={() => setPreviewDocument(doc)}
                              className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white text-xs font-bold"
                            >
                              <Icon name="info" size={18} />
                              <span>مشاهده مدرک</span>
                            </button>
                          </div>
                        ) : doc.type === "pdf" ? (
                          <div className="flex flex-col items-center gap-2 text-[var(--primary)] p-4 text-center">
                            <Icon name="ticket" size={32} />
                            <span className="text-xs font-bold text-[var(--text-white)]">فایل سند PDF</span>
                            <button
                              type="button"
                              onClick={() => setPreviewDocument(doc)}
                              className="mt-1 px-3 py-1 rounded bg-[var(--primary)]/20 text-[var(--primary)] hover:bg-[var(--primary)] text-[11px] font-bold transition-colors"
                            >
                              پیش‌نمایش سند
                            </button>
                          </div>
                        ) : (
                          /* Unsupported format clear error/placeholder */
                          <div className="flex flex-col items-center gap-2 p-4 text-center text-[var(--accent-red)] bg-[var(--accent-red)]/10 w-full h-full justify-center">
                            <Icon name="alert" size={28} />
                            <span className="text-xs font-bold">فرمت پشتیبانی‌نشده</span>
                            <span className="text-[10px] text-[var(--text-muted)] dir-ltr">
                              فایل با پسوند نامشخص
                            </span>
                          </div>
                        )}
                      </div>

                      {/* File Title */}
                      <div className="p-3 border-t border-[var(--border-subtle)] flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text-white)] truncate max-w-[180px]" title={doc.name}>
                          {doc.name}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] uppercase">{doc.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "logs" && (
            /* 6. سوابق بررسی */
            <div className="bg-[var(--foreground)]/20 border border-[var(--border-subtle)] rounded-card p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-2 text-sm font-bold text-[var(--primary)]">
                <Icon name="calendar" size={18} />
                <h3>۶. سوابق بررسی و تصمیمات مدیریتی</h3>
              </div>

              {verification.reviewLogs.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)] py-4 text-center">
                  هنوز هیچ سابقه بررسی برای این درخواست ثبت نشده است.
                </p>
              ) : (
                <div className="space-y-3">
                  {verification.reviewLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-card bg-[var(--bg-body)] border border-[var(--border-subtle)] flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[var(--text-white)]">{log.adminName}</span>
                        <span className="text-[var(--text-muted)]">{log.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            log.action === "APPROVED"
                              ? "success"
                              : log.action === "REJECTED"
                              ? "danger"
                              : "neutral"
                          }
                        >
                          {log.action === "APPROVED"
                            ? "تأیید شده"
                            : log.action === "REJECTED"
                            ? "رد شده"
                            : "اصلاح / ویرایش"}
                        </Badge>
                        {log.note && (
                          <span className="text-xs text-[var(--text-muted)]">{log.note}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Decision Box */}
          {actionType && (
            <div className="p-4 rounded-card bg-[var(--bg-body)] border border-[var(--primary)]/40 space-y-3 animate-fadeIn">
              <h4 className="text-xs font-bold text-[var(--text-white)] flex items-center gap-2">
                <Icon name={actionType === "APPROVE" ? "check" : "alert"} size={16} />
                <span>
                  {actionType === "APPROVE"
                    ? isApproved
                      ? "تأیید مجدد / به‌روزرسانی"
                      : "تأیید درخواست احراز هویت"
                    : "رد درخواست احراز هویت"}
                </span>
              </h4>

              {actionType === "REJECT" && (
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-1">
                    علت رد درخواست (الزامی):
                  </label>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="مثال: تصویر مدارک ارسال شده خوانا نیست یا نقص در تاییدیه اماکن وجود دارد..."
                    className="w-full p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--accent-red)] resize-none"
                  />
                </div>
              )}

              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                آیا از ثبت تغییر وضعیت این درخواست اطمینان دارید؟ این تصمیم در سوابق بررسی سیستم ذخیره خواهد شد.
              </p>

              <div className="flex items-center gap-3 pt-1">
                <Button
                  variant={actionType === "APPROVE" ? "primary" : "danger"}
                  size="sm"
                  onClick={handleConfirmAction}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "در حال ثبت..." : "تأیید و ثبت نهایی"}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setActionType(null);
                    setRejectionReason("");
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
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--foreground)]/20 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>اصلاح وضعیت قبلی:</span>
            <span className="font-bold text-[var(--text-white)]">
              {isPending
                ? "درحال بررسی اولیه"
                : isApproved
                ? "مجاز به تغییر به رد شده"
                : "مجاز به تغییر به تأیید شده"}
            </span>
          </div>

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
                <span>{isApproved ? "اصلاح به رد شده" : "رد درخواست"}</span>
              </Button>
            )}

            <Button variant="secondary" size="sm" onClick={onClose}>
              بستن
            </Button>
          </div>
        </div>
      </div>

      {/* Document Image/PDF Lightbox Preview */}
      {previewDocument && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fadeIn"
          onClick={() => setPreviewDocument(null)}
        >
          <div
            className="relative bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-4 max-w-3xl max-h-[85vh] flex flex-col gap-3 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-subtle)]">
              <span className="font-bold text-sm text-[var(--text-white)]">{previewDocument.name}</span>
              <button
                type="button"
                onClick={() => setPreviewDocument(null)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-white"
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto flex items-center justify-center bg-black/50 p-2 rounded">
              {previewDocument.type === "image" ? (
                /* eslint-disable-next-html-element-for-jsx */
                <img
                  src={previewDocument.url}
                  alt={previewDocument.name}
                  className="max-h-[70vh] object-contain rounded"
                />
              ) : (
                <div className="p-8 text-center space-y-4">
                  <Icon name="ticket" size={48} className="mx-auto text-[var(--primary)]" />
                  <p className="text-xs text-[var(--text-white)]">
                    فایل سند PDF: {previewDocument.name}
                  </p>
                  <a
                    href={previewDocument.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block px-4 py-2 rounded bg-[var(--primary)] text-white text-xs font-bold"
                  >
                    باز کردن فایل PDF در زبانه جدید
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
