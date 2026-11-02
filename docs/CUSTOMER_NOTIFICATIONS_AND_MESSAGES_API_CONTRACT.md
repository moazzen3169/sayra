# Backend Contract & Authorization Gap Report: Customer Notifications and Messages (Phase 19)

## 1. Executive Summary

This document specifies the backend contract integration, identity resolution, notification lifecycle, error recovery, unread count semantics, and explicit contract gaps for **Customer Notifications and Messages (Phase 19)** against the locked OpenAPI v1.0 specification (`openapi.json` / `public/context/openapi-yaml.md`).

A comprehensive audit of the OpenAPI specification confirms:
1. **Notifications Listing & Filtering**:
   - `GET /notifications` provides a paginated list of notifications (`Notification` schema) for the authenticated user (`bearerAuth`).
   - Query parameters supported: `page` (integer), `pageSize` (integer), and `isRead` (boolean).
2. **Unread Count**:
   - `GET /notifications/unread-count` returns the total number of unread notifications for the authenticated user (`bearerAuth`).
   - Returns a `Success` response envelope containing `{ success: true, data: { count: number } }` or raw number.
3. **Marking Notification as Read**:
   - `PATCH /notifications/{id}/read` marks a specific notification as read (`bearerAuth`).
4. **Missing Customer Operations (Contract Gaps)**:
   - **Bulk Mark-All-As-Read**: There is no endpoint (`POST/PATCH /notifications/mark-all-read` or similar) in OpenAPI v1.0-LOCKED. Mark-read must be invoked per notification or documented as a gap.
   - **Notification Deletion**: There is no endpoint (`DELETE /notifications/{id}` or `DELETE /notifications`) to delete notifications.
   - **Direct User-to-User or Center-to-User Chat/Messaging**: No direct customer messaging inbox or chat system exists in OpenAPI v1.0-LOCKED. (Customer support communication is strictly handled via `/tickets/*`).
   - **Real-Time Push / WebSocket / SSE**: The OpenAPI contract specifies no WebSocket or Server-Sent Events (SSE) streaming endpoint for notifications. Real-time push delivery is not claimed or simulated.
5. **No Fake/Fabricated Notifications**:
   - All hardcoded mock notifications (`DEFAULT_NOTIFICATIONS`) and hardcoded badge counts (`unreadNotificationsCount = 2`) are eliminated.
   - Notifications and unread counts are strictly fetched from backend APIs for authenticated users.

---

## 2. API Contract Specification (OpenAPI v1.0-LOCKED)

### 2.1 Documented Endpoints Matrix

| Operation | Method | Path | Security | Request Body | Query Params | Response Envelope | OperationId |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **List Notifications** | `GET` | `/notifications` | `bearerAuth` | None | `page?: number`<br>`pageSize?: number`<br>`isRead?: boolean` | `{ success: true, data: Notification[], meta?: Meta }` | `get_notifications` |
| **Get Unread Count** | `GET` | `/notifications/unread-count` | `bearerAuth` | None | None | `{ success: true, data: { count: number } }` | `get_notifications_unread-count` |
| **Mark as Read** | `PATCH` | `/notifications/{id}/read` | `bearerAuth` | None | Path: `id: string` | `Success` (`200 OK`) | `patch_notifications_id_read` |

---

### 2.2 Schema Definitions

#### `Notification` (OpenAPI components.schemas.Notification)
```yaml
Notification:
  type: object
  properties:
    id:
      type: string
    userId:
      type: string
    type:
      type: string
      enum:
        - RESERVATION_CREATED
        - RESERVATION_CONFIRMED
        - RESERVATION_REJECTED
        - RESERVATION_CANCELLED
        - RESERVATION_TIME_PROPOSED
    title:
      type: string
    message:
      type: string
    isRead:
      type: boolean
    metadata:
      type: object
      nullable: true
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

#### Pagination Metadata Envelope (`Meta`)
```yaml
Meta:
  type: object
  properties:
    requestId:
      type: string
    pagination:
      type: object
      properties:
        totalItems:
          type: integer
        page:
          type: integer
        pageSize:
          type: integer
        limit:
          type: integer
        total:
          type: integer
        totalPages:
          type: integer
```

---

## 3. Contract Gaps & Explicit Error Handling

The following table summarizes operations not supported in the locked OpenAPI v1.0 specification:

| Feature / Operation | Attempted Path / Method | Status in OpenAPI v1.0-LOCKED | Enforcement Policy |
| :--- | :--- | :--- | :--- |
| **Bulk Mark All Read** | `PATCH /notifications/read-all` or `POST /notifications/bulk-read` | **Absent from OpenAPI** | Handled gracefully: sequentially mark items as read or throw `ContractGapError` |
| **Notification Deletion** | `DELETE /notifications/{id}` | **Absent from OpenAPI** | Throws `ContractGapError("NotificationDelete", ...)` |
| **Direct Chat / Messaging Inbox** | `GET /messages` or `POST /messages` | **Absent from OpenAPI** | Throws `ContractGapError("DirectMessaging", ...)` (Tickets used instead) |
| **Real-Time Push / SSE** | `GET /notifications/stream` | **Absent from OpenAPI** | Explicit contract gap: polling/push not fabricated |

---

## 4. UI Presentation & Integration Guidelines

1. **Relative Timestamp Formatting**:
   - Backend `createdAt` timestamps are ISO 8601 UTC strings.
   - Converted to localized relative Persian descriptions (e.g., "هم‌اکنون", "X دقیقه پیش", "X ساعت پیش", "دیروز", "X روز پیش") without modifying stored data.
2. **Read Status & Filtering**:
   - `activeFilter === "all"` shows all notifications.
   - `activeFilter === "unread"` filters notifications where `isRead === false`.
   - Clicking an unread notification triggers `customerNotificationService.markAsRead(id)` and updates UI state.
3. **Empty & Error States**:
   - Unauthenticated state: Shows clean empty state prompting login, without errors or fake notifications.
   - Empty state: Displays existing empty illustration when notification count is 0.
   - Loading state: Shows skeleton cards while fetching.
   - Error state: Displays user-friendly error message with retry button.
