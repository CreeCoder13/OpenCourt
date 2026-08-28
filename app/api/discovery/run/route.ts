import { runDiscoveryBatch } from "../../../../lib/discovery/engine";
import { authorizeBearer, unauthorized } from "../../../../lib/server/requestAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await authorizeBearer(request, "DISCOVERY_CRON_SECRET"))) return unauthorized();
  let options: { queryOffset?: number; queryLimit?: number; processLimit?: number } = {};
  try { options = await request.json() as typeof options; } catch { /* empty body uses safe defaults */ }
  const result = await runDiscoveryBatch(options);
  return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
