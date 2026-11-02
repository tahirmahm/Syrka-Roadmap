import { test } from "node:test";
import assert from "node:assert/strict";
import {
  radialDomains,
  domainPage,
  domainForNode,
  projectRadialBranch,
} from "../src/living/radial-projection";
import type { WorldNode, WorldEdge, WorldGraph } from "../src/living/schema";
import { catalogue } from "../src/odyssey/server/data";
import { livingDemo } from "../src/living/demos";
import { buildWorld } from "../src/living/engine";
const source = {
  kind: "fixture" as const,
  reference: "Fictional sourced relationship",
  version: "1",
  checkedAt: null,
  quality: "fictional" as const,
};
function node(
  id: string,
  domain = "Research",
  kind: WorldNode["kind"] = "Capability",
): WorldNode {
  return {
    id,
    label: id,
    kind,
    summary: "Fictional node",
    domain,
    skillIds: [],
    source,
    requirement: "advisory",
    status: "available",
    evidence: [],
    actions: [],
    prerequisites: [],
  };
}
function edge(from: string, to: string, formal = false): WorldEdge {
  return {
    id: from + "→" + to,
    from,
    to,
    relation: formal ? "REQUIRES" : "CONTRIBUTES_TO",
    rationale: "Explicit fictional source relation",
    source,
    requirement: formal ? "formal" : "advisory",
  };
}
function graph(nodes: WorldNode[], edges: WorldEdge[] = []): WorldGraph {
  return {
    version: "syrka.living/1",
    nodes,
    edges,
    notice: "Fictional fixture",
    catalogueVersion: "test",
  };
}
const ids = (nodes: WorldNode[]) => nodes.map((n) => n.id).sort();

test("the actual fictional PPE profile anchors analysis at evidenced subjects despite incoming course preparation", () => {
  const workspace = livingDemo(catalogue.skills, "ppe-consulting"),
    g = buildWorld(workspace, catalogue),
    domain = radialDomains(g).find((d) => d.id === "analysis")!;
  const foundations = domain.rootIds.map((id) =>
    g.nodes.find((n) => n.id === id)!,
  );
  assert.deepEqual(foundations.map((n) => n.label).sort(), [
    "Economics",
    "Statistics",
  ]);
  assert.ok(
    foundations.every(
      (n) =>
        n.evidence.length > 0 &&
        n.evidence.every((e) => e.status === "document-supported") &&
        g.edges.some((e) => e.to === n.id),
    ),
  );
  const projection = projectRadialBranch(g, {
    domainId: domain.id,
    expanded: [foundations[0].id],
    goalIds: workspace.living!.goals,
  });
  assert.ok(foundations.every((n) => projection.nodes.some((v) => v.id === n.id)));
  assert.ok(projection.nodes.length <= 16);
  assert.ok(projection.displayEdges.every((e) => g.edges.includes(e)));
  assert.ok(
    projection.nodes
      .filter((n) => foundations.some((f) => f.id === n.id))
      .every((n) => n.status !== "verified"),
  );
});

test("a newer PPE preparation expansion reveals new canonical records at a full budget while another node remains selected", () => {
  const workspace = livingDemo(catalogue.skills, "ppe-consulting"),
    g = buildWorld(workspace, catalogue),
    statistics = g.nodes.find((n) => n.label === "Statistics")!.id,
    destination = "goal:economics",
    options = {
      domainId: "analysis",
      selectedId: statistics,
      goalIds: workspace.living!.goals,
      budget: 16,
    },
    previous = projectRadialBranch(g, {
      ...options,
      expanded: [statistics],
    }),
    opened = projectRadialBranch(g, {
      ...options,
      expanded: [statistics, destination],
    }),
    collapsed = projectRadialBranch(g, {
      ...options,
      expanded: [statistics],
    });
  assert.equal(previous.nodes.length, 16);
  assert.ok(previous.hiddenByNode[destination] > 0);
  const existing = new Set(previous.nodes.map((n) => n.id)),
    additions = opened.nodes.filter((n) => !existing.has(n.id));
  assert.ok(additions.length > 0, "opening preparation must add records, not only reorder the same IDs");
  assert.ok(
    additions.some((n) =>
      g.edges.some(
        (e) =>
          (e.from === n.id && e.to === destination) ||
          (e.to === n.id && e.from === destination),
      ),
    ),
  );
  assert.ok(opened.nodes.length <= 16);
  assert.ok(opened.nodes.some((n) => n.id === statistics));
  assert.ok(opened.nodes.some((n) => n.id === destination));
  assert.equal(new Set(opened.nodes.map((n) => n.id)).size, opened.nodes.length);
  assert.deepEqual(ids(collapsed.nodes), ids(previous.nodes));
  assert.ok(opened.hiddenCount > 0);
  assert.ok(opened.displayEdges.every((e) => g.edges.includes(e)));
});

