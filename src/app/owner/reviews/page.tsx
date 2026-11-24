"use client";

import React, { useEffect, useRef, useState } from "react";
import { OwnerPageHeader } from "@/components/owner/OwnerPageHeader";
import { ReviewReplyThread } from "@/components/reviews/ReviewReplyThread";
import { Icon } from "@/components/ui/Icon";
import { RatingHeartIcon } from "@/components/ui/RatingHeartIcon";
import { useOwner } from "@/context/OwnerContext";
import { ApiError, isAbortError } from "@/lib/api/client";
import { toPersianDigits } from "@/lib/format";
import { formatDayLabel, getErrorMessage } from "@/lib/reservationUi";
import { ownerService } from "@/services/ownerService";
import type { OwnerRating } from "@/types/owner";

type ActiveReplyAction =
  | { type: "create"; ratingId: string }
  | { type: "edit"; ratingId: string }
  | { type: "confirm-delete"; ratingId: string }
  | null;

export default function OwnerReviewsPage() {
  const { centerId, center } = useOwner();
  const [items, setItems] = useState<OwnerRating[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{
    id: string;
    message: string;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<ActiveReplyAction>(null);
  const [replyText, setReplyText] = useState("");
  const [reload, setReload] = useState(0);

  // قفل هم‌زمان برای جلوگیری از ارسال دوباره یا تکراری در کلیک‌های سریع
  const inFlightIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!centerId && !center?.slug) return;
    let active = true;
    const c = new AbortController();

    async function loadRatings() {
      let data: OwnerRating[] = [];
      if (centerId) {
        try {
          data = await ownerService.listCenterRatings(centerId, {
            signal: c.signal,
          });
        } catch (err) {
          if (
            err instanceof ApiError &&
            err.status === 404 &&
            center?.slug
          ) {
            data = await ownerService.listRatings(center.slug, c.signal);
          } else {
            throw err;
          }
        }
      } else if (center?.slug) {
        data = await ownerService.listRatings(center.slug, c.signal);
      }
      return data.filter((r) => r.status !== "DELETED");
    }

    loadRatings()
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
  }, [centerId, center?.slug, reload]);

  const handleReplySubmit = async (
    ratingId: string,
    mode: "create" | "edit"
  ) => {
    const cleanReply = replyText.trim();
    if (!centerId || !cleanReply || inFlightIdsRef.current.has(ratingId)) {
      return;
    }

    const target = items?.find((item) => item.id === ratingId);
    const alreadyHasReply = Boolean(
      (target?.replyComment ?? target?.reply ?? "").trim()
    );

    if (mode === "create" && alreadyHasReply) {
      setActionError({
        id: ratingId,
        message: "برای این نظر قبلاً پاسخ ثبت شده است و امکان ثبت پاسخ جدید وجود ندارد.",
      });
      return;
    }

    inFlightIdsRef.current.add(ratingId);
    setBusyId(ratingId);
    setActionError(null);

    try {
      const updated = await ownerService.replyToRating(
        centerId,
        ratingId,
        cleanReply
      );
      const nowIso = new Date().toISOString();

      setItems((prev) =>
        prev
          ? prev.map((item) =>
              item.id === ratingId
                ? {
                    ...item,
                    ...(updated ?? {}),
                    replyComment: updated?.replyComment ?? cleanReply,
                    reply: updated?.reply ?? cleanReply,
                    replyAt: updated?.replyAt ?? item.replyAt ?? nowIso,
                    repliedAt: updated?.repliedAt ?? item.repliedAt ?? nowIso,
                  }
                : item
            )
          : prev
      );
      setActiveAction(null);
      setReplyText("");
      setReload((v) => v + 1);
    } catch (e) {
      setActionError({
        id: ratingId,
        message:
          e instanceof Error && !(e as { status?: number }).status
            ? e.message
            : getErrorMessage(e),
      });
    } finally {
      inFlightIdsRef.current.delete(ratingId);
      setBusyId(null);
    }
  };

  const handleDeleteReply = async (ratingId: string) => {
    if (!centerId || inFlightIdsRef.current.has(ratingId)) {
      return;
    }

    inFlightIdsRef.current.add(ratingId);
    setBusyId(ratingId);
    setActionError(null);

    try {
      await ownerService.deleteRatingReply(centerId, ratingId);
      setItems((prev) =>
        prev
          ? prev.map((item) =>
              item.id === ratingId
                ? {
                    ...item,
                    replyComment: undefined,
                    reply: undefined,
                    replyAt: undefined,
                    repliedAt: undefined,
                    repliedById: undefined,
                  }
                : item
            )
          : prev
      );
      setActiveAction(null);
      setReplyText("");
      setReload((v) => v + 1);
    } catch (e) {
      setActionError({
        id: ratingId,
        message:
          e instanceof Error && !(e as { status?: number }).status
            ? e.message
            : getErrorMessage(e),
      });
    } finally {
      inFlightIdsRef.current.delete(ratingId);
      setBusyId(null);
    }
  };

  const avg =
    items && items.length
      ? items.reduce((a, r) => a + r.rating, 0) / items.length
      : null;

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-10">
      <OwnerPageHeader title="نظرات" />

      <main className="flex-1 mt-16 px-4 py-4 w-full max-w-[var(--max-mini-app-width)] mx-auto lg:px-0 flex flex-col gap-3">
        {!centerId && !center?.slug && (
          <p className="text-xs text-[var(--text-muted)]">
            اطلاعات گیمنت در دسترس نیست.
          </p>
        )}
        {error && (
          <p className="text-xs font-bold text-[var(--accent-red)]">{error}</p>
        )}
        {items === null && (centerId || center?.slug) && (
          <div className="h-24 rounded-card bg-[var(--bg-card)] animate-pulse" />
        )}

        {avg !== null && (
          <div className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex items-center justify-between">
            <span className="text-xs text-[var(--text-muted)]">
              میانگین امتیاز
            </span>
            <span className="inline-flex items-center gap-1.5 font-black text-[var(--primary)]">
              <RatingHeartIcon size={16} />
              <span>{toPersianDigits(avg.toFixed(1))}</span>
              <span className="text-xs text-[var(--text-muted)] font-normal">
                ({toPersianDigits(items!.length)} نظر)
              </span>
            </span>
          </div>
        )}

        {items && items.length === 0 && !error && (
          <p className="py-12 text-center text-xs text-[var(--text-muted)]">
            هنوز نظری ثبت نشده است.
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {items?.map((r) => {
            const existingReply = (r.replyComment ?? r.reply ?? "").trim();
            const replyDate = r.replyAt ?? r.repliedAt;
            const isBusy = busyId === r.id;
            const isCreating =
              activeAction?.type === "create" && activeAction.ratingId === r.id;
            const isEditing =
              activeAction?.type === "edit" && activeAction.ratingId === r.id;
            const isConfirmingDelete =
              activeAction?.type === "confirm-delete" &&
              activeAction.ratingId === r.id;
            const cardError =
              actionError?.id === r.id ? actionError.message : null;

            return (
              <article
                key={r.id}
                className="rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-4 flex flex-col justify-between gap-3"
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-[var(--text-white)] truncate">
                        {r.customerName ?? r.author ?? "کاربر سایرا"}
                      </span>
                      {r.status === "HIDDEN" && (
                        <span className="px-2 py-0.5 rounded-child bg-[var(--foreground)] text-xs text-[var(--text-muted)]">
                          مخفی
                        </span>
                      )}
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-black text-[var(--primary)] shrink-0">
                      <RatingHeartIcon size={14} />
                      <span>{toPersianDigits(r.rating)} از ۵</span>
                    </span>
                  </div>

                  {r.comment && (
                    <p className="text-xs text-[var(--text-white)] leading-relaxed">
                      {r.comment}
                    </p>
                  )}

                  {r.createdAt && (
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDayLabel(r.createdAt)}
                    </span>
                  )}

                  {/* پاسخ مدیر درست زیر نظر مربوطه با خط اتصال مشخص */}
                  {isEditing ? (
                    <div className="ms-2 ps-3 border-s-2 border-[var(--primary)]/50 mt-1">
                      <div className="rounded-child border border-[var(--primary)]/25 bg-[var(--foreground)]/35 p-3 flex flex-col gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">
                          <Icon name="reply" size={14} />
                          <span>ویرایش پاسخ به این نظر</span>
                        </span>
                        <textarea
                          rows={2}
                          value={replyText}
                          disabled={isBusy}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="پاسخ خود را ویرایش کنید..."
                          className="p-3 rounded-child bg-[var(--foreground)]/50 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs outline-none resize-none text-[var(--text-white)] disabled:opacity-60"
                        />
                        {cardError && (
                          <p className="text-xs font-bold text-[var(--accent-red)]">
                            {cardError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isBusy || !replyText.trim()}
                            onClick={() => handleReplySubmit(r.id, "edit")}
                            className="h-9 px-4 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold disabled:opacity-50"
                          >
                            {isBusy ? "در حال ذخیره..." : "ذخیره ویرایش"}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setActiveAction(null);
                              setReplyText("");
                              setActionError(null);
                            }}
                            className="h-9 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold text-[var(--text-muted)] disabled:opacity-50"
                          >
                            انصراف
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : existingReply ? (
                    <ReviewReplyThread
                      replyText={existingReply}
                      replyAt={replyDate}
                      label="پاسخ شما به این نظر (مدیر گیم‌نت)"
                      actions={
                        isConfirmingDelete ? (
                          <div className="flex items-center justify-between gap-2 w-full flex-wrap">
                            <span className="text-xs text-[var(--text-muted)]">
                              آیا از حذف این پاسخ مطمئن هستید؟
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => handleDeleteReply(r.id)}
                                className="h-8 px-3 rounded-child bg-[var(--accent-red)] text-[var(--text-white)] text-xs font-bold disabled:opacity-50"
                              >
                                {isBusy ? "در حال حذف..." : "تایید حذف"}
                              </button>
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => {
                                  setActiveAction(null);
                                  setActionError(null);
                                }}
                                className="h-8 px-3 rounded-child bg-[var(--foreground)] text-xs font-bold text-[var(--text-muted)] disabled:opacity-50"
                              >
                                انصراف
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setActiveAction({
                                  type: "edit",
                                  ratingId: r.id,
                                });
                                setReplyText(existingReply);
                                setActionError(null);
                              }}
                              className="inline-flex items-center gap-1 h-8 px-3 rounded-child border border-[var(--border-subtle)] text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50"
                            >
                              <Icon name="edit" size={14} />
                              <span>ویرایش پاسخ</span>
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => {
                                setActiveAction({
                                  type: "confirm-delete",
                                  ratingId: r.id,
                                });
                                setActionError(null);
                              }}
                              className="inline-flex items-center gap-1 h-8 px-3 rounded-child border border-[var(--accent-red)]/30 text-xs font-bold text-[var(--accent-red)] hover:bg-[var(--accent-red)]/10 transition-colors disabled:opacity-50"
                            >
                              <Icon name="trash" size={14} />
                              <span>حذف پاسخ</span>
                            </button>
                          </>
                        )
                      }
                    />
                  ) : null}

                  {!existingReply && cardError && !isCreating && (
                    <p className="text-xs font-bold text-[var(--accent-red)]">
                      {cardError}
                    </p>
                  )}
                  {existingReply && cardError && !isEditing && (
                    <p className="text-xs font-bold text-[var(--accent-red)]">
                      {cardError}
                    </p>
                  )}
                </div>

                {/* فرم ارسال پاسخ (فقط وقتی هنوز پاسخی ثبت نشده باشد — حداکثر یک پاسخ برای هر نظر) */}
                {!existingReply &&
                  (isCreating ? (
                    <div className="ms-2 ps-3 border-s-2 border-[var(--primary)]/50">
                      <div className="flex flex-col gap-2 rounded-child border border-[var(--primary)]/25 bg-[var(--foreground)]/35 p-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">
                          <Icon name="reply" size={14} />
                          <span>پاسخ به این نظر</span>
                        </span>
                        <textarea
                          rows={2}
                          value={replyText}
                          disabled={isBusy}
                          onChange={(e) => setReplyText(e.target.value)}
                          placeholder="پاسخ خود را بنویسید..."
                          className="p-3 rounded-child bg-[var(--foreground)]/50 border border-[var(--border-subtle)] focus:border-[var(--primary)] text-xs outline-none resize-none text-[var(--text-white)] disabled:opacity-60"
                        />
                        {cardError && (
                          <p className="text-xs font-bold text-[var(--accent-red)]">
                            {cardError}
                          </p>
                        )}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={isBusy || !replyText.trim()}
                            onClick={() => handleReplySubmit(r.id, "create")}
                            className="h-9 px-4 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold disabled:opacity-50"
                          >
                            {isBusy ? "در حال ثبت..." : "ثبت پاسخ"}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => {
                              setActiveAction(null);
                              setReplyText("");
                              setActionError(null);
                            }}
                            className="h-9 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold text-[var(--text-muted)] disabled:opacity-50"
                          >
                            انصراف
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end pt-2 border-t border-[var(--border-subtle)]">
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => {
                          setActiveAction({ type: "create", ratingId: r.id });
                          setReplyText("");
                          setActionError(null);
                        }}
                        className="inline-flex items-center gap-1.5 h-9 px-4 rounded-card border border-[var(--border-subtle)] text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50"
                      >
                        <Icon name="reply" size={14} />
                        <span>پاسخ به نظر</span>
                      </button>
                    </div>
                  ))}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
