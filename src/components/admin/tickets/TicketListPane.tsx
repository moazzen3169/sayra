"use client";

import React, { useState } from "react";
import { AdminTicket, AdminUser } from "@/types/admin";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import {
  SENDER_ROLE_LABEL,
  TICKET_STATUS_LABEL,
  TICKET_STATUS_VARIANT,
} from "./ticketLabels";

interface TicketListPaneProps {
  tickets: AdminTicket[];
  selectedTicketId: string | null;
  onSelectTicket: (ticketId: string) => void;
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: string;
  onStatusFilterChange: (val: string) => void;
  senderFilter: string;
  onSenderFilterChange: (val: string) => void;
  assignedFilter: string;
  onAssignedFilterChange: (val: string) => void;
  needingResponseOnly: boolean;
  onNeedingResponseToggle: (val: boolean) => void;
  adminsList: AdminUser[];
  isLoading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  total: number;
}

const selectClass =
  "h-10 w-full cursor-pointer rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 px-2 text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)]";

export function TicketListPane({
  tickets,
  selectedTicketId,
  onSelectTicket,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  senderFilter,
  onSenderFilterChange,
  assignedFilter,
  onAssignedFilterChange,
  needingResponseOnly,
  onNeedingResponseToggle,
  adminsList,
  isLoading,
  page,
  totalPages,
  onPageChange,
  total,
}: TicketListPaneProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const activeFilters =
    (statusFilter !== "all" ? 1 : 0) +
    (senderFilter !== "all" ? 1 : 0) +
    (assignedFilter !== "all" ? 1 : 0);

  const resetFilters = () => {
    onStatusFilterChange("all");
    onSenderFilterChange("all");
    onAssignedFilterChange("all");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-card border border-[var(--border-color)] bg-[var(--bg-card)]">
      {/* جست‌وجو و فیلتر */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-[var(--border-subtle)] p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--text-white)]">
            <Icon name="ticket" size={18} className="text-[var(--primary)]" />
            <span>تیکت‌ها</span>
            <span className="text-xs font-normal text-[var(--text-muted)]">
              ({total.toLocaleString("fa-IR")})
            </span>
          </h2>

          <button
            type="button"
            onClick={() => onNeedingResponseToggle(!needingResponseOnly)}
            aria-pressed={needingResponseOnly}
            className={`h-9 rounded-full border px-3 text-xs font-bold transition-colors ${
              needingResponseOnly
                ? "border-[var(--primary)] bg-[var(--primary)] text-on-primary"
                : "border-[var(--border-subtle)] bg-[var(--foreground)]/30 text-[var(--text-white)] hover:border-[var(--primary)]/60"
            }`}
          >
            نیازمند پاسخ
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative min-w-0 flex-1">
            <Icon
              name="search"
              size={16}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label="جست‌وجو در تیکت‌ها"
              placeholder="موضوع، شناسه یا نام فرستنده"
              className="h-10 w-full rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/40 pl-3 pr-9 text-xs text-[var(--text-white)] outline-none transition-colors placeholder:text-[var(--text-subtle)] focus:border-[var(--primary)]"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className={`flex h-10 shrink-0 items-center gap-1.5 rounded-card border px-3 text-xs font-bold transition-colors ${
              filtersOpen || activeFilters > 0
                ? "border-[var(--primary)] text-[var(--primary)]"
                : "border-[var(--border-subtle)] text-[var(--text-white)]"
            }`}
          >
            <Icon name="filter" size={16} />
            <span>فیلترها</span>
            {activeFilters > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--primary)] px-1 text-xs font-bold text-on-primary">
                {activeFilters.toLocaleString("fa-IR")}
              </span>
            )}
          </button>
        </div>

        {filtersOpen && (
          <div className="flex flex-col gap-3 rounded-card border border-[var(--border-subtle)] bg-[var(--foreground)]/20 p-3">
            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              وضعیت
              <select
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                className={selectClass}
              >
                <option value="all" className="bg-[var(--bg-card)]">
                  همه وضعیت‌ها
                </option>
                {(Object.keys(TICKET_STATUS_LABEL) as AdminTicket["status"][]).map((s) => (
                  <option key={s} value={s} className="bg-[var(--bg-card)]">
                    {TICKET_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              نوع فرستنده
              <select
                value={senderFilter}
                onChange={(e) => onSenderFilterChange(e.target.value)}
                className={selectClass}
              >
                <option value="all" className="bg-[var(--bg-card)]">
                  همه
                </option>
                <option value="USER" className="bg-[var(--bg-card)]">
                  {SENDER_ROLE_LABEL.USER}
                </option>
                <option value="OWNER" className="bg-[var(--bg-card)]">
                  {SENDER_ROLE_LABEL.OWNER}
                </option>
              </select>
            </label>

            <label className="flex flex-col gap-1 text-xs text-[var(--text-muted)]">
              مسئول رسیدگی
              <select
                value={assignedFilter}
                onChange={(e) => onAssignedFilterChange(e.target.value)}
                className={selectClass}
              >
                <option value="all" className="bg-[var(--bg-card)]">
                  همه
                </option>
                <option value="unassigned" className="bg-[var(--bg-card)]">
                  بدون مسئول
                </option>
                {adminsList.map((adm) => (
                  <option key={adm.id} value={adm.id} className="bg-[var(--bg-card)]">
                    {adm.fullName}
                  </option>
                ))}
              </select>
            </label>

            {activeFilters > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="self-start text-xs font-bold text-[var(--primary)] hover:underline"
              >
                حذف فیلترها
              </button>
            )}
          </div>
        )}
      </div>

      {/* لیست */}
      <div className="min-h-0 flex-1 divide-y divide-[var(--border-subtle)] overflow-y-auto overscroll-contain">
        {isLoading ? (
          <div
            className="flex flex-col items-center justify-center gap-2 p-8 text-center text-xs text-[var(--text-muted)]"
            aria-busy="true"
          >
            <div
              className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"
              aria-hidden="true"
            />
            <span>در حال بارگذاری تیکت‌ها...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-8 text-center text-xs text-[var(--text-muted)]">
            <Icon name="ticket" size={32} className="text-[var(--text-subtle)]" />
            <span className="text-sm font-bold text-[var(--text-white)]">تیکتی پیدا نشد</span>
            <span>فیلترها را تغییر دهید یا عبارت دیگری جست‌وجو کنید.</span>
          </div>
        ) : (
          tickets.map((ticket) => {
            const isSelected = selectedTicketId === ticket.id;
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => onSelectTicket(ticket.id)}
                aria-current={isSelected ? "true" : undefined}
                className={`flex w-full cursor-pointer flex-col gap-1.5 border-r-4 p-4 text-right transition-colors ${
                  isSelected
                    ? "border-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-transparent hover:bg-[var(--foreground)]/20"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-1 text-sm font-bold text-[var(--text-white)]">
                    {ticket.subject}
                  </span>
                  <Badge variant={TICKET_STATUS_VARIANT[ticket.status]} className="shrink-0">
                    {TICKET_STATUS_LABEL[ticket.status]}
                  </Badge>
                </div>

                <div className="flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                  <span className="truncate">
                    {ticket.userName ?? "کاربر ناشناس"}
                    {ticket.userRole === "OWNER" && " (صاحب گیمنت)"}
                  </span>
                  <span className="shrink-0">{ticket.lastUpdate}</span>
                </div>

                {(ticket.priority === "HIGH" || !ticket.assignedAdminId) && (
                  <div className="flex items-center gap-3 text-xs">
                    {ticket.priority === "HIGH" && (
                      <span className="font-bold text-[var(--accent-red)]">فوری</span>
                    )}
                    {!ticket.assignedAdminId && (
                      <span className="text-[var(--text-muted)]">بدون مسئول</span>
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* صفحه‌بندی */}
      {totalPages > 1 && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-[var(--foreground)]/10 p-3">
          <span className="text-xs text-[var(--text-muted)]">
            صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
            >
              قبلی
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
            >
              بعدی
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}