test("dense overlapping professional preparation reveals unseen records rather than its already visible canonical prefix", () => {
  const workspace = livingDemo(catalogue.skills, "ppe-consulting"),
    g = buildWorld(workspace, catalogue),
    domain = radialDomains(g).find((d) => d.id === "professional")!,
    owner = domain.rootIds[0],
    destination = g.nodes.find((n) => n.label === "Management consulting")!.id;
  for (const budget of [12, 16]) {
    const options = {
        domainId: domain.id,
        selectedId: owner,
        goalIds: workspace.living!.goals,
        budget,
      },
      previous = projectRadialBranch(g, { ...options, expanded: [owner] }),
      opened = projectRadialBranch(g, {
        ...options,
        expanded: [owner, destination],
      }),
      visible = new Set(previous.nodes.map((n) => n.id));
    assert.ok(previous.hiddenByNode[destination] > 0);
    assert.ok(opened.nodes.some((n) => !visible.has(n.id)));
    assert.ok(opened.nodes.some((n) => n.id === owner));
    assert.ok(opened.nodes.some((n) => n.id === destination));
    assert.ok(opened.nodes.length <= budget);
    assert.ok(opened.displayEdges.every((e) => g.edges.includes(e)));
    assert.ok(opened.hiddenCount > 0);
  }
});

test("wheel groups structured domains only; source history and uncategorised records do not become buds", () => {
  const g = graph(
    [
      node("person", "Foundation", "PersonProfile"),
      node("real-research"),
      node("generic-skill", "Capabilities"),
      node("unmapped", "Capabilities"),
      node("raw-history", "History", "Project"),
      node("evidence:prior", "Research", "Credential"),
      node("fake-title", "Computing"),
      node("current-programme", "Foundation", "AcademicProgramme"),
    ],
    [edge("generic-skill", "real-research")],
  );
  g.nodes.find((n) => n.id === "fake-title")!.label =
    "Economics finance research politics";
  const domains = radialDomains(g);
  assert.deepEqual(
    domains.map((d) => d.id),
    ["technology", "research"],
  );
  assert.equal(domainForNode(g, "fake-title"), "technology");
  assert.equal(domainForNode(g, "generic-skill"), "research");
  assert.equal(domainForNode(g, "unmapped"), null);
  assert.ok(
    !domains.some((d) =>
      d.nodeIds.some((id) =>
        [
          "person",
          "raw-history",
          "evidence:prior",
          "current-programme",
        ].includes(id),
      ),
    ),
  );
  const empty = projectRadialBranch(g, { domainId: "missing" });
  assert.equal(empty.nodes.length, 0);
  assert.equal(empty.domain, null);
});

test("only real structured categories create sectors; stable pages never exceed eight wedges", () => {
  const g = graph(
    Array.from({ length: 19 }, (_, i) =>
      node("node:" + i, "Specialist discipline " + String(i).padStart(2, "0")),
    ),
  );
  const domains = radialDomains(g),
    reverse = radialDomains({ ...g, nodes: [...g.nodes].reverse() });
  assert.deepEqual(
    domains.map((d) => d.id),
    reverse.map((d) => d.id),
  );
  assert.equal(domains.length, 19);
  for (let page = 0; page < 3; page++) {
    const view = domainPage(domains, page);
    assert.ok(view.domains.length <= 8);
    assert.equal(view.totalPages, 3);
  }
  const single = radialDomains(graph([node("just-one", "Research")]));
  assert.equal(single.length, 1);
  assert.equal(domainPage(single).domains.length, 1);
});

