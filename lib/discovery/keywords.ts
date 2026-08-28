export const INDIGENOUS_TERMS = [
  "indigenous", "aboriginal", "first nation", "first nations", "métis", "metis", "inuit", "innu",
  "cree", "dene", "anishinaabe", "mi'kmaq", "mi’kmaq", "mi'kmaw", "mi’kmaw", "haida",
  "secwépemc", "nisga'a", "nisga’a", "tsilhqot'in", "tsilhqot’in", "gitxsan", "wet'suwet'en",
  "wet’suwet’en", "mohawk", "kanien'kehá", "kanien’kehá", "dakota", "lakota", "nakota",
  "saulteaux", "blackfoot", "band council", "reserve", "status indian", "indian act",
] as const;

export const LEGAL_TERMS = [
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

export function buildSearchQueries(offset = 0, limit = 25): string[] {
  const topicTerms = [...INDIGENOUS_TERMS, ...LEGAL_TERMS].filter((term) => term.length > 4);
  const queries: string[] = [];
  for (const term of topicTerms) {
    for (const template of SEARCH_TEMPLATES) queries.push(template.replace("{term}", term));
  }
  for (const seed of LANDMARK_SEEDS) {
    queries.push(`"${seed}" related cases Indigenous law Canada`);
    queries.push(`"${seed}" cited by court Canada`);
  }
  return [...new Set(queries)].slice(offset, offset + Math.max(0, Math.min(limit, 100)));
}
