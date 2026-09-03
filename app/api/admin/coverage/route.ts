import { authorizeBearer, unauthorized } from '../../../../lib/server/requestAuth';
import { getCoverageSnapshot } from '../../../../lib/server/coverage';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  if (!(await authorizeBearer(request, 'ADMIN_REVIEW_TOKEN'))) return unauthorized();
  return Response.json(await getCoverageSnapshot(), { headers: { 'Cache-Control':'private, no-store', 'Vary':'Authorization' } });
}
