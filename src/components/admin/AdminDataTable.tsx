import React, { ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T, index: number) => ReactNode;
}

export interface AdminDataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T, index: number) => string | number;
  isLoading?: boolean;
  isError?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
}

export function AdminDataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  isError = false,
  errorMessage = "خطا در دریافت اطلاعات جدول",
  onRetry,
  emptyTitle = "داده‌ای برای نمایش وجود ندارد",
  emptyDescription = "در حال حاضر آیتمی برای این بخش ثبت نشده است.",
  className = "",
}: AdminDataTableProps<T>) {
  if (isError) {
    return (
      <div className="bg-card-bg border border-border rounded-card p-6">
        <ErrorState description={errorMessage} onRetry={onRetry} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`bg-card-bg border border-border rounded-card overflow-hidden ${className}`}>
        <div className="p-4 border-b border-border-subtle flex gap-4">
          {columns.map((col, idx) => (
            <Skeleton key={idx} className="h-5 flex-1" />
          ))}
        </div>
        <div className="p-4 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              {columns.map((_, colIdx) => (
                <Skeleton key={colIdx} className="h-6 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className={`bg-card-bg border border-border rounded-card p-6 ${className}`}>
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
        />
      </div>
    );
  }

  return (
    <div className={`bg-card-bg border border-border rounded-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse text-body">
          <thead>
            <tr className="border-b border-border bg-foreground/20 text-text-muted text-secondary">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3.5 px-4 font-bold ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {data.map((item, index) => (
              <tr
                key={keyExtractor(item, index)}
                className="hover:bg-foreground/10 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-3.5 px-4 text-text-white whitespace-nowrap ${
                      col.className || ""
                    }`}
                  >
                    {col.render
                      ? col.render(item, index)
                      : (item as Record<string, unknown>)[col.key] !== undefined
                      ? String((item as Record<string, unknown>)[col.key])
                      : "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
