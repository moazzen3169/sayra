"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { TicketListPane } from "@/components/admin/tickets/TicketListPane";
import { TicketDetailPane } from "@/components/admin/tickets/TicketDetailPane";
import { AdminTicket, AdminUser, CannedResponse } from "@/types/admin";
import { adminService } from "@/services/adminService";
import { Icon } from "@/components/ui/Icon";

function SupportTicketContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialTicketId = searchParams.get("ticketId");

  // State for List & Filters
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [senderFilter, setSenderFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [needingResponseOnly, setNeedingResponseOnly] = useState(false);

  // Selected Ticket State
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTicketId);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);

  // Mobile View Toggle: 'list' | 'detail'
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // Metadata Stores
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);

  // Loaders & Processing States
  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(
    null
  );

  const showFeedback = (type: "success" | "danger", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Load Admin list & Canned responses on mount
  useEffect(() => {
    async function loadMeta() {
      try {
        const [adms, canned] = await Promise.all([
          adminService.getAdmins(),
          adminService.getCannedResponses(),
        ]);
        setAdminsList(adms);
        setCannedResponses(canned);
      } catch (err) {
        console.error("Failed to load ticket metadata", err);
      }
    }
    loadMeta();
  }, []);

  // Load Tickets List
  const loadTicketsList = useCallback(async () => {
    setIsListLoading(true);
    try {
      const res = await adminService.getTickets({
        search,
        status: statusFilter,
        senderType: senderFilter,
        assignedAdminId: assignedFilter,
        needingResponseOnly,
        page,
        pageSize: 10,
        sortBy: "lastUpdate",
        sortOrder: "desc",
      });
      setTickets(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);

      // Auto-select first ticket if none selected and on desktop
      if (!selectedTicketId && res.items.length > 0) {
        setSelectedTicketId(res.items[0].id);
      }
    } catch {
      showFeedback("danger", "خطا در دریافت لیست تیکت‌ها.");
    } finally {
      setIsListLoading(false);
    }
  }, [search, statusFilter, senderFilter, assignedFilter, needingResponseOnly, page, selectedTicketId]);

  useEffect(() => {
    loadTicketsList();
  }, [loadTicketsList]);

  // Load Active Ticket Details
  const loadSelectedTicket = useCallback(async () => {
    if (!selectedTicketId) {
      setSelectedTicket(null);
      return;
    }

    setIsDetailLoading(true);
    try {
      const tkt = await adminService.getTicketById(selectedTicketId);
      setSelectedTicket(tkt);
    } catch {
      showFeedback("danger", "خطا در دریافت جزئیات تیکت انتخابی.");
      setSelectedTicket(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, [selectedTicketId]);

  useEffect(() => {
    loadSelectedTicket();
  }, [loadSelectedTicket]);

  // Handle URL Ticket Parameter sync
  useEffect(() => {
    if (initialTicketId && initialTicketId !== selectedTicketId) {
      setSelectedTicketId(initialTicketId);
      setMobileView("detail");
    }
  }, [initialTicketId, selectedTicketId]);

  const handleSelectTicket = (tId: string) => {
    setSelectedTicketId(tId);
    setMobileView("detail");
    router.replace(`/admin/tickets?ticketId=${tId}`, { scroll: false });
  };

  // Actions
  const handleReply = async (message: string) => {
    if (!selectedTicketId) return;
    setIsSubmitting(true);
    try {
      const updated = await adminService.replyToTicket(selectedTicketId, message);
      setSelectedTicket(updated);
      showFeedback("success", "پاسخ شما با موفقیت به تیکت اضافه گردید.");
      loadTicketsList();
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در ارسال پاسخ تیکت.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (status: AdminTicket["status"]) => {
    if (!selectedTicketId) return;
    try {
      const updated = await adminService.updateTicketStatus(selectedTicketId, status);
      setSelectedTicket(updated);
      showFeedback("success", "وضعیت تیکت با موفقیت به‌روزرسانی شد.");
      loadTicketsList();
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در تغییر وضعیت تیکت.");
    }
  };

  const handleAssign = async (adminId: string | null) => {
    if (!selectedTicketId) return;
    try {
      const updated = await adminService.assignTicket(selectedTicketId, adminId);
      setSelectedTicket(updated);
      showFeedback("success", "مسئول جدید تیکت با موفقیت ثبت گردید.");
      loadTicketsList();
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در ارجاع تیکت.");
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full h-[calc(100vh-170px)] min-h-[600px]">
      {/* Header & Stats Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4 shrink-0">
        <div className="flex flex-col gap-1">
          <h1 className="text-page-title text-[var(--text-white)]">مرکز مدیریت تیکت‌ها</h1>
          <p className="text-secondary text-[var(--text-muted)]">
            پاسخ‌دهی سریع، مشاهده سابقه مکالمات، تغییر وضعیت و ارجاع تیکت‌های پشتیبانی کاربران و صاحبان گیمنت ({total} تیکت)
          </p>
        </div>

        {/* Mobile View Switcher */}
        <div className="flex lg:hidden items-center gap-2 bg-[var(--foreground)]/30 p-1 rounded-card border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              mobileView === "list"
                ? "bg-[var(--primary)] text-on-primary"
                : "text-[var(--text-muted)]"
            }`}
          >
            فهرست تیکت‌ها
          </button>
          <button
            type="button"
            onClick={() => setMobileView("detail")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              mobileView === "detail"
                ? "bg-[var(--primary)] text-on-primary"
                : "text-[var(--text-muted)]"
            }`}
          >
            محتوای تیکت
          </button>
        </div>
      </div>

      {/* Main Master-Detail Workspace Grid */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left / Sidebar Pane: Ticket List */}
        <div
          className={`w-full lg:w-[380px] lg:shrink-0 h-full ${
            mobileView === "list" ? "block" : "hidden lg:block"
          }`}
        >
          <TicketListPane
            tickets={tickets}
            selectedTicketId={selectedTicketId}
            onSelectTicket={handleSelectTicket}
            search={search}
            onSearchChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            statusFilter={statusFilter}
            onStatusFilterChange={(val) => {
              setStatusFilter(val);
              setPage(1);
            }}
            senderFilter={senderFilter}
            onSenderFilterChange={(val) => {
              setSenderFilter(val);
              setPage(1);
            }}
            assignedFilter={assignedFilter}
            onAssignedFilterChange={(val) => {
              setAssignedFilter(val);
              setPage(1);
            }}
            needingResponseOnly={needingResponseOnly}
            onNeedingResponseToggle={(val) => {
              setNeedingResponseOnly(val);
              setPage(1);
            }}
            adminsList={adminsList}
            isLoading={isListLoading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            total={total}
          />
        </div>

        {/* Main Content Pane: Ticket Workspace & Conversation */}
        <div
          className={`flex-1 h-full min-w-0 ${
            mobileView === "detail" ? "block" : "hidden lg:block"
          }`}
        >
          {/* Mobile Back Button */}
          <div className="lg:hidden mb-3">
            <button
              type="button"
              onClick={() => setMobileView("list")}
              className="text-xs font-bold text-[var(--primary)] flex items-center gap-1.5 p-2 rounded-lg bg-[var(--foreground)]/20 hover:bg-[var(--foreground)]/40 transition-colors"
            >
              <Icon name="back" size={16} />
              <span>بازگشت به فهرست تیکت‌ها</span>
            </button>
          </div>

          <TicketDetailPane
            ticket={selectedTicket}
            admins={adminsList}
            cannedResponses={cannedResponses}
            onReply={handleReply}
            onStatusChange={handleStatusChange}
            onAssign={handleAssign}
            isLoading={isDetailLoading}
            isSubmitting={isSubmitting}
            feedback={feedback}
          />
        </div>
      </div>
    </div>
  );
}

export default function TicketsAdminPage() {
  return (
    <AdminPageContainer>
      <Suspense
        fallback={
          <div className="p-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin" />
            <span>در حال بارگذاری مرکز تیکت‌ها...</span>
          </div>
        }
      >
        <SupportTicketContent />
      </Suspense>
    </AdminPageContainer>
  );
}
