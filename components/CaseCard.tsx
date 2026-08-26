import Link from "next/link";
import type { CaseRecord } from "../data/types";
import { VerificationBadge } from "./SiteChrome";

export function OutcomeBadge({ outcome }: { outcome: CaseRecord["outcome"] }) {
  return <span className={`outcome outcome-${outcome.toLowerCase().replace(/ /g, "-")}`}>{outcome}</span>;
}

export function CaseListCard({ item, matchReason }: { item: CaseRecord; matchReason?: string }) {
  return (
    <article className="result-card">
      <div className="result-top"><div className="result-meta"><span>{new Date(`${item.decisionDate}T00:00:00`).getFullYear()}</span><span>{item.court}</span><span>{item.provinceTerritory}</span></div><VerificationBadge level={item.verificationLevel} /></div>
      <h2><Link href={`/cases/${item.slug}`}>{item.caseName}</Link></h2>
      <p className="result-citation">{item.officialCitation}</p>
      <p className="result-summary">{item.summaryShort}</p>
      <div className="result-details"><div><span className="detail-label">Community</span><span>{item.indigenousCommunities.join(", ")}</span></div><div><span className="detail-label">Topics</span><span>{item.legalTopics.slice(0, 3).join(" · ")}</span></div></div>
      {matchReason && <p className="match-reason"><b>Why it matched:</b> {matchReason}</p>}
      <div className="result-bottom"><OutcomeBadge outcome={item.outcome} /><Link className="card-link-inline" href={`/cases/${item.slug}`}>Read case summary →</Link></div>
    </article>
  );
}
