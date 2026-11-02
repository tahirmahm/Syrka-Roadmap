import { z } from "zod";
import type { WorldGraph, WorldNode } from "./schema";

const identifier = z.string().min(1).max(250);
const identifiers = z.array(identifier).max(500);
export const cameraSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  zoom: z.number().min(0.1).max(3),
  width: z.number().positive().max(20000).optional(),
  height: z.number().positive().max(20000).optional(),
});
export type Camera = z.infer<typeof cameraSchema>;
export const contextSchema = z.object({
  // Optional presentation discriminator preserves existing v1 workspace imports.
  radialVersion: z.literal(1).optional(),
  domainId: identifier.nullable().optional(),
  scale: z.enum(["overview", "route", "action"]),
  anchors: z
    .record(
      identifier,
      z.object({ x: z.number().finite(), y: z.number().finite() }),
    )
    .refine((v) => Object.keys(v).length <= 100)
    .optional(),
  selected: identifier.nullable(),
  routeId: identifier.nullable(),
  expanded: identifiers,
  pinned: identifiers,
  camera: cameraSchema,
  inspectorOpen: z.boolean(),
  edgeId: identifier.nullable(),
  previewRouteId: identifier.nullable(),
  focus: z.boolean(),
  quiet: z.boolean(),
});
export const navigationSchema = contextSchema.extend({
  version: z.literal(1),
  history: z.array(contextSchema).max(30),
});
export type NavigationContext = z.infer<typeof contextSchema>;
export type NavigationState = z.infer<typeof navigationSchema>;
export type NavigationEvent =
  | {
      type: "OPEN_NODE";
      id: string;
      goal?: boolean;
      action?: boolean;
      domainId?: string;
    }
  | { type: "OPEN_DISCIPLINE"; id: string; rootId?: string }
  | { type: "SHOW_WHEEL" }
  | { type: "TOGGLE_BRANCH"; id: string }
  | { type: "PIN_ROUTE"; id: string }
  | { type: "SET_SCALE"; scale: NavigationContext["scale"] }
  | { type: "SET_CAMERA"; camera: Camera }
  | { type: "SET_FOCUS"; value: boolean }
  | { type: "SET_QUIET"; value: boolean }
  | { type: "SELECT_EDGE"; id: string }
  | { type: "PREVIEW_ROUTE"; id: string; domainId?: string }
  | { type: "DISCARD_PREVIEW" }
  | { type: "CLOSE" }
  | { type: "BACK" }
  | { type: "HOME" };

export function emptyNavigation(legacy?: {
  selected?: string | null;
  expanded?: string[];
  view?: Camera;
}): NavigationState {
  return {
    version: 1,
    scale: "overview",
    selected: legacy?.selected || null,
    routeId: null,
    expanded: [...new Set(legacy?.expanded || ["person"])].slice(0, 500),
    pinned: [],
    camera: legacy?.view || { x: 0, y: 0, zoom: 0.85 },
    inspectorOpen: false,
    edgeId: null,
    previewRouteId: null,
    focus: false,
    quiet: false,
    history: [],
  };
}
const wheelCamera = (): Camera => ({ x: 0, y: 0, zoom: 1 });
const cleanWheel = (pinned: string[] = [], quiet = false): NavigationState => ({
  ...emptyNavigation(),
  radialVersion: 1,
  domainId: null,
  selected: null,
  expanded: [],
  pinned: [...pinned],
  camera: wheelCamera(),
  quiet,
});
/** Migrate presentation only. Canonical goals, evidence and progress live outside this state. */
export function migrateRadialNavigation(
  value: unknown,
  validDomainIds?: readonly string[],
): NavigationState {
  const parsed = navigationSchema.safeParse(value);
  const raw =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  const quiet = typeof raw.quiet === "boolean" ? raw.quiet : false;
  const pins = identifiers.safeParse(raw.pinned);
  const pinned = pins.success ? [...new Set(pins.data)] : [];
  if (!parsed.success || parsed.data.radialVersion !== 1)
    return cleanWheel(pinned, quiet);
  const state = parsed.data;
  const valid = validDomainIds ? new Set(validDomainIds) : null;
  const isValidDomain = (domain: string | null | undefined) =>
    domain === null || (!!domain && (!valid || valid.has(domain)));
  if (!isValidDomain(state.domainId)) return cleanWheel(pinned, state.quiet);
  const history = state.history.filter(
    (entry) => entry.radialVersion === 1 && isValidDomain(entry.domainId),
  );
  if (state.domainId === null)
    return { ...cleanWheel(pinned, state.quiet), history };
  return {
    ...state,
    domainId: state.domainId || null,
    pinned,
    expanded: [...state.expanded],
    camera: { ...state.camera },
    history: history.map((entry) => ({
      ...entry,
      expanded: [...entry.expanded],
      pinned: [...entry.pinned],
      camera: { ...entry.camera },
    })),
  };
}
function snapshot(state: NavigationState): NavigationContext {
  // Arrays/camera are copied so a journal entry cannot be mutated through current state.
  return {
    ...(state.radialVersion === 1
      ? { radialVersion: 1 as const, domainId: state.domainId || null }
      : {}),
    scale: state.scale,
    ...(state.anchors ? { anchors: structuredClone(state.anchors) } : {}),
    selected: state.selected,
    routeId: state.routeId,
    expanded: [...state.expanded],
    pinned: [...state.pinned],
    camera: { ...state.camera },
    inspectorOpen: state.inspectorOpen,
    edgeId: state.edgeId,
    previewRouteId: state.previewRouteId,
    focus: state.focus,
    quiet: state.quiet,
  };
}
function transition(
  state: NavigationState,
  patch: Partial<NavigationContext>,
): NavigationState {
  const next = { ...state, ...patch };
  if (Object.hasOwn(patch, "anchors") && patch.anchors === undefined)
    delete next.anchors;
  if (JSON.stringify(snapshot(next)) === JSON.stringify(snapshot(state)))
    return state;
  return { ...next, history: [...state.history.slice(-29), snapshot(state)] };
}
const toggle = (ids: string[], id: string) =>
  ids.includes(id)
    ? ids.filter((value) => value !== id)
    : [...ids, id].slice(-500);

