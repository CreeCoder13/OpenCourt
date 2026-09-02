import { cases } from "../../data/cases";
import { laws } from "../../data/laws";
import { officialSourceMonitors } from "./officialSources";

export const discoverySeedUrls = [
  ...cases.flatMap((record) => record.sources.filter((source) => source.type === "Primary").map((source) => source.url)),
  ...laws.map((record) => record.officialSourceUrl),
] as const;

export const trustedMonitorUrls = [
  ...officialSourceMonitors.map((source) => source.url),
  "https://www.parl.ca/legisinfo/en/bills",
  "https://gazette.gc.ca/rp-pr/publications-eng.html",
] as const;
