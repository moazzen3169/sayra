"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { RatingHeartIcon } from "@/components/ui/RatingHeartIcon";
import { toPersianDigits } from "@/lib/format";
import { formatReservationWhen, getErrorMessage } from "@/lib/reservationUi";
import {
  customerReviewService,
  isAlreadyRatedError,
} from "@/services/customerReviewService";
import { gamingCenterService } from "@/services/gamecenterDetailService";

export interface RatingModalProps {
  isOpen: boolean;
  reservationId: string | null;
  fallbackReservationIds?: string[];
  gamingCenterId?: string;
  gamingCenterSlug?: string;
  gamingCenterName?: string;
  stationName?: string;
  startTime?: string;
  endTime?: string;
  autoOpened?: boolean;
  onClose: () => void;
  onSuccess: (ratedReservationId: string) => void;
  onAlreadyRated?: (ratedReservationId: string) => void;
}

const RATING_RANKS: Record<number, { badge: string; title: string }> = {
  1: { badge: "LVL 1", title: "نیاز به بهبود" },
  2: { badge: "LVL 2", title: "معمولی" },
  3: { badge: "LVL 3", title: "خوب و ردیف" },
  4: { badge: "LVL 4", title: "خیلی خفن!" },
  5: { badge: "LVL 5 · GG", title: "افسانه‌ای و بی‌نقص!" },
};

const QUICK_VIBE_CHIPS = [
  "عالی بود، سیستم‌ها قوی و بدون لگ",
  "فضاش دنج و تمیز بود، برخوردشون هم عالی",
  "خیلی خوش گذشت، قطعاً دوباره میام",
  "در کل خوب و معمولی بود، راضی‌ام",
  "بد نبود ولی دسته‌ها و تجهیزات جای بهتر شدن داشت",
  "کمی شلوغ بود و کیفیت سیستم‌ها انتظارمو برآورده نکرد",
];

interface RatingModalPanelProps
  extends Omit<RatingModalProps, "isOpen" | "reservationId"> {
  reservationId: string;
}

