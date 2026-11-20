"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

export interface BulkDeleteResult {
  deleted: number;
  failed: number;
  total: number;
}

interface BulkDeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemPluralLabel: string;
  totalCount: number;
  onConfirm: (
    onProgress: (current: number, total: number) => void
  ) => Promise<BulkDeleteResult>;
  onCompleted: (result: BulkDeleteResult) => void;
}

export const BulkDeleteConfirmationModal: React.FC<
  BulkDeleteConfirmationModalProps
> = ({
  isOpen,
  onClose,
  itemPluralLabel,
  totalCount,
  onConfirm,
  onCompleted,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (isDeleting) return;
    setProgress(null);
    setError(null);
    onClose();
  };

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    setProgress({ current: 0, total: totalCount });
    try {
      const result = await onConfirm((current, total) => {
        setProgress({ current, total });
      });
      setIsDeleting(false);
      setProgress(null);
      onClose();
      onCompleted(result);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || `خطا در حذف تمامی ${itemPluralLabel}.`);
      setIsDeleting(false);
    }
  };

  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`حذف تمامی ${itemPluralLabel}`}
      className="max-w-[460px]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3.5 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)]">
          <div className="mt-0.5 shrink-0">
            <Icon name="alert" size={20} />
          </div>
          <div className="flex flex-col gap-1 text-xs leading-relaxed">
            <span className="font-bold">
              آیا از حذف تمامی {itemPluralLabel} ذخیره شده ({totalCount} مورد)
              اطمینان دارید؟
            </span>
            <span>
              با تایید این مرحله، تمامی {itemPluralLabel} به‌صورت حلقه‌وار و
              یکی‌یکی حذف خواهند شد. این عملیات غیرقابل بازگشت است.
            </span>
          </div>
        </div>

        {isDeleting && progress && (
          <div className="flex flex-col gap-2 p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)]">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--text-white)]">
              <span>در حال حذف {itemPluralLabel}...</span>
              <span>
                {progress.current} از {progress.total} ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--foreground)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent-red)] transition-all duration-200"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {error && (
          <div className="text-xs font-bold text-[var(--accent-red)]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" onClick={handleClose} disabled={isDeleting}>
            انصراف
          </Button>
          <Button
            variant="danger"
            onClick={handleConfirm}
            isLoading={isDeleting}
            loadingLabel="در حال حذف..."
          >
            تایید و حذف همه
          </Button>
        </div>
      </div>
    </Modal>
  );
};
