import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import {
  ContractGapError,
  type ApiMeta,
  type CustomerNotification,
} from "@/types/customerApi";

export interface ListNotificationsParams {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
  signal?: AbortSignal;
}

export interface PaginatedNotificationsResult {
  items: CustomerNotification[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  meta?: ApiMeta;
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
   * دریافت نوتیفیکیشن‌های کاربر همراه با متادیتا صفحه‌بندی
   * GET /notifications
   */
  async listPaginated(params: ListNotificationsParams = {}): Promise<PaginatedNotificationsResult> {
    const { signal, ...query } = params;
    const response = await apiClient.get<unknown>(ENDPOINTS.notifications.list, {
      query: {
        page: query.page,
        pageSize: query.pageSize,
        isRead: query.isRead,
      },
      signal,
    });

    let items: CustomerNotification[] = [];
    const resData = response.data;
    if (Array.isArray(resData)) {
      items = resData as CustomerNotification[];
    } else if (resData && typeof resData === "object" && Array.isArray((resData as any).data)) {
      items = (resData as any).data as CustomerNotification[];
    }

    const meta = response.meta || (resData && typeof resData === "object" ? (resData as any).meta : undefined);
    const pagination = meta?.pagination;

    return {
      items,
      total: pagination?.total ?? pagination?.totalItems ?? items.length,
      page: pagination?.page ?? query.page ?? 1,
      pageSize: pagination?.pageSize ?? pagination?.limit ?? query.pageSize ?? items.length,
      totalPages: pagination?.totalPages ?? 1,
      meta,
    };
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
    if (!id || typeof id !== "string") {
      throw new Error("شناسه اعلان نامعتبر است.");
    }
    await apiClient.patch(ENDPOINTS.notifications.markRead(id));
  },

  /**
   * [CONTRACT GAP] علامت‌گذاری تمامی اعلانات به عنوان خوانده‌شده
   * در نسخه فعلی OpenAPI v1.0-LOCKED اندپوینت تکی یا دسته‌ای اختصاصی وجود ندارد.
   */
  async markAllAsRead(): Promise<void> {
    throw new ContractGapError(
      "NotificationMarkAllAsRead",
      "Bulk marking all notifications as read is not supported in OpenAPI v1.0-LOCKED. Update notifications individually via PATCH /notifications/{id}/read."
    );
  },

  /**
   * [CONTRACT GAP] حذف نوتیفیکیشن
   */
  async deleteNotification(_id: string): Promise<void> {
    throw new ContractGapError(
      "NotificationDelete",
      "Notification deletion is not supported in OpenAPI v1.0-LOCKED."
    );
  },

  /**
   * [CONTRACT GAP] سیستم پیام مستقیم کاربر به کاربر / کاربر به مرکز بازی
   */
  async sendDirectMessage(_recipientId: string, _message: string): Promise<void> {
    throw new ContractGapError(
      "DirectMessaging",
      "Direct messaging inbox is not supported in OpenAPI v1.0-LOCKED. Customer support communication is handled exclusively via /tickets."
    );
  },
};
