import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageShell } from "../../components/SiteChrome";
import { topics } from "../../data/catalog";

export const metadata: Metadata = { title: "Legal Definitions | OpenCourt", description: "Plain-language definitions of Aboriginal title, treaty rights, consultation, section 35, Métis rights, Inuit rights, and related legal concepts." };

export default function TopicsPage() { return <PageShell><section className="page-hero"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Legal Definitions" }]} /><div className="page-hero-grid"><div><p className="kicker">Plain-language legal dictionary</p><h1>Legal definitions</h1></div><p>Choose a legal term for a dedicated plain-language page showing its meaning, connected judgments, chronological development, and related concepts. “Indigenous law” and “Aboriginal law” are not treated as synonyms.</p></div></section><section className="catalog-section"><div className="catalog-intro"><h2>Browse {topics.length} legal definitions</h2><p>Each definition connects the doctrine to verified primary judgments.</p></div><div className="topic-catalog">{topics.map((topic, index) => <Link href={`/topics/${topic.slug}`} key={topic.id}><span>{String(index + 1).padStart(2, "0")}</span><h2>{topic.name}</h2><p>{topic.description}</p><div><small>{topic.relatedCases.length} connected case{topic.relatedCases.length === 1 ? "" : "s"}</small><b>→</b></div></Link>)}</div></section></PageShell>; }
