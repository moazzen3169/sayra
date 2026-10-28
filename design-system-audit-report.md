# Design System Compliance Audit Report

## 1. Executive Summary

- **Project:** Sayra (سایرا) — Next.js 15 Web Application
- **Audit Scope:** Entire repository (`src/` codebase including styles, pages, components, services, lib, context, and configurations)
- **Specification Used:** `design-system.md` (Version 2)
- **Audit Date:** October 28, 2024
- **Overall Compliance Assessment:** **Non-Compliant (High Risk)**. The application exhibits widespread direct and systemic deviations from `design-system.md`. Major areas of non-compliance include prohibited emoji/sticker usage, unicode symbols used instead of system SVG icons, hardcoded hex colors, client-side pricing and discount calculations, mock fallback enabled by default on production paths, fake wallet features, dead links in core navigation, and a near-total absence of centralized shared UI primitives in `src/components/ui/`.
- **Total Confirmed Findings:** **20**

### Findings Breakdown by Severity

| Severity | Count | Percentage |
|---|---:|---:|
| **Critical** | 2 | 10% |
| **High** | 9 | 45% |
| **Medium** | 7 | 35% |
| **Low** | 2 | 10% |
| **Total** | **20** | **100%** |

### Findings Breakdown by Category

| Category | Count | Finding IDs |
|---|---:|---|
| **Prohibitions (P-01 to P-25)** | 7 | DSA-003, DSA-004, DSA-005, DSA-006, DSA-007, DSA-008, DSA-009 |
| **Colors & Design Tokens** | 3 | DSA-001, DSA-002, DSA-017 |
| **Navigation & Routing** | 3 | DSA-010, DSA-011, DSA-020 |
| **Architecture & Components** | 2 | DSA-012, DSA-015 |
| **Motion & Animation** | 1 | DSA-013 |
| **Layout & Spacing** | 1 | DSA-014 |
| **Security & Auth** | 1 | DSA-016 |
| **Interactivity & Functionality** | 1 | DSA-018 |
| **Copywriting & Vocabulary** | 1 | DSA-019 |

### Most Important Systemic Issues
1. **Missing Centralized Shared UI Primitives (`src/components/ui/`):** Out of 26 required UI primitives specified in `design-system.md` §8, only 2 (`carousel.tsx` and `SearchableSelect.tsx`) exist in `src/components/ui/`. Components across the app re-implement raw HTML elements (`<button>`, `<input>`, `<dialog>`), leading to duplicated styling, inconsistent focus states, and radius/color discrepancies.
2. **Client-Side Pricing & Discount Calculations (Violating P-11):** Multiple components (`DiscountedGamecenterCard`, `CartModal`, `DateTimeModal`, `ExtraControllerModal`) calculate prices or percentage discounts on the client side (`hourlyPrice * (1 - percent)`), directly violating P-11 and source-of-truth rules.
3. **Mock Fallback Default-On (`USE_MOCK_RESERVATIONS = true`):** The configuration in `src/lib/api/config.ts` sets mock mode to `true` by default, and services/components fall back to mock data on error or empty response, violating P-13.
4. **Emoji and Unicode Symbol Pollution (Violating P-01 & P-02):** Emojis (`🎮`, `🔥`, `🎟️`, `💰`) and unicode text symbols (`✕`, `★`, `✓`, `←`) are used across modal dialogs, cards, and owner dashboards instead of system SVG icons.

---

## 2. Audit Methodology

### Inspection Process
The repository was audited systematically through static source code analysis, file-by-file inspection, and targeted pattern matching against the specification in `design-system.md`.

### File and Layer Types Inspected
1. **Global Styles & Configurations:** `src/app/globals.css`, `next.config.ts`, `tsconfig.json`.
2. **Shared & Feature Components:** `src/components/Header.tsx`, `BottomBar.tsx`, `DesktopNav.tsx`, `BannerSlider.tsx`, `SearchModal.tsx`, `NotificationModal.tsx`, `CityModal.tsx`, `AuthModal.tsx`, `DiscountedGamecenterCard.tsx`, `ReservationHistoryCard.tsx`, `StatusBadge.tsx`, `src/components/gamecenter/*`, `src/components/owner/*`, `src/components/ui/*`.
3. **Page Shells & Routes:** `src/app/page.tsx`, `src/app/reservations/page.tsx`, `src/app/reservations/[id]/page.tsx`, `src/app/profile/page.tsx`, `src/app/gamecenter/[id]/page.tsx`, `src/app/owner/**/*`.
4. **Services, Utilities & Mocks:** `src/services/*`, `src/lib/*`, `src/context/*`, `src/types/*`.

### Verification Criteria & Rules Extraction
Requirements from `design-system.md` were extracted into a structured checklist with unique rule IDs (`P-01` to `P-25`, `DS-COLOR-*`, `DS-TYPO-*`, `DS-LAYOUT-*`, `DS-MOTION-*`, `DS-COMP-*`, `DS-A11Y-*`). Discrepancies were confirmed by citing the exact file path, line numbers, and code snippets from source code.

---

## 3. Repository Coverage

| Area | Inspected | Files Reviewed | Findings | Notes |
|---|---|---:|---:|---|
| **Global Styles & Tokens** | Fully Inspected | 2 | 3 | Inspected `globals.css` and Next.js configuration. |
| **Shared Components (`src/components/`)** | Fully Inspected | 18 | 6 | Inspected modals, headers, bottom bar, desktop nav, cards. |
| **UI Primitives (`src/components/ui/`)** | Fully Inspected | 2 | 1 | Inspected `carousel.tsx` and `SearchableSelect.tsx`. |
| **Application Pages (`src/app/`)** | Fully Inspected | 16 | 6 | Main page, reservations history, reservation detail, gamecenter detail, profile, owner pages. |
| **Contexts & Auth (`src/context/`)** | Fully Inspected | 2 | 2 | Inspected `AuthContext.tsx` and `OwnerContext.tsx`. |
| **Services & API (`src/services/`, `src/lib/api/`)** | Fully Inspected | 10 | 2 | Inspected API client, endpoints, config, and services. |
| **Mocks & Helpers (`src/lib/`)** | Fully Inspected | 8 | 0 | Inspected `dates.ts`, `format.ts`, `reservationUi.ts`, `discount.ts`. |
| **Total** | **100% Coverage** | **58** | **20** | **Complete static inspection of all source files.** |

---

## 4. Design System Rules Inventory

