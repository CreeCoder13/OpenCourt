import type { CaseRecord, Community, Treaty, Topic } from '../../data/types.ts';

export const jurisdictions = ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia', 'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon'];
export const courtLevels = ['Supreme Court of Canada', 'Federal Court of Appeal', 'Federal Court', 'Provincial Courts of Appeal', 'Superior Courts', 'Provincial Courts', 'Tribunals', 'Unclassified'];
export const groups = ['First Nations', 'Métis', 'Inuit', 'Other'];
export type QualityKey = 'Verified' | 'Secondary Source' | 'Needs Verification' | 'Draft' | 'Published' | 'Missing primary source' | 'Missing community' | 'Missing legal topics' | 'Treaty association to review' | 'Missing related cases' | 'Placeholder text' | 'Verification older than 365 days' | 'Missing verification date';
export interface CoverageCase {
  id: string; slug: string; name: string; citation: string; court: string; level: string;
  provinces: string[]; groups: string[]; communities: string[]; treaties: string[]; topics: string[];
  decisionDate: string; createdAt: string; updatedAt: string; lastVerified: string;
  verification: string; contentStatus: string; status: string; ongoing: boolean; appeal: boolean;
  quality: QualityKey[];
}
export interface Catalogs { communities: Community[]; treaties: Treaty[]; topics: Topic[] }
export interface ScanRun { id: string; trigger_type: string; started_at: string; completed_at: string | null; queries_run: number; urls_discovered: number; documents_processed: number; status: string }
export interface Pipeline {
  queries: number; urls: number; processed: number; candidates: number; verified: number; review: number; duplicates: number; rejected: number; failures: number; discovered: number; published: number;
}
export interface CoverageSnapshot extends Catalogs {
  cases: CoverageCase[]; pipeline: Pipeline | null; runs: ScanRun[];
  relationships: { from_record_id: string; title: string; target_label: string; relationship_type: string; created_at: string }[];
  generatedAt: string; storage: 'live' | 'unavailable'; warnings: string[];
}
export interface Filters { province: string; court: string; level: string; group: string; treaty: string; topic: string; verification: string; content: string; from: string; to: string }
export const emptyFilters: Filters = { province: '', court: '', level: '', group: '', treaty: '', topic: '', verification: '', content: '', from: '', to: '' };
export const normalize = (value: string) => value.trim().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const strings = (value: unknown): string[] => [...new Set((Array.isArray(value) ? value : typeof value === 'string' ? [value] : []).map(text).filter(Boolean))];
export function validDate(value: unknown): string {
  const candidate = text(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidate)) return '';
  const timestamp = Date.parse(candidate);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === candidate ? candidate : '';
}
function levelFor(court: string, level: string): string {
  const value = normalize(`${court} ${level}`);
  if (/supreme court of canada|\bscc\b/.test(value) || normalize(court) === 'supreme court') return courtLevels[0];
  if (/federal court of appeal|\bfca\b/.test(value)) return courtLevels[1];
  if (/federal court|\bfc\b/.test(value)) return courtLevels[2];
  if (/court of appeal|appeal court|cour d appel/.test(value)) return courtLevels[3];
  if (/tribunal|board|commission/.test(value)) return courtLevels[6];
  if (/superior|supreme court|king s bench|queen s bench|court of justice.*nunavut/.test(value)) return courtLevels[4];
  if (/provincial|territorial|court of justice|cour du quebec/.test(value)) return courtLevels[5];
  return courtLevels[7];
}
const regionAliases: Record<string, string> = { ab:'Alberta',bc:'British Columbia',mb:'Manitoba',nb:'New Brunswick',nl:'Newfoundland and Labrador',nt:'Northwest Territories',ns:'Nova Scotia',nu:'Nunavut',on:'Ontario',pe:'Prince Edward Island',qc:'Quebec',sk:'Saskatchewan',yt:'Yukon',canada:'Canada / national' };
function regions(value: unknown): string[] {
  return [...new Set(strings(value).flatMap((entry) => entry.split(/[,;]/)).map((entry) => jurisdictions.find((name) => normalize(name) === normalize(entry)) ?? regionAliases[normalize(entry)] ?? entry.trim()).filter(Boolean))];
}
const hasUrl = (value: unknown) => { try { return ['https:', 'http:'].includes(new URL(text(value)).protocol); } catch { return false; } };
export function makeCoverageCase(payload: Record<string, unknown>, now: string, row?: Record<string, unknown>): CoverageCase {
  const verification = row ? ({ VERIFIED_PRIMARY:'Verified', VERIFIED_MULTIPLE:'Verified', PARTIALLY_VERIFIED:'Secondary Source', UNVERIFIED:'Needs Verification' }[text(row.verification)] ?? 'Needs Verification') : text(payload.verificationLevel) || 'Needs Verification';
  const contentStatus = row ? (row.published_at ? 'Published' : 'Draft') : text(payload.contentStatus) || 'Draft';
  const status = text(payload.currentStatus) || text(payload.currentLegalStatus) || text(payload.status);
  const statusText = normalize(`${status} ${text(payload.outcome)} ${text(payload.decisionOutcome)}`);
  const terminal = /settled|discontinued/.test(statusText);
  const appeal = !terminal && /appeal pending|under appeal|appeal hearing scheduled|supreme court leave|supreme court hearing scheduled/.test(statusText);
  const ongoing = !terminal && (appeal || payload.caseType === 'ongoing' || /ongoing|filed|awaiting|hearing scheduled|hearing underway|decision reserved/.test(statusText));
  const decisionDate = validDate(row?.decision_date) || validDate(payload.decisionDate);
  const lastVerified = validDate(row?.last_verified_at) || validDate(payload.lastVerified);
  const communityNames = strings(payload.indigenousCommunities ?? payload.IndigenousNation);
  const topicNames = strings(payload.legalTopics ?? payload.categories);
  // Seed records use legalIssues for the topic labels and leave categories empty.
  if (!topicNames.length) topicNames.push(...strings(payload.legalIssues));
  const treatyNames = strings(payload.treaties ?? payload.treaty);
  const sourceList = Array.isArray(payload.sources) ? payload.sources : Array.isArray(payload.verificationSources) ? payload.verificationSources : [];
  const primary = sourceList.some((raw) => raw && typeof raw === 'object' && ('type' in raw && raw.type === 'Primary' || 'authoritative' in raw && raw.authoritative === true) && 'url' in raw && hasUrl(raw.url)) || hasUrl(payload.officialDecisionUrl);
  const related = [...strings(payload.casesCited), ...strings(payload.casesCiting)];
  const storedRelationship = row?.has_case_relationship === 1;
  const quality: QualityKey[] = [];
  if (['Verified','Secondary Source','Needs Verification'].includes(verification)) quality.push(verification as QualityKey);
  if (['Draft','Published'].includes(contentStatus)) quality.push(contentStatus as QualityKey);
  if (!primary) quality.push('Missing primary source');
  if (!communityNames.length) quality.push('Missing community');
  if (!topicNames.length) quality.push('Missing legal topics');
  if (!treatyNames.length && topicNames.some((topic) => /treaty/i.test(topic))) quality.push('Treaty association to review');
  if (!storedRelationship && !related.length && !(Array.isArray(payload.relatedCases) && payload.relatedCases.length)) quality.push('Missing related cases');
  if (!lastVerified) quality.push('Missing verification date');
  else if (Date.parse(now) - Date.parse(lastVerified) > 365 * 86400000) quality.push('Verification older than 365 days');
  const narrative = ['summaryShort','summaryFull','facts','indigenousArgument','otherPartyArgument','beforeCase','decision','plainLanguageSummary','background','legalQuestion','courtDecision'].map((key) => text(payload[key])).join(' ');
  if (/\bTODO\b|\bTBD\b|lorem ipsum|placeholder|summary (?:pending|not yet available)|the indigenous parties asked the court to|the opposing parties advanced the position|the governing doctrine or its application remained contested/i.test(narrative)) quality.push('Placeholder text');
  const court = text(row?.court) || text(payload.court) || 'Unknown court';
  return { id:text(row?.id) || text(payload.id), slug:text(row?.slug) || text(payload.slug), name:text(row?.title) || text(payload.caseName) || 'Untitled legal record', citation:text(row?.citation) || text(payload.neutralCitation) || text(payload.officialCitation) || text(payload.reportedCitation), court, level:levelFor(court,text(payload.courtLevel)), provinces:regions(payload.provinceTerritory), groups:strings(payload.indigenousGroup ?? payload.IndigenousPeople), communities:communityNames, treaties:treatyNames, topics:topicNames, decisionDate, createdAt:validDate(payload.createdAt ?? payload.dateDiscovered) || validDate(row?.created_at), updatedAt:validDate(row?.updated_at) || validDate(payload.updatedAt), lastVerified, verification, contentStatus, status:status || 'Not classified', ongoing, appeal, quality };
}
export function mergeCases(curated: CoverageCase[], stored: CoverageCase[]): CoverageCase[] {
  // Match only stable identity: slug or full citation, never fuzzy case names.
  const result: CoverageCase[] = [];
  const bySlug = new Map<string, number>(); const byCitation = new Map<string, number>();
  for (const record of [...curated, ...stored]) {
    const citation = normalize(record.citation);
    const index = bySlug.get(record.slug) ?? (citation ? byCitation.get(citation) : undefined);
    if (index === undefined) {
      const next = result.push(record) - 1;
      if (record.slug) bySlug.set(record.slug, next);
      if (citation) byCitation.set(citation, next);
    } else {
      // Keep the curated record, as the public collection does, and deduplicate its DB seed.
      // Register aliases too, so subsequent copies of the same record cannot inflate totals.
      if (record.slug) bySlug.set(record.slug, index);
      if (citation) byCitation.set(citation, index);
    }
  }
  return result;
}
function matchesName(values: string[], names: string[]) { const keys = new Set(names.map(normalize)); return values.some((value) => keys.has(normalize(value))); }
export function connectCatalogs(records: CoverageCase[], catalogs: Catalogs): CoverageCase[] {
  return records.map((record) => {
    const communities = catalogs.communities.filter((community) => community.caseSlugs.includes(record.slug) || matchesName(record.communities,[community.name,community.slug,community.id,...community.alternateNames]));
    const treaties = catalogs.treaties.filter((treaty) => treaty.caseSlugs.includes(record.slug) || matchesName(record.treaties,[treaty.name,treaty.slug,treaty.id]));
    const topics = catalogs.topics.filter((topic) => topic.relatedCases.includes(record.slug) || matchesName(record.topics,[topic.name,topic.slug,topic.id]));
    const canonical = (values: string[], entities: { name: string; slug: string; id: string; alternateNames?: string[] }[]) => [...new Set(values.map((value) => entities.find((entity) => matchesName([value],[entity.name,entity.slug,entity.id,...entity.alternateNames ?? []]))?.name ?? value))];
    const linked = { ...record, communities:[...new Set([...canonical(record.communities,communities),...communities.map((c) => c.name)])], treaties:[...new Set([...canonical(record.treaties,treaties),...treaties.map((t) => t.name)])], topics:[...new Set([...canonical(record.topics,topics),...topics.map((t) => t.name)])] };
    linked.quality = record.quality.filter((key) => !(key === 'Missing community' && linked.communities.length) && !(key === 'Missing legal topics' && linked.topics.length) && !(key === 'Treaty association to review' && linked.treaties.length));
    return linked;
  });
}
export function filterCases(records: CoverageCase[], filters: Filters): CoverageCase[] {
  return records.filter((record) => (!filters.province || record.provinces.includes(filters.province)) && (!filters.court || record.court === filters.court) && (!filters.level || record.level === filters.level) && (!filters.group || record.groups.includes(filters.group)) && (!filters.treaty || record.treaties.includes(filters.treaty)) && (!filters.topic || record.topics.includes(filters.topic)) && (!filters.verification || record.verification === filters.verification) && (!filters.content || record.contentStatus === filters.content) && (!filters.from || !!record.decisionDate && record.decisionDate >= filters.from) && (!filters.to || !!record.decisionDate && record.decisionDate <= filters.to));
}
export const percent = (count: number, total: number) => total ? `${(count / total * 100).toFixed(1)}%` : '—';
export function priority(count: number, maximum: number): 'High Priority' | 'Medium Priority' | 'Healthy' {
  return count === 0 ? 'High Priority' : count <= 2 || count < maximum * .2 ? 'Medium Priority' : 'Healthy';
}
export interface CoverageRow { name: string; count: number; verified: number; ongoing: number; share: string; first: string; latest: string; records: CoverageCase[]; priority: ReturnType<typeof priority> }
export function rowsFor(records: CoverageCase[], names: string[], values: (record: CoverageCase) => string[]): CoverageRow[] {
  const buckets = new Map([...new Set([...names,...records.flatMap(values)])].map((name) => [name, [] as CoverageCase[]]));
  for (const record of records) for (const name of new Set(values(record))) buckets.get(name)?.push(record);
  const maximum = Math.max(0,...[...buckets.values()].map((bucket) => bucket.length));
  return [...buckets].map(([name, bucket]) => {
    const dates = bucket.map((record) => record.decisionDate).filter(Boolean).sort();
    return { name, count:bucket.length, verified:bucket.filter((record) => record.verification === 'Verified').length, ongoing:bucket.filter((record) => record.ongoing).length, share:percent(bucket.length,records.length), first:dates[0] || '', latest:dates.at(-1) || '', records:bucket, priority:priority(bucket.length,maximum) };
  }).sort((a,b) => b.count - a.count || a.name.localeCompare(b.name));
}
export function decade(record: CoverageCase): string {
  if (!record.decisionDate) return 'Unknown / no decision';
  const year = Number(record.decisionDate.slice(0,4));
  return year < 1950 ? 'Pre-1950' : `${Math.floor(year / 10) * 10}s`;
}
export function curatedCases(records: CaseRecord[], now: string) { return records.map((record) => makeCoverageCase(record as unknown as Record<string,unknown>,now)); }
