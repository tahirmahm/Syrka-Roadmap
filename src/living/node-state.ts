import { z } from "zod";
import type { Assertion, Claim, Person } from "../odyssey/types";
import type { LivingState, WorldNode } from "./schema";

export const prerequisiteGroupSchema = z.object({
  id: z.string().min(1).max(250),
  operator: z.enum(["AND", "OR"]),
  nodeIds: z.array(z.string().min(1).max(250)).min(1).max(100),
  requirement: z.enum(["formal", "advisory"]),
  sourceReference: z.string().min(1).max(3000),
});
export type PrerequisiteGroup = z.infer<typeof prerequisiteGroupSchema>;
export type NodeDimensions = {
  progress: "none" | "planned" | "in-progress" | "submitted" | "completed";
  evidence:
    | "none"
    | "self-reported"
    | "document-supported"
    | "reviewed"
    | "issuer-verified"
    | "disputed";
  feasibility: "actionable" | "blocked" | "unknown";
  reality: "actual" | "hypothetical";
  history: boolean;
  eligibility: "unknown" | "apparently-supported" | "missing-confirmation";
};
export type StatefulNode = WorldNode & {
  dimensions?: NodeDimensions;
  requirementGroups?: PrerequisiteGroup[];
};
export type RequirementState = "satisfied" | "missing" | "unknown";
export type GroupEvaluation = {
  id: string;
  operator: "AND" | "OR";
  requirement: "formal" | "advisory";
  state: RequirementState;
  satisfiedIds: string[];
  missingIds: string[];
  unknownIds: string[];
  sourceReference: string;
};
export type RequirementEvaluation = {
  state: RequirementState;
  groups: GroupEvaluation[];
  cycles: string[][];
  blockedBy: string[];
  unknownIds: string[];
};

const concreteEvidence = (n: StatefulNode) =>
  n.evidence.filter(
    (e) =>
      !e.id.startsWith("progress:") &&
      !["inferred", "disputed", "revoked", "hypothetical"].includes(e.status),
  );

/** A studied/checked topic is not evidence of mastery. Document support is still not issuer verification. */
export function hasEvidenceSupport(
  n: StatefulNode,
  requirement: "formal" | "advisory" = "advisory",
): RequirementState {
  if (
    n.dimensions?.reality === "hypothetical" ||
    n.status === "hypothetical" ||
    n.dimensions?.evidence === "disputed"
  )
    return "unknown";
  const records = concreteEvidence(n);
  const supported = records.some((e) =>
    [
      "document-supported",
      "reviewed",
      "user-reviewed",
      "institution-verified",
      "employer-verified",
      "issuer-verified",
    ].includes(e.status),
  );
  if (supported) return "satisfied";
  if (records.some((e) => e.status === "self-reported"))
    return requirement === "formal" ? "unknown" : "satisfied";
  if (
    n.evidence.some((e) =>
      ["inferred", "disputed", "revoked"].includes(e.status),
    )
  )
    return "unknown";
  return "missing";
}

/** Detect cycles in supplied dependencies; no ordering or requirement is manufactured. */
export function detectRequirementCycles(
  nodes: readonly StatefulNode[],
): string[][] {
  const byId = new Map(nodes.map((n) => [n.id, n])),
    visited = new Set<string>(),
    active = new Set<string>(),
    path: string[] = [],
    cycles: string[][] = [];
  const recorded = new Set<string>();
  function visit(id: string) {
    if (active.has(id)) {
      const cycle = [...path.slice(path.indexOf(id)), id],
        key = [...new Set(cycle)].sort().join("|");
      if (!recorded.has(key)) {
        recorded.add(key);
        cycles.push(cycle);
      }
      return;
    }
    if (visited.has(id) || !byId.has(id)) return;
    active.add(id);
    path.push(id);
    const n = byId.get(id)!;
    for (const dep of new Set([
      ...n.prerequisites,
      ...(n.requirementGroups || []).flatMap((g) => g.nodeIds),
    ]))
      visit(dep);
    path.pop();
    active.delete(id);
    visited.add(id);
  }
  for (const n of nodes) visit(n.id);
  return cycles;
}

