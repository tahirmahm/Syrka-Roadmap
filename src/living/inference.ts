import { z } from "zod";
import type { Claim, EducationState } from "../odyssey/types";
import type { WorldGraph } from "./schema";
export const relationshipCandidate = z.object({
  from: z.string().max(250),
  to: z.string().max(250),
  relation: z.enum([
    "RECOMMENDED_PREPARATION",
    "CONTRIBUTES_TO",
    "TRANSFERABLE_TO",
    "COMPLEMENTS",
  ]),
  rationale: z.string().min(15).max(700),
  claimId: z.string().max(250),
  quote: z.string().min(10).max(1200),
});
export const relationshipOutput = z.object({
  relationships: z.array(relationshipCandidate).max(8),
  uncertainties: z.array(z.string().max(400)).max(8),
});
export type RelationshipCandidate = z.infer<typeof relationshipCandidate>;
export function validateRelationships(
  output: z.infer<typeof relationshipOutput>,
  graph: WorldGraph,
  claims: Claim[],
) {
  const ids = new Set(graph.nodes.map((n) => n.id)),
    seen = new Set<string>();
  for (const r of output.relationships) {
    const c = claims.find((c) => c.id === r.claimId && c.approved);
    if (
      !ids.has(r.from) ||
      !ids.has(r.to) ||
      r.from === r.to ||
      !c ||
      !c.quote.includes(r.quote)
    )
      throw new Error("Unsupported relationship source or graph identifier.");
    // At least one endpoint must be the cited evidence or an already mapped capability.
    if (
      ![r.from, r.to].some(
        (id) =>
          id === "evidence:" + c.id ||
          c.mappings.some(
            (m) =>
              m.selected && (m.skillId === id || "cap:" + m.skillId === id),
          ),
      )
    )
      throw new Error(
        "Relationship is not attached to its supporting evidence.",
      );
    if (
      /\b(must|required|mandatory|guaranteed|eligible|admitted)\b/i.test(
        r.rationale,
      )
    )
      throw new Error(
        "Advisory inference cannot assert a formal requirement or outcome.",
      );
    const key = r.from + ":" + r.to + ":" + r.relation;
    if (seen.has(key)) throw new Error("Duplicate relationship.");
    seen.add(key);
  }
  return output;
}
export function supportedEducationState(
  state: EducationState | undefined,
  quote: string,
) {
  if (!state || state === "unknown") return true;
  const checks: Record<Exclude<EducationState, "unknown">, RegExp> = {
    attended: /attended|attendance|studied at/i,
    current:
      /currently|enrolled|enrolment|present|in progress|expected|pursuing/i,
    completed: /graduated|completed|awarded|earned|conferred/i,
    withdrawn: /withdrawn|withdrew|dropped out/i,
    transferred: /transferred|transfer from|transfer to/i,
    incomplete: /incomplete|not completed|did not complete|without completing/i,
  };
  if (
    state === "completed" &&
    /not completed|did not complete|without completing|incomplete/i.test(quote)
  )
    return false;
  return checks[state].test(quote);
}
