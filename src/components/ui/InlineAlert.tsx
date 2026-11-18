import React from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

export interface InlineAlertProps {
  variant?: "error" | "warning" | "info" | "success";
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const InlineAlert: React.FC<InlineAlertProps> = ({
  variant = "info",
  children,
  action,
  className,
}) => {
  const styles = {
    error: "bg-[var(--accent-red)]/10 border-[var(--accent-red)]/30 text-[var(--accent-red)]",
    warning: "bg-[var(--accent-warning)]/10 border-[var(--accent-warning)]/30 text-[var(--accent-warning)]",
    info: "bg-[var(--foreground)]/60 border-[var(--border-color)] text-[var(--text-white)]",
    success: "bg-[var(--accent-green)]/10 border-[var(--accent-green)]/30 text-[var(--accent-green)]",
  };

  const iconName =
    variant === "success" ? "check" : variant === "info" ? "info" : "alert";

  return (
    <div
      role={variant === "error" || variant === "warning" ? "alert" : "status"}
      className={cn(
        "flex items-center justify-between gap-3 px-4 py-3 rounded-card border text-sm font-medium",
        styles[variant],
        className
      )}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon name={iconName} size={20} className="shrink-0" />
        <div className="min-w-0">{children}</div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};
