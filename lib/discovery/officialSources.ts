export interface OfficialSourceMonitor {
  name: string;
  url: string;
  coverage: "judgments" | "active-cases" | "jurisdiction-index";
}

// Public entry points only. Individual requests remain subject to robots.txt,
// the per-domain rate policy, response-size limits, and the review queue.
export const officialSourceMonitors: OfficialSourceMonitor[] = [
  { name: "Supreme Court of Canada judgments", url: "https://www.scc-csc.ca/judgments-jugements/", coverage: "judgments" },
  { name: "Supreme Court of Canada case information", url: "https://www.scc-csc.ca/cases-dossiers/search-recherche/", coverage: "active-cases" },
  { name: "Supreme Court of Canada decisions", url: "https://decisions.scc-csc.ca/scc-csc/en/nav.do", coverage: "judgments" },
  { name: "Federal Court and Federal Court of Appeal decisions", url: "https://decisions.fct-cf.gc.ca/fc-cf/en/nav.do", coverage: "judgments" },
  { name: "British Columbia Supreme Court recent judgments", url: "https://www.bccourts.ca/supreme_court/recent_Judgments.aspx", coverage: "judgments" },
  { name: "British Columbia Court of Appeal recent judgments", url: "https://www.bccourts.ca/Court_of_Appeal/recent_Judgments.aspx", coverage: "judgments" },
  { name: "Ontario Superior Court decisions", url: "https://www.ontariocourts.ca/scj/about-the-court-2/decisions-of-the-court/", coverage: "judgments" },
  { name: "Alberta Court of Appeal recent judgments", url: "https://www3.albertacourts.ca/ca/publications/recent-judgments", coverage: "judgments" },
  { name: "Saskatchewan court decisions", url: "https://sasklawcourts.ca/", coverage: "judgments" },
  { name: "Manitoba Court of Appeal recent judgments", url: "https://www.manitobacourts.mb.ca/court-of-appeal/recent-judgments/", coverage: "judgments" },
  { name: "New Brunswick courts", url: "https://www.courtsnb-coursnb.ca/content/cour/en.html", coverage: "jurisdiction-index" },
  { name: "Nova Scotia court decisions", url: "https://www.courts.ns.ca/decisions", coverage: "judgments" },
  { name: "Prince Edward Island courts", url: "https://www.courts.pe.ca/", coverage: "jurisdiction-index" },
  { name: "Newfoundland and Labrador judgments", url: "https://records.court.nl.ca/", coverage: "judgments" },
  { name: "Yukon Supreme Court judgments", url: "https://www.yukoncourts.ca/en/supreme-court/judgments", coverage: "judgments" },
  { name: "Northwest Territories courts", url: "https://www.nwtcourts.ca/en/", coverage: "jurisdiction-index" },
  { name: "Nunavut Court of Justice decisions", url: "https://www.nunavutcourts.ca/nunavut-court-justice/decisions", coverage: "judgments" },
  { name: "Nunavut Court of Appeal decisions", url: "https://www.nunavutcourts.ca/nunavut-court-appeal/decisions", coverage: "judgments" },
  { name: "CanLII federal databases", url: "https://www.canlii.org/en/ca/", coverage: "jurisdiction-index" },
  { name: "CanLII British Columbia databases", url: "https://www.canlii.org/en/bc/", coverage: "jurisdiction-index" },
  { name: "CanLII Alberta databases", url: "https://www.canlii.org/en/ab/", coverage: "jurisdiction-index" },
  { name: "CanLII Saskatchewan databases", url: "https://www.canlii.org/en/sk/", coverage: "jurisdiction-index" },
  { name: "CanLII Manitoba databases", url: "https://www.canlii.org/en/mb/", coverage: "jurisdiction-index" },
  { name: "CanLII Ontario databases", url: "https://www.canlii.org/en/on/", coverage: "jurisdiction-index" },
  { name: "CanLII Quebec databases", url: "https://www.canlii.org/en/qc/", coverage: "jurisdiction-index" },
  { name: "CanLII New Brunswick databases", url: "https://www.canlii.org/en/nb/", coverage: "jurisdiction-index" },
  { name: "CanLII Nova Scotia databases", url: "https://www.canlii.org/en/ns/", coverage: "jurisdiction-index" },
  { name: "CanLII Prince Edward Island databases", url: "https://www.canlii.org/en/pe/", coverage: "jurisdiction-index" },
  { name: "CanLII Newfoundland and Labrador databases", url: "https://www.canlii.org/en/nl/", coverage: "jurisdiction-index" },
  { name: "CanLII Yukon databases", url: "https://www.canlii.org/en/yk/", coverage: "jurisdiction-index" },
  { name: "CanLII Northwest Territories databases", url: "https://www.canlii.org/en/nt/", coverage: "jurisdiction-index" },
  { name: "CanLII Nunavut databases", url: "https://www.canlii.org/en/nu/", coverage: "jurisdiction-index" },
];

export const officialCaseSearchDomains = [
  "decisions.scc-csc.ca", "scc-csc.ca", "decisions.fct-cf.gc.ca", "canlii.org",
  "bccourts.ca", "ontariocourts.ca", "albertacourts.ca", "sasklawcourts.ca",
  "manitobacourts.mb.ca", "courtsnb-coursnb.ca", "courts.ns.ca", "courts.pe.ca",
  "court.nl.ca", "yukoncourts.ca", "nwtcourts.ca", "nunavutcourts.ca",
] as const;
