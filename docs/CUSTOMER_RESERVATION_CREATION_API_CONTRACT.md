# Backend Contract Gap & Staging Verification Report: Customer Reservation Creation (Phase 10)

## 1. Executive Summary
This document analyzes and specifies the API contract, operational behavior, idempotency handling, and staging verification for **Customer Reservation Creation** against the Playenest API specification `v1.0-LOCKED` (`openapi.json` / `public/context/openapi-yaml.md`).

In Phase 10, the booking confirmation action in the customer portal (`src/app/gamecenter/[id]/page.tsx`) connects to the documented backend reservation creation endpoint (`POST /public/gamingCenters/{gamingCenterSlug}/reservation`).

---

## 2. API Contract Investigation & Specification

### 2.1 Endpoint Definition
- **Method**: `POST`
- **Path**: `/public/gamingCenters/{gamingCenterSlug}/reservation`
- **OperationId**: `post_public_gamingCenters_gamingCenterSlug_reservation`
- **Tags**: `Reservation`

### 2.2 Headers
- `Content-Type`: `application/json`
- `Accept`: `application/json`
- `idempotency-key`: `string` (**Required** by OpenAPI parameter specification)
- `Authorization`: `Bearer <accessToken>` (Optional for public reservation creation; automatically attached when user session is active)

### 2.3 Request Body Schema
```json
{
  "stationId": "string (required)",
  "startTime": "string, format: date-time (required)",
  "customer": {
    "fullName": "string (required)",
    "phone": "string (required)",
    "email": "string (optional)"
  },
  "staffId": "string (optional)",
  "note": "string (optional)"
}
```

### 2.4 Response Schema
- **Status Code**: `201 Created`
- **Envelope**: `Success` (`#/components/schemas/Success`)
  ```json
  {
    "success": true,
    "data": {
      "id": "string",
      "gamingCenterId": "string",
      "stationId": "string",
      "staffId": "string",
      "customerAccountId": "string",
      "startTime": "string (date-time)",
      "endTime": "string (date-time)",
      "status": "PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELED | NO_SHOW",
      "paymentState": "UNPAID | PENDING | PARTIALLY_PAID | PAID | REFUNDED | OVERPAID | FAILED | CANCELED",
      "totalHours": "number",
      "totalPrice": "number",
      "stationSnapshot": {
        "name": "string",
        "hourlyPrice": "number",
        "stationType": "string"
      }
    },
    "meta": {
      "requestId": "string"
    }
  }
  ```

---

## 3. Idempotency & Safe Request Patterns

### 3.1 Idempotency Key Generation & Persistence
- Every unit of reservation (`stationId` + `startTime`) is assigned a client-generated UUID idempotency key (`crypto.randomUUID()` or cryptographic timestamp fallback).
- The key is retained in memory (`keysRef` in `GameCenterDetailPage` and `keys` Map in `submitBooking`) across network failure and server error retries.
- This ensures that if a network glitch occurs after the server processed the creation, re-submitting with the identical idempotency key will not create duplicate bookings on the backend.

### 3.2 In-Flight Protection
- `submittingRef` prevents double-click and concurrent duplicate invocations while request resolution is underway.
- The confirm button reflects progress states (`در حال ثبت رزرو...` / `در حال ثبت X از Y...`) and is disabled.

### 3.3 Partial Multi-Item Completion
- Because OpenAPI `v1.0-LOCKED` defines single-station/single-hour reservation creation, multi-item or multi-hour carts submit requests sequentially.
- Successfully completed reservations are stored in `doneRef`.
- If an item fails midway (e.g. item 2 of 3 fails with 500), clicking retry skips item 1 and only retries item 2 and 3, preventing duplicate reservation creation.

### 3.4 Conflict Invalidation
- On slot conflicts (`400` or `409` with `SLOT_NOT_AVAILABLE`, `RESERVATION_OVERLAP`, `OVERLAP_CONFLICT`, or `RESERVATION_START_TIME_IN_PAST`), the idempotency key for that slot is cleared.
- The UI triggers an availability refresh so stale slots are marked unavailable.

---

## 4. Contract Gaps & Architectural Observations

### 4.1 Single Station & Slot Endpoint
- **Gap**: `POST /public/gamingCenters/{gamingCenterSlug}/reservation` only accepts one `stationId` and one `startTime`. It does not accept `endTime`, `durationHours`, or multiple stations in a single transaction.
- **Frontend Mitigation**: Multi-hour and multi-device selections are decomposed into sequential calls with progress indicators (`submitBooking`), placing accessory details (e.g., extra controllers) into `note`.
- **Recommendation for v1.1**: Introduce a bulk/batch reservation endpoint (`POST /public/gamingCenters/{slug}/reservations/batch` or `items: [...]`).

### 4.2 Payment Initiation Flow
- **Contract Reality**: Payment initiation (`POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/payments/init`) requires an existing `reservationId`.
- **Frontend Mitigation**: Reservations are created in `PENDING` status with `paymentState: UNPAID`. The customer is redirected to their reservation details (`/reservations/{id}`) or reservation list (`/reservations`) where payment status and actions are presented. No premature or mock payment callback is triggered during reservation creation.

---

## 5. Verification & Testing Results

### 5.1 Automated Test Suite
- Comprehensive tests in `src/services/customerReservationCreation.test.ts` and `src/services/customerServices.test.ts`:
  - Exact payload structure, path, and method.
  - Required `idempotency-key` header transmission.
  - Optional `staffId` and `note` field handling.
  - Bearer token attachment for logged-in sessions.
  - Response unwrapping without fallback fabrication.
  - 400 validation error handling.
  - 401 unauthorized handling with token refresh.
  - 409 slot conflict error handling and key deletion.
  - 500 / 502 server error handling.
  - Network failure handling (`TypeError`).
  - Idempotency key reuse across retries.
  - Partial completion skip logic.
- Total passing tests in suite: 197 / 197.

### 5.2 Staging Verification Report
- **Staging Endpoint**: `http://87.248.156.152/api/v1`
- **Network Status**: Host `87.248.156.152` is currently unreachable from the container environment (connection timed out / unreachable), consistent with staging firewall policies.
- **Mock Mode Fallback Isolation**:
  - In production and non-mock runs, no synthetic fallbacks or fake reservations are created.
  - `ApiError` is cleanly propagated to the UI with Persian user feedback when the network/server is unavailable.
