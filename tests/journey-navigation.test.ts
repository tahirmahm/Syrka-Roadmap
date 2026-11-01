import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyNavigation,
  navigationReducer,
  navigationSchema,
  visibleNavigation,
} from "../src/living/navigation";
import { routeLayout } from "../src/living/route-layout";
import type { WorldGraph, WorldNode, WorldEdge } from "../src/living/schema";
const node = (id: string): WorldNode => ({
  id,
  label: id,
  kind:
    id === "person"
      ? "PersonProfile"
      : id.startsWith("goal")
        ? "Occupation"
        : "Capability",
  summary: "Fictional dependency benchmark",
  domain: "Research",
  skillIds: [],
  source: {
    kind: "fixture",
    reference: "test",
    version: "1",
    checkedAt: null,
    quality: "fictional",
  },
  requirement: "unknown",
  status: "available",
  evidence: [],
  actions: [],
  prerequisites: [],
});
const edge = (from: string, to: string, formal = false): WorldEdge => ({
  id: from + "-" + to,
  from,
  to,
  relation: formal ? "REQUIRES" : "CONTRIBUTES_TO",
  rationale: "Fictional test relation",
  source: {
    kind: "fixture",
    reference: "test",
    version: "1",
    checkedAt: null,
    quality: "fictional",
  },
  requirement: formal ? "formal" : "advisory",
});
const graph = (nodes: string[], edges: WorldEdge[]): WorldGraph => ({
  version: "syrka.living/1",
  nodes: nodes.map(node),
  edges,
  notice: "Fictional fixture",
  catalogueVersion: "test",
});

test("navigation opens, explicitly collapses, closes and returns with original context and camera", () => {
  const original = emptyNavigation({
    expanded: ["person"],
    view: { x: 37, y: 92, zoom: 0.72 },
  });
  const opened = navigationReducer(original, {
    type: "OPEN_NODE",
    id: "goal:a",
    goal: true,
  });
  assert.equal(opened.scale, "route");
  assert.equal(opened.routeId, "goal:a");
  assert.ok(opened.expanded.includes("goal:a"));
  assert.deepEqual(opened.camera, original.camera);
  assert.equal(
    navigationReducer(opened, { type: "OPEN_NODE", id: "goal:a", goal: true }),
    opened,
  );
  const child = navigationReducer(opened, { type: "OPEN_NODE", id: "skill:a" });
  const moved = navigationReducer(child, {
    type: "SET_CAMERA",
    camera: { x: 80, y: -65, zoom: 0.94 },
  });
  assert.equal(moved.history.length, child.history.length);
  const closed = navigationReducer(moved, { type: "CLOSE" });
  assert.equal(closed.inspectorOpen, false);
  assert.ok(closed.expanded.includes("goal:a"));
  assert.equal(closed.selected, "skill:a");
  const back = navigationReducer(closed, { type: "BACK" });
  assert.equal(back.selected, "goal:a");
  assert.deepEqual(back.camera, original.camera);
  assert.equal(back.scale, "route");
  const collapsed = navigationReducer(back, {
    type: "TOGGLE_BRANCH",
    id: "goal:a",
  });
  assert.ok(!collapsed.expanded.includes("goal:a"));
  assert.equal(collapsed.selected, "goal:a");
  assert.equal(navigationSchema.parse(collapsed).version, 1);
});

test("preview and discard restore goals-independent navigation; journal is bounded and pans do not journal", () => {
  let nav = emptyNavigation();
  nav = navigationReducer(nav, { type: "OPEN_NODE", id: "goal:a", goal: true });
  nav = navigationReducer(nav, {
    type: "SET_CAMERA",
    camera: { x: 120, y: 340, zoom: 0.8 },
  });
  const before = structuredClone(nav);
  nav = navigationReducer(nav, { type: "PREVIEW_ROUTE", id: "goal:b" });
  nav = navigationReducer(nav, { type: "OPEN_NODE", id: "bridge" });
  const restored = navigationReducer(nav, { type: "DISCARD_PREVIEW" });
  assert.deepEqual(restored, before);
  for (let i = 0; i < 60; i++)
    nav = navigationReducer(nav, { type: "OPEN_NODE", id: "node:" + i });
  assert.equal(nav.history.length, 30);
  const length = nav.history.length;
  for (let i = 0; i < 60; i++)
    nav = navigationReducer(nav, {
      type: "SET_CAMERA",
      camera: { x: i, y: i, zoom: 0.8 },
    });
  assert.equal(nav.history.length, length);
  assert.equal(
    navigationReducer(nav, {
      type: "SET_CAMERA",
      camera: { x: NaN, y: 0, zoom: 0 },
    }),
    nav,
  );
});

test("collapsing a branch retains canonically shared or pinned preparation and removes only exclusive children", () => {
  const g = graph(
    ["person", "goal:a", "goal:b", "shared", "only:a", "only:b"],
    [
      edge("shared", "goal:a"),
      edge("shared", "goal:b"),
      edge("only:a", "goal:a"),
      edge("only:b", "goal:b"),
    ],
  );
  let nav = emptyNavigation({ expanded: ["goal:a", "goal:b"] });
  nav = navigationReducer(nav, { type: "OPEN_NODE", id: "goal:a", goal: true });
  const both = visibleNavigation(g, nav, ["goal:a", "goal:b"]);
  assert.ok(both.references.get("shared")! >= 2);
  nav = navigationReducer(nav, { type: "TOGGLE_BRANCH", id: "goal:a" });
  const after = visibleNavigation(g, nav, ["goal:a", "goal:b"]);
  assert.ok(after.nodes.some((n) => n.id === "shared"));
  assert.ok(!after.nodes.some((n) => n.id === "only:a"));
  assert.equal(after.hiddenByBranch["goal:a"], 1);
  nav = navigationReducer(nav, { type: "PIN_ROUTE", id: "goal:a" });
  nav = navigationReducer(nav, { type: "TOGGLE_BRANCH", id: "goal:b" });
  const pinned = visibleNavigation(g, nav, ["goal:a", "goal:b"]);
  assert.ok(pinned.nodes.some((n) => n.id === "shared"));
  assert.ok(pinned.nodes.some((n) => n.id === "only:a"));
  assert.ok(!pinned.nodes.some((n) => n.id === "only:b"));
  assert.equal(g.nodes.length, 6); // no user record was removed by presentation.
});

