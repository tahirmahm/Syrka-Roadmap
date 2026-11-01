import type {
  CourseRecord,
  LivingState,
  WorldGraph,
  WorldNode,
} from "../living/schema";
import {
  evaluatePrerequisiteGroups,
  hasEvidenceSupport,
} from "../living/node-state";

export type SemesterCombination = {
  selectedIds: string[];
  knownCredits: number;
  creditLimit: number | null;
  status: "blocked" | "needs-confirmation" | "within-supplied-checks";
  errors: string[];
  unknowns: string[];
  limitations: string[];
  capabilityIds: string[];
  goalIds: string[];
  prerequisiteDetails: {
    courseId: string;
    operator: "AND" | "OR";
    ids: string[];
    state: "satisfied" | "missing" | "unknown";
    source: string;
  }[];
};

/** A self-marked topic or current enrolment is not a completed prerequisite course. */
function courseCompletion(n: WorldNode): boolean {
  if (
    n.dimensions?.reality === "hypothetical" ||
    n.status === "hypothetical" ||
    n.dimensions?.evidence === "disputed"
  )
    return false;
  const completed =
    n.dimensions?.progress === "completed" ||
    (!n.dimensions && ["reported", "verified"].includes(n.status));
  return (
    completed &&
    n.evidence.some(
      (e) =>
        !e.id.startsWith("progress:") &&
        [
          "document-supported",
          "reviewed",
          "user-reviewed",
          "issuer-verified",
          "institution-verified",
          "employer-verified",
        ].includes(e.status),
    )
  );
}
function prerequisiteState(
  n: WorldNode | undefined,
): "satisfied" | "missing" | "unknown" {
  if (!n) return "unknown";
  if (n.kind === "UniversityCourse")
    return courseCompletion(n)
      ? "satisfied"
      : n.dimensions?.reality === "hypothetical" ||
          n.evidence.some((e) => ["inferred", "disputed"].includes(e.status))
        ? "unknown"
        : "missing";
  return hasEvidenceSupport(n, "formal");
}
const dayNames: Record<string, string> = {
  monday: "mon",
  tuesday: "tue",
  wednesday: "wed",
  thursday: "thu",
  friday: "fri",
  saturday: "sat",
  sunday: "sun",
};
/** Supports explicit slot IDs and weekday/date HH:mm-HH:mm ranges, never guesses free-text timetable semantics. */
function slotRange(slot: string) {
  const m = slot
    .trim()
    .match(
      /^(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|\d{4}-\d{2}-\d{2})\s+(\d{2}):(\d{2})\s*[-–]\s*(\d{2}):(\d{2})$/i,
    );
  if (!m) return null;
  const hour1 = Number(m[2]),
    minute1 = Number(m[3]),
    hour2 = Number(m[4]),
    minute2 = Number(m[5]);
  if (hour1 > 23 || hour2 > 23 || minute1 > 59 || minute2 > 59) return null;
  const start = hour1 * 60 + minute1,
    end = hour2 * 60 + minute2;
  if (end <= start) return null;
  const day = m[1].toLowerCase();
  return { day: dayNames[day] || day, start, end };
}
export function timetableConflict(a: string, b: string) {
  if (a.trim().toLowerCase() === b.trim().toLowerCase()) return true;
  const x = slotRange(a),
    y = slotRange(b);
  return !!(x && y && x.day === y.day && x.start < y.end && y.start < x.end);
}
const contributing = new Set([
  "DEVELOPS",
  "CONTRIBUTES_TO",
  "RECOMMENDED_PREPARATION",
  "BUILDS_ON",
  "REQUIRES",
  "SUPPORTS_APPLICATION_TO",
]);
function reachable(graph: WorldGraph, start: string[]) {
  const found = new Set(start),
    queue = [...start],
    out = new Map<string, string[]>();
  for (const e of graph.edges)
    if (contributing.has(e.relation)) {
      const next = out.get(e.from) || [];
      next.push(e.to);
      out.set(e.from, next);
    }
  for (let i = 0; i < queue.length; i++)
    for (const id of out.get(queue[i]) || [])
      if (!found.has(id)) {
        found.add(id);
        queue.push(id);
      }
  return found;
}

