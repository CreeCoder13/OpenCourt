import "server-only";
import { env } from "cloudflare:workers";
import { schemaStatements } from "./schema";
import type { DiscoveredDocument, EvidenceSource, VerificationLevel } from "../lib/discovery/types";
import { findDuplicate, type DuplicateCandidate } from "../lib/discovery/deduplicate";

type Json = Record<string, unknown>;

export function getDb(): D1Database {
  const binding = (env as unknown as { DB?: D1Database }).DB;
  if (!binding) throw new Error("OpenCourt D1 binding DB is not configured");
  return binding;
}

export function getDocumentBucket(): R2Bucket {
  const binding = (env as unknown as { DOCUMENTS?: R2Bucket }).DOCUMENTS;
  if (!binding) throw new Error("OpenCourt R2 binding DOCUMENTS is not configured");
  return binding;
}

let schemaReady: Promise<void> | undefined;
export function ensureSchema(): Promise<void> {
  schemaReady ??= (async () => {
    const db = getDb();
    for (let index = 0; index < schemaStatements.length; index += 50) {
      await db.batch(schemaStatements.slice(index, index + 50).map((sql) => db.prepare(sql)));
    }
  })();
  return schemaReady;
}

const json = (value: unknown) => JSON.stringify(value ?? null);
const parse = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string") return fallback;
  try { return JSON.parse(value) as T; } catch { return fallback; }
};