/** AND/OR semantics apply only to explicitly supplied, sourced rules, never to visual containment. */
export function evaluatePrerequisiteGroups(
  groups: readonly PrerequisiteGroup[],
  nodes: readonly StatefulNode[],
): RequirementEvaluation {
  const byId = new Map(nodes.map((n) => [n.id, n])),
    cycles = detectRequirementCycles(nodes),
    cyclic = new Set(cycles.flat());
  const results = groups.map((g): GroupEvaluation => {
    const satisfiedIds: string[] = [],
      missingIds: string[] = [],
      unknownIds: string[] = [];
    for (const id of new Set(g.nodeIds)) {
      const n = byId.get(id),
        state =
          !g.sourceReference.trim() || !n || cyclic.has(id)
            ? "unknown"
            : hasEvidenceSupport(n, g.requirement);
      (state === "satisfied"
        ? satisfiedIds
        : state === "missing"
          ? missingIds
          : unknownIds
      ).push(id);
    }
    const state: RequirementState =
      !g.nodeIds.length || !g.sourceReference.trim()
        ? "unknown"
        : g.operator === "OR"
          ? satisfiedIds.length
            ? "satisfied"
            : unknownIds.length
              ? "unknown"
              : "missing"
          : missingIds.length
            ? "missing"
            : unknownIds.length
              ? "unknown"
              : "satisfied";
    return {
      id: g.id,
      operator: g.operator,
      requirement: g.requirement,
      state,
      satisfiedIds,
      missingIds,
      unknownIds,
      sourceReference: g.sourceReference,
    };
  });
  const formal = results.filter((g) => g.requirement === "formal");
  return {
    state: formal.some((g) => g.state === "missing")
      ? "missing"
      : formal.some((g) => g.state === "unknown")
        ? "unknown"
        : "satisfied",
    groups: results,
    cycles,
    blockedBy: [
      ...new Set(
        formal.flatMap((g) => (g.state === "missing" ? g.missingIds : [])),
      ),
    ],
    unknownIds: [...new Set(formal.flatMap((g) => g.unknownIds))],
  };
}

/** Legacy status remains readable; these dimensions never overwrite personal records or each other. */
export function deriveNodeDimensions(
  n: StatefulNode,
  options: {
    progress?:
      | "none"
      | "planned"
      | "working"
      | "in-progress"
      | "submitted"
      | "completed";
    hypothetical?: boolean;
    disputed?: boolean;
    prerequisites?: RequirementEvaluation;
    eligibility?: NodeDimensions["eligibility"];
  } = {},
): NodeDimensions {
  const records = concreteEvidence(n),
    legacyProgress: NodeDimensions["progress"] =
      n.status === "working"
        ? "in-progress"
        : n.status === "planned"
          ? "planned"
          : n.kind === "UniversityCourse" &&
              n.status === "reported" &&
              records.length > 0
            ? "completed"
            : "none";
  const progress =
    options.progress === "working"
      ? "in-progress"
      : options.progress || legacyProgress;
  const evidence: NodeDimensions["evidence"] =
    options.disputed || n.evidence.some((e) => e.status === "disputed")
      ? "disputed"
      : records.some((e) =>
            [
              "institution-verified",
              "employer-verified",
              "issuer-verified",
            ].includes(e.status),
          )
        ? "issuer-verified"
        : records.some((e) => ["reviewed", "user-reviewed"].includes(e.status))
          ? "reviewed"
          : records.some((e) => e.status === "document-supported")
            ? "document-supported"
            : records.some((e) => e.status === "self-reported")
              ? "self-reported"
              : "none";
  const feasibility: NodeDimensions["feasibility"] =
    options.prerequisites?.state === "missing"
      ? "blocked"
      : options.prerequisites?.state === "unknown" ||
          evidence === "disputed" ||
          n.requirement === "unknown" ||
          n.status === "prerequisites"
        ? "unknown"
        : "actionable";
  return {
    progress,
    evidence,
    feasibility,
    reality:
      options.hypothetical || n.status === "hypothetical"
        ? "hypothetical"
        : "actual",
    history: n.status === "historical" || n.evidence.some((e) => !!e.date),
    eligibility: options.eligibility || "unknown",
  };
}

