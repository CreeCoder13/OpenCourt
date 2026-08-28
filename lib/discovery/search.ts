import "server-only";

export interface SearchResult { url: string; title?: string; snippet?: string }

export async function searchWeb(query: string, count = 10): Promise<SearchResult[]> {
  const endpoint = process.env.OPENCOURT_SEARCH_ENDPOINT?.trim();
  const apiKey = process.env.OPENCOURT_SEARCH_API_KEY?.trim();
  if (!endpoint || !apiKey) return [];
  const url = new URL(endpoint);
  url.searchParams.set("q", query);
  url.searchParams.set("count", String(Math.min(20, Math.max(1, count))));
  const response = await fetch(url, { headers: { "Ocp-Apim-Subscription-Key": apiKey, Authorization: `Bearer ${apiKey}`, Accept: "application/json" } });
  if (!response.ok) throw new Error(`Search provider failed with HTTP ${response.status}`);
  const body = await response.json() as Record<string, unknown>;
  const webPages = body.webPages as Record<string, unknown> | undefined;
  const raw = (Array.isArray(webPages?.value) ? webPages.value : Array.isArray(body.results) ? body.results : []) as Array<Record<string, unknown>>;
  return raw.map((item) => ({ url: String(item.url ?? item.link ?? ""), title: typeof item.name === "string" ? item.name : typeof item.title === "string" ? item.title : undefined, snippet: typeof item.snippet === "string" ? item.snippet : undefined })).filter((item) => item.url.startsWith("http"));
}
