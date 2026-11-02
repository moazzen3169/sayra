# Backend Contract Gap & Security Report: Customer Payment Flow (Phase 11)

## 1. Executive Summary
This document analyzes the API contract, operational behavior, security posture, and contract gaps for the **Customer Payment Flow** against the Playenest API specification `v1.0-LOCKED` (`openapi.json` / `public/context/openapi-yaml.md`).

Phase 11 establishes strict alignment between customer payment operations, reservation statuses, gateway verification mechanics, and UI presentation. In compliance with core security directives:
- No payment is marked successful based solely on client-side state, URL redirect parameters, or unverified browser actions.
- Client secrets, merchant credentials, or signature keys are never exposed in browser code.
- Contract gaps in payment processing are documented and not papered over with synthetic or client-side simulations.

---

## 2. Documented OpenAPI Operations

The locked OpenAPI contract defines the following endpoints under the `Payments` tag relevant to reservation payments:

### 2.1 Initiate Payment
- **Method**: `POST`
- **Path**: `/gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/init`
- **OperationId**: `post_gamingCenters_gamingCenterId_reservation_reservationId_payments_init`
- **Security**: Bearer JWT (`bearerAuth`)
- **Required Header**: `idempotency-key` (string)
- **Path Parameters**:
  - `gamingCenterId`: string (unique identifier or slug of the gaming center)
  - `reservationId`: string (unique identifier of the reservation)
- **Request Body**: None defined
- **Response**: `200 OK` with `Success` schema (`#/components/schemas/Success`), typically containing gateway redirect URL or payment session reference.

### 2.2 Verify Payment via GET Redirect Callback
- **Method**: `GET`
- **Path**: `/gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/verify`
- **OperationId**: `get_gamingCenters_gamingCenterId_reservation_reservationId_payments_verify`
- **Security**: Bearer JWT (`bearerAuth`)
- **Path Parameters**:
  - `gamingCenterId`: string
  - `reservationId`: string
- **Query Parameters**:
  - `Authority`: string (Gateway transaction tracking authority code, e.g. ZarinPal Authority)
  - `Status`: string (Gateway return status, e.g. `OK` or `NOK`)
- **Response**: `200 OK` with `Success` schema ("Payment verified and reservation updated").

### 2.3 Verify Payment via POST Manual / Gateway Verification
- **Method**: `POST`
- **Path**: `/gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/verify`
- **OperationId**: `post_gamingCenters_gamingCenterId_reservation_reservationId_payments_verify`
- **Security**: Bearer JWT (`bearerAuth`)
- **Path Parameters**:
  - `gamingCenterId`: string
  - `reservationId`: string
- **Request Body**:
  ```json
  {
    "authority": "string (optional)",
    "paymentId": "string (optional)"
  }
  ```
- **Response**: `200 OK` with `Success` schema ("Payment verified").

### 2.4 Get Payment Status
- **Method**: `GET`
- **Path**: `/gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/status`
- **OperationId**: `get_gamingCenters_gamingCenterId_reservation_reservationId_payments_status`
- **Security**: Bearer JWT (`bearerAuth`)
- **Path Parameters**:
  - `gamingCenterId`: string
  - `reservationId`: string
- **Response**: `200 OK` with `Success` schema ("Current payment status").

### 2.5 Provider Webhook Callback (Backend-to-Backend)
- **Method**: `POST`
- **Path**: `/webhooks/payments/{provider}`
- **OperationId**: `post_webhooks_payments_provider`
- **Security**: None (Public endpoint protected by HMAC signature header)
- **Parameters**:
  - `provider`: string (path parameter, e.g., `zarinpal`)
  - `x-signature`: string (header, required HMAC SHA-256 signature)
- **Request Body**: Arbitrary gateway webhook payload
- **Security Note**: This is exclusively a server-side webhook endpoint. The client application must NEVER attempt to post to this endpoint or forge signatures.

---

## 3. Supported Payment States

