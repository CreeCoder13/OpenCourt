import "server-only";
import { getDocumentBucket, getCachedDocument, getRobotsState, reserveDomainCrawlSlot, saveRobotsState, saveSourceDocument } from "../../db";
import { extractFeedUrls, extractHtml } from "./extract";
import { normalizeUrl, sha256 } from "./normalize";
import { isAllowedByRobots } from "./robots";
import { findTrustedDomain } from "./trustedDomains";
import { DomainRateLimiter } from "./rateLimiter";

const USER_AGENT = "OpenCourtBot/1.0 (+https://opencourt.ca/about; legal-research discovery)";
const limiter = new DomainRateLimiter();

export interface FetchedDocument {
  normalizedUrl: string;
  title?: string;
  text: string;
  contentHash: string;
  mimeType: string;
  citations: string[];
  extractionMethod: string;
  notModified: boolean;
  links: string[];
}

async function extractPdf(bytes: ArrayBuffer, sourceUrl: string): Promise<{ text: string; method: string }> {
  const endpoint = process.env.PDF_TEXT_EXTRACTOR_URL?.trim();
  if (!endpoint) return { text: "", method: "R2_CACHED_AWAITING_PDF_EXTRACTOR" };
  const headers: Record<string, string> = { "Content-Type": "application/pdf", "X-Source-URL": sourceUrl };
  const token = process.env.PDF_TEXT_EXTRACTOR_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(endpoint, { method: "POST", headers, body: bytes });
  if (!response.ok) throw new Error(`PDF extraction service failed with HTTP ${response.status}`);
  const result = await response.json() as { text?: unknown; ocrUsed?: unknown };
  if (typeof result.text !== "string") throw new Error("PDF extraction service returned invalid output");
  return { text: result.text, method: result.ocrUsed ? "EXTERNAL_PDF_OCR" : "EXTERNAL_PDF_TEXT" };
}

export async function fetchDocument(url: string): Promise<FetchedDocument> {
  const normalizedUrl = normalizeUrl(url);
  const parsed = new URL(normalizedUrl);
  const domain = findTrustedDomain(parsed.hostname);
  const delay = domain?.rateLimit ?? { requests: 1, perSeconds: 8 };
  const persistentDelay = await reserveDomainCrawlSlot(parsed.hostname, Math.ceil((delay.perSeconds * 1000) / Math.max(1, delay.requests)));
  if (persistentDelay > 60_000) throw new Error("Domain rate limit is reserved by another discovery worker");
  if (persistentDelay) await new Promise((resolve) => setTimeout(resolve, persistentDelay));
  await limiter.wait(parsed.hostname, delay.requests, delay.perSeconds);

  const cachedRobots = await getRobotsState(parsed.hostname);
  let robotsBody = cachedRobots?.checkedAt && Date.now() - Date.parse(cachedRobots.checkedAt) < 86_400_000 ? (cachedRobots.body ?? "") : undefined;
  if (robotsBody === undefined) {
    const robotsUrl = `${parsed.protocol}//${parsed.host}/robots.txt`;
    const robotsResponse = await fetch(robotsUrl, { headers: { "User-Agent": USER_AGENT }, redirect: "follow" });
    if (robotsResponse.status === 401 || robotsResponse.status === 403) {
      await saveRobotsState(parsed.hostname, "RESTRICTED");
      throw new Error("Cannot confirm crawl permission because robots.txt is access-restricted");
    }
    robotsBody = robotsResponse.ok ? await robotsResponse.text() : "";
    await saveRobotsState(parsed.hostname, robotsResponse.status === 404 ? "ALLOWED" : robotsResponse.ok ? "CHECKED" : "UNKNOWN", robotsBody);
  }
  if (robotsBody) {
    const robots = isAllowedByRobots(robotsBody, normalizedUrl, "OpenCourtBot");
    if (!robots.allowed) throw new Error(`Crawling disallowed by robots.txt: ${robots.reason}`);
    if (robots.crawlDelaySeconds) await limiter.wait(parsed.hostname, 1, robots.crawlDelaySeconds);
  }

  const cached = await getCachedDocument(normalizedUrl);
  const headers: Record<string, string> = { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml,application/pdf,application/xml,text/xml;q=0.9,*/*;q=0.2" };
  if (cached?.etag) headers["If-None-Match"] = cached.etag;
  if (cached?.lastModified) headers["If-Modified-Since"] = cached.lastModified;
  const response = await fetch(normalizedUrl, { headers, redirect: "follow" });
  if (response.status === 304 && cached) return { normalizedUrl, text: "", contentHash: cached.contentHash, mimeType: "", citations: [], extractionMethod: "NOT_MODIFIED", notModified: true, links: [] };
  if (!response.ok) throw new Error(`Source fetch failed with HTTP ${response.status}`);
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > 25_000_000) throw new Error("Document exceeds the 25 MB crawler limit");
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength > 25_000_000) throw new Error("Document exceeds the 25 MB crawler limit");
  const contentHash = await sha256(bytes);
  const mimeType = (response.headers.get("content-type") ?? "application/octet-stream").split(";")[0].toLowerCase();
  const r2Key = `source-cache/${contentHash}`;
  await getDocumentBucket().put(r2Key, bytes, { httpMetadata: { contentType: mimeType }, customMetadata: { sourceUrl: normalizedUrl, fetchedAt: new Date().toISOString() } });

  let title: string | undefined;
  let text = "";
  let citations: string[] = [];
  let extractionMethod = "UNSUPPORTED";
  let links: string[] = [];
  if (mimeType.includes("pdf") || parsed.pathname.toLowerCase().endsWith(".pdf")) {
    const pdf = await extractPdf(bytes, normalizedUrl);
    text = pdf.text; extractionMethod = pdf.method;
  } else if (mimeType.includes("html") || mimeType.includes("xml") || mimeType.startsWith("text/")) {
    const decoded = new TextDecoder().decode(bytes);
    const extracted = mimeType.includes("html") ? extractHtml(decoded) : { title: undefined, text: decoded.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "), links: extractFeedUrls(decoded, normalizedUrl), citations: [] };
    title = extracted.title; text = extracted.text; citations = extracted.citations; extractionMethod = mimeType.includes("html") ? "HTML_TEXT" : "XML_TEXT";
    const rawLinks = "links" in extracted ? extracted.links : [];
    links = [...new Set(rawLinks.map((link) => { try { return new URL(link, normalizedUrl).toString(); } catch { return undefined; } }).filter((link): link is string => Boolean(link)))];
  }
  await saveSourceDocument({ contentHash, normalizedUrl, r2Key, mimeType, etag: response.headers.get("etag") ?? undefined, lastModified: response.headers.get("last-modified") ?? undefined, text, extractionMethod });
  return { normalizedUrl, title, text, contentHash, mimeType, citations, extractionMethod, notModified: false, links };
}
