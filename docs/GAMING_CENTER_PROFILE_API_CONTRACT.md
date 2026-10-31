# Backend Contract Gap Report: Gaming Center Profile Update

## 1. Executive Summary
The Playenest / Sayra backend OpenAPI 3.0 specification (`public/context/openapi-yaml.md`) provides operational settings update via:
- `GET /gamingCenters/{gamingCenterId}/settings`
- `PUT /gamingCenters/{gamingCenterId}/settings`

However, the current `Settings` schema strictly allows only operational/scheduling flags:
```json
{
  "timeZone": "string",
  "workStartTime": "string",
  "workEndTime": "string",
  "allowOnlineBooking": "boolean",
  "onlineBookingAutoConfirm": "boolean",
  "preventOverlaps": "boolean"
}
```

The OpenAPI specification currently lacks administrative and tenant-level endpoints to update core gaming center profile attributes, specifically:
1. Center Name (`name`)
2. Center Description and Street Address (`description`, `address`)
3. Supported Games Catalog / Tags (`supportedGames` or game associations)
4. Geographic Coordinates (`latitude`, `longitude` / GeoJSON point)

Per Phase 3 specifications:
- The frontend must never send unsupported fields to the `/settings` endpoint.
- Server-owned data must not be persisted only in `localStorage`.
- The user interface must accurately inform the user which fields are persisted on the backend (e.g. online booking & auto-confirm settings) versus fields awaiting backend profile update endpoint implementation.

---

## 2. Proposed Specification for Gaming Center Profile Update

### Endpoint: `PATCH /gamingCenters/{gamingCenterId}` (or `PUT /gamingCenters/{gamingCenterId}`)
* **Tags:** `GamingCenters`
* **Security:** Bearer JWT (`bearerAuth`), `ApiKeyAuth`
* **Role Requirement:** `MANAGER`, `SUPERVISOR`, or `ADMIN`

#### Request Body (`application/json`):
```json
{
  "name": "string (optional, 2-100 characters)",
  "description": "string (optional, 5-1000 characters)",
  "address": "string (optional, 5-500 characters)",
  "coordinates": {
    "latitude": 38.080000,
    "longitude": 46.290000
  },
  "supportedGames": [
    "EA Sports FC 25",
    "Call of Duty: Modern Warfare III",
    "GTA V",
    "Mortal Kombat 1"
  ]
}
```

#### Response Payload (`200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "gc_001",
    "name": "گیمنت گرگدن",
    "slug": "gergdan",
    "description": "تبریز، ولیعصر، خیابان قانون، مجتمع گرگدن",
    "address": "تبریز، ولیعصر، خیابان قانون، مجتمع گرگدن",
    "coordinates": {
      "latitude": 38.08,
      "longitude": 46.29
    },
    "supportedGames": [
      "EA Sports FC 25",
      "Call of Duty: Modern Warfare III",
      "GTA V",
      "Mortal Kombat 1"
    ],
    "isActive": true,
    "updatedAt": "2026-03-31T12:00:00.000Z"
  },
  "meta": {
    "requestId": "req_update_gc_01"
  }
}
```

#### Error Codes:
* `400 Bad Request` (`VALIDATION_ERROR`): Invalid coordinates or empty center name.
* `401 Unauthorized` (`UNAUTHORIZED`): Expired or missing authentication token.
* `403 Forbidden` (`FORBIDDEN`): User does not have management access to this gaming center.
* `404 Not Found` (`NOT_FOUND`): `gamingCenterId` not found.

---

## 3. Alternative/Complementary Address Endpoint
If address and coordinates belong to the multi-address collection:
* **Current Public Route:** `GET /public/gamingCenters/{gamingCenterSlug}/addresses`
* **Proposed Management Routes:**
  * `POST /gamingCenters/{gamingCenterId}/addresses`
  * `PUT /gamingCenters/{gamingCenterId}/addresses/{addressId}`
  * `DELETE /gamingCenters/{gamingCenterId}/addresses/{addressId}`
