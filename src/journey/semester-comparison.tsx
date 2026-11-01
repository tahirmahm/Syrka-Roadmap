"use client";
import { useMemo, useState } from "react";
import { Columns2, ArrowRight, AlertCircle } from "lucide-react";
import type { CourseRecord, LivingState, WorldGraph } from "../living/schema";
import {
  compareSemesterCombinations,
  type SemesterCombination,
} from "./semester";
export function SemesterComparison({
  courses,
  graph,
  state,
  onSelectNode,
}: {
  courses: CourseRecord[];
  graph: WorldGraph;
  state: LivingState;
  onSelectNode: (id: string) => void;
}) {
  const [a, setA] = useState<string[]>(() =>
      state.plannedCourses.filter((id) => courses.some((c) => c.id === id)),
    ),
    [b, setB] = useState<string[]>([]);
  const comparison = useMemo(
    () => compareSemesterCombinations(a, b, courses, graph, state),
    [a, b, courses, graph, state],
  );
  const toggle = (side: "A" | "B", id: string) => {
    const setter = side === "A" ? setA : setB;
    setter((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );
  };
  const label = (id: string) =>
    graph.nodes.find((n) => n.id === id)?.label || id;
  const links = (ids: string[], empty: string) => (
    <>
      {ids.length ? (
        ids.map((id) => (
          <button
            type="button"
            className="text-button"
            key={id}
            onClick={() => onSelectNode(id)}
          >
            {label(id)} <ArrowRight size={12} />
          </button>
        ))
      ) : (
        <p className="small">{empty}</p>
      )}
    </>
  );
  const result = (name: string, r: SemesterCombination) => (
    <section aria-label={`Combination ${name} result`} className="quest-card">
      <h4>Combination {name}</h4>
      <p>
        <strong>{r.knownCredits} known credits</strong>
        {r.creditLimit !== null
          ? ` / ${r.creditLimit} supplied limit`
          : " · limit unknown"}
      </p>
      <p role="status">
        {!r.selectedIds.length
          ? "Choose courses to compare."
          : r.status === "blocked"
            ? "Blocked by supplied constraints"
            : r.status === "needs-confirmation"
              ? "Needs confirmation"
              : "Within supplied checks · eligibility unverified"}
      </p>
      {r.errors.map((text, i) => (
        <p key={i} className="error">
          <AlertCircle size={13} /> {text}
        </p>
      ))}
      {r.unknowns.length > 0 && (
        <details>
          <summary>Unknowns and source checks ({r.unknowns.length})</summary>
          {r.unknowns.map((text, i) => (
            <p key={i} className="small">
              {text}
            </p>
          ))}
        </details>
      )}
      <h4>Connected goals</h4>
      {links(
        r.goalIds,
        "No supplied graph relationship connects this combination to your active goals.",
      )}
      <details>
        <summary>
          Supplied prerequisite checks ({r.prerequisiteDetails.length})
        </summary>
        {r.prerequisiteDetails.map((p, i) => (
          <p className="small" key={i}>
            {label(p.courseId)} · {p.operator}: {p.ids.map(label).join(", ")} ·{" "}
            {p.state}. Source: {p.source}
          </p>
        ))}
      </details>
    </section>
  );
  return (
    <details className="semester-comparison">
      <summary>
        <Columns2 size={16} /> Compare two elective combinations
      </summary>
      <p>
        Explore illustrative A/B combinations. This does not register courses,
        change your saved semester or establish graduate eligibility.
      </p>
      {!courses.length ? (
        <p>
          No source-aware courses are available to compare. Import a catalogue
          first.
        </p>
      ) : (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1fr) 44px 44px",
              gap: "8px",
              alignItems: "center",
            }}
          >
            <strong>Course</strong>
            <strong>A</strong>
            <strong>B</strong>
            {courses.map((c) => (
              <div key={c.id} style={{ display: "contents" }}>
                <span className="small">
                  {c.title}
                  <br />
                  {c.credits === null
                    ? "Credits unknown"
                    : `${c.credits} credits`}
                  {c.availability === "fixture" ? " · fictional" : ""}
                </span>
                <label
                  style={{
                    minHeight: 44,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    aria-label={`Combination A: ${c.title}`}
                    checked={a.includes(c.id)}
                    onChange={() => toggle("A", c.id)}
                  />
                </label>
                <label
                  style={{
                    minHeight: 44,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <input
                    type="checkbox"
                    aria-label={`Combination B: ${c.title}`}
                    checked={b.includes(c.id)}
                    onChange={() => toggle("B", c.id)}
                  />
                </label>
              </div>
            ))}
          </div>
          {result("A", comparison.a)}
          {result("B", comparison.b)}
          <section aria-label="Capability trade-offs">
            <h4>Shared capability preparation</h4>
            {links(
              comparison.sharedCapabilities,
              "No shared capability mapping is supplied for these selections.",
            )}
            <h4>Additional preparation in A</h4>
            {links(comparison.onlyA, "No unique supplied mapping in A.")}
            <h4>Additional preparation in B</h4>
            {links(comparison.onlyB, "No unique supplied mapping in B.")}
            <h4>Goals supported by both</h4>
            {links(
              comparison.sharedGoals,
              "No shared active destination is linked.",
            )}
          </section>
          <details>
            <summary>Limits of this comparison</summary>
            {comparison.a.limitations.map((text, i) => (
              <p className="small" key={i}>
                {text}
              </p>
            ))}
          </details>
        </>
      )}
    </details>
  );
}