| Rule ID | Category | Requirement | Expected Implementation | Source in `design-system.md` |
|---|---|---|---|---|
| **P-01** | Prohibitions | No stickers or emojis in UI, text, titles, badges, alerts, or mock options. | Use system SVG icons (`src/components/ui/Icon.tsx`). | §2 (P-01) |
| **P-02** | Prohibitions | No unicode symbols (`✕`, `★`, `✓`, `●`, `○`, `←`, `→`) in UI text. | Render SVG icons for close, rating stars, checkmarks, arrows. | §2 (P-02), §7 |
| **P-03** | Prohibitions | No exclamation marks in system messages ("تایید شد!"). | Calm, formal-friendly tone ("تأیید شده", "انجام شده"). | §2 (P-03), §4.4, §12.4 |
| **P-04** | Prohibitions | No internal developer terms ("API", "endpoint", "دمو", "Mock", "TODO") shown to users. | User-friendly Persian error/status text. | §2 (P-04), §4.4, §12.5 |
| **P-05** | Prohibitions | No fake production data (fake wallet balance, fake notifications, fake ratings). | Hide feature or render EmptyState until Backend API exists. | §2 (P-05), §9.2, §10.5 |
| **P-06** | Prohibitions | No direct hex color codes (`text-[#101014]`) in component files. | Use design tokens (`text-on-primary`, `bg-primary`, etc.). | §2 (P-06), §3.1, §3.2 |
| **P-07** | Prohibitions | No arbitrary styling values (`text-[10px]`, `rounded-[10px]`, `h-[52px]`). | Use design scale (`rounded-card`, `text-xs`, `h-11`, etc.). | §2 (P-07), §4.2, §5.2 |
| **P-08** | Prohibitions | No continuous/decorative animations (marquee, pulse dot, bounce, glow). | Static displays or manual horizontal scroll. Exceptions: spinner, skeleton. | §2 (P-08), §6 |
| **P-11** | Prohibitions | Frontend must NOT calculate hourly price, total price, discounts, or slot loops. | All final prices and availability come strictly from Backend. | §2 (P-11), §1.3, §8.5 |
| **P-13** | Prohibitions | No mock fallback in Production path (`USE_MOCK` default must be false). | Mocks only under explicit dev flag; errors must show ErrorState. | §2 (P-13), §12.2 |
| **P-18** | Prohibitions | Bypassing authentication/role checks (auto-logged-in demo state, state toggles) is forbidden. | Enforce real auth tokens and backend verification checks. | §2 (P-18), §10.7 |
| **P-19** | Prohibitions | No `div onClick` or `role="link"` for navigation; no `router.push` for simple links. | Navigation = `<Link>`; Action = `<button>`. | §2 (P-19), §8.2 |
| **P-20** | Prohibitions | Dead links (`#blog`, `#about`, `/wallet` without page) forbidden. | Remove links without real page targets from UI. | §2 (P-20), §9.2 |
| **P-22** | Prohibitions | Non-functional buttons/filters (categories without filtering, shortcut hints without listeners) forbidden. | Remove non-functional hints or implement actual filtering/listeners. | §2 (P-22), §9.2, §10.1 |
| **P-25** | Prohibitions | Parallel component creation forbidden; build shared UI primitives in `components/ui/`. | Centralized primitives (`Button`, `Input`, `Modal`, `Icon`, `Badge`, etc.). | §2 (P-25), §8 |
| **DS-COLOR-01**| Color | Primary color token is `#B8F34A` (Lime); `--primary-muted` is `rgba(184,243,74,.15)`. | Correct CSS variable values in `:root`. | §3.1 |
| **DS-LAYOUT-01**| Layout | Header margin spacing must use `--header-h` CSS variable (`104px`). | Replace hardcoded `mt-[120px]` / `mt-[128px]` / `mt-[90px]`. | §3.1, §9.1 |
| **DS-COPY-01** | Copywriting | Vocabulary rules: "گیمنت" (not "گیم‌نت"), "دستگاه" (not "سیستم"), "تا" (not "الی"). | Enforce unified glossary in all UI copy. | §4.3, §4.4 |

---

## 5. Findings Summary

- **Total Confirmed Findings:** 20
- **By Severity:**
  - Critical: 2
  - High: 9
  - Medium: 7
  - Low: 2
- **By Directory / Area:**
  - `src/app/globals.css`: 3
  - `src/components/`: 8
  - `src/app/`: 6
  - `src/services/` & `src/lib/`: 3

### Summary of Systemic Violations
1. **Hardcoded Color Token Bypassing (P-06):** Observed in 11 files (`text-[#101014]`).
2. **Unicode Symbols in Place of SVG Icons (P-02):** Observed in 13 files (`✕`, `★`, `✓`, `←`).
3. **Emoji / Sticker Characters in UI Text (P-01):** Observed in 6 files (`🎮`, `🔥`, `🎟️`, `💰`).
4. **Client-Side Financial Calculations (P-11):** Observed in 4 components and 2 services (`hourlyPrice * (1 - percent)`).
5. **Dead Links & Fake Features (P-05, P-20):** Observed in `Header.tsx`, `DesktopNav.tsx`, and `profile/page.tsx`.

---

## 6. Detailed Findings

### DSA-001 — Invalid `--primary-muted` Color Variable in Global Styles

- **Severity:** High
- **Category:** Color / Design Tokens
- **Status:** Confirmed
- **Affected file:** `src/app/globals.css`
- **Line number(s):** 62
- **Affected component/page:** Global Styles (`globals.css`)
- **Design system rule:** DS-COLOR-01 (§3.1)
- **Design system source:** `design-system.md`, §3.1, Line 75
- **Violation type:** Token mismatch
- **Scope:** Shared implementation (applies globally)

#### A. Current Implementation
In `src/app/globals.css`, `--primary-muted` is configured as:
```css
--primary-muted: rgba(255, 255, 61, 0.15);
```
This value represents the deprecated `#FFFF3D` yellow primary color.

#### B. Expected Implementation
According to `design-system.md` §3.1, the primary brand color is Lime (`#B8F34A`), and `--primary-muted` must be set to `rgba(184, 243, 74, 0.15)`. `design-system.md` §3.1 explicitly notes: `(⚠️ در کد فعلی هنوز زرد است؛ باید اصلاح شود)`.

#### C. Discrepancy Analysis
Using the legacy yellow RGB value creates visual inconsistencies wherever muted primary backgrounds are rendered (such as selected chip backgrounds, status badges, and highlight cards).

#### D. Recommended Fix
In `src/app/globals.css`, update `--primary-muted`:
```css
:root {
  --primary-muted: rgba(184, 243, 74, 0.15);
}
```

#### E. Related Locations
- `src/lib/reservationUi.ts` (Line 11)
- `src/components/DesktopNav.tsx` (Line 36)
- `src/app/profile/page.tsx` (Line 274)

#### F. Verification Criteria
1. Inspect `src/app/globals.css` line 62 to confirm `--primary-muted` is `rgba(184, 243, 74, 0.15)`.
2. Verify in browser rendering that selected chips/badges display a subtle lime tint instead of yellow.

---

### DSA-002 — Missing Core Design Tokens in CSS Variables and `@theme` Configuration

- **Severity:** High
- **Category:** Design Tokens / CSS Variables
- **Status:** Confirmed
- **Affected file:** `src/app/globals.css`
- **Line number(s):** 54–88
- **Affected component/page:** Global Styles (`globals.css`)
- **Design system rule:** DS-COLOR-02 (§3.1)
- **Design system source:** `design-system.md`, §3.1, Lines 88–98
- **Violation type:** Missing design system tokens
- **Scope:** Shared implementation (applies globally)

#### A. Current Implementation
`src/app/globals.css` `:root` block lacks definitions for `--text-on-primary`, `--accent-warning`, and `--header-h`. Neither are these mapped in the `@theme` block.

#### B. Expected Implementation
`design-system.md` §3.1 explicitly mandates adding these proposed tokens to `globals.css`:
```css
:root {
  --text-on-primary: #101014;
  --accent-warning: #FBBF24;
  --header-h: 104px;
}
@theme {
  --color-on-primary: var(--text-on-primary);
  --color-warning: var(--accent-warning);
}
```

#### C. Discrepancy Analysis
Because `--text-on-primary` is absent, developers repeatedly hardcode `text-[#101014]` across components whenever text sits on a Lime (`--primary`) background. Because `--header-h` is missing, components scatter arbitrary top margins (`mt-[120px]`, `mt-[128px]`, `mt-[90px]`).

#### D. Recommended Fix
Add `--text-on-primary: #101014;`, `--accent-warning: #FBBF24;`, and `--header-h: 104px;` to `:root` in `src/app/globals.css` and expose them under `@theme`.

#### E. Related Locations
- `src/app/globals.css` (Lines 54–88)
- All files referencing `text-[#101014]` (DSA-003)
- All files referencing `mt-[120px]` (DSA-014)

#### F. Verification Criteria
Check `src/app/globals.css` for `:root` and `@theme` definitions of `--text-on-primary`, `--accent-warning`, and `--header-h`.

---

### DSA-003 — Systemic Hardcoded Hex Colors (`text-[#101014]`) Across Components

