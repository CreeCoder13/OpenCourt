import type { Metadata } from "next";
import { CasesExplorer } from "../../components/CasesExplorer";
import { Breadcrumbs, PageShell } from "../../components/SiteChrome";
import { cases, ongoingCases } from "../../data/cases";

export const metadata: Metadata = {
  title: "Case Database | OpenCourt",
  description: "Search and filter Canadian court cases involving Indigenous peoples, Aboriginal and treaty rights, title, consultation, land, and governance.",
};

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[]; tab?: string | string[] }>;
}) {
  const resolved = await searchParams;
  const query = resolved.q;
  const initialQuery = typeof query === "string" ? query : "";
  const initialTab = resolved.tab === "ongoing" ? "ongoing" : "past";

  return (
    <PageShell>
      <section className="page-hero database-hero">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Cases" }]} />
        <div className="page-hero-grid"><div><p className="kicker">Cases</p><h1>Indigenous case law,<br />made understandable</h1></div><p>Find important Canadian decisions and track verified ongoing litigation by Nation, treaty, court, province, legal issue, citation, or topic.</p></div>
      </section>
      <section className="database-section"><CasesExplorer pastRecords={cases} ongoingRecords={ongoingCases} initialQuery={initialQuery} initialTab={initialTab} /></section>
    </PageShell>
  );
}
