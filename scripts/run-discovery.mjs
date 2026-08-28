const endpoint = process.env.OPENCOURT_DISCOVERY_URL?.trim();
const secret = process.env.DISCOVERY_CRON_SECRET?.trim();
if (!endpoint) throw new Error("OPENCOURT_DISCOVERY_URL is not configured");
if (!secret) throw new Error("DISCOVERY_CRON_SECRET is not configured");

const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/json" }, body: JSON.stringify({ queryLimit: 12, processLimit: 8 }) });
if (!response.ok) throw new Error(`Discovery run failed with HTTP ${response.status}`);
const result = await response.json();
console.log(`Discovery complete: ${result.urlsDiscovered ?? 0} URLs added, ${result.documentsProcessed ?? 0} processed.`);
