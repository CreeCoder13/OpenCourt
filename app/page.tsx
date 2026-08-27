import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { cases } from "../data/cases";
import { topics } from "../data/catalog";

const landmarkSlugs = ["calder-v-british-columbia-1973", "r-v-sparrow-1990", "tsilhqotin-nation-v-british-columbia-2014"];
const landmarks = landmarkSlugs.map((slug) => cases.find((item) => item.slug === slug)).filter(Boolean);

export default function Home() {
  return <><SiteHeader /><main>
    <section className="hero">
      <div className="eyebrow"><span /> Canadian Indigenous case law, made clearer</div>
      <h1>Understand Indigenous<br />Court Cases in Canada</h1>
      <p className="hero-copy">Explore court decisions involving Indigenous rights, treaties, land, governance, consultation, title, and more — explained in plain language.</p>
      <form className="hero-search" action="/cases"><label className="sr-only" htmlFor="home-search">Search the case database</label><span aria-hidden="true">⌕</span><input id="home-search" name="q" placeholder="Search a court case, First Nation, treaty, right, or keyword" /><button type="submit">Search cases <span aria-hidden="true">→</span></button></form>
      <div className="hero-timeline-link"><a href="/timeline"><span>Explore legal history</span><strong>Timeline</strong><b aria-hidden="true">→</b></a></div>
    </section>

    <section className="section landmarks-section"><div className="section-heading"><div><p className="kicker">Start here</p><h2>Landmark cases</h2></div><p>Explore decisions that shaped Canadian law concerning Indigenous peoples and Aboriginal and treaty rights.</p><a className="text-link" href="/cases">View all cases →</a></div><div className="case-grid">{landmarks.map((item) => item && <a href={`/cases/${item.slug}`} className="case-card" key={item.id}><div className="case-meta"><span>{new Date(`${item.decisionDate}T00:00:00`).getFullYear()}</span><span className="topic-pill">{item.legalTopics[0]}</span></div><h3>{item.caseName}</h3><p className="citation">{item.officialCitation}</p><p>{item.summaryShort}</p><span className="card-link">Read the plain-language summary <b>→</b></span></a>)}</div></section>

    <section className="topics-home"><div className="section topics-home-inner"><div className="section-heading"><div><p className="kicker">Rights explorer</p><h2>Browse by legal issue</h2></div><p>Start with a doctrine, then follow how courts established, expanded, clarified, or limited it.</p><a className="text-link" href="/topics">Explore all topics →</a></div><div className="home-topic-grid">{topics.map((topic, index) => <a href={`/topics/${topic.slug}`} key={topic.id}><span>{String(index + 1).padStart(2, "0")}</span><b>{topic.name}</b><i>→</i></a>)}</div></div></section>

    <section className="source-band"><div><span className="source-band-mark">✓</span><div><p className="kicker">Built for verification</p><h2>Every explanation leads back to the judgment.</h2><p>Primary sources are prioritized. Uncertain details are labelled, not guessed.</p></div><a href="/sources">How sources are reviewed →</a></div></section>
  </main><SiteFooter /></>;
}
