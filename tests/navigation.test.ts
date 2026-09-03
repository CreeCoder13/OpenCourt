import assert from "node:assert/strict";
import test from "node:test";

import { homeSectionLinks, primaryNavigation } from "../data/navigation.ts";

test("primary header navigation keeps the approved order and routes", () => {
  assert.deepEqual(primaryNavigation, [
    ["Timeline", "/timeline"],
    ["Cases", "/cases"],
    ["Laws", "/laws"],
    ["Indigenous Communities", "/communities"],
    ["Legal Definitions", "/topics"],
    ["Treaties", "/treaties"],
  ]);
});

test("home section links open the full cases and legal definitions pages", () => {
  assert.deepEqual(homeSectionLinks, {
    allCases: "/cases",
    allDefinitions: "/topics",
  });
});
