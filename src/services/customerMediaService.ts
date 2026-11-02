import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { ContractGapError } from "@/types/customerApi";
import type { PublicMediaItem, CustomerFileUploadOptions } from "@/types/customerApi";

export const CUSTOMER_ATTACHMENT_MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB default threshold

export const DEFAULT_ALLOWED_ATTACHMENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
];

/**
 * Validate customer file upload parameters against type and size limits before transmission.
 */
export function validateCustomerFile(
  file: File | Blob,
  options?: CustomerFileUploadOptions
): void {
  if (!file) {
    throw new Error("فایلی برای آپلود انتخاب نشده است.");
  }

  const maxBytes = options?.maxSizeBytes ?? CUSTOMER_ATTACHMENT_MAX_SIZE_BYTES;
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    throw new Error(`حجم فایل نباید بیشتر از ${maxMb} مگابایت باشد.`);
  }

  const allowedTypes = options?.allowedTypes ?? DEFAULT_ALLOWED_ATTACHMENT_TYPES;
  if (file.type && allowedTypes.length > 0) {
    const normalizedFileType = file.type.split(";")[0].trim().toLowerCase();
    const isAllowed = allowedTypes.some(
      (t) => t.toLowerCase() === normalizedFileType || t.toLowerCase() === file.type.toLowerCase()
    );
    if (!isAllowed) {
      throw new Error("فرمت فایل انتخابی مجاز نمی‌باشد.");
    }
  }
}

/**
 * Customer Media and File Operations Service (Phase 20).
 *
 * Implements documented customer media retrieval and file upload actions:
 * - Public media reading: GET /public/gamingCenters/{slug}/media
 * - Customer ticket attachment upload: POST /tickets/{ticketId}/attachments (multipart/form-data)
 *
 * Missing customer operations in OpenAPI v1.0-LOCKED (Contract Gaps):
 * - Customer file deletion: DELETE /tickets/{ticketId}/attachments/{id} or /media/{id}
 * - Customer profile avatar upload: POST /customer/me/avatar
 * - Reservation media attachments: POST /customer/reservation/{id}/media
 * - Review media attachments: POST /customer/reservation/{id}/ratings/media
 */
export const customerMediaService = {
  /**
   * دریافت رسانه‌های عمومی یک مرکز بازی
   * GET /public/gamingCenters/{slug}/media
   */
  async getPublicMedia(slug: string, signal?: AbortSignal): Promise<PublicMediaItem[]> {
    if (!slug) return [];
    const response = await apiClient.get<unknown>(ENDPOINTS.gamingCenter.media(slug), { signal });
    const resData = response.data;
    if (Array.isArray(resData)) {
      return resData as PublicMediaItem[];
    }
    if (resData && typeof resData === "object" && Array.isArray((resData as any).data)) {
      return (resData as any).data as PublicMediaItem[];
    }
    return [];
  },

  /**
   * آپلود پیوست تیکت پشتیبانی کاربر
   * POST /tickets/{ticketId}/attachments (multipart/form-data, binary field 'file')
   */
  async uploadTicketAttachment(
    ticketId: string,
    file: File,
    options?: CustomerFileUploadOptions
  ): Promise<string> {
    if (!ticketId) {
      throw new Error("شناسه تیکت نامعتبر است.");
    }

    validateCustomerFile(file, options);

    const formData = new FormData();
    formData.append("file", file);

    const response = await apiClient.post<unknown>(
      ENDPOINTS.tickets.attachments(ticketId),
      formData
    );

    const resData = response.data as any;
    if (resData && typeof resData === "object") {
      if (typeof resData.url === "string") return resData.url;
      if (resData.data && typeof resData.data.url === "string") return resData.data.url;
      if (typeof resData.attachment === "string") return resData.attachment;
      if (typeof resData.data === "string") return resData.data;
    }
    if (typeof resData === "string") return resData;

    throw new Error("آدرس فایل پیوست در پاسخ سرور یافت نشد.");
  },

  /**
   * حذف فایل یا پیوست توسط مشتری
   * (در OpenAPI v1.0-LOCKED هیچ اندپوینتی برای حذف فایل توسط مشتری تعریف نشده است)
   */
  async deleteCustomerFileUnsupported(_fileIdOrUrl: string): Promise<never> {
    throw new ContractGapError(
      "CustomerFileDelete",
      "DELETE operations for customer attachments or media are not defined in OpenAPI v1.0-LOCKED."
    );
  },

  /**
   * آپلود تصویر پروفایل/آواتار مشتری
   * (در OpenAPI v1.0-LOCKED هیچ اندپوینتی برای آواتار مشتری تعریف نشده است)
   */
  async uploadCustomerAvatarUnsupported(_file: File): Promise<never> {
    throw new ContractGapError(
      "CustomerAvatarUpload",
      "POST /customer/me/avatar is not defined in OpenAPI v1.0-LOCKED. Customer schema does not support avatarUrl."
    );
  },

  /**
   * پیوست رسانه به رزرو مشتری
   * (در OpenAPI v1.0-LOCKED هیچ اندپوینتی برای پیوست رسانه به رزرو تعریف نشده است)
   */
  async attachReservationMediaUnsupported(_reservationId: string, _file: File): Promise<never> {
    throw new ContractGapError(
      "CustomerReservationMedia",
      "Customer reservation media attachments are not defined in OpenAPI v1.0-LOCKED."
    );
  },

  /**
   * پیوست رسانه به نظر/امتیاز مشتری
   * (در OpenAPI v1.0-LOCKED هیچ اندپوینتی برای تصاویر نظر تعریف نشده است)
   */
  async attachReviewMediaUnsupported(_reservationId: string, _file: File): Promise<never> {
    throw new ContractGapError(
      "CustomerReviewMedia",
      "Media attachments for customer reviews/ratings are not defined in OpenAPI v1.0-LOCKED."
    );
  },
};
