# Backend Contract Gap & Staging Verification Report: Customer Reservation List (Phase 12)

## 1. Executive Summary
This document analyzes and specifies the API contract, backend authorization scoping, status mappings, pagination envelopes, and staging verification for the **Customer Reservation List** against the Playenest API specification `v1.0-LOCKED` (`openapi.json` / `public/context/openapi-yaml.md`).

In Phase 12, the customer’s reservation history page (`/reservations`) and reservation lookup services connect directly to the documented customer endpoint:
- `GET /customer/reservation`: List reservations belonging to the authenticated customer.
- `GET /customer/reservation/{reservationId}`: Get reservation details for a specific reservation.

---

## 2. API Contract Investigation & Specification

### 2.1 Endpoint Definitions
| Operation | Method | Path | Security | OperationId |
| :--- | :--- | :--- | :--- | :--- |
| **List My Reservations** | `GET` | `/customer/reservation` | `bearerAuth` | `get_customer_reservation` |
| **Get Reservation Details** | `GET` | `/customer/reservation/{reservationId}` | `bearerAuth` | `get_customer_reservation_reservationId` |
| **Cancel Reservation** | `POST` | `/customer/reservation/{reservationId}/cancel` | `bearerAuth` | `post_customer_reservation_reservationId_cancel` |
| **Submit Review** | `POST` | `/customer/reservation/{reservationId}/ratings` | `bearerAuth` | `post_customer_reservation_reservationId_ratings` |
| **List Time Proposals** | `GET` | `/customer/reservation/{reservationId}/proposals` | `bearerAuth` | `get_customer_reservation_reservationId_proposals` |

### 2.2 Headers
- `Accept`: `application/json`
- `Authorization`: `Bearer <customer_jwt_access_token>` (**Required**)

### 2.3 Query Parameters
- According to `openapi.json` v1.0-LOCKED, `GET /customer/reservation` defines **no explicit query parameters** in its schema (`parameters: []`).
- However, standard pagination query parameters (`page`, `pageSize`, `limit`) are optionally supported by backend frameworks returning a `Pagination` envelope.
- `reservationService.listPaginated({ page, pageSize })` transmits `page` and `pageSize` when requested, while defaulting gracefully to full customer lists.

### 2.4 Response Envelope Schemas
`GET /customer/reservation` returns an OpenAPI `Pagination` envelope:
```json
{
  "success": true,
  "data": [
    {
      "id": "string",
      "gamingCenterId": "string",
      "stationId": "string",
      "staffId": "string",
      "customerAccountId": "string",
      "startTime": "2026-11-02T15:00:00.000Z",
      "endTime": "2026-11-02T16:00:00.000Z",
      "status": "PENDING | CONFIRMED | IN_PROGRESS | COMPLETED | CANCELED | NO_SHOW",
      "paymentState": "UNPAID | PENDING | PARTIALLY_PAID | PAID | REFUNDED | OVERPAID | FAILED | CANCELED",
      "totalHours": 1,
      "totalPrice": 150000,
      "stationSnapshot": {
        "name": "کامپیوتر گیمینگ ۱",
        "hourlyPrice": 150000,
        "stationType": "PC"
      }
    }
  ],
  "meta": {
    "requestId": "ckv1abc...",
    "pagination": {
      "totalItems": 1,
      "page": 1,
      "pageSize": 50,
      "totalPages": 1
    }
  }
}
```

---

## 3. Authorization Scoping & Security Analysis

### 3.1 Strict Backend Scoping
- **No Client Customer ID**: The `GET /customer/reservation` route takes neither path parameters nor query parameters specifying user identifiers (e.g., `customerId` or `customerAccountId`).
- **Authorization Context**: The server extracts the authenticated customer ID directly from the validated JWT token provided in `Authorization: Bearer <accessToken>`.
- **Client Guarantees**: Frontend services (`reservationService`) never pass arbitrary customer IDs to customer reservation routes.

