export interface LegalMilestone {
  id: string;
  year: number;
  title: string;
  type: "Royal instrument" | "Constitution" | "Legislation" | "Legislative amendment";
  shortSummary: string;
  significance: string;
  source: { title: string; url: string; publisher: string };
  lastVerified: string;
}

export interface LegalPeriod {
  startYear: number;
  endYear?: number;
  label: string;
  context: string;
}

export const legalPeriods: LegalPeriod[] = [
  { startYear: 1750, endYear: 1799, label: "1750–1799", context: "Early Crown instruments and the developing treaty relationship." },
  { startYear: 1800, endYear: 1849, label: "1800–1849", context: "Colonial administration expanded, while Indigenous laws and treaty relationships continued." },
  { startYear: 1850, endYear: 1899, label: "1850–1899", context: "Confederation and federal legislation reshaped Crown administration of First Nations lands, status, and governance." },
  { startYear: 1900, endYear: 1919, label: "1900–1919", context: "The federal Indian Act system continued to expand in scope and effect." },
  { startYear: 1920, endYear: 1939, label: "1920–1939", context: "Indian Act amendments intensified state control and restricted legal and political advocacy." },
  { startYear: 1940, endYear: 1959, label: "1940–1959", context: "Post-war legislative changes altered voting rights and revised parts of the Indian Act." },
  { startYear: 1960, endYear: 1979, label: "1960–1979", context: "Federal voting restrictions ended and Indigenous rights advocacy transformed public law and policy." },
  { startYear: 1980, endYear: 1999, label: "1980–1999", context: "Constitutional recognition and major statutory reforms changed the legal landscape." },
  { startYear: 2000, endYear: 2019, label: "2000–2019", context: "New federal legislation addressed claims resolution, languages, and Indigenous institutions." },
  { startYear: 2020, label: "2020–Present", context: "Implementation and alignment with international Indigenous-rights standards continue." },
];

const lastVerified = "2026-08-26";

