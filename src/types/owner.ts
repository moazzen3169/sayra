import type { Reservation } from "@/types/reservation";

export interface OwnerMe {
  id: string;
  phone?: string;
  fullName?: string;
  role?: string;
  /** ⚠️ در OpenAPI نیست؛ فقط در صورت وجود در پاسخ /auth/me استفاده می‌شود */
  gamingCenterId?: string;
  gamingCenters?: { id: string }[];
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

export interface CenterSettings {
  timeZone?: string;
  workStartTime?: string;
  workEndTime?: string;
  allowOnlineBooking?: boolean;
  onlineBookingAutoConfirm?: boolean;
  preventOverlaps?: boolean;
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
  minRentHours?: number;
  maxRentHours?: number;
  defaultDurationHours?: number;
  incrementMinutes?: number;
  isVip?: boolean;
}

export interface Earning {
  id: string;
  reservationId: string;
  status: "PENDING" | "ACCRUED" | "CHARGED" | "WAIVED" | "REFUNDED";
  commissionAmount: number;
  currency?: string;
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