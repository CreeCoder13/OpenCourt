import { cases } from "./cases";
import type { Community, Source, Topic } from "./types";
export { treaties, treatyBySlug } from "./treaties";

const verified = "2026-09-02";

const primaryLegislation = (id: string, title: string, url: string, supports: string[]): Source => ({
  id,
  title,
  publisher: "Department of Justice Canada",
  url,
  type: "Primary",
  verificationStatus: "Verified",
  supports,
  note: "Official consolidated legal text used to verify this plain-language definition.",
  accessedDate: verified,
});

const judgmentSource = (topicName: string, slug: string): Source => {
  const record = cases.find((item) => item.slug === slug);
  const source = record?.sources.find((item) => item.type === "Primary" && item.verificationStatus === "Verified");
  if (!record || !source) throw new Error(`Missing verified primary definition source for ${topicName}`);
  return {
    ...source,
    id: `definition-${slug}`,
    title: `${record.caseName} (${record.officialCitation})`,
    supports: [`Plain-language definition of ${topicName}`, "Controlling legal principles"],
    note: "The definition is a plain-language synthesis. Read the official reasons for the precise legal test and its limits.",
    accessedDate: verified,
  };
};

const section35Source = primaryLegislation(
  "definition-constitution-section-35",
  "Constitution Act, 1982, section 35",
  "https://laws-lois.justice.gc.ca/eng/ConstRpt/page-12.html",
  ["Text of section 35", "Aboriginal and treaty rights", "First Nations, Inuit and Métis"],
);

const topicAuthorities: Record<string, Source[]> = {
  "Aboriginal Title": [judgmentSource("Aboriginal Title", "tsilhqotin-nation-v-british-columbia-2014")],
  "Treaty Rights": [judgmentSource("Treaty Rights", "r-v-marshall-1999"), section35Source],
  "Duty to Consult": [judgmentSource("Duty to Consult", "haida-nation-v-british-columbia-2004")],
  "Aboriginal Rights": [judgmentSource("Aboriginal Rights", "r-v-van-der-peet-1996"), section35Source],
  "Indigenous Governance": [judgmentSource("Indigenous Governance", "reference-first-nations-inuit-metis-children-2024")],
  "Membership & Citizenship": [judgmentSource("Membership & Citizenship", "dickson-v-vuntut-gwitchin-first-nation-2024")],
  "Hunting & Fishing Rights": [judgmentSource("Hunting & Fishing Rights", "r-v-sparrow-1990")],
  "Land & Resources": [judgmentSource("Land & Resources", "tsilhqotin-nation-v-british-columbia-2014")],
  "Specific Claims": [primaryLegislation("definition-specific-claims-tribunal-act", "Specific Claims Tribunal Act", "https://laws-lois.justice.gc.ca/eng/acts/S-15.36/", ["Statutory basis for eligible specific claims", "Claims relating to First Nations and Crown legal obligations"])],
  "Fiduciary Duty": [judgmentSource("Fiduciary Duty", "guerin-v-the-queen-1984")],
  "Taxation": [primaryLegislation("definition-indian-act-section-87", "Indian Act, section 87", "https://laws-lois.justice.gc.ca/eng/acts/I-5/section-87.html", ["Statutory tax exemption", "Property situated on a reserve"])],
  "Child & Family Services": [judgmentSource("Child & Family Services", "reference-first-nations-inuit-metis-children-2024")],
  "Resource Development": [judgmentSource("Resource Development", "haida-nation-v-british-columbia-2004")],
  "Environmental Issues": [judgmentSource("Environmental Issues", "clyde-river-v-petroleum-geo-services-2017")],
  "Métis Rights": [judgmentSource("Métis Rights", "r-v-powley-2003"), section35Source],
  "Inuit Rights": [judgmentSource("Inuit Rights", "clyde-river-v-petroleum-geo-services-2017"), section35Source],
  "Section 35": [section35Source, judgmentSource("Section 35", "r-v-sparrow-1990")],
  "Treaty Interpretation": [judgmentSource("Treaty Interpretation", "r-v-sioui-1990")],
  "Honour of the Crown": [judgmentSource("Honour of the Crown", "haida-nation-v-british-columbia-2004")],
  "Constitutional Law": [judgmentSource("Constitutional Law", "daniels-v-canada-2016"), section35Source],
  "Elections & Governance": [judgmentSource("Elections & Governance", "dickson-v-vuntut-gwitchin-first-nation-2024")],
};

