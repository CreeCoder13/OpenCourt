import rawDomains from "../../data/trusted-domains.json" with { type: "json" };
import type { TrustedDomain } from "./types.ts";
import { nationwideSources } from "./nationwideSources.ts";

export const trustedDomains: TrustedDomain[] = [...rawDomains as TrustedDomain[], ...nationwideSources.map((s): TrustedDomain => ({
  domain: new URL(s.url).hostname.replace(/^www\./, ""), tier: s.kind === "context" ? 3 : 1, sourceName: s.name,
  allowed: s.access === "public", crawlMethod: s.access === "manual" ? "MANUAL" : "TARGETED",
  sourceType: s.kind === "context" ? "CONTEXT" : "OFFICIAL_JUDGMENT", rateLimit: { requests: 1, perSeconds: 5 },
  robotsStatus: "UNKNOWN", lastChecked: null, notes: "Roster entry; robots and response restrictions checked on every uncached fetch.",
}))];

export function findTrustedDomain(hostname: string): TrustedDomain | undefined {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return trustedDomains
    .filter((item) => host === item.domain || host.endsWith(`.${item.domain}`))
    .sort((left, right) => right.domain.length - left.domain.length)[0];
}

export function tierForUrl(url: string): 1 | 2 | 3 {
  return findTrustedDomain(new URL(url).hostname)?.tier ?? 3;
}
