import type { EvidenceSource, VerificationLevel } from "./types.ts";

export interface VerificationInput {
  sources: EvidenceSource[];
  title?: string;
  court?: string;
  decisionDate?: string;
  citation?: string;
  officialIdentifier?: string;
}

export function determineVerification(input: VerificationInput): { level: VerificationLevel; reasons: string[] } {
  const primary = input.sources.filter((source) => source.tier === 1 && source.authoritative);
  const independent = new Set(input.sources.map((source) => new URL(source.url).hostname.replace(/^www\./, "")));
  const identityFields = [input.title, input.court, input.decisionDate, input.citation ?? input.officialIdentifier].filter(Boolean).length;
  const reasons: string[] = [];

  if (primary.length && identityFields >= 3 && independent.size >= 2) {
    reasons.push("Core identity confirmed by an authoritative primary source", "Independent corroborating source retained");
    return { level: "VERIFIED_MULTIPLE", reasons };
  }
  if (primary.length && identityFields >= 3) {
    reasons.push("Core identity confirmed by an authoritative primary source");
    return { level: "VERIFIED_PRIMARY", reasons };
  }
  if (primary.length || (independent.size >= 2 && identityFields >= 2)) {
    reasons.push("Some material facts are sourced, but required identity or primary-source evidence is incomplete");
    return { level: "PARTIALLY_VERIFIED", reasons };
  }
  reasons.push("No sufficient authoritative source has been attached");
  return { level: "UNVERIFIED", reasons };
}

export function canPublish(level: VerificationLevel): boolean {
  return level === "VERIFIED_PRIMARY" || level === "VERIFIED_MULTIPLE";
}
