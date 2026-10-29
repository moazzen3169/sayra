"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

interface BlogPostDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  postTitle: string;
  onConfirm: () => Promise<void>;
}

export const BlogPostDeleteModal: React.FC<BlogPostDeleteModalProps> = ({
  isOpen,
  onClose,
  postTitle,
  onConfirm,
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (err: unknown) {
      const e = err as Error;
      setError(e?.message || "خطا در حذف مقاله.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="حذف مقاله وبلاگ"
      className="max-w-[440px]"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 p-3.5 rounded-card bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 text-[var(--accent-red)]">
          <div className="mt-0.5 shrink-0">
            <Icon name="alert" size={20} />
          </div>
          <div className="flex flex-col gap-1 text-xs">
            <span className="font-bold">
              آیا از حذف مقاله «{postTitle}» اطمینان دارید؟
            </span>
            <span>
              این عملیات غیرقابل بازگشت است و مقاله به‌طور کامل از سامانه پاک خواهد شد.
            </span>
          </div>
        </div>

        <div className="p-3 rounded-card bg-[var(--foreground)]/30 border border-[var(--border-subtle)] text-xs text-[var(--text-muted)] space-y-1">
          <p>
            پیشنهاد می‌شود به‌جای حذف کامل مقاله، وضعیت آن را به حالت «بایگانی‌شده» یا «پیش‌نویس» تغییر دهید تا سوابق آن حفظ شود.
          </p>
        </div>

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
            حذف مقاله
          </Button>
        </div>
      </div>
    </Modal>
  );
};
