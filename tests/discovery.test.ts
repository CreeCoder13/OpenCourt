import assert from "node:assert/strict";
import test from "node:test";
import { validateAiClassification } from "../lib/discovery/aiValidation.ts";
import { parseLegalCitations } from "../lib/discovery/citations.ts";
import { findDuplicate, relatedProceedings, titleSimilarity } from "../lib/discovery/deduplicate.ts";
import { assessImpact } from "../lib/discovery/impact.ts";
import { normalizeUrl } from "../lib/discovery/normalize.ts";
import { DomainRateLimiter } from "../lib/discovery/rateLimiter.ts";
import { assessRelevance } from "../lib/discovery/relevance.ts";
import { tierForUrl } from "../lib/discovery/trustedDomains.ts";
import { canPublish, determineVerification } from "../lib/discovery/verification.ts";
import { classifyCaseStatus } from "../lib/discovery/caseStatus.ts";
import { extractHtml } from "../lib/discovery/extract.ts";
import { fetchWithRetry } from "../lib/discovery/http.ts";
import { mergeWithoutDowngrade } from "../lib/discovery/merge.ts";
import { buildSearchQueries } from "../lib/discovery/keywords.ts";
import { officialSourceMonitors } from "../lib/discovery/officialSources.ts";
import { findTrustedDomain } from "../lib/discovery/trustedDomains.ts";
import { classifyEvidenceSource } from "../lib/discovery/sourcePolicy.ts";
import type { AiClassification } from "../lib/discovery/types.ts";
import { courtCoverage, JURISDICTIONS } from "../lib/discovery/jurisdictions.ts";
import { assertSourceAllowed, restrictionReason } from "../lib/discovery/crawler.ts";
import { parseCandidate } from "../lib/discovery/parseCandidate.ts";
import { discoverNationwide } from "../lib/discovery/nationwide.ts";
import { validateDiscoveryOptions } from "../lib/discovery/options.ts";

const aiCase: AiClassification = { relevance: "RELEVANT", confidence: 0.9, recordType: "CASE", categories: ["Section 35"], proposedTitle: "Nation v Canada", summary: "Decision summary", significanceSignals: [], nations: [], citations: ["2026 FC 1"], verificationNeeded: [], court: "Federal Court", courtFileNumber: "T-1-26", decisionDate: "2026-01-01", neutralCitation: "2026 FC 1", legislationCitation: null, parties: [], constitutionalSections: [], legislationReferenced: [], casesCited: [], treatiesReferenced: [], impactSignals: [], proceduralStage: "Decision released", latestDevelopment: "Decision released", latestDevelopmentDate: "2026-01-01", upcomingHearingDate: null };

test("normalizes discovery URLs without tracking or fragments", () => {
  assert.equal(normalizeUrl("http://WWW.CanLII.org/en/ca/scc/doc/2014/2014scc44/2014scc44.html/?utm_source=x&b=2&a=1#para1"), "https://canlii.org/en/ca/scc/doc/2014/2014scc44/2014scc44.html?a=1&b=2");
  assert.throws(() => normalizeUrl("file:///etc/passwd"), /HTTP/);
});

test("assigns source tiers by trusted registrable domain", () => {
  assert.equal(tierForUrl("https://decisions.scc-csc.ca/example"), 1);
  assert.equal(tierForUrl("https://nctr.ca/records"), 2);
  assert.equal(tierForUrl("https://cbc.ca/news"), 3);
  assert.equal(tierForUrl("https://unknown.example/article"), 3);
});

test("uses the most specific trusted host policy", () => {
  assert.equal(findTrustedDomain("decisions.scc-csc.ca")?.domain, "decisions.scc-csc.ca");
  assert.equal(findTrustedDomain("www.scc-csc.ca")?.domain, "scc-csc.ca");
});

test("official monitors cover courts, tribunals, regulatory boards, territories, and CanLII", () => {
  assert.ok(officialSourceMonitors.length >= 45);
  for (const marker of ["scc-csc.ca", "fct-cf.gc.ca", "bccourts.ca", "ontariocourts.ca", "yukoncourts.ca", "nwtcourts.ca", "nunavutcourts.ca", "sct-trp.ca", "chrt-tcdp.gc.ca", "rec-cer.gc.ca", "nirb.ca", "reviewboard.ca", "yesab.ca", "canlii.org/en/qc/"]) {
    assert.ok(officialSourceMonitors.some((source) => source.url.includes(marker)), `missing ${marker}`);
  }
});

test("broad search rotates across official court domains and wraps safely", () => {
  const first = buildSearchQueries(0, 25);
  const later = buildSearchQueries(500, 25);
  const wrapped = buildSearchQueries(50_000, 25);
  assert.equal(first.length, 25);
  assert.equal(later.length, 25);
  assert.equal(wrapped.length, 25);
  assert.ok([...first, ...later, ...wrapped].some((query) => query.includes("site:")));
  assert.notDeepEqual(first, later);
});

