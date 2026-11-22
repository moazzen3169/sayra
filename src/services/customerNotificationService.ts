import { apiClient } from "@/lib/api/client";
import { AUTH_USER_KEY } from "@/lib/api/config";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { getAccessToken } from "@/lib/token";
import {
  ContractGapError,
  type ApiMeta,
  type CustomerNotification,
  type NotificationCategory,
  type NotificationScope,
  type NotificationType,
} from "@/types/customerApi";

export const NOTIFICATIONS_REFRESH_EVENT = "sayra:notifications-refresh";

/**
 * Notify active UI notification listeners (customer Header, OwnerHeader, NotificationModal)
 * to fetch the latest notifications and unread count.
 */
export function triggerNotificationsRefresh(): void {
  if (typeof window === "undefined" || typeof window.dispatchEvent !== "function") {
    return;
  }
  try {
    window.dispatchEvent(new CustomEvent(NOTIFICATIONS_REFRESH_EVENT));
  } catch {
    // Ignore in non-DOM test environments
  }
}

export interface ListNotificationsParams {
  page?: number;
  pageSize?: number;
  isRead?: boolean;
  category?: NotificationCategory;
  type?: NotificationType;
  scope?: NotificationScope;
  signal?: AbortSignal;
}

export interface PaginatedNotificationsResult {
  items: CustomerNotification[];
  unreadCount?: number;
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  meta?: ApiMeta;
}

export interface LatestNotificationsResult {
  all: CustomerNotification[];
  unread: CustomerNotification[];
  unreadCount: number;
}

function parseJwtRoleFromToken(token: string | null): { role?: string; actorType?: string } {
  if (!token) return {};
  try {
    const parts = token.split(".");
    if (parts.length < 2) return {};
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    const parsed = JSON.parse(json) as { role?: string; actorType?: string };
    return {
      role: parsed.role?.toUpperCase(),
      actorType: parsed.actorType?.toUpperCase(),
    };
  } catch {
    return {};
  }
}

/**
 * Resolves whether the current session should call /customer/notifications (customer)
 * or /notifications (staff/manager/admin).
 */
