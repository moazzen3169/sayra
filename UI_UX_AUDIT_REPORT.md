# Comprehensive UI/UX, Accessibility, CRO & QA Audit Report — ابزارمارکت (AbzarMarket)

**Target URL:** `http://localhost:3000`  
**Audit Date:** 2026-11-22  
**Audit Mode:** Real Browser Interaction (`1440×900` Desktop, `768×1024` Tablet, `390×844` Mobile)  
**Scope & Constraints:** Non-destructive interactive inspection across all accessible routes. Source code was not modified. Programmatic DOM/Web-Vitals JS evaluation (`page.evaluate` / Lighthouse) and exact computed contrast ratios were unavailable in the browser sandbox, and authenticated/real payment submissions were not executed per audit rules.

---

## 1. Executive Summary

**ابزارمارکت (AbzarMarket)** is a Persian RTL (`lang="fa"`, `dir="rtl"`) Next.js e-commerce storefront for industrial and semi-industrial tools, adhesives, drills, and workshop safety equipment. The site demonstrates a solid structural foundation—zero JavaScript console errors, zero horizontal overflow across desktop, tablet, and mobile viewports, working search autocomplete, functional product attribute/discount filtering on `/products?has_discount=true`, and a responsive slide-over cart drawer.

However, the storefront currently suffers from **critical conversion, content, and usability blockers** that prevent it from functioning as a production-ready retail experience:
- **Zero product or banner photographs** (`0` `<img>` tags site-wide; all visuals render as grey text placeholder boxes).
- **A broken `404` CTA** on the homepage's primary promotional section ("پیشنهادهای شگفت‌انگیز" → `/offers`).
- **A broken footer discount filter** (`/products?discount=true` returns all 50 unfiltered products instead of the 17 discounted items).
- **Leftover template branding and placeholder trust elements** (`info@mepusham.ir` on `/contact`, `۰۲۱-۱۲۳۴۵۶۷۸`, and `اینماد / مجوز (جایگاه نماد)` in the footer).
- **Widespread `"تومان"` currency clipping** (`"توما"` / wrapped `"ن"`) and **mobile PDP sticky bar overlap** covering variant labels.
- **Accessibility defects** including `0` `<h1>` tags on the homepage, nested `<main>` landmarks on `/checkout`, nested `<button>` elements on the PDP, `36/60` mobile touch targets under `44×44px`, and a keyboard-stuck search autocomplete popover.

| Metric | Score |
| :--- | :---: |
| **Current Overall UI/UX Score** | **52 / 100** |
| **Expected Score After P0–P3 Improvements** | **88 / 100** |

---

## 2. Overall UI/UX Score (0–100)

**Overall Weighted Score: `52.1 / 100` (52 / 100)**

The site is structurally functional at the framework level but is held back by unfinished placeholder content, broken promotional/navigation links, and mobile/accessibility polish gaps.

---

## 3. Category-by-Category Scores

| Category | Weight | Score (0–100) | Weighted Points | Evidence-Based Rationale |
| :--- | :---: | :---: | :---: | :--- |
| **Visual Design** | 20% | **48** | 9.60 | Clean RTL Peyda typography and cohesive palette, but `0` real images site-wide, `"تومان"` currency clipping, mixed Persian/English numerals, leftover `mepusham.ir` copy, and raw URL `<title>` tags. |
| **User Experience & Usability** | 25% | **54** | 13.50 | Search autocomplete, PDP variant SKU switching, and cart drawer work well; penalized heavily by `/offers` 404, broken `/products?discount=true`, auth-gated FAQs/guides, empty `/contact` form, and stuck search popover on Tab. |
| **Responsive Design** | 15% | **62** | 9.30 | `0px` horizontal overflow at `1440×900`, `768×1024`, and `390×844` plus a clean mobile filter drawer; penalized by mobile PDP sticky bar overlap, clipped search placeholder, missing mobile hamburger menu, and 3+2 tablet category wrapping. |
| **Accessibility** | 15% | **46** | 6.90 | Proper `lang="fa" dir="rtl"`, homepage landmarks, and labeled `/account` inputs; penalized by `0` `<h1>` on `/`, nested `<main>` on `/checkout`, nested `<button>` on PDP, `49–54` empty links, `36/60` undersized mobile touch targets, and stuck search popover. |
| **Conversion Optimization (CRO)** | 15% | **42** | 6.30 | Good free-shipping banner and PDP trust icons, but `0` product photos, `404` on `/offers`, placeholder Enamad box, `info@mepusham.ir` email, and login-gated FAQs severely erode buyer trust. |
| **Performance & Technical UX** | 10% | **65** | 6.50 | `0` console errors and fast base routes (`396–1165 ms`); penalized by Next.js dev-mode `"Compiling..."` delays (up to `3091 ms` on PDP), skeleton flash on `/products`, and `404` on `/offers`. |
| **Total** | **100%** | — | **52.10** | **Final Score: 52 / 100** |

