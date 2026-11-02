# Gaming-Center Listing and Discovery API Contract (Phase 4)

## Overview
This document specifies the integration between Sayra's public gaming-center listing, catalog search, and discovery sections with the locked backend OpenAPI contract (`v1.0-LOCKED`).

## Documented Endpoint

### `GET /gamingCenters`
- **Purpose**: Lists all gaming centers.
- **Contract Schema**: Returns `Pagination` envelope:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "string",
        "name": "string",
        "slug": "string",
        "isActive": true,
        "description": "string",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "meta": {
      "pagination": {
        "page": 1,
        "pageSize": 20,
        "total": 50,
        "totalPages": 3
      }
    }
  }
  ```

## Contract Gaps & Unsupported Listing Fields

In OpenAPI `v1.0-LOCKED`, the `GamingCenter` schema returned by `GET /gamingCenters` lacks several essential listing-level attributes that were previously simulated via static mocks:

1. **Card Media & Images (`imageUrl`)**:
   - `GET /gamingCenters` does not return a thumbnail, logo, or cover image.
   - Media items are only accessible per gaming center via `GET /public/gamingCenters/{slug}/media`.
   - **Client Behavior**: Cards render a neutral static asset (`/img/gamnet-1.webp`) without altering card styling.

2. **Listing Ratings & Reviews Count (`rating`, `reviewsCount`)**:
   - Aggregate ratings and review counts are not included in `GET /gamingCenters`. Ratings are scoped to `GET /public/gamingCenters/{slug}/ratings`.
   - **Client Behavior**: The rating badge is safely omitted from cards rather than fabricating artificial ratings (e.g. 4.8 / 744 reviews).

3. **Hourly Price & Pricing Range (`hourlyPrice`, `discountedHourlyPrice`)**:
   - Centers do not have an `hourlyPrice` attribute; prices are defined per station (`GET /gamingCenters/{id}/stations`).
   - **Client Behavior**: When `hourlyPrice` is absent, the card displays a prompt ("مشاهده جزییات و تعرفه‌ها") linking to the center detail page where station prices can be inspected.

4. **Public Center Discounts (`discount`, `discountPercent`)**:
   - Public discount badges cannot be computed from `GET /gamingCenters`. The existing discount endpoint (`/gamingCenters/{id}/discounts`) is restricted to owner authorization.
   - **Client Behavior**: Only centers with verified discount payloads render discount badges. The discounted carousel is conditionally rendered when discounted items are returned.

5. **Location & City (`location`, `city`)**:
   - Addresses are only available via `GET /public/gamingCenters/{slug}/addresses`.
   - **Client Behavior**: Location snippet is safely omitted if absent, with no synthetic address fallback.

6. **Server-Side Catalog Filtering & Sorting**:
   - `GET /gamingCenters` defines no query parameters for search query (`q`), category/platform (`category`), city (`city`), or sorting (`sort`).
   - **Client Behavior**: The client performs client-side filtering and sorting over the fetched dataset. Operations that cannot be fulfilled (e.g. global city listing) throw `ContractGapError` or are safely omitted.