export function resolveNotificationScope(explicitScope?: NotificationScope): NotificationScope {
  if (explicitScope) return explicitScope;

  if (typeof localStorage !== "undefined") {
    try {
      const rawUser = localStorage.getItem(AUTH_USER_KEY);
      if (rawUser) {
        const parsed = JSON.parse(rawUser) as { role?: string; actorType?: string };
        const role = parsed.role?.toUpperCase();
        const actorType = parsed.actorType?.toUpperCase();
        if (role === "MANAGER" || role === "ADMIN" || role === "STAFF" || actorType === "USER") {
          return "staff";
        }
        if (role === "USER" || actorType === "CUSTOMER") {
          return "customer";
        }
      }
    } catch {
      // Ignore malformed stored user
    }
  }

  const jwtInfo = parseJwtRoleFromToken(getAccessToken());
  if (
    jwtInfo.role === "MANAGER" ||
    jwtInfo.role === "ADMIN" ||
    jwtInfo.role === "STAFF" ||
    jwtInfo.actorType === "USER"
  ) {
    return "staff";
  }

  return "customer";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function extractNotificationsPayload(resData: unknown): {
  items: CustomerNotification[];
  unreadCount?: number;
  nestedMeta?: ApiMeta;
} {
  if (Array.isArray(resData)) {
    return { items: resData as CustomerNotification[] };
  }

  if (isRecord(resData)) {
    // Customer endpoint envelope: data = { items: [...], unreadCount: number }
    if (Array.isArray(resData.items)) {
      return {
        items: resData.items as CustomerNotification[],
        unreadCount: typeof resData.unreadCount === "number" ? resData.unreadCount : undefined,
        nestedMeta: isRecord(resData.meta) ? (resData.meta as ApiMeta) : undefined,
      };
    }

    // Nested data object or array
    if (Array.isArray(resData.data)) {
      return {
        items: resData.data as CustomerNotification[],
        nestedMeta: isRecord(resData.meta) ? (resData.meta as ApiMeta) : undefined,
      };
    }

    if (isRecord(resData.data) && Array.isArray(resData.data.items)) {
      return {
        items: resData.data.items as CustomerNotification[],
        unreadCount:
          typeof resData.data.unreadCount === "number"
            ? resData.data.unreadCount
            : undefined,
        nestedMeta: isRecord(resData.meta) ? (resData.meta as ApiMeta) : undefined,
      };
    }
  }

  return { items: [] };
}

function extractUnreadCount(resData: unknown): number | undefined {
  if (typeof resData === "number") return resData;
  if (!isRecord(resData)) return undefined;

  if (typeof resData.unreadCount === "number") return resData.unreadCount;
  if (typeof resData.count === "number") return resData.count;

  if (isRecord(resData.data)) {
    if (typeof resData.data.unreadCount === "number") return resData.data.unreadCount;
    if (typeof resData.data.count === "number") return resData.data.count;
  }
  return undefined;
}

export const customerNotificationService = {
  /**
   * دریافت نوتیفیکیشن‌ها بر اساس نقش کاربر:
   * - مشتری: GET /customer/notifications
   * - مدیر / پرسنل: GET /notifications
   */
  async listNotifications(params: ListNotificationsParams = {}): Promise<CustomerNotification[]> {
    const paginated = await customerNotificationService.listPaginated(params);
    return paginated.items;
  },

  /**
   * دریافت نوتیفیکیشن‌ها همراه با متادیتا صفحه‌بندی
   */
  async listPaginated(params: ListNotificationsParams = {}): Promise<PaginatedNotificationsResult> {
    const { signal, scope, ...query } = params;
    const resolvedScope = resolveNotificationScope(scope);

    const endpoint =
      resolvedScope === "customer"
        ? ENDPOINTS.customerNotifications.list
        : ENDPOINTS.notifications.list;

    const requestQuery =
      resolvedScope === "customer"
        ? {
            page: query.page,
            pageSize: query.pageSize,
          }
        : {
            page: query.page,
            pageSize: query.pageSize,
            ...(query.isRead !== undefined ? { isRead: query.isRead } : {}),
            ...(query.category ? { category: query.category } : {}),
            ...(query.type ? { type: query.type } : {}),
          };

    const response = await apiClient.get<unknown>(endpoint, {
      query: requestQuery,
      signal,
    });

    const parsed = extractNotificationsPayload(response.data);
    const items =
      resolvedScope === "customer" && query.isRead !== undefined
        ? parsed.items.filter((item) => item.isRead === query.isRead)
        : parsed.items;

    const meta = response.meta || parsed.nestedMeta;
    const pagination = meta?.pagination;

    return {
      items,
      unreadCount: parsed.unreadCount,
      total: pagination?.total ?? pagination?.totalItems ?? items.length,
      page: pagination?.page ?? query.page ?? 1,
      pageSize: pagination?.pageSize ?? pagination?.limit ?? query.pageSize ?? items.length,
      totalPages: pagination?.totalPages ?? 1,
      meta,
    };
  },

  /**
   * دریافت تعداد پیام‌های خوانده‌نشده:
   * - مشتری: از GET /customer/notifications?page=1&pageSize=1 (فیلد unreadCount)
   * - مدیر / پرسنل: از GET /notifications/unread-count
   */
  async getUnreadCount(signal?: AbortSignal, scope?: NotificationScope): Promise<number> {
    const resolvedScope = resolveNotificationScope(scope);

    if (resolvedScope === "customer") {
      const paginated = await customerNotificationService.listPaginated({
        page: 1,
        pageSize: 1,
        scope: "customer",
        signal,
      });
      if (typeof paginated.unreadCount === "number") {
        return paginated.unreadCount;
      }
      return paginated.items.filter((item) => !item.isRead).length;
    }

    const response = await apiClient.get<unknown>(ENDPOINTS.notifications.unreadCount, {
      signal,
    });
    return extractUnreadCount(response.data) ?? 0;
  },

  /**
   * دریافت همزمان آخرین اعلانات، اعلانات خوانده‌نشده و تعداد خوانده‌نشده
   */
  async fetchLatestNotifications(
    params: Omit<ListNotificationsParams, "isRead"> = {}
  ): Promise<LatestNotificationsResult> {
    const { signal, scope, ...rest } = params;
    const resolvedScope = resolveNotificationScope(scope);
    const pageSize = rest.pageSize ?? 50;

    if (resolvedScope === "customer") {
      const result = await customerNotificationService.listPaginated({
        page: rest.page ?? 1,
        pageSize,
        scope: "customer",
        signal,
      });
      const all = result.items;
      const unread = all.filter((item) => !item.isRead);
      const unreadCount =
        typeof result.unreadCount === "number" ? result.unreadCount : unread.length;
      return { all, unread, unreadCount };
    }

    const [all, unread, unreadCount] = await Promise.all([
      customerNotificationService.listNotifications({
        ...rest,
        page: rest.page ?? 1,
        pageSize,
        scope: "staff",
        signal,
      }),
      customerNotificationService.listNotifications({
        ...rest,
        page: 1,
        pageSize,
        isRead: false,
        scope: "staff",
        signal,
      }),
      customerNotificationService.getUnreadCount(signal, "staff"),
    ]);

    return { all, unread, unreadCount };
  },

  /**
   * علامت‌گذاری نوتیفیکیشن به عنوان خوانده‌شده:
   * - مشتری: PATCH /customer/notifications/{id}/read
   * - مدیر / پرسنل: PATCH /notifications/{id}/read
   */
  async markAsRead(id: string, scope?: NotificationScope): Promise<void> {
    if (!id || typeof id !== "string") {
      throw new Error("شناسه اعلان نامعتبر است.");
    }
    const resolvedScope = resolveNotificationScope(scope);
    const endpoint =
      resolvedScope === "customer"
        ? ENDPOINTS.customerNotifications.markRead(id)
        : ENDPOINTS.notifications.markRead(id);

    await apiClient.patch(endpoint);
  },

  /**
   * [CONTRACT GAP] علامت‌گذاری تمامی اعلانات به عنوان خوانده‌شده
   */
  async markAllAsRead(): Promise<void> {
    throw new ContractGapError(
      "NotificationMarkAllAsRead",
      "Bulk marking all notifications as read is not supported in OpenAPI v1.0-LOCKED. Update notifications individually via PATCH /notifications/{id}/read or PATCH /customer/notifications/{id}/read."
    );
  },

  /**
   * [CONTRACT GAP] حذف نوتیفیکیشن
   */
  async deleteNotification(): Promise<void> {
    throw new ContractGapError(
      "NotificationDelete",
      "Notification deletion is not supported in OpenAPI v1.0-LOCKED."
    );
  },

  /**
   * [CONTRACT GAP] سیستم پیام مستقیم کاربر به کاربر / کاربر به مرکز بازی
   */
  async sendDirectMessage(): Promise<void> {
    throw new ContractGapError(
      "DirectMessaging",
      "Direct messaging inbox is not supported in OpenAPI v1.0-LOCKED. Customer support communication is handled exclusively via /tickets."
    );
  },
};
