import { parseLegalCitations } from "./citations.ts";

const decodeEntities = (value: string) => value
  .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

export function extractHtml(html: string): { title?: string; text: string; links: string[]; citations: string[] } {
  const title = decodeEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]+>/g, " ").trim() ?? "") || undefined;
  const links = [...html.matchAll(/<a\s[^>]*href\s*=\s*["']([^"']+)["']/gi)].map((match) => decodeEntities(match[1]));
  const text = decodeEntities(html
    .replace(/<(script|style|noscript|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
  return { title, text, links, citations: parseLegalCitations(text).map((item) => item.citation) };
}

export function extractFeedUrls(xml: string, baseUrl: string): string[] {
  const values = [
    ...[...xml.matchAll(/<loc[^>]*>([^<]+)<\/loc>/gi)].map((match) => match[1].trim()),
    ...[...xml.matchAll(/<link[^>]+href=["']([^"']+)["']/gi)].map((match) => match[1].trim()),
    ...[...xml.matchAll(/<link[^>]*>([^<]+)<\/link>/gi)].map((match) => match[1].trim()),
  ];
  return [...new Set(values.map((value) => {
    try { return new URL(decodeEntities(value), baseUrl).toString(); } catch { return undefined; }
  }).filter((value): value is string => Boolean(value)))];
}
