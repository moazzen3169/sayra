"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { toPersianDigits } from "@/lib/format";
import type { OwnerGroupBookingItem } from "@/lib/ownerGroupReservationGrouping";
import type { OwnerReservation } from "@/types/owner";

interface GroupConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  group: OwnerGroupBookingItem | null;
  single?: OwnerReservation | null;
  busy: boolean;
}

export const GroupConfirmModal: React.FC<GroupConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  group,
  single,
  busy,
}) => {
  if (!isOpen) return null;

  const isGroup = Boolean(group);
  const affectedCount = isGroup ? group?.reservations.length ?? 0 : 1;

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !busy && onClose()}
      title={isGroup ? "تایید رزرو گروهی" : "تایید رزرو"}
      className="max-w-[440px]"
    >
      <div className="flex flex-col gap-4 text-xs">
        <p className="text-[var(--text-white)] leading-relaxed">
          {isGroup ? (
            <>
              آیا از تایید این رزرو گروهی اطمینان دارید؟ با تایید این درخواست، تمامی{" "}
              <strong className="text-[var(--primary)] font-bold">
                {toPersianDigits(affectedCount)} رزرو دستگاه مرتبط
              </strong>{" "}
              به وضعیت <strong className="text-[var(--primary)]">تایید شده</strong> تغییر خواهند یافت.
            </>
          ) : (
            <>
              آیا از تایید این رزرو اطمینان دارید؟ وضعیت رزرو به{" "}
              <strong className="text-[var(--primary)]">تایید شده</strong> تغییر می‌یابد.
            </>
          )}
        </p>

        {isGroup && group && (
          <div className="p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex flex-col gap-1.5">
            <span className="text-[11px] text-[var(--text-muted)]">دستگاه‌های مشمول:</span>
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

        <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            disabled={busy}
            onClick={handleConfirm}
            className="flex-1 h-10 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {busy ? "در حال تایید..." : "بله، تایید شود"}
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
      </div>
    </Modal>
  );
};
