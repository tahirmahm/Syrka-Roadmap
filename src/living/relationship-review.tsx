"use client";
import { useState } from "react";
import type { Workspace } from "../odyssey/types";
import type { WorldGraph, LivingState } from "./schema";
import type { RelationshipCandidate } from "./inference";
import { jsonRequest } from "../odyssey/client";
export function RelationshipReview({
  workspace,
  graph,
  onState,
}: {
  workspace: Workspace;
  graph: WorldGraph | null;
  onState: (patch: Partial<LivingState>) => void;
}) {
  const [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [candidates, setCandidates] = useState<RelationshipCandidate[]>([]),
    [uncertainties, setUncertainties] = useState<string[]>([]);
  return (
    <section className="relationship-review">
      <h3>Interpret my experience</h3>
      <p>
        Ask Qwen to propose advisory connections from described work, not
        titles. Nothing becomes a formal requirement or a verified capability.
      </p>
      <details>
        <summary>Review the source excerpts to be shared</summary>
        {workspace.person.claims
          .filter(
            (c) =>
              c.approved &&
              [
                "project",
                "employment",
                "internship",
                "education",
                "qualification",
                "publication",
                "course",
              ].includes(c.kind),
          )
          .slice(0, 8)
          .map((c) => (
            <blockquote key={c.id}>{c.quote.slice(0, 900)}</blockquote>
          ))}
      </details>
      <label className="check-label">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        I consent to sending these up to eight source excerpts and bounded graph
        labels to Qwen for this request.
      </label>
      <button
        className="secondary"
        disabled={!consent || busy}
        onClick={async () => {
          setBusy(true);
          setCandidates([]);
          setUncertainties([]);
          try {
            const r = await jsonRequest<{
              relationships: RelationshipCandidate[];
              uncertainties: string[];
              notice: string;
            }>("/api/relationships", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ workspace, consent: true }),
            });
            setCandidates(r.relationships);
            setUncertainties(r.uncertainties);
            setNotice(r.notice);
          } catch (e) {
            setNotice((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy
          ? "Interpreting source relationships…"
          : "Suggest evidence connections"}
      </button>
      {notice && <p role="status">{notice}</p>}
      {uncertainties.map((u, i) => (
        <p key={i} className="small">
          Uncertainty: {u}
        </p>
      ))}
      {candidates.map((r, i) => (
        <article className="quest-card" key={r.from + ":" + r.to}>
          <p>
            {graph?.nodes.find((n) => n.id === r.from)?.label || r.from} →{" "}
            {graph?.nodes.find((n) => n.id === r.to)?.label || r.to}
          </p>
          <strong>
            Advisory · {r.relation.replaceAll("_", " ").toLowerCase()}
          </strong>
          <p>{r.rationale}</p>
          <blockquote>{r.quote}</blockquote>
          <p className="small">
            Source claim {r.claimId}. Unverified model suggestion.
          </p>
          <button
            className="secondary"
            onClick={() => {
              onState({
                advisoryRelationships: [
                  ...(workspace.living?.advisoryRelationships || []).filter(
                    (x) =>
                      !(
                        x.from === r.from &&
                        x.to === r.to &&
                        x.relation === r.relation
                      ),
                  ),
                  {
                    ...r,
                    acceptedAt: new Date().toISOString(),
                    reviewStatus: "accepted" as const,
                  },
                ].slice(-100),
              });
              setCandidates((cs) => cs.filter((_, idx) => idx !== i));
              setNotice(
                "Advisory link accepted. Capability verification and actual progress are unchanged.",
              );
            }}
          >
            Accept advisory link
          </button>
          <button
            className="text-button"
            onClick={() =>
              setCandidates((cs) => cs.filter((_, idx) => idx !== i))
            }
          >
            Reject suggestion
          </button>
        </article>
      ))}
      {(workspace.living?.advisoryRelationships || []).map((r, i) => (
        <div key={i}>
          <p className="small">
            {r.reviewStatus === "needs-review"
              ? "Needs review after source correction"
              : "Accepted advisory association"}
            : {r.rationale}
          </p>
          <button
            className="text-button"
            onClick={() =>
              onState({
                advisoryRelationships:
                  workspace.living!.advisoryRelationships!.filter(
                    (_, idx) => idx !== i,
                  ),
              })
            }
          >
            Remove advisory link
          </button>
        </div>
      ))}
    </section>
  );
}
