import type { WorldGraph, WorldNode } from "./schema";
import type { NavigationState } from "./navigation";
import { preparationRelations } from "./navigation";
import { constellationLayout, nodeSize } from "./spatial";
export type Point = { x: number; y: number };
export type RouteLayout = {
  positions: Map<string, Point>;
  cycles: string[][];
  /** Longest typed dependency depth, not elapsed time or formal eligibility. */
  levels: Map<string, number>;
};

/** Tarjan SCCs detect cycles without turning advisory or alternative links into formal requirements. */
function components(ids: string[], successors: Map<string, string[]>) {
  let sequence = 0;
  const indexes = new Map<string, number>(),
    low = new Map<string, number>();
  const stack: string[] = [],
    onStack = new Set<string>(),
    result: string[][] = [];
  function visit(id: string) {
    indexes.set(id, sequence);
    low.set(id, sequence++);
    stack.push(id);
    onStack.add(id);
    for (const next of successors.get(id) || []) {
      if (!indexes.has(next)) {
        visit(next);
        low.set(id, Math.min(low.get(id)!, low.get(next)!));
      } else if (onStack.has(next))
        low.set(id, Math.min(low.get(id)!, indexes.get(next)!));
    }
    if (low.get(id) === indexes.get(id)) {
      const component: string[] = [];
      let next: string;
      do {
        next = stack.pop()!;
        onStack.delete(next);
        component.push(next);
      } while (next !== id);
      result.push(component.sort());
    }
  }
  ids.forEach((id) => {
    if (!indexes.has(id)) visit(id);
  });
  return result;
}

/**
 * Overview preserves stable landmarks. A focused route uses typed preparation edges in a curved
 * dependency fan: earlier dependency layers precede the destination; parallel work shares an arc.
 * Coordinates do not create a relationship or mark preparation mandatory. Input should be bounded.
 */
