# Owner Verification Backend API Contract Specification

## Background & Current State
Currently, the frontend collects owner verification documents (owner national ID, gaming center business license file, center name, and address) in the Owner Dashboard (`/owner`).
In the initial client mockup, verification submissions were persisted to client-side `localStorage` (`sayra_owner_verification`).
The existing Playenest / Sayra OpenAPI 3.0 specification (`public/context/openapi-yaml.md`) currently does not define dedicated owner verification endpoints or schema fields on `User` / `/auth/me`.

Per Phase 2 Task 5 requirements:
- Do not treat `localStorage` as permanent verification storage.
- Keep the existing UI unchanged without simulating fake successful submissions.
- Document the exact backend endpoints, request payloads, and response schemas required.
- Implement integration only after the backend contract is deployed.

---

## Required Verification API Endpoints

### 1. Submit Verification Request
* **Endpoint:** `POST /owner/verification`
* **Security:** Bearer JWT (`bearerAuth`), `ApiKeyAuth`
* **Content-Type:** `multipart/form-data` or `application/json` (with prior media upload)

#### Request Payload (`multipart/form-data`):
```json
{
  "ownerName": "String (Required, 2-100 characters)",
  "nationalId": "String (Required, 10-digit Iranian national ID)",
  "centerName": "String (Required, 2-150 characters)",
  "centerAddress": "String (Required, 5-500 characters)",
  "licenseFile": "File (Binary, Required, image/jpeg, image/png, or application/pdf, max 10MB)"
}
```

#### Response Payload (`201 Created`):
```json
{
  "success": true,
  "data": {
    "id": "verif_cm789012345",
    "status": "PENDING",
    "ownerName": "string",
    "nationalId": "string",
    "centerName": "string",
    "centerAddress": "string",
    "licenseFileUrl": "https://api.sayragame.ir/uploads/licenses/...",
    "submittedAt": "2026-03-30T10:00:00.000Z",
    "reviewedAt": null,
    "rejectionReason": null
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

#### Error Responses:
* `400 Bad Request` (`VALIDATION_ERROR`): Missing required fields or invalid Iranian national ID.
* `401 Unauthorized` (`UNAUTHORIZED`): Expired or invalid Bearer token.
* `403 Forbidden` (`FORBIDDEN`): Current user does not hold an owner/manager role.
* `409 Conflict` (`CONFLICT`): An active verification request is already in `PENDING` or `APPROVED` status.

---

### 2. Get Current Verification Status
* **Endpoint:** `GET /owner/verification/status`
* **Security:** Bearer JWT (`bearerAuth`)

#### Response Payload (`200 OK`):
```json
{
  "success": true,
  "data": {
    "status": "NOT_SUBMITTED | PENDING | APPROVED | REJECTED",
    "submittedAt": "2026-03-30T10:00:00.000Z",
    "reviewedAt": "2026-03-30T14:00:00.000Z",
    "rejectionReason": "string | null",
    "verificationData": {
      "ownerName": "string",
      "nationalId": "string",
      "centerName": "string",
      "centerAddress": "string",
      "licenseFileUrl": "string"
    }
  },
  "meta": {
    "requestId": "req_abc123"
  }
}
```

---

### 3. Updates to `/auth/me` OpenAPI Response
Alternatively or in conjunction with `GET /owner/verification/status`, `/auth/me` should return:
```json
{
  "success": true,
  "data": {
    "id": "usr_123",
    "phone": "09123456789",
    "fullName": "علیرضا رضایی",
    "role": "MANAGER",
    "isActive": true,
    "verificationStatus": "APPROVED",
    "gamingCenters": [
      {
        "id": "gc_001",
        "name": "گیمنت گرگدن",
        "slug": "gergdan",
        "isActive": true
      }
    ]
  }
}
```
