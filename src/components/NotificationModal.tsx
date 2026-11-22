"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  customerNotificationService,
  NOTIFICATIONS_REFRESH_EVENT,
} from "@/services/customerNotificationService";
import type {
  CustomerNotification,
  NotificationCategory,
  NotificationScope,
} from "@/types/customerApi";
import { formatRelativeNotificationTime } from "@/lib/dates";
import { toPersianDigits } from "@/lib/format";
import { ModalShell } from "./ModalShell";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isUnread: boolean;
  type?: "system" | "discount" | "reservation";
  category?: NotificationCategory;
  linkUrl?: string;
}

export interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: NotificationItem[];
  category?: NotificationCategory;
  scope?: NotificationScope;
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: NotificationItem) => void;
  onUnreadCountChange?: (count: number) => void;
}

function mapBackendType(type?: string): "system" | "discount" | "reservation" {
  if (!type) return "system";
  if (
    type.startsWith("RESERVATION_") ||
    type.startsWith("GAME_CENTER_BOOKING_") ||
    type.startsWith("WAITLIST_") ||
    type.startsWith("PAYMENT_")
  ) {
    return "reservation";
  }
  if (type.includes("DISCOUNT") || type.includes("PROMO")) return "discount";
  return "system";
}

function mapNotificationItem(item: CustomerNotification): NotificationItem {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    timestamp: formatRelativeNotificationTime(item.createdAt),
    isUnread: !item.isRead,
    type: mapBackendType(item.type),
    category: item.category,
  };
}

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications: propsNotifications,
  category,
  scope,
  onMarkAllAsRead,
  onNotificationClick,
  onUnreadCountChange,
}) => {
  const { isLoggedIn } = useAuth();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationItem[]>([]);
  const [serverUnreadCount, setServerUnreadCount] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    if (!isLoggedIn) {
      setNotifications([]);
      setUnreadNotifications([]);
      setServerUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { all, unread, unreadCount } =
        await customerNotificationService.fetchLatestNotifications({
          pageSize: 50,
          category,
          scope,
        });

      const mappedAll = all.map(mapNotificationItem);
      const mappedUnread = unread.map(mapNotificationItem);

      setNotifications(mappedAll);
      setUnreadNotifications(mappedUnread);

      const resolvedUnread =
        typeof unreadCount === "number" ? unreadCount : mappedUnread.length;
      setServerUnreadCount(resolvedUnread);
      onUnreadCountChange?.(resolvedUnread);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "خطا در دریافت اعلانات.";
      setError(message || "خطا در دریافت اعلانات.");
    } finally {
      setIsLoading(false);
    }
  }, [isLoggedIn, category, scope, onUnreadCountChange]);

  useEffect(() => {
    if (!isOpen) return;

    if (propsNotifications !== undefined) {
      setNotifications(propsNotifications);
      setUnreadNotifications(propsNotifications.filter((n) => n.isUnread));
      setServerUnreadCount(null);
      setIsLoading(false);
      setError(null);
    } else {
      fetchNotifications();
    }
  }, [isOpen, propsNotifications, fetchNotifications]);

  useEffect(() => {
    if (!isOpen || propsNotifications !== undefined) return;
    const handleRefresh = () => {
      fetchNotifications();
    };
    window.addEventListener(NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
    return () => {
      window.removeEventListener(NOTIFICATIONS_REFRESH_EVENT, handleRefresh);
    };
  }, [isOpen, propsNotifications, fetchNotifications]);

  const handleMarkAll = async () => {
    const unreadMap = new Map<string, NotificationItem>();
    for (const item of unreadNotifications) unreadMap.set(item.id, item);
    for (const item of notifications) {
      if (item.isUnread) unreadMap.set(item.id, item);
    }
    const unreadItems = Array.from(unreadMap.values());

    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    setUnreadNotifications([]);
    setServerUnreadCount(0);
    onUnreadCountChange?.(0);
    onMarkAllAsRead?.();

    try {
      await Promise.allSettled(
        unreadItems.map((item) => customerNotificationService.markAsRead(item.id, scope))
      );
    } catch {
      // Best-effort sync
    }
  };

  const handleItemClick = async (item: NotificationItem) => {
    if (item.isUnread) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, isUnread: false } : n))
      );
      setUnreadNotifications((prev) => prev.filter((n) => n.id !== item.id));

      const nextUnreadCount =
        serverUnreadCount !== null
          ? Math.max(0, serverUnreadCount - 1)
          : Math.max(
              0,
              unreadNotifications.filter((n) => n.id !== item.id).length
            );
      setServerUnreadCount(nextUnreadCount);
      onUnreadCountChange?.(nextUnreadCount);

      try {
        await customerNotificationService.markAsRead(item.id, scope);
      } catch {
        // silent
      }
    }
    if (onNotificationClick) onNotificationClick(item);
  };

  const filteredNotifications =
    activeFilter === "unread" ? unreadNotifications : notifications;

  const unreadCount =
    serverUnreadCount !== null ? serverUnreadCount : unreadNotifications.length;

  const headerTitle = (
    <div className="flex min-w-0 items-center gap-2">
      <h2 className="truncate text-base font-bold text-[var(--text-white)]">
        اعلانات سایرا
      </h2>
      {unreadCount > 0 && (
        <span className="shrink-0 rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-bold text-on-primary">
          {toPersianDigits(unreadCount)} جدید
        </span>
      )}
    </div>
  );

  const headerActions =
    unreadCount > 0 ? (
      <button
        type="button"
        onClick={handleMarkAll}
        className="whitespace-nowrap text-xs font-bold text-[var(--primary)] hover:underline"
      >
        علامت خوانده‌شده
      </button>
    ) : null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="اعلانات سایرا"
      title={headerTitle}
      headerActions={headerActions}
      disableAutoFocus
    >
      <div className="mx-auto flex w-full max-w-[var(--max-mini-app-width)] flex-col gap-4 px-4 py-4 sm:px-6 sm:py-5">
        {/* Filters */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              activeFilter === "all"
                ? "bg-[var(--primary)] text-on-primary"
                : "border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-white)]"
            }`}
          >
            همه اعلانات ({toPersianDigits(notifications.length)})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("unread")}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              activeFilter === "unread"
                ? "bg-[var(--primary)] text-on-primary"
                : "border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-white)]"
            }`}
          >
            خوانده‌نشده ({toPersianDigits(unreadCount)})
          </button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-3 py-4">
            <div className="h-20 animate-pulse rounded-card bg-[var(--bg-card)]" />
            <div className="h-20 animate-pulse rounded-card bg-[var(--bg-card)]" />
            <div className="h-20 animate-pulse rounded-card bg-[var(--bg-card)]" />
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="flex flex-col gap-2 rounded-card border border-[var(--accent-red)]/30 bg-[var(--accent-red)]/10 p-4 text-right">
            <p className="text-xs font-bold text-[var(--accent-red)]">{error}</p>
            <button
              type="button"
              onClick={fetchNotifications}
              className="self-end text-xs font-bold text-[var(--primary)] hover:underline"
            >
              تلاش مجدد
            </button>
          </div>
        )}

        {/* List / Empty */}
        {!isLoading && !error && filteredNotifications.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-subtle)]">
              <svg
                className="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.6}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34C7.67 6.17 6 8.39 6 11v3.2c0 .54-.21 1.05-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <p className="text-sm font-bold text-[var(--text-white)]">
              {!isLoggedIn
                ? "برای مشاهده اعلانات وارد حساب شوید"
                : "هیچ اعلانی یافت نشد"}
            </p>
            <p className="text-xs text-[var(--text-muted)]">
              {!isLoggedIn
                ? "جهت دریافت پیام‌ها و اطلاعیه‌های رزرو، ابتدا وارد حساب کاربری خود شوید."
                : "پیام‌ها و اطلاعیه‌های سایرا در این بخش نمایش داده می‌شوند."}
            </p>
          </div>
        ) : !isLoading && !error ? (
          <div className="flex flex-col gap-3">
            {filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`relative flex cursor-pointer flex-col gap-2 rounded-card border p-4 transition-all ${
                  item.isUnread
                    ? "border-[var(--primary)]/40 bg-[var(--bg-card)] shadow-md"
                    : "border-[var(--border-subtle)] bg-[var(--bg-card)]/60 hover:border-[var(--border-color)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.type === "discount" && (
                      <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
                    )}
                    {item.type === "reservation" && (
                      <span className="h-2 w-2 rounded-full bg-[var(--accent-green)]" />
                    )}
                    {item.type === "system" && (
                      <span className="h-2 w-2 rounded-full bg-[var(--text-muted)]" />
                    )}
                    <h3 className="text-sm font-bold text-[var(--text-white)]">
                      {item.title}
                    </h3>
                  </div>
                  <span className="text-xs text-[var(--text-subtle)]">
                    {item.timestamp}
                  </span>
                </div>

                <p className="pl-4 text-xs leading-relaxed text-[var(--text-muted)]">
                  {item.message}
                </p>

                {item.isUnread && (
                  <span className="absolute bottom-3 left-3 h-2 w-2 rounded-full bg-[var(--primary)]" />
                )}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </ModalShell>
  );
};