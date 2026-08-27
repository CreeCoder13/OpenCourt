import Link from "next/link";
import { SiteFooter, SiteHeader, VerificationBadge } from "../components/SiteChrome";
import { cases } from "../data/cases";
import { topics, treaties } from "../data/catalog";

const landmarkSlugs = ["calder-v-british-columbia-1973", "r-v-sparrow-1990", "tsilhqotin-nation-v-british-columbia-2014"];
const landmarks = landmarkSlugs.map((slug) => cases.find((item) => item.slug === slug)).filter(Boolean);
const recent = [...cases].sort((a, b) => b.decisionDate.localeCompare(a.decisionDate)).slice(0, 4);

export default function Home() {
  return <><SiteHeader /><main>
    <section className="hero">
      <div className="eyebrow"><span /> Canadian Indigenous case law, made clearer</div>
      <h1>Understand Indigenous<br />Court Cases in Canada</h1>
      <p className="hero-copy">Explore court decisions involving Indigenous rights, treaties, land, governance, consultation, title, and more — explained in plain language.</p>
      <form className="hero-search" action="/cases"><label className="sr-only" htmlFor="home-search">Search the case database</label><span aria-hidden="true">⌕</span><input id="home-search" name="q" placeholder="Search a court case, First Nation, treaty, right, or keyword" /><button type="submit">Search cases <span aria-hidden="true">→</span></button></form>
      <div className="hero-timeline-link"><Link href="/timeline"><span>Explore legal history</span><strong>Open the timeline</strong><b aria-hidden="true">→</b></Link></div>
      <div className="search-suggestions" aria-label="Example searches"><span>Try:</span><Link href="/cases?q=Canoe+Lake">Canoe Lake</Link><Link href="/cases?q=Treaty+6+hunting">Treaty 6 hunting</Link><Link href="/cases?q=Aboriginal+title+British+Columbia">Aboriginal title in B.C.</Link><Link href="/cases?q=Supreme+Court+Metis">Supreme Court Métis</Link></div>
      <div className="hero-rule" /><dl className="hero-stats"><div><dt>11</dt><dd>Landmark case profiles</dd></div><div><dt>17</dt><dd>Legal topics</dd></div><div><dt>11</dt><dd>Numbered treaties</dd></div><div><dt>Primary</dt><dd>Sources prioritized</dd></div></dl>
    </section>

    <section className="section landmarks-section"><div className="section-heading"><div><p className="kicker">Start here</p><h2>Landmark cases</h2></div><p>Explore decisions that shaped Canadian law concerning Indigenous peoples and Aboriginal and treaty rights.</p><Link className="text-link" href="/cases">View all cases →</Link></div><div className="case-grid">{landmarks.map((item) => item && <Link href={`/cases/${item.slug}`} className="case-card" key={item.id}><div className="case-meta"><span>{new Date(`${item.decisionDate}T00:00:00`).getFullYear()}</span><span className="topic-pill">{item.legalTopics[0]}</span></div><h3>{item.caseName}</h3><p className="citation">{item.officialCitation}</p><p>{item.summaryShort}</p><span className="card-link">Read the plain-language summary <b>→</b></span></Link>)}</div></section>

    <section className="topics-home"><div className="section topics-home-inner"><div className="section-heading"><div><p className="kicker">Rights explorer</p><h2>Browse by legal issue</h2></div><p>Start with a doctrine, then follow how courts established, expanded, clarified, or limited it.</p><Link className="text-link" href="/topics">Explore all topics →</Link></div><div className="home-topic-grid">{topics.map((topic, index) => <Link href={`/topics/${topic.slug}`} key={topic.id}><span>{String(index + 1).padStart(2, "0")}</span><b>{topic.name}</b><i>→</i></Link>)}</div></div></section>

    <section className="section treaty-home"><div className="treaty-home-copy"><p className="kicker">Treaty explorer</p><h2>Browse by numbered treaty</h2><p>Connect court decisions with treaty relationships while keeping disputed interpretations visible and unsettled.</p><Link className="text-link" href="/treaties">View treaty index →</Link></div><div className="home-treaty-grid">{treaties.filter((item) => /^Treaty \d+$/.test(item.name)).map((treaty) => <Link href={`/treaties/${treaty.slug}`} key={treaty.id}><span>{treaty.name.replace("Treaty ", "")}</span><small>{treaty.name}</small>{treaty.caseSlugs.length > 0 && <b>{treaty.caseSlugs.length} case</b>}</Link>)}</div></section>

    <section className="recent-home"><div className="section"><div className="section-heading"><div><p className="kicker">Recent in the dataset</p><h2>Recent decisions</h2></div><p>Recently decided landmark cases in the verified development dataset.</p><Link className="text-link" href="/cases?sort=newest">See newest first →</Link></div><div className="recent-list">{recent.map((item) => <Link href={`/cases/${item.slug}`} key={item.id}><time>{new Date(`${item.decisionDate}T00:00:00`).toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" })}</time><div><span>{item.court} · {item.provinceTerritory}</span><h3>{item.caseName}</h3><p>{item.summaryShort}</p></div><div className="recent-side"><VerificationBadge level={item.verificationLevel} /><b>→</b></div></Link>)}</div></div></section>

    <section className="section watch-home"><div><p className="kicker">Active litigation</p><h2>Cases to watch</h2><p>Ongoing cases will appear only when their court stage, latest event, and verification date have reliable sources.</p></div><div className="watch-home-empty"><span>◷</span><div><b>No active cases published yet</b><p>The tracker is ready for verified litigation records. Future hearing dates will never be invented.</p></div><Link href="/cases-to-watch">Open tracker →</Link></div></section>

    <section className="source-band"><div><span className="source-band-mark">✓</span><div><p className="kicker">Built for verification</p><h2>Every explanation leads back to the judgment.</h2><p>Primary sources are prioritized. Uncertain details are labelled, not guessed.</p></div><Link href="/sources">How sources are reviewed →</Link></div></section>
  </main><SiteFooter /></>;
}
