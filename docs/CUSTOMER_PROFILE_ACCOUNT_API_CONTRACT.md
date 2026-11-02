# Backend Contract & Authorization Gap Report: Customer Profile and Account Data (Phase 15)

## 1. Executive Summary

This document analyzes and specifies the backend contract gaps, authenticated identity rules, allowed operations, and data models for **Customer Profile and Account Data** against the locked OpenAPI v1.0 specification (`public/context/openapi-yaml.md`).

In Phase 15, the customer profile view and account interactions (`/profile`, `ProfileHeader`, `AuthModal`, `AuthContext`) connect strictly to documented customer operations:
- `GET /customer/me`: Retrieve current authenticated customer account data (`id`, `phone`, `fullName`, `phoneVerifiedAt`).
- `POST /auth/customer/otp/request`: Request one-time SMS verification password (`phone`).
- `POST /auth/customer/otp/verify`: Submit verification code to obtain JWT access and refresh tokens.
- `POST /auth/refresh`: Refresh expired JWT access token using refresh token.
- `POST /auth/logout`: Invalidate user session and clear access credentials.

---

## 2. API Contract Investigation: Customer Profile & Identity

### 2.1 Authenticated Current-User Scoping
1. **Server-Derived Identity**:
   - Customer identity is extracted entirely on the server side from the validated `Bearer <token>` in the `Authorization` header.
   - The frontend never trusts, fabricates, or supplies customer IDs in query parameters or URL paths to identify the current customer.
2. **Documented Customer Schema**:
   The OpenAPI schema `Customer` defines:
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
   No additional fields (such as `email`, `avatarUrl`, `bio`, `nationalCode`, `birthDate`, or `balance`) are defined in the customer schema.

---

## 3. Contract Gaps & Unsupported Operations

### 3.1 Customer Profile Update Mutation (`PATCH /customer/me` or `PUT /customer/me`)
- **Status in OpenAPI v1.0-LOCKED**: **Missing**.
- **Analysis**:
  - The OpenAPI contract specifies `GET /customer/me` for reading customer profile data.
  - While there is a staff/owner endpoint `PATCH /gamingCenters/{gamingCenterId}/customers/{customerId}` (which allows a gaming center operator to update customer display names and internal notes), there is **no customer-facing mutation endpoint** allowing a customer to edit their own profile (`fullName`, `phone`, etc.).
- **Frontend Enforcement**:
  - Direct customer profile update requests cannot be submitted to the backend.
  - Attempting to call customer update operations triggers `ContractGapError("CustomerProfileUpdate", "PATCH /customer/me is not supported in OpenAPI v1.0-LOCKED.")`.
  - The UI does not simulate fake success or silently persist edits to `localStorage` as if they were persisted on the backend.

### 3.2 Customer Wallet & Balance Management
- **Status in OpenAPI v1.0-LOCKED**: **Missing**.
- **Analysis**:
  - The UI presents wallet balance and wallet charge buttons.
  - However, no wallet endpoints exist in OpenAPI v1.0-LOCKED (no `GET /customer/wallet`, no `POST /customer/wallet/charge`, and no ledger endpoints for customers).
- **Frontend Enforcement**:
  - The frontend throws `ContractGapError("CustomerWallet", "Customer wallet endpoints are not defined in OpenAPI v1.0-LOCKED.")` if programmatic wallet mutations are invoked.
  - The UI informs the user that wallet charging and ledger management are awaiting backend API support, rather than faking balance increments with client-side state.

---

## 4. Error Handling & Security Guarantees

1. **401 Unauthorized**:
   - When `GET /customer/me` returns 401, the client automatically attempts a single-flight token refresh via `POST /auth/refresh`.
   - If the refresh token is missing or refresh fails with 401, all authentication tokens and cached user profiles are revoked (`clearTokens()`), transitioning the UI cleanly to the unauthenticated login state.
2. **403 Forbidden / Invalid Scopes**:
   - Access is rejected if an account with non-customer roles attempts unauthorized panel actions.
3. **500 Server Error & Network Outages**:
   - Errors are surfaced transparently to the user with actionable Persian messages (`getErrorMessage`), without synthesizing mock customer names or fake phone numbers.
4. **Data Refresh Persistence**:
   - On page reload or session initialization, the client calls `authService.getMe()` to ensure the displayed profile is fresh and authoritative.
