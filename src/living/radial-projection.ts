import type { WorldEdge, WorldGraph, WorldNode } from "./schema";

export type RadialAppearance =
  | "analysis"
  | "technology"
  | "research"
  | "communication"
  | "practice"
  | "creative"
  | "public"
  | "other";
export type RadialDomain = {
  id: string;
  label: string;
  sourceDomains: string[];
  nodeIds: string[];
  rootIds: string[];
  count: number;
  appearance: RadialAppearance;
};
export type HiddenRadialRequirement = {
  nodeId: string;
  targetId: string;
  relation: string;
  operator: "AND" | "OR" | null;
  groupId?: string;
  sourceReference: string;
  reason: "collapsed" | "budget" | "other-domain" | "missing-record";
};
export type RadialRelatedPath = {
  fromId: string;
  toId: string;
  domainId: string;
  relation: string;
  sourceReference: string;
};
export type RadialProjection = {
  domain: RadialDomain | null;
  nodes: WorldNode[];
  displayEdges: WorldEdge[];
  edges: WorldEdge[];
  roots: string[];
  displayParent: Map<string, string | null>;
  positions: Map<string, { x: number; y: number }>;
  bounds: { width: number; height: number };
  hiddenCount: number;
  hiddenByNode: Record<string, number>;
  hiddenRequirements: HiddenRadialRequirement[];
  relatedPaths: RadialRelatedPath[];
  relatedPathCount: number;
  relevance: Map<string, string>;
  allNodeIds: string[];
};
const normalize = (value: string) =>
  value.trim().toLocaleLowerCase("en").replace(/\s+/g, " ");
