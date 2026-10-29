import { test } from "node:test";
import assert from "node:assert/strict";
import { curricula } from "../src/odyssey/curricula";
import {
  buildRoadmap,
  topologicalOrder,
  feasiblePlan,
  shortestRoute,
} from "../src/odyssey/graph";
import { catalogue } from "../src/odyssey/server/data";
import {
  searchOccupations,
  relatedOccupations,
} from "../src/odyssey/catalogue";
import type { Person } from "../src/odyssey/types";
const person: Person = {
  id: "p",
  name: "Fictional",
  headline: "",
  fictional: true,
  hoursPerWeek: 5,
  interests: [],
  locations: [],
  languages: [],
  budget: "free-resources",
  assertions: [],
  claims: [],
  courses: [],
};
test("three distinct rich curricula contain real dependencies and original actionable content", () => {
  for (const c of curricula) {
    assert.ok(c.topics.length >= 30, c.id);
    assert.ok(c.families.length >= 5);
    const { order, cycles } = topologicalOrder(c.topics);
    assert.equal(cycles.length, 0, c.id);
    for (const t of c.topics) {
      assert.ok(t.summary.length > 40);
      assert.ok(t.resources.length);
      for (const p of t.prerequisites)
        assert.ok(order.indexOf(p) < order.indexOf(t.id));
    }
  }
  assert.notDeepEqual(
    curricula[0].topics.map((t) => t.id),
    curricula[1].topics.map((t) => t.id),
  );
});
test("non-curated careers use actual source requirements and have onward possibilities", () => {
  const o = searchOccupations(catalogue, "mechanical engineer")[0];
  const skills = catalogue.skills.filter((s) =>
    [...o.essential, ...o.optional].includes(s.id),
  );
  const g = buildRoadmap(o, skills, relatedOccupations(catalogue, o.id));
  assert.ok(g.topics.length > 6);
  assert.ok(g.onward.length);
  assert.ok(
    g.topics
      .filter((t) => t.provenance === "source-requirement")
      .every((t) => t.prerequisites.length === 0),
  );
});
test("evidence and completion change required learning closure without issuing credentials", () => {
  const o = searchOccupations(catalogue, "economist")[0];
  const g = buildRoadmap(
    o,
    catalogue.skills.filter((s) =>
      [...o.essential, ...o.optional].includes(s.id),
    ),
    relatedOccupations(catalogue, o.id),
  );
  const before = feasiblePlan(g, person, [], "topic:econometrics");
  assert.ok(before.topicIds.includes("topic:micro"));
  const after = feasiblePlan(
    g,
    person,
    ["topic:micro"],
    "topic:econometrics",
    "project",
  );
  assert.ok(!after.topicIds.includes("topic:micro"));
  assert.equal(after.route, "project");
  assert.equal(person.assertions.length, 0);
});
test("cycle detection and minimum-cost alternative routing are explicit", () => {
  const t = curricula[0].topics[0];
  assert.ok(topologicalOrder([{ ...t, prerequisites: [t.id] }]).cycles.length);
  const r = shortestRoute("start", "goal", [
    { from: "start", to: "course", cost: 5, data: "course" },
    { from: "course", to: "goal", cost: 2, data: "review" },
    { from: "start", to: "project", cost: 2, data: "project" },
    { from: "project", to: "goal", cost: 1, data: "review" },
  ]);
  assert.equal(r?.cost, 3);
  assert.equal(r?.edges[0].to, "project");
  assert.equal(shortestRoute("start", "missing", []), null);
});
