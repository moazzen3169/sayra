"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminPageContainer } from "@/components/admin/layout/AdminPageContainer";
import { AdminDataTable, Column } from "@/components/admin/AdminDataTable";
import { AdminFilterBar } from "@/components/admin/AdminFilterBar";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { BlogPostFormModal } from "@/components/admin/blog/BlogPostFormModal";
import { BlogPostPreviewModal } from "@/components/admin/blog/BlogPostPreviewModal";
import { BlogPostDeleteModal } from "@/components/admin/blog/BlogPostDeleteModal";
import type { BlogPostDetail, BlogPostStatus, BlogCategory } from "@/types/blog";
import { adminService } from "@/services/adminService";

export default function BlogAdminPage() {
  const [data, setData] = useState<BlogPostDetail[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Modals & Actions
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPostDetail | null>(null);

  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewingPost, setPreviewingPost] = useState<BlogPostDetail | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState<BlogPostDetail | null>(null);

  // Feedback Notification
  const [feedback, setFeedback] = useState<{ type: "success" | "danger"; message: string } | null>(
    null
  );

  const showFeedback = (type: "success" | "danger", message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4000);
  };

  useEffect(() => {
    adminService.getBlogCategories().then(setCategories).catch(console.warn);
  }, []);

  const loadPosts = useCallback(async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await adminService.getBlogPosts({
        search,
        status: statusFilter,
        category: categoryFilter,
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
  }, [search, statusFilter, categoryFilter, sortBy, sortOrder, page]);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  const handleUpdateStatus = async (post: BlogPostDetail, newStatus: BlogPostStatus) => {
    try {
      const updated = await adminService.updateBlogPostStatus(post.id, newStatus);
      const statusText =
        newStatus === "PUBLISHED"
          ? "منتشرشده"
          : newStatus === "DRAFT"
          ? "پیش‌نویس"
          : "بایگانی‌شده";
      showFeedback("success", `وضعیت مقاله «${updated.title}» به ${statusText} تغییر یافت.`);
      loadPosts();
    } catch (err: unknown) {
      const e = err as Error;
      showFeedback("danger", e.message || "خطا در تغییر وضعیت مقاله.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingPost) return;
    await adminService.deleteBlogPost(deletingPost.id);
    showFeedback("success", `مقاله «${deletingPost.title}» با موفقیت حذف گردید.`);
    loadPosts();
  };

  const getStatusBadge = (status?: BlogPostStatus) => {
    switch (status) {
      case "PUBLISHED":
        return <Badge variant="success">منتشرشده</Badge>;
      case "DRAFT":
        return <Badge variant="warning">پیش‌نویس</Badge>;
      case "ARCHIVED":
        return <Badge variant="neutral">بایگانی‌شده</Badge>;
      default:
        return <Badge variant="success">منتشرشده</Badge>;
    }
  };

  const columns: Column<BlogPostDetail>[] = [
    {
      key: "title",
      header: "عنوان و شناسه مقاله",
      render: (p) => (
        <div className="flex flex-col gap-0.5 max-w-[280px]">
          <button
            type="button"
            onClick={() => {
              setPreviewingPost(p);
              setIsPreviewModalOpen(true);
            }}
            className="font-bold text-sm text-[var(--text-white)] hover:text-[var(--primary)] transition-colors text-right truncate cursor-pointer"
          >
            {p.title}
          </button>
          <span className="text-xs text-[var(--text-subtle)] dir-ltr text-right truncate">
            /blog/{p.slug}
          </span>
        </div>
      ),
    },
    {
      key: "category",
      header: "دسته‌بندی",
      render: (p) => (
        <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-[var(--foreground)]/50 text-[var(--text-white)] border border-[var(--border-subtle)]">
          {p.categoryLabel || "عمومی"}
        </span>
      ),
    },
    {
      key: "authorName",
      header: "نویسنده",
      render: (p) => (
        <span className="text-xs text-[var(--text-muted)] font-medium">
          {p.authorName || "تحریریه‌ی سایرا"}
        </span>
      ),
    },
    {
      key: "status",
      header: "وضعیت",
      render: (p) => (
        <div className="flex items-center gap-1">
          {getStatusBadge(p.status)}
          {p.featured && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-[var(--accent-star)]/20 text-[var(--accent-star)]">
              ویژه
            </span>
          )}
        </div>
      ),
    },
    {
      key: "dates",
      header: "تاریخ انتشار / بروزرسانی",
      render: (p) => {
        const displayDate = p.publishedAt
          ? new Date(p.publishedAt).toLocaleDateString("fa-IR")
          : p.createdAt
          ? new Date(p.createdAt).toLocaleDateString("fa-IR")
          : "-";
        return <span className="text-xs text-[var(--text-muted)]">{displayDate}</span>;
      },
    },
    {
      key: "actions",
      header: "عملیات",
      className: "text-left",
      render: (p) => (
        <div className="flex items-center justify-end gap-1">
          {/* Quick Status Transitions */}
          {p.status !== "PUBLISHED" && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(p, "PUBLISHED")}
              className="px-2 py-1 rounded text-xs bg-[var(--accent-green)]/15 text-[var(--accent-green)] hover:bg-[var(--accent-green)]/30 transition-colors font-bold"
              title="انتشار مقاله"
            >
              انتشار
            </button>
          )}

          {p.status === "PUBLISHED" && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(p, "ARCHIVED")}
              className="px-2 py-1 rounded text-xs bg-[var(--foreground)]/40 text-[var(--text-muted)] hover:text-white transition-colors"
              title="بایگانی مقاله"
            >
              بایگانی
            </button>
          )}

          {p.status === "ARCHIVED" && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(p, "DRAFT")}
              className="px-2 py-1 rounded text-xs bg-[var(--accent-warning)]/15 text-[var(--accent-warning)] hover:bg-[var(--accent-warning)]/30 transition-colors font-bold"
              title="بازگردانی به پیش‌نویس"
            >
              پیش‌نویس
            </button>
          )}

          {/* Preview button */}
          <button
            type="button"
            onClick={() => {
              setPreviewingPost(p);
              setIsPreviewModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--foreground)]/40 transition-colors cursor-pointer"
            title="پیش‌نمایش مقاله"
          >
            <Icon name="info" size={18} />
          </button>

          {/* View on public site (if published) */}
          {p.status === "PUBLISHED" && (
            <Link
              href={`/blog/${p.slug}`}
              target="_blank"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--foreground)]/40 transition-colors"
              title="مشاهده در وبلاگ عمومی"
            >
              <Icon name="chevron" size={18} className="rotate-180" />
            </Link>
          )}

          {/* Edit button */}
          <button
            type="button"
            onClick={() => {
              setEditingPost(p);
              setIsFormModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-white)] hover:bg-[var(--foreground)]/40 transition-colors cursor-pointer"
            title="ویرایش مقاله"
          >
            <Icon name="user" size={18} />
          </button>

          {/* Delete button */}
          <button
            type="button"
            onClick={() => {
              setDeletingPost(p);
              setIsDeleteModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-red)] hover:bg-[var(--foreground)]/40 transition-colors cursor-pointer"
            title="حذف مقاله"
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
            <h1 className="text-page-title text-[var(--text-white)]">مدیریت وبلاگ و محتوا</h1>
            <p className="text-secondary text-[var(--text-muted)]">
              ایجاد، ویرایش، پیش‌نمایش، انتشار و مدیریت مقالات، اخبار و راهنماهای پلتفرم سایرا ({total} مقاله)
            </p>
          </div>
          <Button
            variant="primary"
            onClick={() => {
              setEditingPost(null);
              setIsFormModalOpen(true);
            }}
            className="flex items-center gap-2 shrink-0"
          >
            <Icon name="user" size={18} />
            <span>ایجاد مقاله جدید</span>
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
          searchPlaceholder="جستجو عنوان، شناسه، چکیده، نویسنده یا برچسب‌ها..."
        >
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
              <option value="PUBLISHED" className="bg-[var(--bg-card)]">منتشرشده</option>
              <option value="DRAFT" className="bg-[var(--bg-card)]">پیش‌نویس</option>
              <option value="ARCHIVED" className="bg-[var(--bg-card)]">بایگانی‌شده</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] font-medium">دسته‌بندی:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="h-10 px-3 rounded-card bg-[var(--foreground)]/40 border border-[var(--border-subtle)] text-xs text-[var(--text-white)] outline-none focus:border-[var(--primary)] cursor-pointer"
            >
              <option value="all" className="bg-[var(--bg-card)]">همه دسته‌ها</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id} className="bg-[var(--bg-card)]">
                  {c.label}
                </option>
              ))}
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
              <option value="createdAt-desc" className="bg-[var(--bg-card)]">جدیدترین تاریخ ثبت</option>
              <option value="createdAt-asc" className="bg-[var(--bg-card)]">قدیمی‌ترین تاریخ ثبت</option>
              <option value="publishedAt-desc" className="bg-[var(--bg-card)]">جدیدترین تاریخ انتشار</option>
              <option value="title-asc" className="bg-[var(--bg-card)]">عنوان (الف تا ی)</option>
              <option value="viewsCount-desc" className="bg-[var(--bg-card)]">پربازدیدترین</option>
              <option value="readingMinutes-asc" className="bg-[var(--bg-card)]">کوتاه‌ترین زمان مطالعه</option>
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
          onRetry={loadPosts}
          emptyTitle="مقاله‌ای یافت نشد"
          emptyDescription="با توجه به فیلترهای انتخاب‌شده، هیچ مقاله‌ای در وبلاگ یافت نگردید."
        />

        {/* Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[var(--text-muted)]">
              نمایش صفحه {page} از {totalPages} (مجموع {total} مقاله)
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
                  className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
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

      {/* Create / Edit Form Modal */}
      <BlogPostFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        initialData={editingPost}
        onSuccess={() => {
          showFeedback(
            "success",
            editingPost ? "اطلاعات مقاله با موفقیت بروزرسانی شد." : "مقاله جدید با موفقیت ذخیره گردید."
          );
          loadPosts();
        }}
      />

      {/* Live Preview Modal */}
      <BlogPostPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setPreviewingPost(null);
        }}
        post={previewingPost}
      />

      {/* Delete Confirmation Modal */}
      {deletingPost && (
        <BlogPostDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingPost(null);
          }}
          postTitle={deletingPost.title}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </AdminPageContainer>
  );
}
