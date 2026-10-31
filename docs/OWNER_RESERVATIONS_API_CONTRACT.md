# Backend Contract Gap Report: Owner Reservation Status Transitions & Detail Operations (Phase 5)

## 1. Executive Summary
This document records backend contract gaps and requested OpenAPI schema extensions for **Owner Reservation Status Management** (Confirm, Reject, Cancel, No-Show) and related metadata.

The objective of Phase 5 is to transition the entire Owner reservation workflow to authentic backend operations without fabricating data or guessing undocumented payloads.

---

## 2. Current OpenAPI Specification Analysis

### 2.1 Reservation Detail & Update
* **Get Reservation by ID:** `GET /gamingCenters/{gamingCenterId}/reservation/{reservationId}`
  - Returns `200 OK` with `{ success: boolean, data: Reservation }`.
  - Defined properly in OpenAPI (`operationId: get_gamingCenters_gamingCenterId_reservation_reservationId`).
* **Update Reservation Details:** `PATCH /gamingCenters/{gamingCenterId}/reservation/{reservationId}`
  - Defined in OpenAPI (`operationId: patch_gamingCenters_gamingCenterId_reservation_reservationId`).
  - **Allowed Request Body Fields:**
    ```json
    {
      "stationId": "string",
      "staffId": "string",
      "startTime": "date-time",
      "note": "string"
    }
    ```
  - **CRITICAL GAP:** The `PATCH` schema does **NOT** define a `status` field.
  - Sending `PATCH { status: "CONFIRMED" }` or `PATCH { status: "CANCELED" }` violates the OpenAPI contract and may fail backend schema validation or produce undefined behavior.

### 2.2 Customer vs Owner Status Endpoints
* OpenAPI defines customer cancellation:
  - `POST /customer/reservation/{reservationId}/cancel`
* OpenAPI does **NOT** define an equivalent Owner cancellation, rejection, or confirmation endpoint:
  - No `POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/confirm`
  - No `POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/cancel` (or reject)
  - No `POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/no-show`

---

## 3. Requested Backend Contract Extensions

To maintain RESTful consistency and clear state machine transitions, one of the two approaches below should be confirmed and implemented by the backend team:

### Option A: Dedicated Transition Endpoints (Recommended)

1. **Confirm Reservation:**
   * **Endpoint:** `POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/confirm`
   * **Tags:** `Reservation`
   * **Security:** `bearerAuth`
   * **Role:** `MANAGER`, `SUPERVISOR`, `STAFF`
   * **Response:** `200 OK`
     ```json
     {
       "success": true,
       "data": {
         "$ref": "#/components/schemas/Reservation"
       },
       "message": "رزرو با موفقیت تأیید شد."
     }
     ```
   * **Errors:**
     - `400 Bad Request` (`INVALID_TRANSITION`): When reservation is not in `PENDING` status.
     - `409 Conflict` (`SLOT_NOT_AVAILABLE` / `RESERVATION_OVERLAP`): When station slot has already been occupied.

2. **Cancel / Reject Reservation (Owner Panel):**
   * **Endpoint:** `POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/cancel`
   * **Tags:** `Reservation`
   * **Security:** `bearerAuth`
   * **Role:** `MANAGER`, `SUPERVISOR`, `STAFF`
   * **Request Body:**
     ```json
     {
       "reason": "string (optional, e.g. 'Station hardware maintenance')"
     }
     ```
   * **Response:** `200 OK`
     ```json
     {
       "success": true,
       "data": {
         "$ref": "#/components/schemas/Reservation"
       },
       "message": "رزرو لغو شد."
     }
     ```
   * **Errors:**
     - `400 Bad Request` (`INVALID_TRANSITION`): When reservation is completed or already canceled.

3. **Mark No-Show:**
   * **Endpoint:** `POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/no-show`
   * **Tags:** `Reservation`
   * **Security:** `bearerAuth`
   * **Role:** `MANAGER`, `SUPERVISOR`, `STAFF`
   * **Response:** `200 OK` with updated `Reservation` (status: `NO_SHOW`).

---

### Option B: Extend Schema for `PATCH /gamingCenters/{gamingCenterId}/reservation/{reservationId}`

If the backend architecture prefers updating status via `PATCH`:
* Add `status` to the allowed properties of `patch_gamingCenters_gamingCenterId_reservation_reservationId`:
  ```json
  {
    "status": {
      "type": "string",
      "enum": ["PENDING", "CONFIRMED", "IN_PROGRESS", "COMPLETED", "CANCELED", "NO_SHOW"]
    }
  }
  ```

---

## 4. Time Proposals & Session Operations

### 4.1 Time Proposals
* **Creation:** `POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/propose-time`
  - Required fields: `startTime` (ISO date-time), `endTime` (ISO date-time).
  - Optional field: `note` (string).
  - Business constraint: The duration (`endTime - startTime`) must remain consistent with the original reservation unless specified.
* **Retrieval:** `GET /gamingCenters/{gamingCenterId}/reservation/{reservationId}/proposals`
  - Returns `200 OK` with array of `ReservationTimeProposal`.

### 4.2 Session Operations
* **Start:** `POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/sessions/start`
  - Optional request body: `{ "stationId": "string" }`
* **Stop:** `POST /gamingCenters/{gamingCenterId}/reservation/{reservationId}/sessions/stop`
* **Pause:** `POST /gamingCenters/{gamingCenterId}/reservations/{reservationId}/sessions/pause`
  - Note: Path uses plural `reservations`.
* **Resume:** `POST /gamingCenters/{gamingCenterId}/reservations/{reservationId}/sessions/resume`
  - Note: Path uses plural `reservations`.

---

## 5. Frontend Client Behavior in Interim
In accordance with Part C of Phase 5 requirements:
- The frontend will **NOT** send undocumented PATCH requests with `status`.
- If a status transition is triggered in production without backend confirmation, an informative error stating the backend contract gap will be reported to prevent data corruption.
- In mock mode (development only), local state transition is simulated. In production mode, mock fallback is strictly disabled.
