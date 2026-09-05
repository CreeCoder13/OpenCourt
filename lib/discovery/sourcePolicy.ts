import type { AiClassification, EvidenceField, EvidenceRank, EvidenceSourceType, TrustedDomain } from "./types.ts";

const docketPattern = /(?:court[-_/ ]?files?|case[-_/ ]?(?:history|information|status)|cases-dossiers|dockets?|hearings?|calendar|registry|claims-revendications|\bcurre\b)/i;

const fieldsPresent = (ai: AiClassification, allowed: EvidenceField[]): EvidenceField[] => allowed.filter((field) => {
  const values: Partial<Record<EvidenceField, unknown>> = {
    caseName: ai.proposedTitle, court: ai.court, neutralCitation: ai.neutralCitation,
    decisionDate: ai.decisionDate, decision: ai.summary, courtFileNumber: ai.courtFileNumber,
    proceduralStage: ai.proceduralStage, caseStatus: ai.latestDevelopment,
    upcomingHearingDate: ai.upcomingHearingDate, legislation: ai.legislationCitation,
    regulatoryRecord: ai.proposedTitle, context: ai.summary,
  };
  return Boolean(values[field]);
});

export function classifyEvidenceSource(url: string, ai: AiClassification, trusted?: TrustedDomain): {
  evidenceRank: EvidenceRank;
  sourceType: EvidenceSourceType;
  verifies: EvidenceField[];
  authoritative: boolean;
} {
  const parsed = new URL(url);
  const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
  const location = `${parsed.pathname}${parsed.search}`;
  const configuredRank = trusted?.evidenceRank;
  const configuredType = trusted?.sourceType;
  const isJudicialPublisher = configuredType === "OFFICIAL_JUDGMENT" || /court|tribunal/i.test(trusted?.sourceName ?? "");
  const isDecisionDocument = /\/item\/\d+|\/doc\/|\/(?:decisions?|judgments?|jugements?|reasons?|motifs?)(?:\/|\?|$)/i.test(location)
    && !/factum|affidavit|submission|memorandum|pleading|press|summary|cause-en-bref/i.test(location);

  let evidenceRank: EvidenceRank;
  let sourceType: EvidenceSourceType;
  if ((host === "canlii.org" || host.endsWith(".canlii.org")) && /\/doc\//i.test(location) && ai.recordType === "CASE") {
    evidenceRank = 3; sourceType = "CANLII_JUDGMENT";
  } else if (host === "canlii.org" || host.endsWith(".canlii.org")) {
    evidenceRank = 7; sourceType = "COMMENTARY_NEWS";
  } else if (configuredType === "OFFICIAL_REGULATORY_RECORD" && configuredRank) {
    evidenceRank = configuredRank; sourceType = configuredType;
  } else if (docketPattern.test(location) && ai.recordType === "CASE" && isJudicialPublisher && Boolean(ai.courtFileNumber)) {
    evidenceRank = 2; sourceType = "OFFICIAL_DOCKET";
  } else if (isJudicialPublisher && isDecisionDocument && ai.recordType === "CASE") {
    evidenceRank = 1; sourceType = "OFFICIAL_JUDGMENT";
  } else if (ai.recordType === "LAW" && configuredType === "OFFICIAL_LEGISLATION") {
    evidenceRank = 4; sourceType = "OFFICIAL_LEGISLATION";
  } else if (configuredType && configuredRank) {
    evidenceRank = configuredRank; sourceType = configuredType;
  } else {
    const isIndigenousPublisher = /first nations|inuit|métis|metis|indigenous|nisga/i.test(trusted?.sourceName ?? "");
    evidenceRank = configuredRank ?? (isIndigenousPublisher ? 5 : trusted?.tier === 1 ? 6 : 7);
    sourceType = evidenceRank === 5 ? "INDIGENOUS_OFFICIAL" : evidenceRank === 6 ? "GOVERNMENT_ANNOUNCEMENT" : "COMMENTARY_NEWS";
  }

  const allowed: EvidenceField[] = sourceType === "OFFICIAL_DOCKET"
    ? ["caseName", "court", "courtFileNumber", "proceduralStage", "caseStatus", "upcomingHearingDate"]
    : sourceType === "OFFICIAL_JUDGMENT" || sourceType === "CANLII_JUDGMENT"
      ? ["caseName", "court", "neutralCitation", "decisionDate", "decision", "proceduralStage", "caseStatus"]
      : sourceType === "OFFICIAL_LEGISLATION" ? ["legislation"]
        : sourceType === "OFFICIAL_REGULATORY_RECORD" ? ["regulatoryRecord"] : ["context"];

  return { evidenceRank, sourceType, verifies: fieldsPresent(ai, allowed), authoritative: evidenceRank <= 4 };
}
