import 'server-only';

/**
 * Returns the OpenCourt API credential for server-side requests.
 *
 * Keep all callers in Server Components, Server Actions, or App Router route
 * handlers. The `server-only` marker makes the build fail if client code ever
 * imports this module.
 */
export function getOpencApiKey(): string {
  const apiKey = process.env.OPENC_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('OPENC_API_KEY is not configured');
  }

  return apiKey;
}
