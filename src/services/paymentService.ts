import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  PaymentCalculation,
  PaymentInitPayload,
  PaymentInitResponse,
  PaymentVerifyGetParams,
  PaymentVerifyPostPayload,
  PaymentVerifyResponse,
  PaymentStatusResponse,
} from "@/types/customerApi";

export interface PaymentInitOptions extends PaymentInitPayload {
  signal?: AbortSignal;
}

function resolveInitOptions(
  optionsOrSignal?: PaymentInitOptions | AbortSignal
): { body: PaymentInitPayload | undefined; signal?: AbortSignal } {
  if (!optionsOrSignal) {
    return { body: undefined, signal: undefined };
  }
  if (typeof AbortSignal !== "undefined" && optionsOrSignal instanceof AbortSignal) {
    return { body: undefined, signal: optionsOrSignal };
  }
  const opts = optionsOrSignal as PaymentInitOptions;
  const payload: PaymentInitPayload = {};
  if (opts.provider !== undefined) payload.provider = opts.provider;
  if (opts.useWallet !== undefined) payload.useWallet = opts.useWallet;
  return {
    body: Object.keys(payload).length > 0 ? payload : undefined,
    signal: opts.signal,
  };
}

export const paymentService = {
  /**
   * محاسبه سهم کیف پول و مبلغ باقیمانده درگاه برای رزرو
   * GET /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/calculate
   */
  async calculatePayment(
    gamingCenterId: string,
    reservationId: string,
    useWallet?: boolean,
    signal?: AbortSignal
  ): Promise<PaymentCalculation> {
    if (!gamingCenterId?.trim()) throw new Error("شناسه گیم‌نت نامعتبر است.");
    if (!reservationId?.trim()) throw new Error("شناسه رزرو نامعتبر است.");

    const query: Record<string, string> = {};
    if (useWallet !== undefined) query.useWallet = String(useWallet);

    const response = await apiClient.get<PaymentCalculation | { data?: PaymentCalculation }>(
      ENDPOINTS.payment.calculate(gamingCenterId, reservationId),
      { query, signal }
    );

    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as { data?: PaymentCalculation }).data) {
      return (resData as { data: PaymentCalculation }).data;
    }
    return resData as PaymentCalculation;
  },

  /**
   * محاسبه سهم کیف پول و مبلغ باقیمانده درگاه از مسیر مشتری
   * GET /customer/reservation/{reservationId}/payments/calculate
   */
  async calculateCustomerPayment(
    reservationId: string,
    useWallet?: boolean,
    signal?: AbortSignal
  ): Promise<PaymentCalculation> {
    if (!reservationId?.trim()) throw new Error("شناسه رزرو نامعتبر است.");

    const query: Record<string, string> = {};
    if (useWallet !== undefined) query.useWallet = String(useWallet);

    const response = await apiClient.get<PaymentCalculation | { data?: PaymentCalculation }>(
      ENDPOINTS.payment.customerCalculate(reservationId),
      { query, signal }
    );

    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as { data?: PaymentCalculation }).data) {
      return (resData as { data: PaymentCalculation }).data;
    }
    return resData as PaymentCalculation;
  },

  /**
   * شروع فرآیند پرداخت برای رزرو (با پشتیبانی از پرداخت کامل یا جزئی با کیف پول)
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/init
   * Header: idempotency-key (الزامی طبق OpenAPI)
   */
  async initPayment(
    gamingCenterId: string,
    reservationId: string,
    idempotencyKey: string,
    optionsOrSignal?: PaymentInitOptions | AbortSignal
  ): Promise<PaymentInitResponse> {
    if (!gamingCenterId?.trim()) throw new Error("شناسه گیم‌نت نامعتبر است.");
    if (!reservationId?.trim()) throw new Error("شناسه رزرو نامعتبر است.");
    if (!idempotencyKey?.trim()) throw new Error("کلید یکتایی (idempotency-key) الزامی است.");

    const { body, signal } = resolveInitOptions(optionsOrSignal);

    const response = await apiClient.post<PaymentInitResponse | { data?: PaymentInitResponse }>(
      ENDPOINTS.payment.init(gamingCenterId, reservationId),
      body,
      {
        headers: { "idempotency-key": idempotencyKey },
        signal,
      }
    );

    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as { data?: PaymentInitResponse }).data) {
      return (resData as { data: PaymentInitResponse }).data;
    }
    return resData as PaymentInitResponse;
  },

  /**
   * شروع فرآیند پرداخت از مسیر مشتری (پشتیبانی از کیف پول و درگاه بانکی)
   * POST /customer/reservation/{reservationId}/payments/init
   */
  async initCustomerPayment(
    reservationId: string,
    idempotencyKey: string,
    optionsOrSignal?: PaymentInitOptions | AbortSignal
  ): Promise<PaymentInitResponse> {
    if (!reservationId?.trim()) throw new Error("شناسه رزرو نامعتبر است.");
    if (!idempotencyKey?.trim()) throw new Error("کلید یکتایی (idempotency-key) الزامی است.");

    const { body, signal } = resolveInitOptions(optionsOrSignal);

    const response = await apiClient.post<PaymentInitResponse | { data?: PaymentInitResponse }>(
      ENDPOINTS.payment.customerInit(reservationId),
      body,
      {
        headers: { "idempotency-key": idempotencyKey },
        signal,
      }
    );

    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as { data?: PaymentInitResponse }).data) {
      return (resData as { data: PaymentInitResponse }).data;
    }
    return resData as PaymentInitResponse;
  },

  /**
   * بررسی و تأیید پرداخت با ریدایرکت گیت‌وی (GET Callback)
   * GET /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/verify?Authority=...&Status=...
   */
  async verifyPaymentRedirect(
    params: PaymentVerifyGetParams,
    signal?: AbortSignal
  ): Promise<PaymentVerifyResponse> {
    const { gamingCenterId, reservationId, authority, status } = params;
    if (!gamingCenterId?.trim()) throw new Error("شناسه گیم‌نت نامعتبر است.");
    if (!reservationId?.trim()) throw new Error("شناسه رزرو نامعتبر است.");

    const query: Record<string, string> = {};
    if (authority) query["Authority"] = authority;
    if (status) query["Status"] = status;

    const response = await apiClient.get<PaymentVerifyResponse | { data?: PaymentVerifyResponse }>(
      ENDPOINTS.payment.verifyGet(gamingCenterId, reservationId),
      {
        query,
        signal,
      }
    );

    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as { data?: PaymentVerifyResponse }).data) {
      return (resData as { data: PaymentVerifyResponse }).data;
    }
    return resData as PaymentVerifyResponse;
  },

  /**
   * تأیید دستی یا مستقیم تراکنش با متد POST
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/verify
   */
  async verifyPaymentManual(
    gamingCenterId: string,
    reservationId: string,
    payload: PaymentVerifyPostPayload,
    signal?: AbortSignal
  ): Promise<PaymentVerifyResponse> {
    if (!gamingCenterId?.trim()) throw new Error("شناسه گیم‌نت نامعتبر است.");
    if (!reservationId?.trim()) throw new Error("شناسه رزرو نامعتبر است.");

    const response = await apiClient.post<PaymentVerifyResponse | { data?: PaymentVerifyResponse }>(
      ENDPOINTS.payment.verifyPost(gamingCenterId, reservationId),
      payload,
      { signal }
    );

    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as { data?: PaymentVerifyResponse }).data) {
      return (resData as { data: PaymentVerifyResponse }).data;
    }
    return resData as PaymentVerifyResponse;
  },

  /**
   * تأیید و اعتبارسنجی پرداخت متمرکز سمت سرور (Authoritative Verification)
   * POST /api/v1/payments/:paymentId/verify
   * در معماری جدید، فرانت‌اند پس از بازگشت از درگاه این اندپوینت را صدا می‌زند.
   * سرور مستقیماً با وب‌سرویس زیبال/زرین‌پال تراکنش و مبلغ را تأیید کرده و
   * در صورت موفقیت، BookingHold به رزرو قطعی تبدیل می‌گردد.
   */
  async verifyPayment(
    paymentId: string,
    payload?: { authority?: string; status?: string; trackId?: string },
    signal?: AbortSignal
  ): Promise<PaymentVerifyResponse> {
    if (!paymentId?.trim()) throw new Error("شناسه پرداخت (paymentId) نامعتبر است.");

    const response = await apiClient.post<PaymentVerifyResponse | { data?: PaymentVerifyResponse }>(
      ENDPOINTS.payment.verifyPayment(paymentId.trim()),
      payload ?? {},
      { signal }
    );

    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as { data?: PaymentVerifyResponse }).data) {
      return (resData as { data: PaymentVerifyResponse }).data;
    }
    return resData as PaymentVerifyResponse;
  },

  /**
   * استعلام وضعیت فعلی پرداخت رزرو
   * GET /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/status
   */
  async getPaymentStatus(
    gamingCenterId: string,
    reservationId: string,
    signal?: AbortSignal
  ): Promise<PaymentStatusResponse> {
    if (!gamingCenterId?.trim()) throw new Error("شناسه گیم‌نت نامعتبر است.");
    if (!reservationId?.trim()) throw new Error("شناسه رزرو نامعتبر است.");

    const response = await apiClient.get<PaymentStatusResponse | { data?: PaymentStatusResponse }>(
      ENDPOINTS.payment.status(gamingCenterId, reservationId),
      { signal }
    );

    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in resData && (resData as { data?: PaymentStatusResponse }).data) {
      return (resData as { data: PaymentStatusResponse }).data;
    }
    return resData as PaymentStatusResponse;
  },
};
