import React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  onBack,
  action,
  className,
}) => {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 h-14 px-4 bg-[var(--bg-card)] border-b border-[var(--border-subtle)] sticky top-0 z-40",
        className
      )}
    >
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="بازگشت"
            className="w-9 h-9 rounded-lg text-[var(--text-white)] hover:bg-[var(--foreground)]/40 flex items-center justify-center shrink-0 transition-colors"
          >
            <Icon name="back" size={20} />
          </button>
        )}
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm font-bold text-[var(--text-white)] truncate">{title}</h1>
          {subtitle && (
            <p className="text-[11px] text-[var(--text-muted)] truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
};