---

## 4. Website Strengths

1. **Zero Console Errors & Clean Base Routing:** All core routes (`/`, `/products`, `/blog`, `/contact`, `/account`, `/terms`, `/privacy`, `/checkout`) returned `HTTP 200` with zero JS console errors.
2. **Zero Horizontal Overflow Across All Viewports:** Desktop (`1440×900`), Tablet (`768×1024`), and Mobile (`390×844`) all measured `0px` horizontal overflow.
3. **Responsive Search Autocomplete:** Typing `"دریل"` in the header search combobox immediately surfaces 5 relevant suggestions and navigates cleanly to `/products?q=دریل`.
4. **Functional PDP Variant Selection & Cart Drawer:** Switching motor power variants (`650W` → `850W` → `1100W`) on `/products/bosch-gsb-16-re-hammer-drill` dynamically updates the SKU (`BSH-DRL16-BLU-850W`). Adding/removing items updates the slide-over cart drawer and header counter in real time.
5. **Mobile Filter Drawer:** On `390×844`, the `/products` `"فیلترها"` drawer opens cleanly with category, brand, price range, and stock/discount filters.
6. **Live Phone Input Validation:** `/account` provides immediate inline digit-count and `09...` prefix feedback on phone entry.

---

## 5. Critical Issues

| ID | Issue | Affected Page & Component | Observed Evidence |
| :--- | :--- | :--- | :--- |
| **C-01** | **Broken Promotional CTA (`404 Not Found`)** | Homepage (`/`) → Amazing Offers ("پیشنهادهای شگفت‌انگیز") `"مشاهده همه محصولات"` CTA | Clicking/navigating to `/offers` returns `HTTP 404 Not Found`. |
| **C-02** | **Zero Product & Banner Images Site-Wide** | All pages (`/`, `/products`, PDP, Cart Drawer, `/blog`) | `0` `<img>` elements exist across the site. All hero banners, category cards, product cards, cart thumbnails, and blog thumbnails render as grey text boxes. |
| **C-03** | **Broken Footer Discount Filter** | Footer → `"تخفیف‌ها"` (`/products?discount=true`) | Top nav `"تخفیف دارها"` (`/products?has_discount=true`) filters to 17 items, whereas footer `/products?discount=true` ignores the parameter and shows all 50 products. |
| **C-04** | **Pre-Purchase FAQs & Buying Guides Blocked by Auth Gate** | Footer / Header → `/support?tab=guides` & `/support?tab=faqs` | Both routes redirect guest users to `/account/support` login screen, preventing prospective buyers from reading FAQs or buying guides. |

---

## 6. High Priority Issues

