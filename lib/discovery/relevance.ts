import type { RelevanceLabel, SourceTier } from "./types.ts";
import { FALSE_POSITIVE_TERMS, INDIGENOUS_TERMS, LEGAL_TERMS, STRONG_LEGAL_SIGNALS } from "./keywords.ts";

export interface RelevanceAssessment {
  label: RelevanceLabel;
  score: number;
  reasons: string[];
  matchedIndigenousTerms: string[];
  matchedLegalTerms: string[];
}

function matches(text: string, terms: readonly string[]): string[] {
  return terms.filter((term) => text.includes(term));
}

export function assessRelevance(input: { title?: string; text?: string; url?: string; tier?: SourceTier }): RelevanceAssessment {
  const haystack = `${input.title ?? ""}\n${input.text ?? ""}\n${input.url ?? ""}`.toLowerCase();
  const indigenous = matches(haystack, INDIGENOUS_TERMS);
  const legal = matches(haystack, LEGAL_TERMS);
  const strong = matches(haystack, STRONG_LEGAL_SIGNALS);
  const falsePositives = matches(haystack, FALSE_POSITIVE_TERMS);
  const reasons: string[] = [];
  let score = 0;

  if (indigenous.length) {
    score += Math.min(35, 16 + indigenous.length * 4);
    reasons.push(`Indigenous-law signals: ${indigenous.slice(0, 4).join(", ")}`);
  }
  if (legal.length) {
    score += Math.min(35, 12 + legal.length * 3);
    reasons.push(`Legal signals: ${legal.slice(0, 4).join(", ")}`);
  }
  if (strong.length) {
    score += Math.min(18, strong.length * 6);
    reasons.push(`Strong legal-document signals: ${strong.slice(0, 3).join(", ")}`);
  }
  if (input.tier === 1 && indigenous.length && legal.length) {
    score += 12;
    reasons.push("Located on a Tier 1 authoritative legal source");
  } else if (input.tier === 2) score += 5;
  if (falsePositives.length) {
    score -= 60;
    reasons.push(`Probable false-positive context: ${falsePositives.join(", ")}`);
  }
  if (!indigenous.length || !legal.length) score = Math.min(score, 44);
  score = Math.max(0, Math.min(100, score));

  return {
    label: score >= 65 ? "RELEVANT" : score >= 35 ? "POSSIBLY_RELEVANT" : "NOT_RELEVANT",
    score,
    reasons,
    matchedIndigenousTerms: indigenous,
    matchedLegalTerms: legal,
  };
}