export async function enqueueDocument(input: Omit<DiscoveredDocument, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<boolean> {
  await ensureSchema();
  const now = new Date().toISOString();
  const id = input.id ?? crypto.randomUUID();
  const result = await getDb().prepare(`INSERT OR IGNORE INTO discovery_items
    (id,url,normalized_url,source_domain,source_tier,discovered_by,search_query,title,mime_type,content_hash,relevance,relevance_score,relevance_reasons_json,proposed_type,ai_confidence,extracted_json,verification,verification_sources_json,impact_score,impact_reasons_json,duplicate_of,duplicate_reasons_json,status,last_error,created_at,updated_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(id, input.url, input.normalizedUrl, input.sourceDomain, input.sourceTier, input.discoveredBy, input.searchQuery ?? null, input.title ?? null, input.mimeType ?? null, input.contentHash ?? null, input.relevance, input.relevanceScore, json(input.relevanceReasons), input.proposedType ?? null, input.aiConfidence ?? null, input.extracted ? json(input.extracted) : null, input.verification, json(input.verificationSources), input.impactScore ?? null, json(input.impactReasons), input.duplicateOf ?? null, json(input.duplicateReasons), input.status, input.lastError ?? null, now, now).run();
  return (result.meta.changes ?? 0) > 0;
}

export async function claimNextDocument(): Promise<DiscoveredDocument | null> {
  await ensureSchema();
  const now = new Date().toISOString();
  const row = await getDb().prepare(`SELECT * FROM discovery_items
    WHERE status IN ('DISCOVERED','FAILED') AND (next_attempt_at IS NULL OR next_attempt_at <= ?)
    ORDER BY source_tier ASC, created_at ASC LIMIT 1`).bind(now).first<Record<string, unknown>>();
  if (!row) return null;
  const result = await getDb().prepare(`UPDATE discovery_items SET status='PROCESSING', attempts=attempts+1, updated_at=? WHERE id=? AND status IN ('DISCOVERED','FAILED')`).bind(now, row.id).run();
  return (result.meta.changes ?? 0) ? rowToDocument({ ...row, status: "PROCESSING", updated_at: now }) : null;
}

export async function updateDocument(id: string, changes: Partial<DiscoveredDocument> & { nextAttemptAt?: string }): Promise<void> {
  await ensureSchema();
  const fields: Array<[string, unknown]> = [];
  const map: Record<string, string> = {
    title: "title", mimeType: "mime_type", contentHash: "content_hash", relevance: "relevance", relevanceScore: "relevance_score",
    proposedType: "proposed_type", aiConfidence: "ai_confidence", verification: "verification", impactScore: "impact_score",
    duplicateOf: "duplicate_of", status: "status", lastError: "last_error", nextAttemptAt: "next_attempt_at",
  };
  for (const [key, column] of Object.entries(map)) if (key in changes) fields.push([column, changes[key as keyof typeof changes] ?? null]);
  const jsonMap: Record<string, string> = { relevanceReasons: "relevance_reasons_json", extracted: "extracted_json", verificationSources: "verification_sources_json", impactReasons: "impact_reasons_json", duplicateReasons: "duplicate_reasons_json" };
  for (const [key, column] of Object.entries(jsonMap)) if (key in changes) fields.push([column, json(changes[key as keyof typeof changes])]);
  fields.push(["updated_at", new Date().toISOString()]);
  await getDb().prepare(`UPDATE discovery_items SET ${fields.map(([column]) => `${column}=?`).join(",")} WHERE id=?`).bind(...fields.map(([, value]) => value), id).run();
}

export async function listReviewItems(limit = 50): Promise<DiscoveredDocument[]> {
  await ensureSchema();
  const result = await getDb().prepare(`SELECT * FROM discovery_items WHERE status='REVIEW' ORDER BY COALESCE(impact_score,0) DESC, COALESCE(ai_confidence,0) DESC, created_at DESC LIMIT ?`).bind(Math.min(100, Math.max(1, limit))).all<Record<string, unknown>>();
  return result.results.map(rowToDocument);
}

export async function requeueMonitors(hours = 6): Promise<number> {
  await ensureSchema();
  const cutoff = new Date(Date.now() - Math.max(1, hours) * 3_600_000).toISOString();
  const now = new Date().toISOString();
  const result = await getDb().prepare("UPDATE discovery_items SET status='DISCOVERED',updated_at=? WHERE status='MONITOR' AND updated_at<=?").bind(now, cutoff).run();
  return result.meta.changes ?? 0;
}

export async function requeuePublishedForVerification(days = 30): Promise<number> {
  await ensureSchema();
  const cutoff = new Date(Date.now() - Math.max(1, days) * 86_400_000).toISOString();
  const now = new Date().toISOString();
  const result = await getDb().prepare("UPDATE discovery_items SET status='DISCOVERED',updated_at=? WHERE status='PUBLISHED' AND updated_at<=?").bind(now, cutoff).run();
  return result.meta.changes ?? 0;
}

export async function reviewItem(id: string, action: "publish" | "reject", reviewerNote?: string): Promise<void> {
  await ensureSchema();
  const db = getDb();
  const row = await db.prepare("SELECT * FROM discovery_items WHERE id=? AND status='REVIEW'").bind(id).first<Record<string, unknown>>();
  if (!row) throw new Error("Review item was not found or is no longer pending");
  const verification = String(row.verification) as VerificationLevel;
  if (action === "publish" && row.duplicate_of) throw new Error("A probable duplicate cannot be published as a new record; merge or reject it during review");
  if (action === "publish" && !["VERIFIED_PRIMARY", "VERIFIED_MULTIPLE"].includes(verification)) {
    throw new Error("Unverified and partially verified records cannot be published");
  }
  const now = new Date().toISOString();
  if (action === "reject") {
    await db.prepare("UPDATE discovery_items SET status='REJECTED', last_error=?, updated_at=? WHERE id=?").bind(reviewerNote ?? "Rejected by editor", now, id).run();
    return;
  }
  const extracted: Json = {
    ...parse<Json>(row.extracted_json, {}),
    verificationSources: parse<EvidenceSource[]>(row.verification_sources_json, []),
    lastVerified: now,
  };
  const title = String(extracted.caseName ?? extracted.title ?? row.title ?? "Untitled legal record");
  if (row.proposed_type === "CASE") {
    const duplicate = findDuplicate({ ...extracted, id, caseName: title } as DuplicateCandidate, await listAllDuplicateCandidates());
    if (duplicate.duplicateOf) throw new Error("A matching pending or published decision now exists; resolve the duplicate in review");
  }
  const slug = String(extracted.slug ?? title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  const existingRecord = await db.prepare("SELECT id,verification FROM legal_records WHERE slug=?").bind(slug).first<{ id: string; verification: VerificationLevel }>();
  if (existingRecord) {
    throw new Error("A reviewed record already owns this slug; automatic replacement is prohibited");
  }
  const recordId = String(extracted.id ?? crypto.randomUUID());
  const relationships = [
    ...((Array.isArray(extracted.casesCited) ? extracted.casesCited : []) as unknown[]).map((label) => ({ type: "CITES_CASE", label })),
    ...((Array.isArray(extracted.legislationReferenced) ? extracted.legislationReferenced : []) as unknown[]).map((label) => ({ type: "REFERENCES_LEGISLATION", label })),
    ...((Array.isArray(extracted.treaty) ? extracted.treaty : Array.isArray(extracted.treatiesReferenced) ? extracted.treatiesReferenced : []) as unknown[]).map((label) => ({ type: "REFERENCES_TREATY", label })),
  ].filter((relationship) => typeof relationship.label === "string" && relationship.label.trim());
  await db.batch([
    db.prepare(`INSERT INTO legal_records (id,slug,record_type,title,citation,decision_date,court,verification,impact_score,payload_json,published_at,last_verified_at,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(slug) DO UPDATE SET payload_json=excluded.payload_json, verification=excluded.verification, impact_score=excluded.impact_score, updated_at=excluded.updated_at
      WHERE (CASE excluded.verification WHEN 'VERIFIED_MULTIPLE' THEN 3 WHEN 'VERIFIED_PRIMARY' THEN 2 WHEN 'PARTIALLY_VERIFIED' THEN 1 ELSE 0 END) >
            (CASE legal_records.verification WHEN 'VERIFIED_MULTIPLE' THEN 3 WHEN 'VERIFIED_PRIMARY' THEN 2 WHEN 'PARTIALLY_VERIFIED' THEN 1 ELSE 0 END)`)
      .bind(recordId, slug, row.proposed_type ?? "CASE", title, extracted.neutralCitation ?? extracted.citation ?? null, extracted.decisionDate ?? null, extracted.court ?? null, verification, row.impact_score ?? 0, json(extracted), now, now, now, now),
    db.prepare("UPDATE discovery_items SET status='PUBLISHED', updated_at=? WHERE id=?").bind(now, id),
    ...relationships.map((relationship) => db.prepare("INSERT INTO legal_relationships (id,from_record_id,target_label,relationship_type,evidence_url,confidence,verified,created_at) VALUES (?,?,?,?,?,1,1,?)").bind(crypto.randomUUID(), recordId, relationship.label, relationship.type, row.url, now)),
  ]);
}

export async function seedVerifiedRecords(records: Array<Record<string, unknown> & { id: string; slug: string; impactScore: number; verified: VerificationLevel }>, recordType: "CASE" | "LAW"): Promise<number> {
  await ensureSchema();
  const db = getDb();
  const now = new Date().toISOString();
  let changed = 0;
  for (let index = 0; index < records.length; index += 40) {
    const batch = records.slice(index, index + 40).map((record) => {
      const title = String(record.caseName ?? record.title);
      const citation = record.neutralCitation ?? record.reportedCitation ?? record.citation ?? null;
      const statement = db.prepare(`INSERT OR IGNORE INTO legal_records (id,slug,record_type,title,citation,decision_date,court,verification,impact_score,payload_json,published_at,last_verified_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
        .bind(record.id, record.slug, recordType, title, citation, record.decisionDate ?? null, record.court ?? null, record.verified, record.impactScore, json(record), now, record.lastVerified ?? now, now, now);
      return statement;
    });
    const results = await db.batch(batch);
    changed += results.reduce((sum, result) => sum + (result.meta.changes ?? 0), 0);
  }
  return changed;
}

export async function seedRecordRelationships(records: Array<Record<string, unknown> & { id: string; slug: string }>): Promise<number> {
  await ensureSchema();
  const db = getDb();
  const idBySlug = new Map(records.map((record) => [record.slug, record.id]));
  const now = new Date().toISOString();
  const rows: Array<{ from: string; to?: string; label: string; type: string; evidence?: string }> = [];
  for (const record of records) {
    const source = typeof record.officialDecisionUrl === "string" ? record.officialDecisionUrl : typeof record.officialSourceUrl === "string" ? record.officialSourceUrl : undefined;
    for (const value of Array.isArray(record.casesCited) ? record.casesCited : Array.isArray(record.relatedCases) ? record.relatedCases : []) {
      if (typeof value === "string") rows.push({ from: record.id, to: idBySlug.get(value), label: value, type: "CITES_CASE", evidence: source });
    }
    for (const value of Array.isArray(record.legislationReferenced) ? record.legislationReferenced : []) {
      if (typeof value === "string") rows.push({ from: record.id, label: value, type: "REFERENCES_LEGISLATION", evidence: source });
    }
    for (const value of Array.isArray(record.treaty) ? record.treaty : Array.isArray(record.relatedTreaties) ? record.relatedTreaties : []) {
      if (typeof value === "string") rows.push({ from: record.id, label: value, type: "REFERENCES_TREATY", evidence: source });
    }
  }
  let changed = 0;
  for (let index = 0; index < rows.length; index += 50) {
    const results = await db.batch(rows.slice(index, index + 50).map((row) => db.prepare("INSERT OR IGNORE INTO legal_relationships (id,from_record_id,to_record_id,target_label,relationship_type,evidence_url,confidence,verified,created_at) VALUES (?,?,?,?,?,?,1,1,?)").bind(crypto.randomUUID(), row.from, row.to ?? null, row.label, row.type, row.evidence ?? null, now)));
    changed += results.reduce((sum, result) => sum + (result.meta.changes ?? 0), 0);
  }
  return changed;
}

export async function getCachedAi(contentHash: string, task: string, model: string): Promise<Json | null> {
  await ensureSchema();
  const row = await getDb().prepare("SELECT response_json FROM ai_cache WHERE content_hash=? AND task=? AND model=?").bind(contentHash, task, model).first<{ response_json: string }>();
  return row ? parse<Json>(row.response_json, {}) : null;
}

export async function cacheAi(contentHash: string, task: string, model: string, response: Json, inputTokens = 0, outputTokens = 0): Promise<void> {
  await ensureSchema();
  const date = new Date().toISOString().slice(0, 10);
  const now = new Date().toISOString();
  const defaultInputRate = model === "gpt-5-mini" ? 0.25 : 0;
  const defaultOutputRate = model === "gpt-5-mini" ? 2 : 0;
  const inputRate = Number(process.env.OPENC_AI_INPUT_COST_PER_MILLION ?? defaultInputRate);
  const outputRate = Number(process.env.OPENC_AI_OUTPUT_COST_PER_MILLION ?? defaultOutputRate);
  const estimatedCost = (inputTokens * inputRate + outputTokens * outputRate) / 1_000_000;
  await getDb().batch([
    getDb().prepare("INSERT OR REPLACE INTO ai_cache (content_hash,task,model,response_json,input_tokens,output_tokens,created_at) VALUES (?,?,?,?,?,?,?)").bind(contentHash, task, model, json(response), inputTokens, outputTokens, now),
    getDb().prepare(`INSERT INTO api_usage (usage_date,provider,calls,input_tokens,output_tokens,estimated_cost_usd) VALUES (?,'openai',1,?,?,?)
      ON CONFLICT(usage_date,provider) DO UPDATE SET calls=calls+1,input_tokens=input_tokens+excluded.input_tokens,output_tokens=output_tokens+excluded.output_tokens,estimated_cost_usd=estimated_cost_usd+excluded.estimated_cost_usd`).bind(date, inputTokens, outputTokens, estimatedCost),
  ]);
}

export async function aiUsageToday(): Promise<{ calls: number; inputTokens: number; outputTokens: number; estimatedCostUsd: number }> {
  await ensureSchema();
  const row = await getDb().prepare("SELECT calls,input_tokens,output_tokens,estimated_cost_usd FROM api_usage WHERE usage_date=? AND provider='openai'").bind(new Date().toISOString().slice(0, 10)).first<{ calls: number; input_tokens: number; output_tokens: number; estimated_cost_usd: number }>();
  return { calls: row?.calls ?? 0, inputTokens: row?.input_tokens ?? 0, outputTokens: row?.output_tokens ?? 0, estimatedCostUsd: row?.estimated_cost_usd ?? 0 };
}

export async function startScanRun(triggerType: string): Promise<string> {
  await ensureSchema();
  const id = crypto.randomUUID();
  await getDb().prepare("INSERT INTO scan_runs (id,trigger_type,started_at,status) VALUES (?,?,?,'RUNNING')")
    .bind(id, triggerType.slice(0, 40), new Date().toISOString()).run();
  return id;
}

export async function finishScanRun(id: string, result: { queriesRun: number; urlsDiscovered: number; documentsProcessed: number; status?: "COMPLETED" | "FAILED"; error?: string }): Promise<void> {
  await ensureSchema();
  await getDb().prepare("UPDATE scan_runs SET completed_at=?,queries_run=?,urls_discovered=?,documents_processed=?,status=?,error=? WHERE id=?")
    .bind(new Date().toISOString(), result.queriesRun, result.urlsDiscovered, result.documentsProcessed, result.status ?? "COMPLETED", result.error?.slice(0, 2000) ?? null, id).run();
}

export async function listDuplicateCandidates(limit = 1000): Promise<Array<{ id: string; title: string; caseName?: string; neutralCitation?: string; courtFileNumber?: string; decisionDate?: string; year?: number; court?: string; officialDecisionUrl?: string }>> {
  await ensureSchema();
  const result = await getDb().prepare("SELECT id,title,citation,decision_date,court,payload_json FROM legal_records WHERE record_type='CASE' ORDER BY updated_at DESC LIMIT ?").bind(Math.min(5000, Math.max(1, limit))).all<Record<string, unknown>>();
  return result.results.map((row) => {
    const payload = parse<Record<string, unknown>>(row.payload_json, {});
    const decisionDate = row.decision_date ? String(row.decision_date) : undefined;
    return { id: String(row.id), title: String(row.title), caseName: String(row.title), neutralCitation: row.citation ? String(row.citation) : undefined, courtFileNumber: typeof payload.courtFileNumber === "string" ? payload.courtFileNumber : undefined, decisionDate, year: typeof payload.year === "number" ? payload.year : decisionDate ? Number(decisionDate.slice(0, 4)) : undefined, court: row.court ? String(row.court) : undefined, officialDecisionUrl: typeof payload.officialDecisionUrl === "string" ? payload.officialDecisionUrl : undefined };
  });
}

// Exhaustive, keyset-paginated snapshot. Never silently skip older pending/published identities.
export async function listAllDuplicateCandidates(): Promise<DuplicateCandidate[]> {
  const records: DuplicateCandidate[] = [];
  for (const table of ["legal_records", "discovery_items"] as const) {
    let after = "";
    while (true) {
      const sql = table === "legal_records"
        ? "SELECT id,title,payload_json AS payload FROM legal_records WHERE record_type='CASE' AND id>? ORDER BY id LIMIT 500"
        : "SELECT id,title,extracted_json AS payload FROM discovery_items WHERE proposed_type='CASE' AND status NOT IN ('REJECTED','PUBLISHED') AND id>? ORDER BY id LIMIT 500";
      const page = await getDb().prepare(sql).bind(after).all<{ id: string; title: string; payload: string }>();
      for (const row of page.results) records.push({ ...parse<DuplicateCandidate>(row.payload, { id: row.id }), id: row.id, title: row.title });
      if (records.length > 50000) throw new Error("Duplicate snapshot exceeds safe in-memory bound; run a database-backed identity review before staging");
      if (page.results.length < 500) break;
      after = page.results[page.results.length - 1].id;
    }
  }
  return records;
}

export async function listPublishedCasePayloads(limit = 2000): Promise<Array<{ payload: Record<string, unknown>; verification: VerificationLevel; updatedAt: string }>> {
  await ensureSchema();
  const result = await getDb().prepare("SELECT payload_json,verification,updated_at FROM legal_records WHERE record_type='CASE' AND published_at IS NOT NULL ORDER BY impact_score DESC,decision_date DESC LIMIT ?")
    .bind(Math.min(5000, Math.max(1, limit))).all<{ payload_json: string; verification: VerificationLevel; updated_at: string }>();
  return result.results.map((row) => ({ payload: parse<Record<string, unknown>>(row.payload_json, {}), verification: row.verification, updatedAt: row.updated_at }));
}

export async function getCachedDocument(normalizedUrl: string): Promise<{ contentHash: string; etag?: string; lastModified?: string } | null> {
  await ensureSchema();
  const row = await getDb().prepare("SELECT content_hash,etag,last_modified FROM source_documents WHERE normalized_url=? ORDER BY fetched_at DESC LIMIT 1").bind(normalizedUrl).first<{ content_hash: string; etag?: string; last_modified?: string }>();
  return row ? { contentHash: row.content_hash, etag: row.etag ?? undefined, lastModified: row.last_modified ?? undefined } : null;
}

export async function getRobotsState(domain: string): Promise<{ status: string; body?: string; checkedAt?: string } | null> {
  await ensureSchema();
  const row = await getDb().prepare("SELECT robots_status,robots_body,robots_checked_at FROM domain_crawl_state WHERE domain=?").bind(domain).first<{ robots_status: string; robots_body?: string; robots_checked_at?: string }>();
  return row ? { status: row.robots_status, body: row.robots_body ?? undefined, checkedAt: row.robots_checked_at ?? undefined } : null;
}

export async function saveRobotsState(domain: string, status: string, body?: string): Promise<void> {
  await ensureSchema();
  const now = new Date().toISOString();
  await getDb().prepare(`INSERT INTO domain_crawl_state (domain,robots_status,robots_checked_at,robots_body,updated_at) VALUES (?,?,?,?,?)
    ON CONFLICT(domain) DO UPDATE SET robots_status=excluded.robots_status,robots_checked_at=excluded.robots_checked_at,robots_body=excluded.robots_body,updated_at=excluded.updated_at`)
    .bind(domain, status, now, body?.slice(0, 250_000) ?? null, now).run();
}

export async function reserveDomainCrawlSlot(domain: string, intervalMs: number): Promise<number> {
  await ensureSchema();
  const db = getDb();
  const nowMs = Date.now();
  const row = await db.prepare("SELECT next_allowed_at FROM domain_crawl_state WHERE domain=?").bind(domain).first<{ next_allowed_at?: string }>();
  const priorMs = row?.next_allowed_at ? Date.parse(row.next_allowed_at) : nowMs;
  const delay = Math.max(0, priorMs - nowMs);
  const next = new Date(Math.max(nowMs, priorMs) + intervalMs).toISOString();
  const now = new Date(nowMs).toISOString();
  await db.prepare(`INSERT INTO domain_crawl_state (domain,next_allowed_at,updated_at) VALUES (?,?,?)
    ON CONFLICT(domain) DO UPDATE SET next_allowed_at=excluded.next_allowed_at,updated_at=excluded.updated_at`).bind(domain, next, now).run();
  return delay;
}

export async function saveSourceDocument(input: { contentHash: string; normalizedUrl: string; r2Key?: string; mimeType?: string; etag?: string; lastModified?: string; text?: string; extractionMethod: string }): Promise<void> {
  await ensureSchema();
  const now = new Date().toISOString();
  await getDb().prepare(`INSERT OR REPLACE INTO source_documents (content_hash,normalized_url,r2_key,mime_type,etag,last_modified,extracted_text,extraction_method,fetched_at,last_checked_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .bind(input.contentHash, input.normalizedUrl, input.r2Key ?? null, input.mimeType ?? null, input.etag ?? null, input.lastModified ?? null, input.text?.slice(0, 500_000) ?? null, input.extractionMethod, now, now).run();
}

function rowToDocument(row: Record<string, unknown>): DiscoveredDocument {
  return {
    id: String(row.id), url: String(row.url), normalizedUrl: String(row.normalized_url), sourceDomain: String(row.source_domain), sourceTier: Number(row.source_tier) as 1 | 2 | 3,
    discoveredBy: String(row.discovered_by) as DiscoveredDocument["discoveredBy"], searchQuery: row.search_query ? String(row.search_query) : undefined,
    title: row.title ? String(row.title) : undefined, mimeType: row.mime_type ? String(row.mime_type) : undefined, contentHash: row.content_hash ? String(row.content_hash) : undefined,
    relevance: String(row.relevance) as DiscoveredDocument["relevance"], relevanceScore: Number(row.relevance_score), relevanceReasons: parse<string[]>(row.relevance_reasons_json, []),
    proposedType: row.proposed_type ? String(row.proposed_type) as DiscoveredDocument["proposedType"] : undefined, aiConfidence: row.ai_confidence === null || row.ai_confidence === undefined ? undefined : Number(row.ai_confidence),
    extracted: parse(row.extracted_json, undefined), verification: String(row.verification) as VerificationLevel, verificationSources: parse<EvidenceSource[]>(row.verification_sources_json, []),
    impactScore: row.impact_score === null || row.impact_score === undefined ? undefined : Number(row.impact_score), impactReasons: parse<string[]>(row.impact_reasons_json, []),
    duplicateOf: row.duplicate_of ? String(row.duplicate_of) : undefined, duplicateReasons: parse<string[]>(row.duplicate_reasons_json, []), status: String(row.status) as DiscoveredDocument["status"],
    lastError: row.last_error ? String(row.last_error) : undefined, createdAt: String(row.created_at), updatedAt: String(row.updated_at),
  };
}
