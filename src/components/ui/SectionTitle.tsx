import React from "react";
import { cn } from "@/lib/utils";

export interface SectionTitleProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export const SectionTitle: React.FC<SectionTitleProps> = ({
  title,
  subtitle,
  action,
  className,
}) => {
  return (
    <div className={cn("flex items-center justify-between gap-2 mb-3", className)}>
      <div className="flex flex-col gap-0.5 min-w-0">
        <h2 className="text-base font-bold text-[var(--text-white)] truncate">{title}</h2>
        {subtitle && (
          <p className="text-xs text-[var(--text-muted)] truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