| ID | Issue | Affected Page & Component | Observed Evidence |
| :--- | :--- | :--- | :--- |
| **H-01** | **Currency Label `"تومان"` Clipped / Wrapped** | Product cards (`/` & `/products`), Cart Drawer, PDP main price, Mobile PDP sticky bar | Fixed-width or `overflow: hidden` price containers clip `"تومان"` to `"توما"` or wrap `"ن"` onto a new line. |
| **H-02** | **Leftover Template Email & Placeholder Trust Elements** | `/contact` & Global Footer | `/contact` displays `info@mepusham.ir` (unrelated clothing brand) and `۰۲۱-۱۲۳۴۵۶۷۸` with `0` form inputs. Footer displays `اینماد / مجوز (جایگاه نماد)`. |
| **H-03** | **Mobile PDP Sticky Bar Overlaps Content** | Mobile (`390×844`) PDP (`/products/bosch-gsb-16-re-hammer-drill`) | Sticky bottom add-to-cart bar overlaps/clips `"توان موتور: ۶۵۰ وات"`, truncates `"رنگ بدنه: آبی صنعتی | ت..."`, and clips `"تومان"` to `"توما"`. |
| **H-04** | **Search Autocomplete Stuck Open on Keyboard `Tab`** | Global Header → Search Combobox | Tabbing out of the search input leaves `"پیشنهادهای محبوب"` popover open, obscuring the navigation bar and hero section. |
| **H-05** | **Missing Mobile Navigation Menu for Secondary Pages** | Mobile (`390×844`) Header & Bottom Tab Bar | Top nav is hidden and replaced with a 4-item bottom bar (`خانه`, `محصولات`, `سفارش‌ها`, `حساب کاربری`), leaving `وبلاگ`, `تماس با ما`, `تخفیف دارها`, and `قوانین` unreachable except via the page footer. |
| **H-06** | **Invalid HTML Landmarks & Nested Interactive Elements** | `/checkout` (`<main>` inside `<main>`), PDP (nested `<button>` inside zoom `<button>`), Homepage (`0` `<h1>` tags) | Breaks assistive technology navigation and violates WCAG 2.1 landmark/interactive element rules. |

---

## 7. Medium and Low Priority Issues

### Medium Priority
- **M-01 — Raw URL `<title>` Tags:** `/`, `/products`, `/blog`, `/contact`, `/account`, `/account/orders`, `/account/support`, `/terms`, `/privacy`, and `/checkout` display raw URLs (`localhost:3000`, `localhost:3000/products`, etc.) instead of localized Persian SEO titles.
- **M-02 — Oversized Grey Banner Above `/products` Grid:** Pushes the `<h1>` (`"همه محصولات"`) and product cards partially/mostly below the fold on desktop and mobile.
- **M-03 — Mobile Search Placeholder Clipped:** Header input truncates `"جستجوی ابزار، چسب، دری"` at `390px` width.
- **M-04 — Tablet (`768px`) Asymmetric 3+2 Category Grid & No Tablet Menu:** Desktop navbar remains active at `768px`, and 5 category cards wrap into 3 on row 1 + 2 on row 2.
- **M-05 — Disabled-State Visual Ambiguity on `/account`:** `"دریافت کد تأیید"` has `isDisabled() === false` and solid dark navy styling even when the phone field is empty or invalid.
- **M-06 — Cart Drawer Checkout Uses `<button>` Instead of `<a>`:** `"ادامه و پرداخت"` is a button rather than a semantic link, preventing standard link behaviors (open in new tab, keyboard/screen-reader link hints).

### Low Priority
- **L-01 — Mixed Persian & English Numerals:** Header cart badge uses English `"0"`/`"1"` while drawer uses `"۱ کالا"`; PDP badge shows `"٪ 13 تخفیف"`; `/account` validation shows `"تعداد ارقام: 4 از ۱۱..."`.
- **L-02 — Placeholder Text Padding on Narrow Mobile Cards:** On `390×844` `/products`, grey box title text touches card borders.
- **L-03 — Next.js Dev Badge Overlap:** Development `N` indicator overlaps `"حساب کاربری"` in the mobile bottom tab bar (resolved in production builds, but worth noting in dev QA).
- **L-04 — Unfeedbacked Empty Search Submission:** Pressing Enter on an empty search bar stays on `/` with no prompt or focus cue.

---

## 8. Desktop, Tablet and Mobile Findings

