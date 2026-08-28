export class DomainRateLimiter {
  private readonly nextAllowed = new Map<string, number>();

  async wait(domain: string, requests: number, perSeconds: number, now = Date.now()): Promise<number> {
    const interval = Math.ceil((perSeconds * 1000) / Math.max(1, requests));
    const next = this.nextAllowed.get(domain) ?? now;
    const delay = Math.max(0, next - now);
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    this.nextAllowed.set(domain, Math.max(now, next) + interval);
    return delay;
  }

  peekDelay(domain: string, now = Date.now()): number {
    return Math.max(0, (this.nextAllowed.get(domain) ?? now) - now);
  }
}
