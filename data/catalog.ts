import { cases } from "./cases";
import type { Community, Topic } from "./types";
export { treaties, treatyBySlug } from "./treaties";

const verified = "2026-08-26";

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
];

export const topics: Topic[] = topicDefinitions.map(([name, description, relatedTopics], index) => ({
  id: `topic-${index + 1}`,
  slug: name.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/g, ""),
  name,
  description,
  relatedCases: cases.filter((item) => item.legalTopics.includes(name)).map((item) => item.slug),
  relatedTopics,
  verificationLevel: "Verified",
  lastVerified: verified,
}));

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
