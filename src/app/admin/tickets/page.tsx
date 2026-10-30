"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
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

  // لیست و فیلترها
  const [tickets, setTickets] = useState<AdminTicket[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [senderFilter, setSenderFilter] = useState("all");
  const [assignedFilter, setAssignedFilter] = useState("all");
  const [needingResponseOnly, setNeedingResponseOnly] = useState(false);

  // تیکت انتخاب‌شده
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialTicketId);
  const [selectedTicket, setSelectedTicket] = useState<AdminTicket | null>(null);
  // برای جلوگیری از دریافت دوباره‌ی لیست با هر بار انتخاب تیکت
  const selectedIdRef = useRef<string | null>(initialTicketId);

  // نمای موبایل: لیست یا جزئیات
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");

  // داده‌های جانبی
  const [adminsList, setAdminsList] = useState<AdminUser[]>([]);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);

  const [isListLoading, setIsListLoading] = useState(true);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(
    null
  );

  const showFeedback = useCallback((type: "success" | "danger", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  const selectTicket = useCallback((id: string | null) => {
    selectedIdRef.current = id;
    setSelectedTicketId(id);
  }, []);

  // مدیران و پاسخ‌های آماده
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

  // لیست تیکت‌ها
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

      // انتخاب خودکار اولین تیکت فقط وقتی هیچ تیکتی انتخاب نشده است
      if (!selectedIdRef.current && res.items.length > 0) {
        selectTicket(res.items[0].id);
      }
    } catch {
      showFeedback("danger", "دریافت فهرست تیکت‌ها انجام نشد. دوباره تلاش کنید.");
    } finally {
      setIsListLoading(false);
    }
  }, [
    search,
    statusFilter,
    senderFilter,
    assignedFilter,
    needingResponseOnly,
    page,
    selectTicket,
    showFeedback,
  ]);

  useEffect(() => {
    loadTicketsList();
  }, [loadTicketsList]);

  // جزئیات تیکت انتخاب‌شده
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
      showFeedback("danger", "دریافت جزئیات تیکت انجام نشد. دوباره تلاش کنید.");
      setSelectedTicket(null);
    } finally {
      setIsDetailLoading(false);
    }
  }, [selectedTicketId, showFeedback]);

  useEffect(() => {
    loadSelectedTicket();
  }, [loadSelectedTicket]);

  // همگام‌سازی با پارامتر ticketId در آدرس (مثلاً لینک از صفحه‌ی کاربر یا گیمنت)
  useEffect(() => {
    if (initialTicketId) {
      selectedIdRef.current = initialTicketId;
      setSelectedTicketId(initialTicketId);
      setMobileView("detail");
    }
  }, [initialTicketId]);

  const handleSelectTicket = (tId: string) => {
    selectTicket(tId);
    setMobileView("detail");
    router.replace(`/admin/tickets?ticketId=${tId}`, { scroll: false });
  };

  // عملیات
  const handleReply = async (message: string) => {
    if (!selectedTicketId) return;
    setIsSubmitting(true);
    try {
      const updated = await adminService.replyToTicket(selectedTicketId, message);
      setSelectedTicket(updated);
      showFeedback("success", "پاسخ شما ثبت شد.");
      loadTicketsList();
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "ارسال پاسخ انجام نشد. دوباره تلاش کنید.");
      throw e; // تا متن پاسخ در کادر حفظ شود
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (status: AdminTicket["status"]) => {
    if (!selectedTicketId) return;
    try {
      const updated = await adminService.updateTicketStatus(selectedTicketId, status);
      setSelectedTicket(updated);
      showFeedback("success", "وضعیت تیکت تغییر کرد.");
      loadTicketsList();
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "تغییر وضعیت انجام نشد. دوباره تلاش کنید.");
    }
  };

  const handleAssign = async (adminId: string | null) => {
    if (!selectedTicketId) return;
    try {
      const updated = await adminService.assignTicket(selectedTicketId, adminId);
      setSelectedTicket(updated);
      showFeedback("success", "مسئول تیکت ثبت شد.");
      loadTicketsList();
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "ارجاع تیکت انجام نشد. دوباره تلاش کنید.");
      throw e;
    }
  };

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[560px] w-full flex-col gap-4">
      {/* عنوان صفحه */}


      {/* فضای اصلی: لیست + مکالمه */}
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden">
        <div
          className={`h-full w-full lg:w-[360px] lg:shrink-0 ${
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

        <div
          className={`flex h-full min-w-0 flex-1 flex-col gap-2 ${
            mobileView === "detail" ? "flex" : "hidden lg:flex"
          }`}
        >
          <button
            type="button"
            onClick={() => setMobileView("list")}
            className="flex h-11 shrink-0 items-center gap-1.5 self-start text-xs font-bold text-[var(--primary)] lg:hidden"
          >
            <Icon name="back" size={16} />
            <span>بازگشت به فهرست</span>
          </button>

          <div className="min-h-0 flex-1">
            <TicketDetailPane
              key={selectedTicketId ?? "none"}
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
    </div>
  );
}

export default function TicketsAdminPage() {
  return (
    <AdminPageContainer>
      <Suspense
        fallback={
          <div
            className="flex flex-col items-center justify-center gap-2 p-8 text-center text-xs text-[var(--text-muted)]"
            aria-busy="true"
          >
            <div
              className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"
              aria-hidden="true"
            />
            <span>در حال بارگذاری تیکت‌ها...</span>
          </div>
        }
      >
        <SupportTicketContent />
      </Suspense>
    </AdminPageContainer>
  );
}