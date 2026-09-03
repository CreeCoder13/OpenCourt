# Coverage & discovery dashboard

Open `/admin/coverage` from the admin navigation. The workspace uses the existing `ADMIN_REVIEW_TOKEN`; no new credential or public data endpoint is introduced. The token remains in React state and is sent only as a bearer authorization header. The server authorizes before loading any coverage data and returns `private, no-store` responses. Locking the workspace clears both token and data.

## Sources and counting

- `data/cases.ts` supplies all curated cases, including unpublished records if present. `legal_records` supplies every stored `CASE`, read in keyset pages of 250 without the public listing's 2,000-record limit. Laws and discovery candidates do not inflate case counts.
- Slug or full normalized citation identifies copies of the same case. Curated copies take precedence, matching the existing public collection's merge rule. This prevents the discovery seed from doubling the collection. Editorial changes to a stored copy of a curated case are therefore not substituted for its curated version.
- Existing community, treaty and topic catalogues are reused. Forward and reverse case links are combined and matched by exact normalized names, IDs, slugs and community aliases. Uncatalogued labels remain visible. No community membership, treaty association or group is inferred from geography.
- Court levels are derived from recorded court names. Unknown courts and missing dates remain explicit. National records are separate from provinces and territories. Cases with several recorded jurisdictions or groups count once in each category; category shares may sum to more than 100%.
- Filters combine with AND. Decision date bounds are inclusive and exclude undated cases. Case metrics, quality checks, recent case activity and priorities use the selected cases. Catalogue totals, discovery metrics, scan history and relationship activity are global and labelled accordingly.
- The server returns a compact projection for each case, not full narrative payloads. Filters and inspections run against this authorized snapshot. Refresh reloads the database; this is not a streaming monitor.

## Pipeline limitations

Saved `scan_runs` currently persist mode, status, start/end time, queries, newly queued URLs, and documents processed. The dashboard shows the most recent 20 runs and sums the recorded counters across all runs. These are search queries and processing attempts, not distinct sources or successful page fetches. In-progress runs may have unfinished counters.

Current queue counts come from `discovery_items`: case candidates are rows with `proposed_type='CASE'`; verified candidates have primary or multiple verification. Review, rejected, duplicate-linked and failed counts include all record types. Verification is independent of editorial status, so counts can overlap. Conversion is verified case candidates divided by all classified case candidates; no candidates yields an undefined rate shown as a dash.

Per-run candidate outcomes, duplicate skips, seed additions and search failures are not persisted. They display as unavailable, never as fabricated zeros. The dashboard introduces no schema migration and does not run scans or publish records.

A database failure produces an explicit curated-only notice, not a silent live total. A pipeline query failure preserves available case coverage and marks discovery metrics unavailable.

## Review rules

Zero cases means **High Priority**. One or two cases, or fewer than 20% of the largest category in that dimension, means **Medium Priority**. Other categories are **Healthy** under this heuristic, not proven complete. Filters recalculate priorities. National, unknown and unclassified buckets are not ranked as backfill targets.

Coverage priority reflects OpenCourt’s current dataset, not the actual volume of Indigenous litigation in that jurisdiction.

Quality checks include primary HTTP(S) source URLs, community/topic links, missing related case links (including stored case relationships), known generic editorial phrases, and last verification older than 365 days. Missing treaty links are flagged only for treaty-related topics. Missing links and placeholder flags require review; they are not automatic factual errors. Recent activity uses existing record timestamps and is not an audit history.

## Validation

`pnpm test` includes coverage model tests for seed deduplication, stored field conversion, multidimensional counting, filter intersections, catalogue associations, court levels, ongoing/closed statuses, quality flags, and empty data. Run the existing `pnpm lint`, `pnpm typecheck` and `pnpm build` gates before release. HTTP smoke checks should verify unauthenticated and incorrect-token requests return 401, authorized requests return a snapshot, and the API uses no-store caching.
