import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  loadingLabel?: string;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingLabel,
      disabled = false,
      className,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex items-center justify-center font-bold rounded-card transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

    const variants = {
      primary: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary",
      secondary: "bg-[var(--foreground)] hover:bg-[var(--foreground)]/80 text-[var(--text-white)] border border-[var(--border-subtle)]",
      ghost: "bg-transparent hover:bg-[var(--foreground)]/40 text-[var(--text-muted)] hover:text-[var(--text-white)]",
      danger: "bg-[var(--accent-red)]/10 hover:bg-[var(--accent-red)]/20 text-[var(--accent-red)] border border-[var(--accent-red)]/30",
    };

    const sizes = {
      sm: "h-10 px-3 text-xs after:content-[''] after:absolute after:-inset-y-0.5 after:inset-x-0",
      md: "h-11 px-4 text-sm",
      lg: "h-12 px-6 text-sm",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        <span className="grid place-items-center">
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center justify-center gap-2",
              isLoading && "invisible"
            )}
          >
            {children}
          </span>
          {isLoading && (
            <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2 whitespace-nowrap">
              <span
                className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin"
                aria-hidden="true"
              />
              <span>{loadingLabel ?? "در حال ثبت…"}</span>
            </span>
          )}
        </span>
      </button>
    );
  }
);

Button.displayName = "Button";
