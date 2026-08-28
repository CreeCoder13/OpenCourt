export interface ImpactSignals {
  court?: string;
  createdLegalTest?: boolean;
  changedSection35?: boolean;
  recognizedTitle?: boolean;
  recognizedTreatyRight?: boolean;
  consultationObligation?: boolean;
  changedIndigenousJurisdiction?: boolean;
  struckLegislation?: boolean;
  changedCrownObligations?: boolean;
  nationalEffect?: boolean;
  historicallySignificant?: boolean;
  laterCitationCount?: number;
  causedLegislativeChange?: boolean;
}

export function assessImpact(signals: ImpactSignals): { impactScore: number; impactReasons: string[] } {
  const court = (signals.court ?? "").toLowerCase();
  let score = 8;
  const reasons: string[] = [];

  if (/supreme court of canada|\bscc\b/.test(court)) { score += 30; reasons.push("Supreme Court of Canada decision"); }
  else if (/court of appeal|\bfca\b|\b[a-z]{2,5}ca\b/.test(court)) { score += 22; reasons.push("Appellate court decision"); }
  else if (/federal court|superior court|king.?s bench|queen.?s bench|supreme court/.test(court)) { score += 15; reasons.push("Superior or Federal Court decision"); }
  else if (court) { score += 7; reasons.push("Canadian court decision"); }

  const add = (condition: boolean | undefined, points: number, reason: string) => {
    if (condition) { score += points; reasons.push(reason); }
  };
  add(signals.createdLegalTest, 13, "Established a new legal test or framework");
  add(signals.changedSection35, 12, "Changed the interpretation of section 35");
  add(signals.recognizedTitle, 13, "Recognized or materially developed Aboriginal title");
  add(signals.recognizedTreatyRight, 10, "Recognized or materially developed treaty rights");
  add(signals.consultationObligation, 10, "Established or materially changed consultation obligations");
  add(signals.changedIndigenousJurisdiction, 10, "Expanded or restricted Indigenous jurisdiction");
  add(signals.struckLegislation, 9, "Invalidated or rendered legislation inoperative");
  add(signals.changedCrownObligations, 9, "Significantly changed Crown obligations");
  add(signals.nationalEffect, 10, "Has Canada-wide legal effect");
  add(signals.historicallySignificant, 8, "Historically significant in Canadian Indigenous law");
  add(signals.causedLegislativeChange, 9, "Contributed to legislative change");

  const citations = Math.max(0, signals.laterCitationCount ?? 0);
  if (citations >= 250) { score += 14; reasons.push("Exceptionally influential in later judicial decisions"); }
  else if (citations >= 100) { score += 11; reasons.push("Extensively cited by later courts"); }
  else if (citations >= 25) { score += 7; reasons.push("Frequently cited by later courts"); }
  else if (citations >= 5) { score += 3; reasons.push("Cited by multiple later courts"); }

  return { impactScore: Math.max(0, Math.min(100, score)), impactReasons: reasons };
}
