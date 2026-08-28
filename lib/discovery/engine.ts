import "server-only";
import { claimNextDocument, enqueueDocument, listDuplicateCandidates, requeueMonitors, requeuePublishedForVerification, seedRecordRelationships, seedVerifiedRecords, updateDocument } from "../../db";
import { initialVerifiedCollection } from "../../data/initialCollection";
import { classifyLegalDocument } from "../server/aiDiscovery";
import { findDuplicate } from "./deduplicate";
import { fetchDocument } from "./fetchDocument";
import { assessImpact } from "./impact";
import { buildSearchQueries } from "./keywords";
import { domainForUrl, normalizeUrl } from "./normalize";
import { assessRelevance } from "./relevance";
import { discoverySeedUrls, trustedMonitorUrls } from "./seeds";
import { searchWeb } from "./search";
import { findTrustedDomain, tierForUrl } from "./trustedDomains";
import { determineVerification } from "./verification";
import type { AiClassification, EvidenceSource } from "./types";

export const scanSchedule = {
  incremental: "Every 6 hours: new judgments, appeal decisions, legislation and high-priority sources",
  broadDiscovery: "Daily: a rotating batch of 12 targeted web-search queries",
  citationRefresh: "Weekly: citation relationships and later-citing decisions",
  legalStatusRefresh: "Monthly: published records and current law status",
} as const;

function emptyCandidate(url: string, discoveredBy: "SEARCH" | "SEED" | "SITEMAP" | "CRAWL", title?: string, searchQuery?: string) {
  const normalizedUrl = normalizeUrl(url);
  return {
    url, normalizedUrl, sourceDomain: domainForUrl(url), sourceTier: tierForUrl(url), discoveredBy, searchQuery, title,
    relevance: "POSSIBLY_RELEVANT" as const, relevanceScore: 0, relevanceReasons: [], verification: "UNVERIFIED" as const,
    verificationSources: [], impactReasons: [], duplicateReasons: [], status: "DISCOVERED" as const,
  };
}

async function enqueueSeedsAndSearch(queryOffset: number, queryLimit: number): Promise<{ queriesRun: number; urlsDiscovered: number }> {
  let urlsDiscovered = 0;
  for (const url of discoverySeedUrls) {
    try { if (await enqueueDocument(emptyCandidate(url, "SEED"))) urlsDiscovered += 1; } catch { /* malformed or previously queued seed */ }
  }
  for (const url of trustedMonitorUrls) {
    try { if (await enqueueDocument(emptyCandidate(url, "SITEMAP"))) urlsDiscovered += 1; } catch { /* malformed or previously queued monitor */ }
  }
  const configuredFeeds = (process.env.OPENCOURT_FEED_URLS ?? "").split(",").map((value) => value.trim()).filter(Boolean).slice(0, 20);
  for (const url of configuredFeeds) {
    try { if (await enqueueDocument(emptyCandidate(url, "SITEMAP"))) urlsDiscovered += 1; } catch { /* malformed, untrusted or previously queued feed */ }
  }
  let queriesRun = 0;
  for (const query of buildSearchQueries(queryOffset, queryLimit)) {
    const results = await searchWeb(query, 10);
    queriesRun += 1;
    for (const result of results) {
      try { if (await enqueueDocument(emptyCandidate(result.url, "SEARCH", result.title, query))) urlsDiscovered += 1; } catch { /* reject malformed discovery URLs */ }
    }
  }
  return { queriesRun, urlsDiscovered };
}

const includesSignal = (ai: AiClassification, pattern: RegExp) => ai.impactSignals.some((signal) => pattern.test(signal.toLowerCase()));

function buildExtracted(ai: AiClassification, sourceUrl: string) {
  const title = ai.proposedTitle ?? "Untitled legal record";
  const slug = title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  if (ai.recordType === "CASE") return {
    id: crypto.randomUUID(), slug, caseName: title, neutralCitation: ai.neutralCitation ?? undefined, court: ai.court ?? "Unconfirmed court", jurisdiction: "Canada",
    decisionDate: ai.decisionDate ?? undefined, year: ai.decisionDate ? Number(ai.decisionDate.slice(0, 4)) : undefined, judges: [], parties: ai.parties,
    IndigenousNation: ai.nations, IndigenousPeople: [], treaty: ai.treatiesReferenced, provinceTerritory: [], legalIssues: ai.significanceSignals,
    categories: ai.categories, constitutionalSections: ai.constitutionalSections, legislationReferenced: ai.legislationReferenced, casesCited: ai.casesCited,
    casesCiting: [], plainLanguageSummary: ai.summary ?? "Summary pending editorial review.", currentLegalStatus: "Requires editorial confirmation", officialDecisionUrl: sourceUrl,
    additionalSources: [], sourceTier: tierForUrl(sourceUrl), verificationSources: [], dateDiscovered: new Date().toISOString(),
  };
  return {
    id: crypto.randomUUID(), slug, title, citation: ai.legislationCitation ?? ai.neutralCitation ?? undefined, jurisdiction: "Canada",
    categories: ai.categories, plainLanguageSummary: ai.summary ?? "Summary pending editorial review.", officialSourceUrl: sourceUrl,
    relatedCases: ai.casesCited, relatedTreaties: ai.treatiesReferenced,
  };
}

