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

export interface Reservation {
  id: string;
  gamingCenterId: string;
  stationId: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  paymentState: PaymentState;
  totalHours: number;
  totalPrice: number;
  stationSnapshot?: {
    name: string;
    hourlyPrice: number;
    stationType: string;
  };

  // ⚠️ فیلدهای زیر در OpenAPI فعلی (v1.0-LOCKED) وجود ندارند.
  // اختیاری هستند و تا تأیید بک‌اند فقط در صورت وجود نمایش داده می‌شوند.
  gamingCenterName?: string;
  gamingCenterAddress?: string;
  reservationCode?: string;
  canRate?: boolean;
  isRated?: boolean;
}

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
  createdAt: string;
}