/** Presentation-only state machine. No event can alter a claim, credential or real progress. */
export function navigationReducer(
  state: NavigationState,
  event: NavigationEvent,
): NavigationState {
  switch (event.type) {
    case "OPEN_DISCIPLINE": {
      if (!identifier.safeParse(event.id).success) return state;
      const base =
        state.radialVersion === 1 ? state : migrateRadialNavigation(state);
      const changed = base.domainId !== event.id;
      return transition(base, {
        radialVersion: 1,
        domainId: event.id,
        scale: "route",
        selected: null,
        routeId: event.rootId || null,
        inspectorOpen: false,
        edgeId: null,
        previewRouteId: null,
        focus: false,
        ...(changed
          ? {
              expanded: [],
              anchors: undefined,
              camera: wheelCamera(),
            }
          : {}),
      });
    }
    case "SHOW_WHEEL": {
      if (state.radialVersion !== 1) return migrateRadialNavigation(state);
      return transition(state, {
        radialVersion: 1,
        domainId: null,
        scale: "overview",
        selected: null,
        routeId: null,
        expanded: [],
        anchors: undefined,
        camera: wheelCamera(),
        inspectorOpen: false,
        edgeId: null,
        previewRouteId: null,
        focus: false,
      });
    }
    case "OPEN_NODE": {
      if (state.radialVersion === 1) {
        const domainId = event.domainId || state.domainId;
        if (!domainId || !identifier.safeParse(domainId).success) return state;
        const changed = domainId !== state.domainId;
        return transition(state, {
          domainId,
          selected: event.id,
          scale: event.action ? "action" : "route",
          routeId: event.goal ? event.id : changed ? null : state.routeId,
          inspectorOpen: true,
          edgeId: null,
          // Selection opens details only. Preparation has its own explicit control.
          ...(changed
            ? {
                expanded: [],
                anchors: undefined,
                camera: wheelCamera(),
                previewRouteId: null,
              }
            : {}),
        });
      }
      const scale = event.action
        ? "action"
        : event.goal
          ? "route"
          : state.scale;
      return transition(state, {
        selected: event.id,
        routeId: event.goal ? event.id : state.routeId,
        scale,
        expanded: [...new Set([...state.expanded, event.id])].slice(-500),
        inspectorOpen: true,
        edgeId: null,
      });
    }
    case "TOGGLE_BRANCH":
      return state.radialVersion === 1 && !state.domainId
        ? state
        : transition(state, { expanded: toggle(state.expanded, event.id) });
    case "PIN_ROUTE":
      return transition(state, { pinned: toggle(state.pinned, event.id) });
    case "SET_SCALE":
      return state.radialVersion === 1
        ? event.scale === "overview"
          ? navigationReducer(state, { type: "SHOW_WHEEL" })
          : state.domainId
            ? transition(state, { scale: event.scale })
            : state
        : transition(state, { scale: event.scale });
    case "SET_CAMERA": {
      const parsed = cameraSchema.safeParse(event.camera);
      return parsed.success ? { ...state, camera: parsed.data } : state;
    }
    case "SET_FOCUS":
      return { ...state, focus: event.value };
    case "SET_QUIET":
      return { ...state, quiet: event.value };
    case "SELECT_EDGE":
      return state.radialVersion === 1 && !state.domainId
        ? state
        : transition(state, { edgeId: event.id, inspectorOpen: true });
    case "PREVIEW_ROUTE": {
      if (state.radialVersion === 1) {
        const domainId = event.domainId || state.domainId;
        if (!domainId || !identifier.safeParse(domainId).success) return state;
        const changed = domainId !== state.domainId;
        return transition(state, {
          domainId,
          previewRouteId: event.id,
          routeId: event.id,
          selected: event.id,
          scale: "route",
          inspectorOpen: true,
          edgeId: null,
          ...(changed
            ? { expanded: [], anchors: undefined, camera: wheelCamera() }
            : {}),
        });
      }
      return transition(state, {
        previewRouteId: event.id,
        routeId: event.id,
        selected: event.id,
        scale: "route",
        expanded: [...new Set([...state.expanded, event.id])].slice(-500),
        inspectorOpen: true,
      });
    }
    case "DISCARD_PREVIEW": {
      // Restore the pre-preview context, not merely its old selected ID.
      const index = state.history.findLastIndex(
        (entry) => entry.previewRouteId === null,
      );
      if (index >= 0)
        return {
          ...state.history[index],
          version: 1,
          history: state.history.slice(0, index),
        };
      return { ...state, previewRouteId: null };
    }
    case "CLOSE":
      return { ...state, inspectorOpen: false, edgeId: null };
    case "BACK": {
      const previous = state.history.at(-1);
      return previous
        ? { ...previous, version: 1, history: state.history.slice(0, -1) }
        : { ...state, inspectorOpen: false, edgeId: null };
    }
    case "HOME":
      if (state.radialVersion === 1)
        return navigationReducer(state, { type: "SHOW_WHEEL" });
      return transition(state, {
        scale: "overview",
        selected: "person",
        routeId: null,
        previewRouteId: null,
        edgeId: null,
        inspectorOpen: false,
      });
  }
}

