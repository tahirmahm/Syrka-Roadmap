import esco from "@/data/esco.json";
import { destinations, skillById } from "@/data/ontology";
import type {
  Profile,
  Roadmap,
  RoadNode,
  RoadEdge,
  Verification,
} from "./types";
export const strength: Record<Verification, number> = {
  "institution-verified": 1,
  "employer-verified": 0.9,
  "document-supported": 0.65,
  "self-reported": 0.35,
  inferred: 0.15,
  unverified: 0,
};
export function prerequisiteOrder(
  ids: string[],
  catalog = skillById,
): string[] {
  const visited = new Set<string>(),
    active = new Set<string>(),
    result: string[] = [];
  const visit = (id: string) => {
    if (active.has(id)) throw new Error(`Cyclic prerequisite: ${id}`);
    if (visited.has(id)) return;
    if (!catalog[id]) throw new Error(`Unknown skill: ${id}`);
    active.add(id);
    catalog[id].prerequisites.forEach(visit);
    active.delete(id);
    visited.add(id);
    result.push(id);
  };
  ids.forEach(visit);
  return result;
}
export function generateRoadmap(
  profile: Profile,
  destinationId: string,
  completed: string[] = [],
  inProgress: string[] = [],
): Roadmap {
  const destination = destinations.find((d) => d.id === destinationId);
  if (!destination) throw new Error("Unknown destination");
  const ordered = prerequisiteOrder(destination.skills);
  const matches = ordered.map((id) => {
    const evidence = profile.evidence.filter(
      (e) => e.skillId === id && e.consent,
    );
    const score = Math.max(0, ...evidence.map((e) => strength[e.verification]));
    return {
      skill: skillById[id],
      evidence,
      strength: score,
      status: (score >= 0.65
        ? "supported"
        : score >= 0.35
          ? "partial"
          : score > 0
            ? "uncertain"
            : "missing") as Roadmap["matches"][number]["status"],
    };
  });
  const official = esco.occupations.find(
    (o) => o.destinationId === destinationId,
  )!;
  const sourceRequirements = official.essentialSkills.map((id) => {
    const skill = esco.skills.find((s) => s.uri === id)!;
    const ev = profile.evidence.filter((e) => e.skillId === id && e.consent);
    return {
      id,
      name: skill.label,
      source: skill.sourceUrl,
      status: ev.some((e) => strength[e.verification] >= 0.9)
        ? ("supported" as const)
        : ev.length
          ? ("unconfirmed" as const)
          : ("missing" as const),
    };
  });
  const nodes: RoadNode[] = [
    {
      id: "position",
      title: "Your starting point",
      kind: "position",
      status: "document-supported",
      description: profile.headline,
      prerequisites: [],
    },
  ];
  const edges: RoadEdge[] = [];
  const add = (source: string, target: string) =>
    edges.push({ id: `${source}-${target}`, source, target });
  for (const match of matches) {
    const s = match.skill;
    const strongest = [...match.evidence].sort(
      (a, b) => strength[b.verification] - strength[a.verification],
    )[0];
    nodes.push({
      id: s.id,
      title: s.name,
      kind: "capability",
      skillId: s.id,
      status: completed.includes(s.id)
        ? "completed"
        : inProgress.includes(s.id)
          ? "in-progress"
          : strongest?.verification === "institution-verified" ||
              strongest?.verification === "employer-verified"
            ? "verified"
            : strongest?.verification === "document-supported"
              ? "document-supported"
              : strongest?.verification === "self-reported"
                ? "self-reported"
                : strongest?.verification === "inferred"
                  ? "inferred"
                  : "missing",
      description: s.description,
      prerequisites: s.prerequisites,
      hours: s.hours,
    });
    if (s.prerequisites.length) s.prerequisites.forEach((p) => add(p, s.id));
    else add("position", s.id);
  }
  nodes.push({
    id: "requirements",
    title: "Review occupational requirements",
    kind: "requirement",
    status: "requires-verification",
    description: `${official.essentialSkills.length} essential skill relationships from ESCO’s ${official.label} occupation. This is a related occupational reference, not a complete legal or hiring specification. Local learning activities do not automatically satisfy these requirements.`,
    prerequisites: [],
    sourceUrl: official.sourceUrl,
    requirementIds: official.essentialSkills,
  });
  add("position", "requirements");
  nodes.push({
    id: "portfolio",
    title: "Bring your evidence together",
    kind: "milestone",
    status: completed.includes("portfolio")
      ? "completed"
      : "requires-verification",
    description:
      "Assemble a portfolio and request feedback. Completing learning steps is a self-reported milestone, not a formal qualification.",
    prerequisites: destination.skills,
  });
  destination.skills.forEach((s) => add(s, "portfolio"));
  add("requirements", "portfolio");
  nodes.push({
    id: "destination",
    title: destination.name,
    kind: "destination",
    status: "recommended",
    description: destination.description,
    prerequisites: ["portfolio"],
  });
  add("portfolio", "destination");
  return { nodes, edges, destination, matches, sourceRequirements };
}
export function addAlternatives(roadmap: Roadmap, expanded: string[]): Roadmap {
  const nodes = [...roadmap.nodes],
    edges = [...roadmap.edges];
  for (const id of expanded) {
    if (id === "requirements") {
      for (const req of roadmap.sourceRequirements) {
        nodes.push({
          id: req.id,
          title: req.name,
          kind: "requirement",
          status:
            req.status === "supported"
              ? "verified"
              : req.status === "unconfirmed"
                ? "requires-verification"
                : "missing",
          description:
            "An essential skill relationship in the official ESCO occupational reference. Matching requires evidence linked to this exact source identifier; no equivalence with locally authored learning skills is assumed.",
          prerequisites: [],
          sourceUrl: req.source,
        });
        edges.push({
          id: `requirements-${req.id}`,
          source: "requirements",
          target: req.id,
          alternative: true,
        });
      }
      continue;
    }
    const parent = nodes.find((n) => n.id === id && n.skillId);
    if (!parent) continue;
    for (const [route, label] of [
      ["course", "Guided learning"],
      ["project", "Practice project"],
    ] as const) {
      const altId = `${id}:${route}`;
      nodes.push({
        id: altId,
        title: label,
        kind: "alternative",
        status: "recommended",
        skillId: parent.skillId,
        parent: id,
        description:
          route === "course"
            ? "Work through the linked resource, practice independently and request feedback. This does not establish credential equivalence."
            : "Build a portfolio artifact that demonstrates this capability. Have the work reviewed against the evidence criteria.",
        prerequisites: parent.prerequisites,
        hours: parent.hours,
      });
      edges.push({
        id: `${id}-${altId}`,
        source: id,
        target: altId,
        alternative: true,
      });
    }
  }
  return { ...roadmap, nodes, edges };
}
export function summarize(roadmap: Roadmap) {
  const supported = roadmap.matches.filter(
    (m) => m.status === "supported",
  ).length;
  return `${supported} of ${roadmap.matches.length} capabilities have supporting evidence. ${roadmap.matches.filter((m) => m.status === "partial" || m.status === "uncertain").length} need confirmation. Follow prerequisites before advancing; this is a learning plan, not a hiring or admission prediction.`;
}
export type EligibilityRequirement = {
  id: string;
  label: string;
  skillId?: string;
  requiresVerified: boolean;
};
export function assessEligibility(
  profile: Profile,
  requirements: EligibilityRequirement[],
  sourceCurrent: boolean,
) {
  if (!sourceCurrent)
    return { status: "Source outdated or unavailable", checks: [] };
  const checks = requirements.map((r) => {
    const ev = profile.evidence.filter(
      (e) => e.skillId === r.skillId && e.consent,
    );
    return {
      id: r.id,
      label: r.label,
      status: !r.skillId
        ? "Insufficient information"
        : ev.some((e) => !r.requiresVerified || strength[e.verification] >= 0.9)
          ? "Requirements appear satisfied"
          : ev.length
            ? "Potentially eligible, confirmation required"
            : "Missing published requirements",
    };
  });
  return {
    status: checks.some((c) => c.status === "Missing published requirements")
      ? "Missing published requirements"
      : checks.some((c) => c.status === "Insufficient information")
        ? "Insufficient information"
        : checks.some((c) => c.status.includes("confirmation"))
          ? "Potentially eligible, confirmation required"
          : "Requirements appear satisfied",
    checks,
  };
}
