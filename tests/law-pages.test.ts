import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { laws } from "../data/laws.ts";
import { legalMilestones, milestoneLawPages } from "../data/legalMilestones.ts";
import { lawPath } from "../data/navigation.ts";

test("every published law has a unique dedicated route", () => {
  assert.ok(laws.length > 0, "At least one law must be published");
  const slugs = laws.map((law) => law.slug);
  assert.equal(new Set(slugs).size, slugs.length, "Law slugs must be unique");

  for (const law of laws) {
    assert.match(law.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${law.title} must use a URL-safe slug`);
    assert.equal(lawPath(law.slug), `/laws/${law.slug}`);
  }
});

test("View Law Page uses reliable native navigation", () => {
  const catalogue = readFileSync(new URL("../app/laws/page.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(catalogue, /from ["']next\/link["']/);
  assert.match(catalogue, /<a\b[^>]*className="law-card-action"[^>]*href=\{lawPath\(law\.slug\)\}/);
});

test("timeline law-page actions use native links to published OpenCourt pages", () => {
  const timeline = readFileSync(new URL("../components/LegalHistoryTimeline.tsx", import.meta.url), "utf8");
  const publishedLawSlugs = new Set(laws.map((law) => law.slug));
  const milestoneIds = new Set(legalMilestones.map((milestone) => milestone.id));

  assert.doesNotMatch(timeline, /from ["']next\/link["']/);
  assert.match(timeline, /<a\b[^>]*href=\{lawPath\(milestoneLawPages\[milestone\.id\]\)\}/);

  for (const [milestoneId, lawSlug] of Object.entries(milestoneLawPages)) {
    assert.ok(milestoneIds.has(milestoneId), `Timeline link references missing milestone ${milestoneId}`);
    assert.ok(publishedLawSlugs.has(lawSlug), `Timeline link references missing law page ${lawSlug}`);
  }
});

test("every law supplies the content required by the in-depth page", () => {
  for (const law of laws) {
    assert.ok(law.title.trim(), `${law.slug} is missing a title`);
    assert.ok(law.citation.trim(), `${law.slug} is missing a citation`);
    assert.ok(law.plainLanguageSummary.trim(), `${law.slug} is missing a plain-language summary`);
    assert.ok(law.legalEffect.trim(), `${law.slug} is missing its legal effect`);
    assert.ok(law.historicalContext.trim(), `${law.slug} is missing historical context`);
    assert.ok(law.sectionsRelevantToIndigenousPeoples.length > 0, `${law.slug} needs relevant provisions`);
    assert.ok(law.communitiesAffected.length > 0, `${law.slug} needs affected communities`);
    assert.ok(law.categories.length > 0, `${law.slug} needs legal topics`);
    assert.ok(law.impactReasons.length > 0, `${law.slug} needs impact reasons`);
    assert.ok(law.additionalSources.length > 0, `${law.slug} needs an authoritative source`);
    assert.equal(new URL(law.officialSourceUrl).protocol, "https:", `${law.slug} must use an HTTPS official source`);
  }
});

test("the detail template exposes all research sections", () => {
  const detail = readFileSync(new URL("../app/laws/[slug]/page.tsx", import.meta.url), "utf8");
  for (const id of ["overview", "provisions", "scope", "history", "connections", "importance", "sources"]) {
    assert.match(detail, new RegExp(`id=["']${id}["']`), `Missing ${id} section`);
  }
  assert.match(detail, /generateStaticParams\(\)/);
});
