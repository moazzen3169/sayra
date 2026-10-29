import React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled = false,
      className,
      children,
      type = "button",
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold rounded-card transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50 disabled:pointer-events-none select-none cursor-pointer";

    const variants = {
      primary: "bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-on-primary shadow-md",
      secondary: "bg-[var(--foreground)] hover:bg-[var(--foreground)]/80 text-[var(--text-white)] border border-[var(--border-subtle)]",
      ghost: "bg-transparent hover:bg-[var(--foreground)]/40 text-[var(--text-muted)] hover:text-[var(--text-white)]",
      danger: "bg-[var(--accent-red)]/10 hover:bg-[var(--accent-red)]/20 text-[var(--accent-red)] border border-[var(--accent-red)]/30",
    };

    const sizes = {
      sm: "h-9 px-3 text-xs",
      md: "h-11 px-4 text-sm",
      lg: "h-12 px-6 text-sm",
    };

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
            <span>در حال پردازش...</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