async function processOne(): Promise<"processed" | "empty"> {
  const candidate = await claimNextDocument();
  if (!candidate) return "empty";
  try {
    const fetched = await fetchDocument(candidate.url);
    if (fetched.notModified) {
      await updateDocument(candidate.id, { status: "REVIEW", contentHash: fetched.contentHash, relevanceReasons: ["Source unchanged since previous fetch"] });
      return "processed";
    }
    const trusted = findTrustedDomain(candidate.sourceDomain);
    if (trusted && fetched.links.length) {
      let queuedLinks = 0;
      for (const link of fetched.links) {
        if (queuedLinks >= 25) break;
        try {
          const target = new URL(link);
          const targetDomain = findTrustedDomain(target.hostname);
          if (!targetDomain || targetDomain.domain !== trusted.domain || !/(item|doc|decision|judgment|acts?|laws?|bills?|treaty|agreement|publication|fulltext)/i.test(target.pathname + target.search)) continue;
          if (await enqueueDocument(emptyCandidate(link, "CRAWL"))) queuedLinks += 1;
        } catch { /* ignore malformed or unsupported links */ }
      }
    }
    if (candidate.discoveredBy === "SITEMAP" || candidate.discoveredBy === "RSS") {
      await updateDocument(candidate.id, { title: fetched.title ?? candidate.title, mimeType: fetched.mimeType, contentHash: fetched.contentHash, status: "MONITOR", relevanceReasons: [`Trusted-source monitor; extracted ${fetched.links.length} links for bounded discovery`] });
      return "processed";
    }
    const relevance = assessRelevance({ title: fetched.title ?? candidate.title, text: fetched.text.slice(0, 100_000), url: candidate.url, tier: candidate.sourceTier });
    if (relevance.label === "NOT_RELEVANT") {
      await updateDocument(candidate.id, { title: fetched.title ?? candidate.title, mimeType: fetched.mimeType, contentHash: fetched.contentHash, relevance: relevance.label, relevanceScore: relevance.score, relevanceReasons: relevance.reasons, status: "REJECTED", lastError: "Rejected by deterministic relevance filter before AI" });
      return "processed";
    }
    if (!fetched.text.trim()) {
      await updateDocument(candidate.id, { title: fetched.title ?? candidate.title, mimeType: fetched.mimeType, contentHash: fetched.contentHash, relevance: relevance.label, relevanceScore: relevance.score, relevanceReasons: [...relevance.reasons, `Extraction status: ${fetched.extractionMethod}`], status: "REVIEW", lastError: "Document cached, but text extraction requires the configured PDF extraction/OCR service" });
      return "processed";
    }

    let ai: AiClassification | undefined;
    let aiError: string | undefined;
    try { ai = await classifyLegalDocument({ contentHash: fetched.contentHash, url: candidate.url, title: fetched.title ?? candidate.title, text: fetched.text }); }
    catch (error) { aiError = error instanceof Error ? error.message : "AI processing failed"; }

    if (!ai) {
      await updateDocument(candidate.id, { title: fetched.title ?? candidate.title, mimeType: fetched.mimeType, contentHash: fetched.contentHash, relevance: relevance.label, relevanceScore: relevance.score, relevanceReasons: relevance.reasons, status: "REVIEW", lastError: `AI deferred: ${aiError}` });
      return "processed";
    }
    if (ai.relevance === "NOT_RELEVANT") {
      await updateDocument(candidate.id, { title: ai.proposedTitle ?? fetched.title ?? candidate.title, mimeType: fetched.mimeType, contentHash: fetched.contentHash, relevance: ai.relevance, relevanceScore: Math.round(ai.confidence * 100), relevanceReasons: [...relevance.reasons, "AI classification rejected the document"], aiConfidence: ai.confidence, status: "REJECTED" });
      return "processed";
    }

    const evidence: EvidenceSource = { url: fetched.normalizedUrl, title: ai.proposedTitle ?? fetched.title, publisher: trusted?.sourceName, tier: candidate.sourceTier, sourceType: ai.recordType === "CASE" ? "JUDGMENT" : ai.recordType === "LAW" ? "LEGISLATION" : ai.recordType === "TREATY" ? "TREATY" : candidate.sourceTier === 1 ? "GOVERNMENT" : "CONTEXT", retrievedAt: new Date().toISOString(), contentHash: fetched.contentHash, supports: ["Document text", ...ai.citations], authoritative: candidate.sourceTier === 1 };
    const verification = determineVerification({ sources: [evidence], title: ai.proposedTitle ?? undefined, court: ai.court ?? undefined, decisionDate: ai.decisionDate ?? undefined, citation: ai.neutralCitation ?? ai.legislationCitation ?? undefined });
    const impact = assessImpact({ court: ai.court ?? undefined, createdLegalTest: includesSignal(ai, /new legal test|framework/), changedSection35: includesSignal(ai, /section 35/), recognizedTitle: includesSignal(ai, /aboriginal title/), recognizedTreatyRight: includesSignal(ai, /treaty right/), consultationObligation: includesSignal(ai, /consult/), changedIndigenousJurisdiction: includesSignal(ai, /jurisdiction/), struckLegislation: includesSignal(ai, /invalid|strike|inoperative/), changedCrownObligations: includesSignal(ai, /crown obligation|honour of the crown|fiduciary/), nationalEffect: includesSignal(ai, /national|canada-wide/), historicallySignificant: ai.recordType === "HISTORICAL_DEVELOPMENT", causedLegislativeChange: includesSignal(ai, /legislative change/) });
    const extracted = buildExtracted(ai, fetched.normalizedUrl);
    const duplicates = ai.recordType === "CASE" ? findDuplicate({ id: candidate.id, caseName: ai.proposedTitle ?? undefined, neutralCitation: ai.neutralCitation ?? undefined, decisionDate: ai.decisionDate ?? undefined, court: ai.court ?? undefined }, await listDuplicateCandidates()) : { reasons: [], confidence: 0 };
    await updateDocument(candidate.id, {
      title: ai.proposedTitle ?? fetched.title ?? candidate.title, mimeType: fetched.mimeType, contentHash: fetched.contentHash,
      relevance: ai.relevance, relevanceScore: Math.max(relevance.score, Math.round(ai.confidence * 100)), relevanceReasons: [...relevance.reasons, "AI classification passed schema validation"],
      proposedType: ai.recordType ?? undefined, aiConfidence: ai.confidence, extracted, verification: verification.level, verificationSources: [evidence],
      impactScore: impact.impactScore, impactReasons: impact.impactReasons, duplicateOf: duplicates.duplicateOf, duplicateReasons: duplicates.reasons,
      status: "REVIEW", lastError: ai.verificationNeeded.length ? `Verification needed: ${ai.verificationNeeded.join("; ")}` : undefined,
    });
    return "processed";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    const attempts = Number((candidate as unknown as { attempts?: number }).attempts ?? 1);
    const retryHours = Math.min(72, 2 ** Math.min(attempts, 6));
    await updateDocument(candidate.id, { status: "FAILED", lastError: message, nextAttemptAt: new Date(Date.now() + retryHours * 3_600_000).toISOString() });
    return "processed";
  }
}

