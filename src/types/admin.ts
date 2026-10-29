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

export interface AdminGamecenter {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerPhone: string;
  city: string;
  address: string;
  description?: string;
  isActive: boolean;
  rating?: number;
  stationsCount?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminGamecenterInput {
  name: string;
  slug: string;
  ownerName: string;
  ownerPhone: string;
  city: string;
  address: string;
  description?: string;
  isActive: boolean;
}

export interface AdminUser {
  id: string;
  fullName: string;
  phone: string;
  email?: string;
  role: "USER" | "OWNER" | "ADMIN";
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  nationalId?: string;
}

export interface AdminUserInput {
  fullName: string;
  phone: string;
  email?: string;
  role: "USER" | "OWNER" | "ADMIN";
  isActive: boolean;
  nationalId?: string;
}

export interface AdminTicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: "USER" | "OWNER" | "ADMIN";
  message: string;
  createdAt: string;
}

export interface CannedResponse {
  id: string;
  title: string;
  category?: string;
  text: string;
}

export interface AdminTicket {
  id: string;
  userId?: string;
  userName?: string;
  userPhone?: string;
  userRole?: "USER" | "OWNER";
  gamecenterId?: string;
  gamecenterName?: string;
  reservationId?: string;
  reservationCode?: string;
  subject: string;
  status: "OPEN" | "PENDING" | "ANSWERED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH";
  category: "TECHNICAL" | "FINANCIAL" | "SALES" | "ACCOUNT" | "GENERAL";
  assignedAdminId?: string;
  assignedAdminName?: string;
  createdAt: string;
  lastUpdate: string;
  messagesCount?: number;
  messages?: AdminTicketMessage[];
}

export interface AdminReview {
  id: string;
  userId: string;
  userName: string;
  gamecenterId: string;
  gamecenterName: string;
  rating: number;
  comment: string;
  status: "PUBLISHED" | "HIDDEN" | "PENDING";
  createdAt: string;
}

export interface AdminUserReservation {
  id: string;
  reservationCode: string;
  userId: string;
  gamecenterId: string;
  gamecenterName: string;
  deviceName: string;
  date: string;
  timeSlot: string;
  amount: number;
  status: "CONFIRMED" | "PENDING" | "COMPLETED" | "CANCELED";
  paymentStatus: "PAID" | "UNPAID" | "PENDING" | "REFUNDED";
}

export interface AdminPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminVerificationDocument {
  id: string;
  name: string;
  url: string;
  type: "image" | "pdf" | "unsupported";
}

export interface AdminVerificationQuestionAnswer {
  question: string;
  answer: string;
}

export interface AdminVerificationReviewLog {
  id: string;
  adminName: string;
  action: "APPROVED" | "REJECTED" | "MODIFIED";
  note?: string;
  date: string;
}

export interface AdminOwnerVerification {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  ownerNationalId: string;
  gamecenterId: string;
  gamecenterName: string;
  gamecenterAddress: string;
  gamecenterCity: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  submittedAt: string;
  updatedAt?: string;
  verificationData: {
    centerName: string;
    centerAddress: string;
    licenseFileName?: string;
    licenseImageUrl?: string;
    documents: AdminVerificationDocument[];
    submittedAnswers: AdminVerificationQuestionAnswer[];
  };
  rejectionReason?: string;
  reviewLogs: AdminVerificationReviewLog[];
}

export interface AdminAdRequest {
  id: string;
  title: string;
  description: string;
  bannerUrl?: string;
  durationDays: number;
  gamecenterId: string;
  gamecenterName: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
  submittedAt: string;
  updatedAt?: string;
  decisionReason?: string;
}

export interface AdminListQueryParams {
  search?: string;
  status?: string;
  city?: string;
  role?: string;
  senderType?: string;
  assignedAdminId?: string;
  needingResponseOnly?: boolean;
  discountType?: string;
  scopeType?: string;
  targetAudience?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export type DiscountType = "PERCENTAGE" | "FIXED_AMOUNT";

export type CampaignScopeType = "GLOBAL" | "SPECIFIC_GAMECENTERS" | "DEVICE_TYPES";

export type TargetAudienceType =
  | "ALL"
  | "NEW_USERS"
  | "FIRST_RESERVATION"
  | "REGULAR_CUSTOMERS"
  | "SPECIFIC_USERS";

export type CampaignStatus = "ACTIVE" | "INACTIVE" | "SCHEDULED" | "EXPIRED";

export interface AdminCampaign {
  id: string;
  title: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  scopeType: CampaignScopeType;
  applicableGamecenterIds?: string[];
  applicableGamecenterNames?: string[];
  applicableDeviceTypes?: string[];
  targetAudience: TargetAudienceType;
  specificUserIds?: string[];
  specificUserNames?: string[];
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  totalUsageLimit?: number;
  usedCount: number;
  perUserUsageLimit?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AdminCampaignInput {
  title: string;
  code: string;
  description?: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minOrderAmount?: number;
  scopeType: CampaignScopeType;
  applicableGamecenterIds?: string[];
  applicableDeviceTypes?: string[];
  targetAudience: TargetAudienceType;
  specificUserIds?: string[];
  startDate: string;
  endDate: string;
  status: CampaignStatus;
  totalUsageLimit?: number;
  perUserUsageLimit?: number;
}

export interface SiteGeneralSettings {
  siteTitle: string;
  supportPhone: string;
  supportEmail: string;
  centralAddress: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

export interface SiteReservationSettings {
  platformCommissionPercent: number;
  maxAdvanceBookingDays: number;
  onlinePaymentTimeoutMinutes: number;
  cancellationPenaltyPercent: number;
  freeCancellationHours: number;
}

export interface SiteNotificationSettings {
  autoSendBookingSms: boolean;
  autoSendReminderSms: boolean;
  welcomeSmsTemplate: string;
  reviewApprovalPolicy: "AUTO" | "MANUAL";
}

export interface SiteSecuritySettingsInfo {
  smsGatewayConnected: boolean;
  smsGatewayProvider: string;
  paymentGatewayConnected: boolean;
  paymentGatewayProvider: string;
  sslCertificateStatus: string;
  apiVersion: string;
  lastBackupDate: string;
}

export interface SiteSettings {
  general: SiteGeneralSettings;
  reservation: SiteReservationSettings;
  notification: SiteNotificationSettings;
  securityInfo: SiteSecuritySettingsInfo;
}
