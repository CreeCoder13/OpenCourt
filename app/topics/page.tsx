import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs, PageShell } from "../../components/SiteChrome";
import { topics } from "../../data/catalog";

export const metadata: Metadata = { title: "Rights & Legal Topics | OpenCourt", description: "Plain-language guides to Aboriginal title, treaty rights, consultation, section 35, Métis rights, Inuit rights, and related legal topics." };

export default function TopicsPage() { return <PageShell><section className="page-hero"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Rights & Legal Topics" }]} /><div className="page-hero-grid"><div><p className="kicker">Rights explorer</p><h1>Follow how the law developed</h1></div><p>Start with a plain-language legal topic, then move through the decisions that established, expanded, clarified, or limited it. “Indigenous law” and “Aboriginal law” are not treated as synonyms.</p></div></section><section className="catalog-section"><div className="catalog-intro"><h2>Browse 17 legal topics</h2><p>Each guide connects the doctrine to verified primary judgments.</p></div><div className="topic-catalog">{topics.map((topic, index) => <Link href={`/topics/${topic.slug}`} key={topic.id}><span>{String(index + 1).padStart(2, "0")}</span><h2>{topic.name}</h2><p>{topic.description}</p><div><small>{topic.relatedCases.length} connected case{topic.relatedCases.length === 1 ? "" : "s"}</small><b>→</b></div></Link>)}</div></section></PageShell>; }
