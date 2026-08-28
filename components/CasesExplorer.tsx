"use client";

import { useMemo, useState } from "react";
import type { CaseRecord } from "../data/types";
import { CaseListCard } from "./CaseCard";

const empty = { group: "", treaty: "", region: "", court: "", year: "", topic: "", status: "", outcome: "", community: "" };
type Filters = typeof empty;

const unique = (values: string[]) => [...new Set(values.filter(Boolean))].sort();

function matchReason(item: CaseRecord, query: string) {
  const q = query.toLowerCase();
  if (item.caseName.toLowerCase().includes(q)) return "case name";
  if (item.indigenousCommunities.some((value) => value.toLowerCase().includes(q))) return "Indigenous community";
  if (item.treaties.some((value) => value.toLowerCase().includes(q))) return "treaty";
  if (item.legalTopics.some((value) => value.toLowerCase().includes(q))) return "legal topic";
  if (item.court.toLowerCase().includes(q)) return "court";
  if (item.provinceTerritory.toLowerCase().includes(q)) return "province or territory";
  if (item.parties.some((value) => value.toLowerCase().includes(q))) return "party or government";
  if (`${new Date(`${item.decisionDate}T00:00:00`).getFullYear()}` === q) return "decision year";
  return "summary or keyword";
}

export function CasesExplorer({ records, initialQuery = "" }: { records: CaseRecord[]; initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<Filters>(empty);
  const [sort, setSort] = useState("newest");

  const options = useMemo(() => ({
    group: unique(records.map((item) => item.indigenousGroup)),
    treaty: unique(records.flatMap((item) => item.treaties)),
    region: unique(records.map((item) => item.provinceTerritory)),
    court: unique(records.map((item) => item.court)),
    year: unique(records.map((item) => `${new Date(`${item.decisionDate}T00:00:00`).getFullYear()}`)).reverse(),
    topic: unique(records.flatMap((item) => item.legalTopics)),
    status: unique(records.map((item) => item.status)),
    outcome: unique(records.map((item) => item.outcome)),
    community: unique(records.flatMap((item) => item.indigenousCommunities)),
  }), [records]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const output = records.filter((item) => {
      const searchable = [item.caseName, item.officialCitation, item.court, item.provinceTerritory, item.summaryShort, item.summaryFull, ...item.indigenousCommunities, ...item.treaties, ...item.legalTopics, ...item.parties].join(" ").toLowerCase();
      return (!q || searchable.includes(q) || q.split(/\s+/).every((part) => searchable.includes(part)))
        && (!filters.group || item.indigenousGroup === filters.group)
        && (!filters.treaty || item.treaties.includes(filters.treaty))
        && (!filters.region || item.provinceTerritory === filters.region)
        && (!filters.court || item.court === filters.court)
        && (!filters.year || `${new Date(`${item.decisionDate}T00:00:00`).getFullYear()}` === filters.year)
        && (!filters.topic || item.legalTopics.includes(filters.topic))
        && (!filters.status || item.status === filters.status)
        && (!filters.outcome || item.outcome === filters.outcome)
        && (!filters.community || item.indigenousCommunities.includes(filters.community));
    });
    return output.sort((a, b) => {
      if (sort === "oldest") return a.decisionDate.localeCompare(b.decisionDate);
      if (sort === "alphabetical") return a.caseName.localeCompare(b.caseName);
      if (sort === "significant") return b.significance - a.significance;
      if (sort === "updated") return b.updatedAt.localeCompare(a.updatedAt);
      return b.decisionDate.localeCompare(a.decisionDate);
    });
  }, [records, query, filters, sort]);

  const update = (key: keyof Filters, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const active = Object.values(filters).filter(Boolean).length + (query ? 1 : 0);

  return (
    <div className="explorer-layout">
      <aside className="filters-panel">
        <div className="filter-title"><div><span>Refine results</span>{active > 0 && <b>{active}</b>}</div><button onClick={() => { setFilters(empty); setQuery(""); }}>Clear all</button></div>
        {(["community", "group", "treaty", "region", "court", "year", "topic", "status", "outcome"] as Array<keyof Filters>).map((key) => (
          <label className="filter-field" key={key}><span>{({ group: "Indigenous group", region: "Province / territory" } as Partial<Record<keyof Filters, string>>)[key] || key[0].toUpperCase() + key.slice(1)}</span><select value={filters[key]} onChange={(event) => update(key, event.target.value)}><option value="">All</option>{options[key].map((value) => <option key={value}>{value}</option>)}</select></label>
        ))}
      </aside>
      <div className="results-column">
        <div className="database-search"><label className="sr-only" htmlFor="case-search">Search cases</label><span aria-hidden="true">⌕</span><input id="case-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search cases, communities, treaties, topics, courts…" /></div>
        <div className="results-toolbar"><p><strong>{filtered.length}</strong> case{filtered.length === 1 ? "" : "s"} found{query && <> for <b>“{query}”</b></>}</p><label>Sort by <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="significant">Most significant</option><option value="updated">Recently updated</option><option value="alphabetical">Alphabetical</option></select></label></div>
        <div className="results-list">{filtered.length ? filtered.map((item) => <CaseListCard item={item} matchReason={query ? matchReason(item, query.trim()) : undefined} key={item.id} />) : <div className="empty-state"><h2>No cases match yet</h2><p>Try removing a filter or searching a broader term. The database is designed to grow as records are verified.</p><button onClick={() => { setFilters(empty); setQuery(""); }}>Reset search</button></div>}</div>
      </div>
    </div>
  );
}