test("an actual prerequisite with four successors expands and collapses spatially without creating relationships", () => {
  const g = graph(
    [
      node("foundation"),
      ...Array.from({ length: 4 }, (_, i) => node("successor:" + i)),
    ],
    Array.from({ length: 4 }, (_, i) =>
      edge("foundation", "successor:" + i, true),
    ),
  );
  const before = JSON.stringify(g),
    preview = projectRadialBranch(g, { domainId: "research" }),
    expanded = projectRadialBranch(g, {
      domainId: "research",
      expanded: ["foundation"],
    }),
    collapsed = projectRadialBranch(g, { domainId: "research", expanded: [] });
  assert.equal(preview.nodes.length, 3);
  assert.equal(expanded.nodes.length, 5);
  assert.deepEqual(ids(preview.nodes), ids(collapsed.nodes));
  assert.equal(expanded.displayEdges.length, 4);
  assert.ok(
    expanded.displayEdges.every(
      (e) => g.edges.includes(e) && e.requirement === "formal",
    ),
  );
  assert.equal(
    new Set(expanded.nodes.map((n) => n.id)).size,
    expanded.nodes.length,
  );
  assert.equal(JSON.stringify(g), before);
  const root = expanded.positions.get("foundation")!;
  for (let i = 0; i < 4; i++)
    assert.ok(expanded.positions.get("successor:" + i)!.x > root.x);
});

test("selection does not expand or jitter an already disclosed branch; hover has no projection state", () => {
  const g = graph(
    [node("root"), node("a"), node("b"), node("deeper")],
    [edge("root", "a"), edge("root", "b"), edge("a", "deeper")],
  );
  const initial = projectRadialBranch(g, { domainId: "research" }),
    selected = projectRadialBranch(g, {
      domainId: "research",
      selectedId: "a",
    });
  assert.deepEqual(ids(initial.nodes), ids(selected.nodes));
  assert.deepEqual([...initial.positions], [...selected.positions]);
  assert.ok(!selected.nodes.some((n) => n.id === "deeper"));
  const expanded = projectRadialBranch(g, {
    domainId: "research",
    selectedId: "a",
    expanded: ["a"],
  });
  assert.ok(expanded.nodes.some((n) => n.id === "deeper"));
});

test("collapsing one expanded owner preserves a shared canonical prerequisite owned by another expansion", () => {
  const g = graph(
    [
      node("root:a"),
      node("root:b"),
      node("a"),
      node("b"),
      node("exclusive"),
      node("shared"),
    ],
    [
      edge("root:a", "a"),
      edge("root:a", "b"),
      edge("root:a", "exclusive"),
      edge("root:a", "shared"),
      edge("root:b", "shared"),
    ],
  );
  const both = projectRadialBranch(g, {
      domainId: "research",
      expanded: ["root:a", "root:b"],
    }),
    after = projectRadialBranch(g, {
      domainId: "research",
      expanded: ["root:b"],
    });
  assert.ok(both.nodes.some((n) => n.id === "exclusive"));
  assert.ok(after.nodes.some((n) => n.id === "shared"));
  assert.equal(after.nodes.filter((n) => n.id === "shared").length, 1);
  assert.ok(!after.nodes.some((n) => n.id === "exclusive"));
});

test("dense formal preparation respects the view budget, preserves the selected destination and explicitly names hidden requirements", () => {
  const requirements = Array.from({ length: 80 }, (_, i) =>
      node("req:" + String(i).padStart(2, "0")),
    ),
    destination = node("destination", "Research", "ResearchPathway"),
    foreign = node("other-discipline", "Computing");
  const g = graph(
    [...requirements, destination, foreign],
    [
      ...requirements.map((n) => edge(n.id, "destination", true)),
      edge("other-discipline", "destination", true),
    ],
  );
  const p = projectRadialBranch(g, {
    domainId: "research",
    selectedId: "destination",
    expanded: ["destination"],
    budget: 16,
  });
  assert.equal(p.nodes.length, 16);
  assert.ok(p.nodes.some((n) => n.id === "destination"));
  assert.ok(!p.nodes.some((n) => n.id === "other-discipline"));
  assert.ok(
    p.displayEdges.every(
      (e) =>
        p.nodes.some((n) => n.id === e.from) &&
        p.nodes.some((n) => n.id === e.to),
    ),
  );
  assert.equal(p.hiddenCount, 81 - 16);
  assert.ok(
    p.hiddenRequirements.some(
      (r) => r.nodeId === "other-discipline" && r.reason === "other-domain",
    ),
  );
  assert.equal(
    p.hiddenRequirements.filter((r) => r.nodeId.startsWith("req:")).length,
    65,
  );
  assert.ok(p.hiddenByNode.destination >= 65);
  assert.ok(p.bounds.width <= 800);
  assert.ok(p.bounds.height <= 610);
  const positions = [...p.positions.values()];
  for (let a = 0; a < positions.length; a++)
    for (let b = a + 1; b < positions.length; b++)
      assert.ok(
        Math.hypot(
          positions[a].x - positions[b].x,
          positions[a].y - positions[b].y,
        ) >= 100,
      );
});

