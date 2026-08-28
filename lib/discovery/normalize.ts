const TRACKING_PARAMS = new Set([
  "fbclid", "gclid", "mc_cid", "mc_eid", "ref", "source",
]);

export function normalizeUrl(input: string): string {
  const value = input.trim();
  const url = new URL(value);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only HTTP(S) discovery URLs are supported");
  }
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  url.pathname = url.pathname.replace(/\/{2,}/g, "/");
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
  return url.toString();
}

export function domainForUrl(input: string): string {
  return new URL(normalizeUrl(input)).hostname;
}

export function normalizeCaseTitle(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(the|et al|appellant|respondent|applicants?|respondents?)\b/g, " ")
    .replace(/\b(vs?\.?|versus)\b/g, " v ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export async function sha256(value: string | ArrayBuffer): Promise<string> {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
