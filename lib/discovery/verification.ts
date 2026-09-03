import type { EvidenceField, EvidenceSource, VerificationLevel } from "./types.ts";

export interface VerificationInput {
  sources: EvidenceSource[];
  title?: string;
  court?: string;
  decisionDate?: string;
  citation?: string;
  officialIdentifier?: string;
}

export const EVIDENCE_RANK_LABELS = {
  1: "Official court or tribunal judgment",
  2: "Official docket, registry, or hearing record",
  3: "CanLII judgment copy",
  4: "Official legislation or regulatory record",
  5: "Official Indigenous government or organization",
  6: "Government announcement",
  7: "Legal commentary or news",
} as const;

function rankFor(source: EvidenceSource) {
  return source.evidenceRank ?? (source.sourceType === "JUDGMENT" && source.authoritative ? 1 : source.sourceType === "LEGISLATION" ? 4 : 7);
}

export function canSourceVerifyField(source: EvidenceSource, field: EvidenceField): boolean {
  if (rankFor(source) > 3) return false;
  if (source.verifies) return source.verifies.includes(field);
  return source.sourceType === "JUDGMENT" && source.authoritative
    && ["caseName", "court", "neutralCitation", "decisionDate", "decision"].includes(field);
}

export function determineVerification(input: VerificationInput): { level: VerificationLevel; reasons: string[] } {
  const eligible = input.sources.filter((source) => rankFor(source) <= 3);
  const independent = new Set(eligible.map((source) => new URL(source.url).hostname.replace(/^www\./, "")));
  const present = new Set<EvidenceField>();
  if (input.title) present.add("caseName");
  if (input.court) present.add("court");
  if (input.decisionDate) present.add("decisionDate");
  if (input.citation) present.add("neutralCitation");
  if (input.officialIdentifier) present.add("courtFileNumber");
  const legacyFields: EvidenceField[] = ["caseName", "court", "neutralCitation", "decisionDate", "courtFileNumber"];
  const confirmed = new Set<EvidenceField>();
  for (const source of eligible) {
    const allowed = source.verifies ?? legacyFields;
    for (const field of allowed) if (present.has(field) && canSourceVerifyField(source, field)) confirmed.add(field);
  }
  const hasIdentity = confirmed.has("caseName") && confirmed.has("court")
    && (confirmed.has("neutralCitation") || confirmed.has("courtFileNumber") || confirmed.has("decisionDate"));
  const reasons: string[] = [];

  if (hasIdentity && independent.size >= 2) {
    reasons.push("Core identity confirmed by eligible judgment or docket evidence", "Independent eligible corroborating source retained");
    return { level: "VERIFIED_MULTIPLE", reasons };
  }
  if (hasIdentity) {
    reasons.push("Core identity confirmed by an official judgment, official docket, or CanLII judgment copy");
    return { level: "VERIFIED_PRIMARY", reasons };
  }
  if (eligible.length || input.sources.length) {
    reasons.push("Evidence is retained, but the source class or confirmed core fields are insufficient for verification");
    return { level: "PARTIALLY_VERIFIED", reasons };
  }
  reasons.push("No sufficient authoritative source has been attached");
  return { level: "UNVERIFIED", reasons };
}

export function canPublish(level: VerificationLevel): boolean {
  return level === "VERIFIED_PRIMARY" || level === "VERIFIED_MULTIPLE";
}
