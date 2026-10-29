import type {
  Occupation,
  OntologySkill,
  RoadmapGraph,
  Topic,
  Person,
} from "./types";
import { curriculumFor, linkTopics, resources } from "./curricula";
export function topologicalOrder(topics: Topic[]) {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const done = new Set<string>(),
    active: string[] = [],
    result: string[] = [],
    cycles: string[][] = [];
  const visit = (id: string) => {
    if (done.has(id)) return;
    const at = active.indexOf(id);
    if (at >= 0) {
      cycles.push([...active.slice(at), id]);
      return;
    }
    const t = byId.get(id);
    if (!t) throw new Error(`Missing prerequisite ${id}`);
    active.push(id);
    t.prerequisites.forEach(visit);
    active.pop();
    done.add(id);
    result.push(id);
  };
  topics.forEach((t) => visit(t.id));
  return { order: result, cycles };
}
export function buildRoadmap(
  occupation: Occupation,
  skills: OntologySkill[],
  onward: RoadmapGraph["onward"],
): RoadmapGraph {
  const curriculum = curriculumFor(occupation.label, occupation.aliases);
  const linked = curriculum ? linkTopics(curriculum, skills) : [];
  const known = new Set(linked.flatMap((t) => t.skillIds));
  const reqs = skills.filter(
    (s) => occupation.essential.includes(s.id) && !known.has(s.id),
  );
  const optional = skills.filter((s) => occupation.optional.includes(s.id));
  const sourceTopic = (s: OntologySkill, optional = false): Topic => ({
    id: s.id,
    label: s.label,
    summary:
      s.description ||
      "Inspect this source-defined capability and gather evidence that specifically demonstrates it.",
    family: optional
      ? "optional"
      : s.type === "knowledge"
        ? "knowledge"
        : "requirements",
    stage: curriculum ? curriculum.families.length : 0,
    prerequisites: [],
    source: s.source.url || "",
    provenance: "source-requirement",
    resources: [
      {
        title: "ESCO source record",
        url: s.source.url || "https://esco.ec.europa.eu/",
        kind: "official-reference",
        note: "Occupation–skill relationship; not a prerequisite sequence, course or legal eligibility rule.",
      },
      resources.openlearn,
    ],
    effort: "not-estimated",
    skillIds: [s.id],
    optional,
  });
  const topics = [
    ...linked,
    ...reqs.map((s) => sourceTopic(s)),
    ...optional.map((s) => sourceTopic(s, true)),
  ];
  const families = [
    ...(curriculum?.families || []),
    {
      id: "requirements",
      label: "Occupational skill requirements",
      summary:
        "Essential skills from the source classification. No educational order is inferred.",
    },
    {
      id: "knowledge",
      label: "Occupational knowledge",
      summary:
        "Knowledge relationships from ESCO; distinct from proof of mastery.",
    },
    {
      id: "optional",
      label: "Optional skills & specializations",
      summary:
        "Optional source relationships. These branches need not converge on one destination.",
    },
  ].filter((f) => topics.some((t) => t.family === f.id));
  const { cycles } = topologicalOrder(topics);
  return {
    occupation,
    curriculum,
    topics,
    families,
    requiredSkillIds: occupation.essential,
    onward,
    cycles,
  };
}
export function feasiblePlan(
  graph: RoadmapGraph,
  person: Person,
  completed: string[],
  targetTopicId?: string,
  route: "guided" | "project" = "guided",
) {
  const known = new Set(
    person.assertions
      .filter(
        (a) =>
          a.consent &&
          a.selected !== false &&
          ["institution-verified", "employer-verified"].includes(
            a.verification,
          ),
      )
      .map((a) => a.skillId),
  );
  const done = new Set(completed);
  const byId = new Map(graph.topics.map((t) => [t.id, t]));
  const required = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error("Cyclic prerequisite data");
    if (required.has(id) || done.has(id)) return;
    const t = byId.get(id);
    if (!t) return;
    if (t.skillIds.length && t.skillIds.every((id) => known.has(id))) return;
    visiting.add(id);
    t.prerequisites.forEach(visit);
    visiting.delete(id);
    required.add(id);
  };
  (targetTopicId
    ? [targetTopicId]
    : graph.topics.filter((t) => !t.optional).map((t) => t.id)
  ).forEach(visit);
  const { order, cycles } = topologicalOrder(graph.topics);
  if (cycles.length) throw new Error("Cyclic prerequisite data");
  // AND dependencies require all missing prerequisites; route cost is an explicit
  // planning preference, never proof that a project satisfies a formal credential.
  const topicIds = order.filter((id) => required.has(id));
  const selectedRoutes = topicIds.map((id) => {
    const topic = byId.get(id)!;
    const canUseGuided = topic.resources.some(
      (r) =>
        r.kind === "free-material" ||
        r.kind === "official-reference" ||
        person.budget === "unspecified",
    );
    const choices = [
      ...(canUseGuided
        ? [
            {
              from: "start",
              to: "guided",
              cost: route === "guided" ? 0 : 1,
              data: "guided",
            },
          ]
        : []),
      {
        from: "start",
        to: "project",
        cost: route === "project" ? 0 : 1,
        data: "project",
      },
      { from: "guided", to: "review", cost: 1, data: "review" },
      { from: "project", to: "review", cost: 1, data: "review" },
    ];
    const shortest = shortestRoute("start", "review", choices);
    return {
      topicId: id,
      route: shortest?.edges[0].data || "project",
      reason: canUseGuided
        ? "Minimum preference-cost learning route; review remains required."
        : "No suitable free guided resource is recorded; plan practice and request review.",
    };
  });
  return {
    topicIds,
    selectedRoutes,
    route,
    costStatus: "unknown" as const,
    weeklyHours: person.hoursPerWeek,
    reason:
      route === "project"
        ? "Practice-oriented route; external review is still needed."
        : "Guided-resource route; learning does not imply credential equivalence.",
  };
}
export function shortestRoute<T>(
  start: string,
  goal: string,
  edges: { from: string; to: string; cost: number; data: T }[],
) {
  const dist = new Map([[start, 0]]),
    prev = new Map<string, (typeof edges)[number]>(),
    queue = new Set([start]);
  while (queue.size) {
    const id = [...queue].sort(
      (a, b) => (dist.get(a) ?? Infinity) - (dist.get(b) ?? Infinity),
    )[0];
    queue.delete(id);
    if (id === goal) break;
    for (const edge of edges.filter((e) => e.from === id)) {
      if (edge.cost < 0) throw new Error("Negative route cost");
      const next = dist.get(id)! + edge.cost;
      if (next < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, next);
        prev.set(edge.to, edge);
        queue.add(edge.to);
      }
    }
  }
  if (!dist.has(goal)) return null;
  const path: typeof edges = [];
  let current = goal;
  while (current !== start) {
    const edge = prev.get(current);
    if (!edge) return null;
    path.unshift(edge);
    current = edge.from;
  }
  return { cost: dist.get(goal)!, edges: path };
}
