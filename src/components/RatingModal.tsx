"use client";

import React, { useState } from "react";
import { reservationService } from "@/services/reservationService";
import { getErrorMessage } from "@/lib/reservationUi";

interface RatingModalProps {
  isOpen: boolean;
  reservationId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({ isOpen, reservationId, onClose, onSuccess }) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !reservationId) return null;

  const handleSubmit = async () => {
    if (submitting) return;
    if (rating < 1) {
      setError("لطفاً امتیاز خود را انتخاب کنید.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await reservationService.rate(reservationId, {
        rating,
        comment: comment.trim() || undefined,
      });
      setRating(0);
      setComment("");
      onSuccess();
    } catch (e) {
      setError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] bg-[var(--bg-card)] border-t sm:border border-[var(--border-color)] rounded-t-2xl sm:rounded-card lg:rounded-[10px] p-5 flex flex-col gap-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <h3 className="text-base font-bold text-[var(--text-white)]">افزودن نظر</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 text-[var(--text-muted)] text-lg">
            ✕
          </button>
        </div>

        <div className="flex items-center justify-center gap-2" dir="ltr">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} ستاره`}
              className={`text-4xl leading-none transition-transform active:scale-90 ${
                n <= rating ? "text-[var(--accent-star)]" : "text-[var(--text-subtle)]"
              }`}
            >
              ★
            </button>
          ))}
        </div>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={4}
          placeholder="تجربه خود را بنویسید (اختیاری)"
          className="w-full rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--primary)] p-3 text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none resize-none transition-colors"
        />

        {error && (
          <div className="p-3 rounded-lg bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)] text-xs font-bold">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="h-12 w-full rounded-card bg-[var(--primary)] hover:bg-[var(--primary-hover)] disabled:opacity-60 text-on-primary font-bold text-sm transition-all active:scale-[0.98]"
        >
          {submitting ? "در حال ثبت..." : "ثبت نظر"}
        </button>
      </div>
    </div>
  );
};