# Mortgage Rate Finder

A small service that answers: "What's the best mortgage rate in Norway right
now for a given loan-to-value ratio?"

Input: loan-to-value ratio (LTV) and loan amount.
Output: best option, with reasoning, compared on effective interest rate.

This started as a take-home coding exercise for a job interview. It's now
kept as a portfolio project. See
`DECISIONS.md` for the reasoning behind choices made along the way, and
`CLAUDE.md` for the working method used (including how AI assistance was
used and reviewed).

## Status

Core functionality is done: two sources behind a shared interface,
selection on effective rate filtered by LTV, and a trust check against
Norges Bank's key policy rate, wired together in `POST /api/best-rate`. An
optional minimal UI page (low priority) was not built. See `TODO.md` for
progress and `DECISIONS.md` for the reasoning behind choices.

## Sources

- **Offer source 1 (real)**: [Renteportalen.no](https://renteportalen.no/data),
  which publishes Finansportalen's mortgage data openly under a CC BY 4.0
  license.
- **Offer source 2 (mock, clearly flagged)**: a modeled single-bank rate
  table ("Fiktiv Bank AS", a made-up name), since directly scraping banks'
  websites is fragile and the terms are unclear. Covers LTV tiers 0-60,
  60-75, 75-85 and 85-90 %, with both nominal and effective rates.
- **Trust anchor (real)**: [Norges Bank's key policy rate](https://www.norges-bank.no/en/topics/statistics/Key-policy-rate-daily/)
  via the open API at `data.norges-bank.no`.

## Assumptions

- Renteportalen's rate barometer only reports the cheapest effective rate
  in the market per LTV tier (0-60, 60-75, 75-85 %), not which bank offers
  it or the nominal rate. We therefore show the offer as coming from an
  "unknown bank" for these rows, with an effective rate but no nominal
  counterpart.
- LTV tiers are interpreted as non-overlapping intervals with an inclusive
  upper bound, so exactly 60.0 % LTV lands in the 0-60 tier.
- LTV above 85 % results in "no offer in the data" in this solution. This
  is a limitation of Renteportalen's data, not a regulatory limit. The
  Norwegian lending regulation ([Lovdata forskrift 2020-12-09-2648 § 7](https://lovdata.no/dokument/SF/forskrift/2020-12-09-2648/kap3))
  allows amortizing mortgage loans secured on a home up to 90 % of a
  prudently assessed value; see also [Finanstilsynet's](https://www.finanstilsynet.no)
  guidance on loan-to-value.
- The "young/first-home" category from Renteportalen is excluded, since
  it's a demographic segment (age/purchase type), not an LTV tier.

## Trust check

All considered offers (not just the winner) are checked against Norges
Bank's key policy rate, fetched live on every request (never hardcoded,
since the next rate decision is on 2026-09-24). Each offer is checked
independently, so an offer that loses on price is still flagged if it's
suspicious or stale:

- **Below the policy rate**: flagged for review, but not rejected or
  hidden. Subsidized loans (e.g. Norway's "startlån") can legitimately sit
  lower.
- **More than 5 percentage points above the policy rate**: flagged as an
  unreasonably high margin for an ordinary mortgage, possibly a data error.
- **Older than 48 hours**: flagged as possibly stale.

The check is meant as a garbage-catcher for obviously wrong numbers, not a
judgment of how good a rate is. See DECISIONS.md rows 11-13 for the
reasoning behind the thresholds.

## API

```bash
npm install
npm run dev
```

```bash
curl -X POST http://localhost:3000/api/best-rate \
  -H "Content-Type: application/json" \
  -d '{"ltvPercent": 70, "loanAmount": 3000000}'
```

The response contains `winner` (or `null` with an explanatory `reasoning`
if no source covers the given LTV), `consideredOffers` (all offers that
were evaluated, cheapest first), `trustCheck` (the policy rate plus
`offerChecks`, a list of flags per evaluated offer, not just the winner),
and `sourceErrors` (if one source fails, the endpoint continues with the
rest instead of failing entirely).

Tested against real, live data: Renteportalen's own "updated" timestamp
turned out to be a few days old when we tested, so even the real offer was
correctly flagged as `stale_data` by the trust check, a nice confirmation
that the stale-data flag actually catches something real and not just the
mock data.

## Getting started

```bash
npm test
```

## Further work

Points we deliberately deferred or simplified, which would be natural to
address with more time:

- **No caching or fallback for Renteportalen.** Every request makes a new,
  live call. Deliberately deferred to keep the solution small. Done
  properly, this would mean a cache with a TTL matched to Renteportalen's
  own update frequency (they cache for 1 hour themselves), and a fallback
  to the last known data if a live call fails. The latter would be cheap
  to add: cached data could flow through exactly the same `stale_data`
  flag that already exists, since it measures the source's own date
  (`sourceUpdatedAt`), not when we fetched it (`retrievedAt`).
- **No real scraping of a single bank.** `DirectBankMockSource` is a
  clearly flagged mock. Done properly, this would mean either a
  headless-browser scraper (Playwright/Puppeteer) against one bank's rate
  table page, with selectors that need monitoring to catch when the page
  changes, or an agreement for API access (Finansportalen requires a
  distribution agreement from the Norwegian Consumer Council). Because the
  mock sits behind the same `RateSource` interface as the real source, the
  actual swap is a local change in one file; the rest of the system
  doesn't need to be touched.
- **Loan amount isn't used to adjust the rate**, only to flag deviation
  from the source's reference amount (see DECISIONS.md row 10). Neither of
  our sources provides amount-dependent rate tiers, and inventing a
  scaling formula would be guesswork with no basis in data. Done properly,
  this would mean finding a source that states fixed fees in kroner
  (origination fee, registration fee), and computing the real effective
  rate per stated loan amount with the annuity formula, the formal way
  effective rate is actually calculated.
- **"Young/first-home" and LTV above 90 % are out of scope.**
  Young/first-home is a demographic category (age, first home), not an LTV
  tier, and would require a new axis in the domain model beyond LTV and
  loan amount. LTV above 90 % is largely a non-issue: amortizing loans are
  capped at 90 % of a prudently assessed value under the lending
  regulation (§ 7) regardless, so the gap is more a data-coverage hole
  than a real shortcoming.
- **No retry or backoff** against Renteportalen or Norges Bank, only one
  attempt per request. If a source fails, it's reported in `sourceErrors`
  or `trustCheckError` instead of retrying (see DECISIONS.md row 14). Done
  properly, this would mean exponential backoff with 1-2 attempts, but
  only for transient failures (5xx, network errors), not client errors
  (4xx, which don't fix themselves), plus a total time budget so the
  endpoint doesn't hang.
- **History isn't used.** Renteportalen also offers `historikk.json` (62
  days of data). Could be used for a rate chart, or for a more robust
  deviation check (flag a number that's a statistical outlier from the
  recent trend, instead of a fixed percentage-point threshold against the
  policy rate), but that's beyond what this project set out to do.
- **No minimal UI built.** The original brief didn't require a UI, only
  that a link to the finished work be shared, so this is a purely
  discretionary choice, not an unmet requirement. With more time, a
  one-page form around the existing API would be cheap to add and would
  make the demo experience simpler.
