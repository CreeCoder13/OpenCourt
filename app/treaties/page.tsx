import type { Metadata } from "next";
import Link from "next/link";
import { TreatyExplorer } from "../../components/TreatyExplorer";
import { Breadcrumbs, PageShell } from "../../components/SiteChrome";
import { treaties } from "../../data/treaties";

export const metadata: Metadata = {
  title: "Treaties in Canada | OpenCourt",
  description: "Explore historic and modern treaties between Indigenous peoples and the Crown in Canada, with connections to legal issues and court cases.",
};

export default function TreatiesPage() {
  const numbered = treaties.filter((item) => item.category === "Numbered Treaties");
  const modernCount = treaties.filter((item) => item.category === "Modern Treaties").length;
  return <PageShell>
    <section className="page-hero treaties-hero">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Treaties in Canada" }]} />
      <div className="treaties-hero-grid">
        <div><p className="kicker">Treaty research centre</p><h1>Treaties in Canada</h1><p className="treaties-subtitle">Explore historic and modern treaties between Indigenous peoples and the Crown in Canada.</p></div>
        <aside><span>Read with care</span><p>Treaties differ in their history, wording, parties, geography, legal interpretation and continuing obligations. This catalogue does not treat them as identical or present one interpretation as the only possible view.</p><a href="#treaty-database">Search the catalogue ↓</a></aside>
      </div>
      <div className="treaty-stats"><div><strong>{treaties.length}</strong><span>reviewed catalogue records</span></div><div><strong>11</strong><span>Numbered Treaties</span></div><div><strong>{modernCount}</strong><span>selected modern agreements</span></div><div><strong>Growing</strong><span>designed for new records</span></div></div>
    </section>

    <section className="treaty-category-section">
      <div className="catalog-intro"><div><p className="kicker">How the catalogue is organized</p><h2>Three ways into treaty history</h2></div><p>Browse a major group, jump directly to a Numbered Treaty, or search every reviewed record below.</p></div>
      <div className="treaty-category-grid">
        <a href="#historic"><span>01</span><h3>Historic Treaties</h3><p>Peace and Friendship Treaties, Upper Canada Treaties, Robinson Treaties, Douglas Treaties, Williams Treaties and other historic agreements.</p><b>Explore the category →</b></a>
        <a href="#numbered"><span>02</span><h3>Numbered Treaties</h3><p>Treaty 1 through Treaty 11, with room for adhesions, later additions and source-specific community connections.</p><b>Choose a treaty →</b></a>
        <a href="#modern"><span>03</span><h3>Modern Treaties</h3><p>Selected comprehensive land claim and self-government agreements involving Inuit, First Nations and Indigenous governments.</p><b>See modern agreements →</b></a>
      </div>
    </section>

    <section className="numbered-treaty-section" id="numbered">
      <div className="numbered-heading"><div><p className="kicker">1871–1921</p><h2>The Numbered Treaties</h2></div><p>Open a treaty record for its parties, historical context, territory notes, terms, adhesions, sources and connected cases.</p></div>
      <div className="numbered-treaty-strip">{numbered.map((item) => <Link href={`/treaties/${item.slug}`} key={item.slug}><span>{item.treatyNumber}</span><small>{item.year}</small><b>View →</b></Link>)}</div>
    </section>

    <section className="treaty-context-band">
      <div id="historic"><p className="kicker">Historic treaties</p><h2>Not one uniform category</h2><p>Historic treaty-making took different forms across time and place. A Peace and Friendship Treaty is not interchangeable with a land-related agreement in Upper Canada or a Numbered Treaty.</p></div>
      <div id="modern"><p className="kicker">Modern treaties / comprehensive land claims</p><h2>A growing, non-exhaustive collection</h2><p>The modern records below are selected examples, not a complete list. The data model supports additional First Nations, Inuit, Métis, Yukon, Northwest Territories, Nunavut and British Columbia agreements as they are reviewed.</p></div>
    </section>

    <TreatyExplorer records={treaties} />
  </PageShell>;
}
