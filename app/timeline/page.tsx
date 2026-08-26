import type { Metadata } from "next";
import { Breadcrumbs, PageShell } from "../../components/SiteChrome";
import { TimelineExplorer } from "../../components/TimelineExplorer";
import { cases } from "../../data/cases";

export const metadata: Metadata = { title: "Legal History Timeline | OpenCourt", description: "Explore the chronological development of Canadian Indigenous rights case law." };
export default function TimelinePage() { return <PageShell><section className="page-hero"><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Timeline" }]} /><div className="page-hero-grid"><div><p className="kicker">Legal history</p><h1>How the law changed over time</h1></div><p>Trace landmark decisions across Aboriginal title, treaty rights, consultation, Métis rights, governance, section 35, and more. Select any event to open its case profile.</p></div></section><section className="timeline-section"><TimelineExplorer records={cases} /></section></PageShell>; }
