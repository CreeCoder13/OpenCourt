"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Treaty } from "../data/types";

const treatyTypes: Treaty["treatyType"][] = ["Numbered Treaty", "Historic Treaty", "Peace and Friendship Treaty", "Modern Treaty", "Comprehensive Land Claim", "Adhesion", "Other Agreement"];
const regions = ["Atlantic Canada", "Quebec", "Ontario", "Prairies", "British Columbia", "Yukon", "Northwest Territories", "Nunavut"];
const provinces = ["Alberta", "British Columbia", "Manitoba", "New Brunswick", "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut", "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon"];
export const treatyDateRanges = [
  { label: "Before 1763", test: (year: number) => year < 1763 },
  { label: "1763–1866", test: (year: number) => year >= 1763 && year <= 1866 },
  { label: "1867–1899", test: (year: number) => year >= 1867 && year <= 1899 },
  { label: "1900–1949", test: (year: number) => year >= 1900 && year <= 1949 },
  { label: "1950–1999", test: (year: number) => year >= 1950 && year <= 1999 },
  { label: "2000–Present", test: (year: number) => year >= 2000 },
];

const empty = { type: "", region: "", province: "", date: "" };

export function TreatyExplorer({ records }: { records: Treaty[] }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(empty);
  const [sort, setSort] = useState("date-asc");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return records.filter((item) => {
      const searchable = [item.name, item.treatyNumber ? `Treaty ${item.treatyNumber}` : "", item.description, item.overview, item.placeSigned || "", `${item.year}`, ...item.indigenousParties.map((party) => party.name), ...item.regions, ...item.provincesTerritories, ...item.legalIssues].join(" ").toLowerCase();
      const dateRange = treatyDateRanges.find((range) => range.label === filters.date);
      return (!q || searchable.includes(q) || q.split(/\s+/).every((word) => searchable.includes(word)))
        && (!filters.type || item.treatyType === filters.type)
        && (!filters.region || item.regions.includes(filters.region))
        && (!filters.province || item.provincesTerritories.includes(filters.province))
        && (!dateRange || dateRange.test(item.year));
    }).sort((a, b) => {
      if (sort === "date-desc") return b.year - a.year || a.name.localeCompare(b.name);
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "cases") return b.caseSlugs.length - a.caseSlugs.length || a.name.localeCompare(b.name);
      return a.year - b.year || a.name.localeCompare(b.name);
    });
  }, [records, query, filters, sort]);

  const active = Object.values(filters).filter(Boolean).length + (query.trim() ? 1 : 0);
  const update = (key: keyof typeof empty, value: string) => setFilters((current) => ({ ...current, [key]: value }));
  const reset = () => { setQuery(""); setFilters(empty); };

  return (
    <section className="treaty-explorer" id="treaty-database">
      <div className="treaty-search-wrap">
        <label className="sr-only" htmlFor="treaty-search">Search treaties</label>
        <span aria-hidden="true">⌕</span>
        <input id="treaty-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search treaty, Nation, community, province, year, region, legal issue…" />
        {query && <button type="button" onClick={() => setQuery("")} aria-label="Clear search">×</button>}
      </div>
      <div className="treaty-filter-bar">
        <div className="treaty-filter-heading"><span>Filter the catalogue</span>{active > 0 && <b>{active} active</b>}</div>
        <label><span>Treaty type</span><select value={filters.type} onChange={(event) => update("type", event.target.value)}><option value="">All treaty types</option>{treatyTypes.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Region</span><select value={filters.region} onChange={(event) => update("region", event.target.value)}><option value="">All regions</option>{regions.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Province or territory</span><select value={filters.province} onChange={(event) => update("province", event.target.value)}><option value="">All provinces &amp; territories</option>{provinces.map((value) => <option key={value}>{value}</option>)}</select></label>
        <label><span>Date</span><select value={filters.date} onChange={(event) => update("date", event.target.value)}><option value="">All dates</option>{treatyDateRanges.map((value) => <option key={value.label}>{value.label}</option>)}</select></label>
        <button className="treaty-reset" type="button" onClick={reset} disabled={!active}>Clear filters</button>
      </div>
      <div className="treaty-results-heading">
        <p><strong>{results.length}</strong> agreement{results.length === 1 ? "" : "s"} in this growing catalogue</p>
        <label>Sort <select value={sort} onChange={(event) => setSort(event.target.value)}><option value="date-asc">Earliest first</option><option value="date-desc">Newest first</option><option value="name">Name A–Z</option><option value="cases">Most connected cases</option></select></label>
      </div>
      {results.length ? <div className="treaty-card-grid">{results.map((item) => (
        <article className="treaty-card" key={item.id}>
          <div className="treaty-card-top"><span>{item.category}</span><b>{item.status}</b></div>
          <h2><Link href={`/treaties/${item.slug}`}>{item.name}</Link></h2>
          <dl>
            <div><dt>Signed</dt><dd>{item.dateSigned || item.year}</dd></div>
            <div><dt>Region</dt><dd>{item.regions.join(", ")}</dd></div>
            <div><dt>Type</dt><dd>{item.treatyType}</dd></div>
          </dl>
          <p className="treaty-parties"><b>Indigenous parties</b>{item.indigenousParties.slice(0, 3).map((party) => party.name).join(" · ")}{item.indigenousParties.length > 3 && " · more"}</p>
          <p>{item.description}</p>
          <div className="treaty-card-tags">{item.legalIssues.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}</div>
          <footer><span>{item.caseSlugs.length} connected court case{item.caseSlugs.length === 1 ? "" : "s"}</span><Link href={`/treaties/${item.slug}`}>Explore {item.name} <b>→</b></Link></footer>
        </article>
      ))}</div> : <div className="empty-state treaty-empty"><h2>No agreements match</h2><p>Try a broader keyword or remove a filter. The catalogue is designed to expand as records are verified.</p><button onClick={reset}>Reset catalogue</button></div>}
    </section>
  );
}
