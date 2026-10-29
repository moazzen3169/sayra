"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

interface CampaignDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignTitle: string;
  campaignCode: string;
  onConfirm: () => Promise<void>;
}

export const CampaignDeleteModal: React.FC<CampaignDeleteModalProps> = ({
  isOpen,
  onClose,
  campaignTitle,
  campaignCode,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Failed to delete campaign:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="تأیید حذف کمپین تخفیف"
      className="max-w-[480px]"
    >
      <div className="flex flex-col gap-5 py-2">
        <div className="flex items-start gap-3 p-4 rounded-card bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)]">
          <Icon name="alert" size={24} className="shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-bold">آیا از حذف این کمپین اطمینان دارید؟</span>
            <p className="text-[var(--text-muted)] leading-relaxed">
              با حذف کمپین «{campaignTitle}» با کد تخفیف <strong className="text-white dir-ltr inline-block px-1 bg-foreground/40 rounded">{campaignCode}</strong>، امکان استفاده مجدد از آن غیرفعال شده و اطلاعات مربوطه حذف می‌شود.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[var(--border-subtle)]">
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            انصراف
          </Button>
          <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
            حذف نهایی کمپین
          </Button>
        </div>
      </div>
    </Modal>
  );
};
