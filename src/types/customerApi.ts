/**
 * Customer API Types & Schemas
 * Strictly mirrors OpenAPI v1.0-LOCKED (public/context/openapi-yaml.md)
 * Do not invent fields. Unconfirmed or UI-only properties must be explicitly typed or omitted.
 */

// ---------------------------------------------------------------------------
// Common Envelopes & Pagination
// ---------------------------------------------------------------------------

export interface ApiPaginationMeta {
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  limit?: number;
  totalItems?: number;
}

export interface ApiMeta {
  requestId?: string;
  pagination?: ApiPaginationMeta;
}

export interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
  meta?: ApiMeta;
  message?: string;
}

// ---------------------------------------------------------------------------
// Customer Auth & Profile (/auth/customer/* & /customer/me)
// ---------------------------------------------------------------------------

export interface CustomerProfile {
  id: string;
  phone: string;
  fullName?: string;
  phoneVerifiedAt?: string;
}

export interface CustomerOtpRequestPayload {
  phone: string;
}

export interface CustomerOtpVerifyPayload {
  phone: string;
  code: string;
}

export interface CustomerAuthVerifyResponse {
  accessToken: string;
  refreshToken?: string;
  user?: CustomerProfile;
}

export interface CustomerAuthRefreshPayload {
  refreshToken: string;
}

export interface CustomerAuthRefreshResponse {
  accessToken: string;
}

// ---------------------------------------------------------------------------
// Public Gaming Center (/public/gamingCenters/* & /gamingCenters/{id}/stations)
// ---------------------------------------------------------------------------

/** آدرس تعبیه‌شده در پاسخ مرکز بازی (فیلد addresses) */
export interface GamingCenterAddress {
  id?: string;
  gamingCenterId?: string;
  title?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  addressLine?: string | null;
  postalCode?: string | null;
  lat?: number | null;
  lng?: number | null;
  isPrimary?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PublicGamingCenter {
  id: string;
  name: string;
  slug: string;
  isActive?: boolean;
  description?: string;
  createdAt?: string;
  updatedAt?: string;

  // فیلدهای کارت گیمنت (پاسخ جدید API)
  pcCount?: number;
  consoleCount?: number;
  ps4?: boolean;
  ps5?: boolean;
  pc?: boolean;
  xbox?: boolean;
  is_open?: boolean;
  hourlyRate?: number;
  /** املای فیلد در API همین است */
  raiting?: number;
  comment_count?: number;
  addresses?: GamingCenterAddress[];
}

export type StationType = "PC" | "PLAYSTATION" | "XBOX" | "SWITCH" | "VR";

export interface GameStation {
  id: string;
  gamingCenterId: string;
  name: string;
  stationType: StationType | string;
  catalogDeviceId?: string | null;
  coverImageUrl?: string | null;
  isVip?: boolean;
  hourlyPrice: number;
  minRentHours?: number;
  maxRentHours?: number;
  defaultDurationHours?: number;
  incrementMinutes?: number;
  isActive?: boolean;
}

export interface AvailabilitySlot {
  startTime: string;
  endTime?: string;
  durationMinutes?: number;
  stationId?: string;
  isAvailable?: boolean;
  status?: "AVAILABLE" | "UNAVAILABLE" | string;
}

export interface AvailabilitySlotsParams {
  slug: string;
  date: string;
  stationId?: string;
  signal?: AbortSignal;
}

export interface PublicMediaItem {
  id: string;
  gamingCenterId?: string;
  url: string;
  purpose?: "COVER" | "GALLERY" | "STATION" | "LOGO" | string;
  altText?: string;
  createdAt?: string;
}

export interface PublicSocialLink {
  id?: string;
  type?: string;
  url: string;
  label?: string;
}

export interface PublicAddress {
  id?: string;
  title?: string | null;
  /** نام قدیمی فیلد؛ بک‌اند فعلی addressLine برمی‌گرداند */
  address?: string | null;
  addressLine?: string | null;
  province?: string | null;
  city?: string | null;
  district?: string | null;
  postalCode?: string | null;
  isPrimary?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  lat?: number | null;
  lng?: number | null;
}

export interface PublicRating {
  id: string;
  gamingCenterId: string;
  reservationId?: string;
  rating: number;
  comment?: string;
  status?: "PUBLISHED" | "HIDDEN" | "DELETED";
  createdAt?: string;
  author?: string;
}

// ---------------------------------------------------------------------------
// Online Reservations (/public/gamingCenters/{slug}/reservation & /customer/reservation/*)
// ---------------------------------------------------------------------------

export type ReservationStatus =
  | "PENDING"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELED"
  | "NO_SHOW";

export type PaymentState =
  | "UNPAID"
  | "PENDING"
  | "PARTIALLY_PAID"
  | "PAID"
  | "REFUNDED"
  | "OVERPAID"
  | "FAILED"
  | "CANCELED";

export interface StationSnapshot {
  name?: string;
  hourlyPrice?: number;
  stationType?: string;
}

export interface Reservation {
  id: string;
  gamingCenterId: string;
  stationId: string;
  staffId?: string;
  customerAccountId?: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  paymentState: PaymentState;
  totalHours: number;
  totalPrice: number;
  stationSnapshot?: StationSnapshot;

