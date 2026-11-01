# Backend Contract & Authorization Report: Owner Support and Ticket Integration (Phase 7B)

## 1. Executive Summary

This document specifies the backend contract, authorization semantics, and operational flow for the **Support and Ticket Management System** across customer and owner personas in Sayra.

In Phase 7B, the support workflow is integrated directly with the backend API (`/tickets`), eliminating all mock stores and simulated conversations.

---

## 2. OpenAPI Specification Review (v1.0-LOCKED)

The OpenAPI contract defines three sets of ticket endpoints:

1. **User / Requester Endpoints (`/tickets`):**
   - Tagged as `Tickets`.
   - Security: `bearerAuth` required.
   - Summaries describe them as "(Customer)" operations, referring to the end-user side of the support ticketing desk (in contrast to `/support/*` and `/admin/*` operations).
   - Endpoints:
     - `GET /tickets` - List own tickets
     - `POST /tickets` - Create a new ticket (`subject`, `message`, `category`, `priority`)
     - `GET /tickets/{ticketId}` - Get ticket details and conversation thread
     - `POST /tickets/{ticketId}/messages` - Append message to ticket thread (`text`, optional `attachment`)
     - `POST /tickets/{ticketId}/attachments` - Upload attachment file (`multipart/form-data` with `file`)
2. **Support Agent Operations (`/support/tickets`):**
   - For internal support personnel to inspect assigned tickets, reply, update status, and assign.
3. **Admin Operations (`/admin/tickets`):**
   - For system administrators to view all platform tickets, reassign, and view statistics.

---

## 3. Authorization Analysis: Customer vs Owner

### 3.1 Authenticated Owner Permissions
- The OpenAPI specification does not define a separate `/owner/tickets` or `/gamingCenters/{id}/tickets` route namespace.
- Authentication in Sayra is token-based (`bearerAuth`). Both customers and owners authenticate and hold JWT bearer tokens issued via the auth service.
- The `/tickets` endpoints operate in the context of the authenticated requester identity (`bearerAuth`).
- In the frontend architecture:
  - Navigating to `/owner/support` redirects directly to `/support`, sharing the unified support portal.
  - When an owner is logged in with an active access token, requests to `/tickets` carry the owner's `Authorization: Bearer <token>` header.
  - The backend resolves the user's tickets based on their authenticated account identity.

### 3.2 Authorization Enforcement & Contract Guardrails
- **Do not bypass role authorization:** The frontend strictly uses standard authenticated `apiClient` requests containing the user's active bearer token. No roles or user IDs are spoofed.
- **Handling 401 Unauthorized:** If the user is unauthenticated or the session has expired, the client attempts refresh via `/auth/refresh` exactly once. If unauthenticated, `401 UNAUTHORIZED` is returned and an informative message prompts the user to log in.
- **Handling 403 Forbidden:** If the backend restricts `/tickets` strictly to non-owner roles (or requires a dedicated owner ticket endpoint), the frontend propagates `403 FORBIDDEN` ("دسترسی غیرمجاز. شما به این بخش دسترسی ندارید.") without falling back to mock tickets or fabricating fake data.
- **Backend Extension Notice:** If the backend team decides to introduce gaming-center-scoped support tickets (e.g., `GET /gamingCenters/{gamingCenterId}/tickets` or dedicated category scopes), the endpoints will be updated accordingly.

---

## 4. Endpoints & Payload Specifications

### 4.1 List Own Tickets
- **Method & Path:** `GET /tickets`
- **Headers:** `Authorization: Bearer <token>`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "t-101",
        "customerAccountId": "user-uuid",
        "subject": "سوال درباره نحوه تسویه حساب",
        "category": "FINANCIAL",
        "priority": "HIGH",
        "status": "OPEN",
        "createdAt": "2026-04-01T10:00:00.000Z",
        "updatedAt": "2026-04-01T10:00:00.000Z"
      }
    ]
  }
  ```

### 4.2 Create Ticket
- **Method & Path:** `POST /tickets`
- **Request Body:**
  ```json
  {
    "subject": "سوال درباره نحوه تسویه حساب",
    "message": "سلام، درخواست‌های برداشت موجودی پس از چند ساعت به حساب واریز می‌شوند؟",
    "category": "FINANCIAL",
    "priority": "MEDIUM"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Ticket created"
  }
  ```

### 4.3 Get Ticket Details
- **Method & Path:** `GET /tickets/{ticketId}`
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "id": "t-101",
      "subject": "سوال درباره نحوه تسویه حساب",
      "category": "FINANCIAL",
      "priority": "MEDIUM",
      "status": "ANSWERED",
      "createdAt": "2026-04-01T10:00:00.000Z",
      "messages": [
        {
          "id": "tm-1",
          "ticketId": "t-101",
          "senderType": "USER",
          "text": "سلام، درخواست‌های برداشت کی واریز می‌شود؟",
          "createdAt": "2026-04-01T10:00:00.000Z"
        },
        {
          "id": "tm-2",
          "ticketId": "t-101",
          "senderType": "SUPPORT",
          "text": "سلام، حداکثر تا ۲۴ ساعت کاری پایا.",
          "createdAt": "2026-04-01T11:00:00.000Z"
        }
      ]
    }
  }
  ```

### 4.4 Send Ticket Message
- **Method & Path:** `POST /tickets/{ticketId}/messages`
- **Request Body:**
  ```json
  {
    "text": "متن پیام پاسخ",
    "attachment": "https://cdn.sayra.ir/uploads/ticket-101-doc.pdf"
  }
  ```
- **Response `201 Created`:**
  ```json
  {
    "success": true,
    "message": "Message added"
  }
  ```

### 4.5 Upload Ticket Attachment
- **Method & Path:** `POST /tickets/{ticketId}/attachments`
- **Content-Type:** `multipart/form-data`
- **Form Field:** `file` (binary)
- **Response `200 OK`:**
  ```json
  {
    "success": true,
    "data": {
      "url": "https://cdn.sayra.ir/uploads/ticket-101-doc.pdf"
    }
  }
  ```
  *(Note: The actual returned URL is extracted from `data.url` or `data` string).*
