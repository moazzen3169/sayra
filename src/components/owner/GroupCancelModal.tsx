"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { toPersianDigits } from "@/lib/format";
import type { OwnerGroupBookingItem } from "@/lib/ownerGroupReservationGrouping";
import type { OwnerReservation } from "@/types/owner";

interface GroupCancelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancel: (reason?: string) => Promise<void>;
  group: OwnerGroupBookingItem | null;
  single?: OwnerReservation | null;
  busy: boolean;
}

export const GroupCancelModal: React.FC<GroupCancelModalProps> = ({
  isOpen,
  onClose,
  onCancel,
  group,
  single,
  busy,
}) => {
  const [reason, setReason] = useState("");

  if (!isOpen) return null;

  const isGroup = Boolean(group);
  const affectedCount = isGroup ? group?.reservations.length ?? 0 : 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCancel(reason.trim() || undefined);
    setReason("");
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !busy && onClose()}
      title={isGroup ? "لغو رزرو گروهی" : "لغو رزرو"}
      className="max-w-[460px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
        <p className="text-[var(--text-white)] leading-relaxed">
          {isGroup ? (
            <>
              هشدار: با لغو این رزرو گروهی، تمامی{" "}
              <strong className="text-[var(--accent-red)] font-bold">
                {toPersianDigits(affectedCount)} رزرو مرتبط
              </strong>{" "}
              لغو خواهند شد و این عملیات قابل بازگشت نیست.
            </>
          ) : (
            <>
              هشدار: آیا از لغو این رزرو اطمینان دارید؟ وضعیت رزرو به{" "}
              <strong className="text-[var(--accent-red)] font-bold">لغو شده</strong> تغییر خواهد یافت.
            </>
          )}
        </p>

        {isGroup && group && (
          <div className="p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex flex-col gap-1.5">
            <span className="text-[11px] text-[var(--text-muted)]">ایستگاه‌های لغو شونده:</span>
            <div className="flex flex-wrap gap-1">
              {group.devices.map((d) => (
                <span
                  key={d.key}
                  className="px-2 py-0.5 rounded-full bg-[var(--bg-body)] border border-[var(--border-subtle)] text-[11px] text-[var(--text-white)]"
                >
                  {d.stationName} ×{toPersianDigits(d.count)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[var(--text-muted)]">
            علت لغو رزرو (اختیاری)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="دلیل لغو سانس به منظور اطلاع‌رسانی به مشتری..."
            className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--accent-red)] p-2.5 text-xs outline-none resize-none text-[var(--text-white)] placeholder:text-[var(--text-muted)]"
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="submit"
            disabled={busy}
            className="flex-1 h-10 rounded-card bg-[var(--accent-red)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {busy ? "در حال لغو..." : "بله، لغو کامل رزرو"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="h-10 px-4 rounded-card bg-[var(--foreground)] text-xs font-bold text-[var(--text-white)] hover:opacity-80 transition-opacity"
          >
            انصراف
          </button>
        </div>
      </form>
    </Modal>
  );
};
