import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Breadcrumbs, PageShell, VerificationBadge } from "../../../components/SiteChrome";
import { caseBySlug } from "../../../data/cases";
import { treaties, treatyBySlug } from "../../../data/treaties";

export function generateStaticParams() { return treaties.map((item) => ({ slug: item.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const item = treatyBySlug((await params).slug);
  if (!item) return { title: "Treaty not found | OpenCourt" };
  const title = `${item.name} | Treaties in Canada`;
  return { title, description: item.description, openGraph: { title, description: item.description, images: [] }, twitter: { title, description: item.description, images: [] } };
}

const displayDate = (value?: string) => {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return value || "See source record";
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(new Date(`${value}T00:00:00Z`));
};

export default async function TreatyPage({ params }: { params: Promise<{ slug: string }> }) {
  const item = treatyBySlug((await params).slug);
  if (!item) notFound();
  const connectedCases = item.caseSlugs.map(caseBySlug).filter((entry) => entry !== undefined);
  const sections = ["overview", "context", "parties", "territory", "terms", ...(item.adhesions.length ? ["adhesions"] : []), "law", "cases", "document", "sources"];
  return <PageShell>
    <section className="treaty-record-hero">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Treaties in Canada", href: "/treaties" }, { label: item.name }]} />
      <div className="treaty-record-title"><div><p className="kicker">{item.category} · {item.treatyType}</p><h1>{item.name}</h1><p>{item.description}</p></div><div className="treaty-record-status"><VerificationBadge level={item.verificationLevel} /><span>{item.status}</span></div></div>
      <dl className="treaty-record-facts">
        <div><dt>Signed</dt><dd>{displayDate(item.dateSigned)}</dd></div>
        <div><dt>Place</dt><dd>{item.placeSigned || "Multiple locations"}</dd></div>
        <div><dt>Province / territory</dt><dd>{item.provincesTerritories.join(", ")}</dd></div>
        <div><dt>Crown / government party</dt><dd>{item.crownParties.join("; ")}</dd></div>
        <div><dt>Indigenous parties</dt><dd>{item.indigenousParties.map((party) => party.name).join("; ")}</dd></div>
        <div><dt>Last verified</dt><dd>{displayDate(item.lastVerified)}</dd></div>
      </dl>
    </section>

    <div className="treaty-record-layout">
      <aside className="treaty-record-nav"><p>On this page</p>{sections.map((section, index) => <a href={`#${section}`} key={section}><span>{String(index + 1).padStart(2, "0")}</span>{section === "cases" ? "Court cases" : section[0].toUpperCase() + section.slice(1)}</a>)}<div><b>Interpretation matters</b><p>This record explains, but does not decide, disputed treaty meaning or territory.</p></div></aside>
      <article className="treaty-record-main">
        <section id="overview"><p className="section-number">01 · Plain-language overview</p><h2>What is {item.name}?</h2><p className="treaty-lead">{item.overview}</p><div className="interpretation-callout"><span>Why it still matters</span><p>{item.interpretationNote}</p></div></section>

        <section id="context"><p className="section-number">02 · Historical context</p><h2>What was happening at the time</h2><p>{item.historicalContext}</p><p className="context-note">Historical conditions help explain why the parties negotiated, but they do not by themselves settle the treaty’s legal meaning. Indigenous diplomatic traditions, oral histories and perspectives form part of the context.</p></section>

        <section id="parties"><p className="section-number">03 · The parties</p><h2>Who entered into the agreement</h2><div className="treaty-party-columns"><div><h3>Indigenous parties</h3>{item.indigenousParties.map((party) => party.communitySlug ? <Link href={`/communities/${party.communitySlug}`} key={party.name}><span>{party.name}</span><small>{party.role || "Party"} · Community profile →</small></Link> : <div className="treaty-party" key={party.name}><span>{party.name}</span><small>{party.role || "Party"}</small></div>)}</div><div><h3>Crown representatives</h3>{item.crownRepresentatives?.length ? item.crownRepresentatives.map((person) => <div className="treaty-party" key={person.name}><span>{person.name}</span><small>{person.role}</small></div>) : item.crownParties.map((party) => <div className="treaty-party" key={party}><span>{party}</span><small>Historically described Crown / government party</small></div>)}</div></div><p className="verification-copy">A Nation or community is linked only when the relationship has been identified in the reviewed record. This list does not infer treaty relationships from geography alone or imply that every party understood the agreement in the same way.</p></section>

        <section id="territory"><p className="section-number">04 · Treaty territory</p><h2>General geographic area</h2><div className="territory-panel"><div><span>General description</span><p>{item.territory.description}</p><dl><div><dt>Regions</dt><dd>{item.regions.join(", ")}</dd></div><div><dt>Provinces / territories</dt><dd>{item.provincesTerritories.join(", ")}</dd></div><div><dt>Boundary data</dt><dd>{item.territory.boundaryData ? "Verified geometry available" : "Not published in this record"}</dd></div></dl></div><div className="territory-map-placeholder" role="img" aria-label="Map data placeholder"><i /><span>Map-ready record</span><b>No boundary invented</b><small>Verified coordinates or legal boundary data can be added to this record later.</small></div></div><div className="boundary-note"><b>Boundary caution</b><p>{item.territory.boundaryNote}</p></div></section>

        <section id="terms"><p className="section-number">05 · Treaty promises</p><h2>What Was Promised?</h2><h3>Written Treaty Terms</h3><p>These topic summaries orient the reader to the written record. They do not replace the treaty text, amendments, implementation agreements or legal decisions.</p><div className="treaty-terms-grid">{item.terms.map((term) => <div key={term.topic}><span>{String(item.terms.indexOf(term) + 1).padStart(2, "0")}</span><h3>{term.topic}</h3><p>{term.summary}</p></div>)}</div><div className="oral-understandings"><h3>Indigenous Oral Understandings / Treaty Interpretations</h3>{item.oralUnderstandings?.length ? item.oralUnderstandings.map((entry) => <div key={entry.topic}><b>{entry.topic}</b><p>{entry.summary}</p></div>) : <p>This reviewed record does not yet summarize a Nation-specific oral account. That absence must not be read as evidence that oral promises or distinct Indigenous understandings did not exist.</p>}</div></section>

        {item.adhesions.length > 0 && <section id="adhesions"><p className="section-number">06 · Adhesions and later additions</p><h2>The record continued after the first signing</h2><div className="adhesion-list">{item.adhesions.map((adhesion, index) => <div key={`${adhesion.date}-${index}`}><time>{adhesion.date || "Later record"}</time><div>{adhesion.place && <small>{adhesion.place}</small>}<p>{adhesion.note}</p>{adhesion.parties && <span>{adhesion.parties.join(", ")}</span>}</div></div>)}</div></section>}

        <section id="law"><p className="section-number">Legal framework</p><h2>Treaty rights in Canadian law</h2><p>Section 35 of the Constitution Act, 1982 recognizes and affirms existing Aboriginal and treaty rights. Courts read treaties generously, resolve genuine ambiguities with the Indigenous signatories’ interests in mind, and consider the historical and oral context. The honour of the Crown shapes treaty implementation and consultation where Crown conduct may adversely affect treaty rights.</p><div className="treaty-law-grid"><div><b>Section 35</b><span>Constitutional recognition and affirmation</span></div><div><b>Honour of the Crown</b><span>Honourable interpretation and implementation</span></div><div><b>Consultation</b><span>May be required when Crown decisions could affect treaty rights</span></div><div><b>Other laws</b><span>NRTA provisions, the Indian Act and UNDRIP legislation may be relevant depending on the issue</span></div></div></section>

        <section id="cases"><p className="section-number">{item.adhesions.length ? "07" : "06"} · Connected court cases</p><h2>How courts connect to this treaty</h2>{connectedCases.length ? <div className="treaty-case-list">{connectedCases.map((entry) => <Link href={`/cases/${entry.slug}`} key={entry.slug}><span>{entry.officialCitation}</span><div><h3>{entry.caseName}</h3><p>{entry.summaryShort}</p><small>{entry.legalTopics.join(" · ")}</small></div><b>Read the case →</b></Link>)}</div> : <div className="empty-state compact-empty"><h3>No reviewed case connection yet</h3><p>This does not mean no court case concerns the agreement. A link appears only after the relationship is verified in the case record.</p></div>}</section>

        <section id="document"><p className="section-number">Primary document</p><h2>Read the Treaty</h2><p>Open the government treaty transcript and related primary records. The source opens in a new tab so this explanation remains available.</p><a className="read-treaty-button" href={item.originalDocumentURL || item.sources[0]?.url} target="_blank" rel="noreferrer">Open treaty text or official record ↗</a></section>

        <section id="sources"><p className="section-number">{item.adhesions.length ? "08" : "07"} · Sources and verification</p><h2>Start with the treaty record</h2><p>Primary and official sources are prioritized. Follow the links to check treaty wording, dates, parties and geographic descriptions directly.</p><div className="treaty-source-list">{item.sources.map((entry, index) => <a href={entry.url} target="_blank" rel="noreferrer" key={entry.id}><span>{String(index + 1).padStart(2, "0")}</span><div><h3>{entry.title}</h3><p>{entry.publisher} · Accessed {displayDate(entry.accessedDate)}</p><small>Supports: {entry.supports?.join(", ")}</small></div><b>Open source ↗</b></a>)}</div><div className="legal-notice treaty-legal-note"><div><span aria-hidden="true">§</span><div><h3>Legal information, not legal advice</h3><p>Use the current treaty text, legislation, implementation materials and court record for legal research or decisions.</p></div></div></div></section>
      </article>
    </div>
  </PageShell>;
}
