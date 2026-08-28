import { LEGAL_CATEGORIES, type AiClassification, type RecordType, type RelevanceLabel } from "./types.ts";

const relevanceValues: RelevanceLabel[] = ["RELEVANT", "POSSIBLY_RELEVANT", "NOT_RELEVANT"];
const recordTypes: RecordType[] = ["CASE", "LAW", "TREATY", "POLICY", "HISTORICAL_DEVELOPMENT"];
const categorySet = new Set<string>(LEGAL_CATEGORIES);
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");
const nullableString = (value: unknown): value is string | null => value === null || typeof value === "string";

export function validateAiClassification(value: unknown): value is AiClassification {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return relevanceValues.includes(item.relevance as RelevanceLabel)
    && typeof item.confidence === "number" && item.confidence >= 0 && item.confidence <= 1
    && (item.recordType === null || recordTypes.includes(item.recordType as RecordType))
    && Array.isArray(item.categories) && item.categories.every((category) => categorySet.has(String(category)))
    && nullableString(item.proposedTitle) && nullableString(item.summary)
    && stringArray(item.significanceSignals) && stringArray(item.nations) && stringArray(item.citations) && stringArray(item.verificationNeeded)
    && nullableString(item.court) && nullableString(item.decisionDate) && nullableString(item.neutralCitation) && nullableString(item.legislationCitation)
    && stringArray(item.parties) && stringArray(item.constitutionalSections) && stringArray(item.legislationReferenced)
    && stringArray(item.casesCited) && stringArray(item.treatiesReferenced) && stringArray(item.impactSignals);
}