/** Compares supplied constraints only. No course title creates a capability or enrolment right. */
export function evaluateSemesterCombination(
  courseIds: string[],
  courses: CourseRecord[],
  graph: WorldGraph,
  state: LivingState,
): SemesterCombination {
  const selectedIds = [...new Set(courseIds)],
    byId = new Map(courses.map((c) => [c.id, c])),
    nodes = new Map(graph.nodes.map((n) => [n.id, n]));
  const selected = selectedIds.flatMap((id) =>
      byId.has(id) ? [byId.get(id)!] : [],
    ),
    errors: string[] = [],
    unknowns: string[] = [],
    prerequisiteDetails: SemesterCombination["prerequisiteDetails"] = [];
  for (const id of selectedIds)
    if (!byId.has(id)) errors.push(`Unknown catalogue course: ${id}.`);
  const knownCredits = selected.reduce((sum, c) => sum + (c.credits ?? 0), 0),
    creditLimit = state.academic?.creditLimit ?? null;
  if (creditLimit === null && selected.length)
    unknowns.push("A credit limit has not been supplied.");
  if (creditLimit !== null && knownCredits > creditLimit)
    errors.push(
      `Known course credits ${knownCredits} exceed your supplied limit of ${creditLimit}.`,
    );
  // Formal group evaluation must not accept a current course merely because its enrolment has evidence.
  const prerequisiteNodes = graph.nodes.map((n) =>
    n.kind === "UniversityCourse" && !courseCompletion(n)
      ? {
          ...n,
          evidence: n.evidence.filter((e) =>
            ["inferred", "disputed", "revoked"].includes(e.status),
          ),
        }
      : n,
  );
  for (const c of selected) {
    if (c.credits === null)
      unknowns.push(`${c.title}: credit value is unknown.`);
    if (!c.schedule.length) unknowns.push(`${c.title}: timetable is missing.`);
    if (c.availability !== "published")
      unknowns.push(
        `${c.title}: current availability is ${c.availability === "fixture" ? "fictional, not an actual offering" : "unknown"}.`,
      );
    if (
      c.availability === "published" &&
      state.academic?.term.trim() &&
      c.term.toLowerCase() !== state.academic.term.trim().toLowerCase()
    )
      errors.push(
        `${c.title}: published term differs from your selected term.`,
      );
    const groups = nodes.get(c.id)?.requirementGroups || [],
      formalGroups = groups.filter((g) => g.requirement === "formal"),
      groupIds = new Set(formalGroups.flatMap((g) => g.nodeIds));
    for (const id of c.prerequisites.filter((id) => !groupIds.has(id))) {
      const result = prerequisiteState(nodes.get(id));
      prerequisiteDetails.push({
        courseId: c.id,
        operator: "AND",
        ids: [id],
        state: result,
        source: c.source.reference,
      });
      if (result === "missing")
        errors.push(
          `${c.title}: prerequisite ${nodes.get(id)?.label || id} has no recorded completion. Selecting it in the same term does not establish completion.`,
        );
      else if (result === "unknown")
        unknowns.push(
          `${c.title}: prerequisite evidence for ${nodes.get(id)?.label || id} needs confirmation.`,
        );
    }
    if (groups.length) {
      const evaluation = evaluatePrerequisiteGroups(groups, prerequisiteNodes);
      for (const g of evaluation.groups) {
        prerequisiteDetails.push({
          courseId: c.id,
          operator: g.operator,
          ids: [...g.satisfiedIds, ...g.missingIds, ...g.unknownIds],
          state: g.state,
          source: g.sourceReference,
        });
        if (g.requirement === "advisory" && g.state !== "satisfied")
          unknowns.push(
            `${c.title}: advisory ${g.operator} preparation is not fully evidenced; it is not an enrolment gate.`,
          );
        else if (g.requirement === "formal" && g.state === "missing")
          errors.push(
            `${c.title}: supplied formal ${g.operator} prerequisite group ${g.id} is not satisfied.`,
          );
        else if (g.requirement === "formal" && g.state === "unknown")
          unknowns.push(
            `${c.title}: supplied formal ${g.operator} prerequisite group ${g.id} is unresolved.`,
          );
      }
      if (evaluation.cycles.length)
        unknowns.push(`${c.title}: a source prerequisite cycle needs review.`);
    }
    if (c.restrictions.length)
      unknowns.push(
        `${c.title}: review supplied restrictions: ${c.restrictions.join(" ")}`,
      );
  }
  for (let i = 0; i < selected.length; i++)
    for (let j = i + 1; j < selected.length; j++)
      if (
        selected[i].schedule.some((a) =>
          selected[j].schedule.some((b) => timetableConflict(a, b)),
        )
      )
        errors.push(
          `${selected[i].title} and ${selected[j].title}: supplied timetable slots conflict.`,
        );
  const capabilityIds = new Set<string>();
  for (const c of selected) {
    for (const e of graph.edges)
      if (e.from === c.id && e.relation === "DEVELOPS" && nodes.has(e.to))
        capabilityIds.add(e.to);
    for (const n of graph.nodes)
      if (
        ["Capability", "KnowledgeDomain"].includes(n.kind) &&
        n.skillIds.some((id) => c.skillIds.includes(id))
      )
        capabilityIds.add(n.id);
  }
  const reach = reachable(graph, [...selectedIds, ...capabilityIds]);
  const goalIds = state.goals.filter((id) => reach.has(id));
  return {
    selectedIds,
    knownCredits,
    creditLimit,
    status: errors.length
      ? "blocked"
      : unknowns.length
        ? "needs-confirmation"
        : "within-supplied-checks",
    errors: [...new Set(errors)],
    unknowns: [...new Set(unknowns)],
    capabilityIds: [...capabilityIds].sort(),
    goalIds,
    prerequisiteDetails,
    limitations: [
      "This comparison checks supplied records only; enrolment, transfer-credit rules and programme-specific admissions remain unverified.",
      "Credits do not establish weekly effort. No course workload duration or free time is invented.",
      "Timetable checks cover identical slot IDs and explicit weekday/date time ranges; other overlaps require source confirmation.",
      "Goal connections describe advisory preparation, never a probability of admission or employment.",
    ],
  };
}
export function compareSemesterCombinations(
  a: string[],
  b: string[],
  courses: CourseRecord[],
  graph: WorldGraph,
  state: LivingState,
) {
  const left = evaluateSemesterCombination(a, courses, graph, state),
    right = evaluateSemesterCombination(b, courses, graph, state),
    leftCaps = new Set(left.capabilityIds),
    rightCaps = new Set(right.capabilityIds);
  return {
    a: left,
    b: right,
    sharedCapabilities: left.capabilityIds.filter((id) => rightCaps.has(id)),
    onlyA: left.capabilityIds.filter((id) => !rightCaps.has(id)),
    onlyB: right.capabilityIds.filter((id) => !leftCaps.has(id)),
    sharedGoals: left.goalIds.filter((id) => right.goalIds.includes(id)),
  };
}
