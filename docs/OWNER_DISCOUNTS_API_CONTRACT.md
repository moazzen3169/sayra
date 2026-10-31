# Backend Contract Gap Report: Discounts Management (Phase 6A)

## 1. Overview
This document records backend contract gaps, schema discrepancies, and proposed OpenAPI extensions for the **Gaming Center Discount Management** API (`/gamingCenters/{gamingCenterId}/discounts`).

---

## 2. API Contract Specification (OpenAPI v1.0-LOCKED)

The OpenAPI specification currently defines the following endpoints:

- `GET /gamingCenters/{gamingCenterId}/discounts`: List discounts for a gaming center.
  - Query parameters:
    - `targetType`: `"GAMING_CENTER" | "STATION"`
    - `targetId`: `string`
    - `isActive`: `boolean`
    - `page`: `integer`
    - `pageSize`: `integer`
  - Response: `{ success: boolean, data: Discount[], meta: Meta }`

- `POST /gamingCenters/{gamingCenterId}/discounts`: Create a new discount.
  - Request Body:
    ```json
    {
      "targetType": "GAMING_CENTER | STATION",
      "targetId": "string",
      "valueType": "PERCENTAGE | FIXED_AMOUNT",
      "value": "number",
      "startAt": "string (ISO 8601 date-time)",
      "endAt": "string (ISO 8601 date-time)",
      "isActive": "boolean (optional)"
    }
    ```
  - Response: `201 Created` with `$ref: "#/components/schemas/Success"`.

- `GET /gamingCenters/{gamingCenterId}/discounts/{id}`: Get discount by ID.
  - Response: `{ success: boolean, data: Discount }`

- `PATCH /gamingCenters/{gamingCenterId}/discounts/{id}`: Update discount details.
  - Request Body: partial fields of `Discount`.
  - Response: `200 OK` with `$ref: "#/components/schemas/Success"`.

- `DELETE /gamingCenters/{gamingCenterId}/discounts/{id}`: Delete discount.
  - Response: `200 OK` with `$ref: "#/components/schemas/Success"`.

- `PATCH /gamingCenters/{gamingCenterId}/discounts/{id}/status`: Activate or deactivate discount.
  - Request Body:
    ```json
    {
      "isActive": "boolean"
    }
    ```
  - Response: `200 OK` with `$ref: "#/components/schemas/Success"`.

---

## 3. Schema Comparison & Contract Gaps

### Documented `Discount` Schema vs Frontend Requirements:

| Field | OpenAPI `Discount` | Frontend UI Requirement | Status / Gap |
| :--- | :--- | :--- | :--- |
| `id` | `string` | `string` | Supported |
| `gamingCenterId` | `string` | `string` | Supported |
| `targetType` | `"GAMING_CENTER" \| "STATION"` | `"ALL" \| "STATION_TYPE" \| "SPECIFIC_STATION"` | **Partial Mismatch**: OpenAPI only supports `GAMING_CENTER` or `STATION`. Station type category scoping (e.g., all `PLAYSTATION` or `PC`) is not supported by backend schema. |
| `targetId` | `string` | `gamingCenterId` or `stationId` | Supported when targetType is `GAMING_CENTER` (targetId = gamingCenterId) or `STATION` (targetId = stationId). |
| `valueType` | `"PERCENTAGE" \| "FIXED_AMOUNT"` | `"PERCENTAGE" \| "FIXED_AMOUNT"` | Supported |
| `value` | `number` | `number` | Supported |
| `startAt` | `string (ISO 8601)` | `createdAt` / start timestamp | Supported |
| `endAt` | `string (ISO 8601)` | `durationDays` / expiry timestamp | Supported |
| `isActive` | `boolean` | `boolean` | Supported |
| `title` | **Missing** | `string` (e.g., "تخفیف جشنواره آخر هفته") | **Backend Gap**: OpenAPI lacks `title` / label for discounts. |
| `code` | **Missing** | `string` (e.g., "WEEKEND20") | **Backend Gap**: OpenAPI does not support voucher/promo code string persistence in `POST /discounts`. |
| `maxUsage` | **Missing** | `number` (e.g., 50 uses limit) | **Backend Gap**: OpenAPI lacks usage quota/cap field. |
| `usedCount` | **Missing** | `number` (counter of redemptions) | **Backend Gap**: OpenAPI `Discount` schema lacks usage metrics. |

---

## 4. Frontend Mitigation Strategy

1. **Strict Payload Compliance:**
   - When calling `POST /gamingCenters/{gamingCenterId}/discounts` and `PATCH /gamingCenters/{gamingCenterId}/discounts/{id}`, the frontend will **only** send confirmed OpenAPI fields: `targetType`, `targetId`, `valueType`, `value`, `startAt`, `endAt`, and `isActive`.
   - The frontend will **never** claim or assume that `code` or `maxUsage` are persisted to the database if the backend does not accept them.

2. **Semantic Target Mapping:**
   - `targetScope === "ALL"`: mapped to `targetType: "GAMING_CENTER"`, `targetId: gamingCenterId`.
   - `targetScope === "SPECIFIC_STATION"`: mapped to `targetType: "STATION"`, `targetId: stationId`.
   - `targetScope === "STATION_TYPE"`: Since OpenAPI lacks a station category target, it is mapped to `targetType: "GAMING_CENTER"` (or individual station if single) without inventing invalid enum values.

3. **Date Calculations:**
   - `durationDays` is converted to standard ISO 8601 timestamps:
     - `startAt`: `new Date().toISOString()`
     - `endAt`: `new Date(Date.now() + durationDays * 86400000).toISOString()`

4. **Live Price Preview:**
   - The price preview calculation remains strictly a frontend visual preview and is not claimed to be a server-calculated price.

---

## 5. Requested Backend Extensions

To support the full intended promotional feature set, the backend OpenAPI schema should be updated to:

```yaml
components:
  schemas:
    Discount:
      type: object
      required:
        - targetType
        - targetId
        - valueType
        - value
        - startAt
        - endAt
      properties:
        id:
          type: string
        gamingCenterId:
          type: string
        title:
          type: string
          description: Human-readable campaign name
        code:
          type: string
          nullable: true
          description: Optional promo code voucher for players
        targetType:
          type: string
          enum: [GAMING_CENTER, STATION, STATION_TYPE]
        targetId:
          type: string
        valueType:
          type: string
          enum: [PERCENTAGE, FIXED_AMOUNT]
        value:
          type: number
        maxUsage:
          type: integer
          nullable: true
          description: Max number of reservations eligible
        usedCount:
          type: integer
          description: Total times this discount has been applied
        startAt:
          type: string
          format: date-time
        endAt:
          type: string
          format: date-time
        isActive:
          type: boolean
```
