import React, { ReactNode } from "react";
import { Input } from "@/components/ui/Input";

export interface AdminFilterBarProps {
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  children?: ReactNode;
  className?: string;
}

export const AdminFilterBar: React.FC<AdminFilterBarProps> = ({
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "جستجو...",
  children,
  className = "",
}) => {
  return (
    <div
      className={`bg-card-bg border border-border rounded-card p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 ${className}`}
    >
      {onSearchChange ? (
        <div className="w-full md:w-80">
          <Input
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
          />
        </div>
      ) : (
        <div />
      )}

      {children && (
        <div className="flex flex-wrap items-center gap-3">{children}</div>
      )}
    </div>
  );
};
