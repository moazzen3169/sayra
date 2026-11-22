import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { cleanPhoneNumber, isValidIranPhone } from "@/lib/format";
import { triggerNotificationsRefresh } from "@/services/customerNotificationService";
import type {
  GroupReservation,
  GroupReservationPayload,
  GroupReservationCheckoutPayload,
  GroupReservationCheckoutResponse,
} from "@/types/gaming-center/group-reservation.types";

function validateGroupReservationPayload(
  gamingCenterSlug: string,
  payload: GroupReservationPayload | GroupReservationCheckoutPayload,
  idempotencyKey: string
) {
  if (!gamingCenterSlug?.trim()) {
    throw new Error("اسلاگ گیمنت نامعتبر است.");
  }
  if (!idempotencyKey?.trim()) {
    throw new Error("کلید Idempotency-Key الزامی است.");
  }

  if (!payload.items || payload.items.length === 0) {
    throw new Error("حداقل یک دستگاه باید انتخاب شود.");
  }

  const uniqueStationIds = new Set(payload.items.map((i) => i.stationId));
  if (uniqueStationIds.size !== payload.items.length) {
    throw new Error("دستگاه‌های انتخاب‌شده تکراری هستند.");
  }

  for (const item of payload.items) {
    if (item.extraControllers) {
      for (const ec of item.extraControllers) {
        if (!ec.extraControllerId?.trim()) {
          throw new Error("شناسه دسته اضافی نامعتبر است.");
        }
        if (
          typeof ec.quantity !== "number" ||
          !Number.isInteger(ec.quantity) ||
          ec.quantity < 1 ||
          ec.quantity > 100
        ) {
          throw new Error("تعداد دسته اضافی باید عدد صحیح بین ۱ تا ۱۰۰ باشد.");
        }
      }
    }
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

  const cleanCustomerPhone = cleanPhoneNumber(payload.customer?.phone);
  if (!isValidIranPhone(cleanCustomerPhone)) {
    throw new Error("شماره تلفن مشتری باید ۱۱ رقم و با ۰۹ شروع شود.");
  }

  return {
    startDate,
    cleanCustomerPhone,
  };
}

function serializeReservationItems(items: GroupReservationPayload["items"]) {
  return items.map((it) => {
    const validExtras = (it.extraControllers ?? [])
      .filter((ec) => ec.quantity > 0 && ec.extraControllerId?.trim())
      .map((ec) => ({
        extraControllerId: ec.extraControllerId.trim(),
        quantity: ec.quantity,
      }));
    return {
      stationId: it.stationId,
      ...(it.staffId ? { staffId: it.staffId } : {}),
      ...(validExtras.length > 0 ? { extraControllers: validExtras } : {}),
    };
  });
}

export const groupReservationApi = {
  /**
   * روند جدید پرداخت آنلاین (Payment-First Flow):
   * ۱. رزرو موقت (Hold Capacity) و صدور لینک درگاه پرداخت
   * POST /api/v1/public/gamingCenters/:gamingCenterSlug/group-reservations/checkout
   * Header: Idempotency-Key: <unique-key>
   */
  async checkoutGroupReservation(
    gamingCenterSlug: string,
    payload: GroupReservationCheckoutPayload,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<GroupReservationCheckoutResponse> {
    const { startDate, cleanCustomerPhone } = validateGroupReservationPayload(
      gamingCenterSlug,
      payload,
      idempotencyKey
    );

    const requestBody: Record<string, unknown> = {
      startTime: startDate.toISOString(),
      durationMinutes: payload.durationMinutes,
      items: serializeReservationItems(payload.items),
      customer: {
        fullName: payload.customer.fullName.trim(),
        phone: cleanCustomerPhone,
        ...(payload.customer.email?.trim() ? { email: payload.customer.email.trim() } : {}),
      },
      ...(payload.note?.trim() ? { note: payload.note.trim() } : {}),
      ...(payload.provider?.trim() ? { provider: payload.provider.trim() } : {}),
      ...(payload.useWallet !== undefined ? { useWallet: payload.useWallet } : {}),
    };

    const response = await apiClient.post<
      GroupReservationCheckoutResponse | { data?: GroupReservationCheckoutResponse }
    >(
      ENDPOINTS.gamingCenter.groupReservationCheckout(gamingCenterSlug.trim()),
      requestBody,
      {
        headers: {
          "Idempotency-Key": idempotencyKey.trim(),
        },
        signal,
      }
    );

    const resData = response.data;
    triggerNotificationsRefresh();
    if (
      resData &&
      typeof resData === "object" &&
      "data" in resData &&
      (resData as { data: GroupReservationCheckoutResponse }).data
    ) {
      return (resData as { data: GroupReservationCheckoutResponse }).data;
    }

    return resData as GroupReservationCheckoutResponse;
  },

  /**
   * ثبت رزرو گروهی مستقیم (مسیر تکمیلی/سازگار)
   * POST /api/v1/public/gamingCenters/:gamingCenterSlug/group-reservations
   * Header: Idempotency-Key: <unique-key>
   */
  async submitGroupReservation(
    gamingCenterSlug: string,
    payload: GroupReservationPayload,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<GroupReservation> {
    const { startDate, cleanCustomerPhone } = validateGroupReservationPayload(
      gamingCenterSlug,
      payload,
      idempotencyKey
    );

    const requestBody: Record<string, unknown> = {
      startTime: startDate.toISOString(),
      durationMinutes: payload.durationMinutes,
      items: serializeReservationItems(payload.items),
      customer: {
        fullName: payload.customer.fullName.trim(),
        phone: cleanCustomerPhone,
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
    triggerNotificationsRefresh();
    if (resData && typeof resData === "object" && "data" in resData && (resData as { data: GroupReservation }).data) {
      return (resData as { data: GroupReservation }).data;
    }

    return resData as GroupReservation;
  },
};
