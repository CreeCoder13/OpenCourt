import { officialCaseSearchDomains } from "./officialSources.ts";
import { courtCoverage, JURISDICTIONS, type Jurisdiction } from "./jurisdictions.ts";

export const INDIGENOUS_TERMS = [
  "autochtone", "autochtones", "première nation", "premières nations", "premieres nations", "indien", "inuits",
  "anishinabek", "anishinaabeg", "atikamekw", "atikamek", "wolastoqey", "maliseet", "malécite", "mi'kmaq", "micmac",
  "naskapi", "eeyou", "eyou", "algonquin", "anishinabe", "huron-wendat", "wendat", "haudenosaunee", "iroquois",
  "tsilhqotin", "tsilhqot’in", "chilcotin", "wet’suwet’en", "wetsuweten", "gitksan", "nisgaa", "secwepemc", "shuswap",
  "siksika", "kainai", "piikani", "stoney", "nakoda", "anishininew", "ojibway", "ojibwe", "nuxalk", "nuu-chah-nulth",
  "tŝilhqot’in", "tahltan", "tlingit", "tlicho", "tłı̨chǫ", "gwich’in", "gwich'in", "sahtu", "dehcho", "inuvialuit",
  "nunavik", "nunatsiavut", "nunavut tunngavik", "labrador inuit", "beothuk", "eskimo",
  "indigenous", "aboriginal", "first nation", "first nations", "métis", "metis", "inuit", "innu",
  "cree", "dene", "anishinaabe", "mi'kmaq", "mi’kmaq", "mi'kmaw", "mi’kmaw", "haida",
  "secwépemc", "nisga'a", "nisga’a", "tsilhqot'in", "tsilhqot’in", "gitxsan", "wet'suwet'en",
  "wet’suwet’en", "mohawk", "kanien'kehá", "kanien’kehá", "dakota", "lakota", "nakota",
  "saulteaux", "blackfoot", "band council", "reserve", "status indian", "indian act",
] as const;

export const LEGAL_TERMS = [
  "jugement", "arrêt", "décision", "appel", "tribunal", "titre ancestral", "droits ancestraux", "droits issus de traités",
  "article 35", "obligation de consulter", "honneur de la couronne", "droits métis", "droits inuits", "chasse", "pêche",
  "terres de réserve", "loi sur les indiens", "autonomie gouvernementale", "revendications particulières", "fiscalité",
  "services à l’enfance", "services à l'enfance", "principe de jordan", "déclaration des nations unies", "dnudpa",
  "court", "judgment", "decision", "appeal", "neutral citation", "statute", "legislation", "regulation",
  "bill", "enacted", "amendment", "treaty", "agreement", "land claim", "specific claim",
  "comprehensive claim", "self-government", "section 35", "s. 35", "constitution act", "aboriginal title",
  "indigenous title", "treaty rights", "aboriginal rights", "duty to consult", "honour of the crown",
  "fiduciary duty", "undrip", "jurisdiction", "tax exemption", "section 87", "hunting rights",
  "fishing rights", "harvesting rights", "reserve lands", "surrender", "expropriation",
  "free prior informed consent", "self-government agreement", "inherent right", "comprehensive claim",
  "resource rights", "mineral rights", "water rights", "land rights", "child welfare", "jordan's principle",
  "residential schools", "day schools", "sixties scoop", "treaty annuity", "treaty implementation",
  "treaty interpretation", "métis rights", "metis rights", "métis harvesting", "indigenous jurisdiction",
  "indigenous law", "indigenous legal order", "first nation jurisdiction", "consultation", "accommodation",
  "title lands", "addition to reserve", "modern treaty", "custom election", "registration",
] as const;

export const STRONG_LEGAL_SIGNALS = [
  "scc", "fca", "fc", "court of appeal", "supreme court", "king's bench", "kings bench", "queen's bench",
  "reasons for judgment", "held:", "constitutional", "royal assent", "canada gazette", "laws of canada",
] as const;

export const FALSE_POSITIVE_TERMS = [
  "indian recipe", "indian restaurant", "indian cuisine", "india national", "india treaty",
  "sports court", "basketball court", "tennis court", "treaty shopping centre",
] as const;

export const LANDMARK_SEEDS = [
  "Calder", "Sparrow", "Van der Peet", "Delgamuukw", "Haida Nation", "Taku River", "Mikisew Cree",
  "Marshall", "Powley", "Tsilhqot'in Nation", "Daniels", "Manitoba Métis Federation", "Desautel",
  "Restoule", "Reference re An Act respecting First Nations, Inuit and Métis children, youth and families",
] as const;

export const SEARCH_TEMPLATES = [
  '"{term}" Canada court judgment',
  '"{term}" site:decisions.scc-csc.ca',
  '"{term}" site:decisions.fct-cf.gc.ca',
  '"{term}" site:canlii.org',
  '"{term}" Canada legislation amendment',
  '"{term}" Canada treaty agreement official',
  '"{term}" court of appeal Indigenous',
] as const;

