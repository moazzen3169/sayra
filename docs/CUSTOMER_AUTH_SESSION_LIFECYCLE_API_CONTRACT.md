# Backend Contract & Authorization Gap Report: Customer Authentication & Session Lifecycle (Phase 16)

## 1. Overview & Architecture

This document specifies the backend contract gaps, authenticated identity rules, allowed operations, session lifecycle, and security model for **Customer Authentication and Session Lifecycle** against the locked OpenAPI v1.0 specification (`public/context/openapi-yaml.md`).

Customer authentication in Sayra is strictly passwordless OTP-based and isolated from Staff, Manager, and Owner authentication models.

---

## 2. Documented Customer Authentication Endpoints

The OpenAPI v1.0 specification defines the following endpoints for customer authentication and session management:

### 2.1 Customer OTP Request
- **Endpoint**: `POST /auth/customer/otp/request`
- **Request Body**:
  ```json
  {
    "phone": "09123456789"
  }
  ```
- **Response**: `{ "success": true, "data": { ... } }` (or `Success` schema)
- **Role & Scope**: Public endpoint; triggers SMS OTP delivery to customer mobile phone.

### 2.2 Customer OTP Verify
- **Endpoint**: `POST /auth/customer/otp/verify`
- **Request Body**:
  ```json
  {
    "phone": "09123456789",
    "code": "1234"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token",
      "user": {
        "id": "customer-id",
        "phone": "09123456789",
        "fullName": "نام کاربر"
      }
    }
  }
  ```

### 2.3 Token Refresh
- **Endpoint**: `POST /auth/refresh`
- **Request Body**:
  ```json
  {
    "refreshToken": "jwt-refresh-token"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "accessToken": "new-jwt-access-token"
    }
  }
  ```
- **Lifecycle Semantics**: Used transparently by `apiClient` upon receiving `401 Unauthorized` responses. Managed via an in-flight single-promise mutex to prevent race conditions from concurrent parallel requests.

### 2.4 User Logout
- **Endpoint**: `POST /auth/logout`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**:
  ```json
  {
    "success": true,
    "message": "Logged out successfully"
  }
  ```
- **Lifecycle Semantics**: Invalidates the server-side session. Local tokens (`sayra_access_token`, `sayra_refresh_token`, `sayra_user_auth`) are purged immediately (`clearTokens()`).

### 2.5 Current Customer Profile (`GET /customer/me`)
- **Endpoint**: `GET /customer/me`
- **Headers**: `Authorization: Bearer <accessToken>`
- **Response**:
  ```json
  {
    "success": true,
    "data": {
      "id": "customer-id",
      "phone": "09123456789",
      "fullName": "نام مشتری",
      "phoneVerifiedAt": "2026-01-01T00:00:00Z"
    }
  }
  ```
- **Identity Derivation**: Scoped strictly to the authenticated Bearer token. No client-supplied customer IDs or query parameters are accepted.

---

## 3. Customer Role vs. Staff/Manager/Owner Role Architecture

1. **Role Differentiation**:
   - In OpenAPI v1.0, the `User` schema enum defines:
     `["MANAGER", "SUPERVISOR", "STAFF", "TRAINEE", "SUPPORT", "ADMIN"]`.
   - Notice that `"CUSTOMER"` is **not** part of this internal staff enum.
   - Customers have their own dedicated schema: `Customer` (`id`, `phone`, `fullName`, `phoneVerifiedAt`).
   - Customers authenticate via `/auth/customer/otp/*`, whereas Staff/Managers authenticate via `/auth/user/otp/*` and `/auth/login` (password login with `gamingCenterId`).
2. **Endpoint Separation**:
   - `/auth/me` vs `/customer/me`:
     - Staff/Owners retrieve their identity and associated centers via `GET /auth/me`.
     - Customers retrieve their profile via `GET /customer/me`.
3. **No Cross-Role Leaks**:
   - Customer UI flows (`AuthModal`, `/profile`, `/reservations`) never query staff endpoints.
   - Staff credentials and center selection modals are strictly isolated in `OwnerAuthModal`.

---

## 4. Contract Gaps & Unsupported Operations

### 4.1 Customer Password Login (`POST /auth/customer/login` or password on `/auth/customer/*`)
- **Status in OpenAPI v1.0-LOCKED**: **Missing / Unsupported**.
- **Analysis**:
  - The only password login endpoint in the contract is `POST /auth/login`, which is strictly for administrative/staff users and requires a password.
  - Customers have no password field in their schema and authenticate solely through passwordless OTP (`POST /auth/customer/otp/request` & `verify`).
- **Enforcement**:
  - `authService.customerPasswordLoginUnsupported()` throws `ContractGapError`.
  - The UI presents OTP login/signup without password input fields for customers.

### 4.2 Dedicated Customer Registration Endpoint (`POST /auth/customer/register`)
- **Status in OpenAPI v1.0-LOCKED**: **Missing**.
- **Analysis**:
  - Registration is unified into the OTP lifecycle: when a new phone number completes `POST /auth/customer/otp/verify`, the backend provisions the customer account.
- **Enforcement**:
  - `authService.customerRegistrationUnsupported()` throws `ContractGapError` if an external caller attempts dedicated registration.

### 4.3 Customer Password Reset (`POST /auth/customer/password/reset` or `forgot`)
- **Status in OpenAPI v1.0-LOCKED**: **Unsupported**.
- **Analysis**:
  - Because customers authenticate without passwords, password recovery flows are non-existent.
- **Enforcement**:
  - `authService.customerPasswordResetUnsupported()` throws `ContractGapError`.

### 4.4 Social Login (OAuth / Google / Apple)
- **Status in OpenAPI v1.0-LOCKED**: **Missing**.
- **Analysis**:
  - No endpoints exist for OAuth2, OpenID Connect, or third-party social auth.
- **Enforcement**:
  - `authService.socialLoginUnsupported()` throws `ContractGapError`.

---

## 5. Security Architecture & Token Handling

1. **Proxy Route Confidentiality**:
   - In browser environments, requests target `/api/proxy/*`, which forwards to upstream backend while injecting server-side API keys (`SAYRA_API_KEY`, `PLAYNEST_API_KEY`).
   - Private API keys are never bundled in client code or exposed in `NEXT_PUBLIC_*` variables.
2. **Token Storage**:
   - `sayra_access_token`: Stored in `localStorage` for short-lived Bearer authentication.
   - `sayra_refresh_token`: Stored in `localStorage` for automatic session refresh.
   - `sayra_user_auth`: Cached user summary (`fullName`, `phone`, `id`) refreshed on boot via `GET /customer/me`.
3. **Session Expiry & 401 Handling**:
   - When any authenticated customer endpoint returns 401:
     1. The `apiClient` intercepts the 401 error.
     2. It calls `refreshAccessToken()` with mutex locking.
     3. If refresh succeeds with a new `accessToken`, the original request is replayed once.
     4. If refresh fails (or no refresh token exists), tokens are cleared and the user state is set to `null` (unauthenticated).
4. **No Mock Fallback**:
   - Mock users (`کاربر تست`, `mock-access-token`) have been removed from runtime code paths.
   - Profile data and authenticated states strictly reflect server state.
