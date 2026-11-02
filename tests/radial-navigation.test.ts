import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyNavigation,
  migrateRadialNavigation,
  navigationReducer,
  navigationSchema,
  type NavigationState,
} from "../src/living/navigation";
const reduce = navigationReducer;
const wheel = () => migrateRadialNavigation(emptyNavigation());

test("old v1 navigation parses unchanged while constellation presentation migrates to a clean wheel", () => {
  const old = emptyNavigation({
    selected: "evidence:old",
    expanded: ["person", "goal:old"],
    view: { x: 999, y: -750, zoom: 0.18 },
  });
  old.quiet = true;
  old.pinned = ["goal:research"];
  old.anchors = { "goal:old": { x: 4, y: 9 } };
  old.history = reduce(emptyNavigation(), {
    type: "OPEN_NODE",
    id: "goal:prior",
    goal: true,
  }).history;
  assert.deepEqual(navigationSchema.parse(old), old);
  const before = structuredClone(old),
    migrated = migrateRadialNavigation(old);
  assert.equal(migrated.radialVersion, 1);
  assert.equal(migrated.domainId, null);
  assert.equal(migrated.scale, "overview");
  assert.equal(migrated.inspectorOpen, false);
  assert.equal(migrated.selected, null);
  assert.deepEqual(migrated.expanded, []);
  assert.deepEqual(migrated.camera, { x: 0, y: 0, zoom: 1 });
  assert.deepEqual(migrated.history, []);
  assert.equal(migrated.quiet, true);
  assert.deepEqual(migrated.pinned, ["goal:research"]);
  assert.equal(migrated.anchors, undefined);
  assert.deepEqual(old, before);
});

test("valid radial context restores without losing its useful camera; unavailable domains return to wheel", () => {
  let state = reduce(wheel(), { type: "OPEN_DISCIPLINE", id: "research" });
  state = reduce(state, { type: "OPEN_NODE", id: "project:research" });
  state = reduce(state, { type: "TOGGLE_BRANCH", id: "project:research" });
  state = reduce(state, {
    type: "SET_CAMERA",
    camera: { x: 120, y: 250, zoom: 0.95 },
  });
  assert.deepEqual(
    migrateRadialNavigation(state, ["research", "analysis"]),
    state,
  );
  assert.equal(migrateRadialNavigation(state).domainId, "research"); // Loading callers omit the list until it is authoritative.
  const invalid = migrateRadialNavigation(state, ["analysis"]);
  assert.equal(invalid.domainId, null);
  assert.equal(invalid.selected, null);
  assert.deepEqual(invalid.expanded, []);
  assert.deepEqual(invalid.camera, { x: 0, y: 0, zoom: 1 });
  assert.equal(migrateRadialNavigation(state, []).domainId, null);
});

test("radial selection inspects without expanding; explicit preparation, close and Back have distinct outcomes", () => {
  let state = reduce(wheel(), {
    type: "OPEN_DISCIPLINE",
    id: "analysis",
    rootId: "cap:statistics",
  });
  assert.equal(state.domainId, "analysis");
  assert.equal(state.inspectorOpen, false);
  assert.equal(state.routeId, "cap:statistics");
  assert.deepEqual(state.expanded, []);
  assert.equal(state.history.length, 1);
  const domain = structuredClone(state);
  state = reduce(state, {
    type: "OPEN_NODE",
    id: "course:statistics",
    goal: true,
  });
  assert.equal(state.inspectorOpen, true);
  assert.deepEqual(state.expanded, []);
  assert.equal(state.routeId, "course:statistics");
  const inspected = structuredClone(state);
  assert.equal(
    reduce(state, { type: "OPEN_NODE", id: "course:statistics", goal: true }),
    state,
  );
  state = reduce(state, { type: "TOGGLE_BRANCH", id: "course:statistics" });
  assert.deepEqual(state.expanded, ["course:statistics"]);
  state = reduce(state, {
    type: "SET_CAMERA",
    camera: { x: 25, y: 80, zoom: 1.1 },
  });
  const camera = { ...state.camera };
  const closed = reduce(state, { type: "CLOSE" });
  assert.equal(closed.inspectorOpen, false);
  assert.equal(closed.domainId, "analysis");
  assert.equal(closed.selected, "course:statistics");
  assert.deepEqual(closed.camera, camera);
  assert.deepEqual(closed.expanded, ["course:statistics"]);
  const backToDetails = reduce(closed, { type: "BACK" });
  assert.deepEqual(backToDetails, inspected);
  assert.deepEqual(reduce(backToDetails, { type: "BACK" }), domain);
});

test("switching domains removes old disclosure while retaining pinned routes and the full return context", () => {
  let analysis = reduce(wheel(), { type: "OPEN_DISCIPLINE", id: "analysis" });
  analysis = reduce(analysis, { type: "PIN_ROUTE", id: "goal:research" });
  analysis = reduce(analysis, { type: "OPEN_NODE", id: "statistics" });
  analysis = reduce(analysis, { type: "TOGGLE_BRANCH", id: "statistics" });
  analysis = reduce(analysis, {
    type: "SET_CAMERA",
    camera: { x: 30, y: 40, zoom: 0.9 },
  });
  const before = structuredClone(analysis),
    research = reduce(analysis, { type: "OPEN_DISCIPLINE", id: "research" });
  assert.equal(research.domainId, "research");
  assert.deepEqual(research.expanded, []);
  assert.equal(research.selected, null);
  assert.equal(research.inspectorOpen, false);
  assert.deepEqual(research.pinned, ["goal:research"]);
  assert.deepEqual(reduce(research, { type: "BACK" }), analysis);
  assert.deepEqual(analysis, before);
  const overview = reduce(research, { type: "SHOW_WHEEL" });
  assert.equal(overview.domainId, null);
  assert.deepEqual(overview.expanded, []);
  assert.deepEqual(overview.pinned, ["goal:research"]);
  assert.deepEqual(reduce(overview, { type: "BACK" }), research);
});

