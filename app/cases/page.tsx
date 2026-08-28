import type { Metadata } from "next";
import { CasesExplorer } from "../../components/CasesExplorer";
import { Breadcrumbs, PageShell } from "../../components/SiteChrome";
import { cases } from "../../data/cases";

export const metadata: Metadata = {
  title: "Case Database | OpenCourt",
  description: "Search and filter Canadian court cases involving Indigenous peoples, Aboriginal and treaty rights, title, consultation, land, and governance.",
};

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const query = (await searchParams).q;
  const initialQuery = typeof query === "string" ? query : "";

  return (
    <PageShell>
      <section className="page-hero database-hero">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cases" }]} />
        <div className="page-hero-grid"><div><p className="kicker">{cases.length} primary-source verified decisions</p><h1>Canadian Indigenous<br />case law</h1></div><p>Search landmark Supreme Court decisions by case, community, treaty, region, legal doctrine, year, or keyword. Mixed outcomes are preserved rather than flattened.</p></div>
      </section>
      <section className="database-section"><CasesExplorer records={cases} initialQuery={initialQuery} /></section>
    </PageShell>
  );
}