const topicDefinitions: Array<[string, string, string[]]> = [
  ["Aboriginal Title", "A collective land right recognized by Canadian law, grounded in sufficient, continuous where required, and exclusive occupation before Crown sovereignty.", ["Land & Resources", "Duty to Consult"]],
  ["Treaty Rights", "Rights protected by a historic or modern treaty. The meaning of a treaty depends on its text, history, context, and the parties’ shared understanding.", ["Hunting & Fishing Rights", "Section 35"]],
  ["Duty to Consult", "A Crown obligation, grounded in the honour of the Crown, that can arise before conduct that may adversely affect asserted or established Aboriginal or treaty rights.", ["Aboriginal Title", "Resource Development"]],
  ["Aboriginal Rights", "Practices, customs, and traditions recognized and affirmed under section 35 of the Constitution Act, 1982.", ["Section 35", "Hunting & Fishing Rights"]],
  ["Indigenous Governance", "Cases involving the authority, institutions, and decision-making of Indigenous peoples, and their interaction with Canadian law.", ["Membership & Citizenship", "Section 35"]],
  ["Membership & Citizenship", "Legal questions about belonging, registration, community membership, and citizenship. These concepts are not interchangeable.", ["Indigenous Governance", "Métis Rights"]],
  ["Hunting & Fishing Rights", "Cases about harvesting for food, social, ceremonial, commercial, or treaty-protected purposes.", ["Treaty Rights", "Aboriginal Rights"]],
  ["Land & Resources", "Disputes concerning land, water, forests, minerals, access, and resource use.", ["Aboriginal Title", "Resource Development"]],
  ["Specific Claims", "Claims generally concerning Canada’s administration of reserve land or other legal obligations to First Nations.", ["Fiduciary Duty", "Land & Resources"]],
  ["Fiduciary Duty", "Obligations that may arise where the Crown exercises discretionary control over a specific Indigenous interest.", ["Land & Resources", "Section 35"]],
  ["Taxation", "Cases about the application of federal, provincial, or local taxes and Indigenous tax powers.", ["Indigenous Governance", "Treaty Rights"]],
  ["Child & Family Services", "Cases involving jurisdiction, service delivery, equality, and the wellbeing of Indigenous children and families.", ["Indigenous Governance", "Section 35"]],
  ["Resource Development", "Legal issues created by forestry, mining, energy, infrastructure, and other projects affecting Indigenous interests.", ["Duty to Consult", "Environmental Issues"]],
  ["Environmental Issues", "Cases at the intersection of environmental decision-making, Indigenous rights, and land or water protection.", ["Resource Development", "Duty to Consult"]],
  ["Métis Rights", "Canadian court decisions specifically concerning Métis peoples, rights, identity, and jurisdiction.", ["Section 35", "Membership & Citizenship"]],
  ["Inuit Rights", "Canadian court decisions specifically concerning Inuit rights, lands, governance, and treaty relationships.", ["Treaty Rights", "Indigenous Governance"]],
  ["Section 35", "The constitutional provision that recognizes and affirms existing Aboriginal and treaty rights of the Aboriginal peoples of Canada.", ["Aboriginal Rights", "Treaty Rights"]],
  ["Treaty Interpretation", "How courts identify and apply the promises, historical context, and shared understandings reflected in historic and modern treaties.", ["Treaty Rights", "Honour of the Crown"]],
  ["Honour of the Crown", "The constitutional principle requiring the Crown to act honourably in its dealings with Indigenous peoples and in fulfilling solemn obligations.", ["Duty to Consult", "Treaty Rights"]],
  ["Constitutional Law", "Constitutional rules governing Indigenous rights, Crown authority, federalism, and the relationship between Indigenous and Canadian legal orders.", ["Section 35", "Indigenous Governance"]],
  ["Elections & Governance", "Cases involving Indigenous election systems, governing institutions, community rules, and their relationship with Canadian constitutional and statutory law.", ["Indigenous Governance", "Membership & Citizenship"]],
];

export const topics: Topic[] = topicDefinitions.map(([name, description, relatedTopics], index) => {
  const definitionSources = topicAuthorities[name] ?? [];
  const hasVerifiedPrimarySource = definitionSources.some((source) => source.type === "Primary" && source.verificationStatus === "Verified");
  if (!hasVerifiedPrimarySource) throw new Error(`Legal definition cannot be published without a verified primary source: ${name}`);
  return {
    id: `topic-${index + 1}`,
    slug: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/g, ""),
    name,
    description,
    definitionSources,
    relatedCases: cases.filter((item) => item.legalTopics.includes(name)).map((item) => item.slug),
    relatedTopics,
    verificationLevel: "Verified",
    lastVerified: verified,
  };
});

