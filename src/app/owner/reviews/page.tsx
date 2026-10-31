"use client";

import React, { useEffect, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { useOwner } from "@/context/OwnerContext";
import { isAbortError } from "@/lib/api/client";
import { toPersianDigits } from "@/lib/format";
import { getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { OwnerRating } from "@/types/owner";

export default function OwnerReviewsPage() {
  const { centerId, center } = useOwner();
  const [items, setItems] = useState<OwnerRating[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!center?.slug) return;
    let active = true;
    const c = new AbortController();
    ownerService
      .listRatings(center.slug, c.signal)
      .then((d) => {
        if (!active) return;
        setItems(d);
        setError(null);
      })
      .catch((e) => {
        if (!active || isAbortError(e)) return;
        setError(getErrorMessage(e));
        setItems([]);
      });
    return () => {
      active = false;
      c.abort();
    };
  }, [center?.slug, reload]);

  const handleModerate = async (
    ratingId: string,
    status: "PUBLISHED" | "HIDDEN" | "DELETED"
  ) => {
    if (busyId) return;
    setBusyId(ratingId);
    setError(null);
    try {
      await ownerService.setRatingStatus(centerId, ratingId, status);
      setReload((v) => v + 1);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const handleReplySubmit = async (ratingId: string) => {
    if (!replyText.trim() || busyId) return;
    setBusyId(ratingId);
    setError(null);
    try {
      await ownerService.replyToRating(centerId, ratingId, replyText.trim());
      setReplyingId(null);
      setReplyText("");
      setReload((v) => v + 1);
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setBusyId(null);
    }
  };

  const avg =
    items && items.length ? items.reduce((a, r) => a + r.rating, 0) / items.length : null;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="نظرات" />

      <main className="flex-1 mt-16 px-4 py-4 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0 flex flex-col gap-3">
        {!center?.slug && <p className="text-xs text-[var(--text-muted)]">اطلاعات گیمنت (slug) در دسترس نیست.</p>}
        {error && <p className="text-xs font-bold text-[var(--accent-red)]">{error}</p>}
        {items === null && center?.slug && <div className="h-24 rounded-card bg-[var(--bg-card)] animate-pulse" />}

        {avg !== null && (
          <div className="rounded-card bg-[var(--bg-card)] p-4 flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">میانگین امتیاز</span>
            <span className="font-black text-[var(--accent-star)]">
              ★ {toPersianDigits(avg.toFixed(1))}{" "}
              <span className="text-xs text-[var(--text-muted)] font-normal">({toPersianDigits(items!.length)} نظر)</span>
            </span>
          </div>
        )}

        {items && items.length === 0 && !error && (
          <p className="py-12 text-center text-xs text-[var(--text-muted)]">هنوز نظری ثبت نشده است.</p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items?.map((r) => (
            <div key={r.id} className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between gap-3">
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold">{r.customerName ?? "کاربر سایرا"}</span>
                    {r.status && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          r.status === "PUBLISHED"
                            ? "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30"
                            : r.status === "HIDDEN"
                            ? "bg-[var(--accent-yellow)]/15 text-[var(--accent-yellow)] border border-[var(--accent-yellow)]/30"
                            : "bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/30"
                        }`}
                      >
                        {r.status === "PUBLISHED" ? "منتشر شده" : r.status === "HIDDEN" ? "پنهان شده" : "حذف شده"}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-black text-[var(--accent-star)]">★ {toPersianDigits(r.rating)}</span>
                </div>
                {r.comment && <p className="text-xs text-[var(--text-white)] leading-relaxed">{r.comment}</p>}
              </div>

              {/* Owner Reply Display */}
              {r.reply && (
                <div className="p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--primary)]/20 flex flex-col gap-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--primary)]">پاسخ شما (مدیر گیمنت):</span>
                  </div>
                  <p className="text-[var(--text-white)] leading-relaxed">{r.reply}</p>
                </div>
              )}

              {/* Reply Form / Action */}
              {replyingId === r.id ? (
                <div className="flex flex-col gap-2 pt-2 border-t border-[var(--border-subtle)]">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="پاسخ خود را بنویسید..."
                    className="p-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs outline-none resize-none text-[var(--text-white)]"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.id || !replyText.trim()}
                      onClick={() => handleReplySubmit(r.id)}
                      className="h-9 px-4 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold disabled:opacity-50"
                    >
                      {busyId === r.id ? "در حال ثبت..." : "ثبت پاسخ"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReplyingId(null);
                        setReplyText("");
                      }}
                      className="h-9 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold text-[var(--text-muted)]"
                    >
                      انصراف
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)] gap-2">
                  <div className="flex items-center gap-1.5">
                    {r.status === "HIDDEN" ? (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => handleModerate(r.id, "PUBLISHED")}
                        className="h-8 px-2.5 rounded-card bg-[var(--foreground)] text-[11px] font-bold text-[var(--accent-green)] hover:bg-[var(--accent-green)]/10 disabled:opacity-50 transition-colors"
                      >
                        انتشار
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => handleModerate(r.id, "HIDDEN")}
                        className="h-8 px-2.5 rounded-card bg-[var(--foreground)] text-[11px] font-bold text-[var(--accent-yellow)] hover:bg-[var(--accent-yellow)]/10 disabled:opacity-50 transition-colors"
                      >
                        پنهان کردن
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => handleModerate(r.id, "DELETED")}
                      className="h-8 px-2.5 rounded-card bg-[var(--foreground)] text-[11px] font-bold text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 disabled:opacity-50 transition-colors"
                    >
                      حذف
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setReplyingId(r.id);
                      setReplyText(r.reply || "");
                    }}
                    className="h-9 px-4 rounded-card border border-[var(--border-subtle)] text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
                  >
                    {r.reply ? "ویرایش پاسخ" : "پاسخ به نظر"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
