"use client";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { jsonRequest } from "../odyssey/client";
import type { Workspace } from "../odyssey/types";
import type { WorldGraph } from "./schema";
export function LivingRecords({
  workspace,
  mode,
  onOpen,
}: {
  workspace: Workspace;
  mode: "goals" | "progress";
  onOpen: (id: string) => void;
}) {
  const [graph, setGraph] = useState<WorldGraph | null>(null),
    [error, setError] = useState("");
  const records =
    mode === "goals"
      ? workspace.living?.goals || []
      : (workspace.living?.progress || []).map((p) => p.nodeId);
  useEffect(() => {
    if (!records.length) return;
    const controller = new AbortController();
    jsonRequest<WorldGraph>("/api/living", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(workspace),
      signal: controller.signal,
    })
      .then(setGraph)
      .catch((e) => {
        if (e.name !== "AbortError")
          setError(
            "The source labels are unavailable. Your saved records remain intact.",
          );
      });
    return () => controller.abort();
    // Workspace changes invalidate the graph; record IDs are derived from that workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace]);
  if (!records.length) return null;
  return (
    <section
      className="living-records"
      aria-label={mode === "goals" ? "Living goals" : "Living quest progress"}
    >
      <h2>
        {mode === "goals" ? "Living goals" : "Living quests and milestones"}
      </h2>
      <p className="small">
        {mode === "goals"
          ? "Saved objectives share the same evidence and capability graph."
          : "Progress is self-reported. It does not create verified qualifications or proficiency."}
      </p>
      {error && <p role="status">{error}</p>}
      {records.map((id) => {
        const n = graph?.nodes.find((n) => n.id === id),
          p = workspace.living?.progress.find((p) => p.nodeId === id);
        return (
          <article className="progress-path" key={id}>
            <div className="section-title">
              <h3>{n?.label || id}</h3>
              <button className="text-button" onClick={() => onOpen(id)}>
                Open in Living Tree <ArrowRight size={14} />
              </button>
            </div>
            {mode === "progress" && p && (
              <>
                <p>
                  {p.status} · recorded{" "}
                  {new Date(p.at).toLocaleDateString("en-GB")}
                </p>
                {p.evidence && <blockquote>{p.evidence}</blockquote>}
              </>
            )}
            {n?.requirement === "unknown" && (
              <p className="small">Formal eligibility remains unverified.</p>
            )}
          </article>
        );
      })}
    </section>
  );
}
