"use client";

import React, { useEffect, useRef, useState } from "react";
import { AdminTicket, AdminUser, CannedResponse } from "@/types/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { TicketInfoModal } from "./TicketInfoModal";
import {
  SENDER_ROLE_LABEL,
  TICKET_PRIORITY_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_VARIANT,
} from "./ticketLabels";

interface TicketDetailPaneProps {
  ticket: AdminTicket | null;
  admins: AdminUser[];
  cannedResponses: CannedResponse[];
  /** در صورت خطا باید throw کند تا متن پاسخ پاک نشود */
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
  const [pendingStatus, setPendingStatus] = useState<AdminTicket["status"] | null>(null);
  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const ticketId = ticket?.id;
  const messageCount = ticket?.messages?.length ?? 0;

  // با باز شدن تیکت یا پیام جدید، به آخرین پیام اسکرول می‌شود
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [ticketId, messageCount, isLoading]);

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[450px] flex-col items-center justify-center gap-3 rounded-card border border-[var(--border-color)] bg-[var(--bg-card)] p-6 text-xs text-[var(--text-muted)]">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"
          aria-hidden="true"
        />
        <span>در حال دریافت جزئیات تیکت...</span>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="flex h-full min-h-[450px] flex-col items-center justify-center rounded-card border border-[var(--border-color)] bg-[var(--bg-card)] p-6">
        <EmptyState
          title="تیکتی انتخاب نشده است"
          description="یک تیکت را از فهرست انتخاب کنید تا مکالمه و امکان پاسخ نمایش داده شود."
        />
      </div>
    );
  }

  const messages = ticket.messages ?? [];

  const handleCannedSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const canned = cannedResponses.find((c) => c.id === e.target.value);
    if (canned) {
      setReplyText((prev) => (prev ? `${prev}\n${canned.text}` : canned.text));
      setValidationError(null);
    }
    e.target.value = "";
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isSubmitting) return;
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
      // پیام خطا در بالای پنل نمایش داده می‌شود؛ متن پاسخ حفظ می‌شود
    }
  };

  const handleConfirmStatusChange = async () => {
    if (!pendingStatus) return;
    setIsStatusSaving(true);
    try {
      await onStatusChange(pendingStatus);
    } finally {
      setIsStatusSaving(false);
      setPendingStatus(null);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-[var(--border-color)] bg-[var(--bg-card)]">
      {/* هدر فشرده */}
      <header className="flex shrink-0 flex-col gap-3 border-b border-[var(--border-subtle)] bg-[var(--foreground)]/10 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">

            <h1 className="line-clamp-2 text-base font-bold leading-6 text-[var(--text-white)]">
              {ticket.subject}
            </h1>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            {ticket.priority === "HIGH" && (
              <Badge variant="danger">{TICKET_PRIORITY_LABEL.HIGH}</Badge>
            )}
            <Badge variant={TICKET_STATUS_VARIANT[ticket.status]}>
              {TICKET_STATUS_LABEL[ticket.status]}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <Icon name="user" size={16} />
              <span className="font-bold text-[var(--text-white)]">
                {ticket.userName ?? "کاربر ناشناس"}
              </span>
              {ticket.userRole && <span>({SENDER_ROLE_LABEL[ticket.userRole]})</span>}
            </span>
            {ticket.gamecenterName && (
              <span className="flex items-center gap-1.5">
                <Icon name="gamepad" size={16} />
                <span>{ticket.gamecenterName}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={ticket.status}
              onChange={(e) => setPendingStatus(e.target.value as AdminTicket["status"])}
              aria-label="تغییر وضعیت تیکت"
              className="h-10 cursor-pointer rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-3 text-xs font-bold text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
            >
              {(Object.keys(TICKET_STATUS_LABEL) as AdminTicket["status"][]).map((s) => (
                <option key={s} value={s} className="bg-[var(--bg-card)]">
                  {TICKET_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <Button variant="secondary" size="sm" onClick={() => setIsInfoOpen(true)}>
              <Icon name="info" size={16} className="ml-1.5" />
              اطلاعات کامل
            </Button>
          </div>
        </div>
      </header>

      {/* پیام‌های ثبت‌شده در بالای ناحیه‌ی مکالمه */}
      {feedback && (
        <div
          role="status"
          className={`mx-4 mt-3 flex shrink-0 items-center gap-2 rounded-card border p-3 text-xs font-bold ${
            feedback.type === "success"
              ? "border-[var(--accent-green)]/30 bg-[var(--accent-green)]/15 text-[var(--accent-green)]"
              : "border-[var(--accent-red)]/30 bg-[var(--accent-red)]/15 text-[var(--accent-red)]"
          }`}
        >
          <Icon name={feedback.type === "success" ? "check" : "alert"} size={16} />
          <span>{feedback.message}</span>
        </div>
      )}

      {/* مکالمه */}
      <div
        ref={scrollRef}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain p-4 sm:p-5"
      >
        {messages.length === 0 ? (
          <div className="my-auto flex flex-col items-center gap-2 py-8 text-center text-xs text-[var(--text-muted)]">
            <Icon name="info" size={32} className="text-[var(--text-subtle)]" />
            <span className="font-bold text-[var(--text-white)]">
              هنوز پیامی در این تیکت ثبت نشده است
            </span>
            <span>اولین پاسخ را در کادر پایین بنویسید.</span>
          </div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.senderRole === "ADMIN";
            return (
              <article
                key={msg.id}
                className={`flex max-w-[85%] flex-col gap-1.5 rounded-card border p-4 ${
                  isAdmin
                    ? "self-start border-[var(--primary)]/40 bg-[var(--primary)]/10"
                    : "self-end border-[var(--border-subtle)] bg-[var(--foreground)]/30"
                }`}
              >
                <div className="flex items-center justify-between gap-6 text-xs">
                  <span
                    className={`font-bold ${
                      isAdmin ? "text-[var(--primary)]" : "text-[var(--text-white)]"
                    }`}
                  >
                    {msg.senderName}
                    <span className="mr-1.5 font-normal text-[var(--text-muted)]">
                      {isAdmin
                        ? "پشتیبانی"
                        : msg.senderRole === "OWNER"
                        ? "صاحب گیمنت"
                        : "کاربر"}
                    </span>
                  </span>
                  <span className="text-[var(--text-muted)]">{msg.createdAt}</span>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[var(--text-white)]">
                  {msg.message}
                </p>
              </article>
            );
          })
        )}
      </div>


{/* پاسخ */}
<form
  onSubmit={handleSendReply}
  className="flex shrink-0 flex-col gap-2 border-t border-[var(--border-subtle)] bg-[var(--foreground)]/10 p-4"
>
  <div className="flex items-center justify-between gap-3">
    <label htmlFor="ticket-reply" className="text-xs font-bold text-[var(--text-white)]">
      پاسخ شما
    </label>
    <select
      onChange={handleCannedSelect}
      defaultValue=""
      aria-label="درج پاسخ آماده"
      className="h-9 max-w-[220px] cursor-pointer rounded-card border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2 text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]"
    >
      <option value="">درج پاسخ آماده...</option>
      {cannedResponses.map((cr) => (
        <option key={cr.id} value={cr.id} className="bg-[var(--bg-card)]">
          {cr.category ? `${cr.category} - ` : ""}
          {cr.title}
        </option>
      ))}
    </select>
  </div>

  <div className="flex items-stretch gap-2">
    <textarea
      id="ticket-reply"
      rows={1}
      value={replyText}
      disabled={isSubmitting}
      onChange={(e) => {
        setReplyText(e.target.value);
        if (validationError) setValidationError(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleSendReply();
        }
      }}
      aria-invalid={!!validationError}
      aria-describedby={validationError ? "ticket-reply-error" : undefined}
      placeholder="متن پاسخ را بنویسید..."
      className={`min-w-0 flex-1 h-12 resize-none rounded-card border bg-[var(--bg-card)] px-3 py-3 text-sm leading-6 text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-subtle)] ${
        validationError
          ? "border-[var(--accent-red)]"
          : "border-[var(--border-subtle)] focus:border-[var(--primary)]"
      }`}
    />

    <Button
      type="submit"
      variant="primary"
      isLoading={isSubmitting}
      className="h-12 shrink-0 whitespace-nowrap"
    >
      ارسال پاسخ
    </Button>
  </div>

  {validationError && (
    <span
      id="ticket-reply-error"
      className="flex items-center gap-1 text-xs font-bold text-[var(--accent-red)]"
    >
      <Icon name="alert" size={14} />
      <span>{validationError}</span>
    </span>
  )}


</form>


      {/* مودال اطلاعات کامل */}
      <TicketInfoModal
        key={ticket.id}
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        ticket={ticket}
        admins={admins}
        onAssign={onAssign}
      />

      {/* تأیید تغییر وضعیت */}
      <Modal
        isOpen={pendingStatus !== null}
        onClose={() => !isStatusSaving && setPendingStatus(null)}
        title="تغییر وضعیت تیکت"
        className="max-w-[420px]"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-7 text-[var(--text-muted)]">
            وضعیت این تیکت به «
            <strong className="text-[var(--text-white)]">
              {pendingStatus ? TICKET_STATUS_LABEL[pendingStatus] : ""}
            </strong>
            » تغییر کند؟
          </p>
          <div className="flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => setPendingStatus(null)}
              disabled={isStatusSaving}
            >
              انصراف
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmStatusChange}
              isLoading={isStatusSaving}
            >
              تغییر وضعیت
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}