export function routeLayout(
  graph: WorldGraph,
  nodes: WorldNode[],
  state: NavigationState,
  previous = new Map<string, Point>(),
): RouteLayout {
  if (state.scale === "overview" || !(state.routeId || state.selected))
    return {
      positions: constellationLayout(nodes, previous),
      cycles: [],
      levels: new Map(),
    };
  const ids = new Set(nodes.map((node) => node.id));
  const destination =
    state.routeId && ids.has(state.routeId) ? state.routeId : state.selected!;
  const successors = new Map<string, string[]>(),
    predecessors = new Map<string, string[]>();
  const dependencies = new Set<string>();
  const add = (from: string, to: string) => {
    if (from === to || !ids.has(from) || !ids.has(to)) return;
    const key = from + "\u0000" + to;
    if (dependencies.has(key)) return;
    dependencies.add(key);
    successors.set(from, [...(successors.get(from) || []), to]);
    predecessors.set(to, [...(predecessors.get(to) || []), from]);
  };
  for (const edge of graph.edges)
    if (preparationRelations.has(edge.relation)) add(edge.from, edge.to);
  for (const node of nodes) {
    for (const id of node.prerequisites) add(id, node.id);
    // AND/OR group members share a layer; the group operator remains explicit in the inspector/edges.
    for (const group of node.requirementGroups || [])
      for (const id of group.nodeIds) add(id, node.id);
  }
  const groups = components([...ids].sort(), successors),
    membership = new Map<string, number>();
  groups.forEach((group, i) => group.forEach((id) => membership.set(id, i)));
  const cycles = groups.filter((group) => group.length > 1);
  const dagNext = new Map<number, Set<number>>(),
    dagBefore = new Map<number, Set<number>>();
  for (const [from, next] of successors)
    for (const to of next) {
      const a = membership.get(from)!,
        b = membership.get(to)!;
      if (a === b) continue;
      if (!dagNext.has(a)) dagNext.set(a, new Set());
      if (!dagBefore.has(b)) dagBefore.set(b, new Set());
      dagNext.get(a)!.add(b);
      dagBefore.get(b)!.add(a);
    }
  const indegree = new Map(
      groups.map((_, i) => [i, dagBefore.get(i)?.size || 0]),
    ),
    ranks = new Map<number, number>();
  const queue = [...indegree].filter(([, n]) => n === 0).map(([id]) => id);
  for (let i = 0; i < queue.length; i++) {
    const group = queue[i];
    ranks.set(group, ranks.get(group) || 0);
    for (const next of dagNext.get(group) || []) {
      ranks.set(next, Math.max(ranks.get(next) || 0, ranks.get(group)! + 1));
      indegree.set(next, indegree.get(next)! - 1);
      if (indegree.get(next) === 0) queue.push(next);
    }
  }
  const levels = new Map<string, number>();
  for (const id of ids) levels.set(id, ranks.get(membership.get(id)!) || 0);
  const ancestors = new Set<string>(),
    pending = [destination];
  while (pending.length) {
    const id = pending.pop()!;
    if (ancestors.has(id)) continue;
    ancestors.add(id);
    pending.push(...(predecessors.get(id) || []));
  }
  const positions = new Map(previous),
    targetNode = nodes.find((n) => n.id === destination);
  const targetSize = targetNode ? nodeSize(targetNode) : 94;
  // Keep destination's existing landmark as the route anchor where possible.
  const target = state.anchors?.[destination] ||
    previous.get(destination) || { x: 220, y: -targetSize / 2 };
  positions.set(destination, target);
  const center = { x: target.x + targetSize / 2, y: target.y + targetSize / 2 };
  const destinationLevel = levels.get(destination) || 0;
  const rows = new Map<number, WorldNode[]>();
  for (const node of nodes)
    if (node.id !== destination && ancestors.has(node.id)) {
      const level = levels.get(node.id) || 0;
      if (!rows.has(level)) rows.set(level, []);
      rows.get(level)!.push(node);
    }
  // Relevant dependencies occupy a left-facing arc around the anchor, never a text-card column grid.
  for (const [level, members] of [...rows].sort(([a], [b]) => b - a)) {
    members.sort((a, b) => a.id.localeCompare(b.id));
    const depth = Math.max(1, destinationLevel - level);
    const spread = Math.max(150, (members.length - 1) * 150);
    for (let i = 0; i < members.length; i++) {
      const node = members[i],
        size = nodeSize(node);
      const offset = members.length === 1 ? 0 : i / (members.length - 1) - 0.5;
      // Constant depth advance plus a shallow arc preserves order for very wide parallel layers.
      positions.set(node.id, {
        x: center.x - depth * 245 - Math.pow(offset * 2, 2) * 48 - size / 2,
        y: center.y + offset * spread - size / 2,
      });
    }
  }

  const placed = [...ancestors].filter(
    (id) => ids.has(id) && positions.has(id),
  );
  // Context/bridge nodes keep stable overview positions unless they collide with the focused preparation.
  const overview = constellationLayout(nodes, previous);
  for (const node of nodes) {
    if (ancestors.has(node.id)) continue;
    let p = overview.get(node.id)!;
    let attempt = 0;
    while (
      placed.some((id) => {
        const q = positions.get(id)!;
        return Math.hypot(p.x - q.x, p.y - q.y) < 155;
      }) &&
      attempt++ < 60
    )
      p = { x: p.x, y: p.y + (attempt % 2 ? 1 : -1) * 160 * attempt };
    positions.set(node.id, p);
    placed.push(node.id);
  }
  // Label-aware final separation within each semantic layer. Different levels must remain ordered.
  for (const [level, members] of rows) {
    const sorted = [...members].sort(
      (a, b) => positions.get(a.id)!.y - positions.get(b.id)!.y,
    );
    for (let i = 1; i < sorted.length; i++) {
      const a = positions.get(sorted[i - 1].id)!,
        b = positions.get(sorted[i].id)!;
      if (Math.hypot(a.x - b.x, a.y - b.y) < 145)
        positions.set(sorted[i].id, { x: b.x, y: a.y + 145 });
    }
    void level;
  }
  return { positions, cycles, levels };
}