test("relevance requires both Indigenous and legal context", () => {
  const relevant = assessRelevance({ title: "Supreme Court judgment on First Nation treaty rights", text: "The section 35 appeal concerns the duty to consult.", tier: 1 });
  assert.equal(relevant.label, "RELEVANT");
  const falsePositive = assessRelevance({ title: "Best Indian restaurant", text: "A recipe near the tennis court", tier: 3 });
  assert.equal(falsePositive.label, "NOT_RELEVANT");
});

test("impact scoring weights court and precedent signals with reasons", () => {
  const result = assessImpact({ court: "Supreme Court of Canada", createdLegalTest: true, changedSection35: true, nationalEffect: true, laterCitationCount: 120 });
  assert.ok(result.impactScore >= 80 && result.impactScore <= 100);
  assert.ok(result.impactReasons.includes("Supreme Court of Canada decision"));
  assert.ok(result.impactReasons.some((reason) => reason.includes("cited")));
});

test("duplicate detection uses neutral citations and guarded fuzzy matching", () => {
  const exact = findDuplicate({ id: "new", caseName: "Tsilhqot’in Nation v British Columbia", neutralCitation: "2014 SCC 44", decisionDate: "2014-06-26", court: "Supreme Court of Canada" }, [{ id: "existing", caseName: "Tsilhqot'in Nation v. British Columbia", neutralCitation: "2014 SCC 44", decisionDate: "2014-06-26", court: "Supreme Court of Canada" }]);
  assert.equal(exact.duplicateOf, "existing");
  assert.equal(exact.confidence, 1);
  assert.ok(titleSimilarity("R. v. Sparrow", "R v Sparrow") > 0.85);
});

test("duplicate detection follows file-number, name/year, and official-URL fallbacks", () => {
  const existing = [{ id: "existing", caseName: "Example First Nation v Canada", court: "Federal Court", courtFileNumber: "T-123-25", decisionDate: "2025-03-01", year: 2025, officialDecisionUrl: "https://decisions.fct-cf.gc.ca/example/" }];
  assert.match(findDuplicate({ id: "a", court: "Federal Court", courtFileNumber: "t-123-25", decisionDate: "2025-03-01" }, existing).reasons[0], /file number/);
  assert.ok(findDuplicate({ id: "b", caseName: "Example First Nation v. Canada", year: 2025 }, existing).duplicateOf);
  assert.match(findDuplicate({ id: "c", officialDecisionUrl: "https://decisions.fct-cf.gc.ca/example#p1" }, existing).reasons[0], /URL/);
});

test("ongoing classification never ignores a released final decision unless an appeal is confirmed", () => {
  const now = "2026-09-04T00:00:00.000Z";
  assert.equal(classifyCaseStatus({ decisionDate: "2025-01-10", sourceType: "OFFICIAL_JUDGMENT", decisionType: "FINAL_JUDGMENT", now }).status, "DECIDED");
  assert.equal(classifyCaseStatus({ decisionDate: "2025-01-10", latestDevelopment: "notice of appeal filed" }).status, "NEEDS_REVIEW");
  assert.equal(classifyCaseStatus({ sourceType: "OFFICIAL_DOCKET", retrievedAt: now, latestDevelopmentDate: "2026-08-30", latestDevelopment: "notice of appeal filed", now }).status, "APPEAL_PENDING");
  assert.equal(classifyCaseStatus({ sourceType: "OFFICIAL_DOCKET", retrievedAt: now, upcomingHearingDate: "2026-10-01", proceduralStage: "hearing scheduled", now }).status, "ONGOING");
  assert.equal(classifyCaseStatus({}).status, "NEEDS_REVIEW");
});

test("court roster covers every jurisdiction and required court level", () => {
  for (const jurisdiction of Object.keys(JURISDICTIONS)) {
    const levels = courtCoverage.filter((court) => court.jurisdiction === jurisdiction).map((court) => court.level);
    assert.ok(levels.length, `missing ${jurisdiction}`);
    if (jurisdiction !== "CA" && jurisdiction !== "NU") for (const level of ["appellate", "superior", "provincial"] as const) assert.ok(levels.includes(level), `${jurisdiction} missing ${level}`);
    if (jurisdiction === "NU") assert.ok(levels.includes("unified"));
  }
});