const communitySeed: Array<[string, Community["indigenousGroup"], string, string[], string?]> = [
  ["Nisga’a Nation", "First Nations", "British Columbia", [], "https://www.nisgaanation.ca/"],
  ["Musqueam Indian Band", "First Nations", "British Columbia", [], "https://www.musqueam.bc.ca/"],
  ["Stó:lō", "First Nations", "British Columbia", [], undefined],
  ["Gitxsan", "First Nations", "British Columbia", [], undefined],
  ["Wet’suwet’en", "First Nations", "British Columbia", [], undefined],
  ["Mi’kmaq", "First Nations", "Atlantic Canada", ["Peace and Friendship Treaties"], undefined],
  ["Haida Nation", "First Nations", "British Columbia", [], "https://www.haidanation.ca/"],
  ["Mikisew Cree First Nation", "First Nations", "Alberta", ["Treaty 8"], "https://mikisewcree.ca/"],
  ["Tsilhqot’in Nation", "First Nations", "British Columbia", [], "https://www.tsilhqotin.ca/"],
  ["Xeni Gwet’in First Nations Government", "First Nations", "British Columbia", [], "https://www.xenigwetin.ca/"],
  ["Congress of Aboriginal Peoples", "Métis", "Canada", [], "https://abo-peoples.org/"],
  ["Sault Ste. Marie Métis community", "Métis", "Ontario", [], undefined],
  ["Lakes Tribe of the Colville Confederated Tribes", "First Nations", "British Columbia / Washington", [], undefined],
  ["Sinixt", "First Nations", "British Columbia", [], undefined],
  ["Huron-Wendat Nation", "First Nations", "Quebec", ["Huron-British Treaty of 1760"], undefined],
  ["Treaty 8 First Nations", "First Nations", "Western Canada", ["Treaty 8"], undefined],
  ["Shawanaga First Nation", "First Nations", "Ontario", [], undefined],
  ["Eagle Lake First Nation", "First Nations", "Ontario", ["Treaty 3"], undefined],
  ["Wewaykum First Nation", "First Nations", "British Columbia", [], undefined],
  ["Wei Wai Kum First Nation", "First Nations", "British Columbia", [], undefined],
  ["Taku River Tlingit First Nation", "First Nations", "British Columbia", [], undefined],
  ["Carrier Sekani Tribal Council", "First Nations", "British Columbia", [], undefined],
  ["Manitoba Métis Federation", "Métis", "Manitoba", [], "https://www.mmf.mb.ca/"],
  ["Red River Métis", "Métis", "Manitoba", [], undefined],
  ["Inuit of Clyde River", "Inuit", "Nunavut", ["Nunavut Agreement"], undefined],
  ["Chippewas of the Thames First Nation", "First Nations", "Ontario", [], undefined],
  ["First Nation of Nacho Nyak Dun", "First Nations", "Yukon", ["Nacho Nyak Dun Final Agreement"], undefined],
  ["Tr’ondëk Hwëch’in", "First Nations", "Yukon", ["Tr’ondëk Hwëch’in Final Agreement"], undefined],
  ["Vuntut Gwitchin First Nation", "First Nations", "Yukon", ["Vuntut Gwitchin First Nation Final Agreement"], undefined],
  ["Lac Seul First Nation", "First Nations", "Ontario", ["Treaty 3"], undefined],
  ["First Nations", "First Nations", "Canada", [], undefined],
  ["Inuit", "Inuit", "Canada", [], undefined],
  ["Métis", "Métis", "Canada", [], undefined],
  ["Blood Tribe / Kainai Nation", "First Nations", "Alberta", ["Treaty 7"], undefined],
  ["Robinson-Huron Treaty Anishinaabek", "First Nations", "Ontario", ["Robinson-Huron Treaty"], undefined],
  ["Robinson-Superior Treaty Anishinaabek", "First Nations", "Ontario", ["Robinson-Superior Treaty"], undefined],
  ["Pekuakamiulnuatsh First Nation", "First Nations", "Quebec", [], undefined],
];

const slugify = (value: string) => value.toLowerCase().replace(/[’']/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/g, "");

export const communities: Community[] = communitySeed.map(([name, indigenousGroup, provinceTerritory, treaties, officialWebsite], index) => {
  const connected = cases.filter((item) => item.indigenousCommunities.includes(name));
  return {
    id: `community-${index + 1}`,
    slug: slugify(name),
    name,
    alternateNames: [],
    indigenousGroup,
    provinceTerritory,
    treaties,
    officialWebsite,
    caseSlugs: connected.map((item) => item.slug),
    legalIssues: [...new Set(connected.flatMap((item) => item.legalTopics))],
    verificationLevel: officialWebsite ? "Verified" : "Secondary Source",
    lastVerified: verified,
  };
});

export const topicBySlug = (slug: string) => topics.find((item) => item.slug === slug);
export const communityBySlug = (slug: string) => communities.find((item) => item.slug === slug);
