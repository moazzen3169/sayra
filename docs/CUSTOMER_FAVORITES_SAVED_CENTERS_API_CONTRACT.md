# Backend Contract & Authorization Gap Report: Customer Favorites and Saved Gaming Centers (Phase 17)

## 1. Executive Summary

This document analyzes and specifies the backend contract gaps, authenticated identity rules, required operations, and security constraints for **Customer Favorites and Saved Gaming Centers (Phase 17)** against the locked OpenAPI v1.0 specification (`public/context/openapi-yaml.md` / `openapi.json`).

A complete audit of `openapi.json` (198 paths, 26 tags) confirms that:
1. **Zero operations** exist in OpenAPI v1.0-LOCKED for customer favorites, bookmarks, saved gaming centers, or wishlists.
2. The `Customer` schema (`id`, `phone`, `fullName`, `phoneVerifiedAt`) does not define any relation, array, or identifier collection for saved centers or favorites.
3. Neither public nor authenticated customer endpoints provide endpoints to list, add, remove, or toggle favorite gaming centers.

In accordance with Phase 17 architectural requirements:
- **No fake runtime persistence**: Favorites are **NOT** stored in `localStorage` or in-memory stores disguised as server-saved data.
- **Strict Contract Gap Enforcement**: Any attempt to invoke customer favorite or saved center operations throws an explicit `ContractGapError`.
- **UI Preservation**: Existing UI controls and layouts are preserved without regressions or simulated server persistence.
- **Contract Gap Documentation**: The gap is thoroughly documented herein, defining the recommended future API specification when backend support is introduced.

---

## 2. API Contract Investigation: Locked OpenAPI Specification

### 2.1 Exhaustive Path & Tag Search
An automated scan of all 198 endpoints in OpenAPI v1.0-LOCKED using keywords `favorite`, `favourite`, `saved`, `bookmark`, `wishlist`, and `like` revealed:
- `GET /customer/*`: Only covers `/customer/me`, `/customer/reservation/*`, and `/customer/waitlist/*`.
- `POST /customer/*`: Only covers `/customer/reservation/*` mutations and `/customer/waitlist/*` actions.
- `GET /public/gamingCenters/*`: Only covers `/{slug}`, `/addresses`, `/analytics/events`, `/availability/slots`, `/blog/*`, `/links`, `/media`, `/pages/*`, `/ratings`, `/reservation`, `/stations`, and `/waitlist`.
- `POST /gamingCenters/{id}/blog/reactions/toggle`: Pertains strictly to blog post article emoji reactions, unrelated to customer favorite gaming centers.

### 2.2 Schemas & Data Model
- The OpenAPI `Customer` schema is strictly defined as:
  ```yaml
  Customer:
    type: object
    properties:
      id:
        type: string
      phone:
        type: string
      fullName:
        type: string
      phoneVerifiedAt:
        type: string
        format: date-time
  ```
- No `favoriteGamingCenterIds`, `savedCenters`, or related collection fields exist in any schema in `openapi.json`.

---

## 3. Contract Gaps & Missing Operations

| Operation | Expected Endpoint | Status in OpenAPI v1.0-LOCKED | Frontend Action |
| :--- | :--- | :--- | :--- |
| **List Saved Centers** | `GET /customer/favorites` | **Missing / Undefined** | Reject with `ContractGapError` |
| **Add Center to Favorites** | `POST /customer/favorites` | **Missing / Undefined** | Reject with `ContractGapError` |
| **Remove Center from Favorites** | `DELETE /customer/favorites/{gamingCenterId}` | **Missing / Undefined** | Reject with `ContractGapError` |
| **Check Center Favorite Status** | `GET /customer/favorites/{gamingCenterId}` | **Missing / Undefined** | Reject with `ContractGapError` |

