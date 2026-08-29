import type { EvidenceSource, VerificationLevel } from "./types.ts";

const rank: Record<VerificationLevel, number> = { UNVERIFIED: 0, PARTIALLY_VERIFIED: 1, VERIFIED_PRIMARY: 2, VERIFIED_MULTIPLE: 3 };
const hasValue = (value: unknown) => value !== null && value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);

export function mergeWithoutDowngrade<T extends Record<string, unknown>>(
  existing: T,
  incoming: Partial<T>,
  existingLevel: VerificationLevel,
  incomingLevel: VerificationLevel,
): T {
  const result = { ...existing };
  const mayReplace = rank[incomingLevel] >= rank[existingLevel];
  for (const [key, value] of Object.entries(incoming)) {
    if (!hasValue(value)) continue;
    if (key === "verificationSources" || key === "additionalSources") {
      const prior = Array.isArray(result[key]) ? result[key] as EvidenceSource[] : [];
      const next = Array.isArray(value) ? value as EvidenceSource[] : [];
      const byUrl = new Map([...prior, ...next].map((source) => [source.url, source]));
      (result as Record<string, unknown>)[key] = [...byUrl.values()];
    } else if (mayReplace || !hasValue(result[key])) {
      (result as Record<string, unknown>)[key] = value;
    }
  }
  return result;
}
