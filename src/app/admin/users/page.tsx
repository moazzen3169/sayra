"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminDataTable, Column } from "@/components/admin/AdminDataTable";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { UserFormModal } from "@/components/admin/users/UserFormModal";
import { DeleteConfirmationModal } from "@/components/admin/gamecenters/DeleteConfirmationModal";
import { AdminUser } from "@/types/admin";
import { adminService } from "@/services/adminService";

export default function UsersAdminPage() {
  const [data, setData] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals & Actions
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [deletingRelatedInfo, setDeletingRelatedInfo] = useState<{
    ticketsCount?: number;
    reviewsCount?: number;
    reservationsCount?: number;
  }>({});

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(
    null
  );

  const showFeedback = (type: "success" | "danger", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await adminService.getUsers({
        search,
        status: statusFilter,
        role: roleFilter,
        sortBy,
        sortOrder,
        page,
        pageSize: 10,
      });
      setData(res.items);
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  }, [search, statusFilter, roleFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleToggleStatus = async (user: AdminUser) => {
    try {
      const updated = await adminService.toggleUserStatus(user.id);
      showFeedback(
        "success",
        `وضعیت حساب «${updated.fullName}» به ${updated.isActive ? "فعال" : "غیرفعال"} تغییر یافت.`
      );
      loadUsers();
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در تغییر وضعیت کاربر.");
    }
  };

  const handleOpenDeleteModal = async (user: AdminUser) => {
    setDeletingUser(user);
    try {
      const [tickets, reviews, reservations] = await Promise.all([
        adminService.getUserTickets(user.id),
        adminService.getUserReviews(user.id),
        adminService.getUserReservations(user.id),
      ]);
      setDeletingRelatedInfo({
        ticketsCount: tickets.length,
        reviewsCount: reviews.length,
        reservationsCount: reservations.length,
      });
    } catch {
      setDeletingRelatedInfo({});
    }
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingUser) return;
    await adminService.deleteUser(deletingUser.id);
    showFeedback("success", `حساب کاربر «${deletingUser.fullName}» با موفقیت حذف شد.`);
    loadUsers();
  };

  const getRoleBadge = (role: AdminUser["role"]) => {
    switch (role) {
      case "ADMIN":
        return <Badge variant="primary">مدیر سیستم</Badge>;
      case "OWNER":
        return <Badge variant="warning">صاحب گیمنت</Badge>;
      case "USER":
      default:
        return <Badge variant="neutral">کاربر عادی</Badge>;
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: "fullName",
      header: "نام و نام خانوادگی",
      render: (u) => (
        <div className="flex flex-col gap-0.5">
          <Link
            href={`/admin/users/${u.id}`}
            className="font-bold text-sm text-[var(--text-white)] hover:text-[var(--primary)] transition-colors"
          >
            {u.fullName}
          </Link>
          <span className="text-xs text-[var(--text-subtle)] dir-ltr text-right">{u.id}</span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "شماره همراه / ایمیل",
      render: (u) => (
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-[var(--text-white)] dir-ltr text-right">
            {u.phone}
          </span>
          {u.email ? (
            <span className="text-xs text-[var(--text-muted)] dir-ltr text-right truncate max-w-[180px]">
              {u.email}
            </span>
          ) : (
            <span className="text-xs text-[var(--text-subtle)]">-</span>
          )}
        </div>
      ),
    },
    {
      key: "role",
      header: "نقش کاربر",
      render: (u) => getRoleBadge(u.role),
    },
    {
      key: "status",
      header: "وضعیت حساب",
      render: (u) => (
        <button
          type="button"
          onClick={() => handleToggleStatus(u)}
          title="جهت تغییر سریع وضعیت کلیک کنید"
          className="focus:outline-none cursor-pointer"
        >
          {u.isActive ? (
            <Badge variant="success">فعال</Badge>
          ) : (
            <Badge variant="danger">غیرفعال</Badge>
          )}
        </button>
      ),
    },
    {
      key: "createdAt",
      header: "تاریخ ثبت‌نام",
      render: (u) => (
        <span className="text-xs text-[var(--text-muted)]">{u.createdAt}</span>
      ),
    },
    {
      key: "actions",
      header: "عملیات",
      className: "text-left",
      render: (u) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            href={`/admin/users/${u.id}`}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--foreground)]/40 transition-colors"
            title="مشاهده جزئیات کامل حساب"
          >
            <Icon name="info" size={18} />
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditingUser(u);
              setIsFormModalOpen(true);
            }}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] hover:bg-[var(--foreground)]/40 transition-colors"
            title="ویرایش کاربر"
          >
            <Icon name="user" size={18} />
          </button>
          <button
            type="button"
            onClick={() => handleOpenDeleteModal(u)}
            className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:bg-[var(--foreground)]/40 transition-colors"
            title="حذف کاربر"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <AdminPageContainer>
      <div className="flex flex-col gap-6 w-full">
        {/* Header Title & Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-page-title text-[var(--text-white)]">مدیریت کاربران</h1>
            <p className="text-secondary text-[var(--text-muted)]">
              مشاهده لیست کامل، ثبت کاربر جدید، ویرایش اطلاعات، مدیریت نقش‌ها و وضعیت فعال‌سازی ({total} کاربر)
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingUser(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center gap-2 shrink-0"
          >
            <Icon name="user" size={18} />
            <span>ایجاد کاربر جدید</span>
          </Button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`p-4 rounded-card text-xs font-bold flex items-center gap-2 transition-all ${
              feedback.type === "success"
                ? "bg-[var(--accent-green)]/15 border border-[var(--accent-green)]/30 text-[var(--accent-green)]"
                : "bg-[var(--accent-red)]/15 border border-[var(--accent-red)]/30 text-[var(--accent-red)]"
            }`}
          >
            <Icon name={feedback.type === "success" ? "check" : "alert"} size={18} />
            <span>{feedback.message}</span>
          </div>
        )}

        {/* Filter Bar */}
        <AdminFilterBar
          searchValue={search}
          onSearchChange={(val) => {
            setSearch(val);
            setPage(1);
          }}
          searchPlaceholder="جستجو نام، تلفن، ایمیل یا کد ملی..."
        >
          {/* Role Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">نقش:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-card)]">همه نقش‌ها</option>
              <option value="USER" className="bg-[var(--bg-card)]">کاربران عادی</option>
              <option value="OWNER" className="bg-[var(--bg-card)]">صاحبان گیمنت</option>
              <option value="ADMIN" className="bg-[var(--bg-card)]">مدیران سیستم</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">وضعیت:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-card)]">همه وضعیت‌ها</option>
              <option value="active" className="bg-[var(--bg-card)]">فقط فعال</option>
              <option value="inactive" className="bg-[var(--bg-card)]">فقط غیرفعال</option>
            </select>
          </div>

          {/* Sorting */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">مرتب‌سازی:</span>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                setSortBy(sb);
                setSortOrder(so as "asc" | "desc");
              }}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="createdAt-desc" className="bg-[var(--bg-card)]">جدیدترین</option>
              <option value="createdAt-asc" className="bg-[var(--bg-card)]">قدیمی‌ترین</option>
              <option value="fullName-asc" className="bg-[var(--bg-card)]">نام (الف تا ی)</option>
            </select>
          </div>
        </AdminFilterBar>

        {/* Data Table */}
        <AdminDataTable
          columns={columns}
          data={data}
          keyExtractor={(item) => item.id}
          isLoading={isLoading}
          isError={isError}
          onRetry={loadUsers}
          emptyTitle="کاربری یافت نشد"
          emptyDescription="با توجه به فیلترهای اعمال‌شده، هیچ کاربری یافت نگردید."
        />

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[var(--text-muted)]">
              نمایش صفحه {page} از {totalPages} (مجموع {total} کاربر)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                قبلی
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pNum) => (
                <button
                  key={pNum}
                  type="button"
                  onClick={() => setPage(pNum)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
                    pNum === page
                      ? "bg-[var(--primary)] text-on-primary"
                      : "bg-[var(--foreground)]/30 text-[var(--text-muted)] hover:text-white"
                  }`}
                >
                  {pNum}
                </button>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                بعدی
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Form Modal */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={editingUser}
        onSuccess={() => {
          showFeedback(
            "success",
            editingUser ? "اطلاعات کاربر با موفقیت ویرایش شد." : "کاربر جدید با موفقیت ایجاد گردید."
          );
          loadUsers();
        }}
      />

      {/* Delete Confirmation Modal */}
      {deletingUser && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingUser(null);
          }}
          itemTitle={deletingUser.fullName}
          itemType="user"
          relatedInfo={deletingRelatedInfo}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </AdminPageContainer>
  );
}
