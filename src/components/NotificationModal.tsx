"use client";

import React, { useState } from "react";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  isUnread: boolean;
  type?: "system" | "discount" | "reservation";
  linkUrl?: string;
}

export interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications?: NotificationItem[];
  onMarkAllAsRead?: () => void;
  onNotificationClick?: (notification: NotificationItem) => void;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "notif-1",
    title: "تخفیف ویژه آخر هفته! 🔥",
    message: "تا ۳۰٪ تخفیف برای رزرو صندلی‌های VIP گیمنت گرگدن فعال شد. کد تخفیف: WEEKEND30",
    timestamp: "۱۰ دقیقه پیش",
    isUnread: true,
    type: "discount",
  },
  {
    id: "notif-2",
    title: "تایید رزرو سانس رزرو شده",
    message: "رزرو شما در گیم‌کلاب سایبرسکی برای امروز ساعت ۱۸:۰۰ با موفقیت ثبت شد.",
    timestamp: "۲ ساعت پیش",
    isUnread: true,
    type: "reservation",
  },
  {
    id: "notif-3",
    title: "دستگاه‌های جدید اضافه شد! 🎮",
    message: "کنسول‌های جدید PS5 Slim با جدیدترین بازی‌های روز در سیستم سایرا آماده رزرو هستند.",
    timestamp: "دیروز",
    isUnread: false,
    type: "system",
  },
  {
    id: "notif-4",
    title: "یادآوری رزرو قریب‌الوقوع",
    message: "سانس گیمینگ شما نیم ساعت دیگر در مجموعه وی‌آر پلاس آغاز می‌شود.",
    timestamp: "۲ روز پیش",
    isUnread: false,
    type: "reservation",
  },
];

export const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  notifications: initialNotifications = DEFAULT_NOTIFICATIONS,
  onMarkAllAsRead,
  onNotificationClick,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [activeFilter, setActiveFilter] = useState<"all" | "unread">("all");

  if (!isOpen) return null;

  const handleMarkAll = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isUnread: false })));
    if (onMarkAllAsRead) onMarkAllAsRead();
  };

  const handleItemClick = (item: NotificationItem) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === item.id ? { ...n, isUnread: false } : n))
    );
    if (onNotificationClick) onNotificationClick(item);
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "unread") return n.isUnread;
    return true;
  });

  const unreadCount = notifications.filter((n) => n.isUnread).length;

  return (
    <div className="fixed inset-0 z-50 bg-[var(--bg-body)] flex flex-col animate-fadeIn">
      {/* Top Header */}
      <div className="sticky top-0 z-10 w-full max-w-[780px] lg:max-w-[880px] mx-auto bg-[var(--bg-card)] border-b border-[var(--border-color)] px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-[var(--foreground)]/50 text-[var(--text-white)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-[#101014] transition-colors"
            aria-label="بستن"
          >
            <svg className="w-5 h-5 transform rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-black text-[var(--text-white)]">اعلانات سایرا</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-[var(--primary)] text-[#101014] text-xs font-black">
                {unreadCount} جدید
              </span>
            )}
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            className="text-xs font-extrabold text-[var(--primary)] hover:underline"
          >
            علامت به عنوان خوانده شده
          </button>
        )}
      </div>

      {/* Content Body */}
      <div className="flex-1 w-full max-w-[780px] lg:max-w-[880px] mx-auto overflow-y-auto px-4 py-4 flex flex-col gap-4">
        {/* Filters */}
        <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] pb-3">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === "all"
                ? "bg-[var(--primary)] text-[#101014]"
                : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-white)] border border-[var(--border-subtle)]"
            }`}
          >
            همه اعلانات ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("unread")}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeFilter === "unread"
                ? "bg-[var(--primary)] text-[#101014]"
                : "bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-white)] border border-[var(--border-subtle)]"
            }`}
          >
            خوانده‌نشده ({unreadCount})
          </button>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-subtle)]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4a2 2 0 01-.6-1.4V11a6 6 0 00-4-5.66V5a2 2 0 10-4 0v.34C7.67 6.17 6 8.39 6 11v3.2c0 .54-.21 1.05-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <p className="text-sm font-extrabold text-[var(--text-white)]">هیچ اعلانی یافت نشد</p>
            <p className="text-xs text-[var(--text-muted)]">پیام‌ها و اطلاعیه‌های سایرا در این بخش نمایش داده می‌شوند.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredNotifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-4 rounded-card border transition-all cursor-pointer flex flex-col gap-2 relative ${
                  item.isUnread
                    ? "bg-[var(--bg-card)] border-[var(--primary)]/40 shadow-md"
                    : "bg-[var(--bg-card)]/60 border-[var(--border-subtle)] hover:border-[var(--border-color)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {item.type === "discount" && (
                      <span className="w-2 h-2 rounded-full bg-[var(--primary)]" />
                    )}
                    {item.type === "reservation" && (
                      <span className="w-2 h-2 rounded-full bg-[var(--accent-green)]" />
                    )}
                    {item.type === "system" && (
                      <span className="w-2 h-2 rounded-full bg-[var(--text-muted)]" />
                    )}
                    <h3 className="text-sm font-black text-[var(--text-white)]">{item.title}</h3>
                  </div>
                  <span className="text-[11px] text-[var(--text-subtle)]">{item.timestamp}</span>
                </div>

                <p className="text-xs text-[var(--text-muted)] leading-relaxed pl-4">{item.message}</p>

                {item.isUnread && (
                  <span className="absolute left-3 bottom-3 w-2 h-2 rounded-full bg-[var(--primary)]" />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