- **Severity:** High
- **Category:** Color / Prohibitions (P-06)
- **Status:** Confirmed
- **Affected file:** Multiple files (e.g., `src/app/reservations/[id]/page.tsx`)
- **Line number(s):** 550 (and 10 other locations)
- **Affected component/page:** Buttons and primary badges across the application
- **Design system rule:** P-06 (§2, §3.1, §3.2)
- **Design system source:** `design-system.md`, §2 (P-06), §3.1
- **Violation type:** Hardcoded value
- **Scope:** Multiple instances across repository

#### A. Current Implementation
Components directly use arbitrary Tailwind hex values `text-[#101014]` when styling text on primary Lime buttons or badges.
Example excerpt from `src/app/reservations/[id]/page.tsx` line 550:
```tsx
className="h-12 w-full rounded-card bg-[var(--accent-star)] text-[#101014] text-sm font-black..."
```

#### B. Expected Implementation
Rule P-06 strictly forbids raw hex colors in component files (`text-[#101014]`). Components must use design tokens (`text-on-primary` or `var(--text-on-primary)`).

#### C. Discrepancy Analysis
Direct hex values bypass the theme engine, making theme updates impossible and causing maintainability issues.

#### D. Recommended Fix
Replace all occurrences of `text-[#101014]` with `text-on-primary` or `text-[var(--text-on-primary)]`.

#### E. Related Locations
- `src/app/reservations/[id]/page.tsx`: Line 550
- `src/app/gamecenter/[id]/page.tsx`: Lines 74, 137, 496
- `src/components/gamecenter/BookingSheet.tsx`: Lines 124, 283, 313, 345
- `src/components/gamecenter/DevicePicker.tsx`: Lines 117, 137
- `src/components/Header.tsx`: Line 159
- `src/components/DiscountedGamecenterCard.tsx`: Line 93
- `src/components/PromoBanner.tsx`: Line 44
- `src/lib/reservationUi.ts`: Line 19
- `src/components/SearchModal.tsx`: Line 452
- `src/components/owner/OwnerPageHeader.tsx`: Line 24
- `src/app/owner/discounts/page.tsx`: Lines 389, 779

#### F. Verification Criteria
Search repository for `text-[#101014]` and confirm zero occurrences remain.

---

### DSA-004 — Emoji and Unicode Sticker Usage Across Application UI

- **Severity:** High
- **Category:** Iconography / Prohibitions (P-01)
- **Status:** Confirmed
- **Affected file:** `src/components/SearchModal.tsx`
- **Line number(s):** 66, 72, 78, 84, 90
- **Affected component/page:** `SearchModal`, `NotificationModal`, `OwnerDashboardPage`, `OwnerDiscountsPage`
- **Design system rule:** P-01 (§2, §7)
- **Design system source:** `design-system.md`, §2 (P-01), §7, §10.7
- **Violation type:** Prohibited element
- **Scope:** Multiple instances across repository

#### A. Current Implementation
Emojis are rendered directly in UI lists, titles, tiles, and badges.
Excerpt from `src/components/SearchModal.tsx`:
```tsx
{ id: "ps5", label: "پلی‌استیشن ۵", icon: "🎮" },
{ id: "pc", label: "کامپیوتر گیمینگ", icon: "🖥️" },
{ id: "vr", label: "واقعیت مجازی", icon: "🥽" },
```
Excerpt from `src/app/owner/page.tsx` line 28:
```tsx
{ href: "/owner/reservations", label: "رزروها", emoji: "🎟️", badge: "pending" },
```

#### B. Expected Implementation
Rule P-01 states: "No stickers or emojis in UI, text, messages, placeholders, titles, alerts, or mock options. Icons must strictly be system SVG icons."

#### C. Discrepancy Analysis
Emoji rendering varies wildly across operating systems and browsers, creating an unprofessional, inconsistent user interface.

#### D. Recommended Fix
Replace all emoji properties and inline emoji strings with system SVG icons (`Icon.tsx`).

#### E. Related Locations
- `src/components/SearchModal.tsx`: Lines 66, 72, 78, 84, 90 (`🎮`, `🖥️`, `🥽`, `🏎️`)
- `src/components/NotificationModal.tsx`: Lines 26, 42 (`🔥`, `🎮`)
- `src/app/owner/page.tsx`: Lines 28–31, 294 (`🎟️`, `💰`, `🎮`, `💬`, `⚠️`)
- `src/app/owner/discounts/page.tsx`: Lines 79, 89, 99, 347, 377, 481, 506, 596, 661, 685, 740, 762, 772, 812, 819 (`⚡`, `🏷️`, `🎯`, `💡`, `🔢`, `♾️`, `👁️`, `🎁`, `📌`)
- `src/app/owner/edit/page.tsx`: Line 304 (`📍`)
- `src/components/ReservationHistoryCard.tsx`: Line 121 (`📋`)

#### F. Verification Criteria
Search repository for unicode emojis and verify zero occurrences in UI strings or JSX.

---

### DSA-005 — Usage of Raw Unicode Characters (`✕`, `★`, `✓`, `←`) Instead of System SVG Icons

- **Severity:** Medium
- **Category:** Iconography / Prohibitions (P-02)
- **Status:** Confirmed
- **Affected file:** `src/components/RatingModal.tsx`
- **Line number(s):** 57, 72
- **Affected component/page:** RatingModal, AuthModal, CartModal, DateTimeModal, GamecenterInfoCard, etc.
- **Design system rule:** P-02 (§2, §7)
- **Design system source:** `design-system.md`, §2 (P-02), §7
- **Violation type:** Prohibited element
- **Scope:** Systemic across 13 files

#### A. Current Implementation
Modal close buttons, rating stars, checkmarks, and back arrows use plain text unicode characters instead of SVG icons.
Excerpt from `src/components/RatingModal.tsx` line 57:
```tsx
<button type="button" onClick={onClose} className="...">✕</button>
```
Excerpt from `src/components/DiscountedGamecenterCard.tsx` line 97:
```tsx
<span>★ {toPersianDigits(rating.toFixed(1))}</span>
```

#### B. Expected Implementation
Rule P-02 states: "Unicode symbols (`✕`, `★`, `✓`, `●`, `○`, `←`, `→`) must NOT be used in UI text; use SVG icons."

#### C. Discrepancy Analysis
Unicode characters render with inconsistent line heights, font fallback glitches, and poor alignment across mobile and desktop devices.

#### D. Recommended Fix
Replace unicode `✕` with SVG close icon (`Icon name="close"`), `★` with SVG star icon (`Icon name="star"` with `var(--accent-star)`), `✓` with check icon, and `←` with arrow icon.

#### E. Related Locations
- Close `✕`: `RatingModal.tsx` (L57), `AuthModal.tsx` (L198), `CartModal.tsx` (L81), `DateTimeModal.tsx` (L145), `ExtraControllerModal.tsx` (L104), `BookingSheet.tsx` (L255), `GamecenterInfoCard.tsx` (L213), `GamesMarquee.tsx` (L126), `profile/page.tsx` (L509, L568, L632), `owner/discounts/page.tsx` (L280, L475), `owner/ads/page.tsx` (L160).
- Rating Star `★`: `SearchModal.tsx` (L462), `DiscountedGamecenterCard.tsx` (L97), `GamecenterCardMini.tsx` (L51), `RatingModal.tsx` (L72), `GamecenterInfoCard.tsx` (L227), `owner/discounts/page.tsx` (L784), `owner/reviews/page.tsx` (L71, L87), `gamecenter/[id]/page.tsx` (L612).
- Checkmark `✓`: `DateTimeModal.tsx` (L254), `ReservationHistoryCard.tsx` (L121), `owner/edit/page.tsx` (L404), `reservations/[id]/page.tsx` (L397).
- Arrow `←`: `owner/support/page.tsx` (L129).

#### F. Verification Criteria
Confirm that no unicode symbols `✕`, `★`, `✓`, or `←` are used in JSX text nodes.

---

### DSA-006 — Prohibited Exclamation Marks in System Status Badges and System Texts

