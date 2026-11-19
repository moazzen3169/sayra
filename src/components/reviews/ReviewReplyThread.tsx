import React from "react";
import { Icon } from "@/components/ui/Icon";
import { formatDayLabel } from "@/lib/reservationUi";

export interface ReviewReplyThreadProps {
  replyText: string;
  replyAt?: string | null;
  label?: string;
  actions?: React.ReactNode;
}

/**
 * نمایش تو در تو و متصل پاسخ مدیر گیم‌نت درست زیر نظر کاربر
 */
export const ReviewReplyThread: React.FC<ReviewReplyThreadProps> = ({
  replyText,
  replyAt,
  label = "پاسخ مدیر گیم‌نت به این نظر",
  actions,
}) => {
  const cleanReply = replyText.trim();
  if (!cleanReply) return null;

  return (
    <div
      className="ms-2 ps-3 border-s-2 border-[var(--primary)]/50 mt-1"
      aria-label={label}
    >
      <div className="rounded-child border border-[var(--primary)]/20 bg-[var(--foreground)]/35 p-3 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">
            <Icon name="reply" size={14} />
            <span>{label}</span>
          </span>
          {replyAt && (
            <span className="text-xs text-[var(--text-muted)]">
              {formatDayLabel(replyAt)}
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--text-white)] leading-relaxed whitespace-pre-wrap">
          {cleanReply}
        </p>
        {actions && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border-subtle)]">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};
