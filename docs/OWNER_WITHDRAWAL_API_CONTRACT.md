# Backend Contract & Authorization Gap Report: Owner Financials & Withdrawal System (Phase 8)

## 1. Executive Summary

This document specifies the backend contract gaps, missing OpenAPI endpoints, authorization rules, and financial consistency requirements for the **Owner Financial Management and Withdrawal System** in Sayra.

The current OpenAPI v1.0-LOCKED contract provides:
1. `GET /gamingCenters/{gamingCenterId}/analytics/summary` (Analytics summary, including total/net revenue metrics)
2. `GET /gamingCenters/{gamingCenterId}/commissions` (List of reservation earnings/commissions with pagination and status filters)
3. `GET /gamingCenters/{gamingCenterId}/commissions/target-progress` (Target progress for commission tiers)
4. `GET /gamingCenters/{gamingCenterId}/commissions/policy` and `POST /gamingCenters/{gamingCenterId}/commissions/policy` (Commission policy configuration)
5. `POST /gamingCenters/{gamingCenterId}/commissions/{earningId}/pay` (Record commission payout per earning)

However, **the contract lacks dedicated owner withdrawal management endpoints** (getting withdrawable balance, submitting withdrawal requests, viewing withdrawal history, tracking settlement status, and canceling pending requests).

Per security and financial directives, **the frontend will never simulate fake withdrawal requests or trust client-calculated balances**. The withdrawal button in the UI remains in an informative disabled state until the backend implements the required endpoints specified below.

---

## 2. Identified Contract Gaps

| Capability | Current OpenAPI v1.0-LOCKED Status | Required Action |
|---|---|---|
| **Withdrawable Balance** | Missing explicit dedicated balance endpoint (relies on analytics summary fields) | Provide dedicated `GET /gamingCenters/{id}/payouts/balance` or guarantee `withdrawableAmount` in analytics summary |
| **Withdrawal Request Submission** | **Missing** (no endpoint to request a payout) | Implement `POST /gamingCenters/{id}/payouts/withdraw` |
| **Withdrawal History** | **Missing** (no endpoint for past payouts) | Implement `GET /gamingCenters/{id}/payouts/history` |
| **Withdrawal Details & Status** | **Missing** | Implement `GET /gamingCenters/{id}/payouts/{payoutId}` |
| **Withdrawal Cancellation** | **Missing** | Implement `POST /gamingCenters/{id}/payouts/{payoutId}/cancel` |

---

## 3. Required Backend API Specifications

### 3.1 Get Withdrawable Balance & Eligibility
Returns the server-calculated, ledger-verified withdrawable balance, pending settlement amounts, and bank account eligibility.

