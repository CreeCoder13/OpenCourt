import { normalizeNeutralCitation } from "./citations.ts";
import { normalizeCaseTitle } from "./normalize.ts";

export interface DuplicateCandidate {
  id: string;
  caseName?: string;
  title?: string;
  neutralCitation?: string;
  courtFileNumber?: string;
  decisionDate?: string;
  year?: number;
  court?: string;
  officialDecisionUrl?: string;
}

function comparableUrl(value?: string): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    url.hash = "";
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString();
  } catch { return undefined; }
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
  const fileNumber = candidate.courtFileNumber?.trim().toLowerCase();
  const officialUrl = comparableUrl(candidate.officialDecisionUrl);
  const candidateYear = candidate.year ?? (candidate.decisionDate ? Number(candidate.decisionDate.slice(0, 4)) : undefined);
  let best: { duplicateOf?: string; reasons: string[]; confidence: number } = { reasons: [], confidence: 0 };
  for (const item of existing) {
    const reasons: string[] = [];
    let confidence = 0;
    if (citation && citation === normalizeNeutralCitation(item.neutralCitation)) {
      return { duplicateOf: item.id, reasons: ["Exact neutral citation match"], confidence: 1 };
    }
    if (fileNumber && fileNumber === item.courtFileNumber?.trim().toLowerCase()) {
      return { duplicateOf: item.id, reasons: ["Exact court file number match"], confidence: 0.99 };
    }
    const candidateTitle = candidate.caseName ?? candidate.title ?? "";
    const itemTitle = item.caseName ?? item.title ?? "";
    const similarity = candidateTitle && itemTitle ? titleSimilarity(candidateTitle, itemTitle) : 0;
    const itemYear = item.year ?? (item.decisionDate ? Number(item.decisionDate.slice(0, 4)) : undefined);
    if (similarity >= 0.86) { confidence += 0.55; reasons.push(`Fuzzy title match (${Math.round(similarity * 100)}%)`); }
    if (candidateYear && candidateYear === itemYear) { confidence += 0.25; reasons.push("Decision year match"); }
    if (candidate.decisionDate && candidate.decisionDate === item.decisionDate) { confidence += 0.2; reasons.push("Decision date match"); }
    if (candidate.court && item.court && candidate.court.toLowerCase() === item.court.toLowerCase()) { confidence += 0.15; reasons.push("Court match"); }
    confidence = Math.min(1, confidence);
    if (officialUrl && officialUrl === comparableUrl(item.officialDecisionUrl)) {
      return { duplicateOf: item.id, reasons: ["Exact official decision URL match"], confidence: 0.97 };
    }
    if (confidence > best.confidence && confidence >= 0.8) best = { duplicateOf: item.id, reasons, confidence };
  }
  return best;
}
