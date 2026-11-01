import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type { CustomerNotification, NotificationUnreadCountResponse } from "@/types/customerApi";

export interface ListNotificationsParams {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
  signal?: AbortSignal;
}

export const customerNotificationService = {
  /**
   * دریافت نوتیفیکیشن‌های کاربر
   * GET /notifications
   */
  async listNotifications(params: ListNotificationsParams = {}): Promise<CustomerNotification[]> {
    const { signal, ...query } = params;
    const response = await apiClient.get<unknown>(ENDPOINTS.notifications.list, {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        isRead: query.isRead,
      },
      signal,
    });

    const resData = response.data;
    if (Array.isArray(resData)) {
      return resData as CustomerNotification[];
    }
    if (resData && typeof resData === "object" && Array.isArray((resData as any).data)) {
      return (resData as any).data as CustomerNotification[];
    }
    return [];
  },

  /**
   * دریافت تعداد پیام‌های خوانده‌نشده
   * GET /notifications/unread-count
   */
  async getUnreadCount(signal?: AbortSignal): Promise<number> {
    const response = await apiClient.get<unknown>(ENDPOINTS.notifications.unreadCount, {
      signal,
    });
    const resData = response.data;
    if (typeof resData === "number") {
      return resData;
    }
    if (resData && typeof resData === "object") {
      const candidate = (resData as any).count ?? (resData as any).unreadCount ?? (resData as any).data?.count;
      if (typeof candidate === "number") {
        return candidate;
      }
    }
    return 0;
  },

  /**
   * علامت‌گذاری نوتیفیکیشن به عنوان خوانده‌شده
   * PATCH /notifications/{id}/read
   */
  async markAsRead(id: string): Promise<void> {
    await apiClient.patch(ENDPOINTS.notifications.markRead(id));
  },
};
