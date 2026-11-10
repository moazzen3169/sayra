/**
 * Types for Group Reservation & Payment-First Flow
 * Based on:
 * - Hold & Checkout: POST /api/v1/public/gamingCenters/:gamingCenterSlug/group-reservations/checkout
 * - Legacy fallback: POST /api/v1/public/gamingCenters/:gamingCenterSlug/group-reservations
 */

export interface GroupReservationCustomer {
  fullName: string;
  phone: string;
  email?: string;
}

/**
 * وضعیت‌های چرخه عمر BookingHold:
 * - ACTIVE: هولد فعال است و ظرفیت مسدود شده است (مهلت ۱۰ دقیقه).
 * - CONVERTED: پس از تأیید درگاه بانکی به طور اتمیک به GroupBooking و Reservation تبدیل شده است.
 * - EXPIRED: مهلت پرداخت به پایان رسیده و کارگر پس‌زمینه ظرفیت را آزاد کرده است.
 * - RELEASED: به دلیل لغو پرداخت یا خطای بانکی، هولد آزاد شده است.
 */
export type BookingHoldStatus = "ACTIVE" | "CONVERTED" | "EXPIRED" | "RELEASED";

export interface BookingHoldItem {
  stationId: string;
  stationName?: string;
  stationType?: string;
  hourlyPrice?: number;
}

export interface BookingHold {
  id: string;
  gamingCenterId: string;
  gamingCenterSlug?: string;
  startTime: string;
  durationMinutes: number;
  status: BookingHoldStatus;
  expiresAt: string; // ISO 8601 string (10 min default)
  items: BookingHoldItem[];
  createdAt?: string;
}

/**
 * Payload ارسالی از فرانت‌اند به اندپوینت Checkout:
 * POST /api/v1/public/gamingCenters/:gamingCenterSlug/group-reservations/checkout
 */
export interface GroupReservationCheckoutPayload {
  startTime: string; // ISO 8601 string in future
  durationMinutes: number; // 15 to 1440
  items: GroupReservationItemPayload[];
  customer: GroupReservationCustomer;
  note?: string;
}

/**
 * پاسخ بازگشتی از اندپوینت Checkout:
 * شامل اطلاعات BookingHold و رکورد پرداخت و آدرس درگاه بانکی
 */
export interface GroupReservationCheckoutResponse {
  holdId: string;
  paymentId: string;
  paymentUrl: string; // URL درگاه (Zibal, ZarinPal, etc.)
  token?: string; // Payment gateway token / authority
  expiresAt: string; // زمان انقضای هولد ۱۰ دقیقه‌ای
  amount: number; // مبلغ محاسبه شده توسط سرور
  gamingCenterId?: string;
  gamingCenterSlug?: string;
  hold?: BookingHold;
}

export interface GroupReservationItemPayload {
  stationId: string;
}

export interface GroupReservationPayload {
  startTime: string; // ISO 8601 string in future
  durationMinutes: number; // 15 to 1440
  items: GroupReservationItemPayload[];
  customer: GroupReservationCustomer;
  note?: string;
}

export interface GroupReservationItemResult {
  id: string;
  stationId: string;
  stationName?: string;
  stationType?: string;
  hourlyPrice?: number;
  totalPrice?: number;
}

export interface GroupReservation {
  id: string; // Parent group booking identifier
  trackingCode?: string;
  gamingCenterId: string;
  gamingCenterSlug?: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  status: string;
  totalPrice: number;
  customer: GroupReservationCustomer;
  note?: string;
  items: GroupReservationItemResult[];
  createdAt?: string;
}

export interface GroupReservationErrorDetails {
  unavailableStations?: string[];
  [key: string]: unknown;
}

export interface GroupReservationError {
  code:
    | "VALIDATION_ERROR"
    | "STATION_NOT_FOUND_OR_INACTIVE"
    | "DUPLICATE_STATIONS_SELECTED"
    | "SLOT_NOT_AVAILABLE"
    | "RESERVATION_OVERLAP"
    | "RESERVATION_START_TIME_IN_PAST"
    | "INVALID_DURATION"
    | "ACTIVE_RESERVATION_LIMIT_REACHED"
    | "OTP_REQUIRED"
    | "ONLINE_RESERVATION_DISABLED"
    | "NOT_FOUND"
    | "INTERNAL_ERROR"
    | string;
  message: string;
  details?: GroupReservationErrorDetails;
}
