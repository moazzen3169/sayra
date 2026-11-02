# Backend Contract Gap Report: Customer Booking Preparation & Price Data (Phase 9)

## 1. Executive Summary
This document analyzes the API contract and operational capabilities for **Customer Booking Preparation and Price Data** against the Playenest API specification `v1.0-LOCKED` (`public/context/openapi-yaml.md`).

In customer reservation flows, the user selects:
- Gaming center (`gamingCenterSlug`)
- Game station(s) / device categories (`stationId`)
- Date and time slots (`date`, `startTime`)
- Rental duration / hours
- Extra accessories (controllers)

In Phase 9 (Booking Preparation and Price Data), the frontend prepares the booking, computes the estimated cost breakdown, and validates availability without submitting the final reservation.

---

## 2. API Contract Investigation: Quotes, Pricing & Validation Endpoints

### 2.1 Server-Side Price Calculation / Quote Endpoint
- **Status in v1.0-LOCKED**: **GAP (Not Available)**.
- **Investigation Finding**:
  - The OpenAPI specification does not define an endpoint for calculating price quotes (e.g. `POST /public/gamingCenters/{slug}/quote` or `POST /public/pricing/calculate`).
  - No server-side endpoint exists to preview total costs, taxes, or discounts prior to creating a reservation.
- **Contract Reference**:
  - `GameStation` schema (`#/components/schemas/GameStation`) provides:
    - `hourlyPrice`: `number` (Hourly station rental fee).
  - `Reservation` schema (`#/components/schemas/Reservation`) provides:
    - `totalHours`: `number`
    - `totalPrice`: `number`
    - `stationSnapshot`: `{ name: string, hourlyPrice: number, stationType: string }`
- **Frontend Calculation Source**:
  - Since no backend quote operation is provided, client-side estimation is required.
  - The calculation formula strictly follows the documented station schema:
    $$\text{Item Estimated Price} = \text{station.hourlyPrice} \times \text{hours} + (\text{extraControllers} \times \text{extraUnitPrice})$$
  - Where `extraUnitPrice` is taken from `station.extraControllerPrice` if defined by the gaming center, and defaults to `0` if not defined.
  - No synthetic fees, arbitrary taxes, platform markups, discount deductions, or rounding rules are fabricated.
  - All calculated amounts are presented explicitly as estimates ("برآورد مبلغ") and not as final confirmed prices. Final confirmation occurs only when the reservation is created via `POST /public/gamingCenters/{slug}/reservation`.

### 2.2 Pre-Reservation Validation Endpoint
- **Status in v1.0-LOCKED**: **GAP (Implicit via Availability)**.
- **Investigation Finding**:
  - The API does not have a separate `POST /public/gamingCenters/{slug}/reservation/validate` endpoint.
  - Validation of selected station IDs, dates, and times is performed using the documented endpoint:
    `GET /public/gamingCenters/{gamingCenterSlug}/availability/slots?date={date}&stationId={stationId}`
  - Conflict detection during reservation creation is handled by the server returning HTTP `400` / `409` with error codes `SLOT_NOT_AVAILABLE` or `RESERVATION_OVERLAP`.

### 2.3 Station Pricing Schema Completeness
- **Status in v1.0-LOCKED**: **Partial**.
- **Investigation Finding**:
  - `GameStation` in OpenAPI v1.0 contains `hourlyPrice` (`number`), `minRentHours` (`integer`), `maxRentHours` (`integer`), `defaultDurationHours` (`integer`), and `incrementMinutes` (`integer`).
  - `extraControllerPrice` and `defaultControllers` are not formally defined in `GameStation` v1.0 schema (previously documented in `docs/GAMING_CENTER_STATIONS_API_CONTRACT.md`).
  - When stations lack `extraControllerPrice`, the frontend treats the fee as `0` without inventing arbitrary defaults (e.g. replacing hardcoded `30,000` fallback values with `0`).

---

## 3. Booking Preparation Data Architecture

### 3.1 Data Flow
```
User Selection:
  [Gaming Center] -> slug
  [Stations]       -> station IDs & quantities
  [Date & Time]    -> date string (YYYY-MM-DD), startTimes (ISO-8601)
  [Accessories]    -> extraControllers count
       │
       ▼
Verification:
  gamingCenterService.getAvailabilitySlots(slug, date, stationId)
       │
       ▼
Price Estimation:
  bookingPreparationService.prepareBooking(...)
  - Validate station existence and active status
  - Verify slot availability across requested inventory
  - Calculate item breakdown:
      hourlyPrice = station.hourlyPrice
      extraFee = extraControllers * extraUnitPrice
      itemTotal = (hourlyPrice + extraFee) * duration
  - Sum line items into grand total estimate (isFinal = false)
```

### 3.2 Pricing Disclaimer & Estimate Semantics
- Every price displayed prior to `POST .../reservation` is labelled as **"برآورد مبلغ"** (Estimated Price).
- The estimate is clearly indicated as non-binding until confirmed by the server upon reservation completion.

---

## 4. Recommendations for Future API Versions

### 4.1 Server-Side Price Quote Endpoint
```yaml
/public/gamingCenters/{gamingCenterSlug}/quote:
  post:
    summary: Calculate reservation pricing quote
    tags:
      - Pricing
    parameters:
      - name: gamingCenterSlug
        in: path
        required: true
        schema:
          type: string
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - items
            properties:
              items:
                type: array
                items:
                  type: object
                  required:
                    - stationId
                    - startTime
                    - durationHours
                  properties:
                    stationId:
                      type: string
                    startTime:
                      type: string
                      format: date-time
                    durationHours:
                      type: number
                    extraControllers:
                      type: integer
    responses:
      '200':
        description: Calculated price breakdown
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: object
                  properties:
                    subtotal:
                      type: number
                    taxes:
                      type: number
                    discount:
                      type: number
                    total:
                      type: number
                    currency:
                      type: string
                    isFinal:
                      type: boolean
```
