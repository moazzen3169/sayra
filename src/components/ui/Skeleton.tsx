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
