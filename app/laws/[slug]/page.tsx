import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, PageShell } from "../../../components/SiteChrome";
import { topics } from "../../../data/catalog";
import { caseBySlug } from "../../../data/cases";
import { lawBySlug, laws } from "../../../data/laws";

export function generateStaticParams() {
  return laws.map((law) => ({ slug: law.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const law = lawBySlug((await params).slug);
  return { title: law ? `${law.title} | OpenCourt` : "Law not found | OpenCourt", description: law?.plainLanguageSummary };
}

const formatDate = (value?: string) => value
  ? new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" })
  : "Not recorded";

export default async function LawPage({ params }: { params: Promise<{ slug: string }> }) {
  const law = lawBySlug((await params).slug);
  if (!law) notFound();
  const connectedCases = law.relatedCases.map(caseBySlug).filter(Boolean);

  return <PageShell>
    <section className="page-hero law-detail-hero">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Laws", href: "/laws" }, { label: law.shortTitle || law.title }]} />
      <div className="detail-title-row"><div><p className="kicker">Verified law record · {law.lawType}</p><h1>{law.title}</h1></div><span className="verify-badge verify-verified"><i />Verified primary</span></div>
      <p className="detail-deck">{law.plainLanguageSummary}</p>
      <dl className="profile-facts"><div><dt>Citation</dt><dd>{law.citation}</dd></div><div><dt>Jurisdiction</dt><dd>{law.jurisdiction}</dd></div><div><dt>Enacted</dt><dd>{formatDate(law.enactedDate)}</dd></div><div><dt>Current status</dt><dd>{law.currentStatus}</dd></div></dl>
    </section>

    <div className="detail-page-layout">
      <aside className="detail-sidebar"><p>On this page</p><a href="#effect">Legal effect</a><a href="#sections">Relevant sections</a><a href="#context">Historical context</a><a href="#connections">Cases &amp; treaties</a><a href="#impact">Impact &amp; verification</a><div className="info-note"><b>Use the official text</b><p>Amendments and commencement provisions can change how a law applies.</p></div></aside>
      <div className="detail-main law-detail-main">
        <section id="effect"><p className="section-number">01</p><h2>What the law does</h2><p className="lead-paragraph">{law.legalEffect}</p><a className="official-record-link" href={law.officialSourceUrl} target="_blank" rel="noreferrer">Read the official legal text ↗</a></section>
        <section id="sections"><p className="section-number">02</p><h2>Sections relevant to Indigenous peoples</h2><ul className="law-detail-list">{law.sectionsRelevantToIndigenousPeoples.map((section) => <li key={section}>{section}</li>)}</ul><h3>Communities affected</h3><div className="law-topics">{law.communitiesAffected.map((community) => <span key={community}>{community}</span>)}</div></section>
        <section id="context"><p className="section-number">03</p><h2>Historical context</h2><p>{law.historicalContext}</p>{law.majorAmendments.length > 0 && <><h3>Major amendments</h3><ul className="law-detail-list">{law.majorAmendments.map((amendment) => <li key={amendment}>{amendment}</li>)}</ul></>}</section>
        <section id="connections"><p className="section-number">04</p><h2>Related cases and treaties</h2>{connectedCases.length > 0 ? <div className="compact-case-list">{connectedCases.map((entry) => entry && <Link href={`/cases/${entry.slug}`} key={entry.slug}><span>{entry.officialCitation}</span><div><h3>{entry.caseName}</h3><p>{entry.summaryShort}</p></div><b>→</b></Link>)}</div> : <p>No reviewed case relationship is currently recorded.</p>}{law.relatedTreaties.length > 0 && <><h3>Related treaties or agreements</h3><div className="law-topics">{law.relatedTreaties.map((treaty) => <span key={treaty}>{treaty}</span>)}</div></>}</section>
        <section id="impact"><p className="section-number">05</p><h2>Impact and verification</h2><div className="law-impact-score"><strong>{law.impactScore}</strong><span>Impact score<br />out of 100</span></div><ul className="law-detail-list">{law.impactReasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><h3>Legal definitions</h3><div className="related-topic-row">{law.categories.map((category) => { const topic = topics.find((item) => item.name === category); return topic ? <Link href={`/topics/${topic.slug}`} key={category}>{category} →</Link> : <span key={category}>{category}</span>; })}</div><p className="last-verified">Last verified: <b>{law.lastVerified}</b> · {law.verified.replaceAll("_", " ")}</p></section>
      </div>
    </div>
  </PageShell>;
}
