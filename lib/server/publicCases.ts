import "server-only";
import { listPublishedCasePayloads } from "../../db";
import { allCases as staticCases } from "../../data/cases";
import type { CaseOutcome, CaseRecord, Source } from "../../data/types";
import type { EvidenceSource, VerificationLevel } from "../discovery/types";

const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())) : [];
const text = (value: unknown): string => typeof value === "string" ? value : "";
const verificationLevel = (value: VerificationLevel): CaseRecord["verificationLevel"] => value === "VERIFIED_PRIMARY" || value === "VERIFIED_MULTIPLE" ? "Verified" : value === "PARTIALLY_VERIFIED" ? "Secondary Source" : "Needs Verification";

function sources(value: unknown, accessedDate: string): Source[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((raw, index) => {
    if (!raw || typeof raw !== "object") return [];
    const source = raw as Partial<EvidenceSource>;
    if (!source.url) return [];
    return [{
      id: `ingested-source-${index}-${source.contentHash?.slice(0, 10) ?? "source"}`,
      title: source.title || source.publisher || "Source document",
      publisher: source.publisher || new URL(source.url).hostname,
      url: source.url,
      type: source.authoritative ? "Primary" as const : "Secondary" as const,
      category: source.sourceType === "JUDGMENT" ? "Judgment" as const : source.sourceType === "CONTEXT" ? "Background Explainer" as const : "Case Information" as const,
      verificationStatus: source.authoritative ? "Verified" as const : "Secondary Source" as const,
      supports: source.supports || [],
      accessedDate: source.retrievedAt?.slice(0, 10) || accessedDate,
    }];
  });
}

function toPublicCase(payload: Record<string, unknown>, verified: VerificationLevel, updatedAt: string): CaseRecord | undefined {
  const slug = text(payload.slug);
  const caseName = text(payload.caseName);
  if (!slug || !caseName) return undefined;
  const ongoing = payload.caseType === "ongoing";
  const citation = text(payload.neutralCitation) || text(payload.reportedCitation);
  const decisionDate = text(payload.decisionDate);
  const lastVerified = text(payload.lastVerified).slice(0, 10) || updatedAt.slice(0, 10);
  const summary = text(payload.plainLanguageSummary);
  const sourceList = sources(payload.verificationSources, lastVerified);
  const outcomeValue = text(payload.decisionOutcome);
  const permittedOutcomes: CaseOutcome[] = ["Nation Successful", "Government Successful", "Mixed Decision", "Ongoing", "Appeal Pending", "Settled", "Not Classified"];
  const outcome: CaseOutcome = ongoing ? (text(payload.currentLegalStatus) === "APPEAL_PENDING" ? "Appeal Pending" : "Ongoing") : permittedOutcomes.includes(outcomeValue as CaseOutcome) ? outcomeValue as CaseOutcome : "Not Classified";
  const group = strings(payload.IndigenousPeople)[0];
  const indigenousGroup: CaseRecord["indigenousGroup"] = group === "First Nations" || group === "Métis" || group === "Inuit" ? group : "Other";
  return {
    id: text(payload.id) || `ingested-${slug}`, slug, caseName, caseType: ongoing ? "ongoing" : "past", courtFileNumber: text(payload.courtFileNumber) || undefined,
    officialCitation: citation, neutralCitation: text(payload.neutralCitation) || undefined, court: text(payload.court) || "Court not confirmed", courtLevel: text(payload.court) || "Court not confirmed",
    provinceTerritory: strings(payload.provinceTerritory).join(", ") || text(payload.jurisdiction) || "Canada", decisionDate, filingDate: text(payload.filingDate) || undefined,
    status: ongoing ? (outcome === "Appeal Pending" ? "Appeal Pending" : "Ongoing") : "Decided", outcome, landmark: Number(payload.impactScore || 0) >= 90,
    significance: Math.max(0, Math.min(10, Math.round(Number(payload.impactScore || 0) / 10))), summaryShort: summary, summaryFull: summary,
    legalIssues: strings(payload.legalIssues), lawsInvolved: [...strings(payload.legislationReferenced), ...strings(payload.constitutionalSections)], facts: text(payload.background),
    indigenousArgument: text(payload.legalQuestion), otherPartyArgument: "", decision: text(payload.courtDecision), importance: text(payload.impact), beforeCase: "", afterCase: text(payload.impact),
    legalTopics: strings(payload.categories), treaties: strings(payload.treaty), indigenousCommunities: strings(payload.IndigenousNation), indigenousGroup, parties: strings(payload.parties), judges: strings(payload.judges),
    importantQuotes: [], sources: sourceList, relatedCases: [], timelineEvents: decisionDate ? [{ date: decisionDate, court: text(payload.court), citation, outcome: text(payload.courtDecision), sourceUrl: text(payload.officialDecisionUrl) || text(payload.canLIIUrl) || undefined }] : [],
    currentStatus: ongoing ? (outcome === "Appeal Pending" ? "Under appeal" : text(payload.proceduralStage).toLowerCase().includes("hearing scheduled") ? "Hearing scheduled" : "Filed") : undefined, latestDevelopment: text(payload.latestDevelopment) || undefined, latestDevelopmentDate: text(payload.latestDevelopmentDate) || undefined,
    nextHearingDate: text(payload.upcomingHearingDate) || undefined, verificationLevel: verificationLevel(verified), contentStatus: "Published", lastVerified,
    createdAt: text(payload.dateDiscovered).slice(0, 10) || lastVerified, updatedAt: updatedAt.slice(0, 10),
  };
}

export async function getPublicCases(): Promise<CaseRecord[]> {
  try {
    const published = await listPublishedCasePayloads();
    const dynamic = published.map((record) => toPublicCase(record.payload, record.verification, record.updatedAt)).filter((record): record is CaseRecord => Boolean(record));
    const bySlug = new Map(dynamic.map((record) => [record.slug, record]));
    for (const record of staticCases) bySlug.set(record.slug, record);
    return [...bySlug.values()];
  } catch {
    return staticCases;
  }
}

export async function getPublicCaseBySlug(slug: string): Promise<CaseRecord | undefined> {
  return (await getPublicCases()).find((record) => record.slug === slug);
}
