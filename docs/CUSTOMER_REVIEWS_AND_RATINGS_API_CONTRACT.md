# Backend Contract & Authorization Gap Report: Customer Reviews and Ratings (Phase 18)

## 1. Executive Summary

This document specifies the backend contract integration, identity resolution, reservation-linkage rules, validation invariants, and contract gaps for **Customer Reviews and Ratings (Phase 18)** against the locked OpenAPI v1.0 specification (`openapi.json` / `public/context/openapi-yaml.md`).

A comprehensive audit of the OpenAPI specification confirms:
1. **Public Reviews Retrieval**:
   - `GET /public/gamingCenters/{gamingCenterSlug}/ratings` provides a public list of ratings (`Rating` schema) for a given gaming center.
2. **Review Submission**:
   - Reviews **must be tied to a specific reservation**.
   - Authenticated customer submission is supported via:
     `POST /customer/reservation/{reservationId}/ratings` (requires `bearerAuth`).
   - Public submission tied to a reservation is supported via:
     `POST /public/gamingCenters/{gamingCenterSlug}/reservation/{reservationId}/ratings`.
   - Standalone review submission without a reservation is **NOT supported** in OpenAPI v1.0-LOCKED.
3. **Review Editing and Deletion**:
   - Neither customers nor public users have endpoints to update (`PATCH`/`PUT`) or delete (`DELETE`) their submitted ratings.
   - Status updates are reserved for Owner/Staff moderation via `PATCH /gamingCenters/{gamingCenterId}/ratings/{id}/status`.
4. **Customer-Scoped Reviews List**:
   - There is no endpoint (`GET /customer/ratings` or `GET /customer/reviews`) to list all reviews submitted by the currently logged-in customer. Reviews are displayed aggregated on the public gaming center detail page.
5. **No Simulated State**:
   - Reviews are never marked as submitted until the backend returns HTTP 201 Created.
   - Unsupported actions throw explicit `ContractGapError` and are never simulated using `localStorage` or in-memory mocks.

---

## 2. API Contract Specification (OpenAPI v1.0-LOCKED)

### 2.1 Documented Endpoints Matrix

| Operation | Method | Path | Security | Request Body | Response Envelope | OperationId |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **List Public Ratings** | `GET` | `/public/gamingCenters/{gamingCenterSlug}/ratings` | None (Public) | None | `{ success: boolean, data: Rating[] }` | `get_public_gamingCenters_gamingCenterSlug_ratings` |
| **Submit Customer Review** | `POST` | `/customer/reservation/{reservationId}/ratings` | `bearerAuth` | `{ rating: 1..5, comment?: string }` | `Success` (`201 Created`) | `post_customer_reservation_reservationId_ratings` |
| **Submit Public Review** | `POST` | `/public/gamingCenters/{gamingCenterSlug}/reservation/{reservationId}/ratings` | None (Public) | `{ rating: 1..5, comment?: string }` | `Success` (`201 Created`) | `post_public_gamingCenters_gamingCenterSlug_reservation_reservationId_ratings` |
| **Moderate Review** | `PATCH` | `/gamingCenters/{gamingCenterId}/ratings/{id}/status` | `bearerAuth` (Owner/Staff) | `{ status: "PUBLISHED" \| "HIDDEN" \| "DELETED" }` | `Success` (`200 OK`) | `patch_gamingCenters_gamingCenterId_ratings_id_status` |

---

### 2.2 Schema Definitions

#### `Rating` (OpenAPI components.schemas.Rating)
```yaml
Rating:
  type: object
  properties:
    id:
      type: string
    gamingCenterId:
      type: string
    reservationId:
      type: string
    rating:
      type: integer
    comment:
      type: string
    status:
      type: string
      enum:
        - PUBLISHED
        - HIDDEN
        - DELETED
```

#### Request Payload (`SubmitReservationRatingPayload`)
```json
{
  "rating": 5,
  "comment": "سیستم‌ها فوق‌العاده با کیفیت و پرسنل بسیار خوش‌برخورد بودند."
}
```
- `rating` (integer, required): Minimum 1, Maximum 5.
- `comment` (string, optional): Feedback text.

---

## 3. Ownership, Authorization & Isolation Guarantees

### 3.1 Reservation-Tied Reviews
1. In OpenAPI v1.0-LOCKED, a rating cannot exist independently in vacuum; it is linked to a `reservationId`.
2. When submitting via `POST /customer/reservation/{reservationId}/ratings`:
   - Customer identity is extracted strictly from the JWT Bearer token in `Authorization: Bearer <accessToken>`.
   - The upstream server verifies that the reservation belongs to the authenticated customer account.
   - If a customer attempts to rate a reservation belonging to another user, the server rejects with `403 Forbidden`.
   - If the reservation does not exist, `404 Not Found` is returned.
   - If the reservation has not concluded or has an ineligible status (e.g. `PENDING`, `CANCELED`, `NO_SHOW`), the server rejects with `400 Bad Request` or `409 Conflict`.
3. The frontend does not fabricate synthetic rating eligibility timers or fake client-side checks: eligibility is derived from reservation state (`status === "COMPLETED" && reservation.canRate !== false && reservation.isRated !== true`) and enforced definitively by backend HTTP responses.

---

## 4. Contract Gaps & Unsupported Customer Operations

The following table summarizes all operations absent from OpenAPI v1.0-LOCKED and how the frontend handles them:

| Operation | Expected Route | Contract Status | Frontend Handling |
| :--- | :--- | :--- | :--- |
| **List Customer's Submitted Reviews** | `GET /customer/ratings` | **Absent from OpenAPI** | Throws `ContractGapError("CustomerReviewsList", ...)` |
| **Customer Review Edit** | `PATCH /customer/ratings/{id}` | **Absent from OpenAPI** | Throws `ContractGapError("CustomerReviewEdit", ...)` |
| **Customer Review Delete** | `DELETE /customer/ratings/{id}` | **Absent from OpenAPI** | Throws `ContractGapError("CustomerReviewDelete", ...)` |
| **Standalone Review Creation** | `POST /public/gamingCenters/{slug}/ratings` | **Absent from OpenAPI** | Throws `ContractGapError("CustomerStandaloneReview", ...)` |
| **Author Name & Avatar in Rating** | `Rating.customerName`, `Rating.customerAvatar` | **Absent from Schema** | Optional UI fallbacks ("کاربر سایت") without mock names |
| **Creation Timestamp in Rating** | `Rating.createdAt` | **Absent from Schema** | UI handles optional timestamp cleanly |
| **Owner Public Reply in Rating** | `Rating.reply`, `Rating.repliedAt` | **Absent from Schema** | Documented in `OWNER_REVIEWS_API_CONTRACT.md` |

---

## 5. Security & Network Resilience

1. **Submission Confirmation**:
   - The frontend `RatingModal` displays a loading spinner and disables buttons during submission (`submitting = true`).
   - The modal only dismisses and triggers `onSuccess` once HTTP 201 Created is received.
   - If the backend returns an error (400, 401, 403, 404, 500), the error message is displayed directly in the modal without closing or recording a false submitted state.
2. **Production Safety**:
   - No automated tests issue real mutation requests against production gaming centers or public endpoints.
   - All tests use controlled mocks/spies inspecting URL, HTTP method, payload validation, and error propagation.
