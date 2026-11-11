# Backend Contract & Authorization Gap Report: Customer Wallet Charge & Payment Gateway Integration

## 1. Executive Summary & Problem Statement

The user requested the ability to recharge the customer wallet directly from the Profile page (`/profile`) and the Wallet Modal to any desired amount specified by the user, redirecting straight to an online payment gateway (e.g. Zibal / Shaparak) and crediting the customer's wallet balance upon successful payment verification.

A rigorous audit of the latest backend specification in `openapi.json` (commit `ba8cb52` / `v1.0-LOCKED`) reveals:
1. **Newly Added Endpoints in commit `ba8cb52`**:
   - `GET /customer/wallet`: Retrieves customer total wallet balance, reserved balance, and available balance for withdrawal (`CustomerWalletOverview`).
   - `POST /customer/wallet/withdraw`: Submits a withdrawal request from customer wallet with 24-hour rate limiting and atomic balance reservation.
   - `GET /customer/wallet/withdrawals` & `GET /customer/wallet/withdrawals/{id}`: Withdrawal request history and details.
   - `GET /customer/wallet/transactions` & `GET /customer/wallet/transactions/{id}`: Wallet transactions history (`REFUND`, `RESERVATION_PAYMENT`, `DEPOSIT`, `MANUAL_ADJUSTMENT`, `WITHDRAWAL_HOLD`, `WITHDRAWAL_REFUND`, `WITHDRAWAL_PAID`).
2. **Missing Operation: Customer Wallet Charge / Top-Up**:
   - While `GET /customer/wallet/transactions` lists `DEPOSIT` as an enum, there is **NO endpoint to initiate a wallet deposit or charge** (no `POST /customer/wallet/charge` or `POST /customer/wallet/deposit`).
   - All existing payment initiation endpoints (`POST /gamingCenters/{id}/reservation/{id}/payments/init` and `POST /public/gamingCenters/{slug}/group-reservations/checkout`) are strictly tied to station holds or reservation IDs, not to customer wallet recharging.
   - The verification endpoint `POST /payments/{paymentId}/verify` converts temporary station holds (`BookingHold`) into confirmed group reservations; it cannot credit a customer wallet ledger.

Therefore, **customer wallet top-up / online charging is currently NOT supported in the backend (OpenAPI v1.0-LOCKED)**.

This document defines the comprehensive contract specification, API data models, idempotency safeguards, and callback workflows required for the backend engineering team to implement this feature.

---

## 2. API Contract Audit: Current OpenAPI vs. Wallet Charging Requirements

| Feature / Operation | Current OpenAPI (commit `ba8cb52`) Status | Required Implementation |
|---|---|---|
| **Customer Wallet Status** | **Present** (`GET /customer/wallet`) | Integrated in `walletService.getWallet` |
| **Customer Withdrawal Request** | **Present** (`POST /customer/wallet/withdraw`) | Integrated in `walletService.requestWithdrawal` |
| **Withdrawal History** | **Present** (`GET /customer/wallet/withdrawals`) | Integrated in `walletService.getWithdrawals` |
| **Wallet Transaction History** | **Present** (`GET /customer/wallet/transactions`) | Integrated in `walletService.getTransactions` |
| **Wallet Recharge Initiation** | **MISSING** (No endpoint for initiating wallet charge) | Implement `POST /customer/wallet/charge` |
| **Wallet Payment Verification** | **MISSING** (No endpoint for verifying wallet charge payment) | Implement `POST /customer/wallet/payments/{paymentId}/verify` or extend `POST /payments/{paymentId}/verify` |

---

## 3. Required Backend API Specifications

### 3.1 Initiate Wallet Top-Up (Recharge)
Initiates a payment request with the configured payment gateway (e.g., Zibal, Shaparak, Saman, Mellat) for recharging the customer's wallet.

* **Endpoint:** `POST /customer/wallet/charge`
* **Tags:** `Customer Panel`, `Payments`
* **Security:** `bearerAuth` (Requires customer authenticated session)
* **Headers:**
  - `Authorization: Bearer <accessToken>`
  - `Idempotency-Key: <UUID>` (Mandatory: prevents duplicate gateway charges upon network timeouts or multiple clicks)
