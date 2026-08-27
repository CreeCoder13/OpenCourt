import { legalMilestones, legalPeriods } from "../data/legalMilestones";

export function LegalHistoryTimeline() {
  return <section className="legal-history" aria-labelledby="legal-history-title">
    <header className="legal-history-intro"><div><p className="kicker">1750 to the present</p><h2 id="legal-history-title">Laws and legislation across time</h2></div><p>Choose a period to move through the timeline. Each entry is a selected legal milestone, not a complete history. Court decisions begin in the section below.</p></header>

    <nav className="period-jump" aria-label="Jump to a historical period">
      {legalPeriods.map((period) => <a href={`#period-${period.startYear}`} key={period.startYear}><strong>{period.startYear}</strong><span>{period.startYear < 1900 ? "50-year step" : "20-year step"}</span></a>)}
    </nav>

    <div className="legal-period-list">
      {legalPeriods.map((period) => {
        const milestones = legalMilestones.filter((milestone) => milestone.year >= period.startYear && (!period.endYear || milestone.year <= period.endYear));
        return <section className="legal-period" id={`period-${period.startYear}`} key={period.startYear} aria-labelledby={`period-title-${period.startYear}`}>
          <div className="legal-period-year"><span>{period.startYear}</span><i aria-hidden="true" /></div>
          <div className="legal-period-content">
            <header><div><span>{period.label}</span><h3 id={`period-title-${period.startYear}`}>{period.context}</h3></div><small>{milestones.length} verified {milestones.length === 1 ? "milestone" : "milestones"}</small></header>
            {milestones.length ? <div className="legal-milestone-grid">{milestones.map((milestone) => <details className="legal-milestone" key={milestone.id}>
              <summary><span>{milestone.year}</span><div><small>{milestone.type}</small><h4>{milestone.title}</h4><p>{milestone.shortSummary}</p></div><b aria-hidden="true">+</b></summary>
              <div className="legal-milestone-more"><h5>Why it matters</h5><p>{milestone.significance}</p><footer><a href={milestone.source.url} target="_blank" rel="noreferrer">View official source ↗</a><span>{milestone.source.publisher} · Verified {milestone.lastVerified}</span></footer></div>
            </details>)}</div> : <div className="legal-period-empty"><span>Research note</span><p>No milestone is published for this period yet. New entries will appear only after their dates, legal effect, and sources are verified.</p></div>}
          </div>
        </section>;
      })}
    </div>
  </section>;
}
