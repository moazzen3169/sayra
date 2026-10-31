# Backend Contract Gap Report: Owner Reviews & Reply Integration (Phase 7A)

## 1. Overview
This document records backend contract gaps, schema discrepancies, and proposed OpenAPI extensions for the **Gaming Center Reviews and Owner Moderation / Reply API** (`/gamingCenters/{gamingCenterId}/ratings`).

---

## 2. API Contract Specification (OpenAPI v1.0-LOCKED)

The OpenAPI specification currently defines the following review-related endpoints:

### 2.1 Public Ratings Fetch
- **Endpoint:** `GET /public/gamingCenters/{gamingCenterSlug}/ratings`
- **Summary:** List public ratings
- **Tags:** `Public`
- **Security:** Public (no bearerAuth required)
- **Path Parameters:**
  - `gamingCenterSlug` (string, required)
- **Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "rating-uuid",
        "gamingCenterId": "gc-uuid",
        "reservationId": "res-uuid",
        "rating": 5,
        "comment": "سیستم‌ها فوق‌العاده بودند.",
        "status": "PUBLISHED"
      }
    ]
  }
  ```

### 2.2 Review Moderation (Status Update)
- **Endpoint:** `PATCH /gamingCenters/{gamingCenterId}/ratings/{id}/status`
- **Summary:** Moderate a review (status update)
- **Tags:** `Ratings`
- **Security:** `bearerAuth`
- **Path Parameters:**
  - `gamingCenterId` (string, required)
  - `id` (string, required): Rating ID
- **Request Body:**
  ```json
  {
    "status": "PUBLISHED | HIDDEN | DELETED"
  }
  ```
- **Response:** `200 OK` with `$ref: "#/components/schemas/Success"`.

---

## 3. Schema Comparison & Contract Gaps

### Documented `Rating` Schema vs Frontend Requirements:

| Field | OpenAPI `Rating` | Frontend UI Requirement | Status / Gap |
| :--- | :--- | :--- | :--- |
| `id` | `string` | `string` | Supported |
| `gamingCenterId` | `string` | `string` | Supported |
| `reservationId` | `string` | `string` | Supported |
| `rating` | `integer` (1-5) | `number` (1-5) | Supported |
| `comment` | `string` | `string` | Supported |
| `status` | `enum: [PUBLISHED, HIDDEN, DELETED]` | `enum: [PUBLISHED, HIDDEN, DELETED]` | Supported |
| `customerName` | **Missing** | `string` (e.g., "علیرضا احمدی") | **Backend Gap**: `Rating` schema omits author/customer display name or profile relation. |
| `createdAt` | **Missing** | `string` (ISO 8601 date-time) | **Backend Gap**: `Rating` schema omits creation timestamp. |
| `reply` | **Missing** | `string` (Owner response text) | **CRITICAL CONTRACT GAP**: Neither `Rating` schema nor any API endpoint defines Owner reply. |
| `repliedAt` | **Missing** | `string` (ISO 8601 date-time) | **Backend Gap**: Timestamp of Owner reply. |

---

## 4. Owner Reply Operation Gap

### Current State
- The frontend UI displays an Owner reply block (`پاسخ شما (مدیر گیمنت)`) and an interactive reply submission / edit form (`پاسخ به نظر` / `ویرایش پاسخ`).
- In OpenAPI v1.0-LOCKED, **no endpoint exists** for creating or updating owner replies.
- The previous frontend code attempted to send a request to a guessed endpoint:
  `POST /gamingCenters/{gamingCenterId}/ratings/{id}/status/reply`
  This URL violates the API specification, is not recognized by the backend router, and produces `404 Not Found`.

### Frontend Interim Handling
In accordance with Phase 7A requirements:
- The frontend will **NOT** call guessed endpoints like `/reply`.
- The frontend will **NOT** simulate fake successful replies in production or default modes.
- The frontend UI is fully preserved so that once the backend implements this endpoint, the UI can immediately persist replies.
- When an owner attempts to submit a reply before backend support is deployed, the application will display an informative error indicating that the reply operation is pending backend implementation.

---

## 5. Requested Backend Extensions

To support the complete review management workflow and owner feedback loop, the backend OpenAPI specification should be extended with:

### 5.1 New Endpoint: Owner Reply to Review
* **Endpoint:** `POST /gamingCenters/{gamingCenterId}/ratings/{id}/reply` (or `PUT /gamingCenters/{gamingCenterId}/ratings/{id}/reply`)
* **Tags:** `Ratings`
* **Security:** `bearerAuth`
* **Path Parameters:**
  - `gamingCenterId` (string, required)
  - `id` (string, required): The rating ID
* **Request Body:**
  ```json
  {
    "reply": "string (required, 1-1000 characters)"
  }
  ```
* **Response:** `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "id": "rating-uuid",
      "reply": "سپاس از نظر ارزشمند شما، خوشحالیم که تجربه خوبی داشتید.",
      "repliedAt": "2026-04-01T15:30:00.000Z"
    },
    "message": "پاسخ با موفقیت ثبت شد."
  }
  ```

### 5.2 Schema Update: Extended `Rating`
```yaml
components:
  schemas:
    Rating:
      type: object
      required:
        - id
        - gamingCenterId
        - rating
      properties:
        id:
          type: string
        gamingCenterId:
          type: string
        reservationId:
          type: string
        rating:
          type: integer
          minimum: 1
          maximum: 5
        comment:
          type: string
        customerName:
          type: string
          nullable: true
          description: Public display name of the customer
        status:
          type: string
          enum: [PUBLISHED, HIDDEN, DELETED]
        reply:
          type: string
          nullable: true
          description: Official response by the gaming center owner/manager
        repliedAt:
          type: string
          format: date-time
          nullable: true
        createdAt:
          type: string
          format: date-time
```
