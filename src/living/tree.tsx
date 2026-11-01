"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import {
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Compass,
  GraduationCap,
  BookOpen,
  Brain,
  BriefcaseBusiness,
  Building2,
  FlaskConical,
  FolderCheck,
  GitBranch,
  History,
  Layers,
  Search,
  Upload,
  X,
  Plus,
  Check,
  Play,
  Map as MapIcon,
  Menu,
  Target,
  Sparkles,
  CalendarDays,
  Backpack,
  Link as LinkIcon,
  FileBadge,
  Orbit,
} from "lucide-react";
import { useMobile, trapFocus } from "../odyssey/hooks";
import { downloadJSON, jsonRequest } from "../odyssey/client";
import type { Workspace, Occupation } from "../odyssey/types";
import {
  emptyLiving,
  type LivingState,
  type WorldGraph,
  type WorldNode,
  type NodeKind,
  type NodeStatus,
  type CourseRecord,
} from "./schema";
import { visibleWorld, reversePlan, simulate, planSemester } from "./engine";
import { importCourseCatalogue } from "./catalogue";
import type { GuideAnswer } from "./guide";
import type { DemoScenario } from "./demos";
import "@xyflow/react/dist/style.css";
const icons: Record<NodeKind, typeof Compass> = {
  PersonProfile: Orbit,
  AcademicProgramme: GraduationCap,
  UniversityCourse: BookOpen,
  KnowledgeDomain: Layers,
  Capability: Brain,
  Project: FolderCheck,
  Credential: FileBadge,
  ProfessionalExperience: BriefcaseBusiness,
  Internship: Backpack,
  Occupation: Compass,
  EmployerRole: Building2,
  GraduateProgramme: GraduationCap,
  ResearchPathway: FlaskConical,
  Opportunity: GitBranch,
  ProgressMilestone: Target,
};
const statusLabel: Record<NodeStatus, string> = {
  verified: "Verified evidence",
  reported: "Reported evidence",
  working: "In progress",
  available: "Suggested action",
  prerequisites: "Prerequisites unconfirmed",
  planned: "Planned",
  hypothetical: "Hypothetical",
  explored: "Explored",
  historical: "Historical record",
};
const categoryLabel = (kind: NodeKind) =>
  kind.replace(/([a-z])([A-Z])/g, "$1 $2");
type TreeNode = Node<
  {
    record: WorldNode;
    selected: boolean;
    expanded: boolean;
    hypothetical: boolean;
    onSelect: (id: string) => void;
    onFocus: (id: string) => void;
  },
  "living"
