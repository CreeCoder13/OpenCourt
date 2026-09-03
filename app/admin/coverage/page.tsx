import type { Metadata } from "next";
import { PageShell, Breadcrumbs } from "../../../components/SiteChrome";
import { CoverageDashboard } from "../../../components/CoverageDashboard";
import "./coverage.css";

export const metadata: Metadata = { title: "Coverage & Discovery | OpenCourt Admin", robots: { index: false, follow: false } };

export default function CoveragePage() {
  return <PageShell><div className="coverage-page">
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Admin", href: "/admin" }, { label: "Coverage" }]} />
    <nav className="coverage-nav" aria-label="Admin navigation"><a href="/admin">Discovery review</a><a href="/admin/coverage" aria-current="page">Coverage & discovery</a></nav>
    <header className="coverage-heading"><div><p className="kicker">Restricted research workspace</p><h1>Coverage & discovery</h1><p>Inspect the collection. Find gaps. Focus the next backfill.</p></div><span className="coverage-tag">Database instrument panel</span></header>
    <CoverageDashboard />
  </div></PageShell>;
}
