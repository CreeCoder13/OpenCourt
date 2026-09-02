import assert from "node:assert/strict";
import test from "node:test";

import { primaryNavigation } from "../data/navigation.ts";

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
