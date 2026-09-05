import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { discoverNationwide } from "../lib/discovery/nationwide.ts";
import { validateDiscoveryOptions } from "../lib/discovery/options.ts";
import { isSearchConfigured, searchWeb } from "../lib/discovery/search.ts";
import { cases } from "../data/cases.ts";

const args = process.argv.slice(2);
const values = {}, flags = new Set();
const booleanFlags = new Set(["dry-run", "nationwide", "ongoing", "backfill", "help"]);
const valueFlags = new Set(["jurisdiction", "province", "territory", "year", "topic", "nation", "max-pages", "max-requests", "max-depth", "timeout-ms", "max-duration-ms", "query-limit", "query-offset", "process-limit", "runs", "report", "snapshot"]);
for (let i = 0; i < args.length; i++) {
  const match = args[i].match(/^--([^=]+)(?:=(.*))?$/);
  if (!match) throw new Error(`Unexpected argument: ${args[i]}`);
  const [, key, inline] = match;
  if (booleanFlags.has(key)) { if (inline !== undefined) throw new Error(`--${key} does not take a value`); flags.add(key); }
  else if (valueFlags.has(key)) {
    const value = inline ?? args[++i];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    values[key] = value;
  } else throw new Error(`Unknown option --${key}`);
}
if (flags.has("help")) {
  console.log("OpenCourt discovery: --nationwide | --jurisdiction BC; --year 2024 --topic 'duty to consult' --nation Haida --ongoing --dry-run --max-pages 42 --max-requests 100 --max-depth 2 --max-duration-ms 180000 --query-limit 14 --query-offset 0 --snapshot local.json --report outputs/discovery.json. Dry runs are local/read-only. Other runs stage through OPENCOURT_DISCOVERY_URL and require DISCOVERY_CRON_SECRET; they never publish.");
  process.exit(0);
}
const raw = { dryRun: flags.has("dry-run"), ongoing: flags.has("ongoing"), jurisdiction: values.jurisdiction ?? values.province ?? values.territory, topic: values.topic, nation: values.nation };
for (const [flag, key] of Object.entries({ year: "year", "max-pages": "maxPages", "process-limit": "maxPages", "max-requests": "maxRequests", "max-depth": "maxDepth", "timeout-ms": "timeoutMs", "max-duration-ms": "maxDurationMs", "query-limit": "queryLimit", "query-offset": "queryOffset" })) if (values[flag] !== undefined) raw[key] = Number(values[flag]);
const options = validateDiscoveryOptions(raw);
const runs = Number(values.runs ?? 1);
if (!Number.isInteger(runs) || runs < 1 || runs > 20) throw new Error("--runs must be 1–20");
if (options.dryRun && runs !== 1) throw new Error("A bounded dry run requires --runs 1");
let result;
if (options.dryRun) {
  const snapshot = values.snapshot ? JSON.parse(await readFile(values.snapshot, "utf8")) : [];
  if (!Array.isArray(snapshot) || snapshot.some((c) => !c || typeof c.id !== "string")) throw new Error("Snapshot must be an array of pending/published case identities with string IDs");
  result = await discoverNationwide(options, {
    existing: [...cases.map((c) => ({ id: c.id, caseName: c.caseName, neutralCitation: c.neutralCitation, court: c.court, courtFileNumber: c.courtFileNumber, decisionDate: c.decisionDate, officialDecisionUrl: c.sources.find((s) => s.type === "Primary" && s.category === "Judgment")?.url })), ...snapshot],
    duplicateScope: values.snapshot ? "Static published records + supplied pending/published snapshot + within-run (snapshot freshness is operator responsibility)" : "Static published records + within-run; LIVE PENDING/PUBLISHED DATABASE NOT READ",
    search: isSearchConfigured() ? (query, ms) => searchWeb(query, 10, ms) : undefined,
  });
} else {
  const endpoint = process.env.OPENCOURT_DISCOVERY_URL?.trim();
  const secret = process.env.DISCOVERY_CRON_SECRET?.trim();
  if (!endpoint || !secret) throw new Error("Staging requires OPENCOURT_DISCOVERY_URL and DISCOVERY_CRON_SECRET. Use --dry-run for a local read-only scan.");
  if (new URL(endpoint).protocol !== "https:") throw new Error("Staging endpoint must use HTTPS");
  const reports = [];
  for (let run = 0; run < runs; run++) {
    const response = await fetch(endpoint, { method: "POST", redirect: "error", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ ...options, nationwide: true, queryOffset: (options.queryOffset ?? 0) + run * (options.queryLimit ?? 14) }), signal: AbortSignal.timeout(310000) });
    if (!response.ok) throw new Error(`Staging failed: HTTP ${response.status}`);
    reports.push(await response.json());
  }
  result = reports.length === 1 ? reports[0] : { runs: reports };
}
if (values.report) { await mkdir(dirname(values.report), { recursive: true }); await writeFile(values.report, JSON.stringify(result, null, 2) + "\n", { flag: "wx" }); }
console.log(JSON.stringify(result, null, 2));
