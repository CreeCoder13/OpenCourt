import { SiteHeader } from "../components/SiteChrome";

export default function Home() {
  return <><SiteHeader /><main>
    <section className="hero">
      <div className="eyebrow"><span /> Canadian Indigenous case law, made clearer</div>
      <h1>Understand Indigenous<br />Court Cases in Canada</h1>
      <p className="hero-copy">Explore court decisions involving Indigenous rights, treaties, land, governance, consultation, title, and more — explained in plain language.</p>
      <form className="hero-search" action="/cases"><label className="sr-only" htmlFor="home-search">Search the case database</label><span aria-hidden="true">⌕</span><input id="home-search" name="q" placeholder="Search a court case, First Nation, treaty, right, or keyword" /><button type="submit">Search cases <span aria-hidden="true">→</span></button></form>
      <div className="hero-timeline-link"><a href="/timeline"><span>Explore legal history</span><strong>Timeline</strong><b aria-hidden="true">→</b></a></div>
    </section>
  </main></>;
}