| Viewport | Dimensions | Horizontal Overflow | Key Observations |
| :--- | :---: | :---: | :--- |
| **Desktop** | `1440×900` | `0px` (`1424.8px` width) | Full header (`190.8px` tall) with mega-menu; sticky header overlaps scroll targets; `49–54` hidden empty `<a href="">` tags in DOM; search popover blocks nav on Tab. |
| **Tablet** | `768×1024` | `0px` (`752.8px` width) | Desktop navbar remains visible without hamburger collapse; 5 category cards wrap asymmetrically (`3 + 2`); `/products` renders cleanly at `2289.7px` height. |
| **Mobile** | `390×844` | `0px` (`375.2px` width) | 4-item bottom tab bar replaces top nav (hiding Blog/Contact/Discounts); search placeholder clipped; PDP sticky bar covers `"توان موتور: ۶۵۰ وات"` and clips `"تومان"`; bottom tab bar overlaps footer bottom & Next.js dev badge; `36/60` touch targets `< 44×44px`. |

---

## 9. Accessibility Findings

1. **Heading Hierarchy Defects:**
   - Homepage (`/`) has **`0` `<h1>` elements** (`h2: 7`, `h3: 78`).
   - `/checkout` skips heading levels (`<h1>` "تکمیل اطلاعات و ارسال سفارش" → `<h3>` "سبد خرید شما خالی است", missing `<h2>`).
2. **Invalid Landmark & Interactive Nesting:**
   - `/checkout` nests a `<main>` landmark inside another `<main>`.
   - PDP (`/products/bosch-gsb-16-re-hammer-drill`) nests fullscreen and share `<button>` elements inside the product image zoom `<button>`.
3. **Empty Links & Unnamed Hidden Controls:**
   - Homepage DOM contains `49–54` `<a href="">` elements with empty text and `28` hidden buttons lacking accessible names.
4. **Form Labels:**
   - `/account` registration fields (`نام`, `نام خانوادگی`, `شماره موبایل`) properly use `<label for="...">`.
   - Header search combobox and `/products` price range inputs (`از:`, `تا:`) lack explicit `<label for="...">` associations.
5. **Mobile Touch Targets (`390×844`):**
   - **36 of 60** sampled interactive elements on mobile homepage are below the WCAG/Apple `44×44px` minimum, including carousel dots (`10×10px`, `28×10px`), card add-to-cart icon buttons (`36×36px`), product title links (`140×39px`), header brand link (`57×20px`), and `"مشاهده همه"` links (`61×32px`).
6. **Keyboard Navigation:**
   - Tab order is logical initially, and visible focus rings appear on nav items (e.g., `"محصولات"`), but tabbing out of the search combobox fails to dismiss the autocomplete popover.
7. **Visual Contrast (Unverified Programmatically):**
   - Light amber validation text (`"تعداد ارقام: 4 از ۱۱..."`), light grey empty-state text on `/checkout`, and strikethrough original prices (`۶،۲۰۰،۰۰۰`) appear visually low-contrast against white backgrounds. *(Exact WCAG contrast ratios could not be computed in the browser sandbox.)*

---

## 10. Conversion Optimization (CRO) Recommendations

1. **Eliminate the `/offers` 404 & Fix `/products?discount=true`:** The homepage's highest-prominence promotional block ("پیشنهادهای شگفت‌انگیز") currently sends high-intent bargain shoppers to a `404` page.
2. **Replace All Grey Placeholders with Real Tool Photography:** Power tools, adhesives, and safety gear require visual inspection. Add high-resolution `<img>` assets with descriptive `alt` text and `next/image` optimization.
3. **Restore Pre-Purchase Trust Signals:**
   - Replace `info@mepusham.ir` and `۰۲۱-۱۲۳۴۵۶۷۸` with authentic AbzarMarket contact details and add a working inquiry form on `/contact`.
   - Replace `اینماد / مجوز (جایگاه نماد)` with a real Enamad/Samandehi trust seal or remove the placeholder box until verified.
