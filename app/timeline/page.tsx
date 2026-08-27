import type { Metadata } from "next";
import { Breadcrumbs, PageShell } from "../../components/SiteChrome";
import { TimelineExplorer } from "../../components/TimelineExplorer";
import { cases } from "../../data/cases";

export const metadata: Metadata = {
  title: "Indigenous Court Cases Timeline in Canada | OpenCourt",
  description: "Explore a chronological timeline of major Canadian court cases involving Indigenous rights, treaty rights, Aboriginal title, Section 35, consultation, governance, and more.",
  alternates: { canonical: "/timeline" },
  openGraph: {
    title: "Indigenous Court Cases Timeline in Canada | OpenCourt",
    description: "Explore the major court decisions that have shaped Indigenous rights and Aboriginal law in Canada.",
    url: "/timeline",
  },
};

export default function TimelinePage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Indigenous Court Cases Timeline",
    description: metadata.description,
    url: "https://opencourt-canada.t98ymftg9z.chatgpt.site/timeline",
    mainEntity: { "@type": "ItemList", numberOfItems: cases.length, itemListElement: [...cases].sort((a, b) => a.decisionDate.localeCompare(b.decisionDate)).map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.caseName, url: `https://opencourt-canada.t98ymftg9z.chatgpt.site/cases/${item.slug}` })) },
  };

  return <PageShell>
    <section className="page-hero timeline-hero">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Timeline" }]} />
      <div className="timeline-hero-layout"><div><p className="kicker">Canadian legal history · 1973–present</p><h1>Indigenous Court Cases Timeline</h1><p className="timeline-subtitle">Explore the major court decisions that have shaped Indigenous rights and Aboriginal law in Canada.</p></div><div className="timeline-hero-note"><span>About this timeline</span><p>Follow important cases chronologically and see how Canadian courts have interpreted treaty rights, Aboriginal title, consultation, governance, harvesting rights, Métis rights, and other Indigenous legal issues.</p><a href="#explore-timeline">Begin exploring <span aria-hidden="true">↓</span></a></div></div>
    </section>
    <section className="timeline-section timeline-page-section" id="explore-timeline"><TimelineExplorer records={cases} /></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }} />
  </PageShell>;
}