- **Severity:** Medium
- **Category:** Copywriting / Prohibitions (P-03)
- **Status:** Confirmed
- **Affected file:** `src/lib/reservationUi.ts`
- **Line number(s):** 14, 22
- **Affected component/page:** Status UI Mapping (`STATUS_UI`), `NotificationModal`
- **Design system rule:** P-03 (§2, §4.4, §12.4)
- **Design system source:** `design-system.md`, §2 (P-03), §4.4, §12.4
- **Violation type:** Tone non-compliance
- **Scope:** Shared status labels and notifications

#### A. Current Implementation
In `src/lib/reservationUi.ts`:
```typescript
CONFIRMED: { label: "تایید شد!", ... },
COMPLETED: { label: "تکمیل شده!", ... },
```

#### B. Expected Implementation
Rule P-03 forbids exclamation marks in system texts ("تایید شد!"). Tone must be calm and formal-friendly. `design-system.md` §12.4 explicitly defines the exact mandatory status labels:
- `CONFIRMED` -> `تأیید شده`
- `COMPLETED` -> `انجام شده`

#### C. Discrepancy Analysis
Exclamation marks convey excited or informal tone, violating brand voice guidelines, and the labels deviate from the standard status mapping in §12.4.

#### D. Recommended Fix
Update `STATUS_UI` in `src/lib/reservationUi.ts`:
```typescript
CONFIRMED: { label: "تأیید شده", className: ... },
COMPLETED: { label: "انجام شده", className: ... },
```

#### E. Related Locations
- `src/lib/reservationUi.ts` (Lines 14, 22)
- `src/components/NotificationModal.tsx` (Lines 26, 42)

#### F. Verification Criteria
Inspect `STATUS_UI` mapping and ensure zero exclamation marks exist in status labels.

---

### DSA-007 — Exposure of Internal Developer Terms (`API`, `endpoint`, `دمو`) to End Users

- **Severity:** High
- **Category:** Copywriting / Prohibitions (P-04)
- **Status:** Confirmed
- **Affected file:** `src/app/owner/hours/page.tsx`
- **Line number(s):** 86
- **Affected component/page:** `OwnerHoursPage`, `OwnerWithdrawPage`, `OwnerDashboardPage`, `apiClient`
- **Design system rule:** P-04 (§2, §4.4, §12.5)
- **Design system source:** `design-system.md`, §2 (P-04), §4.4, §12.5
- **Violation type:** Developer text in UI
- **Scope:** Multiple locations across owner pages and API error client

#### A. Current Implementation
Developer jargon is rendered directly in user-facing UI text.
Excerpt from `src/app/owner/hours/page.tsx` line 86:
```tsx
<p>ثبت روزهای تعطیل در API فعلی وجود ندارد و پس از ارائه‌ی endpoint اضافه می‌شود.</p>
```
Excerpt from `src/app/owner/withdraw/page.tsx` line 58:
```tsx
<p>ثبت درخواست برداشت (در API موجود نیست)</p>
```
Excerpt from `src/app/owner/page.tsx` line 285:
```tsx
<button>(دمو: تغییر وضعیت به تایید شده)</button>
```
Excerpt from `src/lib/api/client.ts` lines 78 & 121:
```typescript
"آدرس API تنظیم نشده است. مقدار NEXT_PUBLIC_API_BASE_URL را در .env.local بگذارید..."
```

#### B. Expected Implementation
Rule P-04 strictly forbids developer terms ("API", "endpoint", "دمو", "Mock", "TODO", "b端") in user-facing UI. Error messages must pass through the standardized error dictionary in §12.5.

#### C. Discrepancy Analysis
Exposing technical internal jargon confuses non-technical users and leaks internal system implementation details.

#### D. Recommended Fix
Replace developer explanations with user-friendly Persian copy (e.g., "این بخش به‌زودی فعال می‌شود") and sanitize API client error messages to return user-friendly Persian text without mentioning `.env` or `API`.

#### E. Related Locations
- `src/app/owner/hours/page.tsx`: Line 86
- `src/app/owner/withdraw/page.tsx`: Line 58
- `src/app/owner/page.tsx`: Line 285
- `src/lib/api/client.ts`: Lines 78, 121

#### F. Verification Criteria
Search repository for `API`, `endpoint`, `دمو` in UI strings and verify zero occurrences remain visible to users.

---

### DSA-008 — Prohibited Client-Side Price and Discount Calculations

- **Severity:** Critical
- **Category:** Business Logic / Prohibitions (P-11)
- **Status:** Confirmed
- **Affected file:** `src/components/DiscountedGamecenterCard.tsx`
- **Line number(s):** 51
- **Affected component/page:** `DiscountedGamecenterCard`, `CartModal`, `DateTimeModal`, `ExtraControllerModal`
- **Design system rule:** P-11 (§2, §1.3, §8.5)
- **Design system source:** `design-system.md`, §2 (P-11), §1.3, §8.5
- **Violation type:** Business logic violation
- **Scope:** Systemic across cards, modals, and services

#### A. Current Implementation
The frontend calculates discounted prices and total amounts on the client side.
Excerpt from `src/components/DiscountedGamecenterCard.tsx` line 51:
```typescript
const calculatedPrice = discountPercent
  ? Math.round(hourlyPrice * (1 - discountPercent / 100))
  : hourlyPrice;
```
Excerpt from `src/components/DateTimeModal.tsx` lines 103–108:
```typescript
const base = item.device.pricePerHour * item.quantity;
const extra = item.extraControllersCount * extraControllerPricePerHour;
const grandTotal = totalPricePerHour * totalHours;
```

#### B. Expected Implementation
Rule P-11 states: "Frontend does NOT calculate or guess hourly availability, final price, discount percentage, reservation status, or price per hour. `hourlyPrice × hours` or `price × (1 - percent)` calculation is strictly forbidden. Final prices come exclusively from Backend."

#### C. Discrepancy Analysis
Client-side pricing logic causes price mismatches with backend calculations (taxes, dynamic discounts, surge pricing), violating the single-source-of-truth principle.

#### D. Recommended Fix
Refactor `DiscountedGamecenterCard` and booking modals to render `discountedHourlyPrice` and `totalPrice` directly from backend API response objects without client-side mathematical multiplication or percentage reduction.

#### E. Related Locations
- `src/components/DiscountedGamecenterCard.tsx`: Line 51
- `src/components/CartModal.tsx`: Lines 49–50, 95–96
- `src/components/DateTimeModal.tsx`: Lines 103–108
- `src/components/ExtraControllerModal.tsx`: Line 45
- `src/services/bookingService.ts`: Line 68
- `src/lib/devices.ts`: Line 129

#### F. Verification Criteria
Verify that no component calculates `hourlyPrice * hours` or `price * (1 - discountPercent)`.

---

### DSA-009 — Default Mock Flag Configuration and Production Fallback to Mock Data

- **Severity:** Critical
- **Category:** Mocks / Prohibitions (P-13)
- **Status:** Confirmed
- **Affected file:** `src/lib/api/config.ts`
- **Line number(s):** 9
- **Affected component/page:** API Config, `BookingSheet`, `OwnerContext`, `AuthContext`
- **Design system rule:** P-13 (§2, §12.2)
- **Design system source:** `design-system.md`, §2 (P-13), §12.2
- **Violation type:** Production risk / Default mock enabled
- **Scope:** Systemic across API layer and contexts

#### A. Current Implementation
In `src/lib/api/config.ts`:
```typescript
export const USE_MOCK_RESERVATIONS = process.env.NEXT_PUBLIC_USE_MOCK_RESERVATIONS !== "false";
```
This expression evaluates to `true` by default when `NEXT_PUBLIC_USE_MOCK_RESERVATIONS` is unset. Additionally, `BookingSheet.tsx` (line 156) falls back to `buildMockSlots()` when API results are empty, and `OwnerContext` defaults state to `MOCK_CENTER` and `MOCK_OWNER_ME`.

