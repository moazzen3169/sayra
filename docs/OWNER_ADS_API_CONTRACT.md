# Owner Ads & Promotional Campaigns Backend Contract Specification

## Background & Current State
In the Owner panel (`/owner/ads`), owners can view and submit advertising campaigns (e.g., banner promotions in the main app slider).
The current Playenest / Sayra OpenAPI 3.0 specification (`public/context/openapi-yaml.md`) lacks dedicated endpoints for owner advertisement submissions and listing.
Previously, `/owner/ads` used static mock campaigns with a `setTimeout` handler simulating submission without persisting to the backend.

Per Phase 9 production readiness guidelines:
- No production feature may depend on fake in-memory stores, fake IDs, or setTimeout mocks.
- The UI structure and components remain intact.
- Features blocked by missing backend endpoints are reported as contract gaps and safely handled rather than fabricating operations.

---

## Required Endpoints for Owner Ads

### 1. List Gaming Center Ad Campaigns
* **Endpoint:** `GET /gamingCenters/{gamingCenterId}/ads`
* **Security:** Bearer JWT (`bearerAuth`), `ApiKeyAuth`

#### Response (`200 OK`):
```json
{
  "success": true,
  "data": [
    {
      "id": "ad_12345",
      "title": "بنر ویژه آخر هفته",
      "description": "نمایش در اسلایدر اصلی",
      "bannerUrl": "https://api.sayragame.ir/uploads/ads/banner1.jpg",
      "status": "ACTIVE | PENDING | EXPIRED",
      "daysLeft": 7,
      "createdAt": "2026-03-31T12:00:00.000Z"
    }
  ]
}
```

### 2. Create Ad Campaign Request
* **Endpoint:** `POST /gamingCenters/{gamingCenterId}/ads`
* **Security:** Bearer JWT (`bearerAuth`), `ApiKeyAuth`

#### Request Payload:
```json
{
  "title": "string (Required, 2-100 characters)",
  "description": "string (Required, 5-500 characters)",
  "bannerUrl": "string (Optional, valid URL)",
  "durationDays": 7
}
```

#### Response (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "ad_12345",
    "status": "PENDING"
  }
}
```