### 3.2 Cross-Customer Access Isolation
- Because the customer scope is derived server-side from the verified JWT:
  - Customer A with JWT `token-A` can only receive reservations belonging to Customer A.
  - Customer B with JWT `token-B` receives only Customer B’s reservations.
  - If a user sends an expired or invalid token, the server returns `401 Unauthorized`.
  - Calling `GET /customer/reservation/{reservationId}` for a reservation belonging to another customer must return `403 Forbidden` or `404 Not Found`.

---

## 4. Status Mapping & UI Presentation

### 4.1 Backend Status Values
OpenAPI `v1.0-LOCKED` defines the exact enum for `ReservationStatus`:
- `PENDING`: در انتظار تأیید
- `CONFIRMED`: تأیید شده
- `IN_PROGRESS`: در حال انجام
- `COMPLETED`: انجام شده
- `CANCELED`: لغو شده
- `NO_SHOW`: عدم حضور

All statuses are mapped in `src/lib/reservationUi.ts` (`STATUS_UI`) without inventing or synthesizing synthetic states.

### 4.2 Payment State Values
OpenAPI `v1.0-LOCKED` defines the exact enum for `PaymentState`:
- `UNPAID`: پرداخت نشده
- `PENDING`: در انتظار پرداخت
- `PARTIALLY_PAID`: پرداخت ناقص
- `PAID`: پرداخت شده
- `REFUNDED`: بازگشت وجه
- `OVERPAID`: پرداخت بیش از مبلغ
- `FAILED`: پرداخت ناموفق
- `CANCELED`: لغو شده

### 4.3 Error State Differentiation
The UI in `src/app/reservations/page.tsx` strictly distinguishes between:
1. **Unauthenticated User**: Display login prompt with `AuthModal` trigger.
2. **Loading State**: Display pulsing skeleton placeholders.
3. **API / Network Failure**: Display explicit error message with a "تلاش دوباره" (Retry) action.
4. **Empty History (`items.length === 0` with no error)**: Display neutral empty state ("هنوز رزروی ثبت نکرده‌اید"). Never fabricate mock reservations or synthesize history.

---

## 5. Contract Gaps & Architectural Observations

### 5.1 Lack of Server-Side Query Filters
- **Gap**: The OpenAPI spec for `GET /customer/reservation` does not declare `status` query parameters (unlike `GET /gamingCenters/{id}/reservation` which supports `status: PENDING | CONFIRMED | ...`).
- **Impact**: Filtering by active vs. past reservations, or searching by gaming center name, must currently occur client-side over the authenticated list returned by `GET /customer/reservation`.
- **Recommendation for v1.1**: Add `status`, `from`, `to`, `page`, and `pageSize` query parameters to `GET /customer/reservation`.

### 5.2 Station & Gaming Center Metadata
- **Gap**: `Reservation` schema includes `stationSnapshot` (`name`, `hourlyPrice`, `stationType`), but does not include `gamingCenterName` or `gamingCenterAddress` directly in the core schema.
- **Frontend Mitigation**: Display values if present in server response, or fall back to neutral "گیمنت" without breaking layout or fabricating addresses.

---

## 6. Staging & Environment Verification Report

### 6.1 Automated Test Suite
- Automated tests in `src/services/customerReservationList.test.ts` verify:
  - Authenticated customer loading via `GET /customer/reservation` with Bearer token.
  - Parsing OpenAPI `Pagination` envelopes and raw array responses.
  - Distinction between empty list (`[]`) and server failure (`500`, `502`, network error).
  - Accurate status and payment state representation without fabricated business meanings.
  - Rejection of unauthenticated requests (`401 Unauthorized`).
  - Authorization isolation ensuring no client-supplied customer ID is accepted or sent.
  - Detailed single reservation retrieval via `GET /customer/reservation/{reservationId}`.

### 6.2 Staging Connectivity
- Staging host `http://87.248.156.152/api/v1` is isolated behind network firewalls.
- All code paths are verified against the authoritative specification `v1.0-LOCKED` (`openapi.json`).
