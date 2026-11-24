import { apiClient, type Query } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  AvailableDiscountItem,
  CalculateDiscountSelectionInput,
  CalculateDiscountSelectionResponse,
  GetAvailableDiscountsParams,
  GetAvailableDiscountsResponse,
  ReserveDiscountInput,
  ReserveDiscountResponse,
} from "@/types/gaming-center/discount-selection.types";

function unwrapPayload<T>(raw: unknown): T {
  if (
    raw &&
    typeof raw === "object" &&
    "data" in raw &&
    (raw as { data?: unknown }).data !== undefined &&
    (raw as { data?: unknown }).data !== null
  ) {
    return (raw as { data: T }).data;
  }
  return raw as T;
}

function normalizeAvailableDiscountsResponse(
  raw: unknown,
  fallbackBasePrice: number
): GetAvailableDiscountsResponse {
  const payload = unwrapPayload<Partial<GetAvailableDiscountsResponse>>(raw);
  const discounts = Array.isArray(payload?.discounts)
    ? (payload.discounts as AvailableDiscountItem[])
    : [];

  return {
    basePrice:
      typeof payload?.basePrice === "number"
        ? payload.basePrice
        : fallbackBasePrice,
    recommendedDiscountId: payload?.recommendedDiscountId ?? null,
    recommendedDiscountType: payload?.recommendedDiscountType ?? null,
    discounts,
  };
}

export const discountSelectionApi = {
  /**
   * دریافت لیست تخفیف‌ها و کمپین‌های فعال و پیشنهادی برای یک دستگاه
   * GET /gamingCenters/{gamingCenterId}/discounts/available
   */
  async getAvailableDiscounts(
    gamingCenterId: string,
    params: GetAvailableDiscountsParams,
    signal?: AbortSignal
  ): Promise<GetAvailableDiscountsResponse> {
    if (!gamingCenterId?.trim() || !params.stationId?.trim()) {
      return {
        basePrice: params.basePrice ?? 0,
        recommendedDiscountId: null,
        recommendedDiscountType: null,
        discounts: [],
      };
    }

    const query: Query = {
      stationId: params.stationId.trim(),
      basePrice: params.basePrice,
    };
    if (params.startTime) query.startTime = params.startTime;
    if (typeof params.durationMinutes === "number" && params.durationMinutes > 0) {
      query.durationMinutes = params.durationMinutes;
    }
    if (params.customerAccountId?.trim()) {
      query.customerAccountId = params.customerAccountId.trim();
    }
    if (params.manualCode?.trim()) {
      query.manualCode = params.manualCode.trim();
    }

    const response = await apiClient.get<unknown>(
      ENDPOINTS.gamingCenter.availableDiscounts(gamingCenterId.trim()),
      { query, signal }
    );

    return normalizeAvailableDiscountsResponse(response.data, params.basePrice);
  },

  /**
   * انتخاب یا پیش‌نمایش یک تخفیف و دریافت محاسبه دقیق مالی
   * POST /gamingCenters/{gamingCenterId}/discounts/select
   */
  async selectDiscount(
    gamingCenterId: string,
    input: CalculateDiscountSelectionInput,
    signal?: AbortSignal
  ): Promise<CalculateDiscountSelectionResponse> {
    const response = await apiClient.post<unknown>(
      ENDPOINTS.gamingCenter.selectDiscount(gamingCenterId.trim()),
      input,
      { signal }
    );
    return unwrapPayload<CalculateDiscountSelectionResponse>(response.data);
  },

  /**
   * محاسبه مبلغ نهایی با تخفیف انتخاب‌شده
   * POST /gamingCenters/{gamingCenterId}/discounts/calculate
   */
  async calculateDiscount(
    gamingCenterId: string,
    input: CalculateDiscountSelectionInput,
    signal?: AbortSignal
  ): Promise<CalculateDiscountSelectionResponse> {
    const response = await apiClient.post<unknown>(
      ENDPOINTS.gamingCenter.calculateDiscount(gamingCenterId.trim()),
      input,
      { signal }
    );
    return unwrapPayload<CalculateDiscountSelectionResponse>(response.data);
  },

  /**
   * رزرو موقت تخفیف هنگام تسویه حساب
   * POST /gamingCenters/{gamingCenterId}/discounts/reserve
   */
  async reserveDiscount(
    gamingCenterId: string,
    input: ReserveDiscountInput,
    signal?: AbortSignal
  ): Promise<ReserveDiscountResponse> {
    const response = await apiClient.post<unknown>(
      ENDPOINTS.gamingCenter.reserveDiscount(gamingCenterId.trim()),
      input,
      { signal }
    );
    return unwrapPayload<ReserveDiscountResponse>(response.data);
  },
};
