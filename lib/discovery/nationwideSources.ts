import { courtCoverage, type Jurisdiction } from "./jurisdictions.ts";
import { officialSourceMonitors } from "./officialSources.ts";
export interface DiscoverySource { name: string; url: string; jurisdiction: Jurisdiction; kind: "court" | "tribunal" | "context"; access: "public" | "manual" }
const regional: Record<string, Jurisdiction> = { "olt.gov.on.ca": "ON", "aer.ca": "AB", "bceab.ca": "BC", "bape.gouv.qc.ca": "QC", "nirb.ca": "NU", "nunavut.ca": "NU", "reviewboard.ca": "NT", "mvlwb.com": "NT", "yesab.ca": "YT", "screeningcommittee.ca": "NT" };
export const nationwideSources: DiscoverySource[] = [
  ...courtCoverage.map((c) => ({ name: c.name, url: c.url, jurisdiction: c.jurisdiction, kind: c.level === "tribunal" ? "tribunal" as const : "court" as const, access: "public" as const })),
  ...officialSourceMonitors.map((s): DiscoverySource => {
    const host = new URL(s.url).hostname.replace(/^www\./, "");
    const matched = courtCoverage.find((c) => new URL(c.url).hostname.replace(/^www\./, "") === host);
    const jurisdiction = matched?.jurisdiction ?? Object.entries(regional).find(([domain]) => host === domain || host.endsWith(`.${domain}`))?.[1] ?? "CA";
    return { name: s.name, url: s.url, jurisdiction, kind: /tribunal|regulatory/.test(s.coverage) ? "tribunal" : "court", access: /canlii\.org|lupit\.nunavut/.test(host) ? "manual" : "public" };
  }),
  { name: "Federal Court of Appeal files and hearings", url: "https://www.fca-caf.ca/en/home", jurisdiction: "CA", kind: "court", access: "public" },
  { name: "BC Human Rights Tribunal", url: "https://www.bchrt.bc.ca/law-library/decisions/", jurisdiction: "BC", kind: "tribunal", access: "public" },
  { name: "Human Rights Tribunal of Ontario", url: "https://tribunalsontario.ca/hrto/", jurisdiction: "ON", kind: "tribunal", access: "public" },
  { name: "Tribunal des droits de la personne", url: "https://tribunaldesdroitsdelapersonne.ca/", jurisdiction: "QC", kind: "tribunal", access: "public" },
  { name: "Assembly of First Nations", url: "https://afn.ca/", jurisdiction: "CA", kind: "context", access: "public" },
  { name: "Inuit Tapiriit Kanatami", url: "https://www.itk.ca/", jurisdiction: "CA", kind: "context", access: "public" },
  { name: "Métis National Council", url: "https://www.metisnation.ca/", jurisdiction: "CA", kind: "context", access: "public" },
  { name: "Nisga'a Lisims Government", url: "https://www.nisgaanation.ca/", jurisdiction: "BC", kind: "context", access: "public" },
  { name: "Crown-Indigenous Relations", url: "https://www.rcaanc-cirnac.gc.ca/", jurisdiction: "CA", kind: "context", access: "public" },
  { name: "Canadian Lawyer", url: "https://www.canadianlawyermag.com/", jurisdiction: "CA", kind: "context", access: "public" },
];
export function sourceForUrl(url: string): DiscoverySource | undefined {
  const host = new URL(url).hostname.replace(/^www\./, "");
  return nationwideSources.filter((s) => {
    const domain = new URL(s.url).hostname.replace(/^www\./, "");
    return host === domain || host.endsWith(`.${domain}`);
  }).sort((a, b) => new URL(b.url).hostname.length - new URL(a.url).hostname.length)[0];
}
