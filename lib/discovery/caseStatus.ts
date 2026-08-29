export interface CaseStatusInput {
  decisionDate?: string;
  proceduralStage?: string;
  latestDevelopment?: string;
  upcomingHearingDate?: string;
  currentLegalStatus?: string;
}

export interface CaseStatusAssessment {
  caseType?: "past" | "ongoing";
  status: "DECIDED" | "ONGOING" | "APPEAL_PENDING" | "NEEDS_REVIEW";
  reasons: string[];
}

export function classifyCaseStatus(input: CaseStatusInput): CaseStatusAssessment {
  const text = [input.proceduralStage, input.latestDevelopment, input.currentLegalStatus].filter(Boolean).join(" ").toLowerCase();
  const appeal = /under appeal|appeal pending|leave (application|sought|granted)|notice of appeal|appeal hearing/.test(text);
  if (appeal) return { caseType: "ongoing", status: "APPEAL_PENDING", reasons: ["An appeal or leave proceeding is explicitly identified"] };

  const active = Boolean(input.upcomingHearingDate) || /filed|awaiting|hearing scheduled|hearing underway|decision reserved|active proceeding|case management/.test(text);
  const final = Boolean(input.decisionDate) || /final (decision|judgment)|decision released|appeal dismissed|appeal allowed|application dismissed|application granted|settled|discontinued/.test(text);
  if (final) return { caseType: "past", status: "DECIDED", reasons: ["A final decision or disposition is identified and no appeal is confirmed"] };
  if (active) return { caseType: "ongoing", status: "ONGOING", reasons: [input.upcomingHearingDate ? "An upcoming hearing date is recorded" : "The procedural stage explicitly indicates an active matter"] };
  return { status: "NEEDS_REVIEW", reasons: ["The available source does not confirm whether the matter is active or finally decided"] };
}
