"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemTitle: string;
  itemType: "gamecenter" | "user";
  relatedInfo?: {
    ticketsCount?: number;
    reviewsCount?: number;
    reservationsCount?: number;
  };
  onConfirm: () => Promise<void>;
}

export const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  isOpen,
  onClose,
  itemTitle,
  itemType,
  relatedInfo,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasRelations =
    (relatedInfo?.ticketsCount ?? 0) > 0 ||
    (relatedInfo?.reviewsCount ?? 0) > 0 ||
    (relatedInfo?.reservationsCount ?? 0) > 0;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "خطا در حذف آیتم مورد نظر.");
    } finally {
      setIsDeleting(false);
    }
  };

  const typeName = itemType === "gamecenter" ? "گیمنت" : "کاربر";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`حذف ${typeName}`}
      className="max-w-[440px]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3.5 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)]">
          <div className="mt-0.5 shrink-0">
            <Icon name="alert" size={20} />
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-bold">آیا از حذف {typeName} «{itemTitle}» اطمینان دارید؟</span>
            <span>این عملیات غیرقابل بازگشت است و رکورد مربوطه را حذف خواهد کرد.</span>
          </div>
        </div>

        {hasRelations && (
          <div className="flex flex-col gap-2 p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)]">
            <span className="text-xs font-bold text-[var(--accent-warning)]">
              توجه: داده‌های مرتبط با این {typeName} وجود دارد:
            </span>
            <ul className="text-xs text-[var(--text-muted)] space-y-1 list-disc list-inside">
              {(relatedInfo?.reservationsCount ?? 0) > 0 && (
                <li>{relatedInfo?.reservationsCount} رزرو ثبت شده</li>
              )}
              {(relatedInfo?.ticketsCount ?? 0) > 0 && (
                <li>{relatedInfo?.ticketsCount} تیکت پشتیبانی</li>
              )}
              {(relatedInfo?.reviewsCount ?? 0) > 0 && (
                <li>{relatedInfo?.reviewsCount} نظر کاربری</li>
              )}
            </ul>
            <span className="text-xs text-[var(--text-subtle)] mt-1">
              پیشنهاد می‌شود به‌جای حذف کامل، وضعیت {typeName} را به حالت «غیرفعال» تغییر دهید.
            </span>
          </div>
        )}

        {error && (
          <div className="text-xs font-bold text-[var(--accent-red)]">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            انصراف
          </Button>
          <Button variant="danger" onClick={handleConfirm} isLoading={isDeleting}>
            حذف صریح
          </Button>
        </div>
      </div>
    </Modal>
  );
};
