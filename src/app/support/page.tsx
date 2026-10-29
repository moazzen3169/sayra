"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { BottomBar } from "@/components/BottomBar";
import { Icon } from "@/components/ui/Icon";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { isAbortError } from "@/lib/api/client";
import { formatClock, formatDayLabel, getErrorMessage } from "@/lib/reservationUi";
import { toPersianDigits } from "@/lib/format";
import { ownerService } from "@/services/ownerService";
import type { Ticket } from "@/types/owner";

const CATEGORIES: { id: "TECHNICAL" | "FINANCIAL" | "SALES" | "ACCOUNT"; label: string }[] = [
  { id: "TECHNICAL", label: "پشتیبانی فنی" },
  { id: "FINANCIAL", label: "امور مالی و پرداخت" },
  { id: "SALES", label: "خدمات و رزروها" },
  { id: "ACCOUNT", label: "حساب کاربری" },
];

const STATUS_LABEL: Record<Ticket["status"], { label: string; bg: string; text: string }> = {
  OPEN: { label: "باز", bg: "bg-[var(--primary)]/15 border-[var(--primary)]/30", text: "text-[var(--primary)]" },
  PENDING: { label: "در انتظار پاسخ", bg: "bg-[var(--accent-warning)]/15 border-[var(--accent-warning)]/30", text: "text-[var(--accent-warning)]" },
  ANSWERED: { label: "پاسخ داده شده", bg: "bg-[var(--accent-green)]/15 border-[var(--accent-green)]/30", text: "text-[var(--accent-green)]" },
  CLOSED: { label: "بسته شده", bg: "bg-[var(--foreground)] border-[var(--border-subtle)]", text: "text-[var(--text-muted)]" },
};

