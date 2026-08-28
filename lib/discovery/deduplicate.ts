import { normalizeNeutralCitation } from "./citations.ts";
import { normalizeCaseTitle } from "./normalize.ts";

export interface DuplicateCandidate {
  id: string;
  caseName?: string;
  title?: string;
  neutralCitation?: string;
  decisionDate?: string;
  court?: string;
}

function bigrams(value: string): Set<string> {
  const normalized = ` ${value} `;
  return new Set([...Array(Math.max(0, normalized.length - 1))].map((_, index) => normalized.slice(index, index + 2)));
}

export function titleSimilarity(left: string, right: string): number {
  const a = bigrams(normalizeCaseTitle(left));
  const b = bigrams(normalizeCaseTitle(right));
  if (!a.size && !b.size) return 1;
  let overlap = 0;
  for (const gram of a) if (b.has(gram)) overlap += 1;
  return (2 * overlap) / (a.size + b.size);
}

export function findDuplicate(candidate: DuplicateCandidate, existing: DuplicateCandidate[]): { duplicateOf?: string; reasons: string[]; confidence: number } {
  const citation = normalizeNeutralCitation(candidate.neutralCitation);
  let best: { duplicateOf?: string; reasons: string[]; confidence: number } = { reasons: [], confidence: 0 };
  for (const item of existing) {
    const reasons: string[] = [];
    let confidence = 0;
    if (citation && citation === normalizeNeutralCitation(item.neutralCitation)) {
      confidence = 1;
      reasons.push("Exact neutral citation match");
    }
    const candidateTitle = candidate.caseName ?? candidate.title ?? "";
    const itemTitle = item.caseName ?? item.title ?? "";
    const similarity = candidateTitle && itemTitle ? titleSimilarity(candidateTitle, itemTitle) : 0;
    if (similarity >= 0.86) { confidence += 0.55; reasons.push(`Fuzzy title match (${Math.round(similarity * 100)}%)`); }
    if (candidate.decisionDate && candidate.decisionDate === item.decisionDate) { confidence += 0.2; reasons.push("Decision date match"); }
    if (candidate.court && item.court && candidate.court.toLowerCase() === item.court.toLowerCase()) { confidence += 0.15; reasons.push("Court match"); }
    confidence = Math.min(1, confidence);
    if (confidence > best.confidence && (citation ? confidence >= 1 : confidence >= 0.75)) best = { duplicateOf: item.id, reasons, confidence };
  }
  return best;
}