test("AND/OR rules retain source/group identifiers when off-domain or missing alternatives are aggregated", () => {
  const destination = node("destination", "Research", "GraduateProgramme");
  destination.requirementGroups = [
    {
      id: "route-or",
      operator: "OR",
      nodeIds: ["cross", "missing"],
      requirement: "formal",
      sourceReference: "Fictional published alternative rule",
    },
  ];
  const g = graph([destination, node("cross", "Computing")]);
  const p = projectRadialBranch(g, {
    domainId: "research",
    selectedId: "destination",
  });
  assert.equal(p.hiddenRequirements.length, 2);
  assert.ok(
    p.hiddenRequirements.every(
      (r) =>
        r.operator === "OR" &&
        r.groupId === "route-or" &&
        r.sourceReference === "Fictional published alternative rule",
    ),
  );
  assert.equal(
    p.hiddenRequirements.find((r) => r.nodeId === "missing")?.reason,
    "missing-record",
  );
  assert.equal(p.displayEdges.length, 0);
});

test("goal relevance is selective, source-backed and absent when no actual goal relationship exists", () => {
  const goal = node("goal:practice", "Enterprise", "Occupation"),
    g = graph(
      [
        node("foundation"),
        ...Array.from({ length: 5 }, (_, i) => node("prep:" + i)),
        goal,
      ],
      [
        ...Array.from({ length: 5 }, (_, i) => edge("foundation", "prep:" + i)),
        ...Array.from({ length: 4 }, (_, i) =>
          edge("prep:" + i, "goal:practice"),
        ),
      ],
    );
  const without = projectRadialBranch(g, {
    domainId: "research",
    expanded: ["foundation"],
  });
  assert.equal(without.relevance.size, 0);
  const withGoal = projectRadialBranch(g, {
    domainId: "research",
    expanded: ["foundation"],
    goalIds: ["goal:practice"],
  });
  assert.ok(withGoal.relevance.size > 0 && withGoal.relevance.size <= 3);
  assert.ok(
    [...withGoal.relevance.values()].every(
      (reason) =>
        reason.includes(source.reference) &&
        reason.includes("not verified mastery"),
    ),
  );
  assert.ok(!withGoal.nodes.some((n) => n.id === goal.id));
  assert.ok(
    withGoal.relatedPaths.some(
      (r) => r.toId === goal.id && r.domainId === "professional",
    ),
  );
  assert.equal(
    projectRadialBranch(g, { domainId: "research", goalIds: ["invented"] })
      .relevance.size,
    0,
  );
});

test("selected deep canonical nodes remain inspectable and can disclose actual neighbours without fabricated shortcut edges", () => {
  const nodes = Array.from({ length: 35 }, (_, i) =>
      node("chain:" + String(i).padStart(2, "0")),
    ),
    g = graph(
      nodes,
      nodes.slice(0, -1).map((n, i) => edge(n.id, nodes[i + 1].id, true)),
    );
  const p = projectRadialBranch(g, {
    domainId: "research",
    selectedId: "chain:28",
    expanded: ["chain:28"],
    budget: 12,
  });
  assert.ok(p.nodes.some((n) => n.id === "chain:28"));
  assert.ok(p.nodes.some((n) => n.id === "chain:29"));
  assert.ok(p.nodes.length <= 12);
  assert.ok(p.displayEdges.every((e) => g.edges.includes(e)));
});
