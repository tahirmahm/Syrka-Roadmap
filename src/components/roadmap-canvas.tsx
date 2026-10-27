"use client";
import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import {
  ArrowDown,
  Check,
  Flag,
  MapPin,
  Plus,
  Minus,
  Focus,
  LocateFixed,
  GitBranch,
  BookOpen,
  Clock3,
  ShieldCheck,
  CircleDashed,
} from "lucide-react";
import type { Roadmap, RoadNode } from "@/lib/types";
import "@xyflow/react/dist/style.css";
export const statusLabels: Record<RoadNode["status"], string> = {
  verified: "Verified capability",
  "document-supported": "Document supported",
  "self-reported": "Self-reported",
  inferred: "Inferred · needs review",
  missing: "Missing prerequisite",
  "in-progress": "In progress",
  completed: "Completed · self-reported",
  "requires-verification": "Requires verification",
  "not-eligible": "Not currently eligible",
  recommended: "Recommended next step",
};
type CardNode = Node<
  {
    item: RoadNode;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onExpand: (id: string) => void;
    expanded: string[];
  },
  "road"
>;
function RoadCard({ data }: NodeProps<CardNode>) {
  const n = data.item;
  const Icon =
    n.kind === "position"
      ? MapPin
      : n.kind === "destination"
        ? Flag
        : n.status === "completed"
          ? Check
          : n.status === "verified"
            ? ShieldCheck
            : n.kind === "alternative"
              ? BookOpen
              : CircleDashed;
  return (
    <div
      className={`road-card kind-${n.kind} status-${n.status} ${data.selectedId === n.id ? "is-selected" : ""}`}
    >
      <Handle type="target" position={Position.Top} />
      <button
        className="node-main nodrag"
        onClick={() => data.onSelect(n.id)}
        aria-label={`Open ${n.title}`}
      >
        <span className="node-icon">
          <Icon size={18} />
        </span>
        <span className="node-copy">
          <span className="node-kicker">
            {n.kind === "position"
              ? "YOU ARE HERE"
              : n.kind === "destination"
                ? "YOUR DESTINATION"
                : n.kind === "milestone"
                  ? "MILESTONE"
                  : n.kind === "alternative"
                    ? "ALTERNATIVE ROUTE"
                    : "CAPABILITY"}
          </span>
          <strong>{n.title}</strong>
          <span className="node-status">{statusLabels[n.status]}</span>
        </span>
        {n.kind === "destination" ? <ArrowDown size={16} /> : null}
      </button>
      {(n.skillId || n.requirementIds) && n.kind !== "alternative" && (
        <div className="node-footer">
          <span>
            <Clock3 size={12} />
            {n.requirementIds
              ? `${n.requirementIds.length} sourced requirements`
              : `${n.hours?.join("–")} hours · estimate`}
          </span>
          <button
            className="nodrag"
            aria-label={`${data.expanded.includes(n.id) ? "Collapse" : "Expand"} routes for ${n.title}`}
            onClick={() => data.onExpand(n.id)}
          >
            {data.expanded.includes(n.id) ? (
              <Minus size={13} />
            ) : (
              <Plus size={13} />
            )}{" "}
            Routes
          </button>
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
const nodeTypes = { road: RoadCard };
function Canvas({
  roadmap,
  selectedId,
  onSelect,
  onExpand,
  expanded,
}: {
  roadmap: Roadmap;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onExpand: (id: string) => void;
  expanded: string[];
}) {
  const flow = useReactFlow();
  const { nodes, edges } = useMemo(() => {
    const g = new dagre.graphlib.Graph();
    g.setGraph({
      rankdir: "TB",
      nodesep: 48,
      ranksep: 76,
      marginx: 35,
      marginy: 35,
    });
    g.setDefaultEdgeLabel(() => ({}));
    roadmap.nodes.forEach((n) =>
      g.setNode(n.id, { width: 280, height: n.skillId ? 136 : 108 }),
    );
    roadmap.edges.forEach((e) => g.setEdge(e.source, e.target));
    dagre.layout(g);
    return {
      nodes: roadmap.nodes.map((n) => ({
        id: n.id,
        type: "road",
        position: { x: g.node(n.id).x - 140, y: g.node(n.id).y - 60 },
        data: { item: n, selectedId, onSelect, onExpand, expanded },
        draggable: false,
      })),
      edges: roadmap.edges.map((e) => ({
        ...e,
        type: "smoothstep",
        style: {
          stroke: e.alternative ? "#a49ab7" : "#93a8c2",
          strokeWidth: 2,
          strokeDasharray: e.alternative ? "5 5" : undefined,
        },
      })),
    };
  }, [roadmap, selectedId, onSelect, onExpand, expanded]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void flow.fitView({ padding: 0.15, maxZoom: 0.9 });
    });
    return () => cancelAnimationFrame(frame);
  }, [nodes.length, flow]);
  return (
    <div className="canvas" aria-label="Interactive career roadmap">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15, maxZoom: 0.9 }}
        minZoom={0.2}
        maxZoom={1.6}
        nodesConnectable={false}
        deleteKeyCode={null}
        proOptions={{ hideAttribution: true }}
        ariaLabelConfig={{
          "controls.zoomIn.ariaLabel": "Zoom in",
          "controls.zoomOut.ariaLabel": "Zoom out",
          "controls.fitView.ariaLabel": "Fit roadmap",
        }}
      >
        <Background color="#d9dfe5" gap={23} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
      <div className="canvas-tools">
        <button
          title="Fit roadmap"
          aria-label="Fit roadmap"
          onClick={() => flow.fitView({ padding: 0.15, maxZoom: 1 })}
        >
          <Focus size={17} />
        </button>
        <button
          title="Return to starting point"
          aria-label="Return to starting point"
          onClick={() => {
            const n = nodes.find((n) => n.id === "position");
            if (n)
              flow.setCenter(n.position.x + 140, n.position.y + 55, {
                zoom: 1,
              });
          }}
        >
          <LocateFixed size={17} />
        </button>
      </div>
      <div className="canvas-hint">
        <GitBranch size={14} /> Select a stop to explore. Expand routes for
        alternatives.
      </div>
    </div>
  );
}
export function RoadmapCanvas(props: Parameters<typeof Canvas>[0]) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}
