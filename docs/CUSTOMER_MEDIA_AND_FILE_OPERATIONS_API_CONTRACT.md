# Backend Contract & Authorization Gap Report: Customer Media and File Operations (Phase 20)

## 1. Executive Summary

This document specifies the backend contract integration, security constraints, validation limits, upload parameters, and contract gaps for **Customer Media and File Operations (Phase 20)** against the locked OpenAPI v1.0 specification (`openapi.json` / `public/context/openapi-yaml.md`).

A comprehensive audit of the OpenAPI specification confirms:
1. **Documented Customer File Upload**:
   - `POST /tickets/{ticketId}/attachments` is the **only customer-scoped file upload endpoint** in OpenAPI v1.0-LOCKED.
   - Requires `bearerAuth` (Customer JWT).
   - Uses `multipart/form-data` with a single binary field: `file`.
   - Response envelope: `{ success: true, data: { url: string } }`.
2. **Documented Public Media Retrieval**:
   - `GET /public/gamingCenters/{gamingCenterSlug}/media` returns the list of public media assets registered for a gaming center.
3. **Contract Gaps for Customer Media Operations**:
   - **Customer File Deletion**: There is **no endpoint** (`DELETE /tickets/{ticketId}/attachments/{id}` or `DELETE /media/{id}`) allowing a customer to delete an uploaded file.
   - **Customer Avatar/Profile Image**: OpenAPI v1.0-LOCKED schema `Customer` contains only `{ id, phone, fullName, phoneVerifiedAt }`. There is no `avatarUrl` field or `POST /customer/me/avatar` endpoint.
   - **Review Media**: `POST /customer/reservation/{reservationId}/ratings` accepts only `{ rating: integer (1..5), comment?: string }`. Uploading photos/media with customer reviews is not supported.
   - **Reservation Attachments**: There is no endpoint for attaching media/documents to a customer reservation.
4. **Security, Credentials & Privacy**:
   - Storage credentials (S3 keys, bucket secrets, API keys) must **never** be exposed in browser bundles.
   - In browser environments, requests route via the local Next.js proxy (`/api/proxy`), injecting the private API key server-side.
   - Customer identity is strictly derived from the validated `Bearer <token>` in the Authorization header.
   - No mock URLs or simulated upload persistence are allowed. Completion is shown only upon a valid HTTP 200 response from the server containing the authentic file URL.

---

## 2. API Contract Specification (OpenAPI v1.0-LOCKED)

### 2.1 Documented Endpoints Matrix

| Operation | Method | Path | Security | Request Body | Response Envelope | OperationId |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Upload Ticket Attachment** | `POST` | `/tickets/{ticketId}/attachments` | `bearerAuth` | `multipart/form-data`<br>`file: binary (required)` | `{ success: true, data: { url: string } }` | `post_tickets_ticketId_attachments` |
| **Get Public Media** | `GET` | `/public/gamingCenters/{gamingCenterSlug}/media` | None (Public) | None | `Success` (`{ success: true, data: PublicMediaItem[] }`) | `get_public_gamingCenters_gamingCenterSlug_media` |

---

### 2.2 Schema Definitions

#### `POST /tickets/{ticketId}/attachments` Request Schema
```yaml
requestBody:
  required: true
  content:
    multipart/form-data:
      schema:
        type: object
        required:
          - file
        properties:
          file:
            type: string
            format: binary
```

#### `POST /tickets/{ticketId}/attachments` Response Schema
```yaml
responses:
  "200":
    description: Upload successful
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
                url:
                  type: string
```

---

## 3. Validation Invariants & File Limits

1. **Allowed File Types**:
   - Supported ticket attachment MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`, `text/plain`.
   - Client pre-validates files before transmission to avoid unnecessary bandwidth usage.
2. **File Size Limits**:
   - Default threshold: 10 MB (`10 * 1024 * 1024` bytes).
   - Client rejects oversized files immediately with user-friendly Persian error messages.
3. **Empty or Missing File Handling**:
   - Calling upload with null or empty selection throws an error before network dispatch.
4. **Valid Ticket Scoping**:
   - Ticket ID is mandatory in the path `/tickets/{ticketId}/attachments`.

---

## 4. Contract Gaps & Explicit Error Enforcement

The following operations are **not present** in the locked OpenAPI specification:

| Feature / Operation | Attempted Action | Status in OpenAPI v1.0-LOCKED | Enforcement Policy |
| :--- | :--- | :--- | :--- |
| **Customer File Deletion** | `DELETE /tickets/{ticketId}/attachments/{id}` or `DELETE /media/{id}` | **Absent from OpenAPI** | Throws `ContractGapError("CustomerFileDelete", ...)` |
| **Customer Profile Avatar** | `POST /customer/me/avatar` | **Absent from OpenAPI** | Throws `ContractGapError("CustomerAvatarUpload", ...)` |
| **Review Media Attachments** | `POST /customer/reservation/{id}/ratings/media` | **Absent from OpenAPI** | Throws `ContractGapError("CustomerReviewMedia", ...)` |
| **Reservation Media Attachments** | `POST /customer/reservation/{id}/media` | **Absent from OpenAPI** | Throws `ContractGapError("CustomerReservationMedia", ...)` |

---

## 5. Security & Storage Risks Analysis

1. **Storage Access Keys**:
   - Object storage credentials (e.g. MinIO, AWS S3, Cloudflare R2 access keys) must reside exclusively on the upstream server or Next.js server proxy.
   - Client-side code only receives public CDN or storage URLs returned in `{ data: { url: string } }`.
2. **MIME Sniffing & Executable Prevention**:
   - Client enforces allowed MIME types. Upstream backend must validate `magic bytes` and serve uploaded files with `Content-Disposition: inline` or `attachment` and `X-Content-Type-Options: nosniff`.
3. **Authorization & Tenant Isolation**:
   - Ticket attachments are scoped to the authenticated customer's own tickets (`bearerAuth`).
   - The backend validates that the requesting user owns `ticketId` before accepting attachment uploads.
4. **No Synthesized / Fake URLs**:
   - The frontend never simulates upload completion with mock data (e.g., `blob:http://...` or `https://mock.cdn/...`).
   - The UI shows completion only after receiving a genuine 200 OK containing the server-persisted URL.
