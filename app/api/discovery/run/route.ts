import { runDiscoveryBatch } from "../../../../lib/discovery/engine";
import { authorizeBearer, unauthorized } from "../../../../lib/server/requestAuth";
import { validateDiscoveryOptions } from "../../../../lib/discovery/options";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request) {
  if (!(await authorizeBearer(request, "DISCOVERY_CRON_SECRET"))) return unauthorized();
  let options: Record<string, unknown> = {};
  try { options = await request.json() as typeof options; } catch { /* empty body uses safe defaults */ }
  if (options.mode !== undefined && (typeof options.mode !== "string" || !["incremental", "broad", "backfill"].includes(options.mode))) return Response.json({ error: "mode must be incremental, broad, or backfill" }, { status: 400 });
  let validated;
  try { validated = validateDiscoveryOptions(options); } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Invalid options" }, { status: 400 }); }
  const result = await runDiscoveryBatch({ ...validated, nationwide: true });
  return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