* **Request Body:**
```json
{
  "amount": 200000,
  "currency": "IRT",
  "redirectUrl": "https://sayra.ir/profile?wallet=verify",
  "description": "افزایش موجودی کیف پول کاربر"
}
```
* **Validation Rules:**
  - `amount`: Positive integer representing the charge amount (minimum: `100,000` IRR / `1,000` Tomans).
  - `currency`: Enum (`"IRR"` or `"IRT"`, standardizing on `"IRR"` in backend storage).
  - `redirectUrl`: Valid URL on the frontend domain where the user will be returned after completing or canceling payment on the gateway.

* **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_wlt_9876543210",
    "trackId": 89012345,
    "paymentUrl": "https://gateway.zibal.ir/start/89012345",
    "amount": 200000,
    "currency": "IRT",
    "status": "INITIATED",
    "expiresAt": "2026-04-10T15:20:00.000Z",
    "createdAt": "2026-04-10T15:05:00.000Z"
  },
  "messagesList": [
    "درگاه پرداخت با موفقیت آماده‌سازی شد. در حال انتقال به درگاه بانکی..."
  ]
}
```

* **Error Responses:**
  - `400 BAD_REQUEST`: Amount below minimum allowed or non-integer.
  - `401 UNAUTHORIZED`: Missing or expired customer JWT.
  - `409 CONFLICT`: Duplicate `Idempotency-Key` with differing payload.
  - `502 BAD_GATEWAY`: Payment gateway unreachable or PSP error.

---

### 3.2 Authoritative Payment Verification
When the customer completes payment at the bank gateway, the gateway returns the customer to `redirectUrl?trackId=...&success=1&status=2`. The frontend then invokes authoritative verification on the backend to finalize the transaction.

* **Endpoint:** `POST /payments/{paymentId}/verify` or `POST /customer/wallet/payments/{paymentId}/verify`
* **Tags:** `Payments`, `Customer Panel`
* **Security:** `bearerAuth`
* **Request Body:**
```json
{
  "trackId": "89012345",
  "gatewayStatus": "2"
}
```
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_wlt_9876543210",
    "paymentStatus": "PAID",
    "paymentState": "PAID",
    "amount": 200000,
    "currency": "IRT",
    "referenceNumber": "REF-20260410-0981",
    "cardPanMasked": "6037-****-****-1234",
    "paidAt": "2026-04-10T15:08:22.000Z",
    "wallet": {
      "previousBalance": 100000,
      "creditedAmount": 200000,
      "newBalance": 300000,
      "currency": "IRT"
    }
  },
  "messagesList": [
    "کیف پول شما با موفقیت شارژ شد."
  ]
}
```

* **Atomic Transaction Invariants:**
  1. The backend verifies the transaction with the bank PSP (e.g. Zibal verify API).
  2. If the PSP returns success, the backend atomically creates a `WalletTransaction` (`type: "DEPOSIT"`, `amount: +200000`) and increments `CustomerWallet.walletBalance`.
  3. Subsequent verification calls for the same `paymentId` must be idempotent and return `200 OK` with the existing paid record without double-crediting.

---

## 4. Frontend Resilience & Handling in Sayra

In the current frontend codebase:
1. **Custom Amount Input & Presets:** The UI (`src/app/profile/page.tsx`) offers quick presets (`50,000`, `100,000`, `200,000`, `500,000`, `1,000,000`, `2,000,000` Tomans) as well as a full custom numeric input ("مبلغ دلخواه شما") with Persian formatting and instant Toman translation.
2. **ContractGap Safeguard:** Because the backend endpoints are not yet in `openapi.json`, calling `walletService.chargeWallet(amount)` triggers `ContractGapError` stating:
   `"سرویس شارژ آنلاین کیف پول در نسخه جاری بک‌اند فعال نشده است. لطفاً منتظر استقرار وب‌سرویس درگاه کیف پول باشید."`
3. **No Fake Balances:** The frontend never fabricates mock balance increases or local persistence tricks, maintaining strict financial integrity.
