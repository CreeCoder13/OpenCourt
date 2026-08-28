"use client";

import { useState } from "react";
import type { DiscoveredDocument } from "../lib/discovery/types";

function verificationLabel(value: string) { return value.replaceAll("_", " "); }

export function AdminReviewQueue() {
  const [token, setToken] = useState("");
  const [items, setItems] = useState<DiscoveredDocument[]>([]);
  const [usage, setUsage] = useState({ calls: 0, inputTokens: 0, outputTokens: 0, estimatedCostUsd: 0 });
  const [state, setState] = useState<"locked" | "loading" | "ready" | "error">("locked");
  const [message, setMessage] = useState("Enter the server-configured editor token to load the live queue.");

  async function loadQueue() {
    setState("loading");
    const response = await fetch("/api/admin/review", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const body = await response.json() as { items?: DiscoveredDocument[]; usage?: typeof usage; error?: string };
    if (!response.ok) { setState("error"); setMessage(body.error ?? "Unable to load the queue"); return; }
    setItems(body.items ?? []); setUsage(body.usage ?? usage); setState("ready"); setMessage(`${body.items?.length ?? 0} item${body.items?.length === 1 ? "" : "s"} awaiting editorial review.`);
  }

  async function act(id: string, action: "publish" | "reject") {
    const response = await fetch("/api/admin/review", { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    const body = await response.json() as { error?: string };
    if (!response.ok) { setMessage(body.error ?? "The review action failed"); return; }
    setItems((current) => current.filter((item) => item.id !== id));
    setMessage(action === "publish" ? "Verified record published." : "Candidate rejected.");
  }

  return <section className="review-console" aria-labelledby="review-heading">
    <div className="review-console-head"><div><p className="section-number">Human review queue</p><h2 id="review-heading">Discovery decisions</h2><p>{message}</p></div><div className="review-auth"><label htmlFor="editor-token">Editor token</label><div><input id="editor-token" type="password" value={token} onChange={(event) => setToken(event.target.value)} autoComplete="off" placeholder="Server-configured token" /><button type="button" onClick={loadQueue} disabled={!token || state === "loading"}>{state === "loading" ? "Loading…" : "Load queue"}</button></div><small>The token stays in this browser tab and is sent only in authorization headers.</small></div></div>
    {state === "ready" ? <div className="usage-strip"><span>Today’s AI use</span><b>{usage.calls} calls</b><b>{(usage.inputTokens + usage.outputTokens).toLocaleString()} tokens</b><b>${usage.estimatedCostUsd.toFixed(4)} estimated</b></div> : null}
    {state === "ready" && !items.length ? <div className="review-empty"><b>No items are waiting.</b><span>The next scheduled scan can add new candidates.</span></div> : null}
    <div className="review-list">{items.map((item) => {
      const extracted = item.extracted as Record<string, unknown> | undefined;
      const summary = typeof extracted?.plainLanguageSummary === "string" ? extracted.plainLanguageSummary : typeof extracted?.summary === "string" ? extracted.summary : "Summary not yet available.";
      const publishable = item.verification === "VERIFIED_PRIMARY" || item.verification === "VERIFIED_MULTIPLE";
      return <article className="review-card" key={item.id}>
        <div className="review-card-meta"><span>{item.proposedType ?? "Candidate"}</span><span className={`verification-pill ${publishable ? "verified" : "unverified"}`}>{verificationLabel(item.verification)}</span></div>
        <h3>{item.title ?? "Untitled candidate"}</h3><p>{summary}</p>
        <dl><div><dt>Impact</dt><dd>{item.impactScore ?? "—"}/100</dd></div><div><dt>AI confidence</dt><dd>{item.aiConfidence === undefined ? "—" : `${Math.round(item.aiConfidence * 100)}%`}</dd></div><div><dt>Source tier</dt><dd>Tier {item.sourceTier}</dd></div><div><dt>Duplicate</dt><dd>{item.duplicateOf ? "Warning" : "None found"}</dd></div></dl>
        {item.impactReasons.length ? <ul>{item.impactReasons.slice(0, 4).map((reason) => <li key={reason}>{reason}</li>)}</ul> : null}
        {item.lastError ? <p className="review-warning">{item.lastError}</p> : null}
        <a href={item.url} target="_blank" rel="noreferrer">Open original source ↗</a>
        <div className="review-actions"><button type="button" className="reject" onClick={() => act(item.id, "reject")}>Reject</button><button type="button" onClick={() => act(item.id, "publish")} disabled={!publishable} title={publishable ? "Publish this verified record" : "Attach sufficient primary evidence before publishing"}>Publish verified record</button></div>
      </article>;
    })}</div>
  </section>;
}
