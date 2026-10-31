# Backend Contract Gap Report: Stations & Media Management (Phase 4)

## 1. Overview
This document records backend contract gaps and requested OpenAPI schema extensions for **Gaming Center Stations** and **Media / Gallery Management**.

---

## 2. Stations API (`/gamingCenters/{gamingCenterId}/stations`)

### Current OpenAPI Specification
- **Endpoint:** `POST /gamingCenters/{gamingCenterId}/stations`
- **Request Body Schema:**
```json
{
  "name": "string (required)",
  "stationType": "string (enum: PC, PLAYSTATION, XBOX, SWITCH, VR; required)",
  "hourlyPrice": "number (required)",
  "minRentHours": "integer (optional)",
  "maxRentHours": "integer (optional)",
  "defaultDurationHours": "integer (optional)",
  "incrementMinutes": "integer (optional)",
  "isVip": "boolean (optional)",
  "isActive": "boolean (optional)"
}
```
- **Response Schema:** `201 Created` returning `$ref: "#/components/schemas/Success"`.
- **List Endpoint:** `GET /gamingCenters/{gamingCenterId}/stations` returning array of `GameStation`.

### Frontend Requirements & Contract Gap
The frontend gaming center management UI supports configuration of multi-device inventory, included controllers, additional controllers, and descriptive notes:
1. `quantity` (integer, min 1): Number of physical units belonging to this station model/grouping.
2. `defaultControllers` (integer, min 0): Number of controllers included with the station rent (e.g. 2 for PS5).
3. `maxExtraControllers` (integer, min 0): Maximum number of additional controllers a player may request (e.g. 2).
4. `extraControllerPrice` (number, min 0): Hourly fee per extra controller (in Toman).
5. `description` (string, max 1000): Additional station equipment specifications, monitor refresh rates, GPU models, or room guidelines.
6. `isVip` (boolean): Whether station belongs to VIP category (already partially present in schema, required to be persisted and returned in `GameStation`).

### Requested Backend Schema Extensions

#### Request Body (`POST /gamingCenters/{gamingCenterId}/stations`):
```json
{
  "name": "string (required)",
  "stationType": "PC | PLAYSTATION | XBOX | SWITCH | VR",
  "hourlyPrice": 220000,
  "quantity": 4,
  "defaultControllers": 2,
  "maxExtraControllers": 2,
  "extraControllerPrice": 50000,
  "description": "سیستم‌های قدرتمند همراه با مانیتور ۲۴۰ هرتز",
  "isVip": true,
  "isActive": true,
  "minRentHours": 1,
  "maxRentHours": 12,
  "defaultDurationHours": 2,
  "incrementMinutes": 30
}
```

#### Response / `GameStation` Schema Update:
```json
{
  "id": "st-ps5-001",
  "gamingCenterId": "gc_001",
  "name": "پلی‌استیشن ۵ #۱",
  "stationType": "PLAYSTATION",
  "hourlyPrice": 220000,
  "quantity": 4,
  "defaultControllers": 2,
  "maxExtraControllers": 2,
  "extraControllerPrice": 50000,
  "description": "سیستم‌های قدرتمند همراه با مانیتور ۲۴۰ هرتز",
  "isVip": true,
  "isActive": true,
  "createdAt": "2026-03-31T12:00:00.000Z"
}
```

#### Individual Station Updates & Deletion
The current OpenAPI does not define:
- `PUT /gamingCenters/{gamingCenterId}/stations/{stationId}`
- `DELETE /gamingCenters/{gamingCenterId}/stations/{stationId}`

To avoid guess-routing, station editing/deletion operations are deferred until backend endpoints are officially specified.

---

## 3. Media Management API (`/gamingCenters/{gamingCenterId}/media`)

### Current OpenAPI Specification
- **Upload Endpoint:** `POST /gamingCenters/{gamingCenterId}/media/upload`
  - **Content-Type:** `multipart/form-data`
  - **Fields:**
    - `file` (binary, required)
    - `purpose` (string enum: `COVER`, `GALLERY`, `STATION`, `LOGO`, optional)
    - `altText` (string, optional)
  - **Response:** `201 Created` with `Success` containing `{ id, url, altText, purpose }`.
- **Public Fetch:** `GET /public/gamingCenters/{gamingCenterSlug}/media`
  - **Response:** `200 OK` with list of media items.

### Missing Operation: Media Deletion
The OpenAPI does not specify an endpoint for deleting uploaded images:
- The frontend previously guessed `DELETE /gamingCenters/{gamingCenterId}/media/upload/{mediaId}`, which does not exist and yields HTTP errors (404/405).

### Requested Backend Endpoint for Media Deletion
* **Endpoint:** `DELETE /gamingCenters/{gamingCenterId}/media/{mediaId}`
* **Tags:** `CMS` / `Media`
* **Security:** `bearerAuth`
* **Response:**
  - `200 OK` (or `204 No Content`)
```json
{
  "success": true,
  "message": "تصویر با موفقیت حذف شد."
}
```
* **Frontend Handling:** Until this endpoint is confirmed by the backend, the frontend will not issue invalid DELETE requests to guessed URLs.
