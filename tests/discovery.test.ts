import assert from "node:assert/strict";
import test from "node:test";
import { validateAiClassification } from "../lib/discovery/aiValidation.ts";
import { parseLegalCitations } from "../lib/discovery/citations.ts";
import { findDuplicate, titleSimilarity } from "../lib/discovery/deduplicate.ts";
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

test("official monitors cover national, provincial, territorial, and CanLII sources", () => {
  assert.ok(officialSourceMonitors.length >= 30);
  for (const marker of ["scc-csc.ca", "fct-cf.gc.ca", "bccourts.ca", "ontariocourts.ca", "yukoncourts.ca", "nwtcourts.ca", "nunavutcourts.ca", "canlii.org/en/qc/"]) {
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
  const existing = [{ id: "existing", caseName: "Example First Nation v Canada", courtFileNumber: "T-123-25", year: 2025, officialDecisionUrl: "https://decisions.fct-cf.gc.ca/example/" }];
  assert.match(findDuplicate({ id: "a", courtFileNumber: "t-123-25" }, existing).reasons[0], /file number/);
  assert.ok(findDuplicate({ id: "b", caseName: "Example First Nation v. Canada", year: 2025 }, existing).duplicateOf);
  assert.match(findDuplicate({ id: "c", officialDecisionUrl: "https://decisions.fct-cf.gc.ca/example#p1" }, existing).reasons[0], /URL/);
});

test("ongoing classification never ignores a released final decision unless an appeal is confirmed", () => {
  assert.equal(classifyCaseStatus({ decisionDate: "2025-01-10", proceduralStage: "decision released" }).status, "DECIDED");
  assert.equal(classifyCaseStatus({ decisionDate: "2025-01-10", latestDevelopment: "notice of appeal filed" }).status, "APPEAL_PENDING");
  assert.equal(classifyCaseStatus({ upcomingHearingDate: "2026-10-01", proceduralStage: "hearing scheduled" }).status, "ONGOING");
  assert.equal(classifyCaseStatus({}).status, "NEEDS_REVIEW");
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