// Explicit structured-category aliases. Node labels, CV text and quotations are never classifiers.
const families: {
  id: string;
  label: string;
  appearance: RadialAppearance;
  domains: string[];
}[] = [
  {
    id: "analysis",
    label: "Analysis & economics",
    appearance: "analysis",
    domains: [
      "Quantitative",
      "Economics",
      "Business & finance",
      "Analysis",
      "Finance",
      "Mathematics",
      "Statistics",
      "Data analysis",
    ],
  },
  {
    id: "technology",
    label: "Technology & engineering",
    appearance: "technology",
    domains: [
      "Computing",
      "Technology",
      "Science & engineering",
      "Engineering",
      "Information technology",
      "ICT",
    ],
  },
  {
    id: "research",
    label: "Research & study",
    appearance: "research",
    domains: [
      "Research",
      "Graduate study",
      "Academic research",
      "Science",
      "Education",
    ],
  },
  {
    id: "public",
    label: "Policy & society",
    appearance: "public",
    domains: [
      "Politics",
      "Law, society & culture",
      "Leadership & public affairs",
      "Public policy",
      "Law",
      "International relations",
    ],
  },
  {
    id: "professional",
    label: "Professional practice",
    appearance: "practice",
    domains: [
      "Enterprise",
      "Business management",
      "Business services",
      "Professional practice",
      "Management",
      "Commerce",
    ],
  },
  {
    id: "communication",
    label: "Communication",
    appearance: "communication",
    domains: [
      "Communication",
      "Communications",
      "Languages",
      "Journalism",
      "Writing",
    ],
  },
  {
    id: "creative",
    label: "Creative practice",
    appearance: "creative",
    domains: ["Creative practice", "Arts", "Art", "Design", "Culture"],
  },
];
const categoryMap = new Map(
  families.flatMap((f) =>
    f.domains.map((domain) => [normalize(domain), f] as const),
  ),
);
const generic = new Set([
  "",
  "capabilities",
  "academic",
  "foundation",
  "history",
  "other occupations",
  "other",
  "uncategorised",
  "uncategorized",
  "actions",
  "current commitments",
  "current actions",
  "evidence",
  "work",
  "commitments",
]);
const presentationKinds = new Set([
  "Capability",
  "KnowledgeDomain",
  "UniversityCourse",
  "Project",
  "Credential",
  "Occupation",
  "EmployerRole",
  "GraduateProgramme",
  "ResearchPathway",
  "Opportunity",
  "ProgressMilestone",
  "Internship",
]);
const preparatory = new Set([
  "REQUIRES",
  "BUILDS_ON",
  "DEVELOPS",
  "DEMONSTRATES",
  "CONTRIBUTES_TO",
  "RECOMMENDED_PREPARATION",
  "SUPPORTS_APPLICATION_TO",
  "ALTERNATIVE_PATH_TO",
]);
function eligible(node: WorldNode) {
  const capability = ["Capability", "KnowledgeDomain"].includes(node.kind);
  return (
    presentationKinds.has(node.kind) &&
    !node.id.startsWith("evidence:") &&
    !node.id.startsWith("record-course:") &&
    !node.id.startsWith("legacy-progress:") &&
    normalize(node.domain) !== "history" &&
    (capability || node.status !== "historical")
  );
}
function stableId(value: string) {
  let a = 2166136261,
    b = 2246822507;
  for (const c of value) {
    a = Math.imul(a ^ c.charCodeAt(0), 16777619);
    b = Math.imul(b ^ c.charCodeAt(0), 3266489909);
  }
  return (a >>> 0).toString(16) + (b >>> 0).toString(16);
}
function explicitDomain(
  node: WorldNode,
): Omit<RadialDomain, "nodeIds" | "rootIds" | "count"> | null {
  const key = normalize(node.domain);
  if (generic.has(key)) return null;
  const family = categoryMap.get(key);
  return family
    ? {
        id: family.id,
        label: family.label,
        sourceDomains: [node.domain],
        appearance: family.appearance,
      }
    : {
        id: "domain:" + stableId(key),
        label: node.domain.trim(),
        sourceDomains: [node.domain],
        appearance: "other",
      };
}
type Index = {
  nodes: Map<string, WorldNode>;
  memberships: Map<string, Set<string>>;
  domains: RadialDomain[];
  adjacent: Map<string, WorldEdge[]>;
  outgoing: Map<string, WorldEdge[]>;
};
const indexes = new WeakMap<WorldGraph, Index>();
function indexGraph(graph: WorldGraph): Index {
  const prior = indexes.get(graph);
  if (prior) return prior;
  const nodes = new Map(graph.nodes.filter(eligible).map((n) => [n.id, n])),
    memberships = new Map<string, Set<string>>(),
    domainMap = new Map<string, RadialDomain>(),
    adjacent = new Map<string, WorldEdge[]>(),
    outgoing = new Map<string, WorldEdge[]>();
  for (const node of nodes.values()) {
    const domain = explicitDomain(node);
    if (!domain) continue;
    if (!domainMap.has(domain.id))
      domainMap.set(domain.id, {
        ...domain,
        nodeIds: [],
        rootIds: [],
        count: 0,
      });
    else domainMap.get(domain.id)!.sourceDomains.push(node.domain);
    memberships.set(node.id, new Set([domain.id]));
  }
  const typed = graph.edges
    .filter(
      (e) =>
        preparatory.has(e.relation) && nodes.has(e.from) && nodes.has(e.to),
    )
    .sort(
      (a, b) => edgePriority(a) - edgePriority(b) || a.id.localeCompare(b.id),
    );
  // Uncategorised skill/course/action references can inherit explicit categories only through existing
  // typed preparation mappings. Two rounds reach course→capability→occupation without NLP guesses.
  for (let round = 0; round < 2; round++) {
    const additions = new Map<string, Set<string>>();
    for (const edge of typed)
      for (const [id, other] of [
        [edge.from, edge.to],
        [edge.to, edge.from],
      ]) {
        if (explicitDomain(nodes.get(id)!)) continue;
        const known = memberships.get(other);
        if (!known) continue;
        if (!additions.has(id)) additions.set(id, new Set());
        for (const domain of known) additions.get(id)!.add(domain);
      }
    for (const [id, values] of additions) {
      if (!memberships.has(id)) memberships.set(id, new Set());
      for (const value of values) memberships.get(id)!.add(value);
    }
  }
  for (const edge of typed) {
    adjacent.set(edge.from, [...(adjacent.get(edge.from) || []), edge]);
    adjacent.set(edge.to, [...(adjacent.get(edge.to) || []), edge]);
    outgoing.set(edge.from, [...(outgoing.get(edge.from) || []), edge]);
  }
  for (const [id, domainIds] of memberships)
    for (const domain of domainIds) domainMap.get(domain)?.nodeIds.push(id);
  const order = new Map(families.map((f, i) => [f.id, i]));
  const domains = [...domainMap.values()]
    .filter((d) => d.nodeIds.length)
    .sort(
      (a, b) =>
        (order.get(a.id) ?? 100) - (order.get(b.id) ?? 100) ||
        a.label.localeCompare(b.label),
    );
  for (const domain of domains) {
    domain.nodeIds.sort();
    domain.sourceDomains = [...new Set(domain.sourceDomains)].sort();
    domain.count = domain.nodeIds.length;
    const ids = new Set(domain.nodeIds),
      incoming = new Set(
        typed.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e) => e.to),
      );
    const meaningful = domain.nodeIds.filter((id) =>
      (adjacent.get(id) || []).some((e) => ids.has(e.from) && ids.has(e.to)),
    );
    const roots = meaningful.filter((id) => !incoming.has(id));
    // A subject supported by the current person's records is a useful navigation anchor even
    // when a course points into it. Graph indegree describes dependencies, not personal relevance.
    // This only changes presentation roots: the course connector keeps its sourced direction,
    // and an unverified/self-reported record is never promoted to a verified capability here.
    const supportedFoundations = domain.nodeIds.filter((id) => {
      const n = nodes.get(id)!;
      return (
        ["Capability", "KnowledgeDomain"].includes(n.kind) &&
        explicitDomain(n) &&
        n.evidence.some(
          (e) =>
            !["inferred", "hypothetical"].includes(normalize(e.status)) &&
            Boolean((e.quote || e.text).trim()),
        )
      );
    });
    const priority = (id: string) => {
      const n = nodes.get(id)!;
      return (
        Number(!explicitDomain(n)) * 20 +
        (["Capability", "KnowledgeDomain"].includes(n.kind)
          ? 0
          : n.kind === "UniversityCourse"
            ? 2
            : n.kind === "Project"
              ? 4
              : 8)
      );
    };
    const candidates = supportedFoundations.length
      ? supportedFoundations
      : roots.length
        ? roots
        : meaningful.length
          ? meaningful
          : domain.nodeIds;
    domain.rootIds = [...candidates]
      .sort((a, b) => priority(a) - priority(b) || a.localeCompare(b))
      .slice(0, 3);
  }
  const result = { nodes, memberships, domains, adjacent, outgoing };
  indexes.set(graph, result);
  return result;
}
export function radialDomains(graph: WorldGraph): RadialDomain[] {
  // Consumers may annotate UI-local metadata without mutating the cached underlying graph index.
  return indexGraph(graph).domains.map((d) => ({
    ...d,
    sourceDomains: [...d.sourceDomains],
    nodeIds: [...d.nodeIds],
    rootIds: [...d.rootIds],
  }));
}
export function domainPage(domains: RadialDomain[], page = 0, size = 8) {
  const perPage = Math.max(1, Math.min(8, Math.floor(size) || 8)),
    totalPages = Math.max(1, Math.ceil(domains.length / perPage)),
    safePage = Math.max(0, Math.min(totalPages - 1, Math.floor(page) || 0));
  return {
    domains: domains.slice(safePage * perPage, (safePage + 1) * perPage),
    page: safePage,
    totalPages,
    totalDomains: domains.length,
  };
}
export function domainForNode(graph: WorldGraph, id: string): string | null {
  const index = indexGraph(graph),
    ids = index.memberships.get(id);
  return index.domains.find((d) => ids?.has(d.id))?.id || null;
}
function edgePriority(edge: WorldEdge) {
  return edge.requirement === "formal"
    ? 0
    : edge.relation === "REQUIRES" || edge.relation === "BUILDS_ON"
      ? 1
      : 2;
}
function emptyProjection(): RadialProjection {
  return {
    domain: null,
    nodes: [],
    displayEdges: [],
    edges: [],
    roots: [],
    displayParent: new Map(),
    positions: new Map(),
    bounds: { width: 0, height: 0 },
    hiddenCount: 0,
    hiddenByNode: {},
    hiddenRequirements: [],
    relatedPaths: [],
    relatedPathCount: 0,
    relevance: new Map(),
    allNodeIds: [],
  };
}

