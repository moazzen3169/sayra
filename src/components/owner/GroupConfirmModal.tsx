"use client";

import React, { useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
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
  const lockRef = useRef(false);

  if (!isOpen) return null;

  const isGroup = Boolean(group);
  const pendingCount = isGroup
    ? group?.reservations.filter((r) => r.status === "PENDING").length ?? 0
    : single?.status === "PENDING"
    ? 1
    : 0;

  const handleConfirm = async () => {
    if (busy || lockRef.current) return;
    lockRef.current = true;
    try {
      await onConfirm();
    } finally {
      lockRef.current = false;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !busy && onClose()}
      title={isGroup ? "تایید رزرو گروهی" : "تایید رزرو"}
      className="max-w-[440px]"
    >
      <div className="flex flex-col gap-4 text-xs">
        <p className="text-sm text-[var(--text-white)] leading-relaxed">
          {isGroup ? (
            <>
              آیا از تایید این رزرو گروهی اطمینان دارید؟ با تایید این درخواست،{" "}
              <strong className="text-[var(--primary)] font-bold">
                {toPersianDigits(pendingCount)} رزرو در انتظار
              </strong>{" "}
              به وضعیت <strong className="text-[var(--accent-green)]">تایید شده</strong> تغییر می‌یابد.
            </>
          ) : (
            <>
              آیا از تایید این رزرو اطمینان دارید؟ وضعیت رزرو به{" "}
              <strong className="text-[var(--accent-green)]">تایید شده</strong> تغییر می‌یابد.
            </>
          )}
        </p>

        {isGroup && group && (
          <div className="p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] flex flex-col gap-2">
            <span className="text-xs font-bold text-[var(--text-muted)]">دستگاه‌های مشمول:</span>
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

        <div className="flex gap-2 pt-2 border-t border-[var(--border-subtle)]">
          <Button
            type="button"
            variant="primary"
            size="md"
            isLoading={busy}
            loadingLabel="در حال تایید..."
            disabled={busy}
            onClick={handleConfirm}
            className="flex-1"
          >
            <Icon name="check" size={16} />
            <span>بله، تایید شود</span>
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
      </div>
    </Modal>
  );
};
