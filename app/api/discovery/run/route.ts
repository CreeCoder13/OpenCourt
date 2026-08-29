import { runDiscoveryBatch } from "../../../../lib/discovery/engine";
import { authorizeBearer, unauthorized } from "../../../../lib/server/requestAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await authorizeBearer(request, "DISCOVERY_CRON_SECRET"))) return unauthorized();
  let options: { queryOffset?: number; queryLimit?: number; processLimit?: number; topic?: string; year?: number; ongoing?: boolean; dryRun?: boolean } = {};
  try { options = await request.json() as typeof options; } catch { /* empty body uses safe defaults */ }
  if (options.topic !== undefined && (typeof options.topic !== "string" || options.topic.length > 100)) return Response.json({ error: "topic must be a string of at most 100 characters" }, { status: 400 });
  if (options.year !== undefined && (!Number.isInteger(options.year) || options.year < 1867 || options.year > new Date().getUTCFullYear() + 1)) return Response.json({ error: "year is outside the supported range" }, { status: 400 });
  if (options.ongoing !== undefined && typeof options.ongoing !== "boolean") return Response.json({ error: "ongoing must be boolean" }, { status: 400 });
  if (options.dryRun !== undefined && typeof options.dryRun !== "boolean") return Response.json({ error: "dryRun must be boolean" }, { status: 400 });
  const result = await runDiscoveryBatch(options);
  return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