test("French and English nationwide queries are jurisdiction-filtered", () => {
  const french = buildSearchQueries(0, 100, { jurisdiction: "QC", topic: "obligation de consulter", year: 2024 });
  assert.ok(french.every((query) => /Quebec|Québec|qc|courdappel|courduquebec|coursuperieure/i.test(query)));
  assert.ok(french.some((query) => query.includes("obligation de consulter")));
  const broad = buildSearchQueries(0, 100);
  assert.ok(broad.some((query) => /titre ancestral|droits ancestraux/.test(query)));
});

test("distinct decisions sharing a court file are linked, not collapsed", () => {
  const old = [{ id: "a", court: "Federal Court", courtFileNumber: "T-1-25", neutralCitation: "2025 FC 1", decisionDate: "2025-01-01", decisionType: "INTERLOCUTORY" }];
  const next = { id: "b", court: "Federal Court", courtFileNumber: "T-1-25", neutralCitation: "2025 FC 99", decisionDate: "2025-03-01", decisionType: "FINAL_JUDGMENT" };
  assert.equal(findDuplicate(next, old).duplicateOf, undefined);
  assert.equal(relatedProceedings(next, old)[0]?.relationship, "SAME_PROCEEDING");
});

test("restricted sources and pages are rejected before retention", () => {
  assert.throws(() => assertSourceAllowed("https://www.canlii.org/en/ca/scc/doc/2020/2020scc1/"), /authorized|API-only/);
  assert.match(restrictionReason('<meta name="robots" content="noindex">')!, /robots/);
  assert.match(restrictionReason("This proceeding is subject to a publication ban")!, /publication/);
  assert.throws(() => validateDiscoveryOptions({ maxPages: 1000 }), /maxPages/);
});

test("field evidence is retained and names are not treated as Indigenous identity", () => {
  const html = '<html><head><title>Haida Nation v Canada, 2026 FC 10</title><meta name="lbh-title" content="Haida Nation v Canada"><meta name="lbh-citation" content="2026 FC 10"><meta name="lbh-court" content="Federal Court"><meta name="lbh-decision-date" content="2026-02-01"></head><body><h1>Final judgment: Haida Nation v Canada</h1><p>Reasons for judgment concerning section 35 and duty to consult.</p></body></html>';
  const doc = { ...extractHtml(html), html, normalizedUrl: "https://decisions.fct-cf.gc.ca/fc-cf/decisions/en/item/10/index.do", contentHash: "hash", mimeType: "text/html", extractionMethod: "HTML_TEXT", notModified: false };
  const result = parseCandidate(doc, { name: "Federal Court", url: "https://decisions.fct-cf.gc.ca/", jurisdiction: "CA", kind: "court", access: "public" }, "2026-09-04T00:00:00.000Z");
  assert.equal(result?.verification, "VERIFIED_PRIMARY");
  assert.equal(result?.extracted.IndigenousNation?.length, 0);
  assert.equal(result?.verificationSources[0].fieldEvidence?.neutralCitation?.value, "2026 FC 10");
});

test("dry-run scanner performs no writes and reports inaccessible sources", async () => {
  const source = { name: "Test Court", url: "https://decisions.fct-cf.gc.ca/start", jurisdiction: "CA" as const, kind: "court" as const, access: "public" as const };
  const result = await discoverNationwide({ dryRun: true, jurisdiction: "CA", maxPages: 1, queryLimit: 0 }, { sources: [source], fetchDocument: async () => { throw new Error("robots.txt disallows access"); } });
  assert.equal(result.productionWrites, 0);
  assert.equal(result.inaccessible.length, 1);
  assert.equal(result.stopReason, "PAGE_BUDGET");
});

test("parses Canadian neutral, reported and statutory citations", () => {
  const parsed = parseLegalCitations("See 2014 SCC 44, [1990] 1 S.C.R. 1075 and S.C. 2021, c. 14.");
  assert.ok(parsed.some((item) => item.citation === "2014 SCC 44" && item.kind === "NEUTRAL"));
  assert.ok(parsed.some((item) => item.kind === "REPORTED"));
  assert.ok(parsed.some((item) => item.kind === "STATUTE"));
});

test("verification requires authoritative evidence and core identifiers", () => {
  const source = { url: "https://decisions.scc-csc.ca/example", tier: 1 as const, sourceType: "JUDGMENT" as const, supports: ["citation"], authoritative: true };
  assert.equal(determineVerification({ sources: [source], title: "Example v Canada", court: "Supreme Court of Canada", decisionDate: "2024-01-01", citation: "2024 SCC 1" }).level, "VERIFIED_PRIMARY");
  assert.equal(determineVerification({ sources: [], title: "Claimed case" }).level, "UNVERIFIED");
  assert.equal(canPublish("UNVERIFIED"), false);
  assert.equal(canPublish("VERIFIED_PRIMARY"), true);
});

