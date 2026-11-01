import { test } from "node:test";
import assert from "node:assert/strict";
import {
  constellationLayout,
  nodeSize,
  focusNetwork,
} from "../src/living/spatial";
import { buildWorld, visibleWorld } from "../src/living/engine";
import { livingDemo } from "../src/living/demos";
import { catalogue } from "../src/odyssey/server/data";
import {
  educationStateFromQuote,
  mergeCandidateClaims,
} from "../src/odyssey/documents";
import {
  supportedEducationState,
  validateRelationships,
} from "../src/living/inference";
import { emptyWorkspace, parseWorkspace } from "../src/odyssey/profile";
const fixture = () => {
  const w = livingDemo(catalogue.skills, "ppe-consulting");
  return { w, g: buildWorld(w, catalogue) };
};
test("constellation spreads across quadrants, varies hierarchy and preserves coordinates on expansion", () => {
  const { w, g } = fixture(),
    shown = visibleWorld(g, w.living!),
    a = constellationLayout(shown.nodes),
    b = constellationLayout(g.nodes, a);
  for (const [id, p] of a) assert.deepEqual(b.get(id), p);
  assert.ok(
    new Set(
      [...b.values()].map((p) => (p.x > 0 ? "e" : "w") + (p.y > 0 ? "s" : "n")),
    ).size === 4,
  );
  assert.ok(new Set(g.nodes.map(nodeSize)).size >= 3);
  assert.ok(new Set([...b.values()].map((p) => p.x)).size > g.nodes.length / 2);
  const before = shown.nodes.length;
  w.living!.expanded.push("goal:mckinsey");
  assert.ok(visibleWorld(g, w.living!).nodes.length > before);
  const network = focusNetwork(g, "goal:mckinsey", [])!;
  assert.ok(network.has("goal:mba"));
  assert.ok(network.has("goal:mckinsey"));
});
test("education lifecycle requires explicit wording and never infers a completed degree from attendance or dates", () => {
  for (const [quote, status] of [
    ["Attended Example University 2017–2019", "attended"],
    ["BSc incomplete; did not complete degree", "incomplete"],
    ["Transferred from Example University", "transferred"],
    ["Withdrew from law programme", "withdrawn"],
    ["Currently enrolled PPE, expected 2028", "current"],
    ["Graduated with BA 2022", "completed"],
    ["Example University 2019–2022", "unknown"],
  ])
    assert.equal(educationStateFromQuote(quote), status);
  assert.equal(
    supportedEducationState("completed", "did not complete the degree"),
    false,
  );
  assert.equal(
    supportedEducationState("completed", "Example University 2019–2022"),
    false,
  );
});
test("incomplete/current education remains history or enrolment and cannot become completed credential or automatic goal", () => {
  const w = emptyWorkspace();
  for (const [id, status] of [
    ["old", "incomplete"],
    ["now", "current"],
  ] as const)
    w.person.claims.push({
      id,
      kind: "qualification",
      text: "Example University " + id,
      quote: "Example University " + id,
      page: 1,
      section: "Education",
      mappings: [],
      approved: true,
      educationState: status,
    });
  const parsed = parseWorkspace(JSON.stringify(w))!,
    g = buildWorld(parsed, catalogue);
  assert.equal(
    g.nodes.find((n) => n.id === "evidence:old")!.kind,
    "AcademicProgramme",
  );
  assert.equal(
    g.nodes.find((n) => n.id === "evidence:old")!.status,
    "historical",
  );
  assert.equal(g.nodes.find((n) => n.id === "evidence:now")!.status, "working");
  assert.ok(!parsed.living?.goals.length);
});
test("AI candidates remain unchecked and do not replace user corrections", () => {
  const c = {
    id: "c",
    kind: "education" as const,
    text: "Edited description",
    quote: "Currently enrolled at Example University",
    page: 1,
    section: "Education",
    mappings: [],
    approved: true,
  };
  const out = mergeCandidateClaims(
    [c],
    [
      {
        ...c,
        text: "AI wording",
        educationState: "current",
        interpretation: "ai-candidate",
      },
    ],
  );
  assert.equal(out[0].text, "Edited description");
  assert.equal(out[0].approved, false);
  assert.equal(out[0].educationState, "current");
});
test("relationship inference accepts only quoted known-node advisory candidates and rejects invented requirements", () => {
  const { w, g } = fixture(),
    c = w.person.claims.find((c) =>
      g.nodes.some((n) => n.id === "evidence:" + c.id),
    )!;
  const r = {
    from: "evidence:" + c.id,
    to: "goal:mckinsey",
    relation: "CONTRIBUTES_TO" as const,
    rationale: "This described work may support analytical preparation.",
    claimId: c.id,
    quote: c.quote,
  };
  assert.equal(
    validateRelationships(
      { relationships: [r], uncertainties: [] },
      g,
      w.person.claims,
    ).relationships.length,
    1,
  );
  for (const patch of [
    { to: "invented" },
    { quote: "invented source" },
    { rationale: "This is mandatory and guarantees admission." },
    { from: "goal:risk" },
  ])
    assert.throws(() =>
      validateRelationships(
        { relationships: [{ ...r, ...patch }], uncertainties: [] },
        g,
        w.person.claims,
      ),
    );
  w.living!.advisoryRelationships = [
    { ...r, acceptedAt: new Date().toISOString() },
  ];
  const after = buildWorld(w, catalogue);
  const edge = after.edges.find((e) => e.rationale.startsWith("AI-suggested"))!;
  assert.equal(edge.requirement, "advisory");
  assert.equal(edge.source.quality, "advisory");
});

test("editorial directions explicitly identify broader ESCO references without asserting occupational equivalence", () => {
  const { g } = fixture(),
    risk = g.nodes.find((n) => n.id === "goal:risk")!;
  assert.equal(risk.source.kind, "editorial");
  assert.equal(risk.source.quality, "advisory");
  assert.match(risk.summary, /broader ESCO occupation/);
  assert.match(risk.summary, /not an asserted equivalent title/);
  assert.ok(
    g.edges
      .filter((e) => e.to === risk.id)
      .every((e) => e.requirement === "advisory"),
  );
});
