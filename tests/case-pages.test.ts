import assert from "node:assert/strict";
import test from "node:test";

import { allCases } from "../data/cases.ts";
import { casePath } from "../data/navigation.ts";

const requiredTextFields = [
  "slug",
  "caseName",
  "officialCitation",
  "court",
  "decisionDate",
  "summaryShort",
  "summaryFull",
  "facts",
  "decision",
  "importance",
  "beforeCase",
  "afterCase",
] as const;

test("every published case has a unique, dedicated route", () => {
  assert.ok(allCases.length > 0, "At least one case must be published");

  const slugs = allCases.map((item) => item.slug);
  assert.equal(new Set(slugs).size, slugs.length, "Case slugs must be unique");

  for (const item of allCases) {
    assert.match(item.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${item.caseName} must use a URL-safe slug`);
    assert.equal(casePath(item.slug), `/cases/${item.slug}`);
  }
});

test("every published case can render the complete detail-page content", () => {
  for (const item of allCases) {
    for (const field of requiredTextFields) {
      assert.ok(item[field].trim(), `${item.slug} is missing ${field}`);
    }

    assert.ok(item.parties.length > 0, `${item.slug} needs at least one party`);
    assert.ok(item.indigenousCommunities.length > 0, `${item.slug} needs an Indigenous party or community`);
    assert.ok(item.legalTopics.length > 0, `${item.slug} needs at least one legal topic`);
    assert.ok(item.sources.length > 0, `${item.slug} needs at least one source`);
    assert.ok(!Number.isNaN(Date.parse(item.decisionDate)), `${item.slug} has an invalid decision date`);

    for (const source of item.sources) {
      const url = new URL(source.url);
      assert.ok(url.protocol === "https:" || url.protocol === "http:", `${item.slug} has an invalid source URL`);
    }
  }
});

test("every related-case link resolves to a published case", () => {
  const publishedSlugs = new Set(allCases.map((item) => item.slug));

  for (const item of allCases) {
    for (const relationship of item.relatedCases) {
      assert.ok(publishedSlugs.has(relationship.caseSlug), `${item.slug} links to missing case ${relationship.caseSlug}`);
    }
  }
});