export function projectRadialBranch(
  graph: WorldGraph,
  options: {
    domainId: string | null;
    expanded?: readonly string[];
    selectedId?: string | null;
    goalIds?: readonly string[];
    budget?: number;
  },
): RadialProjection {
  const index = indexGraph(graph),
    domain = index.domains.find((d) => d.id === options.domainId);
  if (!domain) return emptyProjection();
  const budget = Math.max(4, Math.min(18, Math.floor(options.budget || 16))),
    allowed = new Set(domain.nodeIds),
    expanded = new Set(options.expanded || []),
    visible = new Set<string>(),
    displayParent = new Map<string, string | null>(),
    chosen = new Map<string, WorldEdge>();
  // Build one canonical display forest from real typed edges. This is presentation ownership,
  // not a new prerequisite layer; the connector retains its original direction/provenance.
  const canonicalParent = new Map<string, string | null>(),
    canonicalEdge = new Map<string, WorldEdge>(),
    children = new Map<string, string[]>();
  const visitComponent = (seed: string) => {
    if (canonicalParent.has(seed)) return;
    canonicalParent.set(seed, null);
    const queue = [seed];
    for (let i = 0; i < queue.length; i++)
      for (const edge of index.adjacent.get(queue[i]) || []) {
        const other = edge.from === queue[i] ? edge.to : edge.from;
        if (!allowed.has(other) || canonicalParent.has(other)) continue;
        canonicalParent.set(other, queue[i]);
        canonicalEdge.set(other, edge);
        children.set(queue[i], [...(children.get(queue[i]) || []), other]);
        queue.push(other);
      }
  };
  domain.rootIds.forEach(visitComponent);
  [...allowed].sort().forEach(visitComponent);
  const roots = [...domain.rootIds];
  const include = (id: string) => {
    if (visible.has(id)) return true;
    const path: string[] = [];
    let cursor: string | null = id;
    while (cursor && !visible.has(cursor)) {
      path.push(cursor);
      cursor = canonicalParent.get(cursor) || null;
    }
    if (visible.size + path.length > budget) return false;
    for (const step of path.reverse()) {
      visible.add(step);
      const parent = canonicalParent.get(step) || null;
      displayParent.set(step, parent);
      if (parent) {
        const edge = canonicalEdge.get(step);
        if (edge) chosen.set(edge.id, edge);
      } else if (!roots.includes(step)) roots.push(step);
    }
    return true;
  };
  roots.forEach(include);
  const selected = options.selectedId;
  if (selected && allowed.has(selected) && !include(selected)) {
    // A remote/deep selected record stays inspectable without inventing a shortcut relationship.
    visible.add(selected);
    displayParent.set(selected, null);
    roots.push(selected);
  }
  const neighbours = (id: string) => [
    ...new Set(
      (index.adjacent.get(id) || [])
        .flatMap((e) => [e.from, e.to])
        .filter((other) => other !== id && allowed.has(other)),
    ),
  ];
  // Explicitly opened preparation owns its neighbourhood before automatic preview buds consume space.
  // Domain roots reveal a second tier because their first tier is already represented by small buds.
  const requests = [...expanded]
    .filter((id) => allowed.has(id))
    // Navigation preserves opening order. The most recently opened preparation must get space
    // before an older dense branch, even when another node remains selected in the inspector.
    .reverse()
    .map((id) => {
      const first = neighbours(id),
        second = domain.rootIds.includes(id) ? first.flatMap(neighbours) : [];
      return { id, ids: [...new Set([id, ...first, ...second])] };
    });
  const includeRequested = (id: string, owner: string) => {
    if (include(id)) return true;
    if (!visible.has(owner) || visible.size >= budget) return false;
    const edge = (index.adjacent.get(owner) || []).find(
      (edge) => edge.from === id || edge.to === id,
    );
    if (!edge) return false;
    visible.add(id);
    displayParent.set(id, owner);
    chosen.set(edge.id, edge);
    return true;
  };
  const allocate = (
    opened: typeof requests,
    previouslyVisible?: ReadonlySet<string>,
  ) => {
    // Keep explicitly opened owners available before allocating their leaves. Shared records
    // remain canonical; older overflow stays discoverable through the explicit hidden counts.
    for (const request of opened) include(request.id);
    for (const [i, request] of opened.entries()) {
      const ids = [...request.ids];
      if (i === 0 && previouslyVisible)
        ids.sort(
          (a, b) =>
            Number(previouslyVisible.has(a)) - Number(previouslyVisible.has(b)),
        );
      for (const id of ids) includeRequested(id, request.id);
    }
    for (const root of domain.rootIds)
      for (const child of (children.get(root) || []).slice(0, 2))
        include(child);
  };
  let previouslyVisible: Set<string> | undefined;
  if (requests.length) {
    // A dense older branch can share the newest branch's first neighbours. Calculate its small
    // presentation baseline once so a new explicit opening reveals undisclosed records first,
    // rather than merely reordering the same full-budget prefix. No graph/source data is changed.
    const initialIds = [...visible],
      initialParents = [...displayParent],
      initialEdges = [...chosen],
      initialRoots = [...roots];
    allocate(requests.slice(1));
    previouslyVisible = new Set(visible);
    visible.clear();
    initialIds.forEach((id) => visible.add(id));
    displayParent.clear();
    initialParents.forEach(([id, parent]) => displayParent.set(id, parent));
    chosen.clear();
    initialEdges.forEach(([id, edge]) => chosen.set(id, edge));
    roots.splice(0, roots.length, ...initialRoots);
  }
  allocate(requests, previouslyVisible);
  // Each visible child has one factual connector; only the selected node's already visible secondary
  // relationships are drawn. Other shared/cross-domain paths remain contextual links.
  const forestEdges = [...chosen.values()].filter(
    (e) => visible.has(e.from) && visible.has(e.to),
  );
  const displayed = new Map(forestEdges.map((edge) => [edge.id, edge]));
  if (selected)
    for (const edge of index.adjacent.get(selected) || [])
      if (visible.has(edge.from) && visible.has(edge.to))
        displayed.set(edge.id, edge);
  const displayEdges = [...displayed.values()];
  const nodes = [...visible].map((id) => index.nodes.get(id)!).filter(Boolean);
  const positions = layoutBranch(nodes, forestEdges, displayParent, roots);
  const hiddenByNode: Record<string, number> = {};
  for (const id of allowed) {
    const hidden = new Set(
      (index.adjacent.get(id) || [])
        .flatMap((e) => [e.from, e.to])
        .filter(
          (other) => other !== id && allowed.has(other) && !visible.has(other),
        ),
    );
    if (domain.rootIds.includes(id))
      for (const neighbour of neighbours(id))
        for (const other of neighbours(neighbour))
          if (other !== id && !visible.has(other)) hidden.add(other);
    const n = index.nodes.get(id)!;
    for (const target of [
      ...n.prerequisites,
      ...(n.requirementGroups || []).flatMap((g) => g.nodeIds),
    ])
      if (allowed.has(target) && !visible.has(target)) hidden.add(target);
    hiddenByNode[id] = hidden.size;
  }
  const hiddenRequirements: HiddenRadialRequirement[] = [];
  const seenRequirements = new Set<string>();
  const addRequirement = (item: HiddenRadialRequirement) => {
    const key =
      item.targetId + "|" + item.nodeId + "|" + (item.groupId || item.relation);
    if (!seenRequirements.has(key)) {
      seenRequirements.add(key);
      hiddenRequirements.push(item);
    }
  };
  const reason = (id: string): HiddenRadialRequirement["reason"] =>
    !graph.nodes.some((n) => n.id === id)
      ? "missing-record"
      : !allowed.has(id)
        ? "other-domain"
        : visible.size >= budget
          ? "budget"
          : "collapsed";
  for (const edge of graph.edges)
    if (
      edge.requirement === "formal" &&
      preparatory.has(edge.relation) &&
      visible.has(edge.to) &&
      !visible.has(edge.from)
    )
      addRequirement({
        nodeId: edge.from,
        targetId: edge.to,
        relation: edge.relation,
        operator: null,
        sourceReference: edge.source.reference,
        reason: reason(edge.from),
      });
  for (const node of nodes) {
    if (node.requirement === "formal")
      for (const id of node.prerequisites)
        if (!visible.has(id))
          addRequirement({
            nodeId: id,
            targetId: node.id,
            relation: "REQUIRES",
            operator: "AND",
            sourceReference: node.source.reference,
            reason: reason(id),
          });
    for (const group of node.requirementGroups || [])
      if (group.requirement === "formal")
        for (const id of group.nodeIds)
          if (!visible.has(id))
            addRequirement({
              nodeId: id,
              targetId: node.id,
              relation: "REQUIRES",
              operator: group.operator,
              groupId: group.id,
              sourceReference: group.sourceReference,
              reason: reason(id),
            });
  }
  const related: RadialRelatedPath[] = [];
  for (const edge of graph.edges) {
    const from = visible.has(edge.from),
      to = visible.has(edge.to);
    if (from === to) continue;
    const other = from ? edge.to : edge.from;
    if (allowed.has(other) || !index.nodes.has(other)) continue;
    const domainId = index.domains.find(
      (d) => d.id !== domain.id && index.memberships.get(other)?.has(d.id),
    )?.id;
    if (domainId)
      related.push({
        fromId: from ? edge.from : edge.to,
        toId: other,
        domainId,
        relation: edge.relation,
        sourceReference: edge.source.reference,
      });
  }
  related.sort(
    (a, b) =>
      a.fromId.localeCompare(b.fromId) ||
      a.toId.localeCompare(b.toId) ||
      a.relation.localeCompare(b.relation),
  );
  const relevance = relevantNodes(nodes, graph, options.goalIds || [], index);
  const maxX = Math.max(0, ...[...positions.values()].map((p) => p.x)),
    maxY = Math.max(0, ...[...positions.values()].map((p) => p.y));
  return {
    domain: {
      ...domain,
      nodeIds: [...domain.nodeIds],
      rootIds: [...domain.rootIds],
      sourceDomains: [...domain.sourceDomains],
    },
    nodes,
    displayEdges,
    edges: displayEdges,
    roots: roots.filter((id) => visible.has(id)),
    displayParent,
    positions,
    bounds: { width: maxX + 160, height: maxY + 115 },
    hiddenCount: allowed.size - visible.size,
    hiddenByNode,
    hiddenRequirements,
    relatedPaths: related.slice(0, 40),
    relatedPathCount: related.length,
    relevance,
    allNodeIds: [...domain.nodeIds],
  };
}
function relevantNodes(
  nodes: WorldNode[],
  graph: WorldGraph,
  goalIds: readonly string[],
  index: Index,
) {
  const goals = new Set(
      goalIds.filter((id) => graph.nodes.some((n) => n.id === id)),
    ),
    ranked: { id: string; goals: string[]; depth: number; source: string }[] =
      [];
  if (!goals.size) return new Map<string, string>();
  for (const node of nodes) {
    if (goals.has(node.id)) continue;
    const found = new Map<string, { depth: number; source: string }>(),
      queue = [{ id: node.id, depth: 0, source: "" }],
      seen = new Set([node.id]);
    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.depth >= 3) continue;
      for (const edge of index.outgoing.get(item.id) || []) {
        if (!edge.source.reference.trim()) continue;
        const depth = item.depth + 1,
          source = item.source || edge.source.reference;
        if (goals.has(edge.to)) found.set(edge.to, { depth, source });
        if (!seen.has(edge.to)) {
          seen.add(edge.to);
          queue.push({ id: edge.to, depth, source });
        }
      }
    }
    if (found.size)
      ranked.push({
        id: node.id,
        goals: [...found.keys()].sort(),
        depth: Math.min(...[...found.values()].map((v) => v.depth)),
        source: [...found.values()][0].source,
      });
  }
  ranked.sort(
    (a, b) =>
      b.goals.length - a.goals.length ||
      a.depth - b.depth ||
      a.id.localeCompare(b.id),
  );
  const cap = Math.min(3, Math.max(0, nodes.length - 1));
  return new Map(
    ranked
      .slice(0, cap)
      .map((item) => [
        item.id,
        `Linked preparation for your stated ${item.goals.length === 1 ? "goal" : "goals"}: ${item.goals.map((id) => graph.nodes.find((n) => n.id === id)!.label).join(" and ")}. Source: ${item.source}. This is relevance, not verified mastery or eligibility.`,
      ]),
  );
}
function layoutBranch(
  nodes: WorldNode[],
  edges: WorldEdge[],
  parents: Map<string, string | null>,
  roots: string[],
) {
  const ids = new Set(nodes.map((n) => n.id)),
    incoming = new Map<string, number>(nodes.map((n) => [n.id, 0])),
    next = new Map<string, string[]>();
  for (const e of edges) {
    incoming.set(e.to, (incoming.get(e.to) || 0) + 1);
    next.set(e.from, [...(next.get(e.from) || []), e.to]);
  }
  const ranks = new Map<string, number>(),
    queue = [...incoming]
      .filter(([, n]) => !n)
      .map(([id]) => id)
      .sort();
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    ranks.set(id, ranks.get(id) || 0);
    for (const child of next.get(id) || []) {
      ranks.set(child, Math.max(ranks.get(child) || 0, ranks.get(id)! + 1));
      incoming.set(child, incoming.get(child)! - 1);
      if (incoming.get(child) === 0) queue.push(child);
    }
  }
  for (const id of ids) if (!ranks.has(id)) ranks.set(id, 0);
  const layers = new Map<number, string[]>();
  for (const n of nodes) {
    const rank = ranks.get(n.id)!;
    if (!layers.has(rank)) layers.set(rank, []);
    layers.get(rank)!.push(n.id);
  }
  const positions = new Map<string, { x: number; y: number }>();
  let column = 0;
  for (const [, members] of [...layers].sort(([a], [b]) => a - b)) {
    members.sort((a, b) => {
      const ap = parents.get(a) || a,
        bp = parents.get(b) || b;
      return (
        roots.indexOf(ap) - roots.indexOf(bp) ||
        ap.localeCompare(bp) ||
        a.localeCompare(b)
      );
    });
    const cols = Math.ceil(members.length / 5);
    members.forEach((id, i) => {
      const col = Math.floor(i / 5),
        slot = i % 5,
        rows = Math.min(5, members.length - col * 5),
        stagger = (slot % 2) * 12;
      positions.set(id, {
        x: 36 + (column + col) * 180 + stagger,
        y: 36 + (5 - rows) * 56 + slot * 112,
      });
    });
    column += cols;
  }
  return positions;
}
