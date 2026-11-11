import { describe, it, expect, beforeEach, afterEach, mock } from "bun:test";
import { apiClient } from "@/lib/api/client";
import { walletService, WalletValidationError } from "@/services/walletService";
import { ContractGapError } from "@/types/customerApi";
import type { CustomerWallet } from "@/types/wallet";

describe("Customer Wallet & Withdrawal Service (walletService)", () => {
  let originalGet: typeof apiClient.get;
  let originalPost: typeof apiClient.post;

  beforeEach(() => {
    originalGet = apiClient.get;
    originalPost = apiClient.post;
  });

  afterEach(() => {
    apiClient.get = originalGet;
    apiClient.post = originalPost;
  });

  describe("1. Get Wallet Status via GET /customer/wallet", () => {
    it("fetches wallet status and calculates available balance accurately", async () => {
      apiClient.get = mock(async () => ({
        status: 200,
        data: {
          walletBalance: 1000000,
          reservedBalance: 200000,
          availableBalance: 800000,
          currency: "IRR",
          lastWithdrawalRequestAt: null,
          canWithdrawIn24h: true,
        },
      })) as any;

      const wallet = await walletService.getWallet();
      expect(wallet.walletBalance).toBe(1000000);
      expect(wallet.reservedBalance).toBe(200000);
      expect(wallet.availableBalance).toBe(800000);
      expect(wallet.canWithdrawIn24h).toBe(true);
    });

    it("evaluates canWithdrawIn24h false when lastWithdrawalRequestAt is within 24 hours", async () => {
      const recentDate = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // 2 hours ago
      apiClient.get = mock(async () => ({
        status: 200,
        data: {
          walletBalance: 500000,
          reservedBalance: 0,
          lastWithdrawalRequestAt: recentDate,
        },
      })) as any;

      const wallet = await walletService.getWallet();
      expect(wallet.canWithdrawIn24h).toBe(false);
      expect(wallet.availableBalance).toBe(500000);
    });

    it("evaluates canWithdrawIn24h true when lastWithdrawalRequestAt is older than 24 hours", async () => {
      const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25 hours ago
      apiClient.get = mock(async () => ({
        status: 200,
        data: {
          walletBalance: 500000,
          reservedBalance: 0,
          lastWithdrawalRequestAt: oldDate,
        },
      })) as any;

      const wallet = await walletService.getWallet();
      expect(wallet.canWithdrawIn24h).toBe(true);
    });
  });

  describe("2. Request Withdrawal via POST /customer/wallet/withdraw", () => {
    it("validates positive integer amount", async () => {
      await expect(
        walletService.requestWithdrawal({
          amount: 0,
          bankDetails: {
            sheba: "120120000000001234567890",
            accountHolderName: "کاربر تست",
          },
        })
      ).rejects.toThrow(WalletValidationError);

      await expect(
        walletService.requestWithdrawal({
          amount: -50000,
          bankDetails: {
            sheba: "120120000000001234567890",
            accountHolderName: "کاربر تست",
          },
        })
      ).rejects.toThrow("مبلغ درخواستی برای برداشت باید عدد صحیح مثبت و بزرگتر از صفر باشد.");
    });

    it("rejects amount exceeding availableBalance", async () => {
      const wallet: CustomerWallet = {
        walletBalance: 300000,
        reservedBalance: 100000,
        availableBalance: 200000,
        canWithdrawIn24h: true,
      };

      await expect(
        walletService.requestWithdrawal(
          {
            amount: 250000,
            bankDetails: {
              sheba: "120120000000001234567890",
              accountHolderName: "کاربر تست",
            },
          },
          wallet
        )
      ).rejects.toThrow("مبلغ درخواستی نمی‌تواند بیشتر از موجودی قابل برداشت شما باشد.");
    });

    it("enforces 24-hour single request restriction", async () => {
      const recentDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
      const wallet: CustomerWallet = {
        walletBalance: 1000000,
        reservedBalance: 0,
        availableBalance: 1000000,
        lastWithdrawalRequestAt: recentDate,
        canWithdrawIn24h: false,
      };

      await expect(
        walletService.requestWithdrawal(
          {
            amount: 100000,
            bankDetails: {
              sheba: "120120000000001234567890",
              accountHolderName: "کاربر تست",
            },
          },
          wallet
        )
      ).rejects.toThrow("هر کاربر در هر ۲۴ ساعت صرفاً مجاز به ثبت یک درخواست برداشت است");
    });

    it("validates 24-digit Sheba IBAN length", async () => {
      await expect(
        walletService.requestWithdrawal({
          amount: 100000,
          bankDetails: {
            sheba: "12345",
            accountHolderName: "کاربر تست",
          },
        })
      ).rejects.toThrow("شماره شبا باید شامل ۲۴ رقم عددی معتبر (بدون IR) باشد.");
    });

    it("validates account holder name", async () => {
      await expect(
        walletService.requestWithdrawal({
          amount: 100000,
          bankDetails: {
            sheba: "120120000000001234567890",
            accountHolderName: "  ",
          },
        })
      ).rejects.toThrow("نام و نام خانوادگی صاحب حساب الزامی است.");
    });

    it("submits valid withdrawal request successfully", async () => {
      let capturedPath = "";
      let capturedBody: any = null;

      apiClient.post = mock(async (path: string, body: any) => {
        capturedPath = path;
        capturedBody = body;
        return {
          status: 201,
          data: {
            id: "wdr-101",
            amount: 500000,
            status: "PENDING",
            bankDetails: body.bankDetails,
            createdAt: new Date().toISOString(),
          },
        };
      }) as any;

      const res = await walletService.requestWithdrawal({
        amount: 500000,
        bankDetails: {
          sheba: "IR120120000000001234567890",
          accountHolderName: "علیرضا رضایی",
          cardNumber: "6037991823456789",
          bankName: "ملی",
        },
        note: "درخواست تسویه کیف پول",
      });

      expect(capturedPath).toBe("/customer/wallet/withdraw");
      expect(capturedBody.amount).toBe(500000);
      expect(capturedBody.bankDetails.sheba).toBe("IR120120000000001234567890");
      expect(capturedBody.bankDetails.accountHolderName).toBe("علیرضا رضایی");
      expect(capturedBody.bankDetails.cardNumber).toBe("6037991823456789");
      expect(res.id).toBe("wdr-101");
      expect(res.status).toBe("PENDING");
    });
  });

  describe("3. Withdrawal History & Detail", () => {
    it("fetches paginated withdrawal requests", async () => {
      apiClient.get = mock(async () => ({
        status: 200,
        data: [
          {
            id: "wdr-1",
            amount: 200000,
            status: "APPROVED",
            bankDetails: {
              sheba: "IR120120000000001234567890",
              accountHolderName: "تست",
            },
            createdAt: "2026-04-10T10:00:00.000Z",
          },
        ],
        meta: {
          pagination: {
            total: 1,
            page: 1,
            pageSize: 10,
            totalPages: 1,
          },
        },
      })) as any;

      const res = await walletService.getWithdrawals({ page: 1, pageSize: 10 });
      expect(res.items.length).toBe(1);
      expect(res.items[0].id).toBe("wdr-1");
      expect(res.items[0].status).toBe("APPROVED");
      expect(res.total).toBe(1);
    });

    it("fetches single withdrawal detail", async () => {
      apiClient.get = mock(async () => ({
        status: 200,
        data: {
          id: "wdr-1",
          amount: 200000,
          status: "PAID",
          paymentReference: "PAY-9921",
          bankDetails: {
            sheba: "IR120120000000001234567890",
            accountHolderName: "تست",
          },
          createdAt: "2026-04-10T10:00:00.000Z",
        },
      })) as any;

      const item = await walletService.getWithdrawalById("wdr-1");
      expect(item.id).toBe("wdr-1");
      expect(item.status).toBe("PAID");
      expect(item.paymentReference).toBe("PAY-9921");
    });
  });

  describe("4. Wallet Transactions", () => {
    it("fetches paginated transactions with type filtering", async () => {
      let queryCaptured: any = null;
      apiClient.get = mock(async (_path: string, opts?: any) => {
        queryCaptured = opts?.query;
        return {
          status: 200,
          data: [
            {
              id: "tx-1",
              amount: 50000,
              type: "REFUND",
              description: "استرداد وجه رزرو",
              createdAt: "2026-04-09T12:00:00.000Z",
            },
            {
              id: "tx-2",
              amount: 200000,
              type: "WITHDRAWAL_HOLD",
              description: "رزرو موجودی برای برداشت",
              createdAt: "2026-04-10T10:00:00.000Z",
            },
          ],
        };
      }) as any;

      const res = await walletService.getTransactions({ type: "REFUND" });
      expect(queryCaptured.type).toBe("REFUND");
      expect(res.items.length).toBe(2);
      expect(res.items[0].type).toBe("REFUND");
    });
  });
});

  describe("5. Wallet Charge via POST /customer/wallet/charge", () => {
    it("validates positive integer amount for charging", async () => {
      await expect(
        walletService.chargeWallet({
          amount: 0,
        })
      ).rejects.toThrow(WalletValidationError);

      await expect(
        walletService.chargeWallet({
          amount: -10000,
        })
      ).rejects.toThrow("مبلغ شارژ باید یک عدد صحیح بزرگتر از صفر باشد.");
    });

    it("enforces minimum charge threshold of 1,000 Tomans", async () => {
      await expect(
        walletService.chargeWallet({
          amount: 500,
        })
      ).rejects.toThrow("حداقل مبلغ شارژ کیف پول ۱,۰۰۰ تومان می‌باشد.");
    });

    it("initiates charge successfully when backend supports it and returns payment URL", async () => {
      let capturedPath = "";
      let capturedBody: any = null;
      let capturedHeaders: any = null;

      apiClient.post = mock(async (path: string, body: any, opts?: any) => {
        capturedPath = path;
        capturedBody = body;
        capturedHeaders = opts?.headers;
        return {
          status: 201,
          data: {
            paymentId: "pay_wlt_12345",
            paymentUrl: "https://gateway.zibal.ir/start/987654",
            amount: 200000,
            currency: "IRT",
            status: "INITIATED",
          },
        };
      }) as any;

      const res = await walletService.chargeWallet(
        {
          amount: 200000,
          currency: "IRT",
          redirectUrl: "https://sayra.ir/profile?wallet=verify",
          description: "شارژ کیف پول",
        },
        "idem-wlt-uuid-99"
      );

      expect(capturedPath).toBe("/customer/wallet/charge");
      expect(capturedBody.amount).toBe(200000);
      expect(capturedBody.currency).toBe("IRT");
      expect(capturedBody.redirectUrl).toBe("https://sayra.ir/profile?wallet=verify");
      expect(capturedHeaders?.["Idempotency-Key"]).toBe("idem-wlt-uuid-99");
      expect(res.paymentId).toBe("pay_wlt_12345");
      expect(res.paymentUrl).toBe("https://gateway.zibal.ir/start/987654");
    });

    it("throws ContractGapError when backend responds with 404/501 (missing backend implementation)", async () => {
      apiClient.post = mock(async () => {
        const err: any = new Error("Not Found");
        err.status = 404;
        throw err;
      }) as any;

      await expect(
        walletService.chargeWallet({
          amount: 50000,
        })
      ).rejects.toThrow(ContractGapError);

      try {
        await walletService.chargeWallet({ amount: 50000 });
      } catch (e: any) {
        expect(e.code).toBe("CONTRACT_GAP");
        expect(e.message).toContain("سرویس شارژ آنلاین کیف پول");
      }
    });
  });
