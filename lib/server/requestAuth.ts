import "server-only";

async function digest(value: string): Promise<ArrayBuffer> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
}

function equalBytes(left: ArrayBuffer, right: ArrayBuffer): boolean {
  const a = new Uint8Array(left); const b = new Uint8Array(right);
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

export async function authorizeBearer(request: Request, environmentName: "ADMIN_REVIEW_TOKEN" | "DISCOVERY_CRON_SECRET"): Promise<boolean> {
  const expected = process.env[environmentName]?.trim();
  const supplied = request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!expected || !supplied) return false;
  return equalBytes(await digest(expected), await digest(supplied));
}

export const unauthorized = () => Response.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
