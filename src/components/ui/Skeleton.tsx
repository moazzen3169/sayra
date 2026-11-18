import React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, ...props }) => {
  return (
    <div
      aria-busy="true"
      className={cn("animate-pulse bg-[var(--foreground)]/60 rounded-card", className)}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div
    aria-busy="true"
    className={cn(
      "rounded-card bg-[var(--bg-card)] border border-[var(--border-subtle)] p-3 flex flex-col gap-3",
      className
    )}
  >
    <Skeleton className="w-full aspect-[16/10]" />
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-1/2" />
  </div>
);
