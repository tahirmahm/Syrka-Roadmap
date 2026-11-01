import type { WorldGraph, WorldNode } from "./schema";
export const regions = [
  {
    id: "academic",
    label: "Academic foundations",
    angle: -2.35,
    color: "#b69ae5",
  },
  {
    id: "economics",
    label: "Economics & finance",
    angle: -1.35,
    color: "#d4ac68",
  },
  {
    id: "consulting",
    label: "Consulting & enterprise",
    angle: -0.35,
    color: "#72b8dc",
  },
  {
    id: "politics",
    label: "Policy & international relations",
    angle: 0.65,
    color: "#8bc7b0",
  },
  {
    id: "technology",
    label: "Technology & methods",
    angle: 1.65,
    color: "#8eabef",
  },
  {
    id: "research",
    label: "Research & communication",
    angle: 2.65,
    color: "#d59bb3",
  },
] as const;
export function regionOf(n: WorldNode): number {
  const s = (n.domain + " " + n.label).toLowerCase();
  if (/consult|business|entrepren|mba|management|mckinsey/.test(s)) return 2;
  if (/politic|policy|risk|international|osint|diplom/.test(s)) return 3;
  if (/econom|financ|tax|account|quantit/.test(s)) return 1;
  if (/python|program|software|data|technology|statistic/.test(s)) return 4;
  if (/research|writ|journal|academia|doctoral|literature/.test(s)) return 5;
  return 0;
}
export const nodeSize = (n: WorldNode) =>
  n.kind === "PersonProfile"
    ? 116
    : [
          "Occupation",
          "EmployerRole",
          "GraduateProgramme",
          "ResearchPathway",
          "AcademicProgramme",
        ].includes(n.kind)
      ? 94
      : ["Capability", "KnowledgeDomain"].includes(n.kind)
        ? 52
        : 70;
const hash = (s: string) => {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
};
/** Pure visual coordinates, not ontology relationships. Existing coordinates are stable as branches expand. */
export function constellationLayout(
  nodes: WorldNode[],
  previous = new Map<string, { x: number; y: number }>(),
) {
  const placed = new Map(previous),
    occupied = [...previous.entries()].map(([id, p]) => ({ id, ...p }));
  for (const n of [...nodes].sort((a, b) =>
    a.id === "person" ? -1 : b.id === "person" ? 1 : a.id.localeCompare(b.id),
  )) {
    if (placed.has(n.id)) continue;
    const size = nodeSize(n);
    if (n.id === "person") {
      placed.set(n.id, { x: -size / 2, y: -size / 2 });
      occupied.push({ id: n.id, x: -size / 2, y: -size / 2 });
      continue;
    }
    const major = size === 94,
      r = regions[regionOf(n)],
      h = hash(n.id);
    let x = 0,
      y = 0;
    for (let attempt = 0; attempt < 300; attempt++) {
      const ring = Math.floor(attempt / 7),
        radius = (major ? 395 : 195) + (h % 3) * 78 + ring * 110;
      const angle =
        r.angle + ((h % 1000) / 1000 - 0.5) * 0.76 + ((attempt % 7) - 3) * 0.12;
      x = Math.cos(angle) * radius - size / 2;
      y = Math.sin(angle) * radius - size / 2;
      if (
        !occupied.some(
          (p) => Math.hypot(x - p.x, y - p.y) < (major ? 160 : 118),
        )
      )
        break;
    }
    placed.set(n.id, { x, y });
    occupied.push({ id: n.id, x, y });
  }
  return placed;
}
/** Undirected neighbourhood for focus; this is visual highlighting, never prerequisite inference. */
export function focusNetwork(
  graph: WorldGraph,
  selected: string | null | undefined,
  goals: string[],
) {
  const active = new Set<string>(selected ? [selected] : goals);
  if (!active.size) return null;
  for (let depth = 0; depth < 2; depth++) {
    const before = new Set(active);
    for (const e of graph.edges)
      if (before.has(e.from) || before.has(e.to)) {
        active.add(e.from);
        active.add(e.to);
      }
  }
  return active;
}
