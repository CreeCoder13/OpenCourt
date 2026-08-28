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

test("AI output validation rejects unknown categories and malformed confidence", () => {
  const valid = { relevance: "RELEVANT", confidence: 0.91, recordType: "CASE", categories: ["Section 35"], proposedTitle: "Example", summary: "A document-grounded summary.", significanceSignals: [], nations: [], citations: ["2024 SCC 1"], verificationNeeded: [], court: "Supreme Court of Canada", decisionDate: "2024-01-01", neutralCitation: "2024 SCC 1", legislationCitation: null, parties: [], constitutionalSections: ["s. 35"], legislationReferenced: [], casesCited: [], treatiesReferenced: [], impactSignals: [] };
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