4. **Un-Gate `/support?tab=faqs` & `/support?tab=guides`:** Allow guest shoppers to read FAQs, warranty terms, and buying guides without logging in; gate only personal support tickets behind `/account/support`.
5. **Surface Product Grid Above the Fold on `/products`:** Reduce or remove the oversized grey category banner on `/products` so shoppers immediately see filters and products.

---

## 11. Screenshot Evidence for Identified Problems

The browser audit captured full visual evidence across desktop, tablet, and mobile viewports:
- **Host-Verified Latest Capture:** [final_step_79.png](file:///C:/Users/Hadi/.gemini/antigravity/brain/8f1edc44-5cda-4f74-9494-790692ef377a/browser_evidence/70e9bd0a-d218-4bb3-bf3b-3e51c5c2976e/final_step_79.png) (Mobile `390×844` `/products` loaded 2-column grid showing missing product images, clipped search placeholder, and `"تومان"` clipping).
- **Additional Visual States Directly Observed During Audit:**
  - Desktop (`1440×900`) homepage above-the-fold & scrolled sections: grey hero/category/product placeholders and footer Enamad placeholder.
  - Desktop keyboard focus state: `"محصولات"` focus ring visible while search `"پیشنهادهای محبوب"` popover remains stuck open over navigation/hero.
  - Desktop `/offers` `404` error page and `/products?discount=true` unfiltered 50-item list.
  - Desktop & Mobile PDP (`/products/bosch-gsb-16-re-hammer-drill`): `"توما"`/`"ن"` currency wrap, mixed `"٪ 13 تخفیف"`, and mobile sticky bottom bar overlapping `"توان موتور: ۶۵۰ وات"`.
  - Desktop `/contact`: static text with `info@mepusham.ir` and `0` form inputs.
  - Tablet (`768×1024`) homepage: 5 category cards wrapping `3 + 2` under full desktop navbar.
  - Mobile (`390×844`) footer: Next.js dev badge overlapping `"حساب کاربری"` bottom tab item.

---

## 12. Recommended Design Improvements

1. **Unified Price Formatting Component:** Create a single `<PriceDisplay />` component using `tabular-nums`, Persian numerals, `whitespace-nowrap`, and flexible container width so `"تومان"` never clips or wraps.
2. **Consistent Numeral Localization:** Standardize all counters, discount percentages (`٪ ۱۳ تخفیف`), and validation messages to Persian digits (`۰–۹`).
3. **Responsive Navigation Architecture:** Introduce a clean hamburger drawer on `< 1024px` (or add a `"منو"` tab in the mobile bottom bar) so `وبلاگ`, `تخفیف دارها`, `تماس با ما`, and `قوانین` remain one tap away on tablet and mobile.
4. **Mobile PDP Sticky Bar Safe-Area Padding:** Add `padding-bottom` matching the sticky bar + bottom tab bar height on mobile PDP, and allow variant/price rows to wrap cleanly without truncation.

---

## 13. Prioritized Action Plan

### P0 — Critical (Fix Immediately)

1. **Fix `/offers` 404 & Footer `/products?discount=true` Filter**
   - **Problem:** Homepage Amazing Offers `"مشاهده همه محصولات"` leads to `/offers` (404), and footer `"تخفیف‌ها"` links to `/products?discount=true` which ignores the filter.
   - **Affected:** `/` (Amazing Offers CTA), Footer (`"تخفیف‌ها"`), `/products`.
   - **Why:** Breaks primary promotional user journeys and wastes high-intent traffic.
   - **Solution:** Point both CTAs to `/products?has_discount=true` (or implement `/offers` as a dedicated route/redirect) and support/alias `discount=true` in `/products` query parsing.
   - **Effort:** Low | **Expected UX Impact:** High | **Score Impact:** +5–6 pts (UX & CRO).

2. **Add Real Product, Banner, Category & Blog Images**
   - **Problem:** `0` `<img>` tags exist across the storefront; all visuals are grey text boxes.
   - **Affected:** `/`, `/products`, PDP, Cart Drawer, `/blog`.
   - **Why:** E-commerce users cannot evaluate tools or trust an unillustrated store.
   - **Solution:** Populate product/category/hero/blog images via `next/image` with proper `alt` attributes, `aspect-square`/`aspect-[16/9]` containers, and fallback thumbnails.
   - **Effort:** High | **Expected UX Impact:** Very High | **Score Impact:** +10–12 pts (Visual Design & CRO).

3. **Un-Gate Public FAQs & Buying Guides**
   - **Problem:** `/support?tab=faqs` and `/support?tab=guides` redirect guests to `/account/support` login.
   - **Affected:** Footer/Header support links, `/support`.
   - **Why:** Blocks pre-purchase buyers from resolving shipping, warranty, and usage questions.
   - **Solution:** Serve public FAQs and buying guides at `/faq` and `/guides` (or allow unauthenticated access to `/support?tab=faqs|guides`) while keeping ticket submission behind auth.
   - **Effort:** Medium | **Expected UX Impact:** High | **Score Impact:** +3–4 pts (UX & CRO).

4. **Remove Leftover Template Copy & Placeholder Trust Badge**
   - **Problem:** `/contact` shows `info@mepusham.ir` and `۰۲۱-۱۲۳۴۵۶۷۸` with no form; footer shows `اینماد / مجوز (جایگاه نماد)`.
   - **Affected:** `/contact`, Global Footer.
   - **Why:** Signals an unfinished or untrustworthy storefront.
   - **Solution:** Update to official AbzarMarket email/phone, add a validated contact form on `/contact`, and replace the Enamad placeholder with a live trust seal (or hide until active).
   - **Effort:** Low–Medium | **Expected UX Impact:** High | **Score Impact:** +4 pts (CRO & Visual Design).

---

### P1 — High Impact UX, Responsive & Accessibility Fixes

5. **Fix `"تومان"` Currency Clipping Across All Components**
   - **Problem:** `"تومان"` clips to `"توما"` or wraps `"ن"` on cards, cart drawer, and PDP.
   - **Affected:** Product cards, Cart Drawer, PDP price & sticky bar.
   - **Why:** Causes visual defects and price-reading friction.
   - **Solution:** Remove restrictive fixed widths/`overflow-hidden` on price wrappers and apply `whitespace-nowrap` on the price+currency flex item.
   - **Effort:** Low | **Expected UX Impact:** High | **Score Impact:** +2–3 pts (Visual Design).

6. **Fix Mobile PDP Sticky Bar Overlap**
   - **Problem:** Sticky add-to-cart bar overlaps `"توان موتور: ۶۵۰ وات"` and truncates `"رنگ بدنه"` on `390×844`.
   - **Affected:** Mobile PDP (`/products/[slug]`).
   - **Why:** Obscures selected product specifications right before purchase.
   - **Solution:** Add bottom padding (`pb-24` / `pb-32`) to the PDP main container on mobile and use a stacked 2-row layout inside the sticky bar.
   - **Effort:** Low | **Expected UX Impact:** High | **Score Impact:** +2–3 pts (Responsive & UX).

7. **Dismiss Search Autocomplete on Blur / `Escape` / `Tab` Out**
   - **Problem:** Tabbing out of the header search combobox leaves `"پیشنهادهای محبوب"` open over nav/hero.
   - **Affected:** Global Header Search Combobox.
   - **Why:** Blocks keyboard users and obscures primary navigation.
   - **Solution:** Close the popover on `Escape`, outside click, and `onBlur` when `relatedTarget` is outside the combobox container.
   - **Effort:** Low | **Expected UX Impact:** High | **Score Impact:** +2–3 pts (Accessibility & UX).

8. **Fix Semantic HTML: `<h1>`, Nested `<main>`, and Nested `<button>`**
   - **Problem:** `/` has `0` `<h1>` tags; `/checkout` nests `<main>` inside `<main>` and skips `<h2>`; PDP nests `<button>` inside the zoom `<button>`.
   - **Affected:** `/`, `/checkout`, PDP.
   - **Why:** Breaks screen reader landmarks, heading navigation, and valid interactive semantics.
   - **Solution:** Add an `<h1>` to `/` (e.g., hero headline), remove the inner `<main>` and fix `<h2>` on `/checkout`, and make the PDP zoom container a sibling wrapper rather than a parent `<button>`.
   - **Effort:** Low | **Expected UX Impact:** Medium–High | **Score Impact:** +3–4 pts (Accessibility).

---

### P2 — Medium Impact Improvements

9. **Add Mobile/Tablet Navigation Drawer & Fix Mobile Touch Targets**
   - **Problem:** Secondary routes (`وبلاگ`, `تماس با ما`, `تخفیف دارها`, `قوانین`) are missing from mobile top/bottom nav; `36/60` mobile controls are `< 44×44px`.
   - **Affected:** Mobile/Tablet Header & Homepage controls (`390×844`, `768×1024`).
   - **Why:** Reduces discoverability and causes tap errors on touchscreens.
   - **Solution:** Add a hamburger drawer trigger on `< 1024px` viewports and enforce `min-h-[44px] min-w-[44px]` (with padding) on carousel dots, icon buttons, and links.
   - **Effort:** Medium | **Expected UX Impact:** Medium | **Score Impact:** +3 pts (Responsive & Accessibility).

10. **Add Localized `<title>` Metadata & `<label for>` Associations**
    - **Problem:** Most pages show raw URLs (`localhost:3000/...`) as `<title>`; search combobox and price filters lack `<label for>`.
    - **Affected:** All routes except PDP, Header Search, `/products` price filter.
    - **Why:** Hurts browser tab clarity, SEO, and screen-reader form announcements.
    - **Solution:** Export Next.js `metadata` (`title`, `description`) per route and add `sr-only` `<label for>` elements to search and price inputs.
    - **Effort:** Low | **Expected UX Impact:** Medium | **Score Impact:** +2 pts (UX & Accessibility).

11. **Compact `/products` Category Banner & Fix Tablet 3+2 Category Grid**
    - **Problem:** Oversized grey banner pushes `/products` grid below the fold; tablet wraps 5 category cards into `3 + 2`.
    - **Affected:** `/products`, `/` (Tablet `768×1024`).
    - **Why:** Delays product discovery on `/products` and creates visual imbalance on tablet.
    - **Solution:** Reduce `/products` banner height (or remove when no category is selected) and use a 6-item or horizontal-scroll/2-column balanced grid at `md` breakpoints.
    - **Effort:** Low | **Expected UX Impact:** Medium | **Score Impact:** +1–2 pts (Visual & Responsive).

---

### P3 — Visual Polish & Technical Enhancements

12. **Standardize Persian Numerals, Disabled Button States & Production Build Verification**
    - **Problem:** Mixed English/Persian digits (`"0"`, `"٪ 13"`), `/account` submit button looks active when empty, and dev-mode compilation slows PDP (`3091 ms`).
    - **Affected:** Header Cart Badge, PDP Discount Badge, `/account`, Global Build.
    - **Why:** Improves visual polish, form clarity, and perceived speed.
    - **Solution:** Format all numbers with `toLocaleString('fa-IR')`, apply `disabled:opacity-50 disabled:cursor-not-allowed` when phone input is invalid/empty, and benchmark a production `next build && next start` with Lighthouse.
    - **Effort:** Low | **Expected UX Impact:** Low–Medium | **Score Impact:** +2 pts (Visual & Performance).

---

## 14. Expected Score After Improvements

| Category | Weight | Current Score | Expected Score After P0–P3 | Projected Weighted |
| :--- | :---: | :---: | :---: | :---: |
| Visual Design | 20% | 48 | **88** | 17.60 |
| User Experience & Usability | 25% | 54 | **89** | 22.25 |
| Responsive Design | 15% | 62 | **90** | 13.50 |
| Accessibility | 15% | 46 | **85** | 12.75 |
| Conversion Optimization | 15% | 42 | **87** | 13.05 |
| Performance & Technical UX | 10% | 65 | **88** | 8.80 |
| **Total** | **100%** | **52 / 100** | **88 / 100** | **87.95 (~88)** |