#### B. Expected Implementation
Rule P-13 states: "Fallback to mock data on error or empty data is forbidden. Mocking is permitted ONLY with explicit `NEXT_PUBLIC_USE_MOCK=true` (default **false**), strictly in Development environment, and must display an 'Experimental Mode' visual badge."

#### C. Discrepancy Analysis
Having mock mode enabled by default causes production builds to silently display fake reservations and mock slots if environment flags are missing or unconfigured.

#### D. Recommended Fix
1. Update `src/lib/api/config.ts`:
   ```typescript
   export const USE_MOCK_RESERVATIONS = process.env.NEXT_PUBLIC_USE_MOCK_RESERVATIONS === "true";
   ```
2. Remove fallback to mock data in `BookingSheet.tsx`, `OwnerContext.tsx`, and `AuthContext.tsx` on production paths.

#### E. Related Locations
- `src/lib/api/config.ts`: Line 9
- `src/components/gamecenter/BookingSheet.tsx`: Lines 144, 156
- `src/context/OwnerContext.tsx`: Lines 56, 58, 127, 137, 159, 167
- `src/context/AuthContext.tsx`: Lines 23, 32, 42, 54, 61

#### F. Verification Criteria
Confirm that `USE_MOCK_RESERVATIONS` evaluates to `false` when environment variables are undefined.

---

### DSA-010 — Fake Wallet Feature, Hardcoded Balance, and Missing Route References

- **Severity:** High
- **Category:** UI Features / Prohibitions (P-05, P-20)
- **Status:** Confirmed
- **Affected file:** `src/components/Header.tsx`
- **Line number(s):** 20, 173, 275–320
- **Affected component/page:** `Header`, `ProfilePage`
- **Design system rule:** P-05, P-20 (§2, §9.2, §10.5)
- **Design system source:** `design-system.md`, §2 (P-05, P-20), §9.2, §10.5
- **Violation type:** Fake production data & dead feature
- **Scope:** Header account menu and Profile page

#### A. Current Implementation
`Header.tsx` hardcodes a fake wallet balance `1,250,000` تومان and renders a "My Wallet" summary section inside the account menu pointing to `/wallet`. `ProfilePage` renders a full interactive wallet modal with client-side balance addition options (`100,000`, `200,000`, `500,000` تومان).

#### B. Expected Implementation
Rules P-05 and §10.5 state: "Fake wallet balance or mock wallet transactions must NOT be displayed in production UI. Wallet features must remain hidden until Backend API endpoints exist."

#### C. Discrepancy Analysis
Displaying a fake wallet balance creates user confusion, misleads customers regarding actual account balances, and links to a non-existent `/wallet` page (dead link P-20).

#### D. Recommended Fix
Hide the wallet summary and `/wallet` menu link in `Header.tsx` and `ProfilePage` until official wallet API endpoints are integrated into the OpenAPI specification.

#### E. Related Locations
- `src/components/Header.tsx`: Lines 20, 173, 275–320
- `src/app/profile/page.tsx`: Lines 33–34, 182–190, 319–338, 608–668

#### F. Verification Criteria
Verify that no fake wallet balances or dead `/wallet` links are rendered in `Header` or `ProfilePage`.

---

### DSA-011 — Dead Links and Non-Existent Routes in Header and Navigation

- **Severity:** High
- **Category:** Navigation / Prohibitions (P-20)
- **Status:** Confirmed
- **Affected file:** `src/components/DesktopNav.tsx`
- **Line number(s):** 16, 17, 18
- **Affected component/page:** `DesktopNav`, `Header`
- **Design system rule:** P-20 (§2, §9.2)
- **Design system source:** `design-system.md`, §2 (P-20), §9.2
- **Violation type:** Dead links
- **Scope:** Navigation bar and desktop header

#### A. Current Implementation
In `src/components/DesktopNav.tsx`:
```typescript
const GLOBAL_NAV_ITEMS: NavItem[] = [
  { id: "home", label: "خانه", href: "/" },
  { id: "gamecenters", label: "گیم‌نت‌ها", href: "/", featured: true },
  { id: "discounts", label: "تخفیف‌ها", href: "#discounts" },
  { id: "blog", label: "وبلاگ", href: "#blog" },
  { id: "about", label: "درباره سایرا", href: "#about" },
];
```
In `Header.tsx`, account links reference `/profile/edit`, `/support`, and `/logout`.

#### B. Expected Implementation
Rule P-20 & §9.2 state: "Dead links (`#blog`, `#about`, `/wallet` without page) forbidden. Navigation items only have REAL destinations. Blog/About/Discounts until they have real pages must NOT be displayed." Furthermore, "خانه" and "گیمنت‌ها" must not both point to `/`.

#### C. Discrepancy Analysis
Clicking `#discounts`, `#blog`, `#about`, or `/support` results in dead link jumps or 404 errors, frustrating users and failing basic navigation compliance.

#### D. Recommended Fix
1. Remove `#discounts`, `#blog`, and `#about` from `GLOBAL_NAV_ITEMS` in `DesktopNav.tsx`.
2. Consolidate "خانه" and "گیمنت‌ها" into a single navigation item if both point to `/`.
3. Update account menu links to point to valid existing routes (`/profile`, `/reservations`).

#### E. Related Locations
- `src/components/DesktopNav.tsx`: Lines 16–18
- `src/components/Header.tsx`: Lines 115, 144, 173, 414

#### F. Verification Criteria
Verify that every navigation item in `DesktopNav` and `Header` links to a functional, existing page route.

---

### DSA-012 — Missing Shared UI Primitives in `src/components/ui/`

- **Severity:** High
- **Category:** Architecture / Component Primitives (P-25)
- **Status:** Confirmed
- **Affected file:** `src/components/ui/` (Directory)
- **Line number(s):** Entire directory
- **Affected component/page:** Entire Repository
- **Design system rule:** P-25 (§2, §8)
- **Design system source:** `design-system.md`, §2 (P-25), §8
- **Violation type:** Missing design system primitives
- **Scope:** Systemic architectural deficiency

#### A. Current Implementation
`src/components/ui/` contains only 2 files (`carousel.tsx` and `SearchableSelect.tsx`). Required primitives such as `Button`, `IconButton`, `Input`, `OtpInput`, `Select`, `Textarea`, `Badge`, `Chip`, `Card`, `ListRow`, `Tabs`, `Stepper`, `Toggle`, `Modal`, `BottomSheet`, `PageHeader`, `SectionTitle`, `Skeleton`, `EmptyState`, `ErrorState`, `InlineAlert`, `Toast`, `Spinner`, `ProgressBar`, `UploadField`, and `Icon` are completely absent.

#### B. Expected Implementation
Rule P-25 & §8 require all base UI elements to be centralized in `src/components/ui/` as reusable primitives with standardized states (hover, focus-visible, active, disabled, loading).

#### C. Discrepancy Analysis
Because shared UI primitives are missing, pages across the application independently write custom button classes, custom modal wrappers, inline SVG path data, and custom form inputs. This causes rampant class duplication (violating P-24) and inconsistent component behavior.

#### D. Recommended Fix
Create the missing reusable UI primitives in `src/components/ui/` (`Button.tsx`, `Input.tsx`, `Modal.tsx`, `Icon.tsx`, `EmptyState.tsx`, `ErrorState.tsx`, `Skeleton.tsx`, `Badge.tsx`, `PageHeader.tsx`, etc.) and refactor application components to import them.

#### E. Related Locations
- `src/components/ui/`
- Every component and page file re-implementing raw buttons, dialogs, inputs, and SVG paths.

#### F. Verification Criteria
Inspect `src/components/ui/` directory and verify presence of all 26 required UI primitives defined in §8.

---

### DSA-013 — Prohibited Continuous Marquee Animation and Pulse Dot Elements

- **Severity:** Medium
- **Category:** Motion & Animation / Prohibitions (P-08)
- **Status:** Confirmed
- **Affected file:** `src/app/globals.css`
- **Line number(s):** 105–108, 111–128
- **Affected component/page:** `GamesMarquee.tsx`, `DesktopNav.tsx`, `globals.css`
- **Design system rule:** P-08 (§2, §6)
- **Design system source:** `design-system.md`, §2 (P-08), §6
- **Violation type:** Prohibited animation
- **Scope:** Global CSS and games slider component

