export type VerificationLevel = "Verified" | "Secondary Source" | "Needs Verification";
export type ContentStatus = "Draft" | "Published" | "Needs Verification";
export type CaseOutcome = "Nation Successful" | "Government Successful" | "Mixed Decision" | "Ongoing" | "Appeal Pending" | "Settled";

export interface Source {
  id: string;
  title: string;
  publisher: string;
  url: string;
  type: "Primary" | "Secondary";
  category?: "Judgment" | "Official Summary" | "Case Information" | "Background Explainer" | "Treaty Source";
  verificationStatus?: VerificationLevel;
  supports?: string[];
  note?: string;
  accessedDate: string;
}

export interface SourceProvider {
  id: string;
  name: string;
  url: string;
  authority: "Official court" | "Official government" | "Legal database" | "Secondary reference";
  coverage: string;
  discoveryMethod: "Automated monitor" | "API-assisted" | "Editorial search";
  publicationRule: string;
}

export interface Quote {
  text: string;
  paragraph?: number;
  court: string;
  judge?: string;
  sourceUrl: string;
}

export interface TimelineEvent {
  date: string;
  court: string;
  citation: string;
  outcome: string;
  sourceUrl?: string;
}

export interface CaseRelationship {
  caseSlug: string;
  type: "Relied on" | "Followed" | "Distinguished" | "Expanded" | "Limited" | "Overruled" | "Applied" | "Related";
  note: string;
}

export interface CaseRecord {
  id: string;
  slug: string;
  caseName: string;
  officialCitation: string;
  neutralCitation?: string;
  court: string;
  courtLevel: string;
  provinceTerritory: string;
  decisionDate: string;
  filingDate?: string;
  status: "Decided" | "Ongoing" | "Appeal Pending" | "Settled";
  outcome: CaseOutcome;
  landmark: boolean;
  significance: number;
  summaryShort: string;
  summaryFull: string;
  facts: string;
  indigenousArgument: string;
  otherPartyArgument: string;
  decision: string;
  importance: string;
  beforeCase: string;
  afterCase: string;
  legalTopics: string[];
  treaties: string[];
  indigenousCommunities: string[];
  indigenousGroup: "First Nations" | "Métis" | "Inuit";
  parties: string[];
  judges: string[];
  importantQuotes: Quote[];
  sources: Source[];
  relatedCases: CaseRelationship[];
  timelineEvents: TimelineEvent[];
  approximateRegion?: string;
  coordinates?: { latitude: number; longitude: number };
  verificationLevel: VerificationLevel;
  contentStatus: ContentStatus;
  lastVerified: string;
  createdAt: string;
  updatedAt: string;
}

export interface Community {
  id: string;
  slug: string;
  name: string;
  alternateNames: string[];
  indigenousGroup: "First Nations" | "Métis" | "Inuit";
  provinceTerritory: string;
  treaties: string[];
  officialWebsite?: string;
  caseSlugs: string[];
  legalIssues: string[];
  verificationLevel: VerificationLevel;
  lastVerified: string;
}

export interface Treaty {
  id: string;
  slug: string;
  name: string;
  dateSigned?: string;
  description: string;
  provincesTerritories: string[];
  communities: string[];
  caseSlugs: string[];
  sources: Source[];
  verificationLevel: VerificationLevel;
  lastVerified: string;
}

export interface Topic {
  id: string;
  slug: string;
  name: string;
  description: string;
  relatedCases: string[];
  relatedTopics: string[];
  verificationLevel: VerificationLevel;
  lastVerified: string;
}
