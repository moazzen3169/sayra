import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  PaymentInitResponse,
  PaymentVerifyRedirectParams,
  PaymentVerifyManualPayload,
  PaymentVerifyResponse,
  PaymentStatusResponse,
} from "@/types/customerApi";

export const paymentService = {
  /**
   * Initiate payment for reservation
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/init
   * Required Header: idempotency-key
   */
  async initPayment(
    gamingCenterId: string,
    reservationId: string,
    idempotencyKey: string,
    signal?: AbortSignal
  ): Promise<PaymentInitResponse> {
    const { data } = await apiClient.post<PaymentInitResponse>(
      ENDPOINTS.payment.init(gamingCenterId, reservationId),
      undefined,
      {
        headers: { "idempotency-key": idempotencyKey },
        signal,
      }
    );
    return data;
  },

  /**
   * Verify payment via GET redirect callback
   * GET /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/verify?Authority=...&Status=...
   */
  async verifyPaymentRedirect(
    gamingCenterId: string,
    reservationId: string,
    params?: PaymentVerifyRedirectParams,
    signal?: AbortSignal
  ): Promise<PaymentVerifyResponse> {
    const queryParams: Record<string, string | undefined> = {};
    if (params?.Authority) queryParams.Authority = params.Authority;
    if (params?.Status) queryParams.Status = params.Status;

    const { data } = await apiClient.get<PaymentVerifyResponse>(
      ENDPOINTS.payment.verifyRedirect(gamingCenterId, reservationId),
      {
        query: queryParams,
        signal,
      }
    );
    return data;
  },

  /**
   * Verify payment via POST manual or gateway verification
   * POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/verify
   * Body: { authority?: string; paymentId?: string }
   */
  async verifyPaymentManual(
    gamingCenterId: string,
    reservationId: string,
    payload: PaymentVerifyManualPayload,
    signal?: AbortSignal
  ): Promise<PaymentVerifyResponse> {
    const { data } = await apiClient.post<PaymentVerifyResponse>(
      ENDPOINTS.payment.verifyManual(gamingCenterId, reservationId),
      payload,
      { signal }
    );
    return data;
  },

  /**
   * Get payment status for a reservation
   * GET /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/status
   */
  async getPaymentStatus(
    gamingCenterId: string,
    reservationId: string,
    signal?: AbortSignal
  ): Promise<PaymentStatusResponse> {
    const { data } = await apiClient.get<PaymentStatusResponse>(
      ENDPOINTS.payment.status(gamingCenterId, reservationId),
      { signal }
    );
    return data;
  },
};
