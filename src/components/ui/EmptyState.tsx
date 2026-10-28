import React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-4 gap-3",
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)]">
        <Icon name="info" size={32} />
      </div>
      <h3 className="text-sm font-bold text-[var(--text-white)]">{title}</h3>
      {description && (
        <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-2 h-10 px-5 rounded-card bg-[var(--primary)] text-on-primary text-xs font-bold hover:bg-[var(--primary-hover)] transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
