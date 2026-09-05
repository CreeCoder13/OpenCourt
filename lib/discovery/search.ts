import { fetchWithRetry } from "./http.ts";

export interface SearchResult { url: string; title?: string; snippet?: string }

export function isSearchConfigured() { return Boolean(process.env.OPENCOURT_SEARCH_ENDPOINT?.trim() && process.env.OPENCOURT_SEARCH_API_KEY?.trim()); }
export async function searchWeb(query: string, count = 10, remainingMs = 15000): Promise<SearchResult[]> {
  const endpoint = process.env.OPENCOURT_SEARCH_ENDPOINT?.trim();
  const apiKey = process.env.OPENCOURT_SEARCH_API_KEY?.trim();
  if (!endpoint || !apiKey) throw new Error("No permitted search provider configured");
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.min(20, Math.max(1, count))));
  if (url.protocol !== "https:") throw new Error("Search endpoint must use HTTPS");
  const response = await fetchWithRetry(url, { redirect: "error", signal: AbortSignal.timeout(Math.max(1, Math.min(15000, remainingMs))), headers: { "Ocp-Apim-Subscription-Key": apiKey, Authorization: `Bearer ${apiKey}`, Accept: "application/json" } }, { attempts: 1 });
  if (!response.ok) throw new Error(`Search provider failed with HTTP ${response.status}`);
  const body = await response.json() as Record<string, unknown>;
  const webPages = body.webPages as Record<string, unknown> | undefined;
  const raw = (Array.isArray(webPages?.value) ? webPages.value : Array.isArray(body.results) ? body.results : []) as Array<Record<string, unknown>>;
  return raw.map((item) => ({ url: String(item.url ?? item.link ?? ""), title: typeof item.name === "string" ? item.name : typeof item.title === "string" ? item.title : undefined, snippet: typeof item.snippet === "string" ? item.snippet : undefined })).filter((item) => item.url.startsWith("http"));
}
