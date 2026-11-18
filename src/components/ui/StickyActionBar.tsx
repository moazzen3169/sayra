import React from "react";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export interface StickyActionBarProps {
  info: React.ReactNode;
  actionLabel: string;
  onAction: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  error?: string;
  caption?: string;
  inDialog?: boolean;
  className?: string;
}

export const StickyActionBar: React.FC<StickyActionBarProps> = ({
  info,
  actionLabel,
  onAction,
  disabled = false,
  loading = false,
  loadingLabel,
  error,
  caption,
  inDialog = false,
  className,
}) => {
  return (
    <div
      className={cn(
        "w-full bg-[var(--bg-card)] border-t border-[var(--border-subtle)] px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]",
        inDialog
          ? "sticky bottom-0 z-[var(--z-modal)]"
          : "fixed bottom-0 inset-x-0 z-[var(--z-sticky)] animate-sheetUp",
        className
      )}
    >
      <div className="max-w-[780px] lg:max-w-[1200px] mx-auto flex flex-col gap-2">
        {error && (
          <div
            role="alert"
            aria-live="polite"
            className="flex items-center gap-2 text-xs font-medium text-[var(--accent-red)] bg-[var(--accent-red)]/10 border border-[var(--accent-red)]/30 rounded-card px-3 py-2"
          >
            <Icon name="alert" size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col min-w-0 flex-1" aria-live="polite">
            {info}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Button
              variant="primary"
              size="lg"
              onClick={onAction}
              disabled={disabled}
              isLoading={loading}
              loadingLabel={loadingLabel}
              className="min-w-[120px] whitespace-nowrap"
            >
              {actionLabel}
            </Button>
            {caption && (
              <span className="text-xs text-[var(--text-muted)]">{caption}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