// Only these typed edges participate in preparation traversal. Proximity and visual groups never do.
export const preparationRelations = new Set([
  "REQUIRES",
  "BUILDS_ON",
  "RECOMMENDED_PREPARATION",
  "DEVELOPS",
  "DEMONSTRATES",
  "CONTRIBUTES_TO",
  "SUPPORTS_APPLICATION_TO",
  "ALTERNATIVE_PATH_TO",
]);
export function preparationClosure(
  graph: WorldGraph,
  destination: string,
): Set<string> {
  const incoming = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!preparationRelations.has(edge.relation)) continue;
    incoming.set(edge.to, [...(incoming.get(edge.to) || []), edge.from]);
  }
  const nodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const found = new Set<string>(),
    queue = [destination];
  while (queue.length) {
    const id = queue.pop()!;
    if (found.has(id) || !nodes.has(id)) continue;
    found.add(id);
    const node = nodes.get(id)!;
    queue.push(
      ...(incoming.get(id) || []),
      ...node.prerequisites,
      ...(node.requirementGroups || []).flatMap((group) => group.nodeIds),
    );
  }
  return found;
}
export type VisibleNavigation = {
  nodes: WorldNode[];
  edges: WorldGraph["edges"];
  references: Map<string, number>;
  hiddenCount: number;
  hiddenRequired: number;
  hiddenRequiredIds: string[];
  hiddenByBranch: Record<string, number>;
  hiddenRequirementGroups: {
    nodeId: string;
    groupId: string;
    operator: "AND" | "OR";
    nodeIds: string[];
    sourceReference: string;
  }[];
};
/** Union source ownership, then bound the rendered neighbourhood. Shared nodes survive parent collapse. */
export function visibleNavigation(
  graph: WorldGraph,
  state: NavigationState,
  goals: string[] = [],
  limit = 150,
): VisibleNavigation {
  const cap = Math.max(1, Math.min(150, Math.floor(limit)));
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));
  const neighbours = new Map<string, Set<string>>();
  for (const edge of graph.edges) {
    if (!byId.has(edge.from) || !byId.has(edge.to)) continue;
    if (!neighbours.has(edge.from)) neighbours.set(edge.from, new Set());
    if (!neighbours.has(edge.to)) neighbours.set(edge.to, new Set());
    neighbours.get(edge.from)!.add(edge.to);
    neighbours.get(edge.to)!.add(edge.from);
  }
  // Declared prerequisite groups also disclose their known members; visual disclosure never changes AND/OR semantics.
  for (const node of graph.nodes) {
    const declared = [
      ...node.prerequisites,
      ...(node.requirementGroups || []).flatMap((group) => group.nodeIds),
    ];
    for (const id of declared) {
      if (!byId.has(id)) continue;
      if (!neighbours.has(node.id)) neighbours.set(node.id, new Set());
      if (!neighbours.has(id)) neighbours.set(id, new Set());
      neighbours.get(node.id)!.add(id);
      neighbours.get(id)!.add(node.id);
    }
  }
  const sources = new Map<string, Set<string>>();
  const base = new Set<string>(["person", ...goals, ...state.pinned]);
  if (byId.has("programme")) base.add("programme");
  if (state.selected) base.add(state.selected);
  if (state.routeId) base.add(state.routeId);
  if (state.previewRouteId) base.add(state.previewRouteId);
  if (state.scale === "overview")
    graph.nodes
      .filter((node) => node.discoveryRank !== undefined)
      .sort((a, b) => a.discoveryRank! - b.discoveryRank!)
      .slice(0, 3)
      .forEach((node) => base.add(node.id));
  sources.set("base", base);
  for (const id of state.expanded)
    sources.set("branch:" + id, new Set([id, ...(neighbours.get(id) || [])]));
  for (const id of state.pinned)
    sources.set("pinned:" + id, preparationClosure(graph, id));
  const references = new Map<string, number>();
  for (const ids of sources.values())
    for (const id of ids)
      if (byId.has(id)) references.set(id, (references.get(id) || 0) + 1);
  const required = new Set<string>();
  for (const edge of graph.edges)
    if (
      edge.requirement === "formal" &&
      preparationRelations.has(edge.relation) &&
      references.has(edge.to)
    )
      required.add(edge.from);
  for (const node of graph.nodes) {
    if (!references.has(node.id)) continue;
    for (const group of node.requirementGroups || [])
      if (group.requirement === "formal" && group.operator === "AND")
        group.nodeIds.forEach((id) => required.add(id));
  }
  const priority = (node: WorldNode) =>
    node.id === state.selected
      ? 0
      : node.id === "person"
        ? 1
        : state.pinned.includes(node.id) ||
            goals.includes(node.id) ||
            node.id === state.routeId
          ? 2
          : required.has(node.id)
            ? 3
            : 4;
  const candidates = graph.nodes
    .filter((node) => references.has(node.id))
    .sort((a, b) => priority(a) - priority(b) || a.id.localeCompare(b.id));
  const nodes = candidates.slice(0, cap),
    visible = new Set(nodes.map((node) => node.id));
  const hiddenRequiredIds = [...required].filter(
    (id) => byId.has(id) && !visible.has(id),
  );
  const hiddenByBranch: Record<string, number> = {};
  for (const node of graph.nodes)
    hiddenByBranch[node.id] = [...(neighbours.get(node.id) || [])].filter(
      (id) => !visible.has(id),
    ).length;
  return {
    nodes,
    edges: graph.edges.filter(
      (edge) => visible.has(edge.from) && visible.has(edge.to),
    ),
    references,
    hiddenCount: candidates.length - nodes.length,
    hiddenRequired: hiddenRequiredIds.length,
    hiddenRequiredIds,
    hiddenByBranch,
    hiddenRequirementGroups: nodes.flatMap((node) =>
      (node.requirementGroups || [])
        .filter((group) => group.requirement === "formal")
        .flatMap((group) => {
          const hidden = group.nodeIds.filter((id) => !visible.has(id));
          return hidden.length
            ? [
                {
                  nodeId: node.id,
                  groupId: group.id,
                  operator: group.operator,
                  nodeIds: hidden,
                  sourceReference: group.sourceReference,
                },
              ]
            : [];
        }),
    ),
  };
}
