import type { Metadata } from "next";
import { CasesExplorer } from "../../components/CasesExplorer";
import { Breadcrumbs, PageShell } from "../../components/SiteChrome";
import { cases } from "../../data/cases";

export const metadata: Metadata = {
  title: "Case Database | OpenCourt",
  description: "Search and filter Canadian court cases involving Indigenous peoples, Aboriginal and treaty rights, title, consultation, land, and governance.",
};

export default function CasesPage() {
  return (
    <PageShell>
      <section className="page-hero database-hero">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cases" }]} />
        <div className="page-hero-grid"><div><p className="kicker">Research database</p><h1>Canadian Indigenous<br />case law</h1></div><p>Search verified records by case, community, treaty, region, court, legal topic, government, year, or keyword. Mixed outcomes are preserved rather than flattened.</p></div>
      </section>
      <section className="database-section"><CasesExplorer records={cases} /></section>
    </PageShell>
  );
}
