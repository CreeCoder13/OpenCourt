export interface CaseStatusInput {
  decisionDate?: string;
  proceduralStage?: string;
  latestDevelopment?: string;
  upcomingHearingDate?: string;
  currentLegalStatus?: string;
  sourceType?: string; retrievedAt?: string; latestDevelopmentDate?: string; decisionType?: string; now?: string;
}

export interface CaseStatusAssessment {
  caseType?: "past" | "ongoing";
  status: "DECIDED" | "ONGOING" | "APPEAL_PENDING" | "NEEDS_REVIEW";
  reasons: string[];
}

export function classifyCaseStatus(input: CaseStatusInput): CaseStatusAssessment {
  const text = [input.proceduralStage, input.latestDevelopment, input.currentLegalStatus].filter(Boolean).join(" ").toLowerCase();
  const now = Date.parse(input.now ?? new Date().toISOString());
  const age = (date?: string) => date ? now - Date.parse(date) : NaN;
  const fresh = age(input.retrievedAt) >= 0 && age(input.retrievedAt) <= 7 * 86_400_000;
  const recent = age(input.latestDevelopmentDate) >= 0 && age(input.latestDevelopmentDate) <= 30 * 86_400_000;
  const future = Boolean(input.upcomingHearingDate && Date.parse(input.upcomingHearingDate) >= now);
  const docket = input.sourceType === "OFFICIAL_DOCKET" && fresh && (recent || future);
  const appeal = docket && /under appeal|appeal pending|leave (application|sought|granted)|notice of appeal|appeal hearing|appel en cours|avis d'appel/.test(text);
  if (appeal) return { caseType: "ongoing", status: "APPEAL_PENDING", reasons: ["An appeal or leave proceeding is explicitly identified"] };

  const active = docket && (future || /awaiting|hearing scheduled|hearing underway|decision reserved|active proceeding|case management|audience fixée|en délibéré|instance en cours/.test(text));
  const final = (input.sourceType === "OFFICIAL_JUDGMENT" && input.decisionType === "FINAL_JUDGMENT" && Boolean(input.decisionDate)) || (docket && recent && /appeal dismissed|appeal allowed|settled|discontinued|dossier clos/.test(text));
  if (final) return { caseType: "past", status: "DECIDED", reasons: ["This decision/disposition is final; later appeals or present proceeding status are not established"] };
  if (active) return { caseType: "ongoing", status: "ONGOING", reasons: [input.upcomingHearingDate ? "An upcoming hearing date is recorded" : "The procedural stage explicitly indicates an active matter"] };
  return { status: "NEEDS_REVIEW", reasons: ["The available source does not confirm whether the matter is active or finally decided"] };
}
