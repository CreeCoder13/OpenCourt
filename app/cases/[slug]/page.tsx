import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, PageShell, VerificationBadge } from "../../../components/SiteChrome";
import { OutcomeBadge } from "../../../components/CaseCard";
import { caseBySlug, cases } from "../../../data/cases";

export function generateStaticParams() { return cases.map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = caseBySlug(slug);
  if (!item) return { title: "Case not found | OpenCourt" };
  const year = new Date(`${item.decisionDate}T00:00:00`).getFullYear();
  return {
    title: `${item.caseName} (${year}) | Indigenous Case Database`,
    description: item.summaryShort,
    openGraph: { title: `${item.caseName} (${year}) | OpenCourt`, description: item.summaryShort, images: [] },
    twitter: { card: "summary", title: `${item.caseName} (${year}) | OpenCourt`, description: item.summaryShort, images: [] },
  };
}

export default async function CasePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const item = caseBySlug(slug);
  if (!item) notFound();
  const related = item.relatedCases.map((relation) => ({ relation, item: caseBySlug(relation.caseSlug) })).filter((entry) => entry.item);
  return (
    <PageShell>
      <article>
        <header className="case-hero">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cases", href: "/cases" }, { label: item.caseName }]} />
          <div className="case-hero-top"><div><p className="kicker">Supreme Court decision</p><h1>{item.caseName}</h1><p className="case-official-citation">{item.officialCitation}</p></div><div className="case-status-stack"><VerificationBadge level={item.verificationLevel} /><OutcomeBadge outcome={item.outcome} /></div></div>
          <dl className="case-facts-grid">
            <div><dt>Court</dt><dd>{item.court}</dd></div><div><dt>Decision date</dt><dd>{new Date(`${item.decisionDate}T00:00:00`).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" })}</dd></div><div><dt>Region</dt><dd>{item.provinceTerritory}</dd></div><div><dt>Case status</dt><dd>{item.status}</dd></div><div><dt>Indigenous party / community</dt><dd>{item.indigenousCommunities.join(", ")}</dd></div><div><dt>Treaty</dt><dd>{item.treaties.length ? item.treaties.join(", ") : "No treaty connection recorded"}</dd></div>
          </dl>
          <div className="topic-row">{item.legalTopics.map((topic) => <Link href={`/topics/${topic.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/g, "")}`} className="topic-pill" key={topic}>{topic}</Link>)}</div>
        </header>

        <div className="case-layout">
          <aside className="case-toc"><p>On this page</p>{[["sentence", "In one sentence"], ["overview", "Case overview"], ["arguments", "What each side argued"], ["decision", "What the Court decided"], ["matters", "Why it matters"], ["change", "Before → decision → after"], ["journey", "Case timeline"], ["related", "Related cases"], ["sources", "Sources"]].map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</aside>
          <div className="case-content">
            <section className="one-sentence" id="sentence"><span>In one sentence</span><p>{item.summaryShort}</p></section>

            <section className="content-section" id="overview"><p className="section-number">01</p><h2>Case overview</h2><p className="lead-paragraph">{item.summaryFull}</p><div className="overview-grid"><div><h3>What happened</h3><p>{item.facts}</p></div><div><h3>Who brought the case</h3><p>{item.parties[0]}</p></div><div><h3>Other parties</h3><p>{item.parties.slice(1).join(", ") || "Information not yet verified"}</p></div><div><h3>Main legal issues</h3><p>{item.legalTopics.join(", ")}</p></div></div></section>

            <section className="content-section" id="arguments"><p className="section-number">02</p><h2>What each side argued</h2><div className="argument-grid"><div className="argument-card indigenous-argument"><span>Indigenous party</span><h3>What was their legal position?</h3><p>{item.indigenousArgument}</p></div><div className="argument-card other-argument"><span>Other party</span><h3>What did the other side say?</h3><p>{item.otherPartyArgument}</p></div></div></section>

            <section className="content-section decision-section" id="decision"><p className="section-number">03</p><h2>What did the Court decide?</h2><div className="decision-callout"><OutcomeBadge outcome={item.outcome} /><p>{item.decision}</p></div><dl className="decision-details"><div><dt>Majority ruling</dt><dd>{item.decision}</dd></div><div><dt>Dissent</dt><dd>{item.outcome === "Mixed Decision" ? "The result or reasons were divided. See the official judgment for the precise alignment of judges." : "No dissent information is included in this verified summary. Check the official judgment."}</dd></div><div><dt>Remedy</dt><dd>{item.timelineEvents.at(-1)?.outcome || "Information not yet verified"}</dd></div></dl></section>

            <section className="content-section" id="matters"><p className="section-number">04</p><h2>Why this case matters</h2><p className="importance-copy">{item.importance}</p><div className="impact-tags"><span>Indigenous rights</span><span>Canadian law</span><span>Crown decision-making</span>{item.legalTopics.includes("Resource Development") && <span>Resource development</span>}</div></section>

            <section className="content-section" id="change"><p className="section-number">05</p><h2>Before → Decision → After</h2><div className="change-flow"><div><span>Before</span><p>{item.beforeCase}</p></div><div className="change-decision"><span>Decision</span><p>{item.summaryShort}</p></div><div><span>After</span><p>{item.afterCase}</p></div></div></section>

            <section className="content-section" id="journey"><p className="section-number">06</p><h2>Case timeline</h2><p className="section-intro">Only court events linked to a verified source are shown. Earlier steps will be added after their records are verified.</p><div className="legal-timeline">{item.timelineEvents.map((event) => <div className="timeline-event" key={`${event.date}-${event.citation}`}><time>{new Date(`${event.date}T00:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</time><span className="timeline-node" /><div><p>{event.court}</p><h3>{event.outcome}</h3><small>{event.citation}</small>{event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noreferrer">Open official decision ↗</a>}</div></div>)}</div></section>

            {item.importantQuotes.length > 0 && <section className="content-section"><p className="section-number">07</p><h2>Important quotes</h2>{item.importantQuotes.map((quote) => <blockquote className="judgment-quote" key={quote.text}><p>“{quote.text}”</p><footer>{quote.judge && `${quote.judge} · `}{quote.court}{quote.paragraph && ` · para ${quote.paragraph}`} · <a href={quote.sourceUrl} target="_blank" rel="noreferrer">View in judgment ↗</a></footer></blockquote>)}</section>}

            <section className="content-section" id="related"><p className="section-number">08</p><h2>Related cases</h2><div className="related-list">{related.length ? related.map(({ relation, item: linked }) => linked && <Link href={`/cases/${linked.slug}`} key={linked.slug}><span className="relation-label">{relation.type}</span><div><h3>{linked.caseName}</h3><p>{relation.note}</p></div><b>→</b></Link>) : <p>Related-case links are not yet verified.</p>}</div><p className="graph-note"><span aria-hidden="true">◌</span><b>Precedent graph ready</b> Relationships are stored by type so this record can later appear in an interactive precedent map.</p></section>

            <section className="content-section" id="sources"><p className="section-number">09</p><h2>Sources &amp; verification</h2><p className="section-intro">Primary judgments are the authority. Plain-language summaries should always be checked against the official record.</p><div className="source-list">{item.sources.map((source, index) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>{String(index + 1).padStart(2, "0")}</span><div><b>{source.title}</b><small>{source.publisher} · {source.type} source · Accessed {source.accessedDate}</small></div><strong>Open source ↗</strong></a>)}</div><p className="last-verified">Last verified: <b>{item.lastVerified}</b> · Content status: <b>{item.contentStatus}</b></p></section>

            <section className="ask-case"><div><p className="kicker">Future feature</p><h2>Ask this case</h2><p>A future assistant will answer only from verified judgments, cite paragraph numbers, link to original sources, and say when the record cannot answer.</p></div><div><button disabled>What did this case decide?</button><button disabled>Why is it important?</button><button disabled>Compare with another case</button><small>Phase 1 placeholder · Not legal advice · No AI API connected</small></div></section>
          </div>
        </div>
      </article>
    </PageShell>
  );
}
