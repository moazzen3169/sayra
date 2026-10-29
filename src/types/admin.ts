export interface AdminStatItem {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  description?: string;
  iconName?: string;
}

export interface AdminPendingItem {
  id: string;
  title: string;
  subtitle: string;
  type: "owner_verification" | "ticket" | "gamecenter_review";
  date: string;
  link: string;
  badgeText: string;
  badgeVariant?: "primary" | "warning" | "success" | "danger" | "neutral";
}

export interface AdminRecentReservation {
  id: string;
  reservationCode: string;
  customerName: string;
  customerPhone: string;
  gamecenterName: string;
  deviceName: string;
  timeSlot: string;
  date: string;
  amount: number;
  status: "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELED";
  paymentStatus: "PAID" | "UNPAID" | "PENDING" | "REFUNDED";
}

export interface AdminReservationTrendPoint {
  label: string;
  count: number;
  amount: number;
}

export interface AdminDashboardData {
  stats: AdminStatItem[];
  reservationTrend: AdminReservationTrendPoint[];
  pendingItems: AdminPendingItem[];
  recentReservations: AdminRecentReservation[];
}