const RatingModalPanel: React.FC<RatingModalPanelProps> = ({
  reservationId,
  fallbackReservationIds,
  gamingCenterId,
  gamingCenterSlug,
  gamingCenterName,
  stationName,
  startTime,
  endTime,
  autoOpened = false,
  onClose,
  onSuccess,
  onAlreadyRated,
}) => {
  const [entered, setEntered] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [resolvedCenterName, setResolvedCenterName] = useState<string>("");
  const [resolvedCenterSlug, setResolvedCenterSlug] = useState<string>("");
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let innerFrame: number | null = null;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outerFrame);
      if (innerFrame !== null) cancelAnimationFrame(innerFrame);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    const needsName =
      !gamingCenterName?.trim() || gamingCenterName.trim() === "گیمنت";
    const needsSlug = !gamingCenterSlug?.trim();
    const lookupKey = gamingCenterId?.trim() || gamingCenterSlug?.trim();

    if ((!needsName && !needsSlug) || !lookupKey) {
      return;
    }

    let active = true;
    const controller = new AbortController();

    gamingCenterService
      .resolveGamingCenter(lookupKey, controller.signal)
      .then((center) => {
        if (!active || !center) return;
        if (center.name) setResolvedCenterName(center.name);
        if (center.slug) setResolvedCenterSlug(center.slug);
      })
      .catch(() => {});

    return () => {
      active = false;
      controller.abort();
    };
  }, [gamingCenterId, gamingCenterName, gamingCenterSlug]);

  const handleClose = useCallback(() => {
    if (submitting) return;
    setEntered(false);
    closeTimerRef.current = setTimeout(() => {
      onClose();
    }, 360);
  }, [onClose, submitting]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleClose]);

  const displayRating = hoveredRating ?? rating;
  const activeRank = displayRating > 0 ? RATING_RANKS[displayRating] : null;
  const centerTitle =
    resolvedCenterName || gamingCenterName?.trim() || "گیمنت";
  const effectiveSlug = resolvedCenterSlug || gamingCenterSlug?.trim() || "";
  const whenText =
    startTime && endTime ? formatReservationWhen(startTime, endTime) : "";

  const toggleQuickChip = (chip: string) => {
    setComment((prev) => {
      const lines = prev
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.includes(chip)) {
        return lines.filter((line) => line !== chip).join("\n");
      }

      if (prev.includes(chip)) {
        return prev
          .replace(chip, "")
          .replace(/\n{2,}/g, "\n")
          .trim();
      }

      return [...lines, chip].join("\n");
    });
  };

  const handleSubmit = async () => {
    if (submitting || submitted) return;
    if (rating < 1) {
      setError("لطفاً یکی از کنترلرها را برای امتیاز انتخاب کنید.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await customerReviewService.submitCustomerReview(
        reservationId,
        {
          rating,
          comment: comment.trim() || undefined,
        },
        {
          gamingCenterId,
          gamingCenterSlug: effectiveSlug || undefined,
          fallbackReservationIds,
        }
      );
      setSubmitted(true);
      successTimerRef.current = setTimeout(() => {
        setEntered(false);
        closeTimerRef.current = setTimeout(() => {
          onSuccess(reservationId);
        }, 320);
      }, 1300);
    } catch (e) {
      if (isAlreadyRatedError(e)) {
        setError("شما قبلاً برای این رزرو نظر و امتیاز ثبت کرده‌اید.");
        onAlreadyRated?.(reservationId);
      } else {
        setError(getErrorMessage(e));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gaming-review-title"
    >
      <div
        className={`fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-400 ${
          entered ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Full-screen sliding panel: LEFT -> RIGHT */}
      <div
        dir="rtl"
        className={`relative z-10 h-full w-full overflow-y-auto bg-[#080A07] text-[#F4F5EF] selection:bg-[#B8F34A] selection:text-[#080A07] transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
          entered ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Subtle background grid & low-intensity aura */}
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_at_75%_18%,rgba(184,243,74,0.035),transparent_48%),linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:auto,64px_64px,64px_64px]"
        />

        {/* Exact width of /reservations, seamless against main background */}
        <div className="w-full max-w-[var(--max-mini-app-width)] mx-auto px-4 lg:px-0 py-4 sm:py-6 min-h-[100dvh] flex flex-col justify-center gap-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-3">
            <div
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[10px] tracking-[.2em] text-white/60"
              dir="ltr"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#B8F34A]/70" />
              {autoOpened ? "SAYRA / MISSION COMPLETE" : "SAYRA / REVIEW"}
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              aria-label="بستن"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/75 transition hover:border-white/30 hover:text-white active:scale-95 disabled:opacity-50"
            >
              <span>بعداً</span>
              <span className="text-xs leading-none">✕</span>
            </button>
          </div>

          {submitted ? (
            <div className="flex flex-col items-center text-center py-9 px-2 bg-transparent border-0">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#B8F34A]/25 bg-white/[0.03] shadow-[0_0_12px_rgba(184,243,74,0.1)]">
                <RatingHeartIcon
                  size={34}
                  className="drop-shadow-[0_0_6px_rgba(199,247,75,0.28)]"
                />
              </div>
              <span
                className="text-[10px] tracking-[.26em] text-[#B8F34A]/85"
                dir="ltr"
              >
                GG WP · RECORDED
              </span>
              <h2 className="mt-1.5 text-2xl sm:text-3xl font-black text-white">
                دمت گرم گیمر<span className="text-[#B8F34A]">!</span>
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-white/65">
                امتیاز{" "}
                <span className="font-bold text-[#B8F34A]">
                  {toPersianDigits(rating)} از ۵
                </span>{" "}
                برای <span className="font-bold text-white">{centerTitle}</span>{" "}
                ثبت شد.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (successTimerRef.current)
                    clearTimeout(successTimerRef.current);
                  onSuccess(reservationId);
                }}
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#B8F34A] px-6 py-2.5 text-xs sm:text-sm font-bold text-[#10130A] transition hover:bg-[#D1FF78]"
              >
                بازگشت به رزروها ↗
              </button>
            </div>
          ) : (
            <div className="relative bg-transparent border-0 py-2 flex flex-col gap-5">
              {/* Header: Gamenet name on top, question directly beneath */}
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <h2 className="text-xl sm:text-2xl font-black text-white leading-snug">
                    {centerTitle}
                  </h2>
                  {(stationName || whenText) && (
                    <span className="text-[11px] text-white/50">
                      {[stationName, whenText].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </div>

                <h1
                  id="gaming-review-title"
                  className="text-sm sm:text-base font-bold text-white/85 leading-snug"
                >
                  تجربت از این گیمنت چطوری بود؟
                </h1>
              </div>

              {/* 01 — Heart Rating */}
              <div className="flex flex-col items-center gap-2 py-1">
                <div
                  className="flex items-center justify-center gap-2 sm:gap-3"
                  dir="ltr"
                  onMouseLeave={() => setHoveredRating(null)}
                >
                  {[1, 2, 3, 4, 5].map((value) => {
                    const isSelected = value <= rating;
                    const isHighlighted = value <= displayRating;

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setRating(value);
                          if (error) setError("");
                        }}
                        onMouseEnter={() => setHoveredRating(value)}
                        aria-label={`امتیاز ${toPersianDigits(value)} از ۵`}
                        aria-pressed={isSelected}
                        className="group relative flex flex-col items-center justify-center gap-1 bg-transparent border-0 p-1 focus:outline-none cursor-pointer transition-transform active:scale-90"
                      >
                        <RatingHeartIcon
                          size={34}
                          active={isHighlighted}
                          className={
                            isHighlighted
                              ? "scale-105 drop-shadow-[0_0_6px_rgba(199,247,75,0.28)]"
                              : "hover:opacity-75"
                          }
                        />
                        <span
                          className={`text-[11px] font-black transition-colors ${
                            isHighlighted ? "text-[#B8F34A]/90" : "text-white/35"
                          }`}
                        >
                          {toPersianDigits(value)}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Single-line Rank Status */}
                <div className="min-h-[24px] flex items-center justify-center gap-2 text-center">
                  {activeRank ? (
                    <>
                      <span
                        className="rounded bg-[#B8F34A]/90 px-1.5 py-0.5 text-[10px] font-black text-[#10130A]"
                        dir="ltr"
                      >
                        {activeRank.badge}
                      </span>
                      <span className="text-xs font-bold text-white/90">
                        {activeRank.title}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-white/45">
                      از ۱ تا ۵ امتیاز بده
                    </span>
                  )}
                </div>
              </div>

              {/* 02 — Realistic Quick Answers + Comment */}
              <div className="flex flex-col gap-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_VIBE_CHIPS.map((chip) => {
                    const selected = comment.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => toggleQuickChip(chip)}
                        className={`rounded-full border px-3 py-1.5 text-[11px] font-medium text-right leading-relaxed transition active:scale-95 ${
                          selected
                            ? "border-[#B8F34A]/60 bg-[#B8F34A]/10 text-[#D7F8A6]"
                            : "border-white/10 bg-white/[0.03] text-white/65 hover:border-white/25 hover:text-white"
                        }`}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="نظرت درباره سیستم‌ها، فضا یا برخورد پرسنل رو بنویس... (اختیاری)"
                  className="w-full rounded-2xl border border-white/12 bg-white/[0.03] px-3.5 py-2.5 text-xs sm:text-sm leading-6 text-white placeholder:text-white/35 outline-none resize-none transition-colors focus:border-[#B8F34A]/60"
                />

                <div className="flex items-center justify-between text-[11px] text-white/40">
                  <span>هر رزرو فقط یک بار قابل امتیازدهی است</span>
                  <span>{toPersianDigits(comment.length)} / ۵۰۰</span>
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-3.5 py-2 text-xs font-bold text-[#FCA5A5]">
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 h-11 rounded-full bg-[#B8F34A] hover:bg-[#D1FF78] disabled:opacity-60 text-[#10130A] font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-sm transition active:scale-[0.98]"
                >
                  <span>{submitting ? "در حال ثبت..." : "ثبت امتیاز و نظر"}</span>
                  {!submitting && <span aria-hidden="true">↗</span>}
                </button>

                <button
                  type="button"
                  onClick={handleClose}
                  disabled={submitting}
                  className="h-11 px-5 rounded-full border border-white/15 text-xs font-bold text-white/70 transition hover:border-white/35 hover:text-white disabled:opacity-50"
                >
                  فعلاً رد شو
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const RatingModal: React.FC<RatingModalProps> = ({
  isOpen,
  reservationId,
  ...rest
}) => {
  if (!isOpen || !reservationId) return null;
  return (
    <RatingModalPanel
      key={reservationId}
      reservationId={reservationId}
      {...rest}
    />
  );
};
