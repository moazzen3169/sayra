/**
 * Types for customer-facing discount & campaign selection
 * Matching OpenAPI schemas:
 * - AvailableDiscountItem
 * - GetAvailableDiscountsResponse
 * - CalculateDiscountSelectionInput / Response
 * - ReserveDiscountInput / Response
 */

export type DiscountSourceType = "CAMPAIGN" | "DIRECT_DISCOUNT";
export type DiscountSelectionType = DiscountSourceType | "NONE";
export type DiscountValueType = "PERCENTAGE" | "FIXED_AMOUNT";
export type DiscountFundingSource =
  | "PLATFORM"
  | "CAMPAIGN_BUDGET"
  | "MERCHANT_FUNDED";

export interface AvailableDiscountItem {
  id: string;
  type: DiscountSourceType;
  title: string;
  description?: string | null;
  code?: string | null;
  discountType: DiscountValueType;
  value: number;
  discountAmount: number;
  finalPrice: number;
  fundingSource: DiscountFundingSource;
  conditions: string;
  minOrderAmount?: number | null;
  maxDiscountAmount?: number | null;
  expiresAt?: string;
  isApplicable: boolean;
  ineligibilityReason?: string | null;
  isBest: boolean;
  badge?: string | null;
  /** Client-side metadata: station IDs where this discount was reported applicable */
  applicableStationIds?: string[];
}

export interface GetAvailableDiscountsParams {
  stationId: string;
  basePrice: number;
  startTime?: string;
  durationMinutes?: number;
  customerAccountId?: string;
  manualCode?: string;
}

export interface GetAvailableDiscountsResponse {
  basePrice: number;
  recommendedDiscountId: string | null;
  recommendedDiscountType: DiscountSourceType | null;
  discounts: AvailableDiscountItem[];
}

export interface CalculateDiscountSelectionInput {
  stationId: string;
  basePrice: number;
  startTime?: string;
  customerAccountId?: string;
  selectedDiscountId?: string | null;
  selectedType?: DiscountSelectionType;
  code?: string | null;
}

export interface BetterDiscountSuggestion {
  id: string;
  type: string;
  title: string;
  discountAmount: number;
  savingsDifference: number;
}

export interface CalculateDiscountSelectionResponse {
  isValid: boolean;
  originalAmount: number;
  discountAmount: number;
  customerPayableAmount: number;
  merchantPayoutAmount?: number;
  platformCommission?: number;
  platformFundedDiscount?: number;
  merchantFundedDiscount?: number;
  discountFundingSource?: string | null;
  campaignId?: string | null;
  discountId?: string | null;
  voucherCode?: string | null;
  appliedDiscount?: Record<string, unknown> | null;
  betterDiscountAvailable?: boolean;
  betterDiscount?: BetterDiscountSuggestion | null;
}

export interface ReserveDiscountInput {
  stationId: string;
  basePrice: number;
  startTime?: string;
  customerAccountId: string;
  selectedDiscountId?: string | null;
  selectedType?: DiscountSelectionType;
  code?: string | null;
  bookingHoldId?: string | null;
  reservationId?: string | null;
  idempotencyKey?: string | null;
  ttlMinutes?: number;
}

export interface ReserveDiscountResponse {
  id: string;
  campaignId?: string | null;
  discountId?: string | null;
  reservationId?: string | null;
  bookingHoldId?: string | null;
  customerAccountId: string;
  discountAmount: number;
  originalPrice?: number | null;
  finalPrice?: number | null;
  fundingSource: string;
  status: "AVAILABLE" | "RESERVED" | "REDEEMED" | "RELEASED" | "EXPIRED";
  reservedAt: string;
  expiresAt?: string | null;
  idempotencyKey?: string | null;
  voucherCode?: string | null;
}
