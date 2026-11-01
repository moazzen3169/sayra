import { apiClient } from "@/lib/api/client";
import { USE_MOCK_RESERVATIONS } from "@/lib/api/config";
import { ENDPOINTS } from "@/lib/api/endpoints";
import { addMockReservation, getMockReservations } from "@/lib/reservations.mock";
import type { Reservation, ReservationTimeProposal } from "@/types/reservation";
import { ContractGapError, PaymentInitResponse } from "@/types/customerApi";

export interface CreateReservationInput {
  gamingCenterSlug: string;
  /** برای جلوگیری از رزرو تکراری؛ برای هر تلاش ثبت یک مقدار یکتا */
  idempotencyKey: string;
  stationId: string;
  startTime: string;
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
        ...(input.staffId ? { staffId: input.staffId } : {}),
        ...(input.note ? { note: input.note } : {}),
      },
      { headers: { "idempotency-key": input.idempotencyKey } }
    );
    return data;
  },

  /**
   * لیست رزروهای من
   * GET /customer/reservation
   */
  async list(signal?: AbortSignal): Promise<Reservation[]> {
    if (USE_MOCK_RESERVATIONS) return getMockReservations();
    const response = await apiClient.get<unknown>(ENDPOINTS.reservation.list, { signal });
    const resData = response.data;
    if (Array.isArray(resData)) {
      return resData as Reservation[];
    }
    if (resData && typeof resData === "object" && Array.isArray((resData as any).data)) {
      return (resData as any).data as Reservation[];
    }
    return [];
  },

  /**
   * دریافت جزئیات یک رزرو
   * GET /customer/reservation/{reservationId}
   */
  async get(reservationId: string, signal?: AbortSignal): Promise<Reservation> {
    if (USE_MOCK_RESERVATIONS) {
      const found = getMockReservations().find((r) => r.id === reservationId);
      return found ?? getMockReservations()[0];
    }
    const { data } = await apiClient.get<Reservation>(ENDPOINTS.reservation.detail(reservationId), { signal });
    return data;
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
   * ثبت امتیاز و نظر برای رزرو تکمیل شده
   * POST /customer/reservation/{reservationId}/ratings
   */
  async rate(reservationId: string, payload: { rating: number; comment?: string }): Promise<void> {
    if (USE_MOCK_RESERVATIONS) return;
    await apiClient.post(ENDPOINTS.reservation.rate(reservationId), payload);
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
};