test("missing core information cannot be marked verified", () => {
  const source = { url: "https://decisions.scc-csc.ca/example", tier: 1 as const, sourceType: "JUDGMENT" as const, supports: [], authoritative: true };
  assert.equal(determineVerification({ sources: [source], title: "Unconfirmed matter" }).level, "PARTIALLY_VERIFIED");
});

test("source policy applies the seven-rank evidence hierarchy", () => {
  const judgment = classifyEvidenceSource("https://decisions.fct-cf.gc.ca/fc-cf/decisions/en/item/1/index.do", aiCase, findTrustedDomain("decisions.fct-cf.gc.ca"));
  const docket = classifyEvidenceSource("https://www-u.fct-cf.gc.ca/en/court-files-and-decisions/court-files", aiCase, findTrustedDomain("www-u.fct-cf.gc.ca"));
  const canlii = classifyEvidenceSource("https://www.canlii.org/en/ca/fct/doc/2026/2026fc1/2026fc1.html", aiCase, findTrustedDomain("www.canlii.org"));
  const regulator = classifyEvidenceSource("https://www.aer.ca/regulating-development/project-application/decisions", aiCase, findTrustedDomain("www.aer.ca"));
  assert.equal(judgment.evidenceRank, 1);
  assert.equal(docket.evidenceRank, 2);
  assert.equal(canlii.evidenceRank, 3);
  assert.equal(regulator.evidenceRank, 4);
  assert.ok(docket.verifies.includes("proceduralStage"));
  assert.ok(!docket.verifies.includes("decision"));
});

test("government, Indigenous organization, regulatory, and news sources cannot independently verify a case", () => {
  for (const evidenceRank of [4, 5, 6, 7] as const) {
    const source = { url: `https://source${evidenceRank}.example/item`, tier: 1 as const, evidenceRank, sourceType: "OFFICIAL_REGULATORY_RECORD" as const, verifies: ["context" as const], supports: ["Document text"], authoritative: evidenceRank === 4 };
    assert.equal(determineVerification({ sources: [source], title: "Nation v Canada", court: "Federal Court", decisionDate: "2026-01-01", citation: "2026 FC 1" }).level, "PARTIALLY_VERIFIED");
  }
});

test("malformed HTML is sanitized and does not execute or retain script content", () => {
  const result = extractHtml("<title>Case &amp; test</title><script>danger()</script><p>Reasons <b>allowed</b>");
  assert.equal(result.title, "Case & test");
  assert.equal(result.text.includes("danger"), false);
  assert.match(result.text, /Reasons allowed/);
});

test("request retries stop and surface parser fetch failures", async () => {
  let calls = 0;
  const fetcher = async () => { calls += 1; throw new Error("network unavailable"); };
  await assert.rejects(() => fetchWithRetry("https://example.test", {}, { attempts: 2, timeoutMs: 1_000, fetcher: fetcher as typeof fetch }), /network unavailable/);
  assert.equal(calls, 2);
});

test("lower-confidence extraction cannot replace reviewed information", () => {
  const existing = { courtDecision: "Reviewed outcome", verificationSources: [{ url: "https://court.example/judgment" }] };
  const merged = mergeWithoutDowngrade(existing, { courtDecision: "AI guess", verificationSources: [{ url: "https://news.example/story" }] }, "VERIFIED_PRIMARY", "UNVERIFIED");
  assert.equal(merged.courtDecision, "Reviewed outcome");
  assert.equal(merged.verificationSources.length, 2);
});

test("AI output validation rejects unknown categories and malformed confidence", () => {
  const valid = { relevance: "RELEVANT", confidence: 0.91, recordType: "CASE", categories: ["Section 35"], proposedTitle: "Example", summary: "A document-grounded summary.", significanceSignals: [], nations: [], citations: ["2024 SCC 1"], verificationNeeded: [], court: "Supreme Court of Canada", courtFileNumber: null, decisionDate: "2024-01-01", neutralCitation: "2024 SCC 1", legislationCitation: null, parties: [], constitutionalSections: ["s. 35"], legislationReferenced: [], casesCited: [], treatiesReferenced: [], impactSignals: [], proceduralStage: null, latestDevelopment: null, latestDevelopmentDate: null, upcomingHearingDate: null };
  assert.equal(validateAiClassification(valid), true);
  assert.equal(validateAiClassification({ ...valid, categories: ["Invented category"] }), false);
  assert.equal(validateAiClassification({ ...valid, confidence: 2 }), false);
});

test("domain rate limiter exposes the next permitted request", async () => {
  const limiter = new DomainRateLimiter();
  assert.equal(await limiter.wait("example.ca", 1, 2, 1_000), 0);
  assert.equal(limiter.peekDelay("example.ca", 1_000), 2_000);
  assert.equal(await limiter.wait("example.ca", 1, 2, 3_000), 0);
});