* **Endpoint:** `GET /gamingCenters/{gamingCenterId}/payouts/balance`
* **Tags:** `Payouts` / `Financials`
* **Security:** `bearerAuth` (Requires `OWNER` or `MANAGER` role for this gaming center)
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "gamingCenterId": "gc-101",
    "withdrawableAmount": 8500000,
    "pendingSettlementAmount": 1200000,
    "totalEarnedRevenue": 15000000,
    "totalWithdrawnAmount": 5300000,
    "currency": "تومان",
    "minimumWithdrawalAmount": 100000,
    "maximumWithdrawalAmount": 50000000,
    "isEligibleForWithdrawal": true,
    "ineligibilityReason": null,
    "bankAccount": {
      "bankName": "بانک ملت",
      "accountHolder": "علیرضا رضایی",
      "iban": "IR120120000000001234567890",
      "isVerified": true
    }
  },
  "meta": {
    "requestId": "req_bal_001"
  }
}
```

---

### 3.2 Create Withdrawal Request
Submits a request to withdraw funds to the registered and verified bank account.

* **Endpoint:** `POST /gamingCenters/{gamingCenterId}/payouts/withdraw`
* **Security:** `bearerAuth`
* **Headers:** `Idempotency-Key: <UUID>` (Mandatory to prevent duplicate payouts)
* **Request Body:**
```json
{
  "amount": 2500000,
  "bankAccountId": "bank_acc_101",
  "note": "تسویه درآمد هفتگی فروردین"
}
```
* **Response `201 Created`:**
```json
{
  "success": true,
  "data": {
    "id": "payout_req_9981",
    "gamingCenterId": "gc-101",
    "requestedAmount": 2500000,
    "feeAmount": 0,
    "netPayoutAmount": 2500000,
    "currency": "تومان",
    "status": "PENDING",
    "destinationIban": "IR120120000000001234567890",
    "bankName": "بانک ملت",
    "referenceCode": "WDR-20260405-001",
    "createdAt": "2026-04-05T14:30:00.000Z",
    "estimatedSettlementDate": "2026-04-06T12:00:00.000Z"
  },
  "meta": {
    "requestId": "req_wdr_001"
  }
}
```

* **Error Responses:**
  - `400 VALIDATION_ERROR`: Amount is less than minimum withdrawal amount (`100,000 تومان`) or exceeds daily limit.
  - `402 INSUFFICIENT_FUNDS`: Withdrawable balance is insufficient for requested amount.
  - `403 FORBIDDEN`: User does not hold permissions or bank account is unverified/mismatched national ID.
  - `409 CONFLICT`: A pending payout request is already in processing.
  - `422 UNPROCESSABLE_ENTITY`: Bank account not approved or owner verification incomplete.

---

### 3.3 List Withdrawal History
Retrieves past payout requests and status transitions with standard pagination.

* **Endpoint:** `GET /gamingCenters/{gamingCenterId}/payouts/history`
* **Security:** `bearerAuth`
* **Parameters:**
  - `page` (integer, default: 1)
  - `pageSize` (integer, default: 20)
  - `status` (string, enum: `PENDING`, `PROCESSING`, `SETTLED`, `REJECTED`, `CANCELED`, `FAILED`)
* **Response `200 OK`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "payout_req_9981",
      "amount": 2500000,
      "fee": 0,
      "currency": "تومان",
      "status": "SETTLED",
      "referenceCode": "WDR-20260405-001",
      "trackingNumber": "PAYA-77891234",
      "destinationIban": "IR120120000000001234567890",
      "bankName": "بانک ملت",
      "createdAt": "2026-04-05T14:30:00.000Z",
      "settledAt": "2026-04-06T10:15:00.000Z"
    }
  ],
  "meta": {
    "pagination": {
      "total": 1,
      "page": 1,
      "pageSize": 20,
      "totalPages": 1
    }
  }
}
```

---

### 3.4 Cancel Withdrawal Request
Allows the owner to cancel a request if it has not yet reached the `PROCESSING` or `SETTLED` state.

* **Endpoint:** `POST /gamingCenters/{gamingCenterId}/payouts/{payoutId}/cancel`
* **Security:** `bearerAuth`
* **Response `200 OK`:**
```json
{
  "success": true,
  "message": "درخواست برداشت لغو شد و مبلغ به موجودی قابل برداشت بازگشت.",
  "data": {
    "id": "payout_req_9981",
    "status": "CANCELED",
    "canceledAt": "2026-04-05T15:00:00.000Z"
  }
}
```

---

## 4. Financial Consistency & Security Requirements

1. **Server-Authoritative Balances:**
   - The frontend must never calculate or deduce withdrawable balance by adding up reservation amounts or subtracting commissions.
   - All balance displays reflect the backend ledger accounting for reservations, platform fees, taxes, and refunds.

2. **Refunded Reservations Handling:**
   - When a reservation status transitions to `CANCELED` or its payment state is `REFUNDED`, its commission status is set to `REFUNDED`.
   - Refunded commission amounts (`commissionAmount = 0` or negative adjustments) must not count toward withdrawable earnings or target reach.

3. **Commission Deduplication:**
   - Platform commissions are bound to specific `reservationId` and `earningId`.
   - No commission entry may be processed, charged, or accrued more than once.

4. **Security & Ownership Validation:**
   - Every financial endpoint must validate the caller's JWT bearer token against the target `gamingCenterId`.
   - The bank account (Sheba/IBAN) national identity must match the owner's approved verification identity.
   - Payout requests require an `Idempotency-Key` header to prevent network-induced double-charge issues.
