"use client";

import React from "react";
import { AdminTicket, AdminUser } from "@/types/admin";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";

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
  const getStatusBadge = (status: AdminTicket["status"]) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="danger">جدید / باز</Badge>;
      case "PENDING":
        return <Badge variant="warning">در حال بررسی</Badge>;
      case "ANSWERED":
        return <Badge variant="success">پاسخ داده شده</Badge>;
      case "CLOSED":
        return <Badge variant="neutral">بسته شده</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: AdminTicket["priority"]) => {
    switch (priority) {
      case "HIGH":
        return (
          <span className="text-[10px] font-bold text-[var(--accent-red)] bg-[var(--accent-red)]/10 px-1.5 py-0.5 rounded">
            فوری
          </span>
        );
      case "MEDIUM":
        return (
          <span className="text-[10px] font-bold text-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 px-1.5 py-0.5 rounded">
            متوسط
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="text-[10px] font-medium text-[var(--text-muted)] bg-[var(--foreground)]/30 px-1.5 py-0.5 rounded">
            عادی
          </span>
        );
    }
  };

  const getSenderRoleBadge = (role?: "USER" | "OWNER") => {
    if (role === "OWNER") {
      return (
        <span className="text-[10px] font-bold text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/20">
          صاحب گیمنت
        </span>
      );
    }
    return (
      <span className="text-[10px] font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded">
        کاربر عادی
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full border border-[var(--border-color)] bg-[var(--bg-card)] rounded-card overflow-hidden">
      {/* Header & Quick Tab */}
      <div className="p-4 border-b border-[var(--border-subtle)] flex flex-col gap-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon name="ticket" size={20} className="text-[var(--primary)]" />
            <h2 className="font-bold text-sm text-[var(--text-white)]">فهرست تیکت‌ها</h2>
            <span className="text-xs text-[var(--text-muted)] dir-ltr">({total})</span>
          </div>

          <button
            type="button"
            onClick={() => onNeedingResponseToggle(!needingResponseOnly)}
            className={`text-xs font-bold px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 border ${
              needingResponseOnly
                ? "bg-[var(--accent-red)]/20 border-[var(--accent-red)] text-[var(--accent-red)]"
                : "bg-[var(--foreground)]/30 border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-white"
            }`}
            title="فقط تیکت‌های باز و در انتظار پاسخ پشتیبانی"
          >
            <span className="w-2 h-2 rounded-full bg-[var(--accent-red)] inline-block animate-pulse" />
            <span>نیازمند پاسخ</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="جستجو موضوع، شناسه، فرستنده، رزرو..."
            className="w-full h-9 pr-9 pl-3 rounded-lg bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] placeholder-[var(--text-subtle)] outline-none focus:border-[var(--primary)] transition-colors"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] pointer-events-none">
            <Icon name="search" size={16} />
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          {/* Status Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--text-muted)]">وضعیت:</span>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="h-8 px-1.5 rounded-lg bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-[11px] text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-card)]">همه وضعیت‌ها</option>
              <option value="OPEN" className="bg-[var(--bg-card)]">باز / جدید</option>
              <option value="PENDING" className="bg-[var(--bg-card)]">در حال بررسی</option>
              <option value="ANSWERED" className="bg-[var(--bg-card)]">پاسخ داده شده</option>
              <option value="CLOSED" className="bg-[var(--bg-card)]">بسته شده</option>
            </select>
          </div>

          {/* Sender Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--text-muted)]">نوع فرستنده:</span>
            <select
              value={senderFilter}
              onChange={(e) => onSenderFilterChange(e.target.value)}
              className="h-8 px-1.5 rounded-lg bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-[11px] text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-card)]">همه انواع</option>
              <option value="USER" className="bg-[var(--bg-card)]">کاربر عادی</option>
              <option value="OWNER" className="bg-[var(--bg-card)]">صاحب گیمنت</option>
            </select>
          </div>

          {/* Assigned Filter */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-[var(--text-muted)]">مسئول:</span>
            <select
              value={assignedFilter}
              onChange={(e) => onAssignedFilterChange(e.target.value)}
              className="h-8 px-1.5 rounded-lg bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-[11px] text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer truncate"
            >
              <option value="all" className="bg-[var(--bg-card)]">همه مسئولین</option>
              <option value="unassigned" className="bg-[var(--bg-card)]">بدون مسئول</option>
              {adminsList.map((adm) => (
                <option key={adm.id} value={adm.id} className="bg-[var(--bg-card)]">
                  {adm.fullName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ticket List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-[var(--border-subtle)] min-h-0">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <span>در حال بارگذاری تیکت‌ها...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="p-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2">
            <Icon name="ticket" size={32} className="text-[var(--text-subtle)]" />
            <span className="font-bold text-[var(--text-white)]">تیکتی یافت نشد</span>
            <span className="text-[11px]">با توجه به فیلترهای اعمال‌شده، هیچ تیکتی وجود ندارد.</span>
          </div>
        ) : (
          tickets.map((ticket) => {
            const isSelected = selectedTicketId === ticket.id;
            return (
              <button
                key={ticket.id}
                type="button"
                onClick={() => onSelectTicket(ticket.id)}
                className={`w-full text-right p-3.5 transition-colors flex flex-col gap-2 cursor-pointer ${
                  isSelected
                    ? "bg-[var(--primary)]/15 border-r-4 border-[var(--primary)]"
                    : "hover:bg-[var(--foreground)]/20"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[var(--primary)] dir-ltr">
                    #{ticket.id}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {getPriorityBadge(ticket.priority)}
                    {getStatusBadge(ticket.status)}
                  </div>
                </div>

                <span className="font-bold text-xs text-[var(--text-white)] line-clamp-1 leading-snug">
                  {ticket.subject}
                </span>

                <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--text-muted)]">
                  <div className="flex items-center gap-1.5 overflow-hidden">
                    <span className="truncate font-medium text-[var(--text-white)]">
                      {ticket.userName || "کاربر ناشناس"}
                    </span>
                    {getSenderRoleBadge(ticket.userRole)}
                  </div>
                  <span className="shrink-0 text-[10px] text-[var(--text-subtle)]">
                    {ticket.lastUpdate}
                  </span>
                </div>

                {/* Sub info: Gamecenter / Assigned */}
                <div className="flex items-center justify-between gap-2 text-[10px] text-[var(--text-subtle)] pt-0.5">
                  {ticket.gamecenterName ? (
                    <span className="truncate">مرکز: {ticket.gamecenterName}</span>
                  ) : (
                    <span>عمومی</span>
                  )}

                  {ticket.assignedAdminName ? (
                    <span className="truncate text-indigo-300">
                      مسئول: {ticket.assignedAdminName}
                    </span>
                  ) : (
                    <span className="text-amber-500/80">بدون مسئول</span>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--foreground)]/10 flex items-center justify-between text-xs shrink-0">
          <span className="text-[11px] text-[var(--text-muted)]">
            صفحه {page} از {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-2 h-7 text-[11px]"
            >
              قبلی
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-2 h-7 text-[11px]"
            >
              بعدی
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
