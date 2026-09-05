interface RobotsGroup { agents: string[]; allow: string[]; disallow: string[]; crawlDelay?: number }

export interface RobotsDecision {
  allowed: boolean;
  crawlDelaySeconds?: number;
  reason: string;
}

export function parseRobots(body: string): RobotsGroup[] {
  const groups: RobotsGroup[] = [];
  let current: RobotsGroup | undefined;
  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (field === "user-agent") {
      if (!current || current.allow.length || current.disallow.length || current.crawlDelay !== undefined) {
        current = { agents: [], allow: [], disallow: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && field === "allow") current.allow.push(value);
    else if (current && field === "disallow") current.disallow.push(value);
    else if (current && field === "crawl-delay") current.crawlDelay = Number(value);
  }
  return groups;
}

function pathMatches(rule: string, path: string): boolean {
  if (!rule) return false;
  const anchored = rule.endsWith("$");
  const escaped = (anchored ? rule.slice(0, -1) : rule).replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + (anchored ? "$" : "");
  return new RegExp(`^${escaped}`).test(path);
}

export function isAllowedByRobots(body: string, url: string, userAgent = "OpenCourtBot"): RobotsDecision {
  const groups = parseRobots(body);
  const agent = userAgent.toLowerCase();
  const matches = groups.filter((group) => group.agents.some((name) => name === "*" || agent.includes(name)));
  const applicable = matches.filter((group) => group.agents.some((name) => name !== "*"));
  const selected = applicable.length ? applicable : matches;
  if (!selected.length) return { allowed: true, reason: "No applicable robots.txt group" };
  const path = `${new URL(url).pathname}${new URL(url).search}`;
  const rules = selected.flatMap((group) => [
    ...group.allow.map((rule) => ({ rule, allow: true })),
    ...group.disallow.map((rule) => ({ rule, allow: false })),
  ]).filter((item) => pathMatches(item.rule, path)).sort((a, b) => b.rule.length - a.rule.length || Number(b.allow) - Number(a.allow));
  const winner = rules[0];
  const crawlDelaySeconds = Math.max(...selected.map((group) => group.crawlDelay ?? 0), 0) || undefined;
  return { allowed: winner?.allow ?? true, crawlDelaySeconds, reason: winner ? `Matched ${winner.allow ? "Allow" : "Disallow"}: ${winner.rule}` : "No matching path rule" };
}
