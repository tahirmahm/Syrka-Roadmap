"use client";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Controls,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
  BaseEdge,
  MarkerType,
  type EdgeProps,
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
  MoreHorizontal,
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
import { reversePlan, simulate, planSemester } from "./engine";
import { focusNetwork } from "./spatial";
import {
  emptyNavigation,
  migrateRadialNavigation,
  navigationReducer,
  type NavigationEvent,
  type NavigationState,
} from "./navigation";
import { resizedCamera, type SceneCamera } from "./camera";
import { radialDomains, projectRadialBranch } from "./radial-projection";
import { DisciplineWheel, appearancePalette } from "./discipline-wheel";
import { ThemeToggle } from "./theme";
import { hasEvidenceSupport } from "./node-state";
import {
  emptyJourney,
  journeyActionSchema,
  type JourneyState,
} from "../journey/schema";
import {
  projectGraphActions,
  rankActions,
  actionAvailability,
} from "../journey/actions";
import { QuestDock } from "../journey/quest-dock";
import { IntegrationInbox } from "../journey/integration-inbox";
import { ActionSurface } from "../journey/action-surface";
import { Brand } from "@/components/brand";
import { SemesterComparison } from "../journey/semester-comparison";
import { RelationshipReview } from "./relationship-review";
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
  inferred: "Candidate mapping · needs review",
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
    faded: boolean;
    goal: boolean;
    hidden: number;
    relevance?: string;
    onSelect: (id: string) => void;
    onFocus: (id: string) => void;
    onExpand: (id: string) => void;
  },
  "living"