In accordance with `Reservation.paymentState` in `openapi.json`, the contract defines the following payment states:
- `UNPAID`: Reservation created, no successful payment initiated or completed.
- `PENDING`: Payment initiation underway or gateway verification in-flight.
- `PARTIALLY_PAID`: Incomplete payment received.
- `PAID`: Payment verified by backend; reservation confirmed/guaranteed.
- `REFUNDED`: Funds returned to customer following cancellation or dispute.
- `OVERPAID`: Customer paid in excess of recorded reservation price.
- `FAILED`: Payment failed at gateway or rejected during backend verification.
- `CANCELED`: Reservation or payment transaction canceled before settlement.

The frontend maps each state to exact Persian localized terminology in `src/lib/reservationUi.ts`:
- `UNPAID` -> "پرداخت نشده"
- `PENDING` -> "در انتظار پرداخت"
- `PARTIALLY_PAID` -> "پرداخت ناقص"
- `PAID` -> "پرداخت شده"
- `REFUNDED` -> "بازگشت وجه"
- `OVERPAID` -> "پرداخت بیش از مبلغ"
- `FAILED` -> "پرداخت ناموفق"
- `CANCELED` -> "لغو شده"

---

## 4. Security & Architecture Safeguards

### 4.1 Strict Server-Side Verification (Zero Client-Side Success Path)
- **Vulnerability Prevented**: In typical payment gateway implementations (e.g. ZarinPal, Shaparak gateways), the browser is redirected back to the merchant site with URL parameters like `?Authority=000...&Status=OK`.
- **Enforced Safeguard**: The client application **never** marks a reservation as `PAID` merely because `Status=OK` is present in the URL query string.
- Any return or callback flow must call the backend verification endpoint (`GET` or `POST` `/payments/verify`) or fetch updated reservation details (`GET /customer/reservation/{id}`). Only if the backend verifies the transaction with the payment gateway provider and updates the database will the UI reflect a `PAID` status.

### 4.2 Credential & Secret Protection
- The frontend code does not store, reference, or transmit payment gateway secrets, API keys (e.g. ZarinPal Merchant ID or HMAC signing keys), or private bank credentials.
- All gateway communications requiring secret credentials remain isolated behind the backend API gateway or the server proxy (`/api/proxy`).

### 4.3 Idempotency Enforcement
- Payment initiation (`POST .../payments/init`) mandates an `idempotency-key` header to prevent double billing or duplicate transaction generation caused by network retry or user double-clicking.
- Clients generate unique, cryptographically random idempotency keys per payment attempt.

---

## 5. Contract Gaps & Architectural Recommendations

### 5.1 Gaming Center Slug vs. ID in Payment Paths
- **Contract Reality**: Payment endpoints require `{gamingCenterId}` in their path (`/gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/*`), whereas customer booking creation uses `{gamingCenterSlug}` (`/public/gamingCenters/{gamingCenterSlug}/reservation`).
- **Impact**: Reservations returned by the backend contain `gamingCenterId`. Services and components must supply `reservation.gamingCenterId` to payment operations. If only slug is known, the client must resolve `gamingCenterId` from reservation or gaming center details.
- **Recommendation**: Ensure backend supports either ID or Slug transparently, or provides customer-scoped payment routes (`/customer/reservation/{reservationId}/payments/init` and `/customer/reservation/{reservationId}/payments/verify`) without requiring `gamingCenterId` in the path.

### 5.2 Callback URL Specification in Payment Init
- **Contract Reality**: `POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/init` accepts no body parameters in OpenAPI v1.0-LOCKED. It does not provide a field for `callbackUrl` or `returnUrl`.
- **Impact**: The backend is assumed to use a statically configured return URL or derive it from the request headers/tenant settings. The frontend cannot pass custom post-payment return URLs dynamically.
- **Recommendation for v1.1**: Add an optional `callbackUrl` string field to `PaymentInitRequest` body schema.

### 5.3 Batch / Multi-Station Payment Initiation
- **Contract Reality**: Payment initiation is strictly bound to a single `reservationId`. When a user books multiple stations or non-contiguous time slots resulting in multiple reservation records, each reservation has an independent payment flow.
- **Impact**: The frontend creates separate reservations per station/time unit, requiring individual payment initiation per reservation.
- **Recommendation for v1.1**: Introduce an aggregated invoice or order entity (`POST /orders` or `/payments/init-batch`) covering multiple reservations under a single gateway transaction.
