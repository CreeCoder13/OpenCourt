const endpoint = process.env.OPENCOURT_DISCOVERY_URL?.trim();
const secret = process.env.DISCOVERY_CRON_SECRET?.trim();
if (!endpoint) throw new Error("OPENCOURT_DISCOVERY_URL is not configured");
if (!secret) throw new Error("DISCOVERY_CRON_SECRET is not configured");

const args = process.argv.slice(2);
const valueFor = (name) => {
  const exact = args.find((arg) => arg.startsWith(`--${name}=`));
  if (exact) return exact.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : undefined;
};
const yearValue = valueFor("year");
const backfill = args.includes("--backfill");
const runs = Math.min(20, Math.max(1, Number(valueFor("runs") ?? (backfill ? 8 : 1))));
const queryLimit = Number(valueFor("query-limit") ?? (backfill ? 25 : 12));
const body = {
  queryLimit,
  processLimit: Number(valueFor("process-limit") ?? (backfill ? 20 : 8)),
  mode: backfill ? "backfill" : "broad",
  ...(yearValue ? { year: Number(yearValue) } : {}),
  ...(valueFor("topic") ? { topic: valueFor("topic") } : {}),
  ...(args.includes("--ongoing") ? { ongoing: true } : {}),
  ...(args.includes("--dry-run") ? { dryRun: true } : {}),
};
if (yearValue && (!Number.isInteger(body.year) || body.year < 1867)) throw new Error("--year must be a valid Canadian legal year");
if (!Number.isInteger(runs)) throw new Error("--runs must be an integer from 1 to 20");

const totals = { sourcesSearched: 0, urlsDiscovered: 0, pagesChecked: 0, caseCandidatesFound: 0, duplicatesSkipped: 0, verifiedCases: 0, casesRequiringReview: 0, failures: 0, seededRecords: 0 };
for (let run = 0; run < runs; run += 1) {
  const requestBody = { ...body, queryOffset: Number(valueFor("query-offset") ?? Math.floor(Date.now() / 86_400_000) * queryLimit) + run * queryLimit };
  const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify(requestBody), signal: AbortSignal.timeout(310_000) });
  if (!response.ok) throw new Error(`Discovery run ${run + 1}/${runs} failed with HTTP ${response.status}`);
  const result = await response.json();
  for (const key of Object.keys(totals)) totals[key] += Number(result[key] ?? 0);
  console.log(`Batch ${run + 1}/${runs}: ${result.urlsDiscovered ?? 0} URLs staged, ${result.documentsProcessed ?? 0} pages processed.`);
}
const result = { ...totals, dryRun: Boolean(body.dryRun) };
console.log([
  `Discovery complete${result.dryRun ? " (dry run; main records unchanged)" : ""}.`,
  `Sources searched: ${result.sourcesSearched ?? result.queriesRun ?? 0}`,
  `URLs staged: ${result.urlsDiscovered ?? 0}`,
  `Pages checked: ${result.pagesChecked ?? result.documentsProcessed ?? 0}`,
  `Case candidates: ${result.caseCandidatesFound ?? 0}`,
  `Probable duplicates: ${result.duplicatesSkipped ?? 0}`,
  `Verified candidates: ${result.verifiedCases ?? 0}`,
  `Requiring review: ${result.casesRequiringReview ?? 0}`,
  `Failures: ${result.failures ?? 0}`,
  `Seed records added: ${result.seededRecords ?? 0}`,
].join("\n"));
