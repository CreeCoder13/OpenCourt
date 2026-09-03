import 'server-only';
import { ensureSchema, getDb } from '../../db';
import { allCases } from '../../data/cases';
import { communities, treaties, topics } from '../../data/catalog';
import { connectCatalogs, curatedCases, makeCoverageCase, mergeCases } from '../coverage/model';
import type { CoverageSnapshot, CoverageCase, Pipeline, ScanRun } from '../coverage/model';

export async function getCoverageSnapshot(): Promise<CoverageSnapshot> {
  const generatedAt = new Date().toISOString();
  const catalogs = { communities, treaties, topics };
  const curated = curatedCases(allCases, generatedAt);
  const base: CoverageSnapshot = { ...catalogs, cases:connectCatalogs(curated,catalogs), pipeline:null, runs:[], relationships:[], generatedAt, storage:'unavailable', warnings:[] };
  try {
    await ensureSchema();
    const db = getDb();
    const stored: CoverageCase[] = [];
    let cursor = '';
    // Keyset pages avoid the public listing's limit and keep individual D1 responses bounded.
    for (;;) {
      const page = await db.prepare("SELECT l.*,EXISTS(SELECT 1 FROM legal_relationships r WHERE r.from_record_id=l.id AND r.relationship_type IN ('CITES_CASE','RELATED_CASE','Related','Relied on','Followed','Distinguished','Expanded','Limited','Overruled','Applied')) AS has_case_relationship FROM legal_records l WHERE l.record_type='CASE' AND l.id>? ORDER BY l.id LIMIT 250").bind(cursor).all<Record<string,unknown>>();
      for (const row of page.results) {
        let payload: Record<string,unknown> = {};
        try { const parsed: unknown = JSON.parse(String(row.payload_json)); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); payload = parsed as Record<string,unknown>; }
        catch { base.warnings.push(`Stored case ${String(row.id)} has an unreadable payload; available record fields are included.`); }
        stored.push(makeCoverageCase(payload,generatedAt,row));
      }
      if (page.results.length < 250) break;
      cursor = String(page.results.at(-1)!.id);
    }
    base.cases = connectCatalogs(mergeCases(curated,stored),catalogs);
    base.storage = 'live';
    try {
      const [pipeline, runs, relationships] = await Promise.all([
        db.prepare(`SELECT
          (SELECT COALESCE(SUM(queries_run),0) FROM scan_runs) AS queries,
          (SELECT COALESCE(SUM(urls_discovered),0) FROM scan_runs) AS urls,
          (SELECT COALESCE(SUM(documents_processed),0) FROM scan_runs) AS processed,
          COUNT(*) AS discovered,
          COALESCE(SUM(proposed_type='CASE'),0) AS candidates,
          COALESCE(SUM(proposed_type='CASE' AND verification IN ('VERIFIED_PRIMARY','VERIFIED_MULTIPLE')),0) AS verified,
          COALESCE(SUM(status='REVIEW'),0) AS review,
          COALESCE(SUM(duplicate_of IS NOT NULL),0) AS duplicates,
          COALESCE(SUM(status='REJECTED'),0) AS rejected,
          COALESCE(SUM(status='FAILED'),0) AS failures,
          COALESCE(SUM(status='PUBLISHED'),0) AS published
          FROM discovery_items`).first<Pipeline>(),
        db.prepare('SELECT id,trigger_type,started_at,completed_at,queries_run,urls_discovered,documents_processed,status FROM scan_runs ORDER BY started_at DESC LIMIT 20').all<ScanRun>(),
        db.prepare(`SELECT r.from_record_id,COALESCE(l.title,r.from_record_id) AS title,COALESCE(r.target_label,r.to_record_id,'Unlabelled') AS target_label,r.relationship_type,r.created_at FROM legal_relationships r LEFT JOIN legal_records l ON l.id=r.from_record_id ORDER BY r.created_at DESC LIMIT 10`).all<CoverageSnapshot['relationships'][number]>(),
      ]);
      base.pipeline = pipeline; base.runs = runs.results; base.relationships = relationships.results;
    } catch { base.warnings.push('Discovery history is unavailable. Case coverage is loaded; retry to refresh pipeline data.'); }
  } catch { base.warnings.push('Live database unavailable. Coverage shows the bundled curated collection only; live records and discovery metrics may be missing.'); }
  return base;
}
