import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generateRoadmap,
  prerequisiteOrder,
  addAlternatives,
  assessEligibility,
} from "../src/lib/engine";
import { demoProfile, destinations, skillById } from "../src/data/ontology";
import { importPassport } from "../src/lib/passport";
import { readState } from "../src/lib/storage";
test("all destination graphs respect prerequisite ordering and have a connected destination", () => {
  for (const d of destinations) {
    const r = generateRoadmap(demoProfile, d.id);
    const ids = r.nodes.map((n) => n.id);
    for (const e of r.edges) {
      assert.ok(ids.includes(e.source) && ids.includes(e.target));
      assert.ok(ids.indexOf(e.source) < ids.indexOf(e.target));
    }
    assert.ok(r.edges.some((e) => e.target === "destination"));
  }
});
test("different profiles and destinations change computed requirements and evidence", () => {
  const a = generateRoadmap(demoProfile, "product-designer");
  const b = generateRoadmap({ ...demoProfile, evidence: [] }, "data-analyst");
  assert.notDeepEqual(
    a.nodes.map((n) => n.id),
    b.nodes.map((n) => n.id),
  );
  assert.equal(b.matches.filter((m) => m.status === "supported").length, 0);
  assert.ok(a.matches.some((m) => m.status === "supported"));
});
test("cycle detection fails explicitly rather than recursing forever", () => {
  const catalog = {
    a: { ...skillById.data, id: "a", prerequisites: ["b"] },
    b: { ...skillById.data, id: "b", prerequisites: ["a"] },
  };
  assert.throws(() => prerequisiteOrder(["a"], catalog), /Cyclic/);
  assert.throws(() => prerequisiteOrder(["nope"]), /Unknown/);
});
test("inferred and self-reported evidence never become verified", () => {
  const r = generateRoadmap(demoProfile, "product-designer");
  assert.equal(
    r.nodes.find((n) => n.id === "storytelling")?.status,
    "inferred",
  );
  assert.equal(
    r.matches.find((m) => m.skill.id === "storytelling")?.status,
    "uncertain",
  );
});
test("withdrawn consent excludes evidence", () => {
  const r = generateRoadmap(
    {
      ...demoProfile,
      evidence: demoProfile.evidence.map((e) => ({ ...e, consent: false })),
    },
    "data-analyst",
  );
  assert.ok(r.matches.every((m) => m.strength === 0));
});
test("progress changes status without changing source evidence", () => {
  const copy = structuredClone(demoProfile);
  const r = generateRoadmap(copy, "frontend-developer", ["js"], ["react"]);
  assert.equal(r.nodes.find((n) => n.id === "js")?.status, "completed");
  assert.equal(r.nodes.find((n) => n.id === "react")?.status, "in-progress");
  assert.deepEqual(copy, demoProfile);
});
test("expansion adds two learning alternatives and collapses cleanly", () => {
  const r = generateRoadmap(demoProfile, "product-designer");
  const expanded = addAlternatives(r, ["design"]);
  assert.equal(expanded.nodes.length, r.nodes.length + 2);
  assert.equal(expanded.edges.filter((e) => e.alternative).length, 2);
  assert.deepEqual(addAlternatives(r, []), r);
});
test("Passport adapter requires consent, provenance and valid timestamps", () => {
  const input = {
    version: 1,
    name: "A",
    headline: "B",
    hoursPerWeek: 6,
    consent: true,
    evidence: demoProfile.evidence,
  };
  const p = importPassport(input);
  assert.equal(p.evidence[0].sourceRecordId, "project-01");
  assert.throws(() => importPassport({ ...input, consent: false }));
  assert.throws(() =>
    importPassport({
      ...input,
      evidence: [{ ...demoProfile.evidence[0], timestamp: "yesterday" }],
    }),
  );
});
test("untrusted issuer claims are downgraded on import", () => {
  const p = importPassport({
    version: 1,
    name: "A",
    headline: "B",
    hoursPerWeek: 6,
    consent: true,
    evidence: [
      { ...demoProfile.evidence[0], verification: "institution-verified" },
    ],
  });
  assert.equal(p.evidence[0].verification, "document-supported");
  assert.match(p.evidence[0].title, /not authenticated/);
});
test("eligibility refuses outdated or insufficient sources and checks verification", () => {
  assert.equal(
    assessEligibility(demoProfile, [], false).status,
    "Source outdated or unavailable",
  );
  assert.equal(
    assessEligibility(
      demoProfile,
      [
        {
          id: "r",
          label: "Verified data skill",
          skillId: "data",
          requiresVerified: true,
        },
      ],
      true,
    ).status,
    "Potentially eligible, confirmation required",
  );
  assert.equal(
    assessEligibility(
      demoProfile,
      [{ id: "r", label: "Degree", requiresVerified: true }],
      true,
    ).status,
    "Insufficient information",
  );
});
test("corrupt persisted data fails safely", () => {
  assert.equal(readState("{"), null);
  assert.equal(readState('{"version":99}'), null);
});
test("official ESCO requirements remain distinct from local learning claims", () => {
  const r = generateRoadmap(demoProfile, "product-designer");
  assert.ok(r.sourceRequirements.length > 10);
  assert.ok(
    r.sourceRequirements.every((s) =>
      s.id.startsWith("http://data.europa.eu/esco/skill/"),
    ),
  );
  assert.ok(r.sourceRequirements.every((s) => s.status === "missing"));
  const expanded = addAlternatives(r, ["requirements"]);
  assert.equal(
    expanded.nodes.length,
    r.nodes.length + r.sourceRequirements.length,
  );
});
