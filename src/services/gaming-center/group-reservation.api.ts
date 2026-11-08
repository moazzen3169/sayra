import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  GroupReservation,
  GroupReservationPayload,
} from "@/types/gaming-center/group-reservation.types";

export const groupReservationApi = {
  /**
   * ثبت رزرو گروهی
   * POST /api/v1/public/gamingCenters/:gamingCenterSlug/group-reservations
   * Header: Idempotency-Key: <unique-key>
   */
  async submitGroupReservation(
    gamingCenterSlug: string,
    payload: GroupReservationPayload,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<GroupReservation> {
    if (!gamingCenterSlug?.trim()) {
      throw new Error("اسلاگ گیمنت نامعتبر است.");
    }
    if (!idempotencyKey?.trim()) {
      throw new Error("کلید Idempotency-Key الزامی است.");
    }

    // Validation checks prior to network call
    if (!payload.items || payload.items.length === 0) {
      throw new Error("حداقل یک دستگاه باید انتخاب شود.");
    }

    const uniqueStationIds = new Set(payload.items.map((i) => i.stationId));
    if (uniqueStationIds.size !== payload.items.length) {
      throw new Error("دستگاه‌های انتخاب‌شده تکراری هستند.");
    }

    if (!payload.startTime) {
      throw new Error("زمان شروع رزرو مشخص نشده است.");
    }

    const startDate = new Date(payload.startTime);
    if (isNaN(startDate.getTime())) {
      throw new Error("فرمت تاریخ شروع نامعتبر است.");
    }

    if (startDate.getTime() <= Date.now()) {
      throw new Error("زمان شروع رزرو باید در آینده باشد.");
    }

    if (
      typeof payload.durationMinutes !== "number" ||
      payload.durationMinutes < 15 ||
      payload.durationMinutes > 1440
    ) {
      throw new Error("مدت زمان رزرو باید بین ۱۵ دقیقه تا ۲۴ ساعت (۱۴۴۰ دقیقه) باشد.");
    }

    if (!payload.customer?.fullName || payload.customer.fullName.trim().length < 2) {
      throw new Error("نام و نام خانوادگی مشتری باید حداقل ۲ کاراکتر باشد.");
    }

    if (!payload.customer?.phone || payload.customer.phone.trim().length < 10) {
      throw new Error("شماره تلفن مشتری باید حداقل ۱۰ رقم باشد.");
    }

    const requestBody: Record<string, unknown> = {
      startTime: startDate.toISOString(),
      durationMinutes: payload.durationMinutes,
      items: payload.items.map((it) => ({ stationId: it.stationId })),
      customer: {
        fullName: payload.customer.fullName.trim(),
        phone: payload.customer.phone.trim(),
        ...(payload.customer.email?.trim() ? { email: payload.customer.email.trim() } : {}),
      },
      ...(payload.note?.trim() ? { note: payload.note.trim() } : {}),
    };

    const response = await apiClient.post<GroupReservation | { data?: GroupReservation }>(
      ENDPOINTS.gamingCenter.groupReservations(gamingCenterSlug.trim()),
      requestBody,
      {
        headers: {
          "Idempotency-Key": idempotencyKey.trim(),
        },
        signal,
      }
    );

    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as { data: GroupReservation }).data) {
      return (resData as { data: GroupReservation }).data;
    }

    return resData as GroupReservation;
  },
};
