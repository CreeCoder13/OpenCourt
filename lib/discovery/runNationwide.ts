import "server-only";
import { enqueueDocument, ensureSchema, listAllDuplicateCandidates, startScanRun, finishScanRun } from "../../db";
import { cases } from "../../data/cases";
import { CrawlerSession } from "./crawler";
import { discoverNationwide, type NationwideOptions } from "./nationwide";
import { fetchForDiscovery } from "./fetchDocument";
import { classifyLegalDocument } from "../server/aiDiscovery";
import { isSearchConfigured, searchWeb } from "./search";

export async function runNationwideBatch(options: NationwideOptions) {
  const session = new CrawlerSession(options);
  const staticRecords = cases.map((c) => ({ id: c.id, caseName: c.caseName, neutralCitation: c.neutralCitation, courtFileNumber: c.courtFileNumber, court: c.court, decisionDate: c.decisionDate, officialDecisionUrl: c.sources.find((s) => s.type === "Primary" && s.category === "Judgment")?.url }));
  // This guard precedes schema initialization, queue operations, cache/AI writes and scan logs.
  if (options.dryRun) return discoverNationwide(options, { crawler: session, existing: staticRecords,
    duplicateScope: "Static published records + within-run only; no production database read", search: isSearchConfigured() ? (q, ms) => searchWeb(q, 10, ms) : undefined });
  await ensureSchema();
  const existing = [...staticRecords, ...await listAllDuplicateCandidates()];
  const scanId = await startScanRun("nationwide");
  const report = await discoverNationwide(options, { crawler: session, existing, duplicateScope: "All pending and published D1 records + static published + within-run",
    fetchDocument: (url) => fetchForDiscovery(url, session), search: isSearchConfigured() ? (q, ms) => searchWeb(q, 10, ms) : undefined,
    classify: process.env.OPENC_API_KEY ? (doc) => classifyLegalDocument({ ...doc, url: doc.normalizedUrl }) : undefined });
  let staged = 0;
  for (const candidate of report.candidates) {
    if (await enqueueDocument(candidate)) staged++;
    // No UPDATE on already reviewed candidates; stronger evidence is resolved explicitly by editors.
  }
  const result = { ...report, scanRunId: scanId, staged, casesAdded: 0, seededRecords: 0, seededRelationships: 0 };
  await finishScanRun(scanId, { queriesRun: report.queriesRun, urlsDiscovered: staged, documentsProcessed: report.pagesAttempted });
  return result;
}
