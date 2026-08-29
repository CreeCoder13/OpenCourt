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
const body = {
  queryLimit: Number(valueFor("query-limit") ?? 12),
  processLimit: Number(valueFor("process-limit") ?? 8),
  ...(yearValue ? { year: Number(yearValue) } : {}),
  ...(valueFor("topic") ? { topic: valueFor("topic") } : {}),
  ...(args.includes("--ongoing") ? { ongoing: true } : {}),
  ...(args.includes("--dry-run") ? { dryRun: true } : {}),
};
if (yearValue && (!Number.isInteger(body.year) || body.year < 1867)) throw new Error("--year must be a valid Canadian legal year");

const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify(body), signal: AbortSignal.timeout(65_000) });
if (!response.ok) throw new Error(`Discovery run failed with HTTP ${response.status}`);
const result = await response.json();
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
