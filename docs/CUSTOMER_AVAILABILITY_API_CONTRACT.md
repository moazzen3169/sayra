# Backend Contract Gap Report: Customer Availability & Booking Calendar (Phase 8)

## 1. Executive Summary
In Sayra / Playenest OpenAPI specification `v1.0-LOCKED` (`public/context/openapi-yaml.md`), customer booking availability is represented by a single endpoint:
- `GET /public/gamingCenters/{gamingCenterSlug}/availability/slots`

Query Parameters:
- `date` (`string`, format: `date`, required): Single calendar date (e.g. `YYYY-MM-DD`).
- `stationId` (`string`, optional): Specific station identifier to query slot availability for.

Response Schema:
- Returns an array or pagination envelope containing `AvailabilitySlot` objects with fields:
  - `startTime` (`string`, format: `date-time`)
  - `endTime` (`string`, format: `date-time`, optional)
  - `isAvailable` (`boolean`, optional)
  - `status` (`string`, e.g. `"AVAILABLE" | "UNAVAILABLE"`, optional)

---

## 2. Documented Contract Gaps & Limitations

### 2.1 Multi-Day / Monthly Calendar Availability Endpoint
- **Status in v1.0-LOCKED**: Gap.
- **Contract Analysis**: There is no range-based availability endpoint (such as `startDate` / `endDate` or `month`) for customer-facing availability. The only public endpoint accepts a single `date` parameter (`?date=YYYY-MM-DD`).
- **Frontend Handling**:
  - The calendar UX presents available booking days (e.g., today and the next 9 days).
  - Availability queries are dispatched on a per-date basis when the user selects or navigates to a specific date.
  - No synthetic or inferred availability flags are populated across calendar days prior to querying the API.

### 2.2 Timezone Semantics & Explicit Center Timezone
- **Status in v1.0-LOCKED**: Partial / Asymmetric.
- **Contract Analysis**:
  - Operating settings containing `timeZone` (e.g. `"Asia/Tehran"`) exist solely under the owner management endpoint `GET /gamingCenters/{gamingCenterId}/settings`.
  - The public center lookup endpoint `GET /public/gamingCenters/{gamingCenterSlug}` does not expose the center's configured timezone.
- **Frontend Handling**:
  - All date queries send standardized ISO date strings (`YYYY-MM-DD`) derived with respect to `APP_TIME_ZONE` (`Asia/Tehran`).
  - Slots returned as ISO-8601 timestamps (UTC or with timezone offsets) are formatted and presented using the authoritative application timezone (`APP_TIME_ZONE = Asia/Tehran`) via `formatClock` without altering the original backend ISO string for bookings.

### 2.3 Station Real-time Capacity Endpoint
- **Status in v1.0-LOCKED**: Gap.
- **Contract Analysis**: There is no separate public capacity or occupancy endpoint. Station inventory is retrieved via `GET /gamingCenters/{gamingCenterId}/stations`, and slot availability is determined per station using `GET /public/gamingCenters/{slug}/availability/slots?date={date}&stationId={stationId}`.
- **Frontend Handling**:
  - Availability is queried directly for each station or group of stations.
  - Multi-station bookings evaluate capacity strictly by counting how many stations of a given device type report `isAvailable === true` for each slot, without inventing artificial capacity formulas.

### 2.4 Dynamic Slot Durations & Increments
- **Status in v1.0-LOCKED**: Unspecified on Public Endpoint.
- **Contract Analysis**: Station configurations contain `minRentHours`, `maxRentHours`, `defaultDurationHours`, and `incrementMinutes`. However, the availability endpoint returns discrete slots (`startTime`, `endTime`).
- **Frontend Handling**:
  - Frontend renders the discrete slots provided by `GET .../availability/slots`.
  - Frontend does not synthesize missing hours or fabricate slot durations. If an empty array is returned by the API, an empty state is shown indicating no available slots.

---

## 3. Recommended Contract Enhancements for Future Revisions

### 3.1 Date Range / Batch Availability Endpoint
To optimize network efficiency when displaying calendar views:
```yaml
/public/gamingCenters/{gamingCenterSlug}/availability/calendar:
  get:
    summary: Get availability summary for a date range
    tags:
      - Availability
    parameters:
      - name: gamingCenterSlug
        in: path
        required: true
        schema:
          type: string
      - name: startDate
        in: query
        required: true
        schema:
          type: string
          format: date
      - name: endDate
        in: query
        required: true
        schema:
          type: string
          format: date
    responses:
      '200':
        description: Available dates summary
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: array
                  items:
                    type: object
                    properties:
                      date:
                        type: string
                        format: date
                      hasAvailableSlots:
                        type: boolean
```

### 3.2 Timezone Field in Public Gaming Center Response
Include `timeZone: "Asia/Tehran"` in `GET /public/gamingCenters/{gamingCenterSlug}` to eliminate frontend assumptions regarding gaming center local time boundaries.
