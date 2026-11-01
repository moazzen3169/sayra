# Backend Contract Gap Report: Gaming Center Listing & Discovery (Phase 4)

## 1. Executive Summary
In Sayra / Playenest OpenAPI v1.0-LOCKED (`public/context/openapi-yaml.md`), the core listing operation is:
- `GET /gamingCenters`

The specification declares that `GET /gamingCenters` returns a `Pagination` envelope containing a list of `GamingCenter` objects.
However, there are significant gaps between the data requirements of consumer-facing discovery & listing cards (`DiscountedGamecenterCard`, `GamecenterCardMini`, `/gamecenters` catalog page, and `/` home page sections) and the OpenAPI v1.0-LOCKED contract.

Specifically:
1. **No Query Parameters on `GET /gamingCenters`**:
   The operation has `parameters: []`. It does not support server-side pagination (`page`, `pageSize`, `limit`), text search (`q` / `search`), city filtering (`city`), device/category filtering (`category` / `stationType`), sorting (`sort`), or promotional filtering (`hasDiscount`).
2. **Minimal Fields in `GamingCenter` Schema**:
   The `GamingCenter` schema contains only:
   - `id`: string
   - `name`: string
   - `slug`: string
   - `isActive`: boolean
   - `description`: string (optional)
   - `createdAt`: string (date-time)
3. **Missing Discovery & Card Fields in List Response**:
   The listing cards and catalog UI expect:
   - `imageUrl` / Cover media (not in `GamingCenter`; only available individually via `GET /public/gamingCenters/{slug}/media` or Phase 6 detail)
   - `location` / Address and `city` (not in `GamingCenter`; only available individually via `GET /public/gamingCenters/{slug}/addresses` or Phase 6 detail)
   - `rating` and `reviewsCount` (not in `GamingCenter`; only available individually via `GET /public/gamingCenters/{slug}/ratings` or Phase 6 detail)
   - `hourlyPrice` / Minimum starting price (not in `GamingCenter`; stations are at `GET /gamingCenters/{id}/stations` which requires center ID)
   - `discount` / `discountPercent` / `discountedHourlyPrice` (not in `GamingCenter`; discount management is private to owner/admin, no public discount discovery endpoint exists)
   - `categories` / Device categories (PS5, PC, Xbox, VR, etc. - not in `GamingCenter`)

---

## 2. Documented Behavior in Phase 4

Per Phase 4 specifications:
- The frontend client strictly respects `GET /gamingCenters` as the source of truth for the center directory.
- No fake/mock center records or silent mock fallbacks remain in the migrated listing flow.
- When listing centers via `GET /gamingCenters`:
  - `name`, `slug`, `id`, `description`, and `createdAt` are bound directly from the API response.
  - Missing image, rating, price, and discount fields are handled cleanly without fabricating arbitrary data or inventing mock prices/ratings.
  - Missing catalog filtering parameters (city, device category, active discounts) are tracked explicitly via `ContractGapError` or client-side filtering where feasible over the fetched set, while documenting the backend limitation.
- The UI card layout, composition, styles, and empty/loading states are preserved without alteration.

---

## 3. Proposed Backend OpenAPI Enhancements for Listing

To optimize listing performance and avoid N+1 queries from the client, the following enhancements to `GET /gamingCenters` (or a dedicated discovery endpoint `GET /public/gamingCenters`) are recommended:

### Proposed Endpoint: `GET /public/gamingCenters` (or expanded `GET /gamingCenters`)
* **Tags:** `Public`, `GamingCenters`
* **Query Parameters:**
  - `page`: integer (default: 1)
  - `limit` / `pageSize`: integer (default: 20)
  - `search` / `q`: string (full-text search on name, description, address, games)
  - `city`: string (filter by city name or cityId)
  - `stationType` / `category`: string (filter by supported station types: PC, PS5, XBOX, VR, BILLIARDS)
  - `hasDiscount`: boolean (filter centers with currently active public discounts)
  - `sort`: string (`newest`, `popular`, `rating_desc`, `price_asc`, `price_desc`)

#### Proposed `GamingCenterListItem` Schema:
```json
{
  "id": "gc_001",
  "name": "گیمنت گرگدن",
  "slug": "gergdan",
  "description": "شعبه ولیعصر",
  "coverImageUrl": "/img/gamnet-1.webp",
  "city": "تبریز",
  "address": "ولیعصر، خیابان مخابرات",
  "rating": 4.8,
  "reviewsCount": 744,
  "startingHourlyPrice": 240000,
  "activeDiscount": {
    "valueType": "PERCENTAGE",
    "value": 25,
    "discountedStartingPrice": 180000,
    "endAt": "2026-12-31T23:59:59Z"
  },
  "supportedCategories": ["ps5", "pc", "xbox"],
  "isActive": true,
  "createdAt": "2024-01-10T10:00:00Z"
}
```
