import type { Reservation } from "@/types/reservation";

export type VerificationStatus = "APPROVED" | "PENDING" | "REJECTED" | "NOT_SUBMITTED";

export interface OwnerVerificationData {
  ownerName: string;
  nationalId: string;
  centerName: string;
  centerAddress: string;
  licenseImageUrl?: string;
  licenseFileName?: string;
}

export interface OwnerGamingCenterRef {
  id: string;
  name?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
}

export interface OwnerMe {
  id: string;
  phone?: string;
  fullName?: string;
  role?: string;
  isActive?: boolean;
  verificationStatus?: VerificationStatus;
  verificationData?: OwnerVerificationData;
  gamingCenterId?: string;
  gamingCenters?: OwnerGamingCenterRef[];
  subscriptionDaysLeft?: number;
}

export interface PublicCenter {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
}

/** فیلدهای مشتری در OpenAPI برای Reservation تعریف نشده‌اند؛ اختیاری */
export interface OwnerReservation extends Reservation {
  customer?: { fullName?: string; phone?: string };
  customerName?: string;
  customerPhone?: string;
}

export interface OwnerReservationListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  signal?: AbortSignal;
}

export interface OwnerReservationListResult {
  items: OwnerReservation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CenterSettings {
  id?: string;
  gamingCenterId?: string;
  timeZone?: string;
  workStartTime?: string;
  workEndTime?: string;
  allowOnlineBooking?: boolean;
  onlineBookingAutoConfirm?: boolean;
  preventOverlaps?: boolean;
}

/**
 * ساختار پاسخ تحلیلی خلاصه وضعیت مرکز بازی از:
 * GET /gamingCenters/{gamingCenterId}/analytics/summary
 */
export interface OwnerAnalyticsSummary {
  totalIncome?: number;
  totalReservations?: number;
  activeStationsCount?: number;
  withdrawableAmount?: number;
  withdrawableRevenue?: number;
  netRevenue?: number;
  totalRevenue?: number;
  currency?: string;
  refundedAmount?: number;
  commissionPaid?: number;
  commissionPending?: number;
  [key: string]: unknown;
}

export interface SiteSettings {
  logoUrl?: string;
  faviconUrl?: string;
  defaultSeoTitle?: string;
  defaultSeoDescription?: string;
}

export interface OwnerRating {
  id: string;
  rating: number;
  comment?: string;
  status?: "PUBLISHED" | "HIDDEN" | "DELETED";
  customerName?: string;
  createdAt?: string;
  reply?: string;
  repliedAt?: string;
}

export interface MediaItem {
  id?: string;
  url: string;
  altText?: string;
  purpose?: string;
}

export interface StationInput {
  name: string;
  stationType: "PC" | "PLAYSTATION" | "XBOX" | "SWITCH" | "VR";
  hourlyPrice: number;
  quantity?: number;
  defaultControllers?: number;
  maxExtraControllers?: number;
  extraControllerPrice?: number;
  description?: string;
  minRentHours?: number;
  maxRentHours?: number;
  defaultDurationHours?: number;
  incrementMinutes?: number;
  isVip?: boolean;
}

export type EarningStatus = "PENDING" | "ACCRUED" | "CHARGED" | "WAIVED" | "REFUNDED";

/**
 * مدل موجودی و کمیسیون رزرو مطابق با OpenAPI schema Earning
 */
export interface Earning {
  id: string;
  reservationId: string;
  gamingCenterId?: string;
  status: EarningStatus;
  commissionAmount: number;
  currency?: string;
  targetPeriod?: string | null;
  targetReached?: boolean;
  targetContribution?: boolean;
  createdAt?: string;
}

export interface CommissionListParams {
  page?: number;
  pageSize?: number;
  status?: EarningStatus;
  signal?: AbortSignal;
}

export interface CommissionListResult {
  items: Earning[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TicketMessage {
  id: string;
  senderType: "USER" | "SUPPORT";
  text: string;
  attachment?: string | null;
  createdAt: string;
}

export interface Ticket {
  id: string;
  subject: string;
  status: "OPEN" | "PENDING" | "ANSWERED" | "CLOSED";
  priority?: "LOW" | "MEDIUM" | "HIGH";
  category?: "TECHNICAL" | "FINANCIAL" | "SALES" | "ACCOUNT";
  createdAt: string;
  messages?: TicketMessage[];
}