### 3.1 Strict Prohibition of False Persistence
To maintain security, data integrity, and compliance with the project guidelines:
1. **No `localStorage` Substitution**: Storing favorite center IDs in browser `localStorage` and presenting them as "saved to account" is strictly forbidden. Users accessing their account across multiple devices (mobile, desktop, app) expect server-backed synchronization; client-only storage would cause silent data drift and phantom states.
2. **No Mock/In-Memory Stores**: In-memory stores with `setTimeout` simulation are prohibited in production runtime.
3. **Optimistic UI Constraints**: Favorite state must **only** be presented as server-backed when backed by a verified HTTP 200/201 response from an authentic backend service.

---

## 4. Proposed Future Backend Specification

When the backend team implements Customer Favorites and Saved Gaming Centers, the following contract is recommended:

### 4.1 Endpoints Specification

#### 1. List Customer Favorite Gaming Centers
- **Path**: `GET /customer/favorites`
- **Security**: `bearerAuth` (Authenticated Customer)
- **Query Parameters**:
  - `page` (integer, default: 1)
  - `pageSize` (integer, default: 20)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "fav-uuid-1",
        "gamingCenterId": "gc-uuid-101",
        "gamingCenter": {
          "id": "gc-uuid-101",
          "name": "اینفینیتی گیم نت",
          "slug": "infinity-game-net",
          "coverImageUrl": "https://...",
          "rating": 4.8,
          "reviewsCount": 120,
          "city": "تبریز",
          "hourlyPrice": 50000
        },
        "createdAt": "2026-03-01T10:00:00.000Z"
      }
    ],
    "meta": {
      "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 1,
        "totalPages": 1
      }
    }
  }
  ```

#### 2. Add Gaming Center to Favorites
- **Path**: `POST /customer/favorites`
- **Security**: `bearerAuth` (Authenticated Customer)
- **Request Body**:
  ```json
  {
    "gamingCenterId": "gc-uuid-101"
  }
  ```
- **Responses**:
  - `201 Created`: Added successfully.
  - `401 Unauthorized`: Unauthenticated request.
  - `404 Not Found`: Gaming center does not exist or is inactive.
  - `409 Conflict`: Gaming center is already in customer favorites.

#### 3. Remove Gaming Center from Favorites
- **Path**: `DELETE /customer/favorites/{gamingCenterId}`
- **Security**: `bearerAuth` (Authenticated Customer)
- **Responses**:
  - `200 OK` / `204 No Content`: Removed successfully.
  - `401 Unauthorized`: Unauthenticated request.
  - `404 Not Found`: Gaming center is not in customer favorites.

#### 4. Check Favorite Status
- **Path**: `GET /customer/favorites/{gamingCenterId}/status`
- **Security**: `bearerAuth` (Authenticated Customer)
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "isFavorite": true,
      "favoritedAt": "2026-03-01T10:00:00.000Z"
    }
  }
  ```

---

## 5. Security & Authorization Requirements

1. **Server-Derived Customer Identity**:
   - The customer ID must be derived exclusively from the validated `Bearer <accessToken>` JWT header.
   - The API must **never** accept or trust client-supplied customer IDs in the request body, path, or query parameters.
2. **Customer Isolation**:
   - Customer A must never be able to view, add, or delete items in Customer B's favorites collection.
   - Any attempt to access or modify favorites without a valid customer Bearer token must return `401 Unauthorized`.
3. **Token Refresh Lifecycle**:
   - Upon encountering `401 Unauthorized`, `apiClient` attempts token refresh once via `POST /auth/refresh`.
   - If token refresh fails, tokens are cleared and the client transitions to an unauthenticated state without exposing stale favorite collections.

---

## 6. Frontend Service Implementation

The frontend service `customerFavoriteService` (`src/services/customerFavoriteService.ts`) is designed to:
- Declare standard methods: `listFavorites`, `addFavorite`, `removeFavorite`, `isFavorite`.
- Explicitly throw `ContractGapError` for all methods, citing the absence of operations in OpenAPI v1.0-LOCKED.
- Provide clear, actionable debugging context for developers.
- Maintain existing UI styling and interactions without regressions.