export const legalMilestones: LegalMilestone[] = [
  {
    id: "royal-proclamation-1763", year: 1763, title: "Royal Proclamation of 1763", type: "Royal instrument",
    shortSummary: "The proclamation set rules for Crown dealings with Indigenous lands and became a foundation for treaty-making and the Crown–Indigenous relationship.",
    significance: "Its legal and constitutional importance continues, although the scope and application of the rights it recognized have been developed and disputed over time.",
    source: { title: "Royal Proclamation", url: "https://www.canada.ca/en/news/archive/2013/10/royal-proclamation.html", publisher: "Government of Canada" }, lastVerified,
  },
  {
    id: "constitution-act-1867", year: 1867, title: "Constitution Act, 1867 — section 91(24)", type: "Constitution",
    shortSummary: "Section 91(24) assigned Parliament legislative authority over “Indians, and Lands reserved for the Indians.”",
    significance: "This division of powers remains central to federal jurisdiction and later cases concerning First Nations, Inuit, and Métis peoples.",
    source: { title: "The Constitution Acts, 1867 to 1982", url: "https://laws-lois.justice.gc.ca/eng/const/section-91.html", publisher: "Justice Laws Website" }, lastVerified,
  },
  {
    id: "indian-act-1876", year: 1876, title: "Indian Act enacted", type: "Legislation",
    shortSummary: "Parliament consolidated earlier colonial laws into the Indian Act, regulating status, reserve lands, band governance, and many parts of First Nations life.",
    significance: "The Act imposed a paternalistic and assimilationist federal system. Its basic framework, despite extensive amendments, continues to have legal effects today.",
    source: { title: "The Indian Act: 1876–1996, A Very Brief History", url: "https://central.bac-lac.canada.ca/.item?app=Library&id=prb0912-e&op=pdf", publisher: "Library of Parliament" }, lastVerified,
  },
  {
    id: "indian-act-amendment-1927", year: 1927, title: "Indian Act claims-funding restriction", type: "Legislative amendment",
    shortSummary: "An Indian Act amendment restricted fundraising and payment for pursuing First Nations land claims without federal permission.",
    significance: "The restriction impeded organized claims advocacy and remained in place until the broad 1951 revision of the Act.",
    source: { title: "The Nisga’a Final Agreement — historical background", url: "https://publications.gc.ca/Pilot/LoPBdP/EB/prb992-e.htm", publisher: "Library of Parliament" }, lastVerified,
  },
  {
    id: "inuit-vote-1950", year: 1950, title: "Federal franchise extended to Inuit", type: "Legislative amendment",
    shortSummary: "Inuit obtained the federal vote without qualification in 1950, though practical access to polling remained uneven in Arctic communities.",
    significance: "The change removed a formal barrier to federal electoral participation, but full practical access took additional time.",
    source: { title: "A History of the Vote in Canada", url: "https://www.elections.ca/content.aspx?dir=his%2Fchap3&document=index&lang=e&section=res", publisher: "Elections Canada" }, lastVerified,
  },
  {
    id: "indian-act-revision-1951", year: 1951, title: "Major revision of the Indian Act", type: "Legislative amendment",
    shortSummary: "Parliament substantially revised the Indian Act, removing some prohibitions while leaving its central status, land, and governance framework intact.",
    significance: "The revision ended the 1927 claims-funding restriction but did not dismantle the wider federal system imposed by the Act.",
    source: { title: "The Indian Act: 1876–1996, A Very Brief History", url: "https://central.bac-lac.canada.ca/.item?app=Library&id=prb0912-e&op=pdf", publisher: "Library of Parliament" }, lastVerified,
  },
  {
    id: "first-nations-vote-1960", year: 1960, title: "Unconditional federal vote for First Nations", type: "Legislative amendment",
    shortSummary: "Federal electoral law was changed so registered First Nations people could vote without giving up Indian status.",
    significance: "The change removed a discriminatory condition from federal voting law, while provincial voting histories varied.",
    source: { title: "A History of the Vote in Canada", url: "https://www.elections.ca/content.aspx?dir=his%2Fchap3&document=index&lang=e&section=res", publisher: "Elections Canada" }, lastVerified,
  },
  {
    id: "section-35-1982", year: 1982, title: "Constitution Act, 1982 — section 35", type: "Constitution",
    shortSummary: "Section 35 recognized and affirmed the existing Aboriginal and treaty rights of the Aboriginal peoples of Canada.",
    significance: "It gave constitutional status to Aboriginal and treaty rights and became the foundation for modern section 35 jurisprudence.",
    source: { title: "Constitution Act, 1982 — Part II", url: "https://laws-lois.justice.gc.ca/eng/Const/FullText.html#h-53", publisher: "Justice Laws Website" }, lastVerified,
  },
  {
    id: "bill-c31-1985", year: 1985, title: "Bill C-31 amendments to the Indian Act", type: "Legislative amendment",
    shortSummary: "The amendments removed the rule that caused First Nations women to lose status when they married men without status and enabled many affected women and children to apply for registration.",
    significance: "Bill C-31 addressed major sex discrimination in registration, although later amendments and litigation were needed to address remaining inequities.",
    source: { title: "Registration under the Indian Act — timeline", url: "https://www.canada.ca/en/auditor-general/our-work/audit-reports/report-1-registration-under-the-indian-act.html", publisher: "Office of the Auditor General of Canada" }, lastVerified,
  },
  {
    id: "first-nations-land-management-1999", year: 1999, title: "First Nations Land Management Act", type: "Legislation",
    shortSummary: "The Act gave effect to a framework allowing participating First Nations to manage reserve lands under their own land codes instead of specified Indian Act land provisions.",
    significance: "It created an opt-in route for participating communities to exercise greater authority over reserve land management.",
    source: { title: "First Nations Land Management Act", url: "https://laws-lois.justice.gc.ca/eng/acts/F-11.8/", publisher: "Justice Laws Website" }, lastVerified,
  },
  {
    id: "specific-claims-tribunal-2008", year: 2008, title: "Specific Claims Tribunal Act", type: "Legislation",
    shortSummary: "The Act established an independent tribunal to decide certain First Nations specific claims against the Crown.",
    significance: "It added an adjudicative path for eligible claims when negotiations do not resolve them.",
    source: { title: "Specific Claims Tribunal Act", url: "https://laws-lois.justice.gc.ca/eng/acts/S-15.36/FullText.html", publisher: "Justice Laws Website" }, lastVerified,
  },
  {
    id: "indigenous-languages-act-2019", year: 2019, title: "Indigenous Languages Act", type: "Legislation",
    shortSummary: "The Act created a federal framework to support the reclamation, revitalization, maintenance, and strengthening of Indigenous languages.",
    significance: "It recognized the urgency of supporting Indigenous languages and established the Office of the Commissioner of Indigenous Languages.",
    source: { title: "Indigenous Languages Act", url: "https://laws-lois.justice.gc.ca/eng/acts/i-7.85/", publisher: "Justice Laws Website" }, lastVerified,
  },
  {
    id: "undrip-act-2021", year: 2021, title: "United Nations Declaration on the Rights of Indigenous Peoples Act", type: "Legislation",
    shortSummary: "The Act affirms the Declaration as a universal international human-rights instrument with application in Canadian law.",
    significance: "It requires federal measures to make Canada’s laws consistent with the Declaration and provides for an action plan and annual reporting.",
    source: { title: "United Nations Declaration on the Rights of Indigenous Peoples Act", url: "https://laws-lois.justice.gc.ca/eng/AnnualStatutes/2021_14/", publisher: "Justice Laws Website" }, lastVerified,
  },
];
