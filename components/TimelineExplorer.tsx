"use client";

import { useState } from "react";
import Link from "next/link";
import type { CaseRecord } from "../data/types";

type ViewMode = "timeline" | "development";

const eras = [
  { year: 0, end: 1981, title: "Before Section 35", description: "Indigenous rights cases reached Canadian courts before constitutional recognition in 1982." },
  { year: 1982, end: 1989, title: "1982 — Section 35", description: "Section 35 of the Constitution Act, 1982 recognized and affirmed existing Aboriginal and treaty rights.", milestone: true },
  { year: 1990, end: 2003, title: "Development of Section 35 jurisprudence", description: "Courts developed frameworks for identifying, protecting, and justifying limits on Aboriginal and treaty rights." },
  { year: 2004, end: 2013, title: "Duty to consult era", description: "Consultation and accommodation became central to Crown decisions that may affect asserted or established rights." },
  { year: 2014, end: 9999, title: "Modern Indigenous rights decisions", description: "Recent decisions continue to clarify title, jurisdiction, identity, and the reach of section 35." },
];

const streams = [
  { title: "Aboriginal Title", description: "How courts moved from recognizing title as a legal interest to declaring title over a specific area.", slugs: ["calder-v-british-columbia-1973", "delgamuukw-v-british-columbia-1997", "tsilhqotin-nation-v-british-columbia-2014"] },
  { title: "Aboriginal Rights", description: "The leading frameworks for recognizing and applying rights protected by section 35.", slugs: ["r-v-sparrow-1990", "r-v-van-der-peet-1996", "r-v-desautel-2021"] },
  { title: "Duty to Consult", description: "The modern consultation framework and its application to established treaty rights.", slugs: ["haida-nation-v-british-columbia-2004", "mikisew-cree-first-nation-v-canada-2005"] },
  { title: "Métis Rights", description: "Distinct lines of authority on section 35 rights and federal constitutional jurisdiction.", slugs: ["r-v-powley-2003", "daniels-v-canada-2016"] },
];

