import Link from "next/link";

const nav = [
  ["Cases", "/cases"], ["Laws", "/laws"], ["Communities", "/communities"], ["Treaties", "/treaties"],
  ["Rights & Legal Topics", "/topics"], ["Timeline", "/timeline"], ["Cases to Watch", "/cases-to-watch"],
];

export function SiteHeader() {
  return (
    <header className="site-header inner-header">
      <Link className="brand" href="/" aria-label="OpenCourt home"><span className="brand-mark">OC</span><span className="brand-copy"><span>OpenCourt</span><small>Canadian Indigenous Case Law</small></span></Link>
      <nav className="desktop-nav" aria-label="Primary navigation">{nav.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}</nav>
      <details className="mobile-nav">
        <summary>Menu</summary>
        <nav aria-label="Mobile navigation">{nav.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}<Link href="/about">About</Link><Link href="/sources">Sources</Link></nav>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div><Link className="brand" href="/"><span className="brand-mark">OC</span><span className="brand-copy"><span>OpenCourt</span><small>Canadian Indigenous Case Law</small></span></Link><p>Making Canadian court cases concerning Indigenous peoples and rights easier to understand and verify.</p></div>
        <div><h3>Explore</h3><Link href="/cases">Case database</Link><Link href="/laws">Laws &amp; constitutional texts</Link><Link href="/topics">Legal topics</Link><Link href="/communities">Communities</Link><Link href="/timeline">Legal timeline</Link></div>
        <div><h3>Project</h3><Link href="/about">About</Link><Link href="/sources">Sources &amp; methodology</Link><Link href="/admin">Admin architecture</Link></div>
      </div>
      <div className="disclaimer"><strong>Legal information, not legal advice.</strong> Summaries are for public information and may be AI-assisted, reviewed and corrected. Consult the original judgment, legislation or agreement and a qualified legal professional for advice.</div>
      <div className="footer-base"><span>OpenCourt research prototype</span><span>Primary sources prioritized · Last site review 27 August 2026</span></div>
    </footer>
  );
}

export function PageShell({ children }: { children: React.ReactNode }) {
  return <><SiteHeader /><main>{children}</main><SiteFooter /></>;
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; href?: string }> }) {
  return <nav className="breadcrumbs" aria-label="Breadcrumb">{items.map((item, index) => <span key={`${item.label}-${index}`}>{index > 0 && <b>/</b>}{item.href ? <Link href={item.href}>{item.label}</Link> : item.label}</span>)}</nav>;
}

export function VerificationBadge({ level }: { level: "Verified" | "Secondary Source" | "Needs Verification" }) {
  return <span className={`verify-badge verify-${level.toLowerCase().replace(/ /g, "-")}`}><i />{level}</span>;
}
