# Customer Data Consistency & Error-State Audit Report (Phase 21)

## 1. Executive Summary
This document provides a comprehensive audit report of API-backed customer data consistency, stale data prevention, race condition handling, mutation revalidation semantics, safe retry rules, and error-state behaviors across all customer-facing routes and services migrated throughout Phases 10–20 in Sayra against the Playenest API specification `v1.0-LOCKED` (`openapi.json`).

The audit covers:
- `/reservations`: Customer Reservation History
- `/reservations/[id]`: Customer Reservation Detail & Action Hub
- `/gamecenters`: Gaming Center Catalog & Filter View
- `/gamecenter/[id]`: Gaming Center Detail, Availability & Reservation Flow
- `/profile`: Customer Authentication & Profile Info Hub
- `/support`: Customer Support Ticket Management
- Global Modals: Notification Modal, Rating Modal, Search Modal, Auth Modal

All customer data flows maintain zero visual layout modifications, adhere to mobile-first responsive constraints, avoid unauthorized local state persistence, and guarantee that failed requests never silently fall back to stale or fabricated mock data.

---

## 2. Customer Routes & Data Operations Matrix

| Route / Component | Primary Data Fetches | Supported Mutations | Stale-Response & Race Protection | Mutation Revalidation | Fallback / Error Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`/reservations`** | `GET /customer/reservation` | Rating submission via `RatingModal` | `AbortController` signal passed to `reservationService.list()`; cancels in-flight requests on unmount/reload | Re-fetches list via `reloadToken` increment on modal success | Propagates `ApiError`; renders dedicated error alert with "تلاش دوباره" button; no mock fallback |
| **`/reservations/[id]`** | `GET /customer/reservation/{id}`, `GET /customer/reservation/{id}/proposals` | `POST .../cancel`, `POST .../proposals/{id}/accept`, `POST .../proposals/{id}/reject` | Parallel requests scoped with `AbortController`; unmounted/aborted requests ignore stale responses | `reloadToken` triggered upon mutation success; reloads fresh reservation & proposals | Action error displayed inline in Persian; non-idempotent operations fail predictably without blind background retries |
| **`/gamecenters`** | `GET /gamingCenters` | Client-side search & filtering across real catalog | `AbortController` cancels previous load; debounced filter updates; syncs URL search params | N/A (read-only catalog) | `ErrorState` component with retry button on server or network error; zero synthetic centers created |
| **`/gamecenter/[id]`** | `GET /gamingCenters`, `GET /gamingCenters/{id}/stations`, `GET .../addresses`, `GET .../media`, `GET .../ratings`, `GET .../availability/slots` | `POST /public/gamingCenters/{slug}/reservation` (with `idempotency-key`) | Per-date slot requests use `AbortController`; stations & details loaded via `Promise.allSettled` | Conflict on slot re-triggers `slotsRefreshKey` to pull real-time free slots | Renders centered error card with retry button on load failure; propagates real server message |
| **`/profile`** | `GET /customer/me`, `GET /auth/me` | `POST /auth/customer/otp/request`, `POST /auth/customer/otp/verify`, `POST /auth/logout` | Form submission locks input with `authLoading`; timer countdown for OTP | `refreshUser()` pulls fresh user info upon login | Contract gaps (`CustomerProfileUpdate`, `WalletMutations`) throw explicit `ContractGapError` with transparent UI messaging |
| **`/support`** | `GET /tickets`, `GET /tickets/{id}` | `POST /tickets`, `POST /tickets/{id}/messages`, `POST /tickets/{id}/attachments` | Active flags and `AbortController` on tickets list; detail fetched on demand | Re-fetches tickets list on ticket creation; re-fetches ticket detail on message send | Renders Persian error alert with retry capabilities; no mock ticket fabrication |
| **`NotificationModal`** | `GET /notifications`, `GET /notifications/unread-count` | `PATCH /notifications/{id}/read` | `isOpen` conditional fetching; avoids background polling loops | Recalculates unread count locally and syncs with parent header callback | Displays error message on network failure; keeps user's current notifications intact |

---

## 3. Data Consistency, Stale Data & Race Condition Analysis

### 3.1 Stale-Response Races & Cancellation Tokens
1. **Request Scoping**: All customer data-fetching methods in `reservationService`, `gamingCenterService`, `customerReviewService`, `customerNotificationService`, and `gamecenterDetailService` accept an optional `signal?: AbortSignal`.
2. **Page Lifecycle**: Pages instantiate an `AbortController` within their `useEffect` hooks and invoke `controller.abort()` in cleanup.
3. **Multi-Step Race Conditions**: In `/gamecenter/[id]`, switching dates or station selections aborts previous slot requests. If a request finishes after an abort event, the response is discarded to prevent stale availability overwriting current state.

