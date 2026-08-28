import "server-only";
import { getOpencApiKey } from "./opencApiKey";
import { aiUsageToday, cacheAi, getCachedAi } from "../../db";
import { LEGAL_CATEGORIES, type AiClassification, type LegalCategory, type RecordType, type RelevanceLabel } from "../discovery/types";
import { validateAiClassification } from "../discovery/aiValidation";

const relevanceValues: RelevanceLabel[] = ["RELEVANT", "POSSIBLY_RELEVANT", "NOT_RELEVANT"];
const recordTypes: RecordType[] = ["CASE", "LAW", "TREATY", "POLICY", "HISTORICAL_DEVELOPMENT"];
const categorySet = new Set<string>(LEGAL_CATEGORIES);

const classificationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["relevance", "confidence", "recordType", "categories", "proposedTitle", "summary", "significanceSignals", "nations", "citations", "verificationNeeded", "court", "decisionDate", "neutralCitation", "legislationCitation", "parties", "constitutionalSections", "legislationReferenced", "casesCited", "treatiesReferenced", "impactSignals"],
  properties: {
    relevance: { type: "string", enum: relevanceValues }, confidence: { type: "number", minimum: 0, maximum: 1 },
    recordType: { anyOf: [{ type: "string", enum: recordTypes }, { type: "null" }] },
    categories: { type: "array", items: { type: "string", enum: LEGAL_CATEGORIES } },
    proposedTitle: { type: ["string", "null"] }, summary: { type: ["string", "null"] },
    significanceSignals: { type: "array", items: { type: "string" } }, nations: { type: "array", items: { type: "string" } },
    citations: { type: "array", items: { type: "string" } }, verificationNeeded: { type: "array", items: { type: "string" } },
    court: { type: ["string", "null"] }, decisionDate: { type: ["string", "null"] }, neutralCitation: { type: ["string", "null"] }, legislationCitation: { type: ["string", "null"] },
    parties: { type: "array", items: { type: "string" } }, constitutionalSections: { type: "array", items: { type: "string" } },
    legislationReferenced: { type: "array", items: { type: "string" } }, casesCited: { type: "array", items: { type: "string" } },
    treatiesReferenced: { type: "array", items: { type: "string" } }, impactSignals: { type: "array", items: { type: "string" } },
  },
} as const;

function responseText(value: Record<string, unknown>): string | undefined {
  if (typeof value.output_text === "string") return value.output_text;
  const output = Array.isArray(value.output) ? value.output : [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = Array.isArray((item as Record<string, unknown>).content) ? (item as Record<string, unknown>).content as unknown[] : [];
    for (const part of content) if (part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string") return (part as Record<string, unknown>).text as string;
  }
  return undefined;
}

export async function classifyLegalDocument(input: { contentHash: string; url: string; title?: string; text: string }): Promise<AiClassification> {
  const model = process.env.OPENC_AI_MODEL?.trim() || "gpt-5-mini";
  const cached = await getCachedAi(input.contentHash, "legal-classification-v1", model);
  if (cached && validateAiClassification(cached)) return cached;

  const usage = await aiUsageToday();
  const dailyCalls = Number(process.env.OPENC_AI_DAILY_CALL_LIMIT || 50);
  const dailyTokens = Number(process.env.OPENC_AI_DAILY_TOKEN_LIMIT || 250_000);
  if (usage.calls >= dailyCalls || usage.inputTokens + usage.outputTokens >= dailyTokens) throw new Error("OpenCourt daily AI budget has been reached");

  const apiKey = getOpencApiKey();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, store: false, max_output_tokens: 1800,
      instructions: "You classify Canadian Indigenous legal source documents for an editorial discovery queue. Use only the supplied document. Never invent citations, dates, parties, holdings, treaties, or legal facts. Null or empty values are required when the document does not establish a field. Classification is not verification. Write a concise public-information summary, not legal advice.",
      input: `Source URL: ${input.url}\nTitle: ${input.title ?? "Unknown"}\n\nDocument text:\n${input.text.slice(0, 60_000)}`,
      text: { format: { type: "json_schema", name: "indigenous_legal_classification", strict: true, schema: classificationSchema } },
      metadata: { application: "opencourt", task: "legal-discovery" },
    }),
  });
  if (!response.ok) throw new Error(`OpenAI classification failed with HTTP ${response.status}`);
  const body = await response.json() as Record<string, unknown>;
  const text = responseText(body);
  if (!text) throw new Error("OpenAI classification returned no structured output");
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error("OpenAI classification returned invalid JSON"); }
  if (!validateAiClassification(parsed)) throw new Error("OpenAI classification failed schema validation");
  const usageBody = body.usage as Record<string, unknown> | undefined;
  await cacheAi(input.contentHash, "legal-classification-v1", model, parsed as unknown as Record<string, unknown>, Number(usageBody?.input_tokens ?? 0), Number(usageBody?.output_tokens ?? 0));
  return parsed;
}

export const toLegalCategories = (values: string[]): LegalCategory[] => values.filter((value): value is LegalCategory => categorySet.has(value));
