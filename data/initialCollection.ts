import { cases } from "./cases";
import { laws } from "./laws";
import { assessImpact } from "../lib/discovery/impact";
import type { CourtCaseRecord, EvidenceSource } from "../lib/discovery/types";

const testCases = new Set(["r-v-sparrow-1990", "r-v-van-der-peet-1996", "r-v-powley-2003", "haida-nation-v-british-columbia-2004"]);
const titleCases = new Set(["calder-v-british-columbia-1973", "delgamuukw-v-british-columbia-1997", "tsilhqotin-nation-v-british-columbia-2014"]);
const treatyCases = new Set(["r-v-marshall-1999", "mikisew-cree-first-nation-v-canada-2005"]);
const crownDutyCases = new Set(["guerin-v-the-queen-1984", "haida-nation-v-british-columbia-2004", "mikisew-cree-first-nation-v-canada-2005"]);

export const initialCases: CourtCaseRecord[] = cases.map((record) => {
  const impact = assessImpact({
    court: record.court,
    createdLegalTest: testCases.has(record.slug),
    changedSection35: record.legalTopics.includes("Section 35"),
    recognizedTitle: titleCases.has(record.slug),
    recognizedTreatyRight: treatyCases.has(record.slug),
    consultationObligation: record.legalTopics.includes("Duty to Consult"),
    changedCrownObligations: crownDutyCases.has(record.slug),
    nationalEffect: true,
    historicallySignificant: record.landmark,
  });
  const verificationSources: EvidenceSource[] = record.sources.map((source) => ({
    url: source.url, title: source.title, publisher: source.publisher, tier: source.type === "Primary" ? 1 : 3,
    sourceType: source.category === "Judgment" ? "JUDGMENT" : "CONTEXT", retrievedAt: source.accessedDate,
    supports: source.supports ?? [], authoritative: source.type === "Primary",
  }));
  return {
    id: record.id, slug: record.slug, caseName: record.caseName, shortName: record.caseName, neutralCitation: record.neutralCitation,
    reportedCitation: record.neutralCitation ? undefined : record.officialCitation, court: record.court, jurisdiction: "Canada",
    decisionDate: record.decisionDate, year: Number(record.decisionDate.slice(0, 4)), judges: record.judges, parties: record.parties,
    IndigenousNation: record.indigenousCommunities, IndigenousPeople: [record.indigenousGroup], treaty: record.treaties,
    provinceTerritory: [record.provinceTerritory], legalIssues: record.legalTopics, categories: [], constitutionalSections: record.legalTopics.includes("Section 35") ? ["Constitution Act, 1982, s. 35"] : [],
    legislationReferenced: [], casesCited: record.relatedCases.filter((relation) => relation.type === "Relied on" || relation.type === "Applied").map((relation) => relation.caseSlug),
    casesCiting: record.relatedCases.filter((relation) => relation.type === "Expanded" || relation.type === "Followed").map((relation) => relation.caseSlug),
    decisionOutcome: record.outcome, plainLanguageSummary: record.summaryFull, background: record.facts, legalQuestion: record.indigenousArgument,
    courtDecision: record.decision, reasoning: record.importance, impact: record.afterCase, ...impact,
    currentLegalStatus: record.status, officialDecisionUrl: record.sources.find((source) => source.category === "Judgment")?.url,
    additionalSources: verificationSources.filter((source) => !source.authoritative), sourceTier: 1, verified: "VERIFIED_PRIMARY",
    verificationSources, lastVerified: record.lastVerified, dateDiscovered: record.createdAt,
  };
});

export const initialVerifiedCollection = { cases: initialCases, laws };
