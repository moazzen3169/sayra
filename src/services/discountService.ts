import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";

/**
 * Schema representing a Discount entity as defined in OpenAPI v1.0-LOCKED:
 * components/schemas/Discount
 */
export interface Discount {
  id: string;
  gamingCenterId: string;
  targetType: "GAMING_CENTER" | "STATION";
  targetId: string;
  valueType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  startAt: string;
  endAt: string;
  isActive: boolean;
  createdByUserId?: string;
  createdAt?: string;
  updatedAt?: string;

  // Optional extensions if backend provides them in response
  title?: string;
  code?: string;
  maxUsage?: number;
  usedCount?: number;
}

/**
 * Payload for creating a discount matching OpenAPI:
 * POST /gamingCenters/{gamingCenterId}/discounts
 * Required: targetType, targetId, valueType, value, startAt, endAt
 * Optional: isActive
 */
export interface CreateDiscountInput {
  targetType: "GAMING_CENTER" | "STATION";
  targetId: string;
  valueType: "PERCENTAGE" | "FIXED_AMOUNT";
  value: number;
  startAt: string;
  endAt: string;
  isActive?: boolean;
}

/**
 * Payload for updating a discount matching OpenAPI:
 * PATCH /gamingCenters/{gamingCenterId}/discounts/{id}
 */
export interface UpdateDiscountInput {
  targetType?: "GAMING_CENTER" | "STATION";
  targetId?: string;
  valueType?: "PERCENTAGE" | "FIXED_AMOUNT";
  value?: number;
  startAt?: string;
  endAt?: string;
  isActive?: boolean;
}

/**
 * Query parameters for listing discounts matching OpenAPI:
 * GET /gamingCenters/{gamingCenterId}/discounts
 */
export interface DiscountQueryParams {
  targetType?: "GAMING_CENTER" | "STATION";
  targetId?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

const asArray = <T>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

export const discountService = {
  /**
   * Fetch list of discounts for a gaming center
   * GET /gamingCenters/{gamingCenterId}/discounts
   */
  async listDiscounts(
    gamingCenterId: string,
    params?: DiscountQueryParams
  ): Promise<Discount[]> {
    if (!gamingCenterId) return [];

    const query: Record<string, string | number | boolean> = {};
    if (params?.targetType) query.targetType = params.targetType;
    if (params?.targetId) query.targetId = params.targetId;
    if (typeof params?.isActive === "boolean") query.isActive = params.isActive;
    if (params?.page) query.page = params.page;
    if (params?.pageSize) query.pageSize = params.pageSize;

    const response = await apiClient.get<unknown>(
      ENDPOINTS.owner.discounts(gamingCenterId),
      {
        query,
        signal: params?.signal,
      }
    );

    const data = response.data;
    if (Array.isArray(data)) {
      return data as Discount[];
    }
    if (data && typeof data === "object" && Array.isArray((data as any).data)) {
      return (data as any).data as Discount[];
    }
    return asArray<Discount>(data);
  },

  /**
   * Fetch a single discount by ID
   * GET /gamingCenters/{gamingCenterId}/discounts/{id}
   */
  async getDiscount(
    gamingCenterId: string,
    id: string,
    signal?: AbortSignal
  ): Promise<Discount> {
    const response = await apiClient.get<Discount | { data?: Discount }>(
      ENDPOINTS.owner.discount(gamingCenterId, id),
      { signal }
    );
    const data = response.data;
    if (data && typeof data === "object" && "id" in data) {
      return data as Discount;
    }
    if (data && typeof data === "object" && "data" in data && (data as any).data) {
      return (data as any).data as Discount;
    }
    return data as Discount;
  },

  /**
   * Create a new discount
   * POST /gamingCenters/{gamingCenterId}/discounts
   */
  async createDiscount(
    gamingCenterId: string,
    payload: CreateDiscountInput
  ): Promise<void> {
    // Only send documented OpenAPI fields
    const body: CreateDiscountInput = {
      targetType: payload.targetType,
      targetId: payload.targetId,
      valueType: payload.valueType,
      value: payload.value,
      startAt: payload.startAt,
      endAt: payload.endAt,
      ...(typeof payload.isActive === "boolean" ? { isActive: payload.isActive } : {}),
    };

    await apiClient.post(ENDPOINTS.owner.discounts(gamingCenterId), body);
  },

  /**
   * Update discount details
   * PATCH /gamingCenters/{gamingCenterId}/discounts/{id}
   */
  async updateDiscount(
    gamingCenterId: string,
    id: string,
    payload: UpdateDiscountInput
  ): Promise<void> {
    const body: UpdateDiscountInput = {};
    if (payload.targetType !== undefined) body.targetType = payload.targetType;
    if (payload.targetId !== undefined) body.targetId = payload.targetId;
    if (payload.valueType !== undefined) body.valueType = payload.valueType;
    if (payload.value !== undefined) body.value = payload.value;
    if (payload.startAt !== undefined) body.startAt = payload.startAt;
    if (payload.endAt !== undefined) body.endAt = payload.endAt;
    if (typeof payload.isActive === "boolean") body.isActive = payload.isActive;

    await apiClient.patch(ENDPOINTS.owner.discount(gamingCenterId, id), body);
  },

  /**
   * Delete discount
   * DELETE /gamingCenters/{gamingCenterId}/discounts/{id}
   */
  async deleteDiscount(gamingCenterId: string, id: string): Promise<void> {
    await apiClient.delete(ENDPOINTS.owner.discount(gamingCenterId, id));
  },

  /**
   * Activate or deactivate discount
   * PATCH /gamingCenters/{gamingCenterId}/discounts/{id}/status
   */
  async updateDiscountStatus(
    gamingCenterId: string,
    id: string,
    isActive: boolean
  ): Promise<void> {
    await apiClient.patch(ENDPOINTS.owner.discountStatus(gamingCenterId, id), {
      isActive,
    });
  },
};
