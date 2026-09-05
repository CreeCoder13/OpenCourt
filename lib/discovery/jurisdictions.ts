// Court roster checked against https://laws.justice.gc.ca/eng/Court/.
// A roster entry is coverage configuration, not a claim that its site is accessible.
export const JURISDICTIONS = {
  CA: "Federal", BC: "British Columbia", AB: "Alberta", SK: "Saskatchewan", MB: "Manitoba",
  ON: "Ontario", QC: "Quebec", NB: "New Brunswick", NS: "Nova Scotia", PE: "Prince Edward Island",
  NL: "Newfoundland and Labrador", YT: "Yukon", NT: "Northwest Territories", NU: "Nunavut",
} as const;
export type Jurisdiction = keyof typeof JURISDICTIONS;
export type CourtLevel = "appellate" | "superior" | "provincial" | "unified" | "tribunal";
export interface CourtCoverage { jurisdiction: Jurisdiction; name: string; level: CourtLevel; url: string; codes: string[] }
const court = (jurisdiction: Jurisdiction, level: CourtLevel, name: string, url: string, codes: string): CourtCoverage => ({ jurisdiction, level, name, url, codes: codes.split(" ") });
export const courtCoverage: CourtCoverage[] = [
  court("CA", "appellate", "Supreme Court of Canada", "https://decisions.scc-csc.ca/scc-csc/en/nav.do", "SCC CSC"),
  court("CA", "superior", "Federal Court", "https://decisions.fct-cf.gc.ca/fc-cf/en/nav.do", "FC CF FCT CFPI"),
  court("CA", "appellate", "Federal Court of Appeal", "https://decisions.fca-caf.gc.ca/fca-caf/en/nav.do", "FCA CAF"),
  court("CA", "superior", "Tax Court of Canada", "https://decision.tcc-cci.gc.ca/tcc-cci/en/nav.do", "TCC CCI"),
  court("BC", "appellate", "British Columbia Court of Appeal", "https://www.bccourts.ca/Court_of_Appeal/recent_Judgments.aspx", "BCCA"),
  court("BC", "superior", "Supreme Court of British Columbia", "https://www.bccourts.ca/supreme_court/recent_Judgments.aspx", "BCSC"),
  court("BC", "provincial", "Provincial Court of British Columbia", "https://provincialcourt.bc.ca/finding-judgments", "BCPC"),
  court("AB", "appellate", "Court of Appeal of Alberta", "https://www.albertacourts.ca/ca/publications/recent-judgments", "ABCA"),
  court("AB", "superior", "Court of King's Bench of Alberta", "https://www.albertacourts.ca/kb", "ABKB ABQB"),
  court("AB", "provincial", "Alberta Court of Justice", "https://www.albertacourts.ca/cj", "ABCJ ABPC"),
  court("SK", "appellate", "Court of Appeal for Saskatchewan", "https://sasklawcourts.ca/", "SKCA"),
  court("SK", "superior", "Court of King's Bench for Saskatchewan", "https://sasklawcourts.ca/", "SKKB SKQB"),
  court("SK", "provincial", "Provincial Court of Saskatchewan", "https://sasklawcourts.ca/", "SKPC"),
  court("MB", "appellate", "Manitoba Court of Appeal", "https://www.manitobacourts.mb.ca/court-of-appeal/recent-judgments/", "MBCA"),
  court("MB", "superior", "Court of King's Bench of Manitoba", "https://www.manitobacourts.mb.ca/court-of-kings-bench/", "MBKB MBQB"),
  court("MB", "provincial", "Provincial Court of Manitoba", "https://www.manitobacourts.mb.ca/provincial-court/", "MBPC"),
  court("ON", "appellate", "Court of Appeal for Ontario", "https://www.ontariocourts.ca/coa/", "ONCA"),
  court("ON", "superior", "Ontario Superior Court of Justice", "https://www.ontariocourts.ca/scj/", "ONSC ONSCDC"),
  court("ON", "provincial", "Ontario Court of Justice", "https://www.ontariocourts.ca/ocj/", "ONCJ"),
  court("QC", "appellate", "Cour d'appel du Québec", "https://courdappelduquebec.ca/jugements/", "QCCA"),
  court("QC", "superior", "Cour supérieure du Québec", "https://coursuperieureduquebec.ca/en/about/decisions-of-the-court", "QCCS"),
  court("QC", "provincial", "Cour du Québec", "https://courduquebec.ca/", "QCCQ"),
  court("NB", "appellate", "Court of Appeal of New Brunswick", "https://www.courtsnb-coursnb.ca/content/cour/en/appeal.html", "NBCA"),
  court("NB", "superior", "Court of King's Bench of New Brunswick", "https://www.courtsnb-coursnb.ca/content/cour/en.html", "NBKB NBQB"),
  court("NB", "provincial", "Provincial Court of New Brunswick", "https://www.courtsnb-coursnb.ca/content/cour/en/provincial.html", "NBPC"),
  court("NS", "appellate", "Nova Scotia Court of Appeal", "https://www.courts.ns.ca/decisions", "NSCA"),
  court("NS", "superior", "Supreme Court of Nova Scotia", "https://www.courts.ns.ca/decisions", "NSSC"),
  court("NS", "provincial", "Provincial Court of Nova Scotia", "https://www.courts.ns.ca/decisions", "NSPC"),
  court("PE", "appellate", "Prince Edward Island Court of Appeal", "https://www.courts.pe.ca/court-of-appeal", "PECA PESCAD"),
  court("PE", "superior", "Supreme Court of Prince Edward Island", "https://www.courts.pe.ca/supreme-court", "PESC PESCTD"),
  court("PE", "provincial", "Provincial Court of Prince Edward Island", "https://www.courts.pe.ca/provincial-court", "PEPC"),
  court("NL", "appellate", "Court of Appeal of Newfoundland and Labrador", "https://www.court.nl.ca/appeal/", "NLCA"),
  court("NL", "superior", "Supreme Court of Newfoundland and Labrador", "https://records.court.nl.ca/", "NLSC NLSCTD"),
  court("NL", "provincial", "Provincial Court of Newfoundland and Labrador", "https://court.nl.ca/provincial/", "NLPC"),
  court("YT", "appellate", "Court of Appeal of Yukon", "https://www.yukoncourts.ca/en/", "YKCA YTCA"),
  court("YT", "superior", "Supreme Court of Yukon", "https://www.yukoncourts.ca/en/supreme-court/judgments", "YKSC YTSC"),
  court("YT", "provincial", "Territorial Court of Yukon", "https://www.yukoncourts.ca/en/", "YKTC YTTC"),
  court("NT", "appellate", "Court of Appeal of the Northwest Territories", "https://www.nwtcourts.ca/en/courts/court-of-appeal/", "NWTCA"),
  court("NT", "superior", "Supreme Court of the Northwest Territories", "https://www.nwtcourts.ca/en/courts/supreme-court/", "NWTSC"),
  court("NT", "provincial", "Territorial Court of the Northwest Territories", "https://www.nwtcourts.ca/en/courts/territorial-court/", "NWTTC"),
  // Nunavut has a unified trial court, not a separate provincial court.
  court("NU", "appellate", "Nunavut Court of Appeal", "https://www.nunavutcourts.ca/nunavut-court-appeal/decisions", "NUCA"),
  court("NU", "unified", "Nunavut Court of Justice", "https://www.nunavutcourts.ca/nunavut-court-justice/decisions", "NUCJ"),
  court("CA", "tribunal", "Specific Claims Tribunal", "https://decisions.sct-trp.ca/sct/en/nav.do", "SCTC TRPC"),
  court("CA", "tribunal", "Canadian Human Rights Tribunal", "https://decisions.chrt-tcdp.gc.ca/chrt-tcdp/en/nav.do", "CHRT TCDP"),
];
export function parseJurisdiction(value?: string): Jurisdiction | undefined {
  if (!value || /^(all|canada|nationwide)$/i.test(value)) return undefined;
  const code = value.toUpperCase() === "YK" ? "YT" : value.toUpperCase();
  if (code in JURISDICTIONS) return code as Jurisdiction;
  const found = Object.entries(JURISDICTIONS).find(([, name]) => name.toLowerCase() === value.toLowerCase());
  if (found) return found[0] as Jurisdiction;
  throw new Error(`Unknown jurisdiction: ${value}`);
}
export function courtForCitation(citation?: string) {
  const code = citation?.match(/^\d{4}\s+([A-Z]+)/i)?.[1]?.toUpperCase();
  return courtCoverage.find((item) => item.codes.includes(code ?? ""));
}
