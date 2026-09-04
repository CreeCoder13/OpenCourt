import Link from "next/link";
import type { ComponentPropsWithoutRef } from "react";

import { primaryNavigation } from "../data/navigation";

function DocumentNavigationLink({ href, ...props }: ComponentPropsWithoutRef<"a"> & { href: string }) {
  // Native links deliberately bypass client routing, which is unreliable in the deployed worker.
  return <a {...props} href={href} />;
}

export function SiteHeader() {
  return (
    <header className="site-header inner-header">
      <DocumentNavigationLink className="brand" href="/" aria-label="OpenCourt home" title="Return to the OpenCourt home page"><span className="brand-mark">OC</span><span className="brand-copy"><span>OpenCourt</span><small>Canadian Indigenous Case Law</small></span></DocumentNavigationLink>
      <nav className="desktop-nav" aria-label="Primary navigation">{primaryNavigation.map(([label, href]) => <DocumentNavigationLink href={href} key={href}>{label}</DocumentNavigationLink>)}</nav>
      <details className="mobile-nav">
        <summary>Menu</summary>
        <nav aria-label="Mobile navigation">{primaryNavigation.map(([label, href]) => <DocumentNavigationLink href={href} key={href}>{label}</DocumentNavigationLink>)}<DocumentNavigationLink href="/about">About</DocumentNavigationLink><DocumentNavigationLink href="/sources">Sources</DocumentNavigationLink></nav>
      </details>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div><Link className="brand" href="/"><span className="brand-mark">OC</span><span className="brand-copy"><span>OpenCourt</span><small>Canadian Indigenous Case Law</small></span></Link><p>Making Canadian court cases concerning Indigenous peoples and rights easier to understand and verify.</p></div>
        <div><h3>Explore</h3><Link href="/timeline">Legal timeline</Link><Link href="/cases">Past cases</Link><Link href="/cases?tab=ongoing">Ongoing cases</Link><Link href="/laws">Laws &amp; constitutional texts</Link><Link href="/topics">Legal definitions</Link><Link href="/communities">Indigenous communities</Link></div>
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
  return <nav className="breadcrumbs" aria-label="Breadcrumb">{items.map((item, index) => <span key={`${item.label}-${index}`}>{index > 0 && <b>/</b>}{item.href ? <DocumentNavigationLink href={item.href}>{item.label}</DocumentNavigationLink> : item.label}</span>)}</nav>;
}

export function VerificationBadge({ level }: { level: "Verified" | "Secondary Source" | "Needs Verification" }) {
  return <span className={`verify-badge verify-${level.toLowerCase().replace(/ /g, "-")}`}><i />{level}</span>;
}
