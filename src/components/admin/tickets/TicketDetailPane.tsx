"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AdminTicket, AdminUser, CannedResponse } from "@/types/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/EmptyState";

interface TicketDetailPaneProps {
  ticket: AdminTicket | null;
  admins: AdminUser[];
  cannedResponses: CannedResponse[];
  onReply: (message: string) => Promise<void>;
  onStatusChange: (status: AdminTicket["status"]) => Promise<void>;
  onAssign: (adminId: string | null) => Promise<void>;
  isLoading: boolean;
  isSubmitting: boolean;
  feedback: { type: "success" | "danger"; message: string } | null;
}

export function TicketDetailPane({
  ticket,
  admins,
  cannedResponses,
  onReply,
  onStatusChange,
  onAssign,
  isLoading,
  isSubmitting,
  feedback,
}: TicketDetailPaneProps) {
  const [replyText, setReplyText] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  // Confirmations
  const [pendingStatus, setPendingStatus] = useState<AdminTicket["status"] | null>(null);
  const [pendingAdminId, setPendingAdminId] = useState<string | null | "UNCHANGED">("UNCHANGED");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[450px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 text-xs text-[var(--text-muted)] gap-3">
        <div className="w-8 h-8 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
        <span>در حال دریافت جزئیات تیکت...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[450px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6">
        <EmptyState
          title="تیکتی انتخاب نشده است"
          description="لطفاً از لیست سمت راست، یک تیکت را جهت مشاهده تاریخچه و ارسال پاسخ انتخاب کنید."
        />
      </div>
    );
  }

  const handleCannedSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    if (!selectedId) return;

    const canned = cannedResponses.find((c) => c.id === selectedId);
    if (canned) {
      setReplyText((prev) => (prev ? `${prev}\n${canned.text}` : canned.text));
      setValidationError(null);
    }
    // Reset dropdown selection
    e.target.value = "";
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmed = replyText.trim();
    if (!trimmed) {
      setValidationError("متن پاسخ نمی‌تواند خالی باشد.");
      return;
    }

    try {
      await onReply(trimmed);
      setReplyText("");
    } catch {
      // Error handled by parent feedback
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatus) return;
    try {
      await onStatusChange(pendingStatus);
    } finally {
      setPendingStatus(null);
    }
  };

  const handleConfirmAssign = async () => {
    if (pendingAdminId === "UNCHANGED") return;
    try {
      await onAssign(pendingAdminId);
    } finally {
      setPendingAdminId("UNCHANGED");
    }
  };

  const messages = ticket.messages || [];

  return (
    <div className="flex flex-col h-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card overflow-hidden">
      {/* Header Info Bar */}
      <div className="p-4 sm:p-5 border-b border-[var(--border-subtle)] flex flex-col gap-4 bg-[var(--foreground)]/10 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--primary)] dir-ltr">
              #{ticket.id}
            </span>
            <h1 className="font-bold text-base text-[var(--text-white)]">{ticket.subject}</h1>
          </div>

          {/* Quick Action Badges / Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant={
                ticket.status === "OPEN"
                  ? "danger"
                  : ticket.status === "PENDING"
                  ? "warning"
                  : ticket.status === "ANSWERED"
                  ? "success"
                  : "neutral"
              }
            >
              {ticket.status === "OPEN"
                ? "باز / جدید"
                : ticket.status === "PENDING"
                ? "در حال بررسی"
                : ticket.status === "ANSWERED"
                ? "پاسخ داده شده"
                : "بسته شده"}
            </Badge>

            <Badge variant={ticket.priority === "HIGH" ? "danger" : "neutral"}>
              اولیت: {ticket.priority === "HIGH" ? "فوری" : ticket.priority === "MEDIUM" ? "متوسط" : "عادی"}
            </Badge>
          </div>
        </div>

        {/* Details Metadata Bar: Sender, Links, Assignment, Status Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 rounded-card">
          {/* Sender & Profile Link */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">ارسال‌کننده:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-[var(--text-white)]">
                {ticket.userName || "کاربر عمومی"}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--foreground)]/40 text-[var(--text-muted)]">
                {ticket.userRole === "OWNER" ? "صاحب گیمنت" : "کاربر عادی"}
              </span>
            </div>
            {ticket.userPhone && (
              <span className="text-[11px] text-[var(--text-subtle)] dir-ltr text-right">
                {ticket.userPhone}
              </span>
            )}
            {ticket.userId && (
              <Link
                href={`/admin/users/${ticket.userId}`}
                className="text-[11px] font-bold text-[var(--primary)] hover:underline flex items-center gap-1 mt-0.5"
              >
                <Icon name="user" size={14} />
                <span>مشاهده پروفایل کاربر</span>
              </Link>
            )}
          </div>

          {/* Connected Gamecenter */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">گیمنت مرتبط:</span>
            {ticket.gamecenterId ? (
              <Link
                href={`/admin/gamecenters/${ticket.gamecenterId}`}
                className="font-bold text-[var(--text-white)] hover:text-[var(--primary)] transition-colors flex items-center gap-1"
              >
                <Icon name="gamepad" size={14} className="text-[var(--primary)]" />
                <span>{ticket.gamecenterName || ticket.gamecenterId}</span>
              </Link>
            ) : (
              <span className="text-[var(--text-subtle)]">نامشخص / عمومی</span>
            )}
          </div>

          {/* Connected Reservation */}
          <div className="flex flex-col gap-1">
            <span className="text-[11px] text-[var(--text-muted)] font-medium">رزرو مرتبط:</span>
            {ticket.reservationCode ? (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-[var(--primary)] dir-ltr bg-[var(--primary)]/10 px-2 py-0.5 rounded border border-[var(--primary)]/20">
                  #{ticket.reservationCode}
                </span>
                {ticket.userId && (
                  <Link
                    href={`/admin/users/${ticket.userId}`}
                    className="text-[10px] text-[var(--text-muted)] hover:text-white underline"
                    title="مشاهده رزروهای کاربر در پروفایل"
                  >
                    پیگیری رزرو
                  </Link>
                )}
              </div>
            ) : (
              <span className="text-[var(--text-subtle)]">بدون رزرو مرتبط</span>
            )}
          </div>

          {/* Assigned Admin & Status Action */}
          <div className="flex flex-col gap-1.5">
            {/* Admin Assignment */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] text-[var(--text-muted)] font-medium">مسئول تیکت:</span>
              <select
                value={ticket.assignedAdminId || ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setPendingAdminId(val ? val : null);
                }}
                className="h-7 px-1.5 text-[11px] bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-[var(--text-white)] rounded cursor-pointer outline-none focus:border-[var(--primary)]"
              >
                <option value="" className="bg-[var(--bg-card)]">انتخاب مسئول...</option>
                {admins.map((adm) => (
                  <option key={adm.id} value={adm.id} className="bg-[var(--bg-card)]">
                    {adm.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Change */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[11px] text-[var(--text-muted)] font-medium">تغییر وضعیت:</span>
              <select
                value={ticket.status}
                onChange={(e) => setPendingStatus(e.target.value as AdminTicket["status"])}
                className="h-7 px-1.5 text-[11px] bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-[var(--text-white)] rounded cursor-pointer outline-none focus:border-[var(--primary)] font-bold"
              >
                <option value="OPEN" className="bg-[var(--bg-card)]">باز / جدید</option>
                <option value="PENDING" className="bg-[var(--bg-card)]">در حال بررسی</option>
                <option value="ANSWERED" className="bg-[var(--bg-card)]">پاسخ داده شده</option>
                <option value="CLOSED" className="bg-[var(--bg-card)]">بسته شده</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Global Feedback Banner inside Pane */}
      {feedback && (
        <div
          className={`mx-4 mt-4 p-3 rounded-card text-xs font-bold flex items-center gap-2 ${
            feedback.type === "success"
              ? "bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)]"
              : "bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)]"
          }`}
        >
          <Icon name={feedback.type === "success" ? "check" : "alert"} size={16} />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Message Timeline Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 min-h-0">
        {messages.length === 0 ? (
          <div className="my-auto py-8 text-center flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] text-xs">
            <Icon name="info" size={32} className="text-[var(--text-subtle)]" />
            <span className="font-bold text-[var(--text-white)]">هیچ پیامی در این تیکت ثبت نشده است</span>
            <span>می‌توانید اولین پاسخ را در کادر زیر ارسال کنید.</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.senderRole === "ADMIN";
            return (
              <div
                key={msg.id}
                className={`flex flex-col gap-1.5 max-w-[85%] ${
                  isAdmin ? "self-start" : "self-end"
                }`}
              >
                {/* Message Box */}
                <div
                  className={`p-4 rounded-card flex flex-col gap-2 text-xs leading-relaxed ${
                    isAdmin
                      ? "bg-[var(--primary)]/15 border border-[var(--primary)]/40 text-[var(--text-white)] rounded-tl-none"
                      : "bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-[var(--text-white)] rounded-tr-none"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[11px] pb-1.5 border-b border-[var(--border-subtle)]/40">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span
                        className={
                          isAdmin ? "text-[var(--primary)]" : "text-[var(--text-white)]"
                        }
                      >
                        {msg.senderName}
                      </span>
                      {isAdmin ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--primary)] text-on-primary font-bold">
                          پشتیبانی
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--foreground)]/50 text-[var(--text-muted)] font-normal">
                          {msg.senderRole === "OWNER" ? "صاحب گیمنت" : "کاربر"}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-[var(--text-subtle)] dir-ltr">
                      {msg.createdAt}
                    </span>
                  </div>

                  <p className="whitespace-pre-wrap break-words leading-relaxed text-body">
                    {msg.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Workspace Area */}
      <div className="p-4 sm:p-5 border-t border-[var(--border-subtle)] bg-[var(--foreground)]/10 flex flex-col gap-3 shrink-0">
        {/* Canned Responses Header / Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <label className="font-bold text-[var(--text-white)] flex items-center gap-1.5">
            <Icon name="ticket" size={16} className="text-[var(--primary)]" />
            <span>ارسال پاسخ به تیکت:</span>
          </label>

          {/* Canned Responses Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-[var(--text-muted)]">پاسخ‌های آماده:</span>
            <select
              onChange={handleCannedSelect}
              className="h-8 px-2 text-xs bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-white)] rounded-card outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="">انتخاب متن آماده...</option>
              {cannedResponses.map((cr) => (
                <option key={cr.id} value={cr.id} className="bg-[var(--bg-card)]">
                  [{cr.category || "عمومی"}] {cr.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Text Area Form */}
        <form onSubmit={handleSendReply} className="flex flex-col gap-2">
          <textarea
            rows={4}
            value={replyText}
            onChange={(e) => {
              setReplyText(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="متن پاسخ خود را وارد کنید... (می‌توانید پاسخ آماده انتخاب کرده و قبل از ارسال آن را ویرایش کنید)"
            disabled={isSubmitting}
            className={`w-full p-3 rounded-card bg-[var(--bg-card)] border text-xs text-[var(--text-white)] placeholder-[var(--text-subtle)] outline-none transition-colors leading-relaxed ${
              validationError
                ? "border-[var(--accent-red)] focus:border-[var(--accent-red)]"
                : "border-[var(--border-subtle)] focus:border-[var(--primary)]"
            }`}
          />

          {validationError && (
            <span className="text-xs font-bold text-[var(--accent-red)] flex items-center gap-1">
              <Icon name="alert" size={14} />
              <span>{validationError}</span>
            </span>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-[var(--text-subtle)]">
              پاسخ پس از ارسال در سابقه مکالمات تیکت قرار خواهد گرفت.
            </span>

            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              className="flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>در حال ارسال...</span>
                </>
              ) : (
                <>
                  <Icon name="check" size={16} />
                  <span>ارسال پاسخ</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Confirmation Modal for Status Change */}
      {pendingStatus && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl">
            <h3 className="font-bold text-base text-[var(--text-white)] flex items-center gap-2">
              <Icon name="alert" size={20} className="text-[var(--accent-yellow)]" />
              <span>تأیید تغییر وضعیت تیکت</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              آیا از تغییر وضعیت تیکت «{ticket.subject}» مطمئن هستید؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPendingStatus(null)}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmStatusChange}
              >
                تأیید تغییر وضعیت
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Admin Assignment */}
      {pendingAdminId !== "UNCHANGED" && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-card p-6 max-w-md w-full flex flex-col gap-4 shadow-2xl">
            <h3 className="font-bold text-base text-[var(--text-white)] flex items-center gap-2">
              <Icon name="user" size={20} className="text-[var(--primary)]" />
              <span>تأیید ارجاع تیکت</span>
            </h3>
            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
              آیا از واگذاری/ارجاع این تیکت به مسئول انتخابی اطمینان دارید؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPendingAdminId("UNCHANGED")}
              >
                انصراف
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmAssign}
              >
                تأیید ارجاع
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
