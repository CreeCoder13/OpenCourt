import { findTrustedDomain } from "./trustedDomains.ts";
import { sourceForUrl } from "./nationwideSources.ts";
import { isAllowedByRobots } from "./robots.ts";
import { normalizeUrl, sha256 } from "./normalize.ts";
import { extractHtml, extractFeedUrls } from "./extract.ts";

export interface CrawlDocument {
  normalizedUrl: string; title?: string; text: string; html: string; contentHash: string; mimeType: string;
  links: string[]; citations: string[]; extractionMethod: string; notModified: boolean;
}
export interface CrawlLimits { maxRequests?: number; timeoutMs?: number; maxDurationMs?: number; maxBytes?: number }
export const USER_AGENT = "OpenCourtBot/1.0 (+https://opencourt.ca/about; legal-research discovery)";
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
export function assertSourceAllowed(url: string) {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password || parsed.port) throw new Error("Unsupported source URL");
  const policy = findTrustedDomain(parsed.hostname);
  if (!policy?.allowed || policy.crawlMethod === "MANUAL" || sourceForUrl(url)?.access === "manual") throw new Error("Source requires manual or authorized access");
  if (/(^|\.)canlii\.org$/i.test(parsed.hostname) || policy.crawlMethod === "API") throw new Error("CanLII/ API-only source: authorized interface required; HTML crawling disabled");
  if (["DISALLOWED", "RESTRICTED"].includes(policy.robotsStatus)) throw new Error("Source policy prohibits crawling");
  return policy;
}
export function restrictionReason(html: string, headers?: Headers): string | undefined {
  if (/noindex|noarchive|nosnippet|none/i.test(headers?.get("x-robots-tag") ?? "")) return "X-Robots-Tag restriction";
  if (/<meta\b[^>]*(?:name\s*=\s*["'](?:robots|opencourtbot)["'])[^>]*content\s*=\s*["'][^"']*(?:noindex|noarchive|nosnippet|none)/i.test(html)
    || /<meta\b[^>]*content\s*=\s*["'][^"']*(?:noindex|noarchive|nosnippet|none)[^>]*name\s*=\s*["'](?:robots|opencourtbot)["']/i.test(html)) return "Page robots restriction";
  if (/publication ban|ban on publication|non-publication|interdiction de publication|ordonnance de non-publication|sealed record|dossier sous scellés|confidential proceeding/i.test(html)) return "Potential publication/privacy restriction; manual review required";
  if (/captcha|cf-chl-|verify you are human|accept (?:the )?terms|agree to (?:the )?terms|accepter les conditions/i.test(html)) return "Access or terms gate; manual review required";
  return undefined;
}

// The same bounded, read-only transport is used by server discovery and the existing CLI.
// Cache is deliberately per-run; dry runs never write D1, R2, AI caches, or crawl reservations.
export class CrawlerSession {
  requests = 0;
  cacheHits = 0;
  readonly started = Date.now();
  readonly limits: Required<CrawlLimits>;
  private robots = new Map<string, string>();
  private cache = new Map<string, CrawlDocument>();
  private next = new Map<string, number>();
  private blocked = new Map<string, string>();
  private fetcher: typeof fetch;
  constructor(limits: CrawlLimits = {}, fetcher: typeof fetch = fetch) {
    this.limits = { maxRequests: 100, timeoutMs: 8000, maxDurationMs: 180000, maxBytes: 2_000_000, ...limits };
    this.fetcher = fetcher;
  }
  checkBudget() {
    if (this.requests >= this.limits.maxRequests || Date.now() - this.started >= this.limits.maxDurationMs) throw new Error("Crawl budget exhausted");
  }
  private async request(url: string, spacing: number): Promise<Response> {
    const host = new URL(url).hostname;
    for (let attempt = 0; attempt < 2; attempt++) {
      this.checkBudget();
      const wait = Math.max(0, (this.next.get(host) ?? 0) - Date.now());
      if (wait > this.limits.maxDurationMs - (Date.now() - this.started)) throw new Error("Rate limit exceeds remaining crawl budget");
      await sleep(wait);
      this.checkBudget();
      this.requests++;
      this.next.set(host, Date.now() + spacing);
      // Redirects must be re-authorized, with destination robots checked before fetching.
      const response = await this.fetcher(url, { redirect: "manual", headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xml,text/xml;q=0.9" }, signal: AbortSignal.timeout(Math.max(1, Math.min(this.limits.timeoutMs, this.limits.maxDurationMs - (Date.now() - this.started)))) });
      if (response.status === 429 || response.status === 503) {
        const value = response.headers.get("retry-after");
        const delay = value ? (/^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - Date.now()) : spacing * 2;
        this.next.set(host, Date.now() + Math.max(spacing, Number.isFinite(delay) ? delay : spacing * 2));
      }
      if (attempt === 1 || ![408, 429, 500, 502, 503, 504].includes(response.status)) return response;
      await response.body?.cancel();
    }
    throw new Error("Retry budget exhausted");
  }
  private async body(response: Response): Promise<string> {
    if (Number(response.headers.get("content-length") ?? 0) > this.limits.maxBytes) { await response.body?.cancel(); throw new Error("Document exceeds byte limit"); }
    const reader = response.body?.getReader();
    if (!reader) return "";
    const decoder = new TextDecoder();
    let size = 0, text = "";
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > this.limits.maxBytes) throw new Error("Document exceeds byte limit");
        text += decoder.decode(value, { stream: true });
      }
      return text + decoder.decode();
    } finally { await reader.cancel(); }
  }
  async get(input: string, redirects = 0): Promise<CrawlDocument> {
    // Preserve the actual host and path for HTTP; canonicalization is only an identity key.
    const url = new URL(input); url.hash = "";
    const policy = assertSourceAllowed(url.toString());
    if (this.blocked.has(url.origin)) throw new Error(this.blocked.get(url.origin));
    const key = normalizeUrl(url.toString());
    const cached = this.cache.get(key);
    if (cached) { this.cacheHits++; return cached; }
    let spacing = policy.rateLimit.perSeconds * 1000 / Math.max(1, policy.rateLimit.requests);
    if (!this.robots.has(url.origin)) {
      const response = await this.request(`${url.origin}/robots.txt`, spacing);
      if (!response.ok && response.status !== 404) {
        await response.body?.cancel();
        const reason = `Cannot confirm robots permission: HTTP ${response.status}`;
        this.blocked.set(url.origin, reason); throw new Error(reason);
      }
      this.robots.set(url.origin, response.status === 404 ? "" : await this.body(response));
    }
    const robots = isAllowedByRobots(this.robots.get(url.origin)!, url.toString(), "OpenCourtBot");
    if (!robots.allowed) throw new Error(`robots.txt disallows access: ${robots.reason}`);
    spacing = Math.max(spacing, (robots.crawlDelaySeconds ?? 0) * 1000);
    this.next.set(url.hostname, Math.max(this.next.get(url.hostname) ?? 0, Date.now() + (robots.crawlDelaySeconds ?? 0) * 1000));
    const response = await this.request(url.toString(), spacing);
    if (response.status >= 300 && response.status < 400) {
      await response.body?.cancel();
      if (redirects >= 3 || !response.headers.get("location")) throw new Error("Redirect limit or missing location");
      const target = new URL(response.headers.get("location")!, url);
      assertSourceAllowed(target.toString());
      return this.get(target.toString(), redirects + 1);
    }
    if (!response.ok) { await response.body?.cancel(); throw new Error(`Source HTTP ${response.status}`); }
    const mimeType = (response.headers.get("content-type") ?? "").split(";")[0];
    if (!/html|xml|text\/plain/.test(mimeType)) { await response.body?.cancel(); throw new Error(`Unsupported extraction (${mimeType || "unknown MIME"}); PDF/OCR manual review required`); }
    const html = await this.body(response);
    const restriction = restrictionReason(html, response.headers);
    if (restriction) throw new Error(restriction); // Do not retain restricted text or excerpts.
    const extracted = extractHtml(html);
    const links = mimeType.includes("xml") ? extractFeedUrls(html, url.toString()) : extracted.links;
    const document: CrawlDocument = { ...extracted, html, normalizedUrl: url.toString(), contentHash: await sha256(html), mimeType,
      links: [...new Set(links.flatMap((link) => { try { return [new URL(link, url).toString()]; } catch { return []; } }))], extractionMethod: "HTML_TEXT", notModified: false };
    this.cache.set(key, document);
    return document;
  }
}