  // Optional server-enriched or transition fields
  gamingCenterName?: string;
  gamingCenterAddress?: string;
  reservationCode?: string;
  canRate?: boolean;
  isRated?: boolean;
}

export interface CreateCustomerReservationPayload {
  stationId: string;
  startTime: string;
  customer: {
    fullName: string;
    phone: string;
    email?: string;
  };
  staffId?: string;
  note?: string;
}

export interface SubmitReservationRatingPayload {
  rating: number; // 1 to 5
  comment?: string;
}

// ---------------------------------------------------------------------------
// Reservation Time Proposals (/customer/reservation/{id}/proposals/*)
// ---------------------------------------------------------------------------

export type ProposalStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "CANCELLED";

export interface ReservationTimeProposal {
  id: string;
  reservationId: string;
  originalStartTime: string;
  originalEndTime: string;
  proposedStartTime: string;
  proposedEndTime: string;
  note?: string | null;
  status: ProposalStatus;
  createdByUserId?: string;
  customerRespondedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Customer Favorites & Saved Centers (Contract Gap in OpenAPI v1.0-LOCKED)
// ---------------------------------------------------------------------------

export interface CustomerFavoriteItem {
  id: string;
  gamingCenterId: string;
  gamingCenter?: PublicGamingCenter;
  createdAt: string;
}

export interface CustomerFavoriteStatus {
  isFavorite: boolean;
  favoritedAt?: string;
}

// ---------------------------------------------------------------------------
// Customer Notifications (/notifications/*)
// ---------------------------------------------------------------------------

export type NotificationType =
  | "RESERVATION_CREATED"
  | "RESERVATION_CONFIRMED"
  | "RESERVATION_REJECTED"
  | "RESERVATION_CANCELLED"
  | "RESERVATION_TIME_PROPOSED"
  | string;

export interface CustomerNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationUnreadCountResponse {
  count: number;
}

// ---------------------------------------------------------------------------
// Customer Support Tickets (/tickets/*)
// ---------------------------------------------------------------------------

export type TicketCategory = "TECHNICAL" | "FINANCIAL" | "SALES" | "ACCOUNT";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";
export type TicketStatus = "OPEN" | "PENDING" | "ANSWERED" | "CLOSED";

export interface CustomerTicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: "USER" | "SUPPORT" | string;
  text: string;
  attachment?: string | null;
  createdAt: string;
}

export interface CustomerTicket {
  id: string;
  customerAccountId: string;
  assignedToUserId?: string | null;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  closedAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  messages?: CustomerTicketMessage[];
}

export interface CreateCustomerTicketPayload {
  subject: string;
  message: string;
  category: TicketCategory;
  priority?: TicketPriority;
}

export interface SendCustomerTicketMessagePayload {
  text: string;
  attachment?: string;
}

// ---------------------------------------------------------------------------
// Payments (/gamingCenters/{id}/reservation/{id}/payments/*)
// ---------------------------------------------------------------------------

export interface PaymentInitResponse {
  paymentUrl?: string;
  authority?: string;
  transactionId?: string;
  trackingCode?: string;
  amount?: number;
  reservationId?: string;
  [key: string]: unknown;
}

export interface PaymentVerifyGetParams {
  gamingCenterId: string;
  reservationId: string;
  authority?: string;
  status?: string;
}

export interface PaymentVerifyPostPayload {
  authority?: string;
  paymentId?: string;
}

export interface PaymentVerifyResponse {
  success?: boolean;
  paymentState?: "UNPAID" | "PENDING" | "PARTIALLY_PAID" | "PAID" | "REFUNDED" | "OVERPAID" | "FAILED" | "CANCELED";
  paymentStatus?: "INITIATED" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED" | string;
  reservationStatus?: string;
  transactionId?: string;
  trackingCode?: string;
  amount?: number;
  refId?: string;
  cardPan?: string;
  message?: string;
  reservationId?: string;
  groupBookingId?: string;
  holdId?: string;
  [key: string]: unknown;
}

export interface PaymentStatusResponse {
  status?: string;
  paymentState?: "UNPAID" | "PENDING" | "PARTIALLY_PAID" | "PAID" | "REFUNDED" | "OVERPAID" | "FAILED" | "CANCELED";
  transactionId?: string;
  trackingCode?: string;
  amount?: number;
  paidAt?: string;
  authority?: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Customer Media & Attachments (/tickets/{ticketId}/attachments, /public/gamingCenters/{slug}/media)
// ---------------------------------------------------------------------------

export interface CustomerTicketAttachmentResponse {
  url: string;
}

export interface CustomerFileUploadOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
}

// ---------------------------------------------------------------------------
// Explicit Contract Gap Errors
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Iranian Official & Jalali Calendar (/iran-calendar/days)
// ---------------------------------------------------------------------------

export interface IranCalendarEventItem {
  title: string;
  type: string;
  isHoliday?: boolean;
  source?: string;
  verified?: boolean;
}

export interface IranCalendarDayItem {
  date: string;
  year: number;
  month: number;
  monthName: string;
  day: number;
  dayOfWeek: number;
  dayOfWeekName: string;
  dayOfYear: number;
  isWeekend: boolean;
  isHoliday: boolean;
  holidayType: "official" | "weekend" | "none" | string;
  isToday: boolean;
  relativeDay?: string | null;
  relativeDayName?: string | null;
  isOfficialCalendarPublished?: boolean;
  events?: IranCalendarEventItem[];
}

export interface IranCalendarDaysResponse {
  calendar: string;
  from: string;
  to: string;
  totalDays: number;
  days: IranCalendarDayItem[];
}

export class ContractGapError extends Error {
  code: string;

  constructor(feature: string, description: string) {
    super(`[CONTRACT GAP] ${feature}: ${description}`);
    this.name = "ContractGapError";
    this.code = "CONTRACT_GAP";
    Object.setPrototypeOf(this, ContractGapError.prototype);
  }
}