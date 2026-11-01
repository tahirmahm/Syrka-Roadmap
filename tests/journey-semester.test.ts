import { test } from "node:test";
import assert from "node:assert/strict";
import type {
  CourseRecord,
  WorldGraph,
  WorldNode,
  WorldEdge,
  LivingState,
} from "../src/living/schema";
import { emptyLiving } from "../src/living/schema";
import {
  evaluateSemesterCombination,
  compareSemesterCombinations,
  timetableConflict,
} from "../src/journey/semester";
const source = {
  kind: "fixture" as const,
  reference: "Explicit fictional curriculum test source",
  version: "test-1",
  checkedAt: null,
  quality: "fictional" as const,
};
function course(id: string, patch: Partial<CourseRecord> = {}): CourseRecord {
  return {
    id,
    institution: "Fictional institution",
    programme: "Fictional programme",
    code: null,
    title: id,
    credits: 6,
    language: "English",
    term: "Spring 2027",
    outcomes: [],
    skillIds: [],
    prerequisites: [],
    restrictions: [],
    availability: "published",
    schedule: ["slot:" + id],
    source,
    ...patch,
  };
}
function node(id: string, patch: Partial<WorldNode> = {}): WorldNode {
  return {
    id,
    label: id,
    kind: "UniversityCourse",
    summary: "Fictional test record",
    domain: "Academic",
    skillIds: [],
    source,
    requirement: "unknown",
    status: "available",
    evidence: [],
    actions: [],
    prerequisites: [],
    ...patch,
  };
}
function graph(nodes: WorldNode[], edges: WorldEdge[] = []): WorldGraph {
  return {
    version: "syrka.living/1",
    catalogueVersion: "test",
    notice: "Fictional tests only",
    nodes,
    edges,
  };
}
function state(): LivingState {
  return {
    ...emptyLiving(),
    goals: ["goal:consulting", "goal:research"],
    academic: {
      institution: "Fictional institution",
      faculty: "Fictional faculty",
      programme: "Fictional programme",
      level: "undergraduate",
      specialisation: "",
      year: "2",
      term: "Spring 2027",
      creditLimit: 12,
      remainingRequirements: [],
    },
  };
}
function edge(
  from: string,
  to: string,
  relation: WorldEdge["relation"],
): WorldEdge {
  return {
    id: from + relation + to,
    from,
    to,
    relation,
    rationale: "Explicit fictional source relationship",
    source,
    requirement: "advisory",
  };
}
const completed = (id: string) =>
  node(id, {
    status: "reported",
    evidence: [
      {
        id: "record:" + id,
        text: "Reported complete course",
        quote: "Completed this fictional course",
        status: "document-supported",
      },
    ],
  });

test("semester comparison detects impossible credits, deduplicates selections and preserves actual state", () => {
  const courses = [
      course("econometrics", { credits: 8 }),
      course("policy", { credits: 8 }),
    ],
    g = graph(courses.map((c) => node(c.id))),
    s = state(),
    before = JSON.stringify({ g, s });
  const r = evaluateSemesterCombination(
    ["econometrics", "policy", "econometrics"],
    courses,
    g,
    s,
  );
  assert.equal(r.knownCredits, 16);
  assert.equal(r.selectedIds.length, 2);
  assert.equal(r.status, "blocked");
  assert.match(r.errors.join(" "), /exceed/);
  assert.equal(JSON.stringify({ g, s }), before);
});

test("semester timetable checks detect supplied slot conflicts and overlapping weekday intervals", () => {
  assert.equal(
    timetableConflict("Monday 09:00-11:00", "Mon 10:00-12:00"),
    true,
  );
  assert.equal(
    timetableConflict("Mon 09:00-10:00", "Monday 10:00-11:00"),
    false,
  );
  assert.equal(timetableConflict("room-slot-1", "room-slot-1"), true);
  const courses = [
    course("econometrics", { schedule: ["Monday 09:00-11:00"] }),
    course("policy", { schedule: ["Mon 10:00-12:00"] }),
  ];
  const r = evaluateSemesterCombination(
    courses.map((c) => c.id),
    courses,
    graph(courses.map((c) => node(c.id))),
    state(),
  );
  assert.equal(r.status, "blocked");
  assert.match(r.errors.join(" "), /timetable slots conflict/);
});