export const CASE_TOPIC_CLUSTERS = [
  "Aboriginal title section 35", "Aboriginal rights section 35", "treaty rights interpretation",
  "duty to consult accommodate", "First Nation reserve lands", "First Nations child family services",
  "Métis rights harvesting", "Inuit rights Nunavut", "Indigenous self-government jurisdiction",
  "specific claims land claims", "Indigenous hunting fishing rights", "Indian Act litigation",
  "Indigenous taxation section 87", "Indigenous resource development", "UNDRIP Indigenous rights",
  "Gladue Indigenous sentencing", "honour of the Crown fiduciary duty", "modern treaty implementation",
  "Indigenous environmental assessment", "band council election governance",
] as const;

function circularSlice<T>(values: T[], offset: number, limit: number): T[] {
  if (!values.length || limit <= 0) return [];
  const start = ((offset % values.length) + values.length) % values.length;
  return Array.from({ length: Math.min(limit, values.length) }, (_, index) => values[(start + index) % values.length]);
}

export interface SearchFilters { topic?: string; year?: number; ongoing?: boolean; jurisdiction?: Jurisdiction; nation?: string }

export function buildSearchQueries(offset = 0, limit = 25, filters: SearchFilters = {}): string[] {
  const courts = courtCoverage.filter((item) => !filters.jurisdiction || item.jurisdiction === filters.jurisdiction);
  const terms = filters.topic ? [filters.topic] : [...CASE_TOPIC_CLUSTERS, "titre ancestral droits ancestraux article 35", "droits issus de traités obligation de consulter", "droits métis inuits chasse pêche", "loi sur les Indiens terres de réserve fiscalité", "autonomie gouvernementale revendications particulières", "services à l'enfance principe de Jordan DNUDPA"];
  const queries: string[] = [];
  // Interleave jurisdictions before rotating topics, so the first nationwide batch is not SCC-only.
  const scopes = [...courts.map((item) => ({ domain: new URL(item.url).hostname, jurisdiction: item.jurisdiction })),
    ...(!filters.jurisdiction ? officialCaseSearchDomains.map((domain) => ({ domain, jurisdiction: "CA" as Jurisdiction })) : [])];
  for (let round = 0; round < terms.length; round++) for (let index = 0; index < scopes.length; index++) {
    const scope = scopes[index];
    const term = terms[(round + index) % terms.length];
    queries.push([`site:${scope.domain}`, term.replace(/["\r\n]/g, " "), filters.nation,
      filters.jurisdiction ? JURISDICTIONS[scope.jurisdiction] : "", filters.year,
      filters.ongoing ? "docket hearing pending rôle audience dossier en cours" : "judgment jugement"].filter(Boolean).join(" "));
  }
  for (const name of [...LANDMARK_SEEDS, ...INDIGENOUS_TERMS]) queries.push([`"${name}"`, filters.topic, filters.nation, filters.jurisdiction ? JURISDICTIONS[filters.jurisdiction] : "Canada", filters.year, "court tribunal jugement"].filter(Boolean).join(" "));
  return circularSlice([...new Set(queries)], offset, Math.max(0, Math.min(limit, 100)));
}

// Retained template generator for compatibility/reference; nationwide discovery uses the roster above.
export function buildLegacySearchQueries(offset = 0, limit = 25, filters: SearchFilters = {}): string[] {
  const suffix = [filters.year ? String(filters.year) : "", filters.ongoing ? "filed hearing appeal pending" : ""].filter(Boolean).join(" ");
  if (filters.topic?.trim()) {
    const topic = filters.topic.trim().slice(0, 100).replace(/["\r\n]/g, " ");
    return circularSlice([
      `"${topic}" Indigenous Canada court ${suffix}`,
      `"${topic}" site:decisions.scc-csc.ca ${suffix}`,
      `"${topic}" site:decisions.fct-cf.gc.ca ${suffix}`,
      `"${topic}" site:canlii.org ${suffix}`,
      ...officialCaseSearchDomains.map((domain) => `site:${domain} "${topic}" ${suffix}`.trim()),
    ], offset, Math.max(0, Math.min(limit, 100)));
  }
  const topicTerms = [...INDIGENOUS_TERMS, ...LEGAL_TERMS].filter((term) => term.length > 4);
  const queries: string[] = [];
  for (const term of topicTerms) {
    for (const template of SEARCH_TEMPLATES) queries.push(template.replace("{term}", term));
  }
  for (const seed of LANDMARK_SEEDS) {
    queries.push(`"${seed}" related cases Indigenous law Canada`);
    queries.push(`"${seed}" cited by court Canada`);
  }
  for (const domain of officialCaseSearchDomains) {
    for (const cluster of CASE_TOPIC_CLUSTERS) queries.push(`site:${domain} "${cluster}" ${suffix}`.trim());
  }
  return circularSlice([...new Set(queries.map((query) => `${query} ${suffix}`.trim()))], offset, Math.max(0, Math.min(limit, 100)));
}
