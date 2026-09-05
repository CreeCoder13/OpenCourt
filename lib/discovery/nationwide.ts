import { CrawlerSession, type CrawlDocument, type CrawlLimits } from "./crawler.ts";
import { courtCoverage, JURISDICTIONS, type Jurisdiction } from "./jurisdictions.ts";
import { nationwideSources, sourceForUrl, type DiscoverySource } from "./nationwideSources.ts";
import { buildSearchQueries, type SearchFilters } from "./keywords.ts";
import { normalizeUrl } from "./normalize.ts";
import { findDuplicate, relatedProceedings, type DuplicateCandidate } from "./deduplicate.ts";
import { parseCandidate, type PendingCandidate } from "./parseCandidate.ts";
import type { AiClassification } from "./types.ts";

export interface NationwideOptions extends SearchFilters, CrawlLimits {
  maxPages?: number; maxDepth?: number; queryLimit?: number; queryOffset?: number; dryRun?: boolean;
}
export interface DiscoveryAdapters {
  crawler?: CrawlerSession;
  fetchDocument?: (url: string) => Promise<CrawlDocument>;
  search?: (query: string, remainingMs: number) => Promise<Array<{ url: string; title?: string }>>;
  classify?: (document: CrawlDocument) => Promise<AiClassification>;
  existing?: DuplicateCandidate[];
  duplicateScope?: string;
  sources?: DiscoverySource[];
}
export async function discoverNationwide(options: NationwideOptions = {}, adapters: DiscoveryAdapters = {}) {
  const crawler = adapters.crawler ?? new CrawlerSession(options);
  const maxPages = options.maxPages ?? 42, maxDepth = options.maxDepth ?? 2;
  const jurisdictions = (Object.keys(JURISDICTIONS) as Jurisdiction[]).filter((j) => !options.jurisdiction || j === options.jurisdiction);
  const sources = (adapters.sources ?? nationwideSources).filter((s) => jurisdictions.includes(s.jurisdiction));
  const coverage = Object.fromEntries(jurisdictions.map((j) => [j, { name: JURISDICTIONS[j], courtsConfigured: courtCoverage.filter((c) => c.jurisdiction === j).map((c) => ({ name: c.name, level: c.level })), sourcesConfigured: new Set(sources.filter((s) => s.jurisdiction === j).map((s) => s.url)).size, pagesAttempted: 0, pagesRead: 0, candidates: 0, duplicates: 0, verified: 0, requiringReview: 0, inaccessible: 0 }])) as Record<Jurisdiction, { name: string; courtsConfigured: Array<{ name: string; level: string }>; sourcesConfigured: number; pagesAttempted: number; pagesRead: number; candidates: number; duplicates: number; verified: number; requiringReview: number; inaccessible: number }>;
  type Entry = { url: string; source: DiscoverySource; depth: number; discoveredFrom?: string };
  const queues = new Map(jurisdictions.map((j) => [j, [] as Entry[]]));
  const seen = new Set<string>();
  const inaccessible: Array<{ jurisdiction: Jurisdiction; url: string; reason: string }> = [];
  const visited: Array<{ jurisdiction: Jurisdiction; url: string; status: string }> = [];
  const candidates: PendingCandidate[] = [], filtered: Array<{ url: string; reason: string }> = [];
  const known = [...adapters.existing ?? []];
  const add = (entry: Entry, priority = false) => {
    try {
      const key = normalizeUrl(entry.url);
      if (seen.has(key) || seen.size >= 2000 || !queues.has(entry.source.jurisdiction)) return;
      seen.add(key);
      if (priority) queues.get(entry.source.jurisdiction)!.unshift(entry); else queues.get(entry.source.jurisdiction)!.push(entry);
    } catch { /* malformed links are not requests */ }
  };
  for (const source of sources) {
    if (source.access === "manual") {
      inaccessible.push({ jurisdiction: source.jurisdiction, url: source.url, reason: "Manual/authorized interface required; not requested" });
      coverage[source.jurisdiction].inaccessible++;
    } else add({ url: source.url, source, depth: 0 });
  }
  let queriesRun = 0, pagesAttempted = 0, aiDeferred = 0;
  const queries = buildSearchQueries(options.queryOffset ?? 0, options.queryLimit ?? 14, options);
  const searchFailures: string[] = [];
  if (adapters.search) for (const query of queries) {
    const remaining = crawler.limits.maxDurationMs - (Date.now() - crawler.started);
    if (remaining <= 0 || crawler.requests + queriesRun >= crawler.limits.maxRequests) break;
    queriesRun++;
    try {
      for (const result of await adapters.search(query, remaining)) {
        const source = sourceForUrl(result.url);
        if (source) add({ url: result.url, source, depth: 0 }, true);
      }
    } catch (error) { searchFailures.push(error instanceof Error ? error.message : "Search failure"); }
  }
  // Count search-provider calls against the same overall request cap.
  crawler.requests += queriesRun;
  let exhausted = false;
  while (pagesAttempted < maxPages && [...queues.values()].some((q) => q.length)) {
    for (const jurisdiction of jurisdictions) {
      if (pagesAttempted >= maxPages) break;
      try { crawler.checkBudget(); } catch { exhausted = true; break; }
      const entry = queues.get(jurisdiction)!.shift();
      if (!entry) continue;
      pagesAttempted++; coverage[jurisdiction].pagesAttempted++;
      try {
        const doc = await (adapters.fetchDocument ? adapters.fetchDocument(entry.url) : crawler.get(entry.url));
        coverage[jurisdiction].pagesRead++;
        visited.push({ jurisdiction, url: entry.url, status: "READ" });
        // Redirect destinations own their evidence class; a context-page link does not become primary evidence.
        const source = sourceForUrl(doc.normalizedUrl) ?? entry.source;
        let candidate = parseCandidate(doc, source);
        if (candidate && adapters.classify && !options.dryRun) {
          try { candidate = parseCandidate(doc, source, new Date().toISOString(), await adapters.classify(doc)) ?? candidate; }
          catch { aiDeferred++; }
        }
        if (candidate) {
          const record = candidate.extracted;
          const reason = options.jurisdiction && record.jurisdiction !== options.jurisdiction ? "Different jurisdiction"
            : options.year && record.year !== options.year ? "Year unmatched or unconfirmed"
              : options.topic && !doc.text.toLocaleLowerCase().includes(options.topic.toLocaleLowerCase()) ? "Topic not present in document"
                : options.nation && !doc.text.toLocaleLowerCase().includes(options.nation.toLocaleLowerCase()) ? "Nation search term not present in document"
                  : options.ongoing && record.caseType !== "ongoing" ? "Current status not verified by fresh official docket" : undefined;
          if (reason) filtered.push({ url: candidate.url, reason });
          else {
            const identity = { ...record, id: candidate.id };
            const duplicate = findDuplicate(identity, known);
            candidate.duplicateOf = duplicate.duplicateOf;
            candidate.duplicateReasons = duplicate.reasons;
            candidate.extracted.relatedProceedings = [...record.relatedProceedings ?? [], ...relatedProceedings(identity, known)];
            candidate.relevanceReasons.push(...(entry.discoveredFrom ? [`Discovered from ${entry.discoveredFrom}`] : []));
            candidates.push(candidate); known.push(identity);
            coverage[jurisdiction].candidates++;
            if (duplicate.duplicateOf) coverage[jurisdiction].duplicates++;
            if (candidate.verification === "VERIFIED_PRIMARY" || candidate.verification === "VERIFIED_MULTIPLE") coverage[jurisdiction].verified++;
            else coverage[jurisdiction].requiringReview++;
          }
        }
        if (entry.depth < maxDepth) {
          const links = doc.links.filter((url) => /item|doc|decision|judgment|jugement|reason|case|docket|hearing|audience|recent|registry|recherche|nav\.do/i.test(url)).slice(0, 50);
          for (const url of links.reverse()) {
            const target = sourceForUrl(url);
            if (!target) continue;
            add({ url, source: target, depth: entry.depth + 1, discoveredFrom: doc.normalizedUrl }, true);
          }
        }
      } catch (error) {
        const reason = error instanceof Error ? error.message : "Source unavailable";
        inaccessible.push({ jurisdiction, url: entry.url, reason }); coverage[jurisdiction].inaccessible++;
        visited.push({ jurisdiction, url: entry.url, status: reason });
      }
    }
    if (exhausted) break;
  }
  return { dryRun: Boolean(options.dryRun), productionWrites: 0, pagesAttempted, requests: crawler.requests, cacheHits: crawler.cacheHits,
    elapsedMs: Date.now() - crawler.started, limits: { ...crawler.limits, maxPages, maxDepth }, coverage,
    queriesPlanned: queries, queriesRun, searchStatus: adapters.search ? "CONFIGURED" : "UNAVAILABLE: no permitted search provider configured",
    searchFailures, candidates, caseCandidatesFound: candidates.length, duplicates: candidates.filter((c) => c.duplicateOf).length,
    verification: { verified: candidates.filter((c) => /VERIFIED_PRIMARY|VERIFIED_MULTIPLE/.test(c.verification)).length, requiringReview: candidates.filter((c) => !/VERIFIED_PRIMARY|VERIFIED_MULTIPLE/.test(c.verification)).length },
    duplicateScope: adapters.duplicateScope ?? "Provided records and this run only; live pending/published database not read", aiDeferred,
    filtered, inaccessible, visited, unvisitedUrls: [...queues.values()].flat().map((e) => e.url),
    stopReason: exhausted ? "REQUEST_OR_TIME_BUDGET" : pagesAttempted >= maxPages ? "PAGE_BUDGET" : "FRONTIER_EXHAUSTED",
    note: "Configured coverage is not complete retrieval. Candidates are never published; all require editorial approval. Restricted content is not retained." };
}
