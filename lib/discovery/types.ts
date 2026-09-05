export const VERIFICATION_LEVELS = [
  "VERIFIED_PRIMARY",
  "VERIFIED_MULTIPLE",
  "PARTIALLY_VERIFIED",
  "UNVERIFIED",
] as const;

export type VerificationLevel = (typeof VERIFICATION_LEVELS)[number];
export type SourceTier = 1 | 2 | 3;
export type EvidenceRank = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type EvidenceField =
  | "caseName" | "court" | "neutralCitation" | "decisionDate" | "decision"
  | "courtFileNumber" | "proceduralStage" | "caseStatus" | "upcomingHearingDate"
  | "legislation" | "regulatoryRecord" | "context";
export type EvidenceSourceType =
  | "OFFICIAL_JUDGMENT" | "OFFICIAL_DOCKET" | "CANLII_JUDGMENT"
  | "OFFICIAL_LEGISLATION" | "OFFICIAL_REGULATORY_RECORD"
  | "INDIGENOUS_OFFICIAL" | "GOVERNMENT_ANNOUNCEMENT" | "COMMENTARY_NEWS"
  // Legacy values remain readable for already-published JSON records.
  | "JUDGMENT" | "LEGISLATION" | "TREATY" | "GOVERNMENT" | "INSTITUTIONAL" | "CONTEXT";
export type RelevanceLabel = "RELEVANT" | "POSSIBLY_RELEVANT" | "NOT_RELEVANT";
export type RecordType = "CASE" | "LAW" | "TREATY" | "POLICY" | "HISTORICAL_DEVELOPMENT";
export type ReviewStatus = "DISCOVERED" | "PROCESSING" | "MONITOR" | "REVIEW" | "PUBLISHED" | "REJECTED" | "FAILED";

export const LEGAL_CATEGORIES = [
  "Aboriginal Title", "Treaty Rights", "Duty to Consult", "Métis Rights", "Inuit Rights",
  "First Nations Rights", "Indigenous Child Welfare", "Indian Act", "Status and Citizenship",
  "Hunting and Fishing", "Natural Resources", "Land Claims", "Specific Claims", "Self-Government",
  "Indigenous Jurisdiction", "Taxation", "Residential Schools", "Discrimination", "Human Rights",
  "Constitutional Law", "Section 35", "UNDRIP", "Environment", "Resource Development",
  "Reserve Lands", "Elections and Governance", "Treaty Interpretation", "Indigenous Law",
  "Criminal Law", "Historical Case",
] as const;

export type LegalCategory = (typeof LEGAL_CATEGORIES)[number];

export interface EvidenceSource {
  url: string;
  title?: string;
  publisher?: string;
  tier: SourceTier;
  sourceType: EvidenceSourceType;
  evidenceRank?: EvidenceRank;
  verifies?: EvidenceField[];
  retrievedAt?: string;
  contentHash?: string;
  supports: string[];
  authoritative: boolean;
  fieldEvidence?: Partial<Record<EvidenceField, { value: string; quote: string; locator: string; derivedBy?: string }>>;
}

export interface ImpactAssessment {
  impactScore: number;
  impactReasons: string[];
  scoreVersion: string;
  assessedAt: string;
}

export interface CourtCaseRecord {
  decisionType?: "FINAL_JUDGMENT" | "INTERLOCUTORY" | "DECISION_UNSPECIFIED" | "DOCKET";
  proceedingType?: "TRIAL" | "APPEAL" | "TRIBUNAL" | "UNKNOWN";
  relatedProceedings?: Array<{ id?: string; citation?: string; relationship: "SAME_PROCEEDING" | "APPEAL_OF"; evidenceUrl?: string; verified: boolean }>;
  statusEvidenceDate?: string;
  id: string;
  slug: string;
  caseName: string;
  shortName?: string;
  neutralCitation?: string;
  reportedCitation?: string;
  courtFileNumber?: string;
  court: string;
  jurisdiction: string;
  decisionDate?: string;
  year?: number;
  judges: string[];
  majorityAuthor?: string;
  parties: string[];
  IndigenousNation: string[];
  IndigenousPeople: Array<"First Nations" | "Métis" | "Inuit" | "Other">;
  treaty: string[];
  provinceTerritory: string[];
  legalIssues: string[];
  categories: LegalCategory[];
  constitutionalSections: string[];
  legislationReferenced: string[];
  casesCited: string[];
  casesCiting: string[];
  decisionOutcome?: string;
  plainLanguageSummary: string;
  background?: string;
  legalQuestion?: string;
  courtDecision?: string;
  reasoning?: string;
  impact?: string;
  impactScore: number;
  impactReasons: string[];
  currentLegalStatus: string;
  caseType?: "past" | "ongoing";
  proceduralStage?: string;
  latestDevelopment?: string;
  latestDevelopmentDate?: string;
  upcomingHearingDate?: string;
  officialDecisionUrl?: string;
  canLIIUrl?: string;
  additionalSources: EvidenceSource[];
  sourceTier: SourceTier;
  verified: VerificationLevel;
  verificationSources: EvidenceSource[];
  lastVerified?: string;
  dateDiscovered: string;
}

