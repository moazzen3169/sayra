"use client";

import React, { useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
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
  const lockRef = useRef(false);

  if (!isOpen) return null;

  const isGroup = Boolean(group);
  const affectedCount = isGroup
    ? group?.reservations.filter(
        (r) => r.status === "PENDING" || r.status === "CONFIRMED"
      ).length ?? 0
    : single
    ? 1
    : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || lockRef.current) return;
    lockRef.current = true;
    try {
      await onCancel(reason.trim() || undefined);
      setReason("");
    } finally {
      lockRef.current = false;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !busy && onClose()}
      title={isGroup ? "لغو رزرو گروهی" : "لغو رزرو"}
      className="max-w-[460px]"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-xs">
        <p className="text-sm text-[var(--text-white)] leading-relaxed">
          {isGroup ? (
            <>
              با لغو این رزرو گروهی،{" "}
              <strong className="text-[var(--accent-red)] font-bold">
                {toPersianDigits(affectedCount)} رزرو مرتبط
              </strong>{" "}
              لغو خواهند شد و این عملیات قابل بازگشت نیست.
            </>
          ) : (
            <>
              آیا از لغو این رزرو اطمینان دارید؟ وضعیت رزرو به{" "}
              <strong className="text-[var(--accent-red)] font-bold">لغو شده</strong> تغییر خواهد یافت.
            </>
          )}
        </p>

        {isGroup && group && (
          <div className="p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--text-muted)]">ایستگاه‌های لغوشونده:</span>
            <div className="flex flex-wrap gap-1.5">
              {group.devices.map((d) => (
                <span
                  key={d.key}
                  className="px-2.5 py-1 rounded-full bg-[var(--bg-body)] border border-[var(--border-subtle)] text-xs text-[var(--text-white)]"
                >
                  {d.stationName} × {toPersianDigits(d.count)}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cancel-reason-input"
            className="text-xs font-bold text-[var(--text-muted)]"
          >
            علت لغو رزرو (اختیاری)
          </label>
          <textarea
            id="cancel-reason-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            disabled={busy}
            placeholder="دلیل لغو سانس برای اطلاع‌رسانی به مشتری"
            className="rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] focus:border-[var(--accent-red)] p-2.5 text-xs outline-none resize-none text-[var(--text-white)] placeholder:text-[var(--text-subtle)]"
          />
        </div>

        <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button
            type="submit"
            variant="danger"
            size="md"
            isLoading={busy}
            loadingLabel="در حال لغو..."
            disabled={busy}
            className="flex-1 bg-[var(--accent-red)] text-white hover:bg-[var(--accent-red)]/90 border-transparent"
          >
            <Icon name="close" size={16} />
            <span>بله، لغو شود</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={busy}
            onClick={onClose}
          >
            انصراف
          </Button>
        </div>
      </form>
    </Modal>
  );
};
