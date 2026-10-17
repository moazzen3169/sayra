"use client";

import React, { useEffect, useRef, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { isAbortError } from "@/lib/api/client";
import { formatClock, formatDayLabel, getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { Ticket } from "@/types/owner";

const CATEGORIES: { id: "TECHNICAL" | "FINANCIAL" | "SALES" | "ACCOUNT"; label: string }[] = [
  { id: "TECHNICAL", label: "فنی" },
  { id: "FINANCIAL", label: "مالی" },
  { id: "SALES", label: "فروش" },
  { id: "ACCOUNT", label: "حساب کاربری" },
];

const STATUS_LABEL: Record<Ticket["status"], string> = {
  OPEN: "باز",
  PENDING: "در انتظار",
  ANSWERED: "پاسخ داده شده",
  CLOSED: "بسته",
};

const input =
  "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-sm outline-none";

export default function OwnerSupportPage() {
  const [tickets, setTickets] = useState<Ticket[] | null>(null);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const [creating, setCreating] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("TECHNICAL");
  const [busy, setBusy] = useState(false);

  const [reply, setReply] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    const c = new AbortController();
    ownerService
      .listTickets(c.signal)
      .then((d) => {
        if (!active) return;
        setTickets(d);
        setError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setError(getErrorMessage(e));
        setTickets([]);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [reload]);

  const openTicket = async (id: string) => {
    setError(null);
    try {
      setSelected(await ownerService.getTicket(id));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!subject.trim() || !message.trim()) {
      setError("موضوع و متن پیام را وارد کنید.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await ownerService.createTicket({ subject: subject.trim(), message: message.trim(), category });
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
      if (file) attachment = await ownerService.uploadTicketAttachment(selected.id, file);
      await ownerService.sendTicketMessage(selected.id, { text: reply.trim(), ...(attachment ? { attachment } : {}) });
      setReply("");
      setFile(null);
      setSelected(await ownerService.getTicket(selected.id));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="پشتیبانی" />

      <main className="flex-1 mt-16 px-4 py-4 flex flex-col gap-3">
        {error && (
          <div className="p-3 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
            {error}
          </div>
        )}

        {/* Detail */}
        {selected ? (
          <>
            <button type="button" onClick={() => setSelected(null)} className="self-start text-xs font-bold text-[var(--primary)]">
              ← بازگشت به تیکت‌ها
            </button>
            <h2 className="text-sm font-extrabold">{selected.subject}</h2>

            <div className="flex flex-col gap-2">
              {selected.messages?.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[85%] rounded-card p-3 text-xs leading-relaxed flex flex-col gap-1 ${
                    m.senderType === "USER"
                      ? "self-start bg-[var(--primary)] text-[#101014]"
                      : "self-end bg-[var(--bg-card)] border border-[var(--border-subtle)]"
                  }`}
                >
                  <span>{m.text}</span>
                  {m.attachment && (
                    <a href={m.attachment} target="_blank" rel="noopener noreferrer" className="underline font-bold">
                      پیوست
                    </a>
                  )}
                  <span className="text-[10px] opacity-60">
                    {formatDayLabel(m.createdAt)} {formatClock(m.createdAt, true)}
                  </span>
                </div>
              ))}
            </div>

            {selected.status !== "CLOSED" && (
              <form onSubmit={sendReply} className="flex flex-col gap-2 pt-2">
                <textarea
                  rows={3}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="پیام خود را بنویسید"
                  className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-3 text-sm outline-none resize-none"
                />
                <div className="flex items-center gap-2">
                  <button type="button" onClick={() => fileRef.current?.click()} className="h-10 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold">
                    {file ? file.name.slice(0, 18) : "پیوست فایل"}
                  </button>
                  <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                  <button type="submit" disabled={busy} className="flex-1 h-10 rounded-card bg-[var(--primary)] text-[#101014] font-black text-xs disabled:opacity-60">
                    {busy ? "در حال ارسال..." : "ارسال"}
                  </button>
                </div>
              </form>
            )}
          </>
        ) : creating ? (
          <form onSubmit={createTicket} className="flex flex-col gap-3">
            <h2 className="text-sm font-extrabold">تیکت جدید</h2>
            <input className={input} placeholder="موضوع" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <select className={input} value={category} onChange={(e) => setCategory(e.target.value as typeof category)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="متن پیام"
              className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-3 text-sm outline-none resize-none"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={busy} className="flex-1 h-11 rounded-card bg-[var(--primary)] text-[#101014] font-black text-sm disabled:opacity-60">
                {busy ? "در حال ارسال..." : "ثبت تیکت"}
              </button>
              <button type="button" onClick={() => setCreating(false)} className="h-11 px-5 rounded-card bg-[var(--foreground)] text-xs font-bold">
                انصراف
              </button>
            </div>
          </form>
        ) : (
          <>
            <button type="button" onClick={() => setCreating(true)} className="h-12 rounded-card bg-[var(--primary)] text-[#101014] font-black text-sm">
              + تیکت جدید
            </button>

            {tickets === null && <div className="h-20 rounded-card bg-[var(--bg-card)] animate-pulse" />}
            {tickets && tickets.length === 0 && !error && (
              <p className="py-12 text-center text-xs text-[var(--text-muted)]">تیکتی ثبت نشده است.</p>
            )}

            {tickets?.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => openTicket(t.id)}
                className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex items-center justify-between gap-3 text-right"
              >
                <span className="text-sm font-bold truncate">{t.subject}</span>
                <span className="text-[11px] text-[var(--text-muted)] shrink-0">{STATUS_LABEL[t.status] ?? t.status}</span>
              </button>
            ))}
          </>
        )}
      </main>
    </div>
  );
}