export async function runDiscoveryBatch(options: { queryOffset?: number; queryLimit?: number; processLimit?: number } = {}) {
  const queryOffset = Math.max(0, options.queryOffset ?? (new Date().getUTCDate() - 1) * 12);
  const queryLimit = Math.min(25, Math.max(0, options.queryLimit ?? 12));
  const processLimit = Math.min(25, Math.max(1, options.processLimit ?? 8));
  const monitorsRequeued = await requeueMonitors(6);
  const publishedRequeued = await requeuePublishedForVerification(30);
  const seededRecords = (await seedVerifiedRecords(initialVerifiedCollection.cases as unknown as Array<Record<string, unknown> & { id: string; slug: string; impactScore: number; verified: "VERIFIED_PRIMARY" }>, "CASE"))
    + (await seedVerifiedRecords(initialVerifiedCollection.laws as unknown as Array<Record<string, unknown> & { id: string; slug: string; impactScore: number; verified: "VERIFIED_PRIMARY" }>, "LAW"));
  const seededRelationships = await seedRecordRelationships([...(initialVerifiedCollection.cases as unknown as Array<Record<string, unknown> & { id: string; slug: string }>), ...(initialVerifiedCollection.laws as unknown as Array<Record<string, unknown> & { id: string; slug: string }>)]);
  const discovery = await enqueueSeedsAndSearch(queryOffset, queryLimit);
  let documentsProcessed = 0;
  for (let index = 0; index < processLimit; index += 1) {
    if (await processOne() === "empty") break;
    documentsProcessed += 1;
  }
  return { ...discovery, seededRecords, seededRelationships, monitorsRequeued, publishedRequeued, documentsProcessed, queryOffset, queryLimit, processLimit };
}
