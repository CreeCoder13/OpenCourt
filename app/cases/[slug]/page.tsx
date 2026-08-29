import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, PageShell, VerificationBadge } from "../../../components/SiteChrome";
import { CaseStatusBadge, OutcomeBadge } from "../../../components/CaseCard";
import { allCases, caseByAnySlug } from "../../../data/cases";

export function generateStaticParams() { return allCases.map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const item = caseByAnySlug(slug);
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
  const item = caseByAnySlug(slug);
  if (!item) notFound();
  const isOngoing = item.caseType === "ongoing" || item.status !== "Decided";
  const related = item.relatedCases.map((relation) => ({ relation, item: caseByAnySlug(relation.caseSlug) })).filter((entry) => entry.item);
  return (
    <PageShell>
      <article>
        <header className="case-hero">
          <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cases", href: "/cases" }, { label: item.caseName }]} />
          <div className="case-hero-top"><div><p className="kicker">{isOngoing ? "Ongoing court proceeding" : "Court decision"}</p><h1>{item.caseName}</h1><p className="case-official-citation">{item.officialCitation || item.courtFileNumber || "Citation not publicly available"}</p></div><div className="case-status-stack"><VerificationBadge level={item.verificationLevel} />{isOngoing ? <CaseStatusBadge status={item.currentStatus || item.status} /> : <OutcomeBadge outcome={item.outcome} />}</div></div>
          <dl className="case-facts-grid">
            <div><dt>Court</dt><dd>{item.court}</dd></div><div><dt>{isOngoing ? "Filed" : "Decision date"}</dt><dd>{new Date(`${isOngoing ? item.filingDate || item.decisionDate : item.decisionDate}T00:00:00`).toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" })}</dd></div><div><dt>Location</dt><dd>{item.provinceTerritory}</dd></div><div><dt>Case status</dt><dd>{item.currentStatus || item.status}</dd></div><div><dt>Indigenous parties</dt><dd>{item.indigenousCommunities.join(", ")}</dd></div><div><dt>Other parties</dt><dd>{item.parties.slice(1).join(", ") || "Not publicly available"}</dd></div>
          </dl>
          <div className="topic-row">{item.legalTopics.map((topic) => <Link href={`/topics/${topic.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/-$/g, "")}`} className="topic-pill" key={topic}>{topic}</Link>)}</div>
        </header>

        <div className="case-layout">
          <aside className="case-toc"><p>On this page</p>{[["sentence", "Plain-language summary"], ["overview", "Case overview"], ["issues", "Legal issues & laws"], ["arguments", "What each side argued"], ["decision", isOngoing ? "Current status" : "Decision / outcome"], ["matters", "Why it matters"], ["change", "Before → decision → after"], ["journey", "Case timeline"], ["related", "Related cases"], ["documents", "Documents"], ["sources", "Sources"]].map(([id, label]) => <a href={`#${id}`} key={id}>{label}</a>)}</aside>
          <div className="case-content">
            <section className="one-sentence" id="sentence"><span>In one sentence</span><p>{item.summaryShort}</p></section>

            <section className="content-section" id="overview"><p className="section-number">01</p><h2>Case overview</h2><p className="lead-paragraph">{item.summaryFull}</p><div className="overview-grid"><div><h3>What happened</h3><p>{item.facts}</p></div><div><h3>Who brought the case</h3><p>{item.parties[0]}</p></div><div><h3>Other parties</h3><p>{item.parties.slice(1).join(", ") || "Information not yet verified"}</p></div><div><h3>Main legal issues</h3><p>{item.legalTopics.join(", ")}</p></div></div></section>

            <section className="content-section" id="issues"><p className="section-number">02</p><h2>Legal issues &amp; laws involved</h2><div className="legal-issue-grid"><div><h3>Questions before the court</h3><ul>{(item.legalIssues?.length ? item.legalIssues : item.legalTopics).map((issue) => <li key={issue}>{issue}</li>)}</ul></div><div><h3>Laws and rights involved</h3>{item.lawsInvolved?.length ? <ul>{item.lawsInvolved.map((law) => <li key={law}>{law}</li>)}</ul> : <p>Specific legislation and constitutional provisions have not yet been separately verified for this record. Consult the official judgment below.</p>}</div></div></section>

            <section className="content-section" id="arguments"><p className="section-number">02</p><h2>What each side argued</h2><div className="argument-grid"><div className="argument-card indigenous-argument"><span>Indigenous party</span><h3>What was their legal position?</h3><p>{item.indigenousArgument}</p></div><div className="argument-card other-argument"><span>Other party</span><h3>What did the other side say?</h3><p>{item.otherPartyArgument}</p></div></div></section>

            <section className="content-section decision-section" id="decision"><p className="section-number">04</p><h2>{isOngoing ? "Current status" : "Decision / outcome"}</h2><div className="decision-callout">{isOngoing ? <CaseStatusBadge status={item.currentStatus || item.status} /> : <OutcomeBadge outcome={item.outcome} />}<p>{isOngoing ? item.latestDevelopment || "The latest development is not publicly available." : item.decision}</p>{isOngoing && <small className="prominent-updated">Last Updated: {item.lastVerified}</small>}</div>{!isOngoing && <dl className="decision-details"><div><dt>Court ruling</dt><dd>{item.decision}</dd></div><div><dt>Dissent</dt><dd>{item.outcome === "Mixed Decision" ? "The result or reasons were divided. See the official judgment for the precise alignment of judges." : "No dissent information is included in this verified summary. Check the official judgment."}</dd></div><div><dt>Orders or remedy</dt><dd>{item.timelineEvents.at(-1)?.outcome || "Needs verification"}</dd></div></dl>}</section>

            <section className="content-section" id="matters"><p className="section-number">04</p><h2>Why this case matters</h2><p className="importance-copy">{item.importance}</p><div className="impact-tags"><span>Indigenous rights</span><span>Canadian law</span><span>Crown decision-making</span>{item.legalTopics.includes("Resource Development") && <span>Resource development</span>}</div></section>

            <section className="content-section" id="change"><p className="section-number">05</p><h2>Before → Decision → After</h2><div className="change-flow"><div><span>Before</span><p>{item.beforeCase}</p></div><div className="change-decision"><span>Decision</span><p>{item.summaryShort}</p></div><div><span>After</span><p>{item.afterCase}</p></div></div></section>

            <section className="content-section" id="journey"><p className="section-number">06</p><h2>Case timeline</h2><p className="section-intro">Only court events linked to a verified source are shown. Earlier steps will be added after their records are verified.</p><div className="legal-timeline">{item.timelineEvents.map((event) => <div className="timeline-event" key={`${event.date}-${event.citation}`}><time>{new Date(`${event.date}T00:00:00`).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</time><span className="timeline-node" /><div><p>{event.court}</p><h3>{event.outcome}</h3><small>{event.citation}</small>{event.sourceUrl && <a href={event.sourceUrl} target="_blank" rel="noreferrer">Open official decision ↗</a>}</div></div>)}</div></section>

            {item.importantQuotes.length > 0 && <section className="content-section"><p className="section-number">07</p><h2>Important quotes</h2>{item.importantQuotes.map((quote) => <blockquote className="judgment-quote" key={quote.text}><p>“{quote.text}”</p><footer>{quote.judge && `${quote.judge} · `}{quote.court}{quote.paragraph && ` · para ${quote.paragraph}`} · <a href={quote.sourceUrl} target="_blank" rel="noreferrer">View in judgment ↗</a></footer></blockquote>)}</section>}

            <section className="content-section" id="related"><p className="section-number">08</p><h2>Related cases</h2><div className="related-list">{related.length ? related.map(({ relation, item: linked }) => linked && <Link href={`/cases/${linked.slug}`} key={linked.slug}><span className="relation-label">{relation.type}</span><div><h3>{linked.caseName}</h3><p>{relation.note}</p></div><b>→</b></Link>) : <p>Related-case links are not yet verified.</p>}</div><p className="graph-note"><span aria-hidden="true">◌</span><b>Precedent graph ready</b> Relationships are stored by type so this record can later appear in an interactive precedent map.</p></section>

            <section className="content-section" id="documents"><p className="section-number">09</p><h2>Documents</h2><div className="document-list">{item.documents?.length ? item.documents.map((document) => <a href={document.url} target="_blank" rel="noreferrer" key={document.id}><span>{document.documentType}</span><b>{document.title}</b><small>{document.sourceName}{document.date ? ` · ${document.date}` : ""}</small><strong>Open ↗</strong></a>) : item.sources.filter((source) => source.category === "Judgment").map((source) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>Judgment</span><b>{source.title}</b><small>{source.publisher}</small><strong>Open ↗</strong></a>)}</div></section>

            <section className="content-section" id="sources"><p className="section-number">09</p><h2>Sources &amp; verification</h2><p className="section-intro">Primary judgments are the legal authority. Official summaries and secondary explainers are clearly labelled and never replace the Court’s reasons.</p><div className="source-list">{item.sources.map((source, index) => <a href={source.url} target="_blank" rel="noreferrer" key={source.id}><span>{String(index + 1).padStart(2, "0")}</span><div><div className="source-title-row"><b>{source.title}</b><em className={`source-kind source-kind-${source.type.toLowerCase()}`}>{source.category || `${source.type} source`}</em></div><small>{source.publisher} · {source.type} source · Accessed {source.accessedDate}</small>{source.supports?.length ? <p>Supports: {source.supports.join(" · ")}</p> : null}{source.note ? <p className="source-note">{source.note}</p> : null}</div><strong>Open source ↗</strong></a>)}</div><p className="last-verified">Last verified: <b>{item.lastVerified}</b> · Content status: <b>{item.contentStatus}</b></p></section>

            <section className="ask-case"><div><p className="kicker">Future feature</p><h2>Ask this case</h2><p>A future assistant will answer only from verified judgments, cite paragraph numbers, link to original sources, and say when the record cannot answer.</p></div><div><button disabled>What did this case decide?</button><button disabled>Why is it important?</button><button disabled>Compare with another case</button><small>Phase 1 placeholder · Not legal advice · No AI API connected</small></div></section>
          </div>
        </div>
      </article>
    </PageShell>
  );
}
