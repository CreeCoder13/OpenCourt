# OpenCourt nationwide Indigenous-case discovery

This is the existing OpenCourt ingestion and pending-case system, expanded across Canada. It discovers possible cases, retains field-level evidence, deduplicates against pending and published records, and stages review items. It never publishes a discovered result. Publication remains a separate authenticated editor action and is blocked without primary verification.

## Source and court coverage

`lib/discovery/jurisdictions.ts` is the court roster: Supreme Court of Canada, Federal Court, Federal Court of Appeal, Tax Court, and the appellate, superior and provincial/territorial courts of every province and territory. Nunavut is correctly represented by its unified Court of Justice plus its Court of Appeal. `lib/discovery/nationwideSources.ts` adds the Specific Claims Tribunal, Canadian Human Rights Tribunal, selected human-rights, environmental, energy and land-use bodies, and context-only government, Indigenous-organization and legal-reporting sources.

The roster is discovery configuration, not a claim of complete holdings or access. Each report separates courts configured, pages attempted/read and inaccessible sources by jurisdiction. Court links were cross-checked against the Department of Justice Canada court directory; source-specific paths still require periodic editorial review.

CanLII is API/manual-only in this implementation. Its public HTML is not crawled: CanLII's current terms direct automated or large-scale retrieval to original sources or authorized channels, and its FAQ says external robots may not index decisions. A future authorized adapter can be connected without weakening that rule. Terms gates, CAPTCHAs, authentication, robots restrictions, publication bans, sealed/confidential warnings and non-index directives are stopped and reported, not bypassed.

## Discovery pipeline and evidence

`ROSTER + PERMITTED SEARCH → ROBOTS/POLICY CHECK → BOUNDED FETCH → RELEVANCE → CASE-SPECIFIC PARSE → FIELD EVIDENCE → STATUS CHECK → DEDUPLICATE → PENDING REVIEW`

- English and French terms cover Aboriginal/Indigenous title and rights, treaty rights, section/article 35, consultation, Métis and Inuit rights, hunting/fishing, reserve lands, Indian Act litigation, self-government, specific claims, taxation, child/family services, Jordan's Principle and UNDRIP/DNUDPA. Community names include variants and selected historical terminology only as search vocabulary.
- A name appearing in text never establishes a person's Indigenous identity or membership. Nation/community fields are left for editorial verification.
- A field carries its source URL, content hash, retrieval date, value, short source quote and locator. A source list/index cannot become a case merely because it mentions a citation.
- Judgment, docket, context and regulatory/tribunal sources remain distinct. Government announcements, Indigenous-government/organization pages and reporting can discover a lead but cannot independently verify a court case.
- Decision type (`FINAL_JUDGMENT`, `INTERLOCUTORY`, `DECISION_UNSPECIFIED` or `DOCKET`) is separate from proceeding type (`TRIAL`, `APPEAL`, `TRIBUNAL` or `UNKNOWN`). If an official record does not label a final or interlocutory decision, the parser does not guess.
- “Ongoing” and “appeal pending” require a case-specific official docket/hearing page retrieved within seven days plus a dated event no older than 30 days or a future hearing. Old judgments, articles and filings never establish current status. Ambiguous records are `NEEDS_REVIEW`.
- AI, when configured for a staging run, can propose summaries and labels from the supplied document. It cannot create field evidence or verification. Dry runs never call AI because its cache and usage accounting are persistent writes.

## Deduplication and review

Before staging, the server reads every non-rejected pending case and every published case with keyset pagination, plus the static collection. Matching uses neutral citation, official URL, court-scoped file number, and normalized case name plus year. Court file numbers alone do not collapse separate orders: differing neutral citations, dates or decision types are preserved and linked as related decisions in the same proceeding. Explicit “appeal from” citations are retained as unverified appeal links for editorial confirmation.

Every candidate enters the existing `discovery_items` review workflow. A race-safe duplicate check is repeated at approval time. Existing reviewed records are never overwritten automatically, even by apparently stronger machine-collected data. An editor must inspect the official source, publication/privacy status, evidence, dates, relationships, summary and duplicate warning before promotion.

## Exact commands

Commands below are PowerShell examples; quote values containing spaces. All local examples use `--dry-run`, perform zero D1/R2/AI writes, and print a JSON audit report.

```powershell
# Nationwide, bounded and read-only
npm run ingest:cases -- --nationwide --dry-run --max-pages 42 --max-requests 100 --max-depth 2 --max-duration-ms 180000 --report outputs/nationwide-dry-run.json

# One province or territory (codes: BC AB SK MB ON QC NB NS PE NL YT NT NU)
npm run ingest:cases -- --jurisdiction QC --dry-run --max-pages 20 --max-requests 50

# Federal courts and tribunals
npm run ingest:cases -- --jurisdiction CA --dry-run --max-pages 20 --max-requests 50

# Historical/year search
npm run ingest:cases -- --year 1990 --dry-run --max-pages 42 --max-requests 100

# Topic and Nation/community spelling search (search vocabulary, not identity inference)
npm run ingest:cases -- --topic "duty to consult" --nation "Haida" --dry-run --max-pages 42 --max-requests 100
npm run ingest:cases -- --topic "obligation de consulter" --jurisdiction QC --dry-run --max-pages 20 --max-requests 50

# Ongoing matters: only fresh official docket/hearing evidence qualifies
npm run ingest:cases -- --ongoing --dry-run --max-pages 42 --max-requests 100

# Include an exported read-only identity snapshot for complete local deduplication
npm run ingest:cases -- --nationwide --dry-run --snapshot .\private\case-identities.json --max-pages 42 --max-requests 100
```

Without `OPENCOURT_SEARCH_ENDPOINT` and `OPENCOURT_SEARCH_API_KEY`, the report marks broad search unavailable and uses permitted source entry points only. Search queries are still reported for audit. `--query-limit` is capped at 25; `--max-pages` at 100; `--max-requests` at 300; depth at 3; per-request timeout at 15 seconds; total duration at five minutes. The default bounded run is 42 pages, 100 requests, depth 2 and three minutes. Reports created with `--report` use exclusive creation so an earlier audit file is never overwritten.

A non-dry run posts to the protected existing endpoint and stages candidates in D1/R2. It requires `OPENCOURT_DISCOVERY_URL` and `DISCOVERY_CRON_SECRET`; the URL must be HTTPS. The hosted server repeats validation and all limits. Example:

```powershell
npm run ingest:cases -- --nationwide --max-pages 42 --max-requests 100
```

This command stages only. It does not add public cases. No scheduled crawler is configured or enabled by this work.

## Report interpretation and limitations

- `coverage`: configured court levels, source/page counts, candidates, duplicates and verification by jurisdiction.
- `verification`: candidate identity verification only; it is not editorial approval and does not verify a summary or Indigenous identity.
- `duplicateScope`: explicitly says whether live D1, a supplied snapshot or only static records were checked.
- `inaccessible`: the exact URL and reason, including manual/API-only, robots, access gate, timeout, unsupported PDF/OCR or budget stop.
- `filtered`: candidates excluded by year, topic, Nation term, jurisdiction or unverified current status.
- `unvisitedUrls` and `stopReason`: make the bounded run's incompleteness visible.

A bounded dry run is a safety and coverage sample, not proof that every historical decision was retrieved. Courts without a usable official searchable interface require targeted editorial research or a permitted search provider. PDFs require the existing operator-controlled extraction/OCR service in staging and otherwise remain inaccessible in a read-only scan. CanLII requires an authorized interface. These gaps must remain visible rather than being filled with guesses.