>;
function LivingNode({ data }: NodeProps<TreeNode>) {
  const n = data.record,
    Icon = icons[n.kind];
  return (
    <div
      className={`living-node kind-${n.kind} state-${data.hypothetical ? "hypothetical" : n.status} ${data.selected ? "is-selected" : ""}`}
    >
      <Handle type="target" position={Position.Left} />
      <button
        aria-label={`Inspect ${n.label}`}
        aria-expanded={data.expanded}
        onClick={() => data.onSelect(n.id)}
        onDoubleClick={() => data.onFocus(n.id)}
      >
        <span className="living-node-icon">
          <Icon size={20} />
        </span>
        <span>
          <small>{categoryLabel(n.kind)}</small>
          <strong>{n.label}</strong>
          <em>
            {data.hypothetical
              ? "Hypothetical"
              : n.source.kind === "fixture"
                ? "Fictional catalogue fixture"
                : n.date || statusLabel[n.status]}
          </em>
        </span>
        <ChevronRight size={15} />
      </button>
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
const nodeTypes = { living: LivingNode };
export function LivingTree(props: {
  workspace: Workspace;
  onState: (patch: Partial<LivingState>) => void;
  onUpload: () => void;
  onDiscover: (query: string) => void;
  onDemo: (scenario: DemoScenario) => void;
  onLegacyDemo: () => void;
  onProfile: () => void;
  onOccupation: (id: string) => void;
  onResume: () => void;
}) {
  return (
    <ReactFlowProvider>
      <TreeWorkspace {...props} />
    </ReactFlowProvider>
  );
}
function TreeWorkspace({
  workspace,
  onState,
  onUpload,
  onDiscover,
  onDemo,
  onLegacyDemo,
  onProfile,
  onOccupation,
  onResume,
}: Parameters<typeof LivingTree>[0]) {
  const mobile = useMobile(),
    flow = useReactFlow();
  const state = useMemo(
    () => workspace.living || emptyLiving(),
    [workspace.living],
  );
  const [graph, setGraph] = useState<WorldGraph | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [careerQuery, setCareerQuery] = useState(""),
    [searchResults, setSearchResults] = useState<Occupation[]>([]),
    [domain, setDomain] = useState(""),
    [institution, setInstitution] = useState(""),
    [status, setStatus] = useState(""),
    [reading, setReading] = useState<boolean | null>(null),
    [panel, setPanel] = useState<
      "node" | "academic" | "inventory" | "guide" | "compare" | null
    >(null),
    [simulation, setSimulation] = useState<string[]>([]),
    [breadcrumbs, setBreadcrumbs] = useState<string[]>([]),
    [toast, setToast] = useState(""),
    [evidence, setEvidence] = useState(""),
    [guideQ, setGuideQ] = useState("What should I do next?"),
    [guideConsent, setGuideConsent] = useState(false),
    [guideDepth, setGuideDepth] = useState(false),
    [guideAnswer, setGuideAnswer] = useState<GuideAnswer | null>(null),
    [guideBusy, setGuideBusy] = useState(false);
  const inspector = useRef<HTMLElement>(null),
    origin = useRef<HTMLElement | null>(null),
    positions = useRef(new Map<string, { x: number; y: number }>());
  const profileKey = JSON.stringify({
    person: workspace.person,
    living: {
      ...state,
      view: undefined,
      selected: undefined,
      expanded: undefined,
      investigated: state.expanded.filter((id) => id.startsWith("occupation:")),
      theme: undefined,
      mode: undefined,
    },
  });
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      setLoading(true);
      setError("");
    });
    jsonRequest<WorldGraph>("/api/living", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workspace),
      signal: controller.signal,
    })
      .then(setGraph)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
    // View-only changes do not regenerate the shared world.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileKey]);
  useEffect(() => {
    if (!careerQuery.trim()) return;
    const c = new AbortController(),
      t = setTimeout(() => {
        jsonRequest<{ occupations: Occupation[] }>(
          "/api/catalogue?q=" + encodeURIComponent(careerQuery) + "&limit=6",
          { signal: c.signal },
        )
          .then((r) => setSearchResults(r.occupations))
          .catch(() => {});
      }, 220);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [careerQuery]);
  useEffect(() => {
    if (!mobile || !panel) return;
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, [mobile, panel]);
  const selected = graph?.nodes.find((n) => n.id === state.selected) || null;
  useEffect(() => {
    if (panel) inspector.current?.focus();
  }, [panel, state.selected]);
  const choose = (id: string) => {
    setQuery("");
    origin.current = document.activeElement as HTMLElement;
    if (state.selected && state.selected !== id)
      setBreadcrumbs((b) => [...b.slice(-10), state.selected!]);
    onState({ selected: id, expanded: [...new Set([...state.expanded, id])] });
    setEvidence("");
    setGuideAnswer(null);
    setPanel("node");
    if (!mobile) requestAnimationFrame(() => focus(id));
  };
  const focus = (id: string) => {
    const p = positions.current.get(id);
    if (p)
      void flow.setCenter(p.x + 120, p.y + 50, {
        zoom: 0.95,
        duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? 0
          : 240,
      });
  };
  const close = () => {
    setPanel(null);
    if (origin.current?.isConnected) origin.current.focus();
    else
      document
        .querySelector<HTMLInputElement>(
          '[aria-label="Search the living tree"]',
        )
        ?.focus();
  };
  const shown = useMemo(() => {
    if (!graph) return { nodes: [], edges: [] };
    const g =
      query || domain || institution || status
        ? { nodes: graph.nodes, edges: graph.edges }
        : visibleWorld(graph, state);
    return {
      nodes: [...g.nodes]
        .sort((a, b) =>
          state.mode === "history"
            ? a.id === "person"
              ? -1
              : b.id === "person"
                ? 1
                : (Number(a.date?.match(/\d{4}/)?.[0]) || 9999) -
                  (Number(b.date?.match(/\d{4}/)?.[0]) || 9999)
            : 0,
        )
        .filter(
          (n) =>
            (!domain || n.domain === domain) &&
            (!institution || n.institution === institution) &&
            (!status || n.status === status) &&
            (!query ||
              (n.label + " " + n.summary)
                .toLowerCase()
                .includes(query.toLowerCase())),
        ),
      edges: g.edges,
    };
  }, [graph, state, domain, institution, status, query]);
  const activeIds = new Set(shown.nodes.map((n) => n.id));
  const sim =
    graph && simulation.length
      ? simulate(graph, simulation, state.goals)
      : null;
  const [nodeRecords, setNodeRecords] = useState<TreeNode[]>([]);
  useEffect(() => {
    const occupied = [...positions.current.values()];
    const buckets: Record<string, number> = {};
    const records = shown.nodes.map((n) => {
      let p = positions.current.get(n.id);
      if (!p) {
        const col =
          n.id === "person"
            ? 0
            : n.kind === "AcademicProgramme" ||
                n.kind === "UniversityCourse" ||
                n.kind === "ProfessionalExperience" ||
                n.kind === "Internship"
              ? 1
              : n.kind === "Capability" || n.kind === "KnowledgeDomain"
                ? 2
                : n.kind === "Project" || n.kind === "ProgressMilestone"
                  ? 3
                  : 4;
        let row = buckets[String(col)] || 0;
        const x = col * 305;
        while (
          occupied.some((p) => p.x === x && Math.abs(p.y - row * 132) < 120)
        )
          row++;
        p = { x, y: row * 132 };
        buckets[String(col)] = row + 1;
        positions.current.set(n.id, p);
        occupied.push(p);
      }
      return {
        id: n.id,
        type: "living" as const,
        position: p,
        data: {
          record: n,
          selected: n.id === state.selected,
          expanded: state.expanded.includes(n.id),
          hypothetical: !!(
            sim?.hypothetical.includes(n.id) ||
            sim?.potentialEvidence.includes(n.id)
          ),
          onSelect: choose,
          onFocus: focus,
        },
      };
    });
    let live = true;
    queueMicrotask(() => {
      if (live) setNodeRecords(records);
    });
    return () => {
      live = false;
    };
    // Positions are incrementally allocated and retained while clusters expand.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown.nodes, state.selected, state.expanded, simulation]);
  const edges = shown.edges
    .filter((e) => activeIds.has(e.from) && activeIds.has(e.to))
    .map((e) => ({
      id: e.id,
      source: e.from,
      target: e.to,
      type: "smoothstep",
      animated: false,
      style: {
        stroke:
          e.relation === "REQUIRES"
            ? "var(--tree-required)"
            : "var(--tree-edge)",
        strokeWidth: e.relation === "REQUIRES" ? 2 : 1.3,
        strokeDasharray: [
          "SUPPORTS_APPLICATION_TO",
          "RECOMMENDED_PREPARATION",
          "ALTERNATIVE_PATH_TO",
        ].includes(e.relation)
          ? "5 5"
          : undefined,
      },
      label: undefined,
    }));
  const plan = graph ? reversePlan(graph, state.goals, simulation) : null;
  const related =
    graph && selected
      ? graph.edges.filter(
          (e) => e.to === selected.id || e.from === selected.id,
        )
      : [];
  const courses: CourseRecord[] = graph
    ? graph.nodes
        .filter(
          (n) =>
            n.kind === "UniversityCourse" && !n.id.startsWith("record-course:"),
        )
        .map(
          (n) =>
            state.catalogue?.courses.find((c) => c.id === n.id) || {
              id: n.id,
              title: n.label,
              institution: n.institution || "",
              programme: state.academic?.programme || "",
              code: null,
              credits: n.credits ?? null,
              language: "Unverified",
              term: state.academic?.term || "Unverified",
              outcomes: [n.summary],
              skillIds: n.skillIds,
              prerequisites: n.prerequisites,
              restrictions: [],
              availability: n.source.kind === "fixture" ? "fixture" : "unknown",
              schedule: [],
              source: n.source,
            },
        )
    : [];
  const semester = graph
    ? planSemester(graph, courses, state, state.goals)
    : null;
  const isReading = reading ?? (mobile || state.mode === "history");
  const progress = (
    n: WorldNode,
    action: "planned" | "working" | "completed",
  ) => {
    if (simulation.length) {
      setToast("Exit simulation before recording actual progress.");
      return;
    }
    onState({
      progress: [
        ...state.progress.filter((p) => p.nodeId !== n.id),
        {
          nodeId: n.id,
          status: action,
          at: new Date().toISOString(),
          evidence: evidence.trim(),
        },
      ],
    });
    setToast(
      action === "completed"
        ? "Milestone recorded as self-reported. No credential or mastery was verified."
        : "Quest saved.",
    );
  };
  const goal = (id: string) => {
    onState({
      goals: state.goals.includes(id)
        ? state.goals.filter((x) => x !== id)
        : [...state.goals, id],
      mode: "goal",
    });
    setToast("Goal updated. Past evidence and other goals are preserved.");
  };
  return (
    <section className="living-tree" aria-label="The Living Career Tree">
      <div className="tree-masthead">
        <div>
          <span className="eyebrow">
            SYRKA ODYSSEY / YOUR LIFE IS THE SKILL TREE
          </span>
          <h1>The Living Career Tree</h1>
        </div>
        <div className="tree-entry-actions">
          <button className="secondary" onClick={onUpload}>
            <Upload size={16} />
            Add your CV
          </button>
          <button
            className="icon-button"
            aria-label="Open evidence inventory"
            onClick={() => setPanel("inventory")}
          >
            <Backpack size={18} />
          </button>
          <button className="secondary" onClick={() => setPanel("guide")}>
            <Sparkles size={16} />
            Syrka Guide
          </button>
        </div>
      </div>
      <div
        className="tree-player"
        role="region"
        aria-label="Your professional overview"
      >
        <button onClick={onProfile}>
          <span className="tree-avatar">
            {workspace.person.name.slice(0, 1)}
          </span>
          <span>
            <strong>{workspace.person.name}</strong>
            <small>
              {
                workspace.person.assertions.filter(
                  (a) => a.consent && a.selected !== false,
                ).length
              }{" "}
              selected capability claims · {state.goals.length} active goals
            </small>
          </span>
        </button>
        <span className="tree-objective">
          <Target size={16} />
          {state.goals
            .map((id) => graph?.nodes.find((n) => n.id === id)?.label)
            .filter(Boolean)
            .join(" + ") || "Explore a direction. Your history stays with you."}
        </span>
        {workspace.paths.length > 0 && (
          <button className="text-button" onClick={onResume}>
            Resume my roadmap <ArrowRight size={14} />
          </button>
        )}
      </div>
      <div className="tree-toolbar">
        <div className="tree-mode" role="tablist" aria-label="Tree modes">
          {(["explore", "history", "goal"] as const).map((mode) => (
            <button
              key={mode}
              role="tab"
              aria-selected={state.mode === mode}
              onClick={() => onState({ mode })}
            >
              {mode === "explore" ? (
                <Compass size={15} />
              ) : mode === "history" ? (
                <History size={15} />
              ) : (
                <Target size={15} />
              )}{" "}
              {mode === "explore"
                ? "Explore"
                : mode === "history"
                  ? "History"
                  : "Goal plan"}
            </button>
          ))}
        </div>
        <label className="search-control">
          <Search size={16} />
          <input
            aria-label="Search the living tree"
            placeholder="Find a node…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <button className="secondary" onClick={() => setPanel("academic")}>
          <CalendarDays size={15} />
          Semester lab
        </button>
        <button
          className="icon-button"
          aria-label={isReading ? "Show spatial tree" : "Show reading tree"}
          onClick={() => setReading(!isReading)}
        >
          {isReading ? <MapIcon size={17} /> : <Menu size={17} />}
        </button>
      </div>
      <div className="tree-filters">
        <select
          aria-label="Filter tree academic area"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        >
          <option value="">All areas</option>
          {[...new Set(graph?.nodes.map((n) => n.domain))].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          aria-label="Filter tree institution"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
        >
          <option value="">All institutions</option>
          {[
            ...new Set(graph?.nodes.map((n) => n.institution).filter(Boolean)),
          ].map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          aria-label="Filter tree status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All states</option>
          {Object.entries(statusLabel).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          className="text-button"
          onClick={() => {
            setQuery("");
            setDomain("");
            setInstitution("");
            setStatus("");
          }}
        >
          Reset filters
        </button>
        <button className="text-button" onClick={() => setPanel("compare")}>
          Compare routes
        </button>
      </div>
      {query.trim() && graph && (
        <div
          className="tree-search-results"
          role="region"
          aria-label="Tree search results"
        >
          {graph.nodes
            .filter((n) =>
              (n.label + " " + n.summary)
                .toLowerCase()
                .includes(query.trim().toLowerCase()),
            )
            .slice(0, 8)
            .map((n) => (
              <button
                key={n.id}
                className="secondary"
                aria-label={`Open search result ${n.label}`}
                onClick={() => choose(n.id)}
              >
                {n.label}
                <ArrowRight size={13} />
              </button>
            ))}
        </div>
      )}
      {loading && (
        <p role="status" className="tree-notice">
          Connecting your progression universe…
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {plan?.cycles.length ? (
        <p role="alert" className="error">
          A dependency cycle was found. Treat this plan as unresolved and
          inspect the source relationships.
        </p>
      ) : null}
      {simulation.length > 0 && (
        <div className="simulation-banner">
          <FlaskConical size={18} />
          <span>
            SIMULATION · {simulation.length} hypothetical action(s) ·{" "}
            {sim?.affected.length || 0} connected nodes. Passport and actual
            progress are unchanged.
          </span>
          <button className="secondary" onClick={() => setSimulation([])}>
            Exit simulation
          </button>
        </div>
      )}
      <div className="tree-stage">
        {isReading ? (
          <div
            className="tree-reading"
            role="region"
            aria-label="Living tree reading mode"
          >
            {shown.nodes.map((n) => {
              const Icon = icons[n.kind];
              return (
                <button
                  key={n.id}
                  className={`tree-reading-node state-${n.status}`}
                  aria-label={`Inspect ${n.label}`}
                  onClick={() => choose(n.id)}
                  aria-expanded={state.expanded.includes(n.id)}
                >
                  <Icon size={22} />
                  <span>
                    <small>
                      {categoryLabel(n.kind)} · {statusLabel[n.status]}
                    </small>
                    <strong>{n.label}</strong>
                    <em>
                      {n.source.kind === "fixture"
                        ? "Fictional fixture; not a current offering"
                        : n.requirement === "unknown"
                          ? "Eligibility unverified"
                          : n.domain}
                    </em>
                  </span>
                  <ChevronRight size={17} />
                </button>
              );
            })}
          </div>
        ) : (
          <div
            className="tree-canvas"
            role="region"
            aria-label="Progression universe"
            onKeyDown={(e) => {
              if (["ArrowDown", "ArrowUp"].includes(e.key) && e.altKey) {
                e.preventDefault();
                const idx = shown.nodes.findIndex(
                    (n) => n.id === state.selected,
                  ),
                  n =
                    shown.nodes[
                      (idx +
                        (e.key === "ArrowDown" ? 1 : shown.nodes.length - 1)) %
                        shown.nodes.length
                    ];
                if (n) {
                  choose(n.id);
                  focus(n.id);
                }
              }
            }}
          >
            <ReactFlow
              nodes={nodeRecords}
              edges={edges}
              nodeTypes={nodeTypes}
              defaultViewport={state.view || { x: 30, y: 70, zoom: 0.8 }}
              minZoom={0.2}
              maxZoom={1.8}
              nodesDraggable={false}
              nodesConnectable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              onlyRenderVisibleElements
              onMoveEnd={(_e, v) => onState({ view: v })}
              onNodeDoubleClick={(_e, n) => focus(n.id)}
              proOptions={{ hideAttribution: false }}
            >
              <Background color="var(--tree-dot)" gap={28} size={1} />
              <Controls showInteractive={false} />
              {!mobile && (
                <MiniMap
                  pannable
                  zoomable
                  nodeColor="var(--tree-minimap-node)"
                  maskColor="var(--tree-minimap-mask)"
                  aria-label="Progression minimap"
                />
              )}
            </ReactFlow>
            <div className="tree-canvas-caption">
              Select to reveal connections · double-click to focus · Alt + arrow
              keys to navigate
            </div>
          </div>
        )}
        {panel && (
          <aside
            className="tree-inspector"
            ref={inspector}
            tabIndex={-1}
            role={mobile ? "dialog" : undefined}
            aria-modal={mobile ? true : undefined}
            aria-label={
              panel === "node"
                ? "Living node inspector"
                : panel === "guide"
                  ? "Syrka Guide"
                  : panel === "academic"
                    ? "Academic planner"
                    : panel === "inventory"
                      ? "Evidence inventory"
                      : "Route comparison"
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              if (mobile) trapFocus(e);
            }}
          >
            <div className="tree-inspector-heading">
              <span className="eyebrow">
                {panel === "node" ? "NODE INTELLIGENCE" : panel.toUpperCase()}
              </span>
              <button
                className="icon-button"
                aria-label="Close tree inspector"
                onClick={close}
              >
                <X size={18} />
              </button>
            </div>
            {panel === "node" && selected && (
              <>
                <nav
                  className="tree-breadcrumbs"
                  aria-label="Cluster breadcrumbs"
                >
                  <button
                    className="text-button"
                    disabled={!breadcrumbs.length}
                    onClick={() => {
                      const prev = breadcrumbs.at(-1);
                      if (prev) {
                        setBreadcrumbs((b) => b.slice(0, -1));
                        onState({ selected: prev });
                      }
                    }}
                  >
                    <ArrowLeft size={14} />
                    Back
                  </button>
                  <span>{categoryLabel(selected.kind)}</span>
                </nav>
                <h2>{selected.label}</h2>
                <span className={`tree-status state-${selected.status}`}>
                  {statusLabel[selected.status]}
                </span>
                <p>{selected.summary}</p>
                <div className="node-command-row">
                  <button
                    className="secondary"
                    onClick={() => goal(selected.id)}
                  >
                    <Target size={15} />
                    {state.goals.includes(selected.id)
                      ? "Remove goal"
                      : "Set as goal"}
                  </button>
                  <button
                    className="secondary"
                    onClick={() => {
                      onState({
                        expanded: state.expanded.includes(selected.id)
                          ? state.expanded.filter((id) => id !== selected.id)
                          : [...state.expanded, selected.id],
                      });
                    }}
                  >
                    {state.expanded.includes(selected.id)
                      ? "Collapse branch"
                      : "Expand branch"}
                  </button>
                  <button
                    className="secondary"
                    onClick={() =>
                      setSimulation((ids) =>
                        ids.includes(selected.id)
                          ? ids.filter((x) => x !== selected.id)
                          : [...ids, selected.id],
                      )
                    }
                  >
                    <FlaskConical size={15} />
                    {simulation.includes(selected.id)
                      ? "Remove simulation"
                      : "What if I complete this?"}
                  </button>
                </div>
                <section>
                  <h3>Source, scope and uncertainty</h3>
                  <span className="tree-source-kind">
                    {selected.source.kind} ·{" "}
                    {selected.requirement === "unknown"
                      ? "formal eligibility unknown"
                      : selected.requirement + " relationship"}
                  </span>
                  <p>{selected.source.reference}</p>
                  <p className="small">
                    Version {selected.source.version} ·{" "}
                    {selected.source.checkedAt
                      ? `Checked ${selected.source.checkedAt}`
                      : "Not independently checked against current official records"}
                  </p>
                  {selected.source.url && (
                    <a
                      href={selected.source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open source / discovery reference <LinkIcon size={13} />
                    </a>
                  )}
                </section>
                {["EmployerRole", "GraduateProgramme", "Opportunity"].includes(
                  selected.kind,
                ) && (
                  <ApplicationPreparation
                    key={selected.id}
                    node={selected}
                    state={state}
                    workspace={workspace}
                    onState={onState}
                    onNotice={setToast}
                  />
                )}
                <section>
                  <h3>My Passport evidence</h3>
                  {selected.evidence.length ? (
                    selected.evidence.map((a, i) => (
                      <blockquote key={a.id + ":" + i}>
                        <span>
                          {a.status} {a.date && " · " + a.date}
                        </span>
                        <p>{a.text}</p>
                        <details>
                          <summary>Original source quote</summary>
                          <p>{a.quote || "No literal quotation recorded."}</p>
                        </details>
                      </blockquote>
                    ))
                  ) : (
                    <p>
                      Not demonstrated in the current record. This does not mean
                      you lack the capability.
                    </p>
                  )}
                </section>
                <section>
                  <h3>Preparation and connected subnodes</h3>
                  {related.map((e) => {
                    const other = graph?.nodes.find(
                      (n) => n.id === (e.to === selected.id ? e.from : e.to),
                    );
                    return other ? (
                      <button
                        className="connection-row"
                        key={e.id}
                        onClick={() => choose(other.id)}
                      >
                        <span>
                          <small>
                            {e.relation.replaceAll("_", " ")} · {e.source.kind}
                          </small>
                          <strong>{other.label}</strong>
                          <em>{e.rationale}</em>
                        </span>
                        <ChevronRight size={16} />
                      </button>
                    ) : null;
                  })}
                  {!related.length && (
                    <p>
                      Inspect this evidence record in My Capabilities to add
                      reviewed relationships.
                    </p>
                  )}
                </section>
                <section>
                  <h3>Next actions and completion criteria</h3>
                  {(selected.actions.length
                    ? selected.actions
                    : [
                        {
                          title: "Review this record",
                          deliverable:
                            "Inspect the source and explicitly map supported capabilities in My Capabilities.",
                          criteria:
                            "Retain provenance; do not infer verification from a title alone.",
                        },
                      ]
                  ).map((a) => (
                    <article className="quest-card" key={a.title}>
                      <strong>{a.title}</strong>
                      <p>{a.deliverable}</p>
                      <small>{a.criteria}</small>
                      {a.resource && (
                        <a href={a.resource} target="_blank" rel="noreferrer">
                          Original resource <ArrowRight size={13} />
                        </a>
                      )}
                    </article>
                  ))}
                  <label>
                    Evidence reference or private progress note
                    <textarea
                      aria-label="Quest evidence note"
                      value={evidence}
                      maxLength={2500}
                      onChange={(e) => setEvidence(e.target.value)}
                      placeholder="What did you create? Where can it be reviewed?"
                    />
                  </label>
                  <div className="node-command-row">
                    <button
                      className="secondary"
                      disabled={!!simulation.length}
                      onClick={() => progress(selected, "planned")}
                    >
                      <Plus size={14} />
                      Plan quest
                    </button>
                    <button
                      className="secondary"
                      disabled={!!simulation.length}
                      onClick={() => progress(selected, "working")}
                    >
                      <Play size={14} />
                      Start quest
                    </button>
                    <button
                      className="primary"
                      disabled={!!simulation.length}
                      onClick={() => progress(selected, "completed")}
                    >
                      <Check size={14} />
                      Record completion
                    </button>
                  </div>
                  <p className="small">
                    Self-recorded completion is not an institutionally verified
                    credential.
                  </p>
                </section>
                {selected.occupationId && (
                  <button
                    className="secondary"
                    onClick={() => onOccupation(selected.occupationId!)}
                  >
                    Open detailed learning roadmap <GitBranch size={15} />
                  </button>
                )}
                <button
                  className="text-button"
                  onClick={() => {
                    setPanel("guide");
                    setGuideAnswer(null);
                  }}
                >
                  Ask Syrka Guide about this node <Sparkles size={15} />
                </button>
              </>
            )}
            {panel === "guide" && (
              <>
                <h2>Syrka Guide</h2>
                <p className="small">
                  Context: {selected?.label || "your current goals"}. Uses real
                  graph identifiers; it never edits evidence.
                </p>
                <label>
                  Your question
                  <textarea
                    aria-label="Ask Syrka Guide"
                    value={guideQ}
                    maxLength={700}
                    onChange={(e) => setGuideQ(e.target.value)}
                  />
                </label>
                <div className="guide-prompts">
                  {[
                    "Why is this relevant?",
                    "Show me another pathway.",
                    "Which prerequisite should I address first?",
                    "What should I do this semester?",
                  ].map((q) => (
                    <button
                      className="secondary"
                      key={q}
                      onClick={() => setGuideQ(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={guideConsent}
                    onChange={(e) => setGuideConsent(e.target.checked)}
                  />
                  Allow Qwen to receive this question, selected node summary,
                  neighbouring labels and evidence counts. No complete CV or
                  source quotations are sent.
                </label>
                <label className="inline-check">
                  <input
                    type="checkbox"
                    checked={guideDepth}
                    onChange={(e) => setGuideDepth(e.target.checked)}
                  />
                  Request deeper multi-goal or research-transition reasoning,
                  only if separately authorised.
                </label>
                <button
                  className="primary"
                  disabled={guideBusy || !guideQ.trim()}
                  onClick={async () => {
                    setGuideBusy(true);
                    try {
                      setGuideAnswer(
                        await jsonRequest<GuideAnswer>("/api/guide", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            workspace,
                            nodeId: selected?.id || "person",
                            question: guideQ,
                            consent: guideConsent,
                            hypothetical: simulation,
                            depth: guideDepth ? "complex" : "quick",
                          }),
                        }),
                      );
                    } catch {
                      setToast(
                        "Guide is temporarily unavailable; your graph and records are intact.",
                      );
                    } finally {
                      setGuideBusy(false);
                    }
                  }}
                >
                  {guideBusy ? "Reviewing your context…" : "Ask Guide"}
                </button>
                {guideAnswer && (
                  <div className="guide-answer" role="status">
                    <span className="tree-source-kind">
                      {guideAnswer.provider === "ai"
                        ? "AI interpretation"
                        : "Local source-grounded guide"}
                    </span>
                    <p>{guideAnswer.answer}</p>
                    {guideAnswer.actions.map((a, i) => (
                      <button
                        key={i}
                        className="connection-row"
                        onClick={() => choose(a.nodeId)}
                      >
                        {a.instruction}
                        <ChevronRight size={16} />
                      </button>
                    ))}
                    {guideAnswer.nodeIds.map((id) => (
                      <button
                        className="text-button"
                        key={id}
                        onClick={() => choose(id)}
                      >
                        {graph?.nodes.find((n) => n.id === id)?.label || id}
                      </button>
                    ))}
                    {guideAnswer.assumptions.map((a) => (
                      <p className="small" key={a}>
                        {a}
                      </p>
                    ))}
                    <p className="small">{guideAnswer.notice}</p>
                  </div>
                )}
              </>
            )}
            {panel === "academic" && (
              <>
                <h2>Semester lab</h2>
                <p>
                  Plan across several goals. No fictional fixture is treated as
                  an actual university offering.
                </p>
                <AcademicProfile
                  state={state}
                  onState={onState}
                  courses={courses}
                />
                <label className="catalogue-import">
                  Import source-aware course catalogue (JSON)
                  <input
                    type="file"
                    accept="application/json,.json"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        if (f.size > 1_000_000)
                          throw new Error("Course catalogue exceeds 1 MB.");
                        const catalogue = importCourseCatalogue(await f.text());
                        onState({ catalogue });
                        setToast(
                          "Catalogue imported as document-supported source records. No enrolment eligibility was verified.",
                        );
                      } catch (e) {
                        setToast((e as Error).message);
                      }
                    }}
                  />
                </label>
                <p className="small">
                  <a
                    href={
                      (process.env.NEXT_PUBLIC_BASE_PATH || "") +
                      "/fixtures/ppe-catalogue.example.json"
                    }
                    download
                  >
                    Download fictional catalogue template
                  </a>
                  . Format: syrka.courses/1. Requires stable IDs, institution,
                  outcomes, credits or null, prerequisite IDs, provenance and an
                  official HTTPS reference. No arbitrary URL fetching.
                </p>
                {courses.length > 0 && workspace.person.courses.length > 0 && (
                  <details>
                    <summary>Link my records to catalogue courses</summary>
                    {courses.map((c) => (
                      <label key={c.id}>
                        {c.title}
                        <select
                          aria-label={`Link record for ${c.title}`}
                          value={state.courseLinks?.[c.id] || ""}
                          onChange={(e) =>
                            onState({
                              courseLinks: {
                                ...state.courseLinks,
                                [c.id]: e.target.value,
                              },
                            })
                          }
                        >
                          <option value="">No confirmed link</option>
                          {workspace.person.courses.map((record) => (
                            <option key={record.id} value={record.id}>
                              {record.title} · {record.status}
                            </option>
                          ))}
                        </select>
                      </label>
                    ))}
                  </details>
                )}
                {semester && (
                  <>
                    <h3>
                      Proposed combination · {semester.credits}/{semester.limit}{" "}
                      credits
                    </h3>
                    {semester.selected.map((c) => (
                      <article className="quest-card" key={c.id}>
                        <button
                          className="text-button"
                          onClick={() => choose(c.id)}
                        >
                          {c.title}
                        </button>
                        <p>
                          {c.credits} credits ·{" "}
                          {c.availability === "fixture"
                            ? "FICTIONAL teaching fixture"
                            : c.availability + " availability"}
                        </p>
                        <button
                          className="secondary"
                          aria-pressed={state.plannedCourses.includes(c.id)}
                          onClick={() =>
                            onState({
                              plannedCourses: state.plannedCourses.includes(
                                c.id,
                              )
                                ? state.plannedCourses.filter(
                                    (id) => id !== c.id,
                                  )
                                : [...state.plannedCourses, c.id],
                            })
                          }
                        >
                          {state.plannedCourses.includes(c.id)
                            ? "Remove from semester"
                            : "Add to semester"}
                        </button>
                      </article>
                    ))}
                    {!semester.selected.length && (
                      <p>
                        Add source-aware courses and select a goal. No eligible
                        combination can currently be supported.
                      </p>
                    )}
                    {semester.unverified.map((s) => (
                      <p className="uncertainty" key={s}>
                        {s}
                      </p>
                    ))}
                    <details>
                      <summary>Excluded courses and dependencies</summary>
                      {semester.rejected.map((r) => (
                        <p key={r.id}>
                          {graph?.nodes.find((n) => n.id === r.id)?.label}:{" "}
                          {r.reason}
                        </p>
                      ))}
                    </details>
                    {semester.remainingRequirements.map((r) => (
                      <p className="small" key={r}>
                        Programme rule to check: {r}
                      </p>
                    ))}
                  </>
                )}
              </>
            )}
            {panel === "inventory" && (
              <>
                <h2>Your evidence inventory</h2>
                <p>
                  Original records, source quotes and historical dates remain
                  attached to their nodes.
                </p>
                {graph?.nodes
                  .filter((n) => n.evidence.length)
                  .map((n) => (
                    <button
                      className="connection-row"
                      key={n.id}
                      onClick={() => choose(n.id)}
                    >
                      <span>
                        <small>
                          {categoryLabel(n.kind)} ·{" "}
                          {n.date || statusLabel[n.status]}
                        </small>
                        <strong>{n.label}</strong>
                        <em>{n.evidence.length} supporting record(s)</em>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                <button className="secondary" onClick={onProfile}>
                  Review and correct my records
                </button>
              </>
            )}
            {panel === "compare" && (
              <>
                <h2>Alternative pathways</h2>
                <p>
                  Select at least two goals in the graph. Shared preparation is
                  reused, not duplicated.
                </p>
                {state.goals.map((id) => {
                  const p = graph ? reversePlan(graph, [id]) : null;
                  return (
                    <article className="quest-card" key={id}>
                      <button
                        className="text-button"
                        onClick={() => choose(id)}
                      >
                        {graph?.nodes.find((n) => n.id === id)?.label}
                      </button>
                      <p>
                        {p?.supported.length} supported preparation nodes ·{" "}
                        {p?.missing.length} learning/evidence gaps
                      </p>
                      <p className="small">
                        Formal eligibility:{" "}
                        {p?.unknown.length
                          ? "unverified"
                          : "inspect source scope"}
                      </p>
                    </article>
                  );
                })}
                {state.goals.length >= 2 && graph && (
                  <section>
                    <h3>Shared preparation</h3>
                    {reversePlan(graph, [state.goals[0]])
                      .order.filter(
                        (id) =>
                          reversePlan(graph, [state.goals[1]]).order.includes(
                            id,
                          ) && !state.goals.includes(id),
                      )
                      .map((id) => (
                        <button
                          className="text-button"
                          key={id}
                          onClick={() => choose(id)}
                        >
                          {graph.nodes.find((n) => n.id === id)?.label}
                        </button>
                      ))}
                  </section>
                )}
              </>
            )}
          </aside>
        )}
      </div>
      <div className="tree-next-strip">
        <Target size={19} />
        <div>
          <strong>
            {state.mode === "history"
              ? "Your previous chapters stay relevant"
              : "Your next meaningful action"}
          </strong>
          <p>
            {plan?.available.length
              ? graph?.nodes.find((n) => n.id === plan.available[0])?.actions[0]
                  ?.deliverable ||
                "Inspect the next preparation node and its source."
              : "Choose a destination, inspect its evidence and preparation, or start with a small project."}
          </p>
        </div>
        <button
          className="secondary"
          onClick={() => choose(plan?.available[0] || "project:starter")}
        >
          Open next action <ArrowRight size={15} />
        </button>
      </div>
      <p className="tree-footnote">
        {graph?.notice} {simulation.length > 0 && sim?.notice}
      </p>
      <details className="tree-universe-search" open>
        <summary>Explore another destination or demonstration</summary>
        <form
          className="destination-search"
          onSubmit={(e) => {
            e.preventDefault();
            onDiscover(careerQuery);
          }}
        >
          <Search size={18} />
          <input
            aria-label="Search career destinations"
            placeholder="Search the full occupational catalogue…"
            value={careerQuery}
            onChange={(e) => setCareerQuery(e.target.value)}
          />
          <button className="primary" aria-label="Explore destinations">
            <ArrowRight size={17} />
          </button>
        </form>
        {careerQuery &&
          searchResults.map((o) => (
            <button
              className="connection-row"
              key={o.id}
              onClick={() => {
                const id = "occupation:" + o.id;
                onState({
                  expanded: [...new Set([...state.expanded, id])],
                  selected: id,
                });
                setPanel("node");
                setCareerQuery("");
              }}
            >
              <span>
                <small>{o.domain} · source-backed occupation</small>
                <strong>{o.label}</strong>
              </span>
              <Plus size={16} />
            </button>
          ))}
        <div className="tree-demo-routes">
          {(
            [
              "ppe-consulting",
              "ppe-risk",
              "tax-research",
              "student",
            ] as DemoScenario[]
          ).map((id) => (
            <button className="secondary" key={id} onClick={() => onDemo(id)}>
              {id === "ppe-consulting"
                ? "PPE → Consulting → MBA"
                : id === "ppe-risk"
                  ? "PPE → Geopolitical Risk"
                  : id === "tax-research"
                    ? "Tax adviser → Academic Research"
                    : "Student · limited experience"}
            </button>
          ))}
          <button
            className="text-button"
            aria-label="Load fictional demonstration"
            onClick={onLegacyDemo}
          >
            Original fictional demonstration
          </button>
        </div>
      </details>
      {toast && (
        <div className="tree-toast" role="status">
          <span>{toast}</span>
          <button
            className="icon-button"
            aria-label="Dismiss tree message"
            onClick={() => setToast("")}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </section>
  );
}
function AcademicProfile({
  state,
  onState,
  courses,
}: {
  state: LivingState;
  onState: (patch: Partial<LivingState>) => void;
  courses: CourseRecord[];
}) {
  const a: NonNullable<LivingState["academic"]> = state.academic || {
    institution: "",
    faculty: "",
    programme: "",
    level: "",
    specialisation: "",
    year: "",
    term: "",
    creditLimit: 30,
    remainingRequirements: [],
  };
  return (
    <details className="academic-profile">
      <summary>My university and programme</summary>
      <div className="form-grid">
        {(
          [
            "institution",
            "faculty",
            "programme",
            "level",
            "specialisation",
            "year",
            "term",
          ] as const
        ).map((k) => (
          <label key={k}>
            {k[0].toUpperCase() + k.slice(1)}
            <input
              aria-label={`Academic ${k}`}
              value={a[k]}
              onChange={(e) =>
                onState({
                  academic: { ...a, [k]: e.target.value.slice(0, 300) },
                })
              }
            />
          </label>
        ))}
        <label>
          Credit limit
          <input
            aria-label="Semester credit limit"
            type="number"
            min={1}
            max={90}
            value={a.creditLimit}
            onChange={(e) =>
              onState({
                academic: {
                  ...a,
                  creditLimit: Math.max(
                    1,
                    Math.min(90, Number(e.target.value) || 1),
                  ),
                },
              })
            }
          />
        </label>
        <label>
          Remaining programme requirements
          <textarea
            aria-label="Remaining programme requirements"
            value={a.remainingRequirements.join("\n")}
            onChange={(e) =>
              onState({
                academic: {
                  ...a,
                  remainingRequirements: e.target.value
                    .split("\n")
                    .filter(Boolean)
                    .slice(0, 30),
                },
              })
            }
          />
        </label>
        <fieldset>
          <legend>User-supplied degree requirements</legend>
          <p className="small">
            These selections are your planning assumptions, not institutionally
            verified rules.
          </p>
          {courses.map((c) => (
            <label className="inline-check" key={c.id}>
              <input
                type="checkbox"
                checked={a.requiredCourseIds?.includes(c.id) || false}
                onChange={(e) =>
                  onState({
                    academic: {
                      ...a,
                      requiredCourseIds: e.target.checked
                        ? [...(a.requiredCourseIds || []), c.id]
                        : (a.requiredCourseIds || []).filter(
                            (id) => id !== c.id,
                          ),
                    },
                  })
                }
              />
              {c.title}
            </label>
          ))}
        </fieldset>
      </div>
    </details>
  );
}

function ApplicationPreparation({
  node,
  state,
  workspace,
  onState,
  onNotice,
}: {
  node: WorldNode;
  state: LivingState;
  workspace: Workspace;
  onState: (patch: Partial<LivingState>) => void;
  onNotice: (message: string) => void;
}) {
  const stored = state.applications?.[node.id];
  const [source, setSource] = useState(
      stored?.sourceUrl || node.source.url || "",
    ),
    [reviewed, setReviewed] = useState(!!stored?.sourceReviewedAt),
    [selected, setSelected] = useState<string[]>(stored?.evidenceIds || []),
    [checks, setChecks] = useState<string[]>(stored?.completedChecks || []),
    [notes, setNotes] = useState(stored?.notes || "");
  const tasks = [
    "Inspect the current official requirements",
    "Review the evidence I selected",
    "Record missing information and questions",
    "Complete human review before applying",
  ];
  return (
    <section className="application-preparation">
      <h3>Application preparation</h3>
      <p className="small">
        A private preparation draft, never an application submission. Formal
        eligibility and live availability remain unverified.
      </p>
      <label>
        Official role or programme source
        <input
          aria-label="Application source URL"
          type="url"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          maxLength={2000}
        />
      </label>
      <label className="inline-check">
        <input
          type="checkbox"
          checked={reviewed}
          onChange={(e) => setReviewed(e.target.checked)}
        />
        I personally reviewed this source; this is not institutional
        verification.
      </label>
      <details>
        <summary>Select Passport evidence for this draft</summary>
        {workspace.person.claims
          .filter((c) => c.approved)
          .map((c) => (
            <label className="inline-check" key={c.id}>
              <input
                type="checkbox"
                checked={selected.includes(c.id)}
                onChange={(e) =>
                  setSelected((ids) =>
                    e.target.checked
                      ? [...ids, c.id]
                      : ids.filter((id) => id !== c.id),
                  )
                }
              />
              {c.text.slice(0, 130)}
            </label>
          ))}
      </details>
      {tasks.map((task, i) => (
        <label className="inline-check" key={task}>
          <input
            type="checkbox"
            aria-label={task}
            checked={checks.includes(String(i))}
            onChange={(e) =>
              setChecks((ids) =>
                e.target.checked
                  ? [...ids, String(i)]
                  : ids.filter((id) => id !== String(i)),
              )
            }
          />
          {task}
        </label>
      ))}
      <label>
        Preparation notes
        <textarea
          aria-label="Application preparation notes"
          maxLength={3000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </label>
      <button
        className="secondary"
        onClick={() => {
          try {
            if (source && new URL(source).protocol !== "https:") throw Error();
            const draft = {
              sourceUrl: source,
              sourceReviewedAt: reviewed
                ? stored?.sourceReviewedAt || new Date().toISOString()
                : null,
              evidenceIds: selected,
              completedChecks: checks,
              notes,
              status:
                checks.length === tasks.length &&
                reviewed &&
                selected.length > 0
                  ? ("review-ready" as const)
                  : ("draft" as const),
            };
            onState({
              applications: { ...state.applications, [node.id]: draft },
            });
            onNotice(
              "Preparation saved privately. No application was submitted or eligibility verified.",
            );
          } catch {
            onNotice(
              "Use a valid HTTPS source URL before saving the preparation draft.",
            );
          }
        }}
      >
        Save preparation draft
      </button>
      {stored && (
        <button
          className="text-button"
          onClick={() =>
            downloadJSON(
              {
                version: "syrka.application-preparation/1",
                target: node.label,
                ...stored,
              },
              "syrka-application-preparation.json",
            )
          }
        >
          Export preparation draft
        </button>
      )}
    </section>
  );
}