test("formal AND/OR course requirements use completed evidence, not current enrolment or same-term selection", () => {
  const c = course("econometrics", { prerequisites: ["intro-a", "intro-b"] }),
    a = completed("intro-a"),
    b = node("intro-b", {
      status: "working",
      evidence: [
        {
          id: "enrolment",
          text: "Enrolled",
          quote: "Currently enrolled",
          status: "document-supported",
        },
      ],
    }),
    target = node(c.id, {
      requirementGroups: [
        {
          id: "alternative-intro",
          operator: "OR",
          nodeIds: [a.id, b.id],
          requirement: "formal",
          sourceReference: "Fictional OR rule",
        },
      ],
    });
  let r = evaluateSemesterCombination(
    [c.id],
    [c],
    graph([a, b, target]),
    state(),
  );
  assert.equal(r.status, "within-supplied-checks");
  assert.equal(r.prerequisiteDetails[0].operator, "OR");
  assert.equal(r.prerequisiteDetails[0].state, "satisfied");
  target.requirementGroups![0].operator = "AND";
  r = evaluateSemesterCombination([c.id], [c], graph([a, b, target]), state());
  assert.equal(r.status, "blocked");
  assert.match(r.errors.join(" "), /AND prerequisite/);
  const checked = completed("intro-a");
  checked.evidence = [
    {
      id: "progress:intro-a",
      text: "Checked complete",
      quote: "",
      status: "self-reported",
    },
  ];
  target.requirementGroups![0].operator = "OR";
  r = evaluateSemesterCombination(
    [c.id],
    [c],
    graph([checked, b, target]),
    state(),
  );
  assert.equal(r.status, "blocked");
  const legacy = course("advanced", { prerequisites: ["intro-a"] });
  r = evaluateSemesterCombination(
    [legacy.id, "intro-a"],
    [legacy, course("intro-a")],
    graph([node(legacy.id), node("intro-a")]),
    state(),
  );
  assert.equal(r.status, "blocked");
  assert.match(r.errors.join(" "), /same term does not establish completion/);
});

test("unknown credits, availability and prerequisite IDs remain unknown rather than eligible", () => {
  const c = course("uncertain", {
    credits: null,
    availability: "unknown",
    schedule: [],
    prerequisites: ["missing-record"],
  });
  const r = evaluateSemesterCombination(
    [c.id],
    [c],
    graph([node(c.id)]),
    state(),
  );
  assert.equal(r.status, "needs-confirmation");
  assert.equal(r.knownCredits, 0);
  assert.match(r.unknowns.join(" "), /credit value is unknown/);
  assert.match(r.unknowns.join(" "), /timetable is missing/);
  assert.match(r.unknowns.join(" "), /prerequisite evidence/);
  assert.match(r.limitations.join(" "), /admissions remain unverified/);
  assert.match(r.limitations.join(" "), /No course workload duration/);
  const wrongTerm = course("autumn", { term: "Autumn 2027" });
  assert.equal(
    evaluateSemesterCombination(
      [wrongTerm.id],
      [wrongTerm],
      graph([node(wrongTerm.id)]),
      state(),
    ).status,
    "blocked",
  );
});

test("capability trade-offs and shared goal benefits follow explicit IDs and directed relationships", () => {
  const courses = [
    course("quantitative", { skillIds: ["esco:stats"] }),
    course("research", { skillIds: ["esco:stats", "esco:writing"] }),
    course("Statistics and academic writing"),
  ];
  const nodes = [
    ...courses.map((c) => node(c.id)),
    node("cap:stats", { kind: "Capability", skillIds: ["esco:stats"] }),
    node("cap:writing", { kind: "Capability", skillIds: ["esco:writing"] }),
    node("goal:consulting", { kind: "Occupation" }),
    node("goal:research", { kind: "ResearchPathway" }),
  ];
  const edges = [
    edge("quantitative", "cap:stats", "DEVELOPS"),
    edge("research", "cap:writing", "DEVELOPS"),
    edge("cap:stats", "goal:consulting", "CONTRIBUTES_TO"),
    edge("cap:writing", "goal:research", "CONTRIBUTES_TO"),
  ];
  const comparison = compareSemesterCombinations(
    ["quantitative"],
    ["research"],
    courses,
    graph(nodes, edges),
    state(),
  );
  assert.deepEqual(comparison.sharedCapabilities, ["cap:stats"]);
  assert.deepEqual(comparison.onlyA, []);
  assert.deepEqual(comparison.onlyB, ["cap:writing"]);
  assert.deepEqual(comparison.sharedGoals, ["goal:consulting"]);
  const unrelated = evaluateSemesterCombination(
    ["Statistics and academic writing"],
    courses,
    graph(nodes, edges),
    state(),
  );
  assert.deepEqual(unrelated.capabilityIds, []);
  assert.deepEqual(unrelated.goalIds, []);
});
