# Backend Contract Gap & Staging Verification Report: Customer Reservation Details and Allowed Mutations (Phase 13)

## 1. Executive Summary
This document analyzes, specifies, and verifies the API contract, backend authorization scoping, state transition rules, allowed customer mutations, and staging environment behavior for **Customer Reservation Details and Allowed Mutations** against the Playenest API specification `v1.0-LOCKED` (`openapi.json` / `public/context/openapi-yaml.md`).

In Phase 13, the customer reservation details page (`/reservations/[id]`) and customer mutation services connect directly and exclusively to documented customer endpoints:
- `GET /customer/reservation/{reservationId}`: Retrieve reservation details for an authenticated customer.
- `POST /customer/reservation/{reservationId}/cancel`: Cancel an active customer reservation.
- `POST /customer/reservation/{reservationId}/reschedule`: Request a time rescheduling with `newStartTime` and `newEndTime`.
- `POST /customer/reservation/{reservationId}/ratings`: Submit a rating and review for a completed reservation.
- `GET /customer/reservation/{reservationId}/proposals`: List owner-initiated time proposals for the reservation.
- `POST /customer/reservation/{reservationId}/proposals/{proposalId}/accept`: Accept an owner-initiated time proposal.
- `POST /customer/reservation/{reservationId}/proposals/{proposalId}/reject`: Reject an owner-initiated time proposal.

Any undocumented customer mutations (such as direct `DELETE` or `PATCH` updates) are strictly rejected with `ContractGapError` without simulating success or fabricating backend transitions.

---

## 2. Documented Endpoints & Schemas

### 2.1 Endpoint Specification Matrix
| Operation | Method | Path | Security | Request Body | Response Envelope | OperationId |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Get Reservation Details** | `GET` | `/customer/reservation/{reservationId}` | `bearerAuth` | None | `Success<Reservation>` | `get_customer_reservation_reservationId` |
| **Cancel Reservation** | `POST` | `/customer/reservation/{reservationId}/cancel` | `bearerAuth` | None | `Success` (`{ success: true }`) | `post_customer_reservation_reservationId_cancel` |
| **Request Reschedule** | `POST` | `/customer/reservation/{reservationId}/reschedule` | `bearerAuth` | `{ newStartTime: ISO, newEndTime: ISO }` | `Success` (`{ success: true }`) | `post_customer_reservation_reservationId_reschedule` |
| **Submit Rating** | `POST` | `/customer/reservation/{reservationId}/ratings` | `bearerAuth` | `{ rating: 1..5, comment?: string }` | `Success` (`201 Created`) | `post_customer_reservation_reservationId_ratings` |
| **List Time Proposals** | `GET` | `/customer/reservation/{reservationId}/proposals` | `bearerAuth` | None | `{ success: true, data: ReservationTimeProposal[] }` | `get_customer_reservation_reservationId_proposals` |
| **Accept Proposal** | `POST` | `/customer/reservation/{reservationId}/proposals/{proposalId}/accept` | `bearerAuth` | None | `Success` (`{ success: true }`) | `post_customer_reservation_reservationId_proposals_proposalId_accept` |
| **Reject Proposal** | `POST` | `/customer/reservation/{reservationId}/proposals/{proposalId}/reject` | `bearerAuth` | None | `Success` (`{ success: true }`) | `post_customer_reservation_reservationId_proposals_proposalId_reject` |

### 2.2 Headers & Authentication
- `Accept`: `application/json`
- `Content-Type`: `application/json` (for POST requests with body)
- `Authorization`: `Bearer <customer_jwt_access_token>` (**Required**)

---

## 3. Ownership, Authorization & Isolation Guarantees

### 3.1 Strict Server-Side Scoping
1. **Bearer Token Identity**:
   - Customer identity is derived entirely by the upstream server from the Bearer token in the `Authorization` header.
   - The frontend never passes client-supplied customer identifiers (`customerId`, `customerAccountId`) in query parameters or URL paths.
2. **Access Isolation Across Customers**:
   - When Customer A attempts to access `GET /customer/reservation/{reservationId}` for a reservation belonging to Customer B, the server responds with `403 Forbidden` or `404 Not Found`.
   - Any mutation request (`POST .../cancel`, `POST .../reschedule`, `POST .../ratings`, `POST .../proposals/...`) targeting another customer's reservation is rejected with `403 Forbidden`.
   - Unauthenticated callers receive `401 Unauthorized`. If token refresh fails, access tokens are cleared and the user is prompted to log in via `AuthModal`.

---

## 4. State Transitions & Allowed Customer Mutations

### 4.1 Documented Reservation Status Lifecycle
The OpenAPI specification defines the exact lifecycle enum:
- `PENDING`: Initial state upon booking creation.
- `CONFIRMED`: Confirmed by gaming center staff/owner.
- `IN_PROGRESS`: Gaming session is active.
- `COMPLETED`: Terminal state; session has concluded.
- `CANCELED`: Terminal state; reservation was canceled.
- `NO_SHOW`: Terminal state; customer failed to attend.

