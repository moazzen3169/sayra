import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "primary" | "warning" | "success" | "danger" | "neutral";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  className,
}) => {
  const variants = {
    primary: "bg-[var(--primary)] text-on-primary",
    warning: "bg-[var(--accent-warning)]/15 text-[var(--accent-warning)] border border-[var(--accent-warning)]/30",
    success: "bg-[var(--accent-green)]/15 text-[var(--accent-green)] border border-[var(--accent-green)]/30",
    danger: "bg-[var(--accent-red)]/15 text-[var(--accent-red)] border border-[var(--accent-red)]/30",
    neutral: "bg-[var(--foreground)] text-[var(--text-white)] border border-[var(--border-subtle)]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center shrink-0 rounded-full px-2.5 py-1 text-xs font-bold leading-none",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
};