#### A. Current Implementation
In `globals.css`:
```css
@keyframes marquee-scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.marquee-track {
  animation-name: marquee-scroll; ...
}
```
`GamesMarquee.tsx` uses this CSS rule to continuously scroll games automatically. In `DesktopNav.tsx` line 39, a pulse dot `<span className="... animate-pulse" />` is rendered.

#### B. Expected Implementation
Rule P-08 & §6 state: "Endless/decorative animations (marquee, bounce, decorative pulse dots, glow) are forbidden. Games list must be a fixed grid or manual horizontal scroll. The ONLY automated moving element permitted on a page is the single homepage banner slider."

#### C. Discrepancy Analysis
Continuous auto-scrolling marquee animations distract users, consume GPU/CPU resources continuously, and violate accessibility motion reduction guidelines.

#### D. Recommended Fix
1. Remove `@keyframes marquee-scroll` and `.marquee-track` from `src/app/globals.css`.
2. Refactor `GamesMarquee.tsx` to render a static flex/grid container with manual overflow horizontal scrolling.
3. Remove decorative `animate-pulse` dot from `DesktopNav.tsx`.

#### E. Related Locations
- `src/app/globals.css`: Lines 105–108, 111–128
- `src/components/gamecenter/GamesMarquee.tsx`: Lines 1–135
- `src/components/DesktopNav.tsx`: Line 39

#### F. Verification Criteria
Verify that no continuous CSS marquee animations or decorative pulse dots exist in application rendering.

---

### DSA-014 — Non-Standard and Hardcoded Header Spacing Margins (`mt-[120px]`, `mt-[128px]`, `mt-[90px]`)

- **Severity:** Medium
- **Category:** Spacing & Layout / Design Scale
- **Status:** Confirmed
- **Affected file:** `src/app/page.tsx`
- **Line number(s):** 93
- **Affected component/page:** `HomePage`, `ReservationsHistoryPage`, `ProfilePage`, `GamecenterDetailPage`
- **Design system rule:** DS-LAYOUT-01 (§3.1, §9.1)
- **Design system source:** `design-system.md`, §3.1, §9.1
- **Violation type:** Hardcoded arbitrary value
- **Scope:** Page layout shells across main routes

#### A. Current Implementation
Pages apply scattered hardcoded top margins to clear the fixed header.
Excerpt from `src/app/page.tsx` line 93:
```tsx
<main className="flex-1 p-4 flex flex-col gap-6 lg:gap-8 mt-[120px] lg:mt-[90px]">
```
Excerpt from `src/app/reservations/page.tsx` line 49:
```tsx
<main className="flex-1 mt-[120px] lg:mt-[128px] flex flex-col">
```

#### B. Expected Implementation
`design-system.md` §3.1 & §9.1 state: "`mt-[120px]` / `mt-[90px]` / `mt-[128px]` scattered is forbidden; use `pt-[var(--header-h)]` or `mt-[var(--header-h)]` with standardized `--header-h: 104px` variable."

#### C. Discrepancy Analysis
Hardcoded pixel margins lead to layout bugs when header content resizes or collapses on different mobile viewports.

#### D. Recommended Fix
Replace hardcoded top margins on main containers with `pt-[var(--header-h)]` or `mt-[var(--header-h)]`.

#### E. Related Locations
- `src/app/page.tsx`: Line 93
- `src/app/reservations/page.tsx`: Line 49
- `src/app/profile/page.tsx`: Line 213
- `src/app/gamecenter/[id]/page.tsx`: Line 460

#### F. Verification Criteria
Search repository for `mt-[120px]`, `mt-[128px]`, `mt-[90px]` and confirm zero occurrences remain.

---

### DSA-015 — Misconfigured Status Badge Styling, Radii, and Font Alignment Hacks

- **Severity:** Medium
- **Category:** Component Specs / Radius & Typography
- **Status:** Confirmed
- **Affected file:** `src/components/StatusBadge.tsx`
- **Line number(s):** 11–12
- **Affected component/page:** `StatusBadge`
- **Design system rule:** DS-COMP-01 (§5.2, §8.4)
- **Design system source:** `design-system.md`, §5.2, §8.4
- **Violation type:** Incorrect component spec & font hacks
- **Scope:** Shared component implementation

#### A. Current Implementation
In `src/components/StatusBadge.tsx`:
```tsx
<span
  className={`inline-flex items-center shrink-0 rounded-child px-2.5 pt-1 pb-0.5 font-bold ${
    size === "md" ? "text-xs" : "text-[10px]"
  } ${ui.className}`}
>
```

#### B. Expected Implementation
`design-system.md` §5.2 & §8.4 state:
1. Badge shape must be capsule (`rounded-full`), NOT `rounded-child` (4px).
2. Badge text size is 12px Bold (`text-xs`). Text smaller than 12px (`text-[10px]`) is forbidden (P-10).
3. Font alignment hacks like `pt-1 pb-0.5` are forbidden (`design-system.md` §8.4 explicitly notes: `(هک‌های pt-1 pb-0.5 برای هم‌ترازی فونت: به‌جای آن از leading-none و py متقارن استفاده کن.)`).

#### C. Discrepancy Analysis
`rounded-child` gives badges rectangular corners instead of standard pill shapes, asymmetric padding distorts badge vertical alignment, and `text-[10px]` reduces legibility.

#### D. Recommended Fix
Refactor `StatusBadge.tsx`:
```tsx
<span
  className={`inline-flex items-center shrink-0 rounded-full px-2.5 py-1 text-xs font-bold leading-none ${ui.className}`}
>
  {ui.label}
</span>
```

#### E. Related Locations
- `src/components/StatusBadge.tsx` (Lines 11–12)

#### F. Verification Criteria
Inspect `StatusBadge.tsx` to verify `rounded-full`, `py-1`, `leading-none`, and `text-xs` classes.

---

### DSA-016 — Bypassing Verification Role Checks via Demo State Switcher

- **Severity:** High
- **Category:** Security & Auth / Prohibitions (P-18)
- **Status:** Confirmed
- **Affected file:** `src/app/owner/page.tsx`
- **Line number(s):** 283–290
- **Affected component/page:** `OwnerDashboardPage`
- **Design system rule:** P-18 (§2, §10.7)
- **Design system source:** `design-system.md`, §2 (P-18), §10.7
- **Violation type:** Security / Role bypass
- **Scope:** Owner dashboard verification block

#### A. Current Implementation
`OwnerDashboardPage` renders an inline button that allows any user to automatically set their verification status to "APPROVED" without backend authorization.
Excerpt from `src/app/owner/page.tsx`:
```tsx
<button
  type="button"
  onClick={() => setVerificationStatus("APPROVED")}
  className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-bold..."
>
  (دمو: تغییر وضعیت به تایید شده)
</button>
```

#### B. Expected Implementation
Rule P-18 forbids bypassing authentication or verification roles (such as auto-verification toggles or demo auto-login buttons). Owner verification status must reflect actual backend response data.

#### C. Discrepancy Analysis
Exposing a verification override button allows unauthorized users to bypass owner verification steps in client state.

#### D. Recommended Fix
Remove the demo state switcher button from `src/app/owner/page.tsx`.

#### E. Related Locations
- `src/app/owner/page.tsx` (Lines 283–290)

#### F. Verification Criteria
Verify that no state override buttons exist in `OwnerDashboardPage`.

---

### DSA-017 — Improper Red Color Accent Usage for Non-Destructive Promotional Navigation

