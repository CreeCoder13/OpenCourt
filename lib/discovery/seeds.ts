import { cases } from "../../data/cases";
import { laws } from "../../data/laws";

export const discoverySeedUrls = [
  ...cases.flatMap((record) => record.sources.filter((source) => source.type === "Primary").map((source) => source.url)),
  ...laws.map((record) => record.officialSourceUrl),
] as const;

export const trustedMonitorUrls = [
  "https://decisions.scc-csc.ca/scc-csc/en/d/s/index.do?cont=Aboriginal",
  "https://decisions.fct-cf.gc.ca/fc-cf/en/nav.do",
  "https://www.parl.ca/legisinfo/en/bills",
  "https://gazette.gc.ca/rp-pr/publications-eng.html",
] as const;
