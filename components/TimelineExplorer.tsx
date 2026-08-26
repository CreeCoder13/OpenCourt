"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CaseRecord } from "../data/types";

export function TimelineExplorer({ records }: { records: CaseRecord[] }) {
  const [topic, setTopic] = useState("");
  const [region, setRegion] = useState("");
  const [court, setCourt] = useState("");
  const topics = [...new Set(records.flatMap((item) => item.legalTopics))].sort();
  const regions = [...new Set(records.map((item) => item.provinceTerritory))].sort();
  const courts = [...new Set(records.map((item) => item.court))].sort();
  const visible = useMemo(() => records.filter((item) => (!topic || item.legalTopics.includes(topic)) && (!region || item.provinceTerritory === region) && (!court || item.court === court)).sort((a, b) => a.decisionDate.localeCompare(b.decisionDate)), [records, topic, region, court]);

  return <>
    <div className="timeline-filters"><label>Legal issue<select value={topic} onChange={(event) => setTopic(event.target.value)}><option value="">All issues</option>{topics.map((value) => <option key={value}>{value}</option>)}</select></label><label>Province / territory<select value={region} onChange={(event) => setRegion(event.target.value)}><option value="">All regions</option>{regions.map((value) => <option key={value}>{value}</option>)}</select></label><label>Court<select value={court} onChange={(event) => setCourt(event.target.value)}><option value="">All courts</option>{courts.map((value) => <option key={value}>{value}</option>)}</select></label><button onClick={() => { setTopic(""); setRegion(""); setCourt(""); }}>Reset</button></div>
    <div className="history-timeline">{visible.map((item) => <Link href={`/cases/${item.slug}`} className="history-event" key={item.id}><time>{new Date(`${item.decisionDate}T00:00:00`).getFullYear()}</time><span className="history-dot" /><div><span>{item.court} · {item.provinceTerritory}</span><h2>{item.caseName}</h2><p>{item.summaryShort}</p><small>{item.officialCitation} · {item.legalTopics.slice(0, 3).join(" · ")}</small></div></Link>)}</div>
  </>;
}
