import { parseJurisdiction } from "./jurisdictions.ts";
import type { NationwideOptions } from "./nationwide.ts";
export function validateDiscoveryOptions(input: unknown): NationwideOptions {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Options must be an object");
  const value = input as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, min, max] of [
    ["year", 1600, new Date().getUTCFullYear() + 1], ["maxPages", 1, 100], ["maxRequests", 1, 300],
    ["maxDepth", 0, 3], ["timeoutMs", 1000, 15000], ["maxDurationMs", 1000, 300000],
    ["maxBytes", 1000, 5000000], ["queryLimit", 0, 25], ["queryOffset", 0, 10000000],
  ] as const) if (value[key] !== undefined) {
    if (typeof value[key] !== "number" || !Number.isInteger(value[key]) || value[key] < min || value[key] > max) throw new Error(`${key} must be an integer from ${min} to ${max}`);
    output[key] = value[key];
  }
  for (const key of ["topic", "nation"] as const) if (value[key] !== undefined) {
    if (typeof value[key] !== "string" || value[key].length > 100 || !value[key].trim()) throw new Error(`${key} must be 1–100 characters`);
    output[key] = value[key].trim();
  }
  for (const key of ["ongoing", "dryRun"] as const) if (value[key] !== undefined) {
    if (typeof value[key] !== "boolean") throw new Error(`${key} must be boolean`);
    output[key] = value[key];
  }
  if (value.jurisdiction !== undefined && typeof value.jurisdiction !== "string") throw new Error("jurisdiction must be a code or name");
  output.jurisdiction = parseJurisdiction(value.jurisdiction as string | undefined);
  return output as NationwideOptions;
}