>;
function LivingNode({ data }: NodeProps<TreeNode>) {
  const n = data.record,
    Icon = icons[n.kind],
    size = 56;
  return (
    <div
      className={`living-node radial-branch-node kind-${n.kind} state-${data.hypothetical ? "hypothetical" : n.status} ${data.selected ? "is-selected" : ""} ${data.goal ? "is-goal" : ""} ${data.relevance ? "has-relevance" : ""}`}
      data-canonical-id={n.id}
      data-hidden-preparation-count={data.hidden}
      data-relevance-reason={data.relevance || undefined}
      data-relevant={data.relevance ? "true" : undefined}
      style={
        {
          width: size,
          height: size,
        } as React.CSSProperties
      }
    >
      <Handle type="target" position={Position.Left} />
      <button
        aria-label={`Inspect ${n.label}`}
        aria-haspopup="dialog"
        onClick={() => data.onSelect(n.id)}
        title={`${n.label} · ${statusLabel[n.status]}`}
      >
        <span className="radial-selection-ring" aria-hidden="true" />
        <Icon size={23} strokeWidth={1.5} />
        {(data.hypothetical ||
          n.status === "verified" ||
          n.status === "working" ||
          data.goal) && (
          <span className="orbit-state" aria-hidden="true">
            {data.hypothetical ? (
              <FlaskConical size={12} />
            ) : n.status === "verified" ? (
              <Check size={12} />
            ) : n.status === "working" ? (
              <Play size={12} />
            ) : data.goal ? (
              <Target size={12} />
            ) : null}
          </span>
        )}
        <strong className="radial-node-label">{n.label}</strong>
        <span className="sr-only">
          {data.goal ? "Future goal · " : ""}
          {statusLabel[n.status]} · {categoryLabel(n.kind)}
        </span>
      </button>
      {(data.hidden > 0 || data.expanded) && (
        <button
          className="radial-expand-node"
          aria-label={`${data.expanded ? "Collapse" : "Show"} preparation for ${n.label}`}
          aria-expanded={data.expanded}
          onClick={() => data.onExpand(n.id)}
        >
          {data.expanded ? "−" : "+"}
          <span className="sr-only">{data.hidden} undisclosed connections</span>
        </button>
      )}
      <Handle type="source" position={Position.Right} />
    </div>
  );
}
function ConstellationEdge(props: EdgeProps) {
  const bend = Math.max(42, Math.abs(props.targetX - props.sourceX) * 0.45);
  const path = `M ${props.sourceX} ${props.sourceY} C ${props.sourceX + bend} ${props.sourceY}, ${props.targetX - bend} ${props.targetY}, ${props.targetX} ${props.targetY}`;
  return (
    <g data-edge-from={props.source} data-edge-to={props.target}>
      <BaseEdge path={path} style={props.style} />
    </g>
  );
}
const nodeTypes = { living: LivingNode };
const edgeTypes = { constellation: ConstellationEdge };
export function LivingTree(props: {
  workspace: Workspace;
  onState: (patch: Partial<LivingState>) => void;
  onUpload: () => void;
  onDiscover: (query: string) => void;
  onDemo: (scenario: DemoScenario) => void;
  onLegacyDemo: () => void;
  onProfile: () => void;
  onNavigation: () => void;
  onOccupation: (id: string) => void;
  onResume: () => void;
  onReviewEvidence: (text: string) => void;
  workspaceScope: string;
  canAccessWorkspace: () => boolean;
}) {
  return (
    <ReactFlowProvider>
      <TreeWorkspace {...props} />
    </ReactFlowProvider>
  );
}
function TreeWorkspace({
  workspace,
  onState: persistState,
  onUpload,
  onDiscover,
  onDemo,
  onLegacyDemo,
  onProfile,
  onNavigation,
  onOccupation,
  onResume,
  onReviewEvidence,
  workspaceScope,
  canAccessWorkspace,
}: Parameters<typeof LivingTree>[0]) {
  const mobile = useMobile(),
    flow = useReactFlow();
  const state = useMemo(
    () => workspace.living || emptyLiving(),
    [workspace.living],
  );
  const nav = useMemo(
    () => migrateRadialNavigation(state.navigation || emptyNavigation(state)),
    [state],
  );
  const navigationRef = useRef(nav);
  useEffect(() => {
    navigationRef.current = nav;
  }, [nav]);
  const onState = (patch: Partial<LivingState>) => persistState(patch);
  const [graph, setGraph] = useState<WorldGraph | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [careerQuery, setCareerQuery] = useState(""),
    [pendingOccupation, setPendingOccupation] = useState<string | null>(null),
    [searchResults, setSearchResults] = useState<Occupation[]>([]),
    [domain, setDomain] = useState(""),
    [institution, setInstitution] = useState(""),
    [status, setStatus] = useState(""),
    [reading, setReading] = useState(false),
    [toolsOpen, setToolsOpen] = useState(false),
    [zoom, setZoom] = useState(0.85),
    [panel, setPanel] = useState<
      | "node"
      | "academic"
      | "inventory"
      | "guide"
      | "compare"
      | "action"
      | "inbox"
      | "edge"
      | "today"
      | null
    >(
      nav.inspectorOpen
        ? nav.scale === "action"
          ? "action"
          : nav.edgeId
            ? "edge"
            : "node"
        : null,
    ),
    [actionId, setActionId] = useState<string | null>(
      nav.scale === "action"
        ? nav.selected?.replace(/^action:/, "") || null
        : null,
    ),
    [sheetDetail, setSheetDetail] = useState(false),
    [relatedLimit, setRelatedLimit] = useState(24),
    [reducedMotion, setReducedMotion] = useState(false),
    [simulation, setSimulation] = useState<string[]>([]),
    [toast, setToast] = useState(""),
    [evidence, setEvidence] = useState(""),
    [guideQ, setGuideQ] = useState("What should I do next?"),
    [guideConsent, setGuideConsent] = useState(false),
    [guideDepth, setGuideDepth] = useState(false),
    [guideAnswer, setGuideAnswer] = useState<GuideAnswer | null>(null),
    [guideBusy, setGuideBusy] = useState(false);
  const inspector = useRef<HTMLElement>(null),
    origin = useRef<HTMLElement | null>(null),
    motionEpoch = useRef(0),
    canvas = useRef<HTMLDivElement>(null),
    cameraReady = useRef(false),
    initialCamera = useRef<SceneCamera | undefined>(
      nav.domainId ? nav.camera : undefined,
    );
  const profileKey = JSON.stringify({
    person: workspace.person,
    living: {
      ...state,
      view: undefined,
      navigation: undefined,
      journey: state.journey
        ? {
            ownerId: state.journey.ownerId,
            actions: state.journey.actions.map((a) => ({
              id: a.id,
              source: a.source,
              progress: a.progress,
              nodeIds: a.nodeIds,
              title: a.title,
              reason: a.reason,
              work: a.work,
              feasibility: a.feasibility,
              hypothetical: a.hypothetical,
            })),
          }
        : undefined,
      selected: undefined,
      expanded: undefined,
      investigated: [
        ...new Set([
          ...(state.investigatedOccupations || []),
          ...state.expanded.filter((id) => id.startsWith("occupation:")),
        ]),
      ],
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
  const graphById = useMemo(
    () => new Map(graph?.nodes.map((n) => [n.id, n]) || []),
    [graph],
  );
  const domains = useMemo(() => (graph ? radialDomains(graph) : []), [graph]);
  const activeDomain = domains.find((d) => d.id === nav.domainId) || null;
  const wheelOpen = !activeDomain;
  const shown = useMemo(() => {
    const projection =
      graph && nav.domainId
        ? projectRadialBranch(graph, {
            domainId: nav.domainId,
            expanded: nav.expanded,
            selectedId: nav.selected,
            goalIds: state.goals,
            budget: mobile ? 12 : 16,
          })
        : null;
    return {
      nodes: projection?.nodes || [],
      edges: projection?.displayEdges || [],
      positions:
        projection?.positions || new Map<string, { x: number; y: number }>(),
      hiddenCount: projection?.hiddenCount || 0,
      hiddenRequired: projection?.hiddenRequirements.length || 0,
      hiddenRequirements: projection?.hiddenRequirements || [],
      hiddenByBranch:
        projection?.hiddenByNode || ({} as Record<string, number>),
      relevance: projection?.relevance || new Map<string, string>(),
      roots: projection?.roots || [],
    };
  }, [graph, nav.domainId, nav.expanded, nav.selected, state.goals, mobile]);
  const dispatch = (event: NavigationEvent, browser = true) => {
    const box = canvas.current?.getBoundingClientRect();
    const anchorId =
      event.type === "OPEN_NODE" && event.goal
        ? event.id
        : event.type === "PREVIEW_ROUTE"
          ? event.id
          : null;
    const point = anchorId ? shown.positions.get(anchorId) : null;
    const base = {
      ...navigationRef.current,
      ...(anchorId && point
        ? {
            anchors: Object.fromEntries(
              [
                ...Object.entries(nav.anchors || {}).filter(
                  ([id]) => id !== anchorId,
                ),
                [anchorId, point],
              ].slice(-100),
            ),
          }
        : {}),
      camera: {
        ...flow.getViewport(),
        ...(box ? { width: box.width, height: box.height } : {}),
      },
    };
    const next = navigationReducer(base, event);
    navigationRef.current = next;
    const investigations = [
      ...new Set([
        ...(state.investigatedOccupations || []),
        ...state.expanded.filter((id) => id.startsWith("occupation:")),
      ]),
    ].slice(-500);
    persistState({
      navigation: next,
      selected: next.selected,
      expanded: next.expanded,
      view: next.camera,
      ...(investigations.length
        ? { investigatedOccupations: investigations }
        : {}),
    });
    if (
      browser &&
      !["SET_CAMERA", "CLOSE", "SET_QUIET", "SET_FOCUS"].includes(event.type)
    ) {
      window.history.pushState(
        {
          ...window.history.state,
          odyssey: { owner: workspaceScope, navigation: next },
        },
        "",
        window.location.href,
      );
    }
    return next;
  };
  const focusedIds = useMemo(
    () =>
      graph
        ? focusNetwork(
            graph,
            state.selected,
            state.mode === "goal" ? state.goals : [],
          )
        : null,
    [graph, state.selected, state.mode, state.goals],
  );
  const selected = graphById.get(nav.selected || "") || null;
  const SelectedIcon = selected ? icons[selected.kind] : Compass;
  const [preparationDrafts, setPreparationDrafts] = useState<
    Record<string, ApplicationDraft>
  >({});
  useEffect(() => {
    if (panel) inspector.current?.focus({ preventScroll: true });
  }, [panel, state.selected]);
  const reduced = () =>
    reducedMotion ||
    nav.quiet ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const focus = (id: string, preserve = true) => {
    const p = shown.positions.get(id);
    if (!p) return;
    const viewport = flow.getViewport();
    const box = canvas.current?.getBoundingClientRect();
    const sheet = inspector.current?.getBoundingClientRect();
    const nextZoom = preserve ? Math.max(0.8, viewport.zoom) : 1;
    const usableHeight =
      mobile &&
      box &&
      sheet &&
      sheet.top > box.top + 40 &&
      sheet.left < box.right - 20
        ? sheet.top - box.top
        : box?.height;
    const shift =
      box && usableHeight ? (box.height - usableHeight) / 2 / nextZoom : 0;
    void flow.setCenter(p.x + 28, p.y + 28 + shift, {
      zoom: nextZoom,
      duration: reduced() ? 0 : 280,
      interpolate: "linear",
    });
  };
  const choose = (id: string) => {
    motionEpoch.current++;
    void flow.setViewport(flow.getViewport(), { duration: 0 });
    setQuery("");
    setToolsOpen(false);
    const destinationDomain = domains.find((d) => d.nodeIds.includes(id))?.id;
    if (destinationDomain && destinationDomain !== nav.domainId) {
      cameraReady.current = false;
      initialCamera.current = undefined;
    }
    setRelatedLimit(12);
    origin.current = document.activeElement as HTMLElement;
    const n = graph?.nodes.find((n) => n.id === id);
    dispatch({
      type: "OPEN_NODE",
      id,
      domainId:
        domains.find((d) => d.nodeIds.includes(id))?.id ||
        nav.domainId ||
        undefined,
      goal:
        !!n &&
        [
          "Occupation",
          "EmployerRole",
          "GraduateProgramme",
          "ResearchPathway",
        ].includes(n.kind),
      action: !!n?.actionId,
    });
    setEvidence("");
    setGuideAnswer(null);
    setSheetDetail(false);
    if (n?.actionId) {
      setActionId(n.actionId);
      setPanel("action");
    } else setPanel("node");
    const epoch = motionEpoch.current;
    setTimeout(() => {
      if (epoch === motionEpoch.current) focus(id);
    }, 160);
  };
  const restore = (next: NavigationState) => {
    navigationRef.current = next;
    initialCamera.current = next.camera;
    cameraReady.current = false;
    if (next.scale === "action")
      setActionId(next.selected?.replace(/^action:/, "") || null);
    setPanel(
      next.inspectorOpen
        ? next.edgeId
          ? "edge"
          : next.scale === "action"
            ? "action"
            : "node"
        : null,
    );
    const box = canvas.current?.getBoundingClientRect();
    void flow.setViewport(
      box ? resizedCamera(next.camera, box.width, box.height) : next.camera,
      { duration: reduced() ? 0 : 240, interpolate: "linear" },
    );
  };
  const back = () => {
    motionEpoch.current++;
    void flow.setViewport(flow.getViewport(), { duration: 0 });
    if (
      window.history.state?.odyssey?.owner === workspaceScope &&
      nav.history.length
    )
      window.history.back();
    else restore(dispatch({ type: "BACK" }, false));
  };
  const close = () => {
    motionEpoch.current++;
    void flow.setViewport(flow.getViewport(), { duration: 0 });
    setPanel(null);
    dispatch({ type: "CLOSE" }, false);
    if (origin.current?.isConnected)
      origin.current.focus({ preventScroll: true });
    else
      document
        .querySelector<HTMLButtonElement>('[aria-label="Wheel"]')
        ?.focus({ preventScroll: true });
  };
  useEffect(() => {
    if (
      window.history.state?.odyssey?.owner !== workspaceScope ||
      window.history.state?.odyssey?.navigation?.radialVersion !== 1
    )
      window.history.replaceState(
        {
          ...window.history.state,
          odyssey: { owner: workspaceScope, navigation: nav },
        },
        "",
        window.location.href,
      );
    // An initial browser journal entry is scoped to this mounted person/account workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceScope]);
  useEffect(() => {
    const pop = (e: PopStateEvent) => {
      const entry = e.state?.odyssey;
      if (entry?.owner === workspaceScope) {
        const next = migrateRadialNavigation(
          entry.navigation,
          graph ? radialDomains(graph).map((d) => d.id) : undefined,
        );
        navigationRef.current = next;
        initialCamera.current = next.camera;
        cameraReady.current = false;
        persistState({
          navigation: next,
          selected: next.selected,
          expanded: next.expanded,
          view: next.camera,
        });
        if (next.scale === "action")
          setActionId(next.selected?.replace(/^action:/, "") || null);
        setPanel(
          next.inspectorOpen
            ? next.edgeId
              ? "edge"
              : next.scale === "action"
                ? "action"
                : "node"
            : null,
        );
        const box = canvas.current?.getBoundingClientRect();
        void flow.setViewport(
          box ? resizedCamera(next.camera, box.width, box.height) : next.camera,
          { duration: 0 },
        );
      }
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [workspaceScope, persistState, flow, graph]);
  const openHydratedOccupation = useEffectEvent((id: string) => choose(id));
  useEffect(() => {
    if (pendingOccupation && graphById.has(pendingOccupation)) {
      const id = pendingOccupation;
      queueMicrotask(() => {
        openHydratedOccupation(id);
        setPendingOccupation(null);
      });
    }
  }, [pendingOccupation, graphById]);
  useEffect(() => {
    if (!graph || !state.navigation?.domainId) return;
    const valid = migrateRadialNavigation(
      state.navigation,
      domains.map((d) => d.id),
    );
    if (valid.domainId !== state.navigation.domainId) {
      persistState({
        navigation: valid,
        selected: valid.selected,
        expanded: valid.expanded,
        view: valid.camera,
      });
      queueMicrotask(() => setPanel(null));
    }
  }, [graph, domains, state.navigation, persistState]);
  const openDiscipline = (id: string) => {
    const d = domains.find((domain) => domain.id === id);
    if (!d) return;
    motionEpoch.current++;
    setPanel(null);
    setToolsOpen(false);
    setReading(false);
    setQuery("");
    dispatch({ type: "OPEN_DISCIPLINE", id, rootId: d.rootIds[0] });
    cameraReady.current = false;
    initialCamera.current = undefined;
  };
  const showWheel = () => {
    motionEpoch.current++;
    dispatch({ type: "SHOW_WHEEL" });
    setPanel(null);
    setToolsOpen(false);
    setReading(false);
  };
  const baseJourney = useMemo(
    () =>
      state.journey?.ownerId === workspace.person.id
        ? state.journey
        : emptyJourney(workspace.person.id, "Europe/Prague"),
    [state.journey, workspace.person.id],
  );
  const journey = useMemo(() => {
    if (!graph) return baseJourney;
    const suggestions = projectGraphActions(
      graph,
      workspace.person.id,
      state.goals,
    );
    return {
      ...baseJourney,
      actions: [
        ...baseJourney.actions,
        ...suggestions
          .filter((a) => !baseJourney.actions.some((b) => b.id === a.id))
          .slice(0, Math.max(0, 500 - baseJourney.actions.length)),
      ],
    };
  }, [baseJourney, graph, workspace.person.id, state.goals]);
  const saveJourney = (value: JourneyState) => {
    if (value.actions.length > 500 || value.inbox.length > 50) {
      setToast(
        "This workspace reached its action/import limit. Export or archive records before adding more; existing records were preserved.",
      );
      return;
    }
    if (simulation.length || nav.previewRouteId) {
      setToast(
        "Exit simulation or discard the route preview before changing actual work.",
      );
      return;
    }
    if (value.ownerId === workspace.person.id) onState({ journey: value });
  };
  const openAction = (id: string) => {
    motionEpoch.current++;
    void flow.setViewport(flow.getViewport(), { duration: 0 });
    if (simulation.length || nav.previewRouteId) {
      setToast(
        "Exit simulation or discard the route preview before editing actual work.",
      );
      return;
    }
    if (!journey.actions.some((a) => a.id === id)) return;
    saveJourney({
      ...journey,
      actions: journey.actions.map((a) =>
        a.id === id && a.kind === "task" && a.progress === "planned"
          ? { ...a, progress: "working", updatedAt: new Date().toISOString() }
          : a,
      ),
    });
    setActionId(id);
    setToolsOpen(false);
    setPanel("action");
    setSheetDetail(true);
    dispatch({
      type: "OPEN_NODE",
      id: "action:" + id,
      action: true,
      domainId: domains.find(
        (d) =>
          d.nodeIds.includes("action:" + id) ||
          journey.actions
            .find((a) => a.id === id)
            ?.nodeIds.some((n) => d.nodeIds.includes(n)),
      )?.id,
    });
  };
  const openNodeWork = (n: WorldNode) => {
    const found = journey.actions.find((a) => a.nodeIds.includes(n.id));
    if (found) {
      openAction(found.id);
      return;
    }
    if (simulation.length || nav.previewRouteId) {
      setToast("Exit the hypothetical view before editing actual work.");
      return;
    }
    const now = new Date().toISOString();
    const a = journeyActionSchema.parse({
      id: "node-work:" + n.id,
      title: (n.actions[0]?.title || "Investigate " + n.label).slice(0, 200),
      verb: "Continue preparation",
      kind: "task",
      category: "preparation",
      source: {
        app: "roadmaps",
        recordId: n.id,
        ownerId: workspace.person.id,
        tenantId: null,
        version: 1,
        observedAt: now,
        permissions: ["read", "open", "draft"],
        consent: true,
        authority: "self-reported",
      },
      progress: "working",
      evidenceStatus: "self-reported",
      feasibility: "unknown",
      hypothetical: false,
      nodeIds: [n.id],
      dependsOn: [],
      reason:
        n.actions[0]?.deliverable ||
        "Verify the current source and document the next feasible step.",
      notes: n.actions
        .map((a) => a.deliverable + "\nCompletion criterion: " + a.criteria)
        .join("\n\n")
        .slice(0, 3000),
      evidence: "",
      work: { kind: "local-note", label: "Continue preparation" },
      updatedAt: now,
    });
    saveJourney({ ...journey, actions: [...journey.actions, a] });
    setActionId(a.id);
    setPanel("action");
    setToolsOpen(false);
    setSheetDetail(true);
    dispatch({
      type: "OPEN_NODE",
      id: "action:" + a.id,
      action: true,
      domainId: domains.find((d) => d.nodeIds.includes(n.id))?.id,
    });
  };
  const activeIds = useMemo(
    () => new Set(shown.nodes.map((n) => n.id)),
    [shown.nodes],
  );
  const sim =
    graph && simulation.length
      ? simulate(graph, simulation, state.goals)
      : null;
  const nodeRecords = shown.nodes.map((n) => ({
    id: n.id,
    type: "living" as const,
    width: 56,
    height: 56,
    position: shown.positions.get(n.id)!,
    data: {
      record: n,
      selected: n.id === nav.selected,
      hidden: shown.hiddenByBranch[n.id] || 0,
      relevance: shown.relevance.get(n.id),
      onExpand: (id: string) => dispatch({ type: "TOGGLE_BRANCH", id }),
      expanded: nav.expanded.includes(n.id),
      hypothetical: !!(
        sim?.hypothetical.includes(n.id) ||
        sim?.potentialEvidence.includes(n.id)
      ),
      faded: !!(
        (focusedIds && !focusedIds.has(n.id)) ||
        (domain && domain !== n.domain) ||
        (institution && institution !== n.institution) ||
        (status && status !== n.status)
      ),
      goal: state.goals.includes(n.id),
      onSelect: choose,
      onFocus: focus,
    },
  }));
  const applyCamera = (camera: SceneCamera) => {
    const box = canvas.current?.getBoundingClientRect();
    return flow.setViewport(
      box ? resizedCamera(camera, box.width, box.height) : camera,
      { duration: 0 },
    );
  };
  useEffect(() => {
    if (!nodeRecords.length || cameraReady.current || wheelOpen) return;
    cameraReady.current = true;
    const t = setTimeout(() => {
      const camera = initialCamera.current;
      if (camera?.width || (camera && !mobile)) void applyCamera(camera);
      else {
        const box = canvas.current?.getBoundingClientRect();
        const ys = [...shown.positions.values()].map((p) => p.y);
        const height = ys.length ? Math.max(...ys) + 115 : 500;
        const rootId = nav.routeId || shown.roots[0];
        const root = shown.positions.get(rootId);
        const preparationOnLeft = shown.edges.some(
          (edge) => edge.to === rootId,
        );
        void flow.setViewport(
          {
            x:
              mobile && root
                ? (box?.width || 390) * (preparationOnLeft ? 0.72 : 0.28) -
                  root.x -
                  28
                : 65,
            y: Math.max(24, ((box?.height || 700) - height) / 2),
            zoom: 1,
          },
          { duration: 0 },
        );
      }
    }, 120);
    return () => clearTimeout(t);
    // Initial framing is performed once; user navigation owns subsequent camera movement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeRecords.length, nav.domainId, wheelOpen]);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    let size = { width: el.clientWidth, height: el.clientHeight };
    const observer = new ResizeObserver(() => {
      const width = el.clientWidth,
        height = el.clientHeight;
      if (!width || !height) return;
      if (
        size.width &&
        size.height &&
        (width !== size.width || height !== size.height)
      )
        void flow.setViewport(
          resizedCamera({ ...flow.getViewport(), ...size }, width, height),
          { duration: 0 },
        );
      size = { width, height };
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [flow, reading, wheelOpen]);
  const edges = useMemo(
    () =>
      shown.edges
        .filter((e) => activeIds.has(e.from) && activeIds.has(e.to))
        .map((e) => ({
          id: e.id,
          source: e.from,
          target: e.to,
          type: "constellation",
          data: {
            sourceSize: 56,
            targetSize: 56,
          },
          className: `radial-edge ${e.requirement === "formal" ? "is-formal" : "is-advisory"} ${simulation.includes(e.from) ? "is-hypothetical" : ""}`,
          animated: false,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color:
              e.requirement === "formal"
                ? "var(--tree-required)"
                : "var(--tree-edge)",
            width: 14,
            height: 14,
          },
          style: {
            stroke:
              e.relation === "REQUIRES"
                ? "var(--tree-required)"
                : "var(--tree-edge)",
            strokeWidth: e.relation === "REQUIRES" ? 2 : 1.3,
            opacity:
              graph && state.selected && !focusedIds?.has(e.from) ? 0.18 : 0.85,
            strokeDasharray: [
              "SUPPORTS_APPLICATION_TO",
              "RECOMMENDED_PREPARATION",
              "ALTERNATIVE_PATH_TO",
            ].includes(e.relation)
              ? "5 5"
              : undefined,
          },
          label: undefined,
        })),
    [shown.edges, activeIds, simulation, graph, state.selected, focusedIds],
  );
  const plan = useMemo(
    () => (graph ? reversePlan(graph, state.goals, simulation) : null),
    [graph, state.goals, simulation],
  );
  const selectedEdge = graph?.edges.find((e) => e.id === nav.edgeId);
  const related =
    graph && selected
      ? graph.edges.filter(
          (e) => e.to === selected.id || e.from === selected.id,
        )
      : [];
  const courses: CourseRecord[] = useMemo(
    () =>
      graph
        ? graph.nodes
            .filter(
              (n) =>
                n.kind === "UniversityCourse" &&
                !n.id.startsWith("record-course:"),
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
                  availability:
                    n.source.kind === "fixture" ? "fixture" : "unknown",
                  schedule: [],
                  source: n.source,
                },
            )
        : [],
    [graph, state.catalogue, state.academic],
  );
  const semester = useMemo(
    () => (graph ? planSemester(graph, courses, state, state.goals) : null),
    // Planning depends on supplied academic rules, not the presentation camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [graph, courses, state.academic, state.goals],
  );
  const isReading = reading;
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
    <section
      className={`living-tree immersive-tree radial-scene ${wheelOpen ? "radial-overview" : "radial-branch"} ${panel ? "radial-inspector-open" : ""} ${toolsOpen ? "tools-open" : ""} ${panel ? "has-inspector" : ""} ${sheetDetail ? "sheet-detail" : "sheet-peek"} ${nav.quiet || reducedMotion ? "quiet-presentation" : ""}`}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          if (toolsOpen) setToolsOpen(false);
          else if (panel) close();
          else if (nav.previewRouteId)
            restore(dispatch({ type: "DISCARD_PREVIEW" }));
        }
      }}
      data-semantic-scale={nav.scale}
      data-domain-id={nav.domainId || ""}
      data-visible-node-count={shown.nodes.length}
      data-hidden-required-count={shown.hiddenRequired}
      data-hidden-node-count={shown.hiddenCount}
      data-domain-total-count={activeDomain?.count || 0}
      style={
        {
          "--radial-accent": activeDomain
            ? appearancePalette[activeDomain.appearance].accent
            : "#aaa",
        } as React.CSSProperties
      }
      aria-label="The Living Career Tree"
    >
      <header className="radial-header">
        <button
          className="icon-button"
          aria-label="Open navigation"
          onClick={onNavigation}
        >
          <Menu size={19} />
        </button>
        <span className="radial-brand">
          <Brand />{" "}
          <span>
            SYRKA <b>Roadmaps</b>
          </span>
        </span>
        <button
          className="icon-button"
          aria-label="Back to previous tree context"
          disabled={!nav.history.length}
          onClick={back}
        >
          <ArrowLeft size={18} />
        </button>
        <button
          className="secondary radial-home"
          aria-label="Wheel"
          onClick={showWheel}
        >
          Wheel
        </button>
        <span className="radial-breadcrumb">
          {activeDomain?.label || "Your path"}
        </span>
        {workspace.person.fictional && (
          <span className="radial-fictional">Fictional demonstration</span>
        )}
        <button
          className="icon-button"
          aria-label="Search the tree"
          onClick={() => {
            setPanel(null);
            setToolsOpen(true);
            setTimeout(
              () =>
                document
                  .querySelector<HTMLInputElement>(
                    '[aria-label="Search the living tree"]',
                  )
                  ?.focus(),
              0,
            );
          }}
        >
          <Search size={18} />
        </button>
        <button
          className="secondary radial-today"
          aria-label={`Today · ${rankActions(journey.actions, new Date(), journey.timezone, state.goals).filter((r) => actionAvailability(r.action, journey.actions, new Date()).actionable).length} actions`}
          aria-expanded={panel === "today"}
          onClick={() => {
            setPanel(panel === "today" ? null : "today");
            setToolsOpen(false);
            setSheetDetail(true);
          }}
        >
          <CalendarDays size={16} />
          Today{" "}
          <span>
            {
              rankActions(
                journey.actions,
                new Date(),
                journey.timezone,
                state.goals,
              ).filter(
                (r) =>
                  actionAvailability(r.action, journey.actions, new Date())
                    .actionable,
              ).length
            }
          </span>
        </button>
        <ThemeToggle
          value={state.theme}
          onChange={(theme) => onState({ theme })}
        />
        <button
          className="icon-button"
          aria-label={toolsOpen ? "Close tools" : "Explore & tools"}
          aria-expanded={toolsOpen}
          onClick={() => {
            setToolsOpen(!toolsOpen);
            setPanel(null);
          }}
        >
          <MoreHorizontal size={21} />
          <span className="sr-only">More</span>
        </button>
      </header>
      {nav.previewRouteId && (
        <div className="journey-preview-banner" role="status">
          Hypothetical route · goals and actual evidence unchanged{" "}
          <button
            onClick={() => restore(dispatch({ type: "DISCARD_PREVIEW" }))}
          >
            Discard preview
          </button>
          <button
            onClick={() => {
              goal(nav.previewRouteId!);
              dispatch({ type: "PIN_ROUTE", id: nav.previewRouteId! });
            }}
          >
            Adopt this goal
          </button>
        </div>
      )}
      <div className="tree-tools-overlay">
        <div className="tree-masthead">
          <div>
            <span className="eyebrow">Explore and manage</span>
            <h1>Your path</h1>
          </div>
          <div className="tree-entry-actions">
            <button className="secondary" onClick={onUpload}>
              <Upload size={16} />
              Add your CV
            </button>
            <button
              className="icon-button"
              aria-label="Open evidence inventory"
              onClick={() => {
                setPanel("inventory");
                setToolsOpen(false);
                setSheetDetail(true);
              }}
            >
              <Backpack size={18} />
            </button>
            <button
              className="secondary"
              onClick={() => {
                setPanel("guide");
                setToolsOpen(false);
                setSheetDetail(true);
              }}
            >
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
              .join(" + ") ||
              "Explore a direction. Your history stays with you."}
          </span>
          {workspace.paths.length > 0 && (
            <button className="text-button" onClick={onResume}>
              Resume my roadmap <ArrowRight size={14} />
            </button>
          )}
        </div>
        <div className="radial-more-actions">
          <button
            className="secondary"
            onClick={() => {
              setPanel("compare");
              setToolsOpen(false);
            }}
          >
            Compare
          </button>
          <button
            className="secondary"
            onClick={() => {
              onState({ mode: "history" });
              setPanel("inventory");
              setToolsOpen(false);
            }}
          >
            History
          </button>
          <button
            className="secondary"
            onClick={() => {
              setPanel("inbox");
              setToolsOpen(false);
            }}
          >
            Import actions
          </button>
          <button className="secondary" onClick={onProfile}>
            Profile & privacy
          </button>
          <button
            className="secondary"
            onClick={() =>
              downloadJSON(workspace, "syrka-roadmaps-workspace.json")
            }
          >
            Export workspace
          </button>
          <p className="small">
            {workspace.person.fictional
              ? "Fictional demonstration. No institution verified these records."
              : "Private local workspace. Documents remain on your device unless you explicitly authorise processing."}
          </p>
        </div>
        <div className="tree-toolbar">
          <div className="tree-mode" role="tablist" aria-label="Tree modes">
            {(["explore", "history", "goal"] as const).map((mode) => (
              <button
                key={mode}
                role="tab"
                aria-selected={state.mode === mode}
                onClick={() => {
                  onState({
                    mode,
                    selected: mode === "history" ? null : state.selected,
                  });
                  if (mode === "history")
                    setTimeout(
                      () =>
                        void flow.fitView({
                          nodes: graph?.nodes
                            .filter((n) => n.status === "historical")
                            .map((n) => ({ id: n.id })),
                          padding: 0.3,
                          minZoom: mobile ? 0.45 : 0.6,
                          maxZoom: 0.9,
                          duration: reduced() ? 0 : 300,
                        }),
                      120,
                    );
                }}
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
          <button
            className="secondary"
            onClick={() => {
              setPanel("academic");
              setToolsOpen(false);
              setSheetDetail(true);
            }}
          >
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
              ...new Set(
                graph?.nodes.map((n) => n.institution).filter(Boolean),
              ),
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
          <button
            className="text-button"
            onClick={() => {
              setPanel("compare");
              setToolsOpen(false);
              setSheetDetail(true);
            }}
          >
            Compare routes
          </button>
        </div>
        <div className="journey-presentation-controls">
          <label>
            <input
              type="checkbox"
              checked={nav.focus}
              onChange={(e) =>
                dispatch({ type: "SET_FOCUS", value: e.target.checked }, false)
              }
            />
            Focus this route
          </label>
          <label>
            <input
              type="checkbox"
              checked={nav.quiet}
              onChange={(e) =>
                dispatch({ type: "SET_QUIET", value: e.target.checked }, false)
              }
            />
            Quiet presentation
          </label>
          <label>
            <input
              type="checkbox"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
            />
            Reduced motion
          </label>
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
        <details
          className={`tree-universe-search ${toolsOpen ? "radial-tools-destinations" : ""}`}
          inert={!toolsOpen}
        >
          <summary>Destinations & fictional demonstrations</summary>
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
                    investigatedOccupations: [
                      ...new Set([
                        ...(state.investigatedOccupations || []),
                        ...state.expanded.filter((value) =>
                          value.startsWith("occupation:"),
                        ),
                        id,
                      ]),
                    ].slice(-500),
                  });
                  setPendingOccupation(id);
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
      </div>
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
      <div className="tree-stage radial-stage">
        {wheelOpen ? (
          <div className="radial-wheel-overview">
            <DisciplineWheel
              domains={domains}
              activeDomainId={null}
              onSelectDomain={openDiscipline}
            />
            {!loading && !domains.length && (
              <p className="radial-empty">
                Add a background or explore a fictional example from More.
                Uncategorised records remain in your evidence inventory.
              </p>
            )}
          </div>
        ) : (
          <div className="radial-wheel-anchor">
            <DisciplineWheel
              domains={domains}
              activeDomainId={nav.domainId}
              onSelectDomain={openDiscipline}
              compact
              onOverview={showWheel}
            />
          </div>
        )}
        {!wheelOpen &&
          (isReading ? (
            <div
              className="tree-reading"
              role="region"
              aria-label="Living tree reading mode"
            >
              {(
                graph?.nodes.filter(
                  (n) =>
                    activeDomain?.nodeIds.includes(n.id) ||
                    shown.hiddenRequirements.some((r) => r.nodeId === n.id),
                ) || shown.nodes
              ).map((n) => {
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
              ref={canvas}
              className="tree-canvas"
              onPointerDownCapture={() => {
                motionEpoch.current++;
                void flow.setViewport(flow.getViewport(), { duration: 0 });
              }}
              data-disclosed-count={shown.nodes.length}
              style={{ "--scene-zoom": zoom } as React.CSSProperties}
              role="region"
              aria-label={`${activeDomain?.label || "Discipline"} preparation tree`}
              data-domain-id={nav.domainId || ""}
              data-visible-node-count={shown.nodes.length}
              data-hidden-required-count={shown.hiddenRequired}
              onKeyDown={(e) => {
                if (["ArrowDown", "ArrowUp"].includes(e.key) && e.altKey) {
                  e.preventDefault();
                  const idx = shown.nodes.findIndex(
                      (n) => n.id === state.selected,
                    ),
                    n =
                      shown.nodes[
                        (idx +
                          (e.key === "ArrowDown"
                            ? 1
                            : shown.nodes.length - 1)) %
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
                edgeTypes={edgeTypes}
                defaultViewport={nav.camera}
                minZoom={0.65}
                maxZoom={2.2}
                nodesDraggable={false}
                nodesConnectable={false}
                nodesFocusable={false}
                autoPanOnNodeFocus={false}
                edgesFocusable={true}
                onlyRenderVisibleElements
                onMove={(_e, v) => setZoom(v.zoom)}
                onMoveEnd={(_e, v) => {
                  const box = canvas.current?.getBoundingClientRect();
                  const next = navigationReducer(navigationRef.current, {
                    type: "SET_CAMERA",
                    camera: {
                      ...v,
                      ...(box ? { width: box.width, height: box.height } : {}),
                    },
                  });
                  navigationRef.current = next;
                  persistState({ view: v, navigation: next });
                }}
                onEdgeClick={(_e, e) => {
                  dispatch({ type: "SELECT_EDGE", id: e.id });
                  setPanel("edge");
                  setToolsOpen(false);
                }}
                onPaneClick={() => {
                  if (panel && mobile) close();
                }}
                onNodeDoubleClick={(_e, n) => focus(n.id)}
                proOptions={{ hideAttribution: false }}
              >
                <Controls showInteractive={false} />
              </ReactFlow>
              <div className="tree-canvas-caption">
                Select a topic · + reveals preparation · Alt + arrow keys to
                navigate
              </div>
            </div>
          ))}
        {panel && (
          <aside
            className="tree-inspector"
            ref={inspector}
            tabIndex={-1}
            role={mobile ? "dialog" : undefined}
            aria-modal={mobile ? true : undefined}
            aria-label={
              panel === "today"
                ? "Today and this week"
                : panel === "node"
                  ? "Living node inspector"
                  : panel === "guide"
                    ? "Syrka Guide"
                    : panel === "academic"
                      ? "Academic planner"
                      : panel === "inventory"
                        ? "Evidence inventory"
                        : panel === "inbox"
                          ? "Integration inbox"
                          : panel === "action"
                            ? "Action inspector"
                            : panel === "edge"
                              ? "Connection inspector"
                              : "Route comparison"
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.stopPropagation();
                close();
              }
              if (mobile) trapFocus(e);
            }}
          >
            <div
              className="tree-sheet-handle"
              role="button"
              tabIndex={0}
              aria-label={sheetDetail ? "Peek node sheet" : "Expand node sheet"}
              onClick={() => setSheetDetail(!sheetDetail)}
              onKeyDown={(e) => {
                if (e.key === "Enter") setSheetDetail(!sheetDetail);
              }}
              onPointerDown={(e) => {
                e.currentTarget.dataset.start = String(e.clientY);
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerUp={(e) => {
                if (e.clientY - Number(e.currentTarget.dataset.start) > 65)
                  close();
              }}
            >
              <span />
            </div>
            <div className="tree-inspector-heading">
              <span className="eyebrow">
                {panel === "node" && selected
                  ? categoryLabel(selected.kind)
                  : panel === "today"
                    ? "Today / This week"
                    : panel === "edge"
                      ? "Relationship"
                      : panel}
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
                <div className="radial-node-title">
                  <SelectedIcon size={25} />
                  <h2>{selected.label}</h2>
                </div>
                <span className={`tree-status state-${selected.status}`}>
                  {statusLabel[selected.status]}
                </span>
                <p>
                  {selected.summary.length > 160
                    ? selected.summary.slice(0, 157) + "…"
                    : selected.summary}
                </p>
                <div className="journey-next-action">
                  <strong>Next action</strong>
                  <p>
                    {selected.actions[0]?.deliverable?.slice(0, 140) ||
                      "Review the source and choose supported preparation."}
                  </p>
                  <button
                    className="primary"
                    onClick={() => {
                      openNodeWork(selected);
                    }}
                  >
                    {selected.kind === "UniversityCourse"
                      ? "Open course work"
                      : selected.kind === "Project"
                        ? "Start project"
                        : [
                              "EmployerRole",
                              "GraduateProgramme",
                              "Opportunity",
                            ].includes(selected.kind)
                          ? "Prepare application"
                          : "Continue preparation"}{" "}
                    <ArrowRight size={15} />
                  </button>
                </div>
                <div className="radial-preparation-state">
                  <strong>Preparation</strong>
                  <p>
                    {
                      related.filter(
                        (e) =>
                          e.to === selected.id && e.requirement === "formal",
                      ).length
                    }{" "}
                    source-backed required links ·{" "}
                    {
                      related.filter(
                        (e) =>
                          e.to === selected.id && e.requirement !== "formal",
                      ).length
                    }{" "}
                    helpful / unconfirmed links.
                  </p>
                  <p>
                    {
                      related.filter(
                        (e) =>
                          e.to === selected.id &&
                          graphById.has(e.from) &&
                          hasEvidenceSupport(graphById.get(e.from)!) ===
                            "satisfied",
                      ).length
                    }{" "}
                    with existing evidence support. Other preparation needs
                    evidence or source confirmation; this is not formal
                    eligibility.
                  </p>
                </div>
                {shown.relevance.get(selected.id) && (
                  <details>
                    <summary>Goal relevance</summary>
                    <p className="radial-relevance-reason">
                      {shown.relevance.get(selected.id)}
                    </p>
                  </details>
                )}
                <div
                  className="journey-node-facts"
                  aria-label="Independent node states"
                >
                  <span>
                    Progress: {selected.dimensions?.progress || "none"}
                  </span>
                  <span>
                    Evidence: {selected.dimensions?.evidence || "none"}
                  </span>
                  <span>
                    Feasibility: {selected.dimensions?.feasibility || "unknown"}
                  </span>
                  <span>
                    {simulation.includes(selected.id)
                      ? "Hypothetical"
                      : "Actual record / proposed action"}
                  </span>
                </div>
                <button
                  className="secondary radial-show-preparation"
                  disabled={
                    !nav.expanded.includes(selected.id) &&
                    !shown.hiddenByBranch[selected.id]
                  }
                  onClick={() =>
                    dispatch({ type: "TOGGLE_BRANCH", id: selected.id })
                  }
                >
                  {nav.expanded.includes(selected.id)
                    ? "Collapse branch"
                    : "Show preparation"}{" "}
                  <span>({shown.hiddenByBranch[selected.id] || 0} more)</span>
                </button>
                {!!selected.requirementGroups?.length && (
                  <details>
                    <summary>
                      Published alternative / combined preparation
                    </summary>
                    {selected.requirementGroups.map((g) => (
                      <p key={g.id}>
                        {g.requirement} · {g.operator}:{" "}
                        {g.nodeIds
                          .map(
                            (id) =>
                              graph?.nodes.find((n) => n.id === id)?.label ||
                              id,
                          )
                          .join(g.operator === "OR" ? " OR " : " AND ")}{" "}
                        · Source: {g.sourceReference}
                      </p>
                    ))}
                  </details>
                )}
                {(shown.hiddenCount > 0 || shown.hiddenRequired > 0) && (
                  <details className="radial-hidden-preparation">
                    <summary>
                      {shown.hiddenCount} more in this discipline ·{" "}
                      {shown.hiddenRequired} required preparation records
                      outside this view
                    </summary>
                    <p>
                      Expand a branch or inspect the outline. Display grouping
                      never changes the source requirements.
                    </p>
                    {shown.hiddenRequirements
                      .slice(0, relatedLimit)
                      .map((requirement, index) => (
                        <div
                          key={`${requirement.targetId}:${requirement.nodeId}:${index}`}
                          className="radial-required-record"
                        >
                          {graphById.has(requirement.nodeId) ? (
                            <button
                              className="text-button"
                              onClick={() => choose(requirement.nodeId)}
                            >
                              {graphById.get(requirement.nodeId)!.label}
                            </button>
                          ) : (
                            <p>Record unavailable: {requirement.nodeId}</p>
                          )}
                          <small>
                            {requirement.operator || requirement.relation} ·{" "}
                            {requirement.reason} · {requirement.sourceReference}
                          </small>
                        </div>
                      ))}
                    {shown.hiddenRequirements.length > relatedLimit && (
                      <button
                        className="secondary"
                        onClick={() => setRelatedLimit((limit) => limit + 24)}
                      >
                        Show more required records (
                        {shown.hiddenRequirements.length - relatedLimit})
                      </button>
                    )}
                    <button
                      className="secondary"
                      onClick={() => {
                        setReading(true);
                        close();
                      }}
                    >
                      Open full discipline outline
                    </button>
                  </details>
                )}
                <details>
                  <summary>Goals, comparison and simulation</summary>
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
                      onClick={() =>
                        dispatch({ type: "PIN_ROUTE", id: selected.id })
                      }
                    >
                      {nav.pinned.includes(selected.id)
                        ? "Unpin route"
                        : "Pin route"}
                    </button>
                    <button
                      className="secondary"
                      onClick={() => {
                        dispatch({
                          type: "PREVIEW_ROUTE",
                          id: selected.id,
                          domainId: domains.find((d) =>
                            d.nodeIds.includes(selected.id),
                          )?.id,
                        });
                      }}
                    >
                      Try this route
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
                </details>
                <details>
                  <summary>Source, scope and uncertainty</summary>
                  <p>{selected.summary}</p>
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
                </details>
                {["EmployerRole", "GraduateProgramme", "Opportunity"].includes(
                  selected.kind,
                ) && (
                  <details>
                    <summary>Application preparation draft</summary>
                    <ApplicationPreparation
                      key={selected.id}
                      node={selected}
                      state={state}
                      workspace={workspace}
                      onState={onState}
                      onNotice={setToast}
                      initialDraft={preparationDrafts[selected.id]}
                      onDraftChange={(draft) =>
                        setPreparationDrafts((previous) =>
                          JSON.stringify(previous[selected.id]) ===
                          JSON.stringify(draft)
                            ? previous
                            : { ...previous, [selected.id]: draft },
                        )
                      }
                    />
                  </details>
                )}
                <details>
                  <summary>
                    My Passport evidence ({selected.evidence.length})
                  </summary>
                  <section>
                    <h3>Evidence support</h3>
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
                        Not demonstrated in the current record. This does not
                        mean you lack the capability.
                      </p>
                    )}
                  </section>
                </details>
                <details>
                  <summary>
                    Related paths and shared preparation ({related.length})
                  </summary>
                  <section>
                    <h3>Also supports / related paths</h3>
                    {related.slice(0, relatedLimit).map((e) => {
                      const other = graphById.get(
                        e.to === selected.id ? e.from : e.to,
                      );
                      return other ? (
                        <button
                          className="connection-row"
                          key={e.id}
                          onClick={() => choose(other.id)}
                        >
                          <span>
                            <small>
                              {e.relation.replaceAll("_", " ")} ·{" "}
                              {e.source.kind}
                            </small>
                            <strong>{other.label}</strong>
                            <em>{e.rationale}</em>
                          </span>
                          <ChevronRight size={16} />
                        </button>
                      ) : null;
                    })}
                    {related.length > relatedLimit && (
                      <div className="journey-more-connections">
                        <p>
                          {related.length - relatedLimit} additional
                          connections, including{" "}
                          {
                            related
                              .slice(relatedLimit)
                              .filter((e) => e.requirement === "formal").length
                          }{" "}
                          sourced formal relationships. Inspect all relevant
                          rules before assessing eligibility.
                        </p>
                        <button
                          className="secondary"
                          onClick={() => setRelatedLimit((n) => n + 24)}
                        >
                          Show more connections ({related.length - relatedLimit}
                          )
                        </button>
                      </div>
                    )}
                    {!related.length && (
                      <p>
                        Inspect this evidence record in My Capabilities to add
                        reviewed relationships.
                      </p>
                    )}
                  </section>
                </details>
                <details>
                  <summary>Completion criteria and progress notes</summary>
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
                        onClick={() => openNodeWork(selected)}
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
                      Self-recorded completion is not an institutionally
                      verified credential.
                    </p>
                  </section>
                </details>
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
                {graph && (
                  <SemesterComparison
                    courses={courses}
                    graph={graph}
                    state={state}
                    onSelectNode={choose}
                  />
                )}
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
                <RelationshipReview
                  workspace={workspace}
                  graph={graph}
                  onState={onState}
                />
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
            {panel === "today" && (
              <QuestDock
                state={journey}
                ownerId={workspace.person.id}
                graph={graph}
                goals={state.goals}
                onChange={saveJourney}
                onOpenAction={openAction}
                onSelectNode={choose}
                onOpenInbox={() => {
                  setPanel("inbox");
                  setSheetDetail(true);
                }}
              />
            )}
            {panel === "inbox" && (
              <IntegrationInbox
                canAccessWorkspace={canAccessWorkspace}
                state={journey}
                ownerId={workspace.person.id}
                onChange={saveJourney}
                graph={graph}
              />
            )}
            {panel === "action" && actionId && (
              <ActionSurface
                actionId={actionId}
                state={journey}
                ownerId={workspace.person.id}
                onChange={saveJourney}
                graph={graph}
                onSelectNode={choose}
                onReviewEvidence={(text) => {
                  if (simulation.length || nav.previewRouteId)
                    setToast(
                      "Exit the hypothetical view before reviewing actual evidence.",
                    );
                  else {
                    close();
                    onReviewEvidence(text);
                  }
                }}
              />
            )}
            {panel === "edge" && selectedEdge && (
              <section>
                <h2>Relationship</h2>
                <p>
                  {graph?.nodes.find((n) => n.id === selectedEdge.from)?.label}{" "}
                  → {graph?.nodes.find((n) => n.id === selectedEdge.to)?.label}
                </p>
                <strong>{selectedEdge.relation.replaceAll("_", " ")}</strong>
                <p>{selectedEdge.rationale}</p>
                <p>
                  {selectedEdge.requirement} · {selectedEdge.source.kind} ·{" "}
                  {selectedEdge.source.quality}
                </p>
                <p>{selectedEdge.source.reference}</p>
                {selectedEdge.source.url && (
                  <a
                    href={selectedEdge.source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Inspect source
                  </a>
                )}
              </section>
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

type ApplicationDraft = {
  source: string;
  reviewed: boolean;
  selected: string[];
  checks: string[];
  notes: string;
};
function ApplicationPreparation({
  node,
  state,
  workspace,
  onState,
  onNotice,
  initialDraft,
  onDraftChange,
}: {
  node: WorldNode;
  state: LivingState;
  workspace: Workspace;
  onState: (patch: Partial<LivingState>) => void;
  onNotice: (message: string) => void;
  initialDraft?: ApplicationDraft;
  onDraftChange: (draft: ApplicationDraft) => void;
}) {
  const stored = state.applications?.[node.id];
  const [source, setSource] = useState(
      initialDraft?.source ?? stored?.sourceUrl ?? node.source.url ?? "",
    ),
    [reviewed, setReviewed] = useState(
      initialDraft?.reviewed ?? !!stored?.sourceReviewedAt,
    ),
    [selected, setSelected] = useState<string[]>(
      initialDraft?.selected || stored?.evidenceIds || [],
    ),
    [checks, setChecks] = useState<string[]>(
      initialDraft?.checks || stored?.completedChecks || [],
    ),
    [notes, setNotes] = useState(initialDraft?.notes ?? stored?.notes ?? "");
  useEffect(() => {
    onDraftChange({ source, reviewed, selected, checks, notes });
  }, [source, reviewed, selected, checks, notes, onDraftChange]);
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