const slugify = (value: string) => value.toLowerCase().replace(/[’']/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const yearOf = (item: CaseRecord) => Number(item.decisionDate.slice(0, 4));
const outcomeLabel = (outcome: CaseRecord["outcome"]) => ({ "Nation Successful": "Indigenous Party Successful", "Mixed Decision": "Mixed Outcome", "Government Successful": "Government Successful", Ongoing: "Ongoing", "Appeal Pending": "Appeal Pending", Settled: "Settled" })[outcome];
const outcomeClass = (outcome: CaseRecord["outcome"]) => outcome.toLowerCase().replaceAll(" ", "-");

function CaseTimelineCard({ item, records }: { item: CaseRecord; records: CaseRecord[] }) {
  const [expanded, setExpanded] = useState(false);
  const related = item.relatedCases.map((relationship) => ({ relationship, record: records.find((record) => record.slug === relationship.caseSlug) })).filter((entry) => entry.record);

  return <article className={`timeline-card${item.landmark ? " is-landmark" : ""}`} aria-labelledby={`title-${item.id}`}>
    <div className="timeline-card-top">
      <div><p className="timeline-eyebrow">{item.court} <span aria-hidden="true">·</span> {item.provinceTerritory}</p><h2 id={`title-${item.id}`}>{item.caseName}</h2><p className="timeline-citation">{item.officialCitation}</p></div>
      <div className="timeline-badges">{item.landmark && <span className="landmark-badge">Landmark case</span>}<span className={`timeline-outcome ${outcomeClass(item.outcome)}`}>{outcomeLabel(item.outcome)}</span></div>
    </div>
    <dl className="timeline-case-facts"><div><dt>Indigenous people or organization</dt><dd>{item.indigenousCommunities.map((community, index) => <span key={community}>{index > 0 && ", "}<Link href={`/communities/${slugify(community)}`}>{community}</Link></span>)}</dd></div><div><dt>Group</dt><dd>{item.indigenousGroup}</dd></div></dl>
    <p className="timeline-summary">{item.summaryShort}</p>
    <div className="timeline-tags" aria-label="Legal topics">{item.legalTopics.map((tag) => <Link href={`/topics/${slugify(tag)}`} key={tag}>{tag}</Link>)}{item.treaties.map((treaty) => <Link className="treaty-tag" href={`/treaties/${slugify(treaty)}`} key={treaty}>{treaty}</Link>)}</div>
    <div className="timeline-actions"><Link className="timeline-primary" href={`/cases/${item.slug}`}>Explore case <span aria-hidden="true">→</span></Link><button type="button" aria-expanded={expanded} aria-controls={`details-${item.id}`} onClick={() => setExpanded((value) => !value)}>{expanded ? "Close details" : "Quick explanation"}</button><a href={item.sources[0]?.url} target="_blank" rel="noreferrer">View source <span className="sr-only">for {item.caseName}</span> ↗</a></div>
    {expanded && <div className="timeline-expansion" id={`details-${item.id}`}>
      <div className="timeline-explain-grid"><section><h3>What happened?</h3><p>{item.facts}</p></section><section><h3>What did the Court decide?</h3><p>{item.decision}</p></section><section><h3>Why does it matter?</h3><p>{item.importance}</p></section></div>
      <section className="timeline-change"><h3>What changed?</h3><div><article><span>Before</span><p>{item.beforeCase}</p></article><article><span>Decision</span><p>{item.decision}</p></article><article><span>After</span><p>{item.afterCase}</p></article></div></section>
      {related.length > 0 && <section className="timeline-relations"><h3>Verified legal connections</h3><p>These links reflect the relationship recorded in the case research, not a claim that one decision alone caused another.</p><div>{related.map(({ relationship, record }) => <Link href={`/cases/${record!.slug}`} key={`${relationship.caseSlug}-${relationship.type}`}><span>{relationship.type}</span><strong>{record!.caseName}</strong><small>{relationship.note}</small></Link>)}</div></section>}
      <footer><span>Last verified: {item.lastVerified}</span><Link href={`/cases/${item.slug}`}>View full case →</Link></footer>
    </div>}
  </article>;
}

export function TimelineExplorer({ records }: { records: CaseRecord[] }) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [topic, setTopic] = useState("");
  const [treaty, setTreaty] = useState("");
  const [court, setCourt] = useState("");
  const [region, setRegion] = useState("");
  const [period, setPeriod] = useState("");
  const [startYear, setStartYear] = useState("");
  const [endYear, setEndYear] = useState("");
  const [view, setView] = useState<ViewMode>("timeline");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const topics = [...new Set(records.flatMap((item) => item.legalTopics))].sort();
  const treaties = [...new Set(records.flatMap((item) => item.treaties))].sort();
  const regions = [...new Set(records.map((item) => item.provinceTerritory))].sort();
  const years = records.map(yearOf);
  const reset = () => { setSearch(""); setGroup(""); setTopic(""); setTreaty(""); setCourt(""); setRegion(""); setPeriod(""); setStartYear(""); setEndYear(""); };
  const activeFilters = [group, topic, treaty, court, region, period, startYear, endYear].filter(Boolean).length;

  const visible = records.filter((item) => {
    const year = yearOf(item);
    const haystack = [item.caseName, item.officialCitation, item.court, item.courtLevel, item.provinceTerritory, item.indigenousGroup, ...item.indigenousCommunities, ...item.treaties, ...item.legalTopics, item.summaryShort, item.summaryFull].join(" ").toLowerCase();
    const periodMatch = !period || (period === "before-1982" && year < 1982) || (period === "1982-1999" && year >= 1982 && year <= 1999) || (period === "2000-2009" && year >= 2000 && year <= 2009) || (period === "2010-2019" && year >= 2010 && year <= 2019) || (period === "2020-present" && year >= 2020);
    const courtMatch = !court || (court === "Supreme Court of Canada" ? item.court === court : item.courtLevel === court);
    return (!search.trim() || haystack.includes(search.toLowerCase().trim())) && (!group || item.indigenousGroup === group) && (!topic || item.legalTopics.includes(topic)) && (!treaty || item.treaties.includes(treaty)) && courtMatch && (!region || item.provinceTerritory === region) && periodMatch && (!startYear || year >= Number(startYear)) && (!endYear || year <= Number(endYear));
  }).sort((a, b) => a.decisionDate.localeCompare(b.decisionDate));

  return <>
    <section className="timeline-stats" aria-label="Timeline statistics"><div><strong>{records.length}</strong><span>Cases</span></div><div><strong>{records.filter((item) => item.landmark).length}</strong><span>Landmark cases</span></div><div><strong>{Math.min(...years)}</strong><span>Earliest case</span></div><div><strong>{Math.max(...years)}</strong><span>Latest decision</span></div><div><strong>{topics.length}</strong><span>Legal topics</span></div></section>
    <div className="timeline-tools"><div className="timeline-view-toggle" role="group" aria-label="Choose timeline view"><button className={view === "timeline" ? "active" : ""} onClick={() => setView("timeline")} aria-pressed={view === "timeline"}>Timeline</button><button className={view === "development" ? "active" : ""} onClick={() => setView("development")} aria-pressed={view === "development"}>Legal development</button></div><label className="timeline-search"><span className="sr-only">Search timeline</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search timeline" type="search" /><span aria-hidden="true">⌕</span></label><button className="timeline-mobile-filter" type="button" aria-expanded={filtersOpen} aria-controls="timeline-filter-panel" onClick={() => setFiltersOpen((value) => !value)}>Filters{activeFilters > 0 && <span>{activeFilters}</span>}</button></div>
    <div className={`timeline-filter-panel${filtersOpen ? " mobile-open" : ""}`} id="timeline-filter-panel">
      <div className="timeline-filter-heading"><div><span>Refine the research</span><strong>{visible.length} {visible.length === 1 ? "case" : "cases"} shown</strong></div>{activeFilters > 0 && <button onClick={reset}>Clear all</button>}</div>
      <label>Indigenous group<select value={group} onChange={(event) => setGroup(event.target.value)}><option value="">All groups</option><option>First Nations</option><option>Métis</option><option>Inuit</option></select></label>
      <label>Legal topic<select value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">All topics</option>{topics.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Treaty<select value={treaty} onChange={(event) => setTreaty(event.target.value)}><option value="">All verified treaty links</option>{treaties.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Court<select value={court} onChange={(event) => setCourt(event.target.value)}><option value="">All courts</option><option>Supreme Court of Canada</option><option>Federal Court</option><option>Federal Court of Appeal</option><option>Provincial Courts of Appeal</option><option>Superior Courts</option></select></label>
      <label>Province or territory<select value={region} onChange={(event) => setRegion(event.target.value)}><option value="">All regions</option>{regions.map((value) => <option key={value}>{value}</option>)}</select></label>
      <label>Time period<select value={period} onChange={(event) => setPeriod(event.target.value)}><option value="">All years</option><option value="before-1982">Before 1982</option><option value="1982-1999">1982–1999</option><option value="2000-2009">2000–2009</option><option value="2010-2019">2010–2019</option><option value="2020-present">2020–Present</option></select></label>
      <fieldset><legend>Custom year range</legend><input aria-label="Start year" inputMode="numeric" placeholder="From" value={startYear} onChange={(event) => setStartYear(event.target.value.replace(/\D/g, "").slice(0, 4))} /><span>to</span><input aria-label="End year" inputMode="numeric" placeholder="To" value={endYear} onChange={(event) => setEndYear(event.target.value.replace(/\D/g, "").slice(0, 4))} /></fieldset>
    </div>
    {view === "timeline" ? <div className="timeline-results" aria-live="polite">{visible.length === 0 ? <div className="timeline-empty"><span>0</span><h2>No cases match these filters</h2><p>Try widening the year range or clearing one of the selected fields.</p><button onClick={reset}>Clear filters</button></div> : eras.map((era) => { const eraCases = visible.filter((item) => yearOf(item) >= era.year && yearOf(item) <= era.end); if (eraCases.length === 0 && !(!search && activeFilters === 0 && era.milestone)) return null; return <section className="timeline-era" key={era.title} aria-labelledby={`era-${era.year}`}><header className={`timeline-era-marker${era.milestone ? " is-milestone" : ""}`}><span>{era.year === 0 ? "Pre-1982" : era.year}</span><div><h2 id={`era-${era.year}`}>{era.title}</h2><p>{era.description}</p></div></header><div className="timeline-era-cases">{eraCases.map((item) => <div className="timeline-row" key={item.id}><time dateTime={item.decisionDate}>{yearOf(item)}</time><span className="timeline-rail" aria-hidden="true"><i /></span><CaseTimelineCard item={item} records={records} /></div>)}</div></section>; })}</div> : <section className="legal-development" aria-live="polite"><div className="development-intro"><p className="kicker">Doctrine map</p><h2>Follow ideas, not just dates</h2><p>These editorial groupings show how legal principles developed. Arrows mean “read next,” not that one case solely caused the next.</p></div><div className="development-grid">{streams.map((stream) => { const streamCases = stream.slugs.map((slug) => visible.find((item) => item.slug === slug)).filter((item): item is CaseRecord => Boolean(item)); return <article key={stream.title}><header><span>{String(streamCases.length).padStart(2, "0")}</span><div><h3>{stream.title}</h3><p>{stream.description}</p></div></header>{streamCases.length ? <div className="development-path">{streamCases.map((item, index) => <div key={item.id}>{index > 0 && <span className="development-arrow" aria-hidden="true">↓</span>}<Link href={`/cases/${item.slug}`}><time>{yearOf(item)}</time><strong>{item.caseName}</strong><small>{item.officialCitation}</small></Link></div>)}</div> : <p className="development-no-match">No cases in this stream match the current filters.</p>}</article>; })}</div></section>}
    <section className="timeline-watch"><div><p className="kicker">Present day</p><h2>Cases to watch</h2><p>Ongoing cases are published only when their current stage and latest event can be verified from a reliable source. No active matters are currently published.</p></div><Link href="/cases-to-watch">Open the active litigation tracker →</Link></section>
  </>;
}
