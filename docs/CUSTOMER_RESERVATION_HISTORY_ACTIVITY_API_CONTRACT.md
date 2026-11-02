# Backend Contract Gap & Staging Verification Report: Customer Reservation History and Activity (Phase 14)

## 1. Executive Summary
This document analyzes and specifies the API contract, operational semantics, timezone handling, sorting rules, and staging verification for **Customer Reservation History and Activity** against the Playenest API specification `v1.0-LOCKED` (`openapi.json` / `public/context/openapi-yaml.md`).

In Phase 14, customer reservation history and activity views (`/reservations`, `ReservationHistoryCard`, `/reservations/[id]`) connect to the documented customer endpoint:
- `GET /customer/reservation`: List reservations belonging to the authenticated customer.
- `GET /customer/reservation/{reservationId}`: Retrieve detailed status, schedule, and time proposals for a specific reservation.

---

## 2. API Contract Investigation: History vs. Activity Endpoints

### 2.1 Backend Contract Audit
An investigation of `openapi.json` (`v1.0-LOCKED`) reveals:
1. **No Dedicated Customer Activity/History Path**:
   - There is **no** dedicated `/customer/activity`, `/customer/history`, or `/customer/events` endpoint in OpenAPI v1.0-LOCKED.
   - The only activity endpoint in the specification is `/gamingCenters/{gamingCenterId}/analytics/customers/activity`, which is an administrative/analytics endpoint for owners/managers aggregating visit frequency histograms across gaming centers, not an individual customer activity log.
2. **Customer Reservation History Mechanism**:
   - Customer reservation history is served via the documented endpoint `GET /customer/reservation`.
   - The backend scopes reservations strictly to the caller identified by the Bearer JWT token in the `Authorization` header.
3. **Absence of Query Filters**:
   - `GET /customer/reservation` in OpenAPI v1.0-LOCKED defines no query parameters in its path schema (`parameters: []`).
   - Standard pagination parameters (`page`, `pageSize`) are accepted by the server's pagination envelope handler (`Pagination`), but filtering by status (e.g., active vs. past/history) is not supported server-side on this route.

---

## 3. Timestamp Semantics & Timezone Handling

### 3.1 Documented Timestamp Formats
- Backend timestamps (`startTime`, `endTime`, `createdAt`) follow standard **ISO 8601 UTC** format (e.g., `2026-11-02T15:00:00.000Z`).
- Timestamps are never assumed to be local client time without parsing ISO UTC offsets.

### 3.2 Timezone Display Formatting (`APP_TIME_ZONE`)
- The system timezone is configured as `Asia/Tehran` via `APP_TIME_ZONE` (`src/lib/api/config.ts`), respecting Iran Standard Time (IRST, UTC+03:30) and daylight saving rules.
- Date and time formatting in `src/lib/reservationUi.ts`:
  - `formatClock(iso)`: Converts UTC ISO string to 24-hour Tehran time (e.g., `18:30`).
  - `formatDayLabel(iso)`: Evaluates day differences relative to today in Tehran time:
    - Same day: `"امروز"` (Today)
    - Next day: `"فردا"` (Tomorrow)
    - Previous day: `"دیروز"` (Yesterday)
    - Other days: Persian Jalali calendar representation (e.g., `"دوشنبه ۱۱ آبان"`).
  - `formatReservationWhen(startIso, endIso)`: Derives human-readable reservation window (e.g., `"امروز از ساعت ۱۸:۳۰ تا ۱۹:۳۰"`).
- **Client-Derived vs. Backend Data**:
  - Backend fields: `startTime`, `endTime`, `totalHours`, `status`, `paymentState`.
  - Client-derived formatting: Persian digit translation (`toPersianDigits`), Jalali date label (`formatDayLabel`), and localized time-window strings.

---

## 4. Integrity Directives: No Fabricated Events or Fake Activity

### 4.1 Strict Grounding in Real Data
- The application does not construct synthetic audit trails, fake session logs, or simulated activity timelines.
- Events displayed to the customer (such as reservation status badge, terminal status card, or time reschedule proposals) correspond 1:1 with real fields in the backend response (`status`, `proposals[]`).
- If a reservation has no owner-initiated time proposals, none are displayed.
- If a reservation has no address or reservation code, fallback states render gracefully without inventing mock addresses or fake codes.

### 4.2 Empty History vs. API Errors
- When the authenticated user has no reservations (`items.length === 0`), the UI renders the dedicated neutral empty state: `"هنوز رزروی ثبت نکرده‌اید"`.
- Under network outages, 500 server errors, or 502 bad gateway responses, the UI displays explicit error feedback with a retry button (`تلاش دوباره`), and never falls back to mock items.

---

## 5. Contract Limitations & Recommendations for OpenAPI v1.1

| Feature | OpenAPI v1.0-LOCKED Status | Frontend Mitigation | Recommended Backend Improvement |
| :--- | :--- | :--- | :--- |
| **Dedicated Customer Activity Log** | Not present | Activity is represented strictly by reservation history (`GET /customer/reservation`) | Introduce `GET /customer/activity` with event timestamps and types |
| **Status Filter on Customer Reservations** | Not declared in parameters | Client-side filtering if needed | Add `status: PENDING\|CONFIRMED\|COMPLETED\|CANCELED` query param |
| **Date Range Filtering** | Not declared in parameters | Handled on full customer list | Add `startDate` and `endDate` query parameters |
| **Center Metadata on Reservation** | Not present in Reservation schema (`gamingCenterName`, `gamingCenterAddress`) | Displayed if returned by backend, else neutral fallback | Embed `gamingCenter` object in `Reservation` schema |
| **Reservation Verification Code** | Optional / undeclared field (`reservationCode`) | Displayed if present in response | Formally define `reservationCode` in `Reservation` schema |

---

## 6. Staging & Automated Testing Results

Automated tests in `src/services/customerReservationHistoryActivity.test.ts` verify:
1. **Empty History Response**: `[]` renders empty state without fabricating mock items.
2. **Pagination Support**: Parsing of `meta.pagination` envelope (`page`, `pageSize`, `total`, `totalPages`).
3. **Date Ordering**: Verifying descending chronological ordering by `startTime`.
4. **Timezone Display**: Correct conversion of UTC ISO timestamps to Tehran time (`Asia/Tehran`).
5. **Client-Derived Formatting Identification**: Explicit distinction between raw backend values and client Persian/Jalali strings.
6. **API Error Handling**: Clean propagation of 401, 404, 500, 502, and network failures.
7. **No Fake Activity**: Verification that no synthetic activity events or fake timeline logs exist.
