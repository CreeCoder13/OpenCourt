import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, PageShell, VerificationBadge } from "../../../components/SiteChrome";
import { topics, topicBySlug } from "../../../data/catalog";
import { caseBySlug } from "../../../data/cases";

export function generateStaticParams() { return topics.map((item) => ({ slug: item.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> { const item = topicBySlug((await params).slug); return { title: item ? `${item.name} — Legal Definition | OpenCourt` : "Definition not found | OpenCourt", description: item?.description }; }

const displayDate = (value: string) => new Date(`${value}T00:00:00`).toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = topicBySlug((await params).slug); if (!item) notFound();
  const connected = item.relatedCases.map(caseBySlug).filter(Boolean).sort((a, b) => (a?.decisionDate || "").localeCompare(b?.decisionDate || ""));
  return <PageShell>
    <section className="page-hero topic-detail-hero">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Legal Definitions", href: "/topics" }, { label: item.name }]} />
      <div className="detail-title-row"><div><p className="kicker">Plain-language legal definition</p><h1>{item.name}</h1></div><VerificationBadge level={item.verificationLevel} /></div>
      <p className="detail-deck">{item.description}</p>
    </section>
    <div className="detail-page-layout">
      <aside className="detail-sidebar">
        <p>In this definition</p>
        <a href="#explanation">Plain-language explanation</a>
        <a href="#development">Chronological development</a>
        <a href="#cases">Important cases</a>
        <a href="#related">Related definitions</a>
        <a href="#sources">Sources &amp; verification</a>
        <div className="info-note"><b>Terminology note</b><p>This site’s primary focus is Canadian Aboriginal law. Indigenous law refers to legal orders originating from Indigenous peoples themselves.</p></div>
      </aside>
      <div className="detail-main">
        <section id="explanation">
          <p className="section-number">01</p><h2>What does {item.name.toLowerCase()} mean?</h2>
          <p className="lead-paragraph">{item.description}</p>
          <div className="verification-notice"><VerificationBadge level={item.verificationLevel} /><p>Checked against {item.definitionSources.length} authoritative primary source{item.definitionSources.length === 1 ? "" : "s"} on {displayDate(item.lastVerified)}.</p></div>
          <p>This overview is educational, not a substitute for the precise legal test, factual record, or remedy in any judgment. The meaning and application can change with context.</p>
        </section>
        <section id="development"><p className="section-number">02</p><h2>How the doctrine developed</h2>{connected.length ? <div className="doctrine-path">{connected.map((entry, index) => entry && <Link href={`/cases/${entry.slug}`} key={entry.slug}><time>{new Date(`${entry.decisionDate}T00:00:00`).getFullYear()}</time><span /><div><small>{index === 0 ? "Established / early development" : index === connected.length - 1 ? "Later clarification" : "Development"}</small><h3>{entry.caseName}</h3><p>{entry.summaryShort}</p></div></Link>)}</div> : <div className="empty-state"><h3>Verified case connections coming soon</h3><p>No seed case is connected to this definition yet. The page is ready for reviewed records.</p></div>}</section>
        <section id="cases"><p className="section-number">03</p><h2>Important cases</h2><div className="compact-case-list">{connected.map((entry) => entry && <Link href={`/cases/${entry.slug}`} key={entry.slug}><span>{entry.officialCitation}</span><div><h3>{entry.caseName}</h3><p>{entry.summaryShort}</p></div><b>→</b></Link>)}</div></section>
        <section id="related"><p className="section-number">04</p><h2>Related definitions</h2><div className="related-topic-row">{item.relatedTopics.map((name) => { const linked = topics.find((topic) => topic.name === name); return linked ? <Link href={`/topics/${linked.slug}`} key={name}>{name} →</Link> : null; })}</div></section>
        <section id="sources"><p className="section-number">05</p><h2>Sources &amp; verification</h2><p>Every published definition is checked against an official judgment or consolidated legal text. Follow these links to review the authority and the definition’s legal limits.</p><div className="source-list">{item.definitionSources.map((source, index) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>{String(index + 1).padStart(2, "0")}</span><div><div className="source-title-row"><b>{source.title}</b><em className="source-kind source-kind-primary">{source.category || "Primary source"}</em></div><small>{source.publisher} · Accessed {displayDate(source.accessedDate)}</small>{source.supports?.length ? <p>Supports: {source.supports.join(" · ")}</p> : null}{source.note ? <p className="source-note">{source.note}</p> : null}</div><strong>Open source ↗</strong></a>)}</div><p className="last-verified">Definition last verified: <b>{displayDate(item.lastVerified)}</b></p></section>
        <section><p className="section-number">06</p><h2>Ongoing cases</h2><p>No ongoing litigation is published for this definition. Future entries will require a source and last-verified date.</p></section>
      </div>
    </div>
  </PageShell>;
}
