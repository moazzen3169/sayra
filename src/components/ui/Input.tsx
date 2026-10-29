import React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className, id, ...props }, ref) => {
    const inputId = id || (label ? `input-${label.replace(/\s+/g, "-")}` : undefined);

    return (
      <div className="flex flex-col gap-1 w-full">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold text-[var(--text-muted)]">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "h-11 px-3.5 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-sm text-[var(--text-white)] placeholder:text-[var(--text-subtle)] outline-none focus:border-[var(--primary)] transition-colors disabled:opacity-50",
            error && "border-[var(--accent-red)] focus:border-[var(--accent-red)]",
            className
          )}
          {...props}
        />
        {error ? (
          <span className="text-xs font-medium text-[var(--accent-red)]">{error}</span>
        ) : helperText ? (
          <span className="text-xs text-[var(--text-muted)]">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

Input.displayName = "Input";