export type EvidenceInvalidation = {
  assertionId: string;
  claimId: string;
  skillId: string;
  reason: string;
};
/** Conservative correction review. Keep assertions/history; deactivate stale associations for re-review. */
export function reconcileEvidence(
  person: Person,
  previous?: Person,
): {
  person: Person;
  invalidated: EvidenceInvalidation[];
  affectedSkillIds: string[];
} {
  const claims = new Map(person.claims.map((c) => [c.id, c])),
    before = new Map(previous?.claims.map((c) => [c.id, c]) || []),
    priorIds = new Set(previous?.assertions.map((a) => a.id) || []),
    invalidated: EvidenceInvalidation[] = [];
  const assertions = person.assertions.map((a) => {
    const c = claims.get(a.claimId),
      old = before.get(a.claimId);
    let reason = !a.consent
      ? "Capability consent was revoked."
      : c && !c.approved
        ? "The linked claim is no longer approved."
        : !c && old && priorIds.has(a.id)
          ? "The linked local claim was removed; the previous association needs review."
          : "";
    if (
      !reason &&
      c &&
      old &&
      priorIds.has(a.id) &&
      (old.text !== c.text ||
        old.quote !== c.quote ||
        old.educationState !== c.educationState ||
        old.kind !== c.kind ||
        old.grade !== c.grade ||
        old.institution !== c.institution ||
        old.dates !== c.dates)
    )
      reason =
        "The source claim changed; the previous association needs review.";
    if (
      !reason &&
      c?.mappings.some((m) => m.skillId === a.skillId && m.selected === false)
    )
      reason = "The linked capability mapping was deselected.";
    if (
      !reason &&
      c &&
      a.sourceSystem === "user-document" &&
      (!c.mappings.some(
        (m) => m.skillId === a.skillId && (m.selected ?? m.confirmed),
      ) ||
        a.quote !== c.quote)
    )
      reason =
        "The document association no longer matches the reviewed source.";
    if (reason && a.selected !== false) {
      invalidated.push({
        assertionId: a.id,
        claimId: a.claimId,
        skillId: a.skillId,
        reason,
      });
      return { ...a, selected: false };
    }
    return a;
  });
  return {
    person: { ...person, assertions },
    invalidated,
    affectedSkillIds: [...new Set(invalidated.map((i) => i.skillId))],
  };
}

/** Portable assertions without local claims remain supported; present local claims must still be approved. */
function assertionMatchesClaim(
  a: Assertion,
  claim: Claim | undefined,
): boolean {
  if (!a.consent || a.selected === false) return false;
  if (!claim) return true;
  if (!claim.approved) return false;
  if (
    claim.mappings.some((m) => m.skillId === a.skillId && m.selected === false)
  )
    return false;
  return (
    a.sourceSystem !== "user-document" ||
    (claim.quote === a.quote &&
      claim.mappings.some(
        (m) => m.skillId === a.skillId && (m.selected ?? m.confirmed),
      ))
  );
}
export function isAssertionCurrent(person: Person, a: Assertion): boolean {
  return assertionMatchesClaim(
    a,
    person.claims.find((c) => c.id === a.claimId),
  );
}
/** Build the private index per projection, not in a shared cross-account cache. */
export function currentAssertions(person: Person): Assertion[] {
  const claims = new Map(person.claims.map((c) => [c.id, c]));
  return person.assertions.filter((a) =>
    assertionMatchesClaim(a, claims.get(a.claimId)),
  );
}

/** Keep the accepted association as history, but require renewed review when its cited basis changes. */
export function reconcileAdvisoryLinks(
  links: LivingState["advisoryRelationships"],
  nextPerson: Person,
  previousPerson: Person,
):
  | (NonNullable<LivingState["advisoryRelationships"]>[number] & {
      reviewStatus?: "accepted" | "needs-review";
    })[]
  | undefined {
  if (!links) return undefined;
  const next = new Map(nextPerson.claims.map((c) => [c.id, c])),
    previous = new Map(previousPerson.claims.map((c) => [c.id, c]));
  return links.map((link) => {
    const claim = next.get(link.claimId),
      old = previous.get(link.claimId);
    const changed =
      !!claim &&
      !!old &&
      [
        "text",
        "quote",
        "kind",
        "educationState",
        "grade",
        "institution",
        "dates",
      ].some((key) => claim[key as keyof Claim] !== old[key as keyof Claim]);
    if (
      !claim ||
      !claim.approved ||
      changed ||
      !claim.quote.includes(link.quote)
    )
      return { ...link, reviewStatus: "needs-review" };
    return { ...link };
  });
}
