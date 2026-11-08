/**
 * Types for Group Reservation
 * Based on POST /api/v1/public/gamingCenters/:gamingCenterSlug/group-reservations
 */

export interface GroupReservationCustomer {
  fullName: string;
  phone: string;
  email?: string;
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
