# Backend Contract Gap Report: Gaming Center Detail Data (Phase 6)

## 1. Executive Summary
In Sayra / Playenest OpenAPI specification `v1.0-LOCKED` (`public/context/openapi-yaml.md`), the customer-facing gaming center detail page (`/gamecenter/[id]` and `/gamecenters/[id]`) relies on multiple public and tenant endpoints:
- `GET /public/gamingCenters/{gamingCenterSlug}` (Identity & basic metadata)
- `GET /public/gamingCenters/{gamingCenterSlug}/addresses` (Physical addresses & coordinates)
- `GET /public/gamingCenters/{gamingCenterSlug}/media` (Media items & photo gallery)
- `GET /public/gamingCenters/{gamingCenterSlug}/ratings` (Customer reviews & ratings)
- `GET /public/gamingCenters/{gamingCenterSlug}/links` (Social / external links)
- `GET /gamingCenters/{gamingCenterId}/stations` (Station inventory & rental pricing)
- `GET /public/gamingCenters/{gamingCenterSlug}/availability/slots` (Slot scheduling)

While these operations provide the core structure for the gaming center detail experience, several prominent UI features and attributes present in consumer expectations lack explicit backend schemas and endpoints.

---

## 2. Detailed Contract Gap Audit

### 2.1 Games Catalog / Installed Games (`games`)
- **Status in v1.0-LOCKED**: Gap.
- **UI Requirement**: The detail page presents a marquee section (`GamesMarquee`) displaying installed video games (title, logo, platforms) available at the center.
- **Contract Analysis**: In OpenAPI v1.0-LOCKED, the `games` array is only mentioned as a creation property in `POST /gamingCenters` (`application/json` payload `{ games: string[] }`). However, neither `GET /public/gamingCenters/{slug}` nor any sub-resource returns this catalog on read operations.
- **Phase 6 Implementation**: All runtime mock fallbacks (`MOCK_GAMES`) have been removed from the live data pipeline. If the backend does not return installed games, an empty array is provided and the marquee section is omitted without distorting layout.

### 2.2 Amenities & Facilities (`facilities`)
- **Status in v1.0-LOCKED**: Gap.
- **UI Requirement**: Displaying center amenities such as smoking area, parking, buffet/cafeteria, Wi-Fi, air conditioning, VIP rooms, and accessibility features.
- **Contract Analysis**: There are zero occurrences of `facilities`, `facility`, `amenities`, or `features` in `public/context/openapi-yaml.md`.
- **Phase 6 Implementation**: No mock facilities are fabricated or displayed at runtime.

### 2.3 Direct Public Center Lookup by UUID / ID (`id`)
- **Status in v1.0-LOCKED**: Partial / Ambiguity.
- **Contract Analysis**: Public endpoints strictly specify `{gamingCenterSlug}` in their URL path (e.g., `GET /public/gamingCenters/{gamingCenterSlug}`). Only tenant-level management endpoints use `{gamingCenterId}` (e.g. `GET /gamingCenters/{gamingCenterId}/stations`).
- **Route Handling**: Next.js route parameter is `[id]`. In Phase 6, `resolveGamingCenter(routeId)` first attempts direct slug lookup (`GET /public/gamingCenters/{slug}`). If not found, it resolves against `GET /gamingCenters` to match either `slug` or `id` without fabricating artificial identifiers.

### 2.4 Opening / Operating Hours on Public Detail Endpoint
- **Status in v1.0-LOCKED**: Gap on Public Endpoints.
- **Contract Analysis**: Operating hours (`workStartTime`, `workEndTime`, `timeZone`) exist exclusively under the authenticated owner/manager settings endpoint (`GET /gamingCenters/{gamingCenterId}/settings`), not in `GET /public/gamingCenters/{gamingCenterSlug}`.

---

## 3. Proposed OpenAPI Contract Additions for Phase 6

To support full-featured gaming center presentation without client-side guesswork, we recommend enriching `GET /public/gamingCenters/{gamingCenterSlug}` or providing dedicated sub-endpoints:

### 3.1 Games Catalog Endpoint
```yaml
/public/gamingCenters/{gamingCenterSlug}/games:
  get:
    summary: Get installed games catalog
    tags:
      - Public
    parameters:
      - name: gamingCenterSlug
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: List of installed games
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: array
                  items:
                    type: object
                    required: [id, name]
                    properties:
                      id:
                        type: string
                      name:
                        type: string
                      logoUrl:
                        type: string
                      category:
                        type: string
```

### 3.2 Facilities & Amenities Schema
```yaml
/public/gamingCenters/{gamingCenterSlug}/facilities:
  get:
    summary: Get center facilities and amenities
    tags:
      - Public
    parameters:
      - name: gamingCenterSlug
        in: path
        required: true
        schema:
          type: string
    responses:
      '200':
        description: Center amenities
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                data:
                  type: array
                  items:
                    type: string
                    example: ["PARKING", "CAFE", "SMOKING_ROOM", "AIR_CONDITIONING", "VIP_ROOMS"]
```

---

## 4. Phase 6 Guarantees & Verification
1. **Zero Runtime Mock Fallbacks**: Live center detail loads strictly from API endpoints.
2. **Graceful Degradation**: Empty media, reviews, address, or games render cleanly using existing empty states and conditional wrappers.
3. **Persian & RTL Design System Compliance**: All UI components, badges, typography, and layout hierarchies are preserved intact.
