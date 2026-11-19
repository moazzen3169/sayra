
import type { Reservation, ReservationTimeProposal } from "@/types/reservation";
import type { ExtraControllerConfigInput } from "@/types/gaming-center/station.types";

export type VerificationStatus =
  | "APPROVED"
  | "PENDING"
  | "REJECTED"
  | "NOT_SUBMITTED";

/**
 * ساختار رکورد احراز هویت گیم‌نت مطابق با OpenAPI schema: GamingCenterVerification
 */
export interface GamingCenterVerificationRecord {
  id: string;
  gamingCenterId: string;
  ownerFullName?: string | null;
  phoneNumber?: string | null;
  gamingCenterName?: string | null;
  businessLicenseUrl: string;
  nationalCardUrl?: string | null;
  idWithSelfieUrl?: string | null;
  status: VerificationStatus;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * ساختار پاسخ وضعیت احراز هویت مطابق با OpenAPI schema: GamingCenterVerificationStatusResponse
 */
export interface GamingCenterVerificationStatusResponse {
  gamingCenterId: string;
  name: string;
  verificationStatus: VerificationStatus;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  latestVerification?: GamingCenterVerificationRecord | null;
}

/**
 * ورودی ثبت درخواست احراز هویت مطابق با OpenAPI schema: SubmitVerificationInput
 */
export interface SubmitGamingCenterVerificationInput {
  ownerFullName: string;
  phoneNumber: string;
  gamingCenterName: string;
  businessLicense: File;
}

/**
 * خروجی ثبت درخواست احراز هویت مطابق با 201 POST /gamingCenters/{gamingCenterId}/verification
 */
export interface SubmitGamingCenterVerificationResult {
  verificationId: string;
  gamingCenterId: string;
  status: VerificationStatus;
  ownerFullName: string;
  phoneNumber: string;
  gamingCenterName: string;
  businessLicenseUrl: string;
  message?: string;
}

export interface OwnerVerificationData {
  ownerName: string;
  nationalId?: string;
  phoneNumber?: string;
  centerName: string;
  centerAddress?: string;
  licenseImageUrl?: string;
  licenseFileName?: string;
}

export interface OwnerGamingCenterRef {
  id: string;
  name?: string;
  englishName?: string;
  slug?: string;
  description?: string;
  isActive?: boolean;
  verificationStatus?: VerificationStatus;
}

export interface OwnerMe {
  id: string;
  actorId?: string;
  actorType?: string;
  sessionId?: string;
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
  englishName?: string;
  slug: string;
  description?: string;
  isActive?: boolean;
  verificationStatus?: VerificationStatus;
  pcCount?: number;
  consoleCount?: number;
  is_open?: boolean;
  hourlyRate?: number;
  raiting?: number;
  comment_count?: number;
  addresses?: Array<{
    id?: string;
    province?: string;
    city?: string;
    addressLine?: string;
    address?: string;
    phone?: string;
  }>;
}

/** فیلدهای تکمیلی رزرو در پنل مدیریت گیم‌نت */
export interface OwnerReservation extends Reservation {
  staffId?: string | null;
  staff?: {
    id?: string;
    fullName?: string;
    publicName?: string;
    phone?: string;
  } | null;
  customerAccountId?: string | null;
  customer?: {
    id?: string;
    fullName?: string;
    phone?: string;
    email?: string;
    phoneVerifiedAt?: string | null;
  } | null;
  user?: {
    id?: string;
    fullName?: string;
    phone?: string;
  } | null;
  customerName?: string;
  customerPhone?: string;
  note?: string | null;
  cancelReason?: string | null;
  cancellationReason?: string | null;
  discountAmount?: number;
  originalPrice?: number;
  finalPrice?: number;
  discountCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
  confirmedAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  canceledAt?: string | null;
  proposals?: ReservationTimeProposal[];
  session?: {
    id?: string;
    status?: string;
    startedAt?: string | null;
    pausedAt?: string | null;
    resumedAt?: string | null;
    stoppedAt?: string | null;
    durationMinutes?: number;
  } | null;
  station?: {
    id?: string;
    name?: string;
    stationType?: string;
    hourlyPrice?: number;
    isVip?: boolean;
  } | null;
  gamingCenter?: {
    id?: string;
    name?: string;
    slug?: string;
    address?: string;
  } | null;
  payment?: Record<string, unknown> | null;
  [key: string]: unknown;
}

export interface ReservationPaymentStatusInfo {
  paymentState?: string;
  status?: string;
  amount?: number;
  paidAmount?: number;
  currency?: string;
  gateway?: string;
  authority?: string;
  refId?: string;
  trackingCode?: string;
  paymentId?: string;
  paidAt?: string | null;
  [key: string]: unknown;
}

export interface OwnerReservationListParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  checkInCode?: string;
  signal?: AbortSignal;
}

export interface OwnerReservationListResult {
  items: OwnerReservation[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface GamingCenterSchedule {
  id?: string;
  gamingCenterId?: string;
  dayOfWeek: number; // 0: شنبه, 1: یک‌شنبه, ..., 6: جمعه
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  isClosed: boolean;
}

export interface GamingCenterClosure {
  id: string;
  gamingCenterId?: string;
  title: string;
  reason?: string;
  startDate: string;
  endDate: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateClosureInput {
  title: string;
  reason?: string;
  startDate: string;
  endDate: string;
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
  closedDays?: number[];
  schedules?: GamingCenterSchedule[];
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
  deviceTypeId?: string;
  extraControllers?: ExtraControllerConfigInput[];
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

export type EarningStatus =
  | "PENDING"
  | "ACCRUED"
  | "CHARGED"
  | "WAIVED"
  | "REFUNDED";

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

/**
 * اطلاعات لازم برای ایجاد مرکز بازی
 *
 * name: نام فارسی مرکز
 * englishName: نام انگلیسی مرکز (برای تولید slug)
 * slug: شناسه متنی انگلیسی و URL-friendly
 *
 * توجه: ارسال englishName به Backend فقط در صورت پشتیبانی API انجام شود.
 */
export interface CreateGamingCenterPayload {
  name: string;
  englishName?: string;
  slug: string;
  ownerId: string;
  games?: string[];
}

export interface CreateBranchAddressPayload {
  address?: string;
  addressLine?: string;
  city?: string;
  province?: string;
  phone?: string;
  postalCode?: string;
  lat?: number;
  lng?: number;
}

export interface CreateLinkPayload {
  platform: string;
  url: string;
}
