import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs, PageShell } from "../../../components/SiteChrome";
import { topics } from "../../../data/catalog";
import { caseBySlug } from "../../../data/cases";
import { lawBySlug, laws } from "../../../data/laws";
import { casePath, lawPath } from "../../../data/navigation";

export function generateStaticParams() {
  return laws.map((law) => ({ slug: law.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const law = lawBySlug((await params).slug);
  return {
    title: law ? `${law.title} | Laws & Constitutional Texts` : "Law not found | OpenCourt",
    description: law?.plainLanguageSummary,
  };
}

const formatDate = (value?: string) => value
  ? new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" })
  : "Not publicly available";
const lawsIndexPath = "/laws";

export default async function LawPage({ params }: { params: Promise<{ slug: string }> }) {
  const law = lawBySlug((await params).slug);
  if (!law) notFound();

  const lawIndex = laws.findIndex((entry) => entry.slug === law.slug);
  const previousLaw = laws[lawIndex - 1];
  const nextLaw = laws[lawIndex + 1];
  const connectedCases = law.relatedCases.map(caseBySlug).filter((entry) => entry !== undefined);

  return <PageShell>
    <article className="law-record">
      <header className="page-hero law-detail-hero">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Laws", href: "/laws" }, { label: law.shortTitle || law.title }]} />
        <div className="detail-title-row">
          <div><p className="kicker">Verified law record · {law.lawType}</p><h1>{law.title}</h1><p className="law-citation">{law.citation}</p></div>
          <span className="verify-badge verify-verified"><i />Verified primary</span>
        </div>
        <p className="detail-deck">{law.plainLanguageSummary}</p>
        <dl className="profile-facts law-facts">
          <div><dt>Jurisdiction</dt><dd>{law.jurisdiction}</dd></div>
          <div><dt>Responsible government</dt><dd>{law.government}</dd></div>
          <div><dt>Enacted</dt><dd>{formatDate(law.enactedDate)}</dd></div>
          <div><dt>Effective</dt><dd>{formatDate(law.effectiveDate)}</dd></div>
          <div><dt>Instrument type</dt><dd>{law.lawType.toLowerCase()}</dd></div>
          <div><dt>Current status</dt><dd>{law.currentStatus}</dd></div>
        </dl>
      </header>

      <div className="detail-page-layout law-record-layout">
        <aside className="detail-sidebar">
          <p>On this page</p>
          <a href="#overview">Overview</a><a href="#provisions">Key provisions</a><a href="#scope">Who and what it affects</a><a href="#history">History and amendments</a><a href="#connections">Cases and treaties</a><a href="#importance">Why it matters</a><a href="#sources">Sources and verification</a>
          <div className="info-note"><b>Use the official text</b><p>Amendments and coming-into-force provisions can change how a law applies.</p></div>
          <a className="law-sidebar-source" href={law.officialSourceUrl} target="_blank" rel="noreferrer">Open official text ↗</a>
        </aside>

        <div className="detail-main law-detail-main">
          <section id="overview">
            <p className="section-number">01 · Plain-language overview</p><h2>What this law does</h2>
            <p className="lead-paragraph">{law.legalEffect}</p>
            <div className="law-overview-callout"><span>In practical terms</span><p>{law.plainLanguageSummary}</p></div>
            <a className="official-record-link" href={law.officialSourceUrl} target="_blank" rel="noreferrer">Read the official legal text <span aria-hidden="true">↗</span></a>
          </section>

          <section id="provisions">
            <p className="section-number">02 · Key provisions</p><h2>Sections relevant to Indigenous peoples</h2>
            <p className="law-section-intro">This is a research guide, not a complete list of the law’s provisions. Open the official consolidation before relying on any section.</p>
            <ol className="law-provision-list">{law.sectionsRelevantToIndigenousPeoples.map((section, index) => <li key={section}><span>{String(index + 1).padStart(2, "0")}</span><p>{section}</p></li>)}</ol>
          </section>

          <section id="scope">
            <p className="section-number">03 · Scope</p><h2>Who and what it affects</h2>
            <div className="law-scope-grid">
              <div><h3>People, Nations and governments</h3><ul>{law.communitiesAffected.map((community) => <li key={community}>{community}</li>)}</ul></div>
              <div><h3>Legal areas</h3><div className="law-topics">{law.categories.map((category) => <span key={category}>{category}</span>)}</div></div>
              <div><h3>Jurisdiction</h3><p>{law.jurisdiction}</p></div>
              <div><h3>Responsible government</h3><p>{law.government}</p></div>
            </div>
          </section>

          <section id="history">
            <p className="section-number">04 · Legal history</p><h2>How this law developed</h2><p>{law.historicalContext}</p>
            <div className="law-date-line">
              <div><span>Enacted</span><strong>{formatDate(law.enactedDate)}</strong></div>
              <div><span>In force</span><strong>{formatDate(law.effectiveDate)}</strong></div>
              {law.repealedDate && <div><span>Repealed</span><strong>{formatDate(law.repealedDate)}</strong></div>}
            </div>
            <h3>Current legal status</h3><p>{law.currentStatus}</p>
            <h3>Major amendments and changes</h3>
            {law.majorAmendments.length ? <ul className="law-detail-list">{law.majorAmendments.map((amendment) => <li key={amendment}>{amendment}</li>)}</ul> : <p className="law-empty-note">No major amendment summary is currently recorded. Consult the official amendment history.</p>}
          </section>

          <section id="connections">
            <p className="section-number">05 · Legal connections</p><h2>Related cases and treaties</h2>
            <h3>Court decisions</h3>
            {connectedCases.length ? <div className="compact-case-list">{connectedCases.map((entry) => <a href={casePath(entry.slug)} key={entry.slug}><span>{entry.officialCitation}</span><div><h3>{entry.caseName}</h3><p>{entry.summaryShort}</p></div><b aria-hidden="true">→</b></a>)}</div> : <p className="law-empty-note">No reviewed case relationship is currently recorded for this law.</p>}
            <h3>Treaties and agreements</h3>
            {law.relatedTreaties.length ? <div className="law-treaty-list">{law.relatedTreaties.map((treaty) => <span key={treaty}>{treaty}</span>)}</div> : <p className="law-empty-note">No direct treaty or agreement relationship is currently recorded.</p>}
          </section>

          <section id="importance">
            <p className="section-number">06 · Significance</p><h2>Why this law matters</h2>
            <div className="law-impact-panel"><div className="law-impact-score"><strong>{law.impactScore}</strong><span>Research impact score<br />out of 100</span></div><ol>{law.impactReasons.map((reason, index) => <li key={reason}><span>{String(index + 1).padStart(2, "0")}</span><p>{reason}</p></li>)}</ol></div>
            <h3>Explore the legal concepts</h3><div className="related-topic-row">{law.categories.map((category) => { const topic = topics.find((item) => item.name === category); return topic ? <a href={`/topics/${topic.slug}`} key={category}>{category} →</a> : <span key={category}>{category}</span>; })}</div>
          </section>

          <section id="sources">
            <p className="section-number">07 · Sources</p><h2>Official text and verification</h2>
            <p className="law-section-intro">The official consolidation is the authority. This guide summarizes the record in plain language and identifies the fields supported by each source.</p>
            <div className="law-source-list">{law.additionalSources.map((source, index) => <a href={source.url} target="_blank" rel="noreferrer" key={`${source.url}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{source.title || law.title}</b><small>{source.publisher || "Official source"} · {source.sourceType.replaceAll("_", " ")}</small><p>Supports: {source.supports.join(" · ")}</p></div><strong>Open source ↗</strong></a>)}</div>
            <p className="last-verified">Last verified: <b>{law.lastVerified || "Needs verification"}</b> · Status: <b>{law.verified.replaceAll("_", " ")}</b></p>
          </section>

          <nav className="law-record-pagination" aria-label="Browse law records">
            {previousLaw ? <a href={lawPath(previousLaw.slug)}><span>← Previous law</span><b>{previousLaw.shortTitle || previousLaw.title}</b></a> : <span />}
            {nextLaw ? <a href={lawPath(nextLaw.slug)}><span>Next law →</span><b>{nextLaw.shortTitle || nextLaw.title}</b></a> : <a href={lawsIndexPath}><span>Back to collection</span><b>All laws and constitutional texts</b></a>}
          </nav>
        </div>
      </div>
    </article>
  </PageShell>;
}
