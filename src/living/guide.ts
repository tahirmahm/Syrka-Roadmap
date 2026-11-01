import { z } from "zod";
import type { WorldGraph } from "./schema";
import { reversePlan } from "./engine";
export const guideOutput = z.object({
  answer: z.string().min(1).max(4000),
  nodeIds: z.array(z.string().max(250)).max(8),
  actions: z
    .array(
      z.object({
        nodeId: z.string().max(250),
        instruction: z.string().max(700),
      }),
    )
    .max(6),
  assumptions: z.array(z.string().max(700)).max(5),
});
export type GuideAnswer = z.infer<typeof guideOutput> & {
  provider: "deterministic" | "ai";
  model?: string;
  notice: string;
};
export function deterministicGuide(
  graph: WorldGraph,
  nodeId: string,
  question: string,
  goals: string[],
): GuideAnswer {
  const n = graph.nodes.find((n) => n.id === nodeId) || graph.nodes[0],
    plan = reversePlan(graph, goals.length ? goals : [n.id]);
  const related = graph.edges.filter((e) => e.from === n.id || e.to === n.id),
    ids = [
      n.id,
      ...related.map((e) => (e.from === n.id ? e.to : e.from)),
    ].slice(0, 7);
  const research = /research|master|academic|graduate|doctor/i.test(
    question + " " + n.label,
  );
  return {
    answer: `${n.label}: ${n.summary} ${n.evidence.length ? `${n.evidence.length} supporting record(s) are linked; their scope and verification are shown in the inspector.` : "No selected record currently demonstrates this node; that is missing evidence, not proof you lack the capability."} ${research ? "Professional experience may support research interests, but programme-specific admissions and degree equivalence require official confirmation." : "Preparation edges are advisory unless a source explicitly records a formal requirement."}`,
    nodeIds: ids,
    actions: (plan.available.length ? plan.available : [n.id])
      .slice(0, 3)
      .map((id) => ({
        nodeId: id,
        instruction:
          graph.nodes.find((n) => n.id === id)?.actions[0]?.deliverable ||
          "Inspect the source, supporting evidence and connected preparation.",
      })),
    assumptions: [
      "Only the current graph and reviewed profile are used.",
      "Availability, schedules, eligibility and current admissions are unknown unless explicitly sourced.",
    ],
    provider: "deterministic",
    notice: "Source-grounded local guide. No external AI request was needed.",
  };
}
export function validateGuideLinks(
  answer: z.infer<typeof guideOutput>,
  graph: WorldGraph,
) {
  const ids = new Set(graph.nodes.map((n) => n.id));
  if (
    answer.nodeIds.some((id) => !ids.has(id)) ||
    answer.actions.some((a) => !ids.has(a.nodeId))
  )
    throw new Error("Unknown graph identifier in Guide response");
  return answer;
}

/** Provider context never contains automatic Passport names, grades or source quotes. */
export function guideNodeContext(n: import("./schema").WorldNode) {
  const privateRecord =
    [
      "PersonProfile",
      "ProfessionalExperience",
      "Credential",
      "AcademicProgramme",
    ].includes(n.kind) ||
    ["user-document", "self-reported"].includes(n.source.kind);
  return {
    id: n.id,
    label: privateRecord ? n.kind.replace(/([a-z])([A-Z])/g, "$1 $2") : n.label,
    summary: privateRecord
      ? `Reviewed ${n.kind} record with ${n.skillIds.length} mapped capability references and ${n.evidence.length} supporting claims. Original personal content stays local.`
      : n.summary,
    status: n.status,
    source: { kind: n.source.kind, version: n.source.version },
  };
}
