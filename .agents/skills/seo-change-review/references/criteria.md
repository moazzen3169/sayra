# Change review criteria

Load this when rating SEO impact or deciding whether a finding is blocking.

## Impact rating

Rate the change, not the theoretical worst case. Four inputs: **scope** (how many
URLs, and how important), **likelihood** (will this actually happen in production),
**reversibility** (how fast can it be undone), and **detectability** (would anyone
notice before damage accrues).

| Rating | Shape |
| --- | --- |
| CRITICAL | Site-wide or on a critical template, and hard or slow to reverse. Production `noindex` or `Disallow: /`, URL pattern change without redirects, canonical pointing site-wide at one URL, removal of server-rendered content that carries the page's meaning. |
| HIGH | Important template or large URL group, reversible but with real recovery lag. Redirect map gaps, hreflang cluster broken, sitemap generation stops, pagination made undiscoverable. |
| MEDIUM | Contained scope or slow-acting. Title and meta template changes, heading structure changes, structured-data property loss, internal link block removed from one template. |
| LOW | Cosmetic or well-contained, easily reversed. Copy edits, single-page metadata, non-semantic markup changes, additive schema. |

**A theoretically possible failure with no plausible production path is not
CRITICAL.** Say what would have to be true for it to fire. Conversely, a one-line
diff can be CRITICAL when it is in a shared layout or a middleware.

## Where SEO regressions actually hide in a diff

Look here before reading the rest:

- **Routing and middleware** — route definitions, catch-alls, trailing-slash and
  case handling, locale prefixes, rewrites versus redirects. A rewrite keeps the URL
  and a redirect changes it; confusing them silently duplicates or breaks URLs.
- **`robots.txt` generation and environment conditionals** — anything keyed on an
  env var can ship the staging value.
- **`<head>` composition** — a refactor of a shared head component can drop
  canonical, meta robots or hreflang from every page at once.
- **Rendering mode changes** — moving a route from server-rendered to client-only,
  or adding a loading gate, can remove the content that carried the page's meaning.
- **Status codes** — a "not found" page that returns 200 becomes a soft 404 at scale.
- **Pagination and infinite scroll** — replacing links with a button removes crawl paths.
- **Sitemap generators** — filter changes silently drop URL groups.
- **Structured data** — property removal during a component refactor.
- **Dependency and framework upgrades** — defaults change between major versions;
  the diff shows a version bump and hides a behavioural change.

## Blocking versus non-blocking

Blocking, regardless of rating: anything that makes URLs unreachable or
non-indexable at scale, any URL change without a redirect, and any change that
cannot be reversed within the team's normal deploy cycle.

Non-blocking: everything reversible within a deploy whose worst case is bounded.
Say what the worst case is rather than asserting the label.

## Judging what you cannot see

A diff shows intent, not production behaviour. Be explicit:

- The diff is `observed`; production behaviour is `not_measured` until checked.
- Configuration outside the repository (CDN, edge rules, WAF, host redirects) is
  `not_available` and may override what the code says.
- Feature flags, environment variables and build-time conditionals mean the shipped
  behaviour may differ from the merged code.

Ask for the missing evidence rather than assuming either the best or the worst.

## The output that gets acted on

Give the minimal fix, not a redesign. Name the file and line where possible, state
the smallest change that removes the risk, and give the check that proves it — a
request to run, a page to load, a value to inspect. A finding without a verification
step is an opinion.
