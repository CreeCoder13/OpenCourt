# OpenCourt Indigenous legal discovery

This subsystem discovers Canadian Indigenous legal material without attempting an indiscriminate web crawl. It prioritizes an explicit source registry, rotates targeted search queries in small batches, respects site rules, and blocks publication until authoritative evidence and a human review are both present.

## Pipeline

`SEARCH → DISCOVER URL → ROBOTS CHECK → FETCH/CACHE → EXTRACT → DETERMINISTIC FILTER → AI CLASSIFY → DEDUPLICATE → VERIFY → SCORE → REVIEW → PUBLISH`

- Tier 1 sources are courts, official legal databases, legislatures, government legal publications and an issuing Indigenous government where it is authoritative for its own law or agreement.
- Tier 2 sources are strong institutional, academic, archival and Indigenous-organization sources.
- Tier 3 sources are discovery and context sources. A Tier 3 statement cannot by itself verify a judgment, law or treaty.
- Unknown search-result domains default to Tier 3 and remain subject to robots.txt, size limits, relevance filtering and review.
- The crawler identifies itself, uses per-domain delays, follows robots.txt, never handles authentication or CAPTCHA challenges, and sends `If-None-Match`/`If-Modified-Since` when cached validators exist.
- Source bytes are content-addressed in R2. D1 stores fetch metadata, extracted text, candidates, evidence, usage and publication state.

## Verification and publication

The levels are `VERIFIED_PRIMARY`, `VERIFIED_MULTIPLE`, `PARTIALLY_VERIFIED` and `UNVERIFIED`. A primary verification requires a Tier 1 authoritative document plus enough core identifiers, such as the title, court, date and citation. Multiple verification adds an independent corroborating source.

The server rejects publish requests for `PARTIALLY_VERIFIED` and `UNVERIFIED` records. The editor must still open the original source and review the proposed summary, identity fields, legal status, relationships and duplicate warnings. AI output never changes verification status by itself.

## Discovery and scheduling

The protected `POST /api/discovery/run` endpoint seeds trusted records, rotates 12 search queries, and processes eight queued documents by default. Configure a scheduler with the same secret as `DISCOVERY_CRON_SECRET`:

- every six hours for primary-source changes and new decisions;
- daily for one rotating broad-search batch;
- weekly for later-citing cases and citation-graph refreshes;
- monthly for published-record legal-status and amendment checks.

The current endpoint implements the incremental/daily batch. Weekly and monthly invocations use the same queue and should be extended with source-specific citation and consolidation adapters. Hosting does not infer a schedule from this repository; configure the schedule in the deployment platform or an external scheduler.

## AI use and cost controls

All AI requests are made from `lib/server/aiDiscovery.ts` using `process.env.OPENC_API_KEY`. The request uses Structured Outputs, disables response storage, truncates supplied document text to a fixed bound, validates every response, and caches by document hash, task and model. The browser never imports the server module, receives the key, or receives it in an API response.

Deterministic domain, URL and keyword filters run first. Default limits are 50 AI calls or 250,000 total tokens per UTC day, configurable with `OPENC_AI_DAILY_CALL_LIMIT` and `OPENC_AI_DAILY_TOKEN_LIMIT`. The admin queue displays calls, tokens and an estimated daily cost using the configured per-million-token rates. Actual billing depends on the selected model and current OpenAI pricing; set project-level platform spend alerts as a second control.

## PDF pipeline

PDF bytes are cached in R2 and retain the original URL. When `PDF_TEXT_EXTRACTOR_URL` is configured, the server sends the PDF to that operator-controlled service, accepts extracted text plus an `ocrUsed` flag, then runs normal classification and verification. Without that service, the system does not guess: it marks the extraction as pending and holds the candidate in review. The external service should attempt embedded-text extraction first and OCR only for image-only documents.

## Manual configuration

Copy the names from `config.example.env` into local and hosted secret management. Required runtime values are `OPENC_API_KEY`, `DISCOVERY_CRON_SECRET` and `ADMIN_REVIEW_TOKEN`. Broad internet search additionally needs a compliant search provider through `OPENCOURT_SEARCH_ENDPOINT` and `OPENCOURT_SEARCH_API_KEY`. PDF processing needs the optional extraction service. D1 and R2 are declared as `DB` and `DOCUMENTS` in `.openai/hosting.json`.

Before enabling a domain, review its terms, robots policy, publication formats and rate limit in `data/trusted-domains.json`. CanLII API use must follow the applicable CanLII authorization and terms. Do not use browser scraping to work around missing API access.

## Initial verified collection

The first import contains the existing 12 Supreme Court of Canada records and five official federal legal instruments. Every seed links to the issuing court or Justice Laws source. It intentionally does not include uncertain Restoule, Taku River, Manitoba Métis Federation or 2024 reference metadata merely to satisfy a count; those records should be added after their source fields are fully reviewed.

## Operational next steps

1. Configure hosted secrets, D1/R2 resources and a scheduler.
2. Add a licensed search API and any authorized CanLII API credentials/adapters.
3. Deploy or select a PDF extraction/OCR service.
4. Replace the shared editor token with identity-aware, role-based authentication before adding multiple editors.
5. Add source-specific RSS/API/sitemap adapters, especially for provincial and territorial courts.
6. Add a citation-provider adapter or court-specific cited-by search to strengthen `casesCiting` and citation-influence scores.
7. Have Indigenous legal experts and affected communities review terminology, summaries and treatment of Indigenous legal orders.
