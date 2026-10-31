"use client";
import { useMemo, useState, useSyncExternalStore, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  ChevronDown,
  ChevronRight,
  Check,
  Flag,
  Focus,
  LocateFixed,
  Search,
  GitBranch,
  List,
  ArrowRight,
  BookOpen,
} from "lucide-react";
import type { RoadmapGraph, Person, PathRecord } from "../types";
import dynamic from "next/dynamic";
const TopicPanel = dynamic(() =>
  import("./topic-panel").then((m) => m.TopicPanel),
);
import { nextRoadmapTopic, feasiblePlan } from "../graph";
import "@xyflow/react/dist/style.css";
const subscribe = (cb: () => void) => {
  const m = window.matchMedia("(max-width:767px)");
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};
const mobileSnapshot = () => window.matchMedia("(max-width:767px)").matches;
type GraphNode = Node<
  {
    label: string;
    subtitle: string;
    kind: "position" | "family" | "topic" | "onward" | "route";
    status: string;
    expanded?: boolean;
    onOpen: () => void;
  },
  "odyssey"
>;
function NodeCard({ data }: NodeProps<GraphNode>) {
  return (
    <div className={`od-node od-${data.kind} od-status-${data.status}`}>
      <Handle type="target" position={Position.Top} />
      <button
        className="nodrag"
        onClick={data.onOpen}
        aria-label={
          data.kind === "family"
            ? `${data.expanded ? "Collapse" : "Expand"} ${data.label}`
            : `Open ${data.label}`
        }
      >
        <span className="od-node-icon">
          {data.kind === "position" ? (
            <LocateFixed size={17} />
          ) : data.kind === "family" ? (
            data.expanded ? (
              <ChevronDown size={17} />
            ) : (
              <ChevronRight size={17} />
            )
          ) : data.kind === "onward" ? (
            <Flag size={17} />
          ) : data.status === "completed" ? (
            <Check size={17} />
          ) : (
            <BookOpen size={16} />
          )}
        </span>
        <span>
          <strong>{data.label}</strong>
          <small>{data.subtitle}</small>
        </span>
      </button>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const nodeTypes = { odyssey: NodeCard };
const layoutCache = new Map<
  string,
  {
    nodes: { id: string; x: number; y: number }[];
    groups: { id: string; y: number }[];
    endY: number;
  }
>();
function layout(
  graph: RoadmapGraph,
  expanded: string[],
  query: string,
  filter: string,
  choices: Record<string, string>,
) {
  const key =
    graph.occupation.id +
    "|" +
    expanded.toSorted().join(",") +
    "|" +
    query +
    "|" +
    filter +
    "|" +
    Object.keys(choices).sort().join(",");
  const existing = layoutCache.get(key);
  if (existing) return existing;
  let y = 170;
  const nodes: { id: string; x: number; y: number }[] = [],
    groups: { id: string; y: number }[] = [];
  for (const family of graph.families) {
    if (filter && family.id !== filter) continue;
    const topics = graph.topics.filter(
      (t) =>
        t.family === family.id &&
        (!query ||
          (t.label + " " + t.summary)
            .toLowerCase()
            .includes(query.toLowerCase())),
    );
    if (query && !topics.length) continue;
    groups.push({ id: family.id, y });
    if (expanded.includes(family.id) || query) {
      let rowY = y + 130;
      for (let i = 0; i < topics.length; i += 2) {
        const pair = topics.slice(i, i + 2);
        pair.forEach((t, j) =>
          nodes.push({ id: t.id, x: j === 0 ? -310 : 310, y: rowY }),
        );
        rowY += pair.some((t) => choices[t.id]) ? 300 : 130;
      }
      y = rowY + 160;
    } else y += 210;
  }
  const result = { nodes, groups, endY: y };
  if (layoutCache.size >= 32)
    layoutCache.delete(layoutCache.keys().next().value!);
  layoutCache.set(key, result);
  return result;
}
function Tree({
  graph,
  path,
  person,
  query,
  filter,
  onExpand,
  onSelect,
  onRoute,
}: {
  graph: RoadmapGraph;
  path: PathRecord;
  person: Person;
  query: string;
  filter: string;
  onExpand: (id: string) => void;
  onSelect: (id: string) => void;
  onRoute: (id: string, route: string) => void;
}) {
  const flow = useReactFlow();
  const positions = useMemo(
    () => layout(graph, path.expanded, query, filter, path.routeChoices),
    [graph, path.expanded, query, filter, path.routeChoices],
  );
  const nodes: GraphNode[] = [
    {
      id: "position",
      type: "odyssey",
      position: { x: 0, y: 0 },
      data: {
        label: "Your starting point",
        subtitle: person.name + " · evidence stays explicit",
        kind: "position",
        status: "current",
        onOpen: () => flow.setCenter(130, 220, { zoom: 0.9 }),
      },
    },
    {
      id: "onward",
      type: "odyssey",
      position: { x: 0, y: positions.endY + 100 },
      data: {
        label: "Onward possibilities",
        subtitle: "Explore adjacent occupations below",
        kind: "onward",
        status: "open",
        onOpen: () =>
          document
            .getElementById("onward-possibilities")
            ?.scrollIntoView({ behavior: "auto" }),
      },
    },
    ...positions.groups.map((p) => {
      const f = graph.families.find((f) => f.id === p.id)!;
      const count = graph.topics.filter((t) => t.family === f.id).length;
      return {
        id: "family:" + f.id,
        type: "odyssey" as const,
        position: { x: 0, y: p.y },
        data: {
          label: f.label,
          subtitle: `${count} topics · ${path.completed.filter((id) => graph.topics.some((t) => t.id === id && t.family === f.id)).length} completed`,
          kind: "family" as const,
          status: "group",
          expanded: path.expanded.includes(f.id) || !!query,
          onOpen: () => onExpand(f.id),
        },
      };
    }),
    ...positions.nodes.map((p) => {
      const t = graph.topics.find((t) => t.id === p.id)!;
      const evidence = person.assertions.filter(
        (a) =>
          a.consent && a.selected !== false && t.skillIds.includes(a.skillId),
      );
      const status = path.completed.includes(t.id)
        ? "completed"
        : path.working.includes(t.id)
          ? "working"
          : evidence.length
            ? "supported"
            : "missing";
      return {
        id: t.id,
        type: "odyssey" as const,
        position: { x: p.x, y: p.y },
        data: {
          label: t.label,
          subtitle:
            status === "completed"
              ? "Completed · self-reported"
              : status === "working"
                ? "In progress"
                : evidence.length
                  ? `${evidence.filter((a) => a.verification !== "inferred").length} supporting claims · ${evidence.filter((a) => a.verification === "inferred").length} inferred`
                  : t.optional
                    ? "Optional specialization"
                    : "Explore learning & evidence",
          kind: "topic" as const,
          status,
          onOpen: () => onSelect(t.id),
        },
      };
    }),
  ];
  for (const p of positions.nodes) {
    if (!path.routeChoices[p.id]) continue;
    for (const [i, route] of ["guided", "project"].entries()) {
      nodes.push({
        id: `route:${p.id}:${route}`,
        type: "odyssey",
        position: { x: p.x + (i === 0 ? -85 : 125), y: p.y + 125 },
        data: {
          label: route === "guided" ? "Guided learning" : "Practice project",
          subtitle:
            path.routeChoices[p.id] === route
              ? "Selected learning route"
              : "Alternative · no credential equivalence",
          kind: "route",
          status: path.routeChoices[p.id] === route ? "chosen" : "alternative",
          onOpen: () => {
            onRoute(p.id, route);
            onSelect(p.id);
          },
        },
      });
    }
  }
  const visible = new Set(nodes.map((n) => n.id));
  const edges = [
    ...positions.groups.map((p, i) => ({
      id: "spine:" + p.id,
      source: i ? "family:" + positions.groups[i - 1].id : "position",
      target: "family:" + p.id,
      style: { stroke: "var(--roadmaps-connector)", strokeWidth: 2 },
      type: "smoothstep",
    })),
    ...positions.nodes.map((p) => ({
      id: "contains:" + p.id,
      source: "family:" + graph.topics.find((t) => t.id === p.id)!.family,
      target: p.id,
      type: "smoothstep",
      style: {
        stroke: "var(--roadmaps-control-border)",
        strokeDasharray: "4 4",
      },
    })),
    ...graph.topics.flatMap((t) =>
      t.prerequisites
        .filter((id) => visible.has(id) && visible.has(t.id))
        .map((id) => ({
          id: `prereq:${id}:${t.id}`,
          source: id,
          target: t.id,
          type: "smoothstep",
          style: { stroke: "#9b876b", strokeWidth: 1.5 },
        })),
    ),
  ];
  return (
    <div className="od-canvas" aria-label="Interactive competency roadmap">
      <ReactFlow<GraphNode>
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        deleteKeyCode={null}
        minZoom={0.3}
        maxZoom={1.7}
        panOnScroll
        zoomOnScroll={false}
        onlyRenderVisibleElements
        onInit={(instance) => {
          void instance.setCenter(130, 240, { zoom: 0.9 });
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={25} size={1} color="var(--roadmaps-canvas-dot)" />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="od-canvas-controls">
        <button
          className="icon-button"
          aria-label="Fit all roadmap content"
          onClick={() => flow.fitView({ padding: 0.15 })}
        >
          <Focus size={17} />
        </button>
        <button
          className="icon-button"
          aria-label="Focus current position"
          onClick={() => flow.setCenter(130, 240, { zoom: 0.9 })}
        >
          <LocateFixed size={17} />
        </button>
        {query && (
          <button
            className="secondary"
            onClick={() => {
              const p = positions.nodes[0];
              if (p) flow.setCenter(p.x + 130, p.y + 45, { zoom: 1 });
            }}
          >
            Focus first match
          </button>
        )}
      </div>
      <p className="canvas-caption">
        Scroll to pan · blue spine: stage navigation · dotted: topic groups ·
        warm branches: suggested prerequisites
      </p>
    </div>
  );
}
export function Explorer({
  graph,
  person,
  path,
  onPath,
  onProgress,
  onSelectOccupation,
  onDiscover,
  initialTopic,
}: {
  graph: RoadmapGraph;
  person: Person;
  path: PathRecord;
  onPath: (patch: Partial<PathRecord>) => void;
  onProgress: (id: string, status: "completed" | "working" | "reset") => void;
  onSelectOccupation: (id: string) => void;
  onDiscover: (query: string) => void;
  initialTopic?: string | null;
}) {
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, () => false);
  const [mode, setMode] = useState<"tree" | "reading" | null>(null),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState(""),
    [selected, setSelected] = useState<string | null>(
      () =>
        graph.topics.find(
          (t) =>
            t.id === initialTopic || t.skillIds.includes(initialTopic || ""),
        )?.id || null,
    );
  const origin = useRef<HTMLElement | null>(null);
  const reading = mode ? mode === "reading" : mobile;
  const choose = (id: string) => {
    origin.current = document.activeElement as HTMLElement;
    setSelected(id);
  };
  const close = () => {
    setSelected(null);
    origin.current?.focus();
  };
  const onExpand = (id: string) =>
    onPath({
      expanded: path.expanded.includes(id)
        ? path.expanded.filter((x) => x !== id)
        : [...path.expanded, id],
    });
  const topic = graph.topics.find((t) => t.id === selected);
  const plan = useMemo(() => {
    try {
      return feasiblePlan(graph, person, path.completed);
    } catch {
      return null;
    }
  }, [graph, person, path.completed]);
  const nextTask = useMemo(() => {
    try {
      return nextRoadmapTopic(graph, person, path.completed, path.working);
    } catch {
      return null;
    }
  }, [graph, person, path.completed, path.working]);
  return (
    <>
      <div className="roadmap-heading od-roadmap-heading">
        <div>
          <span className="eyebrow">YOUR ROADMAP EXPLORER</span>
          <h1>{graph.occupation.label.trim()}</h1>
          <p>
            {graph.topics.length} topics · {graph.families.length} families ·{" "}
            {graph.curriculum
              ? "Curated learning pathway + ESCO requirements"
              : "Source requirements; no invented learning order"}
          </p>
        </div>
        <span className="status-chip">
          {path.completed.length} self-reported completions
        </span>
      </div>
      {nextTask && (
        <section
          className="roadmap-next-action"
          aria-label="Next recommended action"
        >
          <div>
            <span className="eyebrow">YOUR NEXT ACTION</span>
            <strong>{nextTask.label}</strong>
            <p>
              {person.assertions.some(
                (a) =>
                  a.consent &&
                  a.selected !== false &&
                  nextTask.skillIds.includes(a.skillId),
              )
                ? "You have a related claim. Inspect its evidence and decide what still needs demonstration."
                : "Start with the reference, complete a small practical example, then save evidence of your work."}
            </p>
          </div>
          <button className="primary" onClick={() => choose(nextTask.id)}>
            Open next task
          </button>
        </section>
      )}
      <div className="explorer-toolbar">
        <label className="search-control">
          <Search size={17} />
          <input
            aria-label="Search within roadmap"
            placeholder="Find a topic or capability"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter roadmap family"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="">All families</option>
          {graph.families.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <div className="mode-toggle">
          <button aria-pressed={!reading} onClick={() => setMode("tree")}>
            <GitBranch size={15} />
            Tree
          </button>
          <button aria-pressed={reading} onClick={() => setMode("reading")}>
            <List size={15} />
            Reading
          </button>
        </div>
      </div>
      <p className="personalized-roadmap-summary">
        {
          graph.topics.filter((t) =>
            person.assertions.some(
              (a) =>
                a.consent &&
                a.selected !== false &&
                t.skillIds.includes(a.skillId),
            ),
          ).length
        }{" "}
        topics have selected profile claims. Highlighted claims retain their
        document-supported, self-reported or inferred status; they do not
        establish verified mastery.
      </p>
      <p className="roadmap-explanation">
        {plan
          ? `${plan.topicIds.length} learning/evidence topics remain to explore. `
          : ""}
        A completed topic does not establish a verified capability. Curated
        prerequisites are resource-derived suggestions; ESCO skill relationships
        do not imply an educational sequence.
      </p>
      <div className={`od-explorer ${topic ? "with-topic" : ""}`}>
        <div className="od-explorer-content">
          {reading ? (
            <div className="roadmap-reading" aria-label="Roadmap reading mode">
              {graph.families
                .filter((f) => !filter || f.id === filter)
                .map((f) => {
                  const topics = graph.topics.filter(
                    (t) =>
                      t.family === f.id &&
                      (!query ||
                        (t.label + " " + t.summary)
                          .toLowerCase()
                          .includes(query.toLowerCase())),
                  );
                  if (!topics.length) return null;
                  const expanded = path.expanded.includes(f.id) || !!query;
                  return (
                    <section className="reading-family" key={f.id}>
                      <button
                        aria-expanded={expanded}
                        onClick={() => onExpand(f.id)}
                      >
                        <span>
                          <small>{topics.length} TOPICS</small>
                          <strong>{f.label}</strong>
                          <em>{f.summary}</em>
                        </span>
                        {expanded ? (
                          <ChevronDown size={20} />
                        ) : (
                          <ChevronRight size={20} />
                        )}
                      </button>
                      {expanded && (
                        <div>
                          {topics.map((t) => (
                            <button
                              className="reading-topic"
                              key={t.id}
                              onClick={() => choose(t.id)}
                            >
                              <span
                                className={`topic-state ${path.completed.includes(t.id) ? "complete" : ""}`}
                              >
                                {path.completed.includes(t.id) ? (
                                  <Check size={16} />
                                ) : (
                                  <BookOpen size={16} />
                                )}
                              </span>
                              <span>
                                <strong>{t.label}</strong>
                                <small>{t.summary}</small>
                                <em>
                                  {t.prerequisites.length} learning
                                  prerequisites ·{" "}
                                  {t.provenance === "source-requirement"
                                    ? "ESCO source"
                                    : "Curated learning topic"}
                                </em>
                              </span>
                              <ChevronRight size={16} />
                            </button>
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })}
            </div>
          ) : (
            <ReactFlowProvider>
              <Tree
                graph={graph}
                path={path}
                person={person}
                query={query}
                filter={filter}
                onExpand={onExpand}
                onSelect={choose}
                onRoute={(id, route) =>
                  onPath({
                    routeChoices: { ...path.routeChoices, [id]: route },
                  })
                }
              />
            </ReactFlowProvider>
          )}
        </div>
        {topic && (
          <TopicPanel
            key={topic.id}
            topic={topic}
            topics={graph.topics}
            person={person}
            path={path}
            occupation={graph.occupation}
            onClose={close}
            onTopic={choose}
            onProgress={onProgress}
            onPath={onPath}
            onRoute={(id, route) =>
              onPath({ routeChoices: { ...path.routeChoices, [id]: route } })
            }
            onDiscover={onDiscover}
            plan={(() => {
              try {
                return feasiblePlan(
                  graph,
                  person,
                  path.completed,
                  topic.id,
                  (path.routeChoices[topic.id] || "guided") as
                    "guided" | "project",
                );
              } catch {
                return null;
              }
            })()}
          />
        )}
      </div>
      <section id="onward-possibilities" className="onward-section">
        <div className="section-title">
          <h2>What could come after this?</h2>
          <span className="muted">
            Shared capabilities, not guaranteed promotions.
          </span>
        </div>
        <p className="small">
          These connections are computed from shared ESCO requirements.
          Specialization, further study and professional progression require
          their own evidence and official requirements.
        </p>
        <div className="onward-grid">
          {graph.onward.map((r) => (
            <button
              key={r.occupation.id}
              onClick={() => onSelectOccupation(r.occupation.id)}
            >
              <span className="eyebrow">{r.occupation.domain}</span>
              <strong>{r.occupation.label}</strong>
              <span>
                {r.shared} shared requirements
                <ArrowRight size={16} />
              </span>
            </button>
          ))}
        </div>
        {!graph.onward.length && (
          <p>
            No shared-requirement relationship is available in this snapshot.
            The full catalogue is still searchable.
          </p>
        )}
        <button className="text-button" onClick={() => onDiscover("")}>
          Explore the whole occupation catalogue
          <ArrowRight size={14} />
        </button>
      </section>
      <details className="accessible-map">
        <summary>Source version & graph methodology</summary>
        <p>
          {graph.occupation.source.system} · {graph.occupation.source.version}
        </p>
        <p>{graph.occupation.source.recordId}</p>
        <p>
          Prerequisite closure and cycle detection are deterministic.
          Learning-route preference does not change formal equivalence or source
          evidence. No topic completion creates a qualification.
        </p>
      </details>
    </>
  );
}
