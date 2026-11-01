# Backend Contract Gap Report: Customer Search, Filtering, and Sorting (Phase 5)

## 1. Executive Summary
In Playenest / Sayra OpenAPI specification `v1.0-LOCKED` (`public/context/openapi-yaml.md`), discovery and browsing are governed by:
- `GET /gamingCenters` (Operation ID: `get_gamingCenters`, Tags: `GamingCenters`)

The contract defines:
- **Parameters**: `[]` (None). No query parameters (`q`, `search`, `city`, `category`, `sort`, `page`, `pageSize`, `minPrice`, `maxPrice`, `minRating`, etc.) are defined.
- **Response**: `200 OK` returning a `Pagination` envelope (`{ success: boolean, data: GamingCenter[], meta: Meta }`).
- **Schema `GamingCenter`**:
  - `id`: string
  - `name`: string
  - `slug`: string
  - `isActive`: boolean
  - `description`: string (optional)
  - `createdAt`: string (date-time)

No other public discovery, catalog filtering, or search endpoint exists in OpenAPI v1.0-LOCKED.

---

## 2. Audit of Existing Customer UI Controls

| UI Control | Location | Current State / Behavior | API Capability in v1.0-LOCKED | Phase 5 Implementation Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **Search Input (`q`)** | `/gamecenters` and `Header` -> `SearchModal` | Full-text query on name, description, facilities, and tags | Not supported on backend (`GET /gamingCenters` has no `q` parameter) | Filter client-side over the complete dataset returned by `GET /gamingCenters`. Synchronized with `?q=` in URL on `/gamecenters`. |
| **Category Chips** | `/gamecenters` (`all`, `ps5`, `ps4`, `pc`, `xbox`, `vr`, `billiards`, `steering`) and Home `DeviceCategories` | Horizontal filter buttons; updates URL `?category=` | Not supported on backend (categories not returned in `GamingCenter` schema, no filter param) | Filter client-side when category metadata is present; synchronize with URL `?category=`. Document limitation. |
| **City / Location Selector** | `Header` -> `CityModal` & `/gamecenters` `?city=` | Modal selecting popular or all cities; sets selected city in header & URL | Not supported on backend (`GET /gamingCenters` has no `city` parameter; no global cities endpoint) | Match client-side against center `city` or `location`/`description`. Document lack of server-side city filter. |
| **Sorting Controls** | `/gamecenters` (`default`, `popular`, `newest`, `rating`, `price_asc`, `price_desc`) | Button row selecting active sort order; updates URL `?sort=` | Not supported on backend (`GET /gamingCenters` has no `sort` parameter) | Sort client-side over loaded dataset. Preserve exact sort criteria (date for `newest`, review count for `popular`, price/rating when available). |
| **Quick Search & Suggestions** | `SearchModal` | Recent searches, quick query chips, devices, games, and centers | Not supported on backend | Replace static `MOCK_GAMING_CENTERS` in `SearchModal` with live centers from `GET /gamingCenters`. Retain device & game suggestion chips. |
| **Pagination** | Catalog / Results Grid | Display results | In OpenAPI v1.0-LOCKED, `Pagination` envelope exists in response, but without query params for `page`/`pageSize`. | Render filtered set without creating fake pages or sending undocumented pagination queries. |

---

## 3. Strict Guarantees & Constraints Maintained

1. **No Undocumented Query Parameters**:
   The client will not send query parameters such as `?q=`, `?city=`, `?sort=`, or `?category=` to `GET /gamingCenters`.
2. **Accurately Scoped Client-Side Operations**:
   All filtering and sorting operations occur strictly in-memory over the full dataset received from the server.
3. **No Partial-Page Illusion**:
   Because `GET /gamingCenters` returns the full active set or a single pagination payload, filtering and sorting apply cleanly across all loaded centers.
4. **No Fake Search Results or Fallback**:
   If no centers match the query or filters, `EmptyState` is rendered. Hardcoded mock center fallbacks are removed from `SearchModal`.
5. **Preserved UI & URL Semantics**:
   All URL query parameters (`?q=`, `?category=`, `?sort=`, `?city=`) and UI components remain completely identical in appearance, labels, and behavior.