const inputStyles =
  "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none transition-colors";

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  // Form states
  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("TECHNICAL");
  const [busy, setBusy] = useState(false);

  // Reply states
  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);

    ownerService
      .listTickets(controller.signal)
      .then((data) => {
        if (!active) return;
        setTickets(data);
        setError(null);
      })
      .catch((err) => {
        if (!active || isAbortError(err)) return;
        setError(getErrorMessage(err));
        setTickets([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [reload]);

  const openTicket = async (id: string) => {
    setError(null);
    setLoading(true);
    try {
      const ticketDetail = await ownerService.getTicket(id);
      setSelected(ticketDetail);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!subject.trim() || !message.trim()) {
      setError("لطفاً موضوع و متن پیام را وارد کنید.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      await ownerService.createTicket({
        subject: subject.trim(),
        message: message.trim(),
        category,
      });
      setCreating(false);
      setSubject("");
      setMessage("");
      setReload((v) => v + 1);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !selected || !reply.trim()) return;

    setBusy(true);
    setError(null);
    try {
      let attachment: string | undefined;
      if (file) {
        attachment = await ownerService.uploadTicketAttachment(selected.id, file);
      }
      await ownerService.sendTicketMessage(selected.id, {
        text: reply.trim(),
        ...(attachment ? { attachment } : {}),
      });
      setReply("");
      setFile(null);
      const updatedTicket = await ownerService.getTicket(selected.id);
      setSelected(updatedTicket);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28 lg:pb-12">
      {/* App Shell Header */}
      <ProfileHeader title="پشتیبانی و پاسخگویی" isSubpage={true} />

      <main className="flex-1 pt-20  py-4 flex flex-col gap-6 w-full max-w-[var(--max-profile-width)] mx-auto">

        {/* Overview Banner */}
        <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-card bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0 border border-[var(--primary)]/20">
              <Icon name="info" size={24} />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-sm font-bold text-[var(--text-white)]">
                مرکز پشتیبانی کاربران و صاحبین گیم‌نت
              </h2>
              <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                تیم پشتیبانی ۷ روز هفته برای پیگیری تیکت‌ها، رفع سوالات و راهنمایی همراه شماست.
              </p>
            </div>
          </div>
        </div>

        {/* Global Error Alert */}
        {error && (
          <div className="p-3.5 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold flex items-center gap-2">
            <Icon name="alert" size={18} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* TICKETS SECTION */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <SectionTitle title="تیکت‌های پشتیبانی" />
            {!creating && !selected && (
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCreating(true);
                }}
                className="h-10 px-4 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-[0.98]"
              >
                <Icon name="plus" size={16} />
                <span>ثبت تیکت جدید</span>
              </button>
            )}
          </div>

          {/* DETAIL VIEW */}
          {selected ? (
            <div className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-5 flex flex-col gap-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  <Icon name="back" size={16} />
                  <span>بازگشت به لیست تیکت‌ها</span>
                </button>
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${STATUS_LABEL[selected.status].bg} ${STATUS_LABEL[selected.status].text}`}>
                    {STATUS_LABEL[selected.status].label}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-bold text-[var(--text-white)]">{selected.subject}</h3>
                <span className="text-xs text-[var(--text-muted)]">
                  شناسه تیکت: <strong className="text-[var(--text-white)] font-mono">{toPersianDigits(selected.id)}</strong>
                </span>
              </div>

              {/* Conversation Messages */}
              <div className="flex flex-col gap-3 my-2 max-h-[420px] overflow-y-auto p-1">
                {selected.messages?.map((m) => {
                  const isUser = m.senderType === "USER";
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[85%] rounded-card p-3.5 text-xs leading-relaxed flex flex-col gap-2 ${
                        isUser
                          ? "self-start bg-[var(--primary)] text-on-primary shadow-sm"
                          : "self-end bg-[var(--foreground)]/80 border border-[var(--border-subtle)] text-[var(--text-white)]"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-4 text-[11px] opacity-80 border-b border-current/20 pb-1">
                        <span className="font-bold">{isUser ? "شما" : "پشتیبانی سایرا"}</span>
                        <span>
                          {formatDayLabel(m.createdAt)} - {formatClock(m.createdAt, true)}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap">{m.text}</p>
                      {m.attachment && (
                        <a
                          href={m.attachment}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="self-start flex items-center gap-1 mt-1 underline font-bold"
                        >
                          <Icon name="upload" size={14} />
                          <span>مشاهده فایل پیوست</span>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Reply Form */}
              {selected.status !== "CLOSED" ? (
                <form onSubmit={sendReply} className="flex flex-col gap-3 pt-3 border-t border-[var(--border-subtle)]">
                  <textarea
                    rows={3}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="پاسخ خود را بنویسید..."
                    className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-3 text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none resize-none"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="h-10 px-3.5 rounded-card bg-[var(--foreground)] text-[var(--text-white)] border border-[var(--border-subtle)] hover:border-[var(--border-color)] text-xs font-bold flex items-center gap-2"
                    >
                      <Icon name="upload" size={16} />
                      <span className="truncate max-w-[120px]">
                        {file ? file.name : "پیوست فایل"}
                      </span>
                    </button>
                    <input
                      ref={fileRef}
                      type="file"
                      className="hidden"
                      onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    />
                    <button
                      type="submit"
                      disabled={busy || !reply.trim()}
                      className="flex-1 h-10 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-xs disabled:opacity-60 transition-all"
                    >
                      {busy ? "در حال ارسال..." : "ارسال پیام"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-center text-xs text-[var(--text-muted)]">
                  این تیکت بسته شده است. در صورت نیاز می‌توانید تیکت جدید ثبت کنید.
                </div>
              )}
            </div>
          ) : creating ? (
            /* CREATE TICKET FORM */
            <form onSubmit={createTicket} className="bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-card p-5 flex flex-col gap-4 shadow-lg">
              <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
                <h3 className="text-sm font-bold text-[var(--text-white)]">ایجاد تیکت پشتیبانی جدید</h3>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-white)]"
                >
                  انصراف
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-white)]">موضوع تیکت</label>
                <input
                  className={inputStyles}
                  placeholder="عنوان یا موضوع کوتاه مشکل خود را بنویسید"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-white)]">دسته‌بندی</label>
                <select
                  className={inputStyles}
                  value={category}
                  onChange={(e) => setCategory(e.target.value as typeof category)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id} className="bg-[var(--bg-card)] text-[var(--text-white)]">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-[var(--text-white)]">متن پیام</label>
                <textarea
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="توضیحات کامل مشکل یا درخواست خود را وارد نمایید..."
                  className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-3 text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="flex-1 h-11 rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary font-bold text-xs disabled:opacity-60 shadow-md transition-all active:scale-[0.98]"
                >
                  {busy ? "در حال ثبت..." : "ثبت و ارسال تیکت"}
                </button>
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="px-5 h-11 rounded-card bg-[var(--foreground)] text-[var(--text-white)] font-bold text-xs hover:bg-[var(--foreground)]/80 transition-colors"
                >
                  انصراف
                </button>
              </div>
            </form>
          ) : (
            /* TICKETS LIST */
            <div className="flex flex-col gap-3">
              {loading && (
                <div className="flex flex-col gap-2">
                  <div className="h-16 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse" />
                  <div className="h-16 rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] animate-pulse" />
                </div>
              )}

              {!loading && tickets && tickets.length === 0 && !error && (
                <EmptyState
                  title="تیکتی یافت نشد"
                  description="هنوز هیچ تیکتی ثبت نکرده‌اید. در صورت وجود سوال یا مشکل، تیکت جدید ثبت کنید."
                  actionLabel="ثبت تیکت جدید"
                  onAction={() => setCreating(true)}
                />
              )}

              {!loading && tickets && tickets.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {tickets.map((t) => {
                    const statusInfo = STATUS_LABEL[t.status] || STATUS_LABEL.OPEN;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => openTicket(t.id)}
                        className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] p-4 flex items-center justify-between gap-3 text-right transition-all group shadow-sm"
                      >
                        <div className="flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-bold text-[var(--text-white)] truncate group-hover:text-[var(--primary)] transition-colors">
                            {t.subject}
                          </span>
                          <span className="text-xs text-[var(--text-muted)] font-mono">
                            {formatDayLabel(t.createdAt)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${statusInfo.bg} ${statusInfo.text}`}>
                            {statusInfo.label}
                          </span>
                          <Icon name="back" size={16} className="text-[var(--text-subtle)] transform rotate-180" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </section>

        {/* DIRECT CONTACT CHANNELS SECTION */}
        <section className="flex flex-col gap-4 pt-4 border-t border-[var(--border-subtle)]">
          <SectionTitle title="راه‌های ارتباطی مستقیم" />
          <p className="text-xs text-[var(--text-muted)] leading-relaxed">
            علاوه بر ثبت تیکت، می‌توانید از طریق پیام‌رسان‌های زیر به‌صورت مستقیم با کارشناسان پشتیبانی سایرا ارتباط برقرار کنید:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Telegram Channel */}
            <a
              href="https://t.me/SayraSupport"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] p-4 flex items-center justify-between gap-3 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-white)]">پشتیبانی تلگرام</span>
                  <span className="text-xs text-[var(--text-muted)] font-mono dir-ltr text-right">@SayraSupport</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[var(--primary)] group-hover:underline">ارتباط</span>
            </a>

            {/* WhatsApp Channel */}
            <a
              href="https://wa.me/989120000000"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] p-4 flex items-center justify-between gap-3 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--accent-green)]/15 text-[var(--accent-green)] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-white)]">واتساپ</span>
                  <span className="text-xs text-[var(--text-muted)] font-mono dir-ltr text-right">۰۹۱۲۰۰۰۰۰۰۰</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[var(--accent-green)] group-hover:underline">ارتباط</span>
            </a>

            {/* Rubika Channel */}
            <a
              href="https://rubika.ir/SayraSupport"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] hover:border-[var(--primary)] p-4 flex items-center justify-between gap-3 transition-all group shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[var(--text-white)]">روبیکا</span>
                  <span className="text-xs text-[var(--text-muted)] font-mono dir-ltr text-right">@SayraSupport</span>
                </div>
              </div>
              <span className="text-xs font-bold text-[var(--primary)] group-hover:underline">ارتباط</span>
            </a>
          </div>
        </section>
      </main>

      {/* App Shell BottomBar for Mobile Navigation */}
      <BottomBar activeTab="profile" />
    </div>
  );
}
