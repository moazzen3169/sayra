# Migration decision criteria

Load this when planning, gating or diagnosing a migration.

## The rule that prevents most migration disasters

**One source URL resolves to exactly one final destination in one hop, and that
destination serves the same user need.** Everything below is a way of proving or
breaking that sentence.

A mapping file is a claim, not evidence. A migration is validated only against
observed HTTP behaviour on the environment that will be live.

## Mapping coverage

Classify every old URL into exactly one bucket, and count them:

| Bucket | Meaning | Acceptable? |
| --- | --- | --- |
| Mapped 1:1 to an equivalent page | The normal case | Yes |
| Mapped to a relevant parent or category | Equivalent page no longer exists | Yes, if the parent genuinely serves the need |
| Mapped to the homepage | Almost always a failure of analysis | Only for a handful of genuinely rootless URLs |
| Intentionally removed (410 or 404) | The content is gone and should be | Yes, when deliberate and documented |
| Unmapped | Nobody decided | **No. This is a blocker.** |

Report coverage as counts, never as a reassuring percentage alone. 98% coverage can
still leave the highest-value pages unmapped. **Weight coverage by importance**:
segment by traffic where data exists, by revenue or conversion role, by inlink count,
and by depth. An unmapped page with no links and no traffic is noise; an unmapped
top-converting page is a launch blocker on its own.

## Redirect defects, in order of severity

1. **Loop** — the URL never resolves. Critical, always.
2. **Chain** — resolves, but each hop loses signal and slows crawling. Collapse to one hop.
3. **Target is 404, 410 or itself a redirect to an error** — worse than no redirect, because it looks handled.
4. **Target is noindex or canonicalised elsewhere** — the destination cannot receive the signal.
5. **Wrong status** — a 302 for a permanent move keeps the old URL alive in indexes.
6. **Irrelevant target** — resolves cleanly to a page that does not serve the original need. Invisible to a status check, and the most common silent failure.
7. **Protocol or host inconsistency** — http/https or www/non-www variants resolving differently.

Defects 1 to 5 are detectable deterministically. **Defect 6 requires judgement** and
is where this skill earns its place: check a sample of mappings for need-equivalence,
weighted towards the highest-value URLs, and say how many you actually inspected.

## Continuity checks beyond redirects

A clean redirect map still fails if any of these break:

- **Canonical** — new pages self-referencing, not pointing at old URLs.
- **Robots** — staging `Disallow: /` shipped to production is the classic catastrophe. Check the live file after launch, not the repository.
- **Meta robots and headers** — `noindex` left from staging, on templates as well as pages.
- **Sitemaps** — new URLs only, old sitemaps retired but old URLs kept reachable via redirects until recrawled.
- **Internal links** — updated to final destinations, not relying on redirects. Redirect chains through navigation are a crawl tax on every page.
- **Hreflang** — return links updated to new URLs on both sides, or the cluster silently breaks.
- **Structured data** — identity properties (`@id`, `url`, `sameAs`) updated.
- **Analytics and Search Console** — new property verified and the change of address submitted where applicable, before traffic reporting is interpreted.

## Launch gates

Do not present a migration as ready unless each of these is answered with evidence:

1. Every old URL is in a bucket above, and unmapped is empty.
2. Sampled redirects resolve in one hop to a relevant, indexable page.
3. Production robots and meta robots verified on the live environment.
4. New sitemap generated, reachable and referenced.
5. Internal links point at final destinations.
6. Hreflang reciprocity verified where it exists.
7. Rollback path defined, tested and owned by a named person.
8. Monitoring window, thresholds and the person watching are agreed in advance.

## Rollback thresholds

Define these **before** launch, in terms the business accepts. Useful shapes,
adapted to the site's own baseline rather than any universal number: a sustained
drop in a critical page group's traffic beyond normal variance for that group; a
sharp rise in error or non-indexable responses across a template; a critical
transactional path returning errors. State the observation window explicitly —
same-day noise is not a signal, and waiting a month is not a plan.

Never state a rollback threshold as a number you invented. Derive it from the site's
supplied history, or express it qualitatively and say the baseline is `not_available`.

## What not to promise

Ranking and traffic transfer are not guaranteed by a correct migration; a correct
migration only removes the avoidable causes of loss. Say that plainly. Recovery
timelines depend on recrawl, which is not controllable and not predictable — do not
give a date.