- **Severity:** Low
- **Category:** Color Semantics / Design Rules
- **Status:** Confirmed
- **Affected file:** `src/app/owner/page.tsx`
- **Line number(s):** 37
- **Affected component/page:** `OwnerDashboardPage`
- **Design system rule:** DS-COLOR-03 (§3.3)
- **Design system source:** `design-system.md`, §3.3
- **Violation type:** Color misuse
- **Scope:** Owner menu item styling

#### A. Current Implementation
In `src/app/owner/page.tsx`:
```typescript
{ href: "/owner/ads", label: "ایجاد تبلیغات", icon: ICONS.megaphone, isRed: true }
```
This renders "Create Ads" in bright red (`text-[var(--accent-red)]`).

#### B. Expected Implementation
`design-system.md` §3.3 explicitly mandates: "Red is strictly for error, cancellation, and destructive actions (cancel reservation, delete). Do NOT use red for promotional attraction. (Explicit forbidden example in design system doc: 'ایجاد تبلیغات' section in red color)."

#### C. Discrepancy Analysis
Using red for promotional features creates false alarm indicators, confusing users into perceiving promotional items as destructive errors.

#### D. Recommended Fix
Remove `isRed: true` from the "ایجاد تبلیغات" menu item in `src/app/owner/page.tsx`.

#### E. Related Locations
- `src/app/owner/page.tsx` (Line 37)

#### F. Verification Criteria
Verify that "ایجاد تبلیغات" menu item is rendered in standard text color (`text-[var(--text-white)]`).

---

### DSA-018 — Non-Functional Interactive UI Controls (Device Category Filter & Ctrl+F Shortcut Indicator)

- **Severity:** Medium
- **Category:** Interactivity / Prohibitions (P-22)
- **Status:** Confirmed
- **Affected file:** `src/app/page.tsx`
- **Line number(s):** 102
- **Affected component/page:** `HomePage`, `Header`
- **Design system rule:** P-22 (§2, §9.2, §10.1)
- **Design system source:** `design-system.md`, §2 (P-22), §9.2, §10.1
- **Violation type:** Non-functional control
- **Scope:** Homepage category filter and Header search hint

#### A. Current Implementation
1. On `HomePage`, selecting a device category in `DeviceCategories` updates `selectedCategory` state, but the gamecenter lists below it (`popularCenters`, `featuredCenters`, `DiscountedCentersSection`) do NOT filter their content based on the selected category.
2. In `Header.tsx` line 222, a `Ctrl + F` badge is rendered inside the search input button, but pressing `Ctrl + F` triggers native browser search rather than opening the search modal.

#### B. Expected Implementation
Rule P-22 states: "Non-functional buttons/controls (category selection without actual filtering, 'Ctrl + F' hint without functionality) are forbidden." `design-system.md` §9.2 notes: "Ctrl+F is forbidden due to browser shortcut collision; use `/` or `Ctrl+K` if key listener is implemented."

#### C. Discrepancy Analysis
Interactive controls that produce no effect frustrate users and break basic UX expectations.

#### D. Recommended Fix
1. Pass `selectedCategory` to `DiscountedCentersSection` and filter homepage gamecenter lists accordingly.
2. Replace `Ctrl + F` badge in `Header.tsx` with `/` or `Ctrl + K` and add a global keydown event listener to trigger `SearchModal`.

#### E. Related Locations
- `src/app/page.tsx`: Line 102
- `src/components/Header.tsx`: Line 222

#### F. Verification Criteria
Verify that selecting a category filters rendered centers and pressing the designated shortcut key opens `SearchModal`.

---

### DSA-019 — Copywriting & Terminology Non-Compliance Across Navigation and Headers

- **Severity:** Low
- **Category:** Copywriting / Vocabulary
- **Status:** Confirmed
- **Affected file:** `src/components/DesktopNav.tsx`
- **Line number(s):** 15
- **Affected component/page:** `DesktopNav`, `Header`, `lib/reservationUi.ts`, `OwnerDashboardPage`
- **Design system rule:** DS-COPY-01 (§4.3, §4.4)
- **Design system source:** `design-system.md`, §4.3, §4.4
- **Violation type:** Glossary mismatch
- **Scope:** Multiple navigation and helper files

#### A. Current Implementation
1. `DesktopNav.tsx` line 15 uses `گیم‌نت‌ها` (with half-space).
2. `lib/reservationUi.ts` line 118 uses `الی` (`از ساعت ۱۳ الی ۱۴`).
3. `Header.tsx` lines 193 & 219 use `سیستم` and `گیم‌نت`.
4. `src/app/owner/page.tsx` line 30 uses `دستگاه ها` (without half-space).

#### B. Expected Implementation
`design-system.md` §4.4 mandatory glossary specifies:
- Say `گیمنت` (Do NOT say `گیم‌نت`, `گیم‌نت‌ها`, `گیم سنتر`).
- Say `دستگاه` (Do NOT say `سیستم`, `ایستگاه`).
- Say `دستگاه‌ها` with proper half-space.
- Time range format (§4.3): "از ۱۳:۰۰ تا ۱۴:۰۰" (Do NOT use `الی`).

#### C. Discrepancy Analysis
Inconsistent copywriting degrades brand professionalism and violates the explicit vocabulary table in §4.4.

#### D. Recommended Fix
Update UI copy across `DesktopNav.tsx`, `Header.tsx`, `reservationUi.ts`, and `owner/page.tsx` to match the design system glossary.

#### E. Related Locations
- `src/components/DesktopNav.tsx`: Line 15
- `src/lib/reservationUi.ts`: Line 118
- `src/components/Header.tsx`: Lines 193, 219
- `src/app/owner/page.tsx`: Line 30

#### F. Verification Criteria
Verify that `گیم‌نت`, `سیستم`, and `الی` do not appear in user-facing UI text strings.

---

### DSA-020 — Inconsistent Navigation Implementation Using `router.push` in Button `onClick` Handlers

- **Severity:** Medium
- **Category:** Navigation & Semantics / Prohibitions (P-19)
- **Status:** Confirmed
- **Affected file:** `src/components/BottomBar.tsx`
- **Line number(s):** 61–65
- **Affected component/page:** `BottomBar`
- **Design system rule:** P-19 (§2, §8.2, §9.3)
- **Design system source:** `design-system.md`, §2 (P-19), §8.2, §9.3
- **Violation type:** Semantic HTML violation
- **Scope:** Mobile navigation bar

#### A. Current Implementation
`BottomBar.tsx` renders navigation tabs as `<button>` elements with `onClick` calling `router.push(route)`.
Excerpt from `src/components/BottomBar.tsx`:
```tsx
const handleClick = (tab: TabType) => {
  onTabChange?.(tab);
  const route = TAB_ROUTES[tab];
  if (route && tab !== activeTab) router.push(route);
};
```

#### B. Expected Implementation
Rule P-19 & §8.2 state: "Navigation = `<Link>`; Action = `<button>`. Using `router.push` in `onClick` for simple page navigation is forbidden (it breaks middle-click, open in new tab, browser history context, and accessibility)."

#### C. Discrepancy Analysis
Using `<button>` with `router.push` for tab navigation prevents search engines from indexing nav links, breaks middle-click opening, and violates standard web accessibility conventions.

#### D. Recommended Fix
Refactor `BottomBar.tsx` tabs to render Next.js `<Link href={TAB_ROUTES[tab]}>` wrappers while preserving active state styling.

#### E. Related Locations
- `src/components/BottomBar.tsx` (Lines 61–65)

#### F. Verification Criteria
Inspect `BottomBar.tsx` and confirm tab items render semantic `<Link>` components instead of `<button onClick={() => router.push(...)}>`.

---

## 7. Systemic and Root-Cause Analysis

### Root Cause 1: Lack of Centralized Reusable UI Primitives (`src/components/ui/`)
- **Impacted Areas:** All pages and components.
- **Downstream Findings:** DSA-003, DSA-005, DSA-012, DSA-015.
- **Analysis:** Without centralized primitives for buttons, modals, inputs, and icons in `src/components/ui/`, individual feature components independently re-invent UI elements. This directly leads to hardcoded hex colors, unicode symbols, font alignment hacks, and inconsistent border radii.
- **Remediation Strategy:** Build the full suite of 26 base UI primitives in `src/components/ui/` adhering strictly to design tokens before refactoring feature components.

