import { aiUsageToday, listReviewItems, reviewItem } from "../../../../db";
import { authorizeBearer, unauthorized } from "../../../../lib/server/requestAuth";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await authorizeBearer(request, "ADMIN_REVIEW_TOKEN"))) return unauthorized();
  const [items, usage] = await Promise.all([listReviewItems(75), aiUsageToday()]);
  return Response.json({ items, usage }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!(await authorizeBearer(request, "ADMIN_REVIEW_TOKEN"))) return unauthorized();
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  const value = body as { id?: unknown; action?: unknown; note?: unknown };
  if (typeof value.id !== "string" || (value.action !== "publish" && value.action !== "reject") || (value.note !== undefined && typeof value.note !== "string")) {
    return Response.json({ error: "Expected id and publish/reject action" }, { status: 400 });
  }
  try {
    await reviewItem(value.id, value.action, value.note?.slice(0, 1000));
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Review action failed" }, { status: 409 });
  }
}
