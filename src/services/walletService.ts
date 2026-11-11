import { apiClient } from "@/lib/api/client";
import { ENDPOINTS } from "@/lib/api/endpoints";
import type {
  CustomerWallet,
  WithdrawalRequest,
  CreateWithdrawalRequestPayload,
  WithdrawalListParams,
  PaginatedWithdrawalsResult,
  WalletTransaction,
  TransactionListParams,
  PaginatedTransactionsResult,
  ChargeWalletPayload,
  ChargeWalletResponse,
} from "@/types/wallet";
import { ContractGapError } from "@/types/customerApi";

export class WalletValidationError extends Error {
  code: string;

  constructor(message: string, code = "WALLET_VALIDATION_ERROR") {
    super(message);
    this.name = "WalletValidationError";
    this.code = code;
    Object.setPrototypeOf(this, WalletValidationError.prototype);
  }
}

function parseEnvelope<T>(resData: unknown): T[] {
  if (Array.isArray(resData)) {
    return resData as T[];
  }
  if (resData && typeof resData === "object" && Array.isArray((resData as any).data)) {
    return (resData as any).data as T[];
  }
  return [];
}

export const walletService = {
  /**
   * افزایش موجودی کیف پول و اتصال مستقیم به درگاه پرداخت
   * POST /customer/wallet/charge
   */
  async chargeWallet(
    payload: ChargeWalletPayload,
    idempotencyKey?: string
  ): Promise<ChargeWalletResponse> {
    const { amount, currency = "IRR", redirectUrl, description } = payload;

    if (!Number.isInteger(amount) || amount <= 0) {
      throw new WalletValidationError(
        "مبلغ شارژ باید یک عدد صحیح بزرگتر از صفر باشد.",
        "INVALID_AMOUNT"
      );
    }

    // Minimum charge threshold (e.g. 1,000 Tomans or 10,000 Rials)
    if (amount < 1000) {
      throw new WalletValidationError(
        "حداقل مبلغ شارژ کیف پول ۱,۰۰۰ تومان می‌باشد.",
        "MINIMUM_AMOUNT"
      );
    }

    try {
      const headers: Record<string, string> = {};
      if (idempotencyKey) {
        headers["Idempotency-Key"] = idempotencyKey;
      }

      const response = await apiClient.post<unknown>(
        ENDPOINTS.wallet.charge,
        {
          amount,
          currency,
          redirectUrl,
          description: description || "افزایش موجودی کیف پول",
        },
        { headers }
      );

      const resData = response.data;
      if (resData && typeof resData === "object" && "data" in (resData as any)) {
        return (resData as any).data as ChargeWalletResponse;
      }
      return resData as ChargeWalletResponse;
    } catch (err: unknown) {
      // Contract gap guard: When backend responds with 404/501 or route missing, raise descriptive contract gap error
      const status = (err as any)?.status;
      if (status === 404 || status === 501 || !ENDPOINTS.wallet.charge) {
        throw new ContractGapError(
          "CustomerWalletCharge",
          "سرویس شارژ آنلاین کیف پول در نسخه جاری بک‌اند فعال نشده است. لطفاً منتظر استقرار وب‌سرویس درگاه کیف پول باشید."
        );
      }
      throw err;
    }
  },

  /**
   * دریافت وضعیت موجودی کیف پول کاربر
   * GET /customer/wallet
   */
  async getWallet(signal?: AbortSignal): Promise<CustomerWallet> {
    const response = await apiClient.get<unknown>(ENDPOINTS.wallet.status, { signal });
    const resData = response.data;

    let walletData: any = resData;
    if (resData && typeof resData === "object" && "data" in (resData as any)) {
      walletData = (resData as any).data;
    }

    const walletBalance = Number(walletData?.walletBalance ?? 0);
    const reservedBalance = Number(walletData?.reservedBalance ?? 0);
    const calculatedAvailable = walletBalance - reservedBalance;
    const availableBalance =
      typeof walletData?.availableBalance === "number"
        ? walletData.availableBalance
        : calculatedAvailable;

    const lastWithdrawalRequestAt = walletData?.lastWithdrawalRequestAt ?? null;

    let canWithdrawIn24h = walletData?.canWithdrawIn24h;
    if (typeof canWithdrawIn24h !== "boolean" && lastWithdrawalRequestAt) {
      const lastTime = new Date(lastWithdrawalRequestAt).getTime();
      const now = Date.now();
      canWithdrawIn24h = now >= lastTime + 24 * 60 * 60 * 1000;
    } else if (typeof canWithdrawIn24h !== "boolean") {
      canWithdrawIn24h = true;
    }

    return {
      walletBalance,
      reservedBalance,
      availableBalance: Math.max(0, availableBalance),
      lastWithdrawalRequestAt,
      canWithdrawIn24h,
      currency: walletData?.currency || "IRR",
    };
  },

  /**
   * اعتبارسنجی قوانین تجاری و ارسال درخواست برداشت وجه
   * POST /customer/wallet/withdraw
   */
  async requestWithdrawal(
    payload: CreateWithdrawalRequestPayload,
    currentWallet?: CustomerWallet
  ): Promise<WithdrawalRequest> {
    const { amount, bankDetails, note } = payload;

    // 1. اعتبارسنجی مبلغ مثبت و صحیح
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new WalletValidationError(
        "مبلغ درخواستی برای برداشت باید عدد صحیح مثبت و بزرگتر از صفر باشد.",
        "INVALID_AMOUNT"
      );
    }

    // 2. اعتبارسنجی سقف موجودی در صورت در دسترس بودن وضعیت کیف پول
    if (currentWallet) {
      if (amount > currentWallet.availableBalance) {
        throw new WalletValidationError(
          "مبلغ درخواستی نمی‌تواند بیشتر از موجودی قابل برداشت شما باشد.",
          "INSUFFICIENT_AVAILABLE_BALANCE"
        );
      }

      // 3. محدودیت زمانی ۲۴ ساعته
      if (currentWallet.lastWithdrawalRequestAt) {
        const lastTime = new Date(currentWallet.lastWithdrawalRequestAt).getTime();
        const now = Date.now();
        if (now < lastTime + 24 * 60 * 60 * 1000) {
          throw new WalletValidationError(
            "هر کاربر در هر ۲۴ ساعت صرفاً مجاز به ثبت یک درخواست برداشت است. لطفاً بعداً تلاش فرمایید.",
            "WITHDRAWAL_RATE_LIMIT"
          );
        }
      }
    }

    // 4. اعتبارسنجی شبا و اطلاعات بانکی
    const cleanSheba = bankDetails.sheba?.trim().toUpperCase().replace(/^IR/i, "").replace(/[^0-9]/g, "");
    if (!cleanSheba || cleanSheba.length !== 24) {
      throw new WalletValidationError(
        "شماره شبا باید شامل ۲۴ رقم عددی معتبر (بدون IR) باشد.",
        "INVALID_SHEBA"
      );
    }

    const cleanHolder = bankDetails.accountHolderName?.trim();
    if (!cleanHolder || cleanHolder.length < 3) {
      throw new WalletValidationError(
        "نام و نام خانوادگی صاحب حساب الزامی است.",
        "INVALID_ACCOUNT_HOLDER"
      );
    }

    const body = {
      amount,
      bankDetails: {
        sheba: `IR${cleanSheba}`,
        cardNumber: bankDetails.cardNumber?.replace(/[^0-9]/g, "") || undefined,
        accountHolderName: cleanHolder,
        bankName: bankDetails.bankName?.trim() || undefined,
      },
      note: note?.trim() || undefined,
    };

    const response = await apiClient.post<unknown>(ENDPOINTS.wallet.withdraw, body);
    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in (resData as any)) {
      return (resData as any).data as WithdrawalRequest;
    }
    return resData as WithdrawalRequest;
  },

  /**
   * دریافت تاریخچه درخواست‌های برداشت کاربر با صفحه‌بندی و فیلتر وضعیت
   * GET /customer/wallet/withdrawals
   */
  async getWithdrawals(params: WithdrawalListParams = {}): Promise<PaginatedWithdrawalsResult> {
    const { status, page = 1, pageSize = 10, signal } = params;
    const response = await apiClient.get<unknown>(ENDPOINTS.wallet.withdrawals, {
      query: {
        status,
        page,
        pageSize,
      },
      signal,
    });

    const resData = response.data;
    const items = parseEnvelope<WithdrawalRequest>(resData);
    const meta = response.meta || (resData && typeof resData === "object" ? (resData as any).meta : undefined);
    const pagination = meta?.pagination;

    return {
      items,
      total: pagination?.total ?? pagination?.totalItems ?? items.length,
      page: pagination?.page ?? page,
      pageSize: pagination?.pageSize ?? pageSize,
      totalPages: pagination?.totalPages ?? Math.max(1, Math.ceil(items.length / pageSize)),
    };
  },

  /**
   * مشاهده جزئیات یک درخواست برداشت
   * GET /customer/wallet/withdrawals/:id
   */
  async getWithdrawalById(id: string, signal?: AbortSignal): Promise<WithdrawalRequest> {
    if (!id || typeof id !== "string") {
      throw new WalletValidationError("شناسه درخواست برداشت نامعتبر است.");
    }
    const response = await apiClient.get<unknown>(ENDPOINTS.wallet.withdrawalDetail(id), { signal });
    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in (resData as any)) {
      return (resData as any).data as WithdrawalRequest;
    }
    return resData as WithdrawalRequest;
  },

  /**
   * تاریخچه تراکنش‌های کیف پول کاربر
   * GET /customer/wallet/transactions
   */
  async getTransactions(params: TransactionListParams = {}): Promise<PaginatedTransactionsResult> {
    const { type, page = 1, pageSize = 20, signal } = params;
    const response = await apiClient.get<unknown>(ENDPOINTS.wallet.transactions, {
      query: {
        type,
        page,
        pageSize,
      },
      signal,
    });

    const resData = response.data;
    const items = parseEnvelope<WalletTransaction>(resData);
    const meta = response.meta || (resData && typeof resData === "object" ? (resData as any).meta : undefined);
    const pagination = meta?.pagination;

    return {
      items,
      total: pagination?.total ?? pagination?.totalItems ?? items.length,
      page: pagination?.page ?? page,
      pageSize: pagination?.pageSize ?? pageSize,
      totalPages: pagination?.totalPages ?? Math.max(1, Math.ceil(items.length / pageSize)),
    };
  },

  /**
   * مشاهده جزئیات یک تراکنش کیف پول
   * GET /customer/wallet/transactions/:id
   */
  async getTransactionById(id: string, signal?: AbortSignal): Promise<WalletTransaction> {
    if (!id || typeof id !== "string") {
      throw new WalletValidationError("شناسه تراکنش نامعتبر است.");
    }
    const response = await apiClient.get<unknown>(ENDPOINTS.wallet.transactionDetail(id), { signal });
    const resData = response.data;
    if (resData && typeof resData === "object" && "data" in (resData as any)) {
      return (resData as any).data as WalletTransaction;
    }
    return resData as WalletTransaction;
  },
};