export interface LawRecord {
  id: string;
  slug: string;
  title: string;
  shortTitle?: string;
  jurisdiction: string;
  government: string;
  lawType: "CONSTITUTION" | "ACT" | "REGULATION" | "BILL" | "AMENDMENT" | "POLICY";
  citation: string;
  enactedDate?: string;
  effectiveDate?: string;
  repealedDate?: string;
  currentStatus: string;
  sectionsRelevantToIndigenousPeoples: string[];
  communitiesAffected: string[];
  categories: LegalCategory[];
  plainLanguageSummary: string;
  historicalContext: string;
  legalEffect: string;
  majorAmendments: string[];
  relatedCases: string[];
  relatedTreaties: string[];
  officialSourceUrl: string;
  additionalSources: EvidenceSource[];
  impactScore: number;
  impactReasons: string[];
  verified: VerificationLevel;
  lastVerified?: string;
}

export interface TreatyAgreementRecord {
  id: string;
  slug: string;
  name: string;
  treatyNumber?: string;
  agreementType: string;
  date?: string;
  parties: string[];
  FirstNations: string[];
  IndigenousPeoples: string[];
  territory: string;
  provinceTerritory: string[];
  landArea?: string;
  rights: string[];
  annuities?: string;
  resourceRights: string[];
  huntingFishingRights: string[];
  governanceRights: string[];
  modernImplementation?: string;
  majorCourtCases: string[];
  legislation: string[];
  officialSource: string;
  summary: string;
  historicalContext: string;
  currentStatus: string;
  verified: VerificationLevel;
}

export interface DiscoveredDocument {
  id: string;
  url: string;
  normalizedUrl: string;
  sourceDomain: string;
  sourceTier: SourceTier;
  discoveredBy: "SEARCH" | "RSS" | "API" | "SITEMAP" | "CRAWL" | "SEED";
  searchQuery?: string;
  title?: string;
  text?: string;
  mimeType?: string;
  etag?: string;
  lastModified?: string;
  contentHash?: string;
  relevance: RelevanceLabel;
  relevanceScore: number;
  relevanceReasons: string[];
  proposedType?: RecordType;
  aiConfidence?: number;
  extracted?: Partial<CourtCaseRecord | LawRecord | TreatyAgreementRecord>;
  verification: VerificationLevel;
  verificationSources: EvidenceSource[];
  impactScore?: number;
  impactReasons: string[];
  duplicateOf?: string;
  duplicateReasons: string[];
  status: ReviewStatus;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrustedDomain {
  domain: string;
  tier: SourceTier;
  sourceName: string;
  evidenceRank?: EvidenceRank;
  sourceType?: EvidenceSourceType;
  allowed: boolean;
  crawlMethod: "API" | "RSS" | "SITEMAP" | "SEARCH" | "TARGETED" | "MANUAL";
  rateLimit: { requests: number; perSeconds: number };
  robotsStatus: "ALLOWED" | "RESTRICTED" | "DISALLOWED" | "UNKNOWN";
  lastChecked: string | null;
  notes: string;
}

export interface AiClassification {
  relevance: RelevanceLabel;
  confidence: number;
  recordType: RecordType | null;
  categories: LegalCategory[];
  proposedTitle: string | null;
  summary: string | null;
  significanceSignals: string[];
  nations: string[];
  citations: string[];
  verificationNeeded: string[];
  court: string | null;
  courtFileNumber: string | null;
  decisionDate: string | null;
  neutralCitation: string | null;
  legislationCitation: string | null;
  parties: string[];
  constitutionalSections: string[];
  legislationReferenced: string[];
  casesCited: string[];
  treatiesReferenced: string[];
  impactSignals: string[];
  proceduralStage: string | null;
  latestDevelopment: string | null;
  latestDevelopmentDate: string | null;
  upcomingHearingDate: string | null;
}
