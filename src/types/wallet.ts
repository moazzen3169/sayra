export type WithdrawalRequestStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "CANCELLED";

export type WalletTransactionType =
  | "REFUND"
  | "RESERVATION_PAYMENT"
  | "DEPOSIT"
  | "MANUAL_ADJUSTMENT"
  | "WITHDRAWAL_HOLD"
  | "WITHDRAWAL_REFUND"
  | "WITHDRAWAL_PAID";

export interface BankDetails {
  sheba: string;
  cardNumber?: string;
  accountHolderName: string;
  bankName?: string;
}

export interface CustomerWallet {
  walletBalance: number; // authoritative integer in IRR (Rials) or Tomans
  reservedBalance: number;
  availableBalance: number; // walletBalance - reservedBalance
  lastWithdrawalRequestAt?: string | null;
  canWithdrawIn24h?: boolean;
  currency?: string; // e.g. "IRR" or "تومان"
}

export interface WithdrawalRequest {
  id: string;
  customerAccountId?: string;
  amount: number;
  currency?: string;
  status: WithdrawalRequestStatus;
  rejectionReason?: string | null;
  paymentReference?: string | null;
  bankDetails: BankDetails;
  reviewerAdminId?: string | null;
  approvedAt?: string | null;
  processedAt?: string | null;
  paidAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateWithdrawalRequestPayload {
  amount: number;
  bankDetails: BankDetails;
  note?: string;
}

export interface WithdrawalListParams {
  status?: WithdrawalRequestStatus;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface PaginatedWithdrawalsResult {
  items: WithdrawalRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface WalletTransaction {
  id: string;
  customerAccountId?: string;
  amount: number;
  type: WalletTransactionType;
  description?: string;
  referenceId?: string;
  createdAt: string;
}

export interface TransactionListParams {
  type?: WalletTransactionType;
  page?: number;
  pageSize?: number;
  signal?: AbortSignal;
}

export interface PaginatedTransactionsResult {
  items: WalletTransaction[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
