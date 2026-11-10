import { apiClient } from "@/lib/api/client";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { addMockReservation } from "@/lib/reservations.mock";
import { mergeGroupReservationsIntoSingle } from "@/lib/groupReservationGrouping";
import type { Reservation, ReservationTimeProposal } from "@/types/reservation";
import { ContractGapError, PaymentInitResponse } from "@/types/customerApi";

export interface CreateReservationInput {
  gamingCenterSlug: string;
  /** برای جلوگیری از رزرو تکراری؛ برای هر تلاش ثبت یک مقدار یکتا */
  idempotencyKey: string;
  stationId: string;
  startTime: string;
  durationHours?: number;
  customer: { fullName: string; phone: string; email?: string };
  staffId?: string;
  note?: string;
}

/** فقط برای حالت Mock؛ در حالت واقعی همه‌چیز از پاسخ Backend می‌آید */
export interface MockReservationPreview {
  gamingCenterName?: string;
  gamingCenterAddress?: string;
  stationName: string;
  stationType: string;
  hourlyPrice: number;
  totalHours: number;
  totalPrice: number;
}

function buildMockReservation(
  input: CreateReservationInput,
  mockPreview?: MockReservationPreview
): Reservation {
  const hours = mockPreview?.totalHours ?? 1;
  const start = new Date(input.startTime);
  const end = new Date(start.getTime() + hours * 3_600_000);
  return {
    id: `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gamingCenterId: input.gamingCenterSlug,
    stationId: input.stationId,
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    status: "PENDING",
    paymentState: "PAID",
    totalHours: hours,
    totalPrice: mockPreview?.totalPrice ?? 0,
    stationSnapshot: {
      name: mockPreview?.stationName ?? "ایستگاه",
      hourlyPrice: mockPreview?.hourlyPrice ?? 0,
      stationType: mockPreview?.stationType ?? "PC",
    },
    gamingCenterName: mockPreview?.gamingCenterName ?? "گیمنت گرگدن",
    gamingCenterAddress: mockPreview?.gamingCenterAddress ?? "تبریز، ولیعصر، بعد از میدان معلم",
    reservationCode: String(Math.floor(100000 + Math.random() * 900000)),
  };
}

export const reservationService = {
  /**
   * ایجاد رزرو جدید طبق OpenAPI:
   * POST /public/gamingCenters/{gamingCenterSlug}/reservation
   * Header: idempotency-key (الزامی)
   */
  async create(input: CreateReservationInput, mockPreview?: MockReservationPreview): Promise<Reservation> {
    if (USE_MOCK_RESERVATIONS) {
      const mock = buildMockReservation(input, mockPreview);
      addMockReservation(mock);
      return mock;
    }

    const { data } = await apiClient.post<Reservation>(
      ENDPOINTS.reservation.create(input.gamingCenterSlug),
      {
        stationId: input.stationId,
        startTime: input.startTime,
        customer: input.customer,
        ...(input.durationHours ? { durationHours: input.durationHours } : {}),
        ...(input.staffId ? { staffId: input.staffId } : {}),
        ...(input.note ? { note: input.note } : {}),
      },
      { headers: { "idempotency-key": input.idempotencyKey } }
    );
    return data;
  },

  /**
   * لیست رزروهای مشتری لاگین‌شده
   * GET /customer/reservation
   * احراز هویت: فقط از طریق هدر Authorization: Bearer <accessToken>
   * هیچ customerId به صورت کلاینتی به درخواست پاس داده نمی‌شود.
   */
  async list(
    options?: { page?: number; pageSize?: number; signal?: AbortSignal } | AbortSignal
  ): Promise<Reservation[]> {
    const paginated = await reservationService.listPaginated(
      options instanceof AbortSignal ? { signal: options } : options
    );
    return paginated.items;
  },

  /**
   * لیست رزروهای مشتری لاگین‌شده با پشتیبانی از Pagination Envelope
   * GET /customer/reservation
   */
  async listPaginated(
    options?: { page?: number; pageSize?: number; signal?: AbortSignal }
  ): Promise<{
    items: Reservation[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const requestedPage = options?.page ?? 1;
    const requestedPageSize = options?.pageSize ?? 50;

    const query: Record<string, number> = {};
    if (options?.page) query.page = options.page;
    if (options?.pageSize) query.pageSize = options.pageSize;

    const response = await apiClient.get<unknown>(ENDPOINTS.reservation.list, {
      query: Object.keys(query).length > 0 ? query : undefined,
      signal: options?.signal,
    });

    const resData = response.data;
    let items: Reservation[] = [];
    let total = 0;
    let page = requestedPage;
    let pageSize = requestedPageSize;
    let totalPages = 1;

    // OpenAPI schema for /customer/reservation is Pagination schema:
    // { success: true, data: Array, meta: { pagination: { total, totalItems, page, pageSize, totalPages } } }
    if (Array.isArray(resData)) {
      items = resData as Reservation[];
      total = items.length;
    } else if (resData && typeof resData === "object") {
      const rec = resData as Record<string, unknown>;
      if (Array.isArray(rec.data)) {
        items = rec.data as Reservation[];
      }
      const pagination = (rec.meta as any)?.pagination ?? response.meta?.pagination;
      if (pagination) {
        total = pagination.total ?? pagination.totalItems ?? items.length;
        page = pagination.page ?? requestedPage;
        pageSize = pagination.pageSize ?? pagination.limit ?? requestedPageSize;
        totalPages = pagination.totalPages ?? (Math.ceil(total / (pageSize || 1)) || 1);
      } else {
        total = items.length;
      }
    }

    if (response.meta?.pagination) {
      const p = response.meta.pagination;
      total = p.total ?? p.totalItems ?? total;
      page = p.page ?? page;
      pageSize = p.pageSize ?? p.limit ?? pageSize;
      totalPages = p.totalPages ?? totalPages;
    }

    return {
      items,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * دریافت جزئیات یک رزرو متعلق به مشتری
   * GET /customer/reservation/{reservationId}
   * اگر با خطای 404 مواجه شد (مثلاً زمانی که ID مربوط به یک رزرو گروهی یا کد رزرو است)،
   * با جستجو در لیست رزروهای کاربر (/customer/reservation) رزرو مربوطه یا آیتم‌های گروه را پیدا و ادغام می‌کند.
   */
  async get(reservationId: string, signal?: AbortSignal): Promise<Reservation> {
    try {
      const response = await apiClient.get<Reservation | { data?: Reservation }>(
        ENDPOINTS.reservation.detail(reservationId),
        { signal }
      );
      const resData = response.data;
      if (resData && typeof resData === "object" && "data" in resData && (resData as any).data) {
        return (resData as any).data as Reservation;
      }
      return resData as Reservation;
    } catch (err: any) {
      // اگر خطای 404 رخ داد، تلاش برای تطبیق با groupBookingId یا کد رزرو در لیست رزروهای مشتری
      if (err?.status === 404) {
        try {
          const list = await reservationService.list(signal);
          // ۱. جستجو بر اساس شناسه مستقیم یا کد رزرو
          const exactMatch = list.find((r) => r.id === reservationId || r.reservationCode === reservationId);
          if (exactMatch) {
            // اگر بخشی از یک گروه بود، بررسی کنیم آیا رزروهای هم‌گروه دیگری هم وجود دارند
            const groupId = exactMatch.groupBookingId || exactMatch.groupBooking?.id;
            if (groupId) {
              const groupSiblings = list.filter((r) => (r.groupBookingId || r.groupBooking?.id) === groupId);
              if (groupSiblings.length > 1) {
                return mergeGroupReservationsIntoSingle(groupId, groupSiblings);
              }
            }
            return exactMatch;
          }

          // ۲. جستجو بر اساس groupBookingId
          const groupMatches = list.filter(
            (r) => (r.groupBookingId && r.groupBookingId === reservationId) ||
                   (r.groupBooking?.id && r.groupBooking.id === reservationId)
          );
          if (groupMatches.length > 0) {
            return mergeGroupReservationsIntoSingle(reservationId, groupMatches);
          }
        } catch {
          // در صورت بروز هرگونه خطای ثانویه، همان خطای اصلی 404 بالا انداخته می‌شود
        }
      }
      throw err;
    }
  },

  /**
   * لغو رزرو
   * POST /customer/reservation/{reservationId}/cancel
   */
  async cancel(reservationId: string): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    await apiClient.post(ENDPOINTS.reservation.cancel(reservationId));
  },

  /**
   * درخواست تغییر زمان رزرو توسط مشتری
   * POST /customer/reservation/{reservationId}/reschedule
   * فیلدهای ورودی: newStartTime و newEndTime به فرمت date-time
   */
  async reschedule(
    reservationId: string,
    payload: { newStartTime: string; newEndTime: string }
  ): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    await apiClient.post(ENDPOINTS.reservation.reschedule(reservationId), payload);
  },

  /**
   * ثبت امتیاز و نظر برای رزرو تکمیل شده
   * POST /customer/reservation/{reservationId}/ratings
   * ارجاع به customerReviewService برای هماهنگی یکپارچه
   */
  async rate(reservationId: string, payload: { rating: number; comment?: string }): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    if (typeof payload.rating !== "number" || !Number.isInteger(payload.rating) || payload.rating < 1 || payload.rating > 5) {
      throw new Error("امتیاز باید یک عدد صحیح بین ۱ تا ۵ باشد.");
    }
    await apiClient.post(ENDPOINTS.reservation.rate(reservationId), {
      rating: payload.rating,
      comment: payload.comment?.trim() ? payload.comment.trim() : undefined,
    });
  },

  /**
   * دریافت پیشنهادات تغییر زمان رزرو
   * GET /customer/reservation/{reservationId}/proposals
   */
  async listProposals(reservationId: string, signal?: AbortSignal): Promise<ReservationTimeProposal[]> {
    if (USE_MOCK_RESERVATIONS) return [];
    const response = await apiClient.get<unknown>(
      ENDPOINTS.reservation.proposals(reservationId),
      { signal }
    );
    const resData = response.data;
    if (Array.isArray(resData)) {
      return resData as ReservationTimeProposal[];
    }
    if (resData && typeof resData === "object" && Array.isArray((resData as any).data)) {
      return (resData as any).data as ReservationTimeProposal[];
    }
    return [];
  },

  /**
   * پذیرش پیشنهاد تغییر زمان
   * POST /customer/reservation/{reservationId}/proposals/{proposalId}/accept
   */
  async acceptProposal(reservationId: string, proposalId: string): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    await apiClient.post(ENDPOINTS.reservation.acceptProposal(reservationId, proposalId));
  },

  /**
   * رد پیشنهاد تغییر زمان
   * POST /customer/reservation/{reservationId}/proposals/{proposalId}/reject
   */
  async rejectProposal(reservationId: string, proposalId: string): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    await apiClient.post(ENDPOINTS.reservation.rejectProposal(reservationId, proposalId));
  },

  /**
   * شروع فرآیند پرداخت برای رزرو
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/init
   * Header: idempotency-key (الزامی)
   */
  async initPayment(
    gamingCenterId: string,
    reservationId: string,
    idempotencyKey: string
  ): Promise<PaymentInitResponse> {
    const { data } = await apiClient.post<PaymentInitResponse>(
      ENDPOINTS.payment.init(gamingCenterId, reservationId),
      undefined,
      { headers: { "idempotency-key": idempotencyKey } }
    );
    return data;
  },

  /**
   * تأیید بازگشت درگاه پرداخت (Payment Callback / Verify)
   * در نسخه v1.0-LOCKED اندپوینتی برای این کار وجود ندارد.
   */
  verifyPaymentUnsupported(): never {
    throw new ContractGapError(
      "PaymentVerification",
      "POST /payments/verify or callback endpoints are not defined in OpenAPI v1.0-LOCKED."
    );
  },

  /**
   * حذف یا ویرایش مستقیم مشخصات رزرو توسط مشتری
   * طبق مشخصات OpenAPI v1.0-LOCKED، هیچ متد DELETE یا PUT/PATCH برای مشتری تحت /customer/reservation/{id} وجود ندارد.
   */
  deleteUnsupported(): never {
    throw new ContractGapError(
      "CustomerReservationDelete",
      "DELETE /customer/reservation/{reservationId} is not defined in OpenAPI v1.0-LOCKED. Only POST /cancel is supported."
    );
  },

  updateUnsupported(): never {
    throw new ContractGapError(
      "CustomerReservationUpdate",
      "PATCH or PUT /customer/reservation/{reservationId} is not defined for customers in OpenAPI v1.0-LOCKED. Only POST /reschedule is supported."
    );
  },
};
