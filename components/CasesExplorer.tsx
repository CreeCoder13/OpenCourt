"use client";

import { useMemo, useState } from "react";
import type { CaseRecord } from "../data/types";
import { CaseListCard } from "./CaseCard";

const empty = { group: "", treaty: "", region: "", court: "", year: "", topic: "", outcome: "", community: "" };
type Filters = typeof empty;
type Tab = "past" | "ongoing";

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort();
const recordDate = (item: CaseRecord) => item.decisionDate || item.filingDate || item.latestDevelopmentDate || item.updatedAt;

function searchableText(item: CaseRecord) {
  return [item.caseName, item.officialCitation, item.courtFileNumber, item.court, item.provinceTerritory, item.summaryShort, item.summaryFull,
    item.latestDevelopment, ...item.indigenousCommunities, ...item.treaties, ...item.legalTopics, ...(item.legalIssues || []), ...item.parties]
    .filter(Boolean).join(" ").toLowerCase();
}

function matchReason(item: CaseRecord, query: string) {
  const q = query.toLowerCase();
  if (item.caseName.toLowerCase().includes(q)) return "case name";
  if (item.officialCitation.toLowerCase().includes(q)) return "citation";
  if (item.indigenousCommunities.some((value) => value.toLowerCase().includes(q))) return "Indigenous party";
  if (item.treaties.some((value) => value.toLowerCase().includes(q))) return "treaty";
  if (item.legalTopics.some((value) => value.toLowerCase().includes(q))) return "legal topic";
  if ((item.legalIssues || []).some((value) => value.toLowerCase().includes(q))) return "legal issue";
  if (item.court.toLowerCase().includes(q)) return "court";
  if (item.provinceTerritory.toLowerCase().includes(q)) return "province or territory";
  return "summary or keyword";
}

export function CasesExplorer({ pastRecords, ongoingRecords, initialQuery = "", initialTab = "past" }: { pastRecords: CaseRecord[]; ongoingRecords: CaseRecord[]; initialQuery?: string; initialTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<Filters>(empty);
  const [sort, setSort] = useState("newest");
  const records = tab === "past" ? pastRecords : ongoingRecords;

  const queryCounts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const count = (items: CaseRecord[]) => !q ? items.length : items.filter((item) => q.split(/\s+/).every((part) => searchableText(item).includes(part))).length;
    return { past: count(pastRecords), ongoing: count(ongoingRecords) };
  }, [pastRecords, ongoingRecords, query]);

  const options = useMemo(() => ({
    group: unique(records.map((item) => item.indigenousGroup)), treaty: unique(records.flatMap((item) => item.treaties)),
    region: unique(records.map((item) => item.provinceTerritory)), court: unique(records.map((item) => item.court)),
    year: unique(records.map((item) => `${new Date(`${recordDate(item)}T00:00:00`).getFullYear()}`)).reverse(),
    topic: unique(records.flatMap((item) => item.legalTopics)), outcome: unique(records.map((item) => item.outcome)),
    community: unique(records.flatMap((item) => item.indigenousCommunities)),
  }), [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((item) => (!q || q.split(/\s+/).every((part) => searchableText(item).includes(part)))
      && (!filters.group || item.indigenousGroup === filters.group) && (!filters.treaty || item.treaties.includes(filters.treaty))
      && (!filters.region || item.provinceTerritory === filters.region) && (!filters.court || item.court === filters.court)
      && (!filters.year || `${new Date(`${recordDate(item)}T00:00:00`).getFullYear()}` === filters.year)
      && (!filters.topic || item.legalTopics.includes(filters.topic)) && (!filters.outcome || item.outcome === filters.outcome)
      && (!filters.community || item.indigenousCommunities.includes(filters.community)))
      .sort((a, b) => sort === "oldest" ? recordDate(a).localeCompare(recordDate(b)) : sort === "alphabetical" ? a.caseName.localeCompare(b.caseName) : sort === "significant" ? b.significance - a.significance : sort === "updated" ? b.updatedAt.localeCompare(a.updatedAt) : recordDate(b).localeCompare(recordDate(a)));
  }, [records, query, filters, sort]);

  const reset = () => { setFilters(empty); setQuery(""); };
  const switchTab = (next: Tab) => { setTab(next); setFilters(empty); };
  const active = Object.values(filters).filter(Boolean).length + (query ? 1 : 0);

  return <>
    <div className="case-tabs" role="tablist" aria-label="Case type">
      <button role="tab" aria-selected={tab === "past"} className={tab === "past" ? "active" : ""} onClick={() => switchTab("past")}><span>Past Cases</span><b>{queryCounts.past}</b></button>
      <button role="tab" aria-selected={tab === "ongoing"} className={tab === "ongoing" ? "active" : ""} onClick={() => switchTab("ongoing")}><span>Ongoing Cases</span><b>{queryCounts.ongoing}</b></button>
    </div>
    <div className="database-search case-global-search"><label className="sr-only" htmlFor="case-search">Search all cases</label><span aria-hidden="true">⌕</span><input id="case-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search case name, citation, Nation, treaty, court, issue, province or topic…" /><small>Searches both tabs</small></div>
    <div className="explorer-layout">
      <aside className="filters-panel"><div className="filter-title"><div><span>Refine {tab} cases</span>{active > 0 && <b>{active}</b>}</div><button onClick={reset}>Clear all</button></div>
        {(["community", "group", "treaty", "region", "court", "year", "topic", "outcome"] as Array<keyof Filters>).map((key) => <label className="filter-field" key={key}><span>{({ group: "Indigenous group", region: "Province / territory" } as Partial<Record<keyof Filters, string>>)[key] || key[0].toUpperCase() + key.slice(1)}</span><select value={filters[key]} onChange={(event) => setFilters((current) => ({ ...current, [key]: event.target.value }))}><option value="">All</option>{options[key].map((value) => <option key={value}>{value}</option>)}</select></label>)}
      </aside>
      <div className="results-column"><div className="results-toolbar"><p><strong>{filtered.length}</strong> {tab} case{filtered.length === 1 ? "" : "s"}{query && <> matching <b>“{query}”</b></>}</p><label>Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="significant">Most significant</option><option value="updated">Recently updated</option><option value="alphabetical">Alphabetical</option></select></label></div>
        <div className="results-list">{filtered.length ? filtered.map((item) => <CaseListCard item={item} matchReason={query ? matchReason(item, query.trim()) : undefined} key={item.id} />) : <div className="empty-state ongoing-empty"><span aria-hidden="true">◷</span><h2>{tab === "ongoing" && !ongoingRecords.length ? "No verified ongoing cases published" : "No cases match yet"}</h2><p>{tab === "ongoing" && !ongoingRecords.length ? "The tracker is ready. A matter will appear only after its court stage, latest development, and authoritative sources are verified. Hearing dates will never be estimated." : "Try removing a filter or searching a broader term."}</p>{active > 0 && <button onClick={reset}>Reset search</button>}<a href="/sources">Read the verification methodology →</a></div>}</div>
      </div>
    </div>
  </>;
}
