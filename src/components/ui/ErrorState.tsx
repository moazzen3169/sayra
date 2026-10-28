import React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export interface ErrorStateProps {
  title?: string;
  description: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "خطایی رخ داد",
  description,
  onRetry,
  className,
}) => {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-4 gap-3 bg-[var(--bg-card)] rounded-card border border-[var(--accent-red)]/20",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[var(--accent-red)]/10 text-[var(--accent-red)] flex items-center justify-center">
        <Icon name="alert" size={24} />
      </div>
      <h3 className="text-sm font-extrabold text-[var(--text-white)]">{title}</h3>
      <p className="text-xs text-[var(--text-muted)] max-w-sm leading-relaxed">{description}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-1 h-9 px-4 rounded-card bg-[var(--foreground)] hover:bg-[var(--foreground)]/80 text-[var(--text-white)] border border-[var(--border-subtle)] text-xs font-bold transition-colors"
        >
          تلاش دوباره
        </button>
      )}
    </div>
  );
};