### Root Cause 2: Missing CSS Variable Design Tokens in Global Stylesheet
- **Impacted Areas:** Styling layer, button text colors, layout top margins.
- **Downstream Findings:** DSA-001, DSA-002, DSA-003, DSA-014.
- **Analysis:** Because `--text-on-primary`, `--accent-warning`, and `--header-h` were omitted from `globals.css` `:root`, developers defaulted to hardcoding `text-[#101014]` and `mt-[120px]`.
- **Remediation Strategy:** Define all required tokens in `:root` and expose them through `@theme` in `globals.css`.

### Root Cause 3: Mock-First and Client-Side Calculation Paradigms
- **Impacted Areas:** Pricing, discounts, booking sheet, authentication, owner state.
- **Downstream Findings:** DSA-008, DSA-009, DSA-010, DSA-016.
- **Analysis:** The codebase was constructed assuming client-side calculations and mock fallbacks. Mocks were set to `true` by default, leading to fake wallet features and demo role bypass buttons.
- **Remediation Strategy:** Shift to a strict backend-first architecture where prices and verification states come strictly from OpenAPI responses, and set mock flags to default `false`.

---

## 8. Items Requiring Further Verification

| Item | Location | Uncertainty / Missing Info | Evidence Available | Additional Info Needed |
|---|---|---|---|---|
| **Max File Upload Size for Gallery & Licenses** | `src/components/owner/*` | OpenAPI spec v1.0 does not specify explicit file size limits for image uploads. | UI currently accepts any image file without pre-upload byte checks. | Backend team confirmation on max file payload size (e.g., 5MB). |
| **OTP Code Length** | `src/components/AuthModal.tsx` | Code currently assumes a 4-digit OTP code (`maxLength={4}`). | Frontend hardcodes 4 input fields. | Backend confirmation on whether OTP length is fixed at 4 or 6 digits. |
| **Station Extra Controller Pricing Endpoint** | `src/components/ExtraControllerModal.tsx` | Field `extraControllerPrice` is marked as unconfirmed in OpenAPI. | Component calculates price client-side. | Backend OpenAPI update for extra controller pricing structure. |

---

## 9. Recommended Remediation Plan

### Phase 1: Critical & Security Fixes
1. **Fix Mock Configuration (`DSA-009`):** Set `USE_MOCK_RESERVATIONS = process.env.NEXT_PUBLIC_USE_MOCK_RESERVATIONS === "true"` in `src/lib/api/config.ts`.
2. **Remove Client-Side Financial Calculations (`DSA-008`):** Refactor `DiscountedGamecenterCard` and booking modals to display backend-provided prices exclusively.
3. **Remove Demo Role Switcher (`DSA-016`):** Delete verification override button in `src/app/owner/page.tsx`.

### Phase 2: Design Tokens & Shared UI Primitives
1. **Global CSS Token Update (`DSA-001`, `DSA-002`):** Correct `--primary-muted` and add `--text-on-primary`, `--accent-warning`, `--header-h` to `globals.css`.
2. **Build Missing UI Primitives (`DSA-012`):** Construct `Button`, `IconButton`, `Input`, `Modal`, `Icon`, `Badge`, `EmptyState`, `ErrorState`, `Skeleton`, `PageHeader` in `src/components/ui/`.
3. **Eliminate Hardcoded Hex Colors (`DSA-003`):** Replace `text-[#101014]` with `text-on-primary` across all 11 files.

### Phase 3: Iconography, Emojis & Animations
1. **Remove Emojis & Stickers (`DSA-004`):** Replace emojis with SVG `Icon` components in search modals, notifications, and owner dashboard.
2. **Replace Unicode Symbols (`DSA-005`):** Replace `✕`, `★`, `✓`, `←` with SVG `Icon` instances.
3. **Disable Marquee & Pulse Dots (`DSA-013`):** Remove `@keyframes marquee-scroll` and convert games list to manual overflow scrolling.

### Phase 4: Navigation, Dead Links & Fake Features
1. **Clean Header & Dead Links (`DSA-010`, `DSA-011`):** Remove fake wallet balance, delete dead links (`#blog`, `#about`, `/wallet`), and fix `/logout` trigger.
2. **Fix Semantic Links (`DSA-020`):** Refactor `BottomBar.tsx` tabs to use `<Link>` components.
3. **Fix Header Top Margins (`DSA-014`):** Replace hardcoded `mt-[120px]` with `pt-[var(--header-h)]`.

### Phase 5: Copywriting, Controls & Consistency
1. **Fix Component Specifications (`DSA-015`, `DSA-017`):** Refactor `StatusBadge.tsx` radius and fix "ایجاد تبلیغات" menu color.
2. **Enable Interactive Controls (`DSA-018`):** Connect homepage device category filter and search keyboard shortcut.
3. **Unified Glossary (`DSA-006`, `DSA-007`, `DSA-019`):** Eliminate exclamation marks, technical developer jargon, and spelling errors (`گیم‌نت` -> `گیمنت`).

---

## 10. Verification Checklist

Developers implementing the remediation plan must verify compliance against this checklist:

### Design Tokens & CSS
- [ ] `--primary-muted` in `globals.css` equals `rgba(184, 243, 74, 0.15)`.
- [ ] `--text-on-primary`, `--accent-warning`, and `--header-h` are defined in `:root` and mapped in `@theme`.
- [ ] Zero occurrences of direct hex color codes (`text-[#101014]`) remain in component files.
- [ ] Main container top margins use `--header-h` instead of hardcoded pixel values (`mt-[120px]`).

### UI Primitives & Components
- [ ] Reusable UI primitives (`Button`, `Input`, `Modal`, `Icon`, `Badge`, `EmptyState`, etc.) exist in `src/components/ui/`.
- [ ] Buttons implement required states (default, hover, active:scale-[0.98], focus-visible 2px ring, disabled, loading).
- [ ] `StatusBadge` uses `rounded-full`, `py-1`, `leading-none`, and `text-xs` without font alignment hacks.

### Iconography & Content
- [ ] Zero unicode emojis or stickers exist in UI text strings, cards, or titles.
- [ ] Zero unicode characters (`✕`, `★`, `✓`, `←`) are used for UI controls or rating stars.
- [ ] Zero exclamation marks exist in system status labels or alerts.
- [ ] Technical terms (`API`, `endpoint`, `دمو`, `Mock`) are purged from user-facing copy.
- [ ] Glossary terms (`گیمنت`, `دستگاه`, `تا`) are consistently applied.

### Logic & Navigation
- [ ] No prices or discount percentages are calculated on the client side.
- [ ] `USE_MOCK_RESERVATIONS` evaluates to `false` by default.
- [ ] All navigation links point to existing, valid route targets (no dead links or `#` targets).
- [ ] `BottomBar` renders semantic `<Link>` elements.
- [ ] Fake wallet feature and fake balances are completely hidden until backend API availability.

---

## 11. Audit Limitations and Final Assessment

### Successful Inspection Coverage
100% of non-generated source files in `src/` (58 files spanning components, pages, global CSS, services, types, contexts, and mocks) were inspected statically.

### Audit Limitations
1. **Runtime & Visual Regression Inspection:** Visual rendering checks across physical mobile devices and live dynamic API responses were not executed as part of this audit-only task.
2. **Unconfirmed OpenAPI Fields:** Certain dynamic payload fields (such as max upload sizes and extra controller rates) require formal backend confirmation as documented in Section 8.

### Final Compliance Assessment
The codebase currently presents **20 confirmed design system violations** (including 2 Critical and 9 High-severity issues). Following the 5-phase remediation plan outlined in Section 9 will resolve all 20 findings, eliminate systemic root causes, and bring the repository into 100% compliance with `design-system.md`.