test("atomic related-path and hypothetical jumps preserve a single meaningful return without changing goals", () => {
  let state = reduce(wheel(), { type: "OPEN_DISCIPLINE", id: "analysis" });
  state = reduce(state, { type: "TOGGLE_BRANCH", id: "statistics" });
  const old = structuredClone(state);
  const jump = reduce(state, {
    type: "OPEN_NODE",
    id: "project:osint",
    domainId: "public",
  });
  assert.equal(jump.domainId, "public");
  assert.equal(jump.selected, "project:osint");
  assert.deepEqual(jump.expanded, []);
  assert.equal(jump.history.length, state.history.length + 1);
  assert.deepEqual(reduce(jump, { type: "BACK" }), old);
  const preview = reduce(state, {
    type: "PREVIEW_ROUTE",
    id: "goal:risk",
    domainId: "public",
  });
  assert.equal(preview.domainId, "public");
  assert.equal(preview.previewRouteId, "goal:risk");
  assert.deepEqual(preview.expanded, []);
  assert.deepEqual(reduce(preview, { type: "DISCARD_PREVIEW" }), old);
});

test("the clean wheel cannot accumulate invisible expansions, edges or details without a selected domain", () => {
  const start = wheel();
  for (const event of [
    { type: "OPEN_NODE", id: "hidden" },
    { type: "TOGGLE_BRANCH", id: "hidden" },
    { type: "SELECT_EDGE", id: "edge:hidden" },
    { type: "SET_SCALE", scale: "route" },
  ] as const)
    assert.equal(reduce(start, event), start);
  const state = reduce(
    reduce(start, { type: "OPEN_DISCIPLINE", id: "technology" }),
    { type: "OPEN_NODE", id: "python" },
  );
  const home = reduce(state, { type: "HOME" });
  assert.equal(home.domainId, null);
  assert.deepEqual(home.expanded, []);
  assert.equal(home.inspectorOpen, false);
});

test("legacy non-radial reducers retain their existing selection/expansion semantics", () => {
  const old = emptyNavigation();
  const opened = reduce(old, {
    type: "OPEN_NODE",
    id: "goal:legacy",
    goal: true,
  });
  assert.equal(opened.radialVersion, undefined);
  assert.ok(opened.expanded.includes("goal:legacy"));
  assert.equal(opened.scale, "route");
  assert.deepEqual(reduce(opened, { type: "BACK" }), old);
});

test("migration ignores malformed camera and stale domain history without leaking constellation context", () => {
  const malformed = {
    ...emptyNavigation(),
    quiet: true,
    pinned: ["saved:goal"],
    camera: { x: NaN, y: 0, zoom: 0 },
  };
  const recovered = migrateRadialNavigation(malformed);
  assert.equal(recovered.quiet, true);
  assert.deepEqual(recovered.pinned, ["saved:goal"]);
  assert.deepEqual(recovered.camera, { x: 0, y: 0, zoom: 1 });
  const valid = reduce(wheel(), { type: "OPEN_DISCIPLINE", id: "research" });
  const mixed: NavigationState = {
    ...valid,
    history: [
      ...valid.history,
      { ...emptyNavigation(), selected: "old:private" },
      { ...valid, domainId: "deleted-domain" },
    ],
  };
  const sanitized = migrateRadialNavigation(mixed, ["research"]);
  assert.ok(
    sanitized.history.every(
      (c) => c.radialVersion === 1 && c.domainId === null,
    ),
  );
});

test("occupation investigation persists independently of radial disclosure and does not adopt a goal", async () => {
  const [
    { buildWorld },
    { catalogue },
    { emptyWorkspace, parseWorkspace },
    { emptyLiving, livingStateSchema },
  ] = await Promise.all([
    import("../src/living/engine"),
    import("../src/odyssey/server/data"),
    import("../src/odyssey/profile"),
    import("../src/living/schema"),
  ]);
  const workspace = emptyWorkspace();
  workspace.living = emptyLiving();
  const before = buildWorld(workspace, catalogue),
    existing = new Set(before.nodes.map((n) => n.id));
  const occupation = catalogue.occupations.find(
    (o) => !existing.has("occupation:" + o.id),
  )!;
  assert.ok(occupation);
  const nodeId = "occupation:" + occupation.id,
    personBefore = structuredClone(workspace.person);
  workspace.living.investigatedOccupations = [nodeId];
  workspace.living.expanded = [];
  assert.ok(
    buildWorld(workspace, catalogue).nodes.some((n) => n.id === nodeId),
  );
  workspace.living.navigation = reduce(
    reduce(wheel(), { type: "OPEN_DISCIPLINE", id: "research" }),
    { type: "SHOW_WHEEL" },
  );
  workspace.living.expanded = [];
  const restored = parseWorkspace(JSON.stringify(workspace))!;
  assert.deepEqual(restored.living!.investigatedOccupations, [nodeId]);
  assert.ok(buildWorld(restored, catalogue).nodes.some((n) => n.id === nodeId));
  assert.deepEqual(restored.living!.goals, []);
  assert.deepEqual(restored.person, personBefore);
  assert.equal(
    Object.hasOwn(
      livingStateSchema.parse(emptyLiving()),
      "investigatedOccupations",
    ),
    false,
  );
  const legacy = emptyWorkspace();
  legacy.living = { ...emptyLiving(), expanded: [nodeId] };
  assert.ok(buildWorld(legacy, catalogue).nodes.some((n) => n.id === nodeId));
});