### 4.2 Customer Mutation Rules & Allowed Transitions
1. **Cancellation (`POST /customer/reservation/{reservationId}/cancel`)**:
   - Allowed when reservation is in `PENDING` or `CONFIRMED` status.
   - If a customer attempts to cancel an already `CANCELED`, `COMPLETED`, or `NO_SHOW` reservation, the backend rejects with `400 Bad Request` or `409 Conflict` (`INVALID_TRANSITION`, `RESERVATION_CANCEL_NOT_ALLOWED`, or `RESERVATION_ALREADY_CANCELLED`).
   - The frontend does not invent cancellation penalty fees or synthetic countdown windows: cancellation viability is verified against real backend responses.
2. **Rescheduling (`POST /customer/reservation/{reservationId}/reschedule`)**:
   - Submits requested `newStartTime` and `newEndTime` ISO strings.
   - Slot conflicts or overlaps return `409 Conflict` (`SLOT_NOT_AVAILABLE`, `OVERLAP_CONFLICT`, `RESERVATION_OVERLAP`), and the frontend displays clear, actionable Persian messaging without corrupting client state.
3. **Gaming Center Time Proposals (`accept` / `reject`)**:
   - Available when proposals exist in `PENDING` status.
   - Calling accept or reject triggers backend update. On success, the frontend re-fetches the reservation details and proposals list.
4. **Ratings (`POST /customer/reservation/{reservationId}/ratings`)**:
   - Allowed only for `COMPLETED` reservations with `canRate !== false` and `isRated !== true`.
   - Requires rating integer between 1 and 5. Optional comment string.

---

## 5. UI Integrity & Revalidation After Mutation

### 5.1 No UI Regression
- The UI in `src/app/reservations/[id]/page.tsx` preserves:
  - Header with center title, location, back button navigation to `/reservations`.
  - Stepper indicator for active states (`PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`).
  - Terminal status card for `CANCELED` and `NO_SHOW`.
  - Live countdown timer for `IN_PROGRESS` sessions.
  - Gaming center proposed reschedule banner with accept/reject buttons.
  - Station snapshot display (image, name, device type).
  - Price and payment state card.
  - Cancel reservation modal dialog.
  - Rating modal sheet for completed sessions.

### 5.2 Reliable Revalidation
- Mutations only show success when confirmed by an HTTP 200/201 response from the server.
- Upon completion of any mutation (cancel, proposal accept/reject, review submission), `setReloadToken((v) => v + 1)` triggers an immediate revalidation from `GET /customer/reservation/{id}` and `GET /customer/reservation/{id}/proposals`.
- In-flight operations set loading/busy flags (`isCancelling`, `busyProposalId`, `submitting`) to prevent repeated or duplicate submissions.

---

## 6. Contract Gaps & Architectural Recommendations

### 6.1 Unsupported Customer Actions
1. **Direct Reservation Deletion (`DELETE /customer/reservation/{id}`)**:
   - **Contract Status**: Not defined in OpenAPI v1.0-LOCKED.
   - **Frontend Enforcement**: `reservationService.deleteUnsupported()` throws `ContractGapError("CustomerReservationDelete", ...)`. The client never issues raw HTTP DELETE requests.
2. **Direct Arbitrary Field Edits (`PATCH` or `PUT /customer/reservation/{id}`)**:
   - **Contract Status**: While `PATCH /gamingCenters/{gamingCenterId}/reservation/{reservationId}` exists for Owner/Staff, no PATCH endpoint is defined for Customers. Customers must use `POST /customer/reservation/{reservationId}/reschedule`.
   - **Frontend Enforcement**: `reservationService.updateUnsupported()` throws `ContractGapError("CustomerReservationUpdate", ...)`.
3. **Cancellation Fee Calculation & Policy Endpoint**:
   - **Contract Status**: OpenAPI v1.0-LOCKED does not provide a cancellation penalty or refund estimation endpoint.
   - **Frontend Mitigation**: Display transparent confirmation without fabricating mock monetary penalties.

---

## 7. Staging & Automated Testing Results

### 7.1 Automated Test Suite (`src/services/customerReservationDetailsMutations.test.ts`)
The test suite covers:
1. **Authenticated Details Retrieval**:
   - Verification of `GET /customer/reservation/{id}` sending Bearer token.
   - Unwrapping of both `Success<Reservation>` and flat Reservation JSON payloads.
2. **Authorization & Ownership Isolation**:
   - `401 Unauthorized` handling and token refresh failure.
   - `403 Forbidden` ownership denial when accessing another customer's reservation.
   - Verification that requests never trust or send client-supplied customer IDs.
3. **Cancellation Mutation**:
   - Successful cancellation via `POST /customer/reservation/{id}/cancel`.
   - Accurate propagation of `INVALID_TRANSITION` (e.g. attempting to cancel a completed or already canceled reservation).
   - Network failure and 500 error handling without fake fallback.
4. **Rescheduling Mutation**:
   - Submitting `newStartTime` and `newEndTime` to `POST /customer/reservation/{id}/reschedule`.
   - Conflict handling (`409 Conflict`, `OVERLAP_CONFLICT`).
5. **Proposal Mutations & Reviews**:
   - Accepting and rejecting time proposals via documented routes.
   - Review submission via `POST /customer/reservation/{id}/ratings` with rating validation.
6. **Concurrency & Repeated Actions**:
   - Single-flight protection against duplicate rapid submissions.
7. **Contract Gaps**:
   - Explicit throwing of `ContractGapError` for `deleteUnsupported` and `updateUnsupported`.
8. **Production Safety**:
   - Tests run strictly in mocked/isolated environments without touching production or staging live databases.