test("focused route coordinates follow typed prerequisites, preserve destination anchor and distinguish contextual adjacency", () => {
  const g = graph(
    ["person", "foundation", "parallel:a", "parallel:b", "goal:a", "adjacent"],
    [
      edge("foundation", "parallel:a", true),
      edge("foundation", "parallel:b"),
      edge("parallel:a", "goal:a", true),
      edge("parallel:b", "goal:a"),
      { ...edge("adjacent", "goal:a"), relation: "RELATED_TO" },
    ],
  );
  const nav = navigationReducer(emptyNavigation(), {
    type: "OPEN_NODE",
    id: "goal:a",
    goal: true,
  });
  const previous = new Map([
    ["goal:a", { x: 390, y: 100 }],
    ["person", { x: -58, y: -58 }],
  ]);
  const layout = routeLayout(g, g.nodes, nav, previous);
  assert.deepEqual(layout.positions.get("goal:a"), previous.get("goal:a"));
  assert.ok(
    layout.positions.get("foundation")!.x <
      layout.positions.get("parallel:a")!.x,
  );
  assert.ok(
    layout.positions.get("parallel:a")!.x < layout.positions.get("goal:a")!.x,
  );
  assert.equal(
    layout.levels.get("parallel:a"),
    layout.levels.get("parallel:b"),
  );
  assert.equal(layout.levels.get("adjacent"), 0);
  assert.equal(layout.cycles.length, 0);
  const cyclic = routeLayout(
    { ...g, edges: [...g.edges, edge("parallel:a", "foundation", true)] },
    g.nodes,
    nav,
    previous,
  );
  assert.ok(
    cyclic.cycles.some(
      (c) => c.includes("foundation") && c.includes("parallel:a"),
    ),
  );
});

test("1000-node/2500-edge synthetic fixture bounds detailed disclosure and reports omitted formal requirements", () => {
  const nodes = [
    "person",
    "goal:benchmark",
    ...Array.from({ length: 998 }, (_, i) => "skill:" + i),
  ];
  const edges: WorldEdge[] = [];
  for (let i = 0; i < 998; i++)
    edges.push(edge("skill:" + i, "goal:benchmark", i < 220));
  for (let i = 0; edges.length < 2500; i++)
    edges.push({
      ...edge("skill:" + (i % 997), "skill:" + ((i + 1) % 998)),
      id: "cross:" + i,
    });
  const g = graph(nodes, edges),
    nav = navigationReducer(emptyNavigation(), {
      type: "OPEN_NODE",
      id: "goal:benchmark",
      goal: true,
    });
  const start = performance.now(),
    shown = visibleNavigation(g, nav, ["goal:benchmark"]),
    layout = routeLayout(g, shown.nodes, nav),
    elapsed = performance.now() - start;
  assert.equal(g.nodes.length, 1000);
  assert.equal(g.edges.length, 2500);
  assert.equal(shown.nodes.length, 150);
  assert.equal(shown.hiddenCount, 850);
  assert.ok(shown.hiddenRequired > 0);
  assert.equal(shown.hiddenRequired, shown.hiddenRequiredIds.length);
  assert.ok(layout.positions.size >= 150);
  console.log(
    JSON.stringify({
      benchmark: "synthetic-1000/2500 presentation",
      detailedVisible: shown.nodes.length,
      hidden: shown.hiddenCount,
      hiddenFormal: shown.hiddenRequired,
      elapsedMs: Math.round(elapsed * 100) / 100,
      note: "Node process timing only; not browser input latency or FPS",
    }),
  );
});

test("bounded disclosure reports formal AND requirements and hidden OR alternatives with source identity", () => {
  const g = graph(["person", "goal:a", "and:a", "and:b", "or:a", "or:b"], []);
  g.nodes.find((n) => n.id === "goal:a")!.requirementGroups = [
    {
      id: "and",
      operator: "AND",
      nodeIds: ["and:a", "and:b"],
      requirement: "formal",
      sourceReference: "Fictional curriculum rule",
    },
    {
      id: "or",
      operator: "OR",
      nodeIds: ["or:a", "or:b"],
      requirement: "formal",
      sourceReference: "Fictional alternative rule",
    },
  ];
  const nav = navigationReducer(emptyNavigation(), {
    type: "OPEN_NODE",
    id: "goal:a",
    goal: true,
  });
  const result = visibleNavigation(g, nav, ["goal:a"], 3);
  assert.equal(result.hiddenRequired, 1);
  assert.ok(
    result.hiddenRequirementGroups.some(
      (group) => group.operator === "AND" && group.nodeIds.length === 1,
    ),
  );
  assert.ok(
    result.hiddenRequirementGroups.some(
      (group) =>
        group.operator === "OR" &&
        group.nodeIds.length === 2 &&
        group.sourceReference === "Fictional alternative rule",
    ),
  );
  assert.ok(!result.hiddenRequiredIds.some((id) => id.startsWith("or:")));
});
