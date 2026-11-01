# Backend Contract Gap Report: Gaming Center Stations & Equipment (Phase 7)

## 1. Executive Summary
In Sayra / Playenest OpenAPI specification `v1.0-LOCKED` (`public/context/openapi-yaml.md`), gaming center station and hardware equipment management is defined under:
- `GET /gamingCenters/{gamingCenterId}/stations` (List stations)
- `POST /gamingCenters/{gamingCenterId}/stations` (Create station)
- `GameStation` schema in `components/schemas`

During Phase 7 implementation, the client-facing station selection, console/PC equipment presentation, and pricing integration were bound to these documented APIs. This document details the discrepancies and contract gaps between existing UI requirements and the locked OpenAPI v1.0 specification.

---

## 2. Documented OpenAPI Schema vs. UI Capabilities

### 2.1 Locked `GameStation` Schema
According to `public/context/openapi-yaml.md` lines 323–370:
```yaml
GameStation:
  type: object
  properties:
    id:
      type: string
    gamingCenterId:
      type: string
    name:
      type: string
    stationType:
      type: string
      enum:
        - PC
        - PLAYSTATION
        - XBOX
        - SWITCH
        - VR
    isVip:
      type: boolean
    hourlyPrice:
      type: number
    minRentHours:
      type: integer
    maxRentHours:
      type: integer
    defaultDurationHours:
      type: integer
    incrementMinutes:
      type: integer
    isActive:
      type: boolean
```

---

## 3. Identified Contract Gaps

### 3.1 Station Images / Hardware Visuals (`imageUrl`)
- **Status in v1.0-LOCKED**: Absent.
- **Contract Analysis**: `GameStation` contains no field for hardware photos or station-specific images.
- **Implementation Handling**: The frontend resolves icons and visual banners purely from verified static design assets corresponding to the `stationType` enum (`PC`, `PLAYSTATION`, `XBOX`, `SWITCH`, `VR`, with generic fallback for custom/unknown hardware). No synthetic image URLs are fabricated.

### 3.2 Multi-Unit Aggregation & Inventory Quantity (`quantity`)
- **Status in v1.0-LOCKED**: Absent.
- **Contract Analysis**: Each item in `GET /gamingCenters/{id}/stations` represents an individual station unit with a distinct `id`. There is no `quantity` field indicating a batch of identical stations.
- **Implementation Handling**: Client-side grouping aggregates individual `GameStation` records of the same `stationType` (and active status) to compute capacity as `stations.length`. No artificial inventory numbers are generated.

### 3.3 Controller Pricing & Extra Accessories (`defaultControllers`, `maxExtraControllers`, `extraControllerPrice`)
- **Status in v1.0-LOCKED**: Absent from standard `GameStation` schema.
- **Contract Analysis**: `GameStation` does not define `defaultControllers`, `maxExtraControllers`, or `extraControllerPrice`.
- **Implementation Handling**:
  - The UI does NOT invent extra controller fees.
  - The "+ دسته اضافه" button and hourly accessory calculations are displayed only if the station record provides an `extraControllerPrice`. If undefined or absent, the station is presented without extra controller fees.

### 3.4 Hardware Specifications & Equipment Details (`description`, `specs`)
- **Status in v1.0-LOCKED**: Absent.
- **Contract Analysis**: `GameStation` does not have a `description` or `specifications` field (e.g. GPU, monitor refresh rate, CPU).
- **Implementation Handling**: The station display relies exclusively on `name`, `stationType`, `isVip`, and `hourlyPrice`.

### 3.5 Distinguishing Empty Inventory vs. Network / Server Failure
- **Status in v1.0-LOCKED**: Handled in client architecture.
- **Implementation Handling**:
  - An empty array (`[]`) from `GET /gamingCenters/{id}/stations` denotes that the gaming center has no stations currently registered or active.
  - An HTTP error (such as 404, 500, or network failure) produces a structured `stationsError` state, presenting a retry action rather than misleading the user into thinking the center has zero devices.

---

## 4. Proposed Schema Extensions for OpenAPI v1.1
To fully support rich station booking experiences natively:
```yaml
components:
  schemas:
    GameStation:
      type: object
      properties:
        id:
          type: string
        gamingCenterId:
          type: string
        name:
          type: string
        stationType:
          type: string
          enum: [PC, PLAYSTATION, XBOX, SWITCH, VR, RACING_WHEEL, BILLIARD]
        isVip:
          type: boolean
        hourlyPrice:
          type: number
        imageUrl:
          type: string
          nullable: true
        description:
          type: string
          nullable: true
        defaultControllers:
          type: integer
          default: 2
        maxExtraControllers:
          type: integer
          default: 2
        extraControllerPrice:
          type: number
          nullable: true
        isActive:
          type: boolean
```
