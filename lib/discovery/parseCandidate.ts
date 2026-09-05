import { extractHtml } from "./extract.ts";
import { normalizeCaseTitle, normalizeUrl } from "./normalize.ts";
import { assessRelevance } from "./relevance.ts";
import { courtForCitation } from "./jurisdictions.ts";
import { classifyCaseStatus } from "./caseStatus.ts";
import { determineVerification } from "./verification.ts";
import type { CrawlDocument } from "./crawler.ts";
import type { DiscoverySource } from "./nationwideSources.ts";
import type { AiClassification, CourtCaseRecord, DiscoveredDocument, EvidenceField, EvidenceSource } from "./types.ts";

export type PendingCandidate = Omit<DiscoveredDocument, "createdAt" | "updatedAt"> & { extracted: Partial<CourtCaseRecord> };
const clean = (value: string) => extractHtml(value).text;
const neutral = /\b(?:18|19|20)\d{2}\s+(?:SCC|CSC|FC|CF|FCA|CAF|FCT|CFPI|TCC|CCI|BCCA|BCSC|BCPC|ABCA|ABKB|ABQB|ABCJ|ABPC|SKCA|SKKB|SKQB|SKPC|MBCA|MBKB|MBQB|MBPC|ONCA|ONSC|ONCJ|QCCA|QCCS|QCCQ|NBCA|NBKB|NBQB|NBPC|NSCA|NSSC|NSPC|PECA|PESC|PESCTD|PESCAD|PEPC|NLCA|NLSC|NLPC|YKCA|YKSC|YKTC|YTCA|YTSC|YTTC|NWTCA|NWTSC|NWTTC|NUCA|NUCJ|SCTC|TRPC|CHRT|TCDP)\s+\d+\b/i;
function metadata(html: string) {
  const values = new Map<string, string>();
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const attrs = new Map([...tag.matchAll(/([\w:-]+)\s*=\s*["']([^"']*)["']/g)].map((m) => [m[1].toLowerCase(), clean(m[2])]));
    const name = attrs.get("name") ?? attrs.get("property");
    if (name && attrs.get("content")) values.set(name.toLowerCase(), attrs.get("content")!);
  }
  return values;
}
export function parseCandidate(doc: CrawlDocument, source: DiscoverySource, now = new Date().toISOString(), ai?: AiClassification): PendingCandidate | undefined {
  const relevance = assessRelevance({ title: doc.title, text: doc.text, tier: source.kind === "context" ? 3 : 1 });
  if (!relevance.matchedIndigenousTerms.length || !relevance.matchedLegalTerms.length || relevance.label === "NOT_RELEVANT") return;
  const meta = metadata(doc.html);
  const get = (...keys: string[]) => keys.map((key) => meta.get(key)).find(Boolean);
  const heading = clean(doc.html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const caseName = get("lbh-title", "citation_title", "dc.title") ?? ([heading, doc.title].find((value) => value && /\s(?:v\.?|c\.|versus)\s|reference re|renvoi relatif/i.test(value)));
  if (!caseName || caseName.length > 350) return; // Never treat a list/index as one proceeding.
  const ownCitation = get("lbh-citation", "citation_neutral_citation", "dc.identifier")?.match(neutral)?.[0]
    ?? `${heading} ${doc.title ?? ""}`.match(neutral)?.[0];
  const file = get("lbh-docket", "citation_docket_number") ?? doc.text.slice(0, 2500).match(/(?:Court File(?: Number| No\.)?|Docket(?: Number)?|N[o°] de dossier|Dossier)\s*[:#]\s*([A-Z0-9][A-Z0-9()\-/]{2,40})/i)?.[1];
  const date = get("lbh-decision-date", "citation_date", "dc.date")?.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
  const court = courtForCitation(ownCitation);
  const courtName = get("lbh-court", "citation_court");
  const location = new URL(doc.normalizedUrl).pathname;
  const docket = source.kind !== "context" && /docket|court-files|cases-dossiers|hearing|curre|claim.*revendication/i.test(location) && Boolean(file) && !ownCitation;
  const judgment = source.kind !== "context" && Boolean(ownCitation) && /\/item\/\d+|\/doc\/|judgment|jugement|decision|judgments|reasons|motifs/i.test(location);
  const sourceType = docket ? "OFFICIAL_DOCKET" : judgment ? "OFFICIAL_JUDGMENT" : "CONTEXT";
  const evidenceRank = docket ? 2 : judgment ? 1 : 7;
  const evidence: EvidenceSource = { url: doc.normalizedUrl, title: doc.title, publisher: source.name, tier: source.kind === "context" ? 3 : 1,
    sourceType, evidenceRank, authoritative: judgment || docket, retrievedAt: now, contentHash: doc.contentHash, supports: [], verifies: [], fieldEvidence: {} };
  const add = (field: EvidenceField, value: string | undefined, locator: string, quote = value, derivedBy?: string) => {
    if (!value || !quote) return;
    evidence.fieldEvidence![field] = { value, quote, locator, ...(derivedBy ? { derivedBy } : {}) };
    if (judgment || docket) evidence.verifies!.push(field);
  };
  add("caseName", caseName, "metadata/title/h1");
  add("neutralCitation", ownCitation, "metadata/title/h1");
  add("courtFileNumber", file, "metadata or labelled docket in first 2500 characters");
  add("decisionDate", date, "decision-date metadata");
  add("court", courtName ?? court?.name, courtName ? "court metadata" : "own neutral citation", courtName ?? ownCitation, courtName ? undefined : "court-code registry");
  // A judgment may quote a previous interlocutory order or a party's requested relief.
  // Classify only an explicitly labelled type in metadata or the decision heading.
  const typeText = `${get("decision-type", "lbh-decision-type") ?? ""} ${heading}`;
  const decisionType = docket ? "DOCKET" : /interlocutory|interlocutoire/i.test(typeText) ? "INTERLOCUTORY"
    : /final judgment|final decision|jugement final|décision finale/i.test(typeText) ? "FINAL_JUDGMENT" : "DECISION_UNSPECIFIED";
  const grounded = (value?: string | null) => value && doc.text.includes(value) ? value : undefined;
  const stage = docket ? grounded(ai?.proceduralStage) : undefined;
  const development = docket ? grounded(ai?.latestDevelopment) : undefined;
  const developmentDate = docket ? grounded(ai?.latestDevelopmentDate) : undefined;
  const hearing = docket ? grounded(ai?.upcomingHearingDate) : undefined;
  // Both date and event must occur together, not elsewhere in a multi-case page.
  const event = development && developmentDate && doc.text.includes(`${developmentDate} ${development}`) ? development : undefined;
  const scheduled = hearing && stage && doc.text.includes(`${hearing} ${stage}`) ? hearing : undefined;
  add("proceduralStage", event ?? (scheduled ? stage : undefined), "dated official docket event");
  add("caseStatus", event, "dated official docket event", event ? `${developmentDate} ${event}` : undefined);
  add("upcomingHearingDate", scheduled, "dated official hearing record", scheduled ? `${scheduled} ${stage}` : undefined);
  const status = classifyCaseStatus({ sourceType, retrievedAt: now, now, decisionType, decisionDate: date, latestDevelopment: event, latestDevelopmentDate: event ? developmentDate : undefined, upcomingHearingDate: scheduled, proceduralStage: event ?? (scheduled ? stage : undefined) });
  const verification = determineVerification({ sources: [evidence], title: caseName, court: courtName ?? court?.name, citation: ownCitation, decisionDate: date, officialIdentifier: file });
  const id = crypto.randomUUID();
  const identity = ownCitation ?? `${courtName ?? court?.name ?? source.jurisdiction}-${file ?? ""}-${date ?? ""}-${doc.contentHash.slice(0, 10)}`;
  const appealOf = [...doc.text.matchAll(/(?:appeal from|appel (?:du|de la) jugement)[^.;]{0,120}/gi)].flatMap((m) => {
    const citation = m[0].match(neutral)?.[0];
    return citation && citation !== ownCitation ? [{ citation, relationship: "APPEAL_OF" as const, evidenceUrl: doc.normalizedUrl, verified: false }] : [];
  });
  return { id, url: doc.normalizedUrl, normalizedUrl: normalizeUrl(doc.normalizedUrl), sourceDomain: new URL(doc.normalizedUrl).hostname,
    sourceTier: evidence.tier, discoveredBy: "CRAWL", title: caseName, mimeType: doc.mimeType, contentHash: doc.contentHash,
    relevance: relevance.label, relevanceScore: relevance.score, relevanceReasons: relevance.reasons, proposedType: "CASE",
    verification: verification.level, verificationSources: [evidence], impactReasons: [], duplicateReasons: [], status: "REVIEW",
    lastError: [...verification.reasons, ...status.reasons, "Publication/privacy clearance and editorial approval required"].join("; "),
    extracted: { id, slug: normalizeCaseTitle(`${caseName} ${identity}`).replace(/ /g, "-"), caseName,
      neutralCitation: ownCitation, courtFileNumber: file, court: courtName ?? court?.name, jurisdiction: court?.jurisdiction ?? source.jurisdiction,
      provinceTerritory: court?.jurisdiction && court.jurisdiction !== "CA" ? [court.jurisdiction] : [], decisionDate: date,
      year: date ? Number(date.slice(0, 4)) : ownCitation ? Number(ownCitation.slice(0, 4)) : undefined,
      decisionType, proceedingType: source.kind === "tribunal" ? "TRIBUNAL" : court?.level === "appellate" ? "APPEAL" : court ? "TRIAL" : "UNKNOWN",
      currentLegalStatus: status.status, caseType: status.caseType, latestDevelopment: event, latestDevelopmentDate: event ? developmentDate : undefined,
      upcomingHearingDate: scheduled, statusEvidenceDate: event ? developmentDate : scheduled, proceduralStage: event ?? (scheduled ? stage : undefined),
      officialDecisionUrl: judgment ? doc.normalizedUrl : undefined, verificationSources: [evidence], relatedProceedings: appealOf,
      // Nation/identity extraction is editorial-only. Names in a text do not establish membership.
      IndigenousNation: [], IndigenousPeople: [], categories: ai?.categories ?? [],
      plainLanguageSummary: "Source located; summary and legal significance require editorial review.", dateDiscovered: now,
    } };
}
