import rawDomains from "../../data/trusted-domains.json" with { type: "json" };
import type { TrustedDomain } from "./types.ts";

export const trustedDomains = rawDomains as TrustedDomain[];

export function findTrustedDomain(hostname: string): TrustedDomain | undefined {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return trustedDomains
    .filter((item) => host === item.domain || host.endsWith(`.${item.domain}`))
    .sort((left, right) => right.domain.length - left.domain.length)[0];
}

export function tierForUrl(url: string): 1 | 2 | 3 {
  return findTrustedDomain(new URL(url).hostname)?.tier ?? 3;
}
