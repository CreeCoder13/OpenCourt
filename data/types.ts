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
  authority: "Official court" | "Official government" | "Official legislature" | "Official Indigenous government" | "Legal database" | "Institutional source" | "Secondary reference";
  tier?: 1 | 2 | 3;
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
  treatyNumber?: number;
  dateSigned?: string;
  year: number;
  treatyType: "Numbered Treaty" | "Historic Treaty" | "Peace and Friendship Treaty" | "Modern Treaty" | "Comprehensive Land Claim" | "Adhesion" | "Other Agreement";
  category: "Historic Treaties" | "Numbered Treaties" | "Modern Treaties";
  regions: string[];
  placeSigned?: string;
  description: string;
  overview: string;
  historicalContext: string;
  provincesTerritories: string[];
  communities: string[];
  indigenousParties: Array<{ name: string; communitySlug?: string; role?: "Original signatory" | "Adhesion" | "Treaty organization" | "Party" }>;
  crownParties: string[];
  crownRepresentatives?: Array<{ name: string; role: string }>;
  status: string;
  legalIssues: string[];
  territory: {
    description: string;
    boundaryNote: string;
    centroid?: { latitude: number; longitude: number };
    boundaryData?: string;
    mapFeatureNames?: string[];
  };
  terms: Array<{ topic: string; summary: string }>;
  adhesions: Array<{ date?: string; place?: string; parties?: string[]; note: string }>;
  interpretationNote: string;
  oralUnderstandings?: Array<{ topic: string; summary: string }>;
  originalDocumentURL?: string;
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
