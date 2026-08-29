export interface FetchRetryOptions {
  attempts?: number;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

export async function fetchWithRetry(url: string | URL, init: RequestInit = {}, options: FetchRetryOptions = {}): Promise<Response> {
  const attempts = Math.max(1, Math.min(5, options.attempts ?? 3));
  const timeoutMs = Math.max(1_000, Math.min(60_000, options.timeoutMs ?? 15_000));
  const fetcher = options.fetcher ?? fetch;
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetcher(url, { ...init, signal: init.signal ?? AbortSignal.timeout(timeoutMs) });
      if (response.ok || ![408, 425, 429, 500, 502, 503, 504].includes(response.status) || attempt === attempts) return response;
      lastError = new Error(`Temporary HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
    }
    await new Promise((resolve) => setTimeout(resolve, Math.min(2_000, 200 * 2 ** (attempt - 1))));
  }
  throw lastError instanceof Error ? lastError : new Error("Request failed after retries");
}
