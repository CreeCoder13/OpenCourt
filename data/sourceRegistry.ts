import type { SourceProvider } from "./types";

export const sourceProviders: SourceProvider[] = [
  {
    id: "scc-judgments",
    name: "Supreme Court of Canada judgments",
    url: "https://decisions.scc-csc.ca/scc-csc/en/d/s/index.do?cont=inside",
    authority: "Official court",
    coverage: "Appeal judgments, leave decisions, citations and reasons from Canada’s final court of appeal.",
    discoveryMethod: "Automated monitor",
    publicationRule: "A matching judgment may support verification only after an editor confirms the parties, citation and Indigenous-law connection.",
  },
  {
    id: "federal-court",
    name: "Federal Court and Federal Court of Appeal",
    url: "https://decisions.fct-cf.gc.ca/fc-cf/en/nav.do",
    authority: "Official court",
    coverage: "Published Federal Court and Federal Court of Appeal decisions, including judicial review and claims involving the Crown.",
    discoveryMethod: "Editorial search",
    publicationRule: "Use the official decision as the primary source and verify the procedural stage before publishing.",
  },
  {
    id: "canadian-courts-directory",
    name: "Justice Canada court directory",
    url: "https://laws.justice.gc.ca/eng/Court/",
    authority: "Official government",
    coverage: "Links to provincial and territorial court websites across Canada.",
    discoveryMethod: "Editorial search",
    publicationRule: "Follow the directory to the issuing court and retain the court’s own decision URL whenever available.",
  },
  {
    id: "canlii-api",
    name: "CanLII",
    url: "https://www.canlii.org/",
    authority: "Legal database",
    coverage: "Broad Canadian case-law discovery across federal, provincial and territorial databases.",
    discoveryMethod: "API-assisted",
    publicationRule: "An authorized API key may discover candidates. CanLII metadata never publishes a case automatically and official court links remain preferred.",
  },
  {
    id: "canadian-encyclopedia",
    name: "The Canadian Encyclopedia",
    url: "https://www.thecanadianencyclopedia.ca/en",
    authority: "Secondary reference",
    coverage: "Selected historical and plain-language background articles; it is not a comprehensive case-law database.",
    discoveryMethod: "Editorial search",
    publicationRule: "Link as secondary context only. Do not scrape or reproduce substantial article text, and never use it instead of the judgment.",
  },
];

export const discoveryTerms = [
  "Aboriginal right",
  "Aboriginal title",
  "section 35",
  "treaty right",
  "duty to consult",
  "honour of the Crown",
  "First Nation",
  "Métis",
  "Inuit",
  "reserve land",
  "specific claim",
  "Indigenous governance",
];
