import test from "node:test";
import assert from "node:assert/strict";
import { parseSearchOutput, skillNameFromPackage } from "../src/skills.js";

test("parses skills find output", () => {
  const output = [
    "mattpocock/skills@grill-me            1.4M installs",
    "mattpocock/skills@grilling            966.3K installs",
    "mattpocock/skills@grill-me            1.4M installs",
  ].join("\n");
  const rows = parseSearchOutput(output);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].package, "mattpocock/skills@grill-me");
  assert.equal(rows[0].installs, "1.4M");
});

test("extracts skill name from package", () => {
  assert.equal(skillNameFromPackage("mattpocock/skills@grill-me"), "grill-me");
  assert.equal(skillNameFromPackage("notion"), "notion");
});
