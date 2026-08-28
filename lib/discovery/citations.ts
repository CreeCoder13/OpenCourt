export interface ParsedCitation {
  citation: string;
  year: number;
  court?: string;
  decisionNumber?: number;
  kind: "NEUTRAL" | "REPORTED" | "STATUTE";
}

const neutralPattern = /\b((?:18|19|20)\d{2})\s+(SCC|CSC|FCA|CAF|FC|CF|TCC|CCI|[A-Z]{2,5}CA|[A-Z]{2,5}(?:SC|KB|QB|CJ|PC|TC))\s+(\d{1,5})\b/g;
const reportedPattern = /\[((?:18|19|20)\d{2})\]\s+(\d+)\s+(S\.?C\.?R\.?)\s+(\d+)\b/gi;
const statutePattern = /\b((?:R\.?S\.?C\.?|S\.?C\.?)\s*,?\s*(?:18|19|20)\d{2}\s*,?\s*c\.?\s*[A-Z0-9.-]+)\b/gi;

export function parseLegalCitations(text: string): ParsedCitation[] {
  const results: ParsedCitation[] = [];
  for (const match of text.matchAll(neutralPattern)) {
    results.push({ citation: match[0], year: Number(match[1]), court: match[2], decisionNumber: Number(match[3]), kind: "NEUTRAL" });
  }
  for (const match of text.matchAll(reportedPattern)) {
    results.push({ citation: match[0], year: Number(match[1]), court: "SCC", kind: "REPORTED" });
  }
  for (const match of text.matchAll(statutePattern)) {
    const year = Number(match[0].match(/(?:18|19|20)\d{2}/)?.[0]);
    results.push({ citation: match[0], year, kind: "STATUTE" });
  }
  return [...new Map(results.map((item) => [item.citation.toUpperCase().replace(/\s+/g, " "), item])).values()];
}

export function normalizeNeutralCitation(value?: string): string | undefined {
  if (!value) return undefined;
  const match = parseLegalCitations(value).find((item) => item.kind === "NEUTRAL");
  return match?.citation.toUpperCase().replace(/\s+/g, " ");
}
