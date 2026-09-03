import Link from "next/link";
import type { CaseRecord } from "../data/types";
import { casePath } from "../data/navigation";
import { VerificationBadge } from "./SiteChrome";

export function OutcomeBadge({ outcome }: { outcome: CaseRecord["outcome"] }) {
  return <span className={`outcome outcome-${outcome.toLowerCase().replace(/ /g, "-")}`}>{outcome}</span>;
}

export function CaseStatusBadge({ status }: { status: string }) {
  return <span className={`case-stage case-stage-${status.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>{status}</span>;
}

export function CaseListCard({ item, matchReason }: { item: CaseRecord; matchReason?: string }) {
  const isOngoing = item.caseType === "ongoing" || item.status !== "Decided";
  const displayDate = item.decisionDate || item.filingDate || item.latestDevelopmentDate || item.updatedAt;
  const detailHref = casePath(item.slug);
  return (
    <article className="result-card">
      <div className="result-top"><div className="result-meta"><span>{new Date(`${displayDate}T00:00:00`).getFullYear()}</span><span>{item.court}</span><span>{item.provinceTerritory}</span></div><VerificationBadge level={item.verificationLevel} /></div>
      <h2><Link href={detailHref}>{item.caseName}</Link></h2>
      <p className="result-citation">{item.officialCitation}</p>
      <p className="result-summary">{item.summaryShort}</p>
      <div className="result-details"><div><span className="detail-label">Indigenous parties</span><span>{item.indigenousCommunities.join(", ")}</span></div><div><span className="detail-label">Topics</span><span className="card-topic-list">{item.legalTopics.slice(0, 4).map((topic) => <i key={topic}>{topic}</i>)}</span></div></div>
      {matchReason && <p className="match-reason"><b>Why it matched:</b> {matchReason}</p>}
      {isOngoing && <p className="card-updated">Last Updated: <b>{item.lastVerified}</b></p>}
      <div className="result-bottom">{isOngoing ? <CaseStatusBadge status={item.currentStatus || item.status} /> : <OutcomeBadge outcome={item.outcome} />}<Link className="card-link-inline" href={detailHref} aria-label={`View ${item.caseName}`}>View Case →</Link></div>
    </article>
  );
}