### 3.2 Duplicate Request Guards & In-Flight Concurrency
1. **Token Refresh Mutex**: `refreshAccessToken` in `src/lib/token.ts` implements a shared promise mutex. When multiple concurrent requests encounter a `401 Unauthorized`, exactly one `POST /auth/refresh` request is initiated. All concurrent callers await the same refresh promise and replay their requests with the new token.
2. **Double-Submit Prevention**: Button components and forms maintain loading/busy state guards (`isSubmitting`, `isCancelling`, `busyProposalId`, `busy`). Submissions are rejected synchronously if an action is currently in flight.

---

## 4. Safe Retry Rules & Idempotency Semantics

### 4.1 Safe Idempotency on Reservation Creation
- **Endpoint**: `POST /public/gamingCenters/{gamingCenterSlug}/reservation`
- **Mandatory Header**: `idempotency-key`
- **Partial Failure Handling**: In multi-item reservations (`submitBooking`), each `(stationId + startTime)` receives a unique idempotency key. Completed items are saved in a local memory cache (`done`).
- **Safe Retry**: If a batch request partially fails due to network disruption or temporary server error:
  - Previously created items are skipped.
  - The failed item is retried using the exact same `idempotency-key`.
  - The backend guarantees that identical idempotency keys return the existing reservation without creating a duplicate booking.
- **Conflict Handling**: If a `409 Conflict` occurs (e.g. `SLOT_ALREADY_BOOKED`), the idempotency key for that slot is cleared, allowing the user to select a different slot cleanly.

### 4.2 Non-Idempotent Operations: Strict No-Auto-Retry Policy
- **Endpoints**: `POST /customer/reservation/{id}/cancel`, `POST /customer/reservation/{id}/reschedule`, `POST /customer/reservation/{id}/proposals/{id}/accept|reject`, `POST /tickets`, `POST /tickets/{id}/messages`.
- **Policy**: Non-idempotent mutations do **not** use automatic HTTP retries. If the request fails, the error is bubbled up immediately to the user interface with the backend error message, requiring user-initiated confirmation to retry.

---

## 5. Verification & Testing

Unit and integration tests in `src/services/customerDataConsistencyAudit.test.ts` verify all consistency behaviors:
1. **Stale-Response Races**: In-flight requests abort cleanly and discard obsolete responses.
2. **Mutation Revalidation**: State updates cleanly reflect post-mutation states (cancellation, proposals, notifications).
3. **Idempotency Protection**: `idempotency-key` headers are attached; keys are reused on partial failure retries without duplication.
4. **No Silent Fallback**: 500, 502, and network errors propagate as `ApiError` without synthesizing fake data.
5. **Token Refresh Lifecycle**: Successful 401 refresh retries request once; refresh failure clears tokens gracefully.
6. **Concurrent Mutex**: Multiple parallel requests share single in-flight token refresh call.
7. **Production Strictness**: Production environments never permit mock fallbacks.

All 354 test suites pass (`bun test`). The application builds successfully (`bun run build`).

---

## 6. Documented Contract Gaps & UI State Inventory

| Feature | Endpoint / Contract Gap | Current UI Handling | Recommended Backend Addition |
| :--- | :--- | :--- | :--- |
| **Customer Profile Editing** | No `PATCH/PUT /customer/me` | Displays contract gap notification in modal without fake persistence | Add `PATCH /customer/me` accepting `fullName`, `email`, etc. |
| **Customer Direct Cancellation Reason** | `POST /customer/reservation/{id}/cancel` body has no schema in OpenAPI | Sends empty POST body | Specify optional `{ reason?: string }` payload schema |
| **Customer Reservation Update / Reschedule** | Only `POST .../reschedule` exists; no direct customer `PATCH` | Throws `ContractGapError` on client `updateUnsupported` | Document exact payload schema for rescheduling |
| **Customer Direct Message Inbox** | No customer-to-center direct inbox in OpenAPI | Throws `ContractGapError`; routes users to `/support` tickets | Add direct chat or messaging endpoints if customer-to-center messaging is desired |
| **Bulk Notification Read** | No `PATCH /notifications/read-all` | Loops individual `markAsRead` requests with `Promise.allSettled` | Add `PATCH /notifications/read-all` or batch payload |
| **Customer Review Editing & Deletion** | No `PATCH/DELETE /customer/ratings/{id}` | Throws `ContractGapError` | Add customer moderation endpoints if review modification is permitted |
