"use client";
import { useEffect, useState } from "react";
import { X, ArrowRight, GitCompareArrows } from "lucide-react";
import type { Person } from "../types";
import { getOccupation, type OccupationBundle } from "../client";
import { matchOccupation } from "../catalogue";
export function Compare({
  ids,
  person,
  onRemove,
  onSelect,
  onDiscover,
}: {
  ids: string[];
  person: Person;
  onRemove: (id: string) => void;
  onSelect: (id: string, topic?: string) => void;
  onDiscover: () => void;
}) {
  const [bundles, setBundles] = useState<OccupationBundle[]>([]),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [only, setOnly] = useState<"all" | "shared" | "distinct">("all");
  useEffect(() => {
    let live = true;
    Promise.all(ids.map(getOccupation))
      .then((x) => {
        if (live) setBundles(x);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [ids]);
  const skills = [
    ...new Map(
      bundles
        .flatMap((b) =>
          b.skills.filter((s) => b.occupation.essential.includes(s.id)),
        )
        .map((s) => [s.id, s]),
    ).values(),
  ];
  const rows = skills
    .filter(
      (s) =>
        (!query || s.label.toLowerCase().includes(query.toLowerCase())) &&
        (only === "all" ||
          (only === "shared"
            ? bundles.every((b) => b.occupation.essential.includes(s.id))
            : !bundles.every((b) => b.occupation.essential.includes(s.id)))),
    )
    .sort((a, b) => a.label.localeCompare(b.label));
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">UNDERSTAND THE TRADE-OFFS</span>
        <h1>Compare paths</h1>
        <p>
          Exact shared and distinct requirements, with evidence kept separate
          from eligibility.
        </p>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!ids.length ? (
        <div className="empty-state">
          <GitCompareArrows />
          <h2>Choose two or more directions.</h2>
          <p>
            Use Compare in the catalogue. Up to four destinations can be
            compared.
          </p>
          <button className="primary" onClick={onDiscover}>
            Explore occupations
          </button>
        </div>
      ) : (
        <>
          <div className="compare-toolbar">
            <input
              aria-label="Find a compared competency"
              placeholder="Find a competency"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <select
              aria-label="Shared or distinct requirements"
              value={only}
              onChange={(e) => setOnly(e.target.value as typeof only)}
            >
              <option value="all">All requirements</option>
              <option value="shared">Shared requirements</option>
              <option value="distinct">Distinct requirements</option>
            </select>
            <button className="secondary" onClick={onDiscover}>
              Add another direction
            </button>
          </div>
          <div className="comparison-scroll">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th scope="col">Capability dimension</th>
                  {bundles.map((b) => (
                    <th key={b.occupation.id} scope="col">
                      <button
                        className="remove-comparison"
                        aria-label={`Remove ${b.occupation.label} from comparison`}
                        onClick={() => onRemove(b.occupation.id)}
                      >
                        <X size={15} />
                      </button>
                      <span>{b.occupation.label}</span>
                      <small>{b.occupation.domain}</small>
                      <button
                        className="text-button"
                        onClick={() => onSelect(b.occupation.id)}
                      >
                        Open roadmap
                        <ArrowRight size={13} />
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  "alignment",
                  "effort",
                  "interests",
                  "confidence",
                  "eligibility",
                  "education",
                  "cost",
                ].map((d) => (
                  <tr key={d}>
                    <th scope="row">
                      {
                        {
                          alignment: "Capability alignment",
                          effort: "Transition effort",
                          interests: "Interest links",
                          confidence: "Evidence confidence",
                          eligibility: "Mandatory requirements",
                          education: "Educational prerequisites",
                          cost: "Costs & location",
                        }[d]
                      }
                    </th>
                    {bundles.map((b) => {
                      const m = matchOccupation(person, b.occupation);
                      return (
                        <td key={b.occupation.id}>
                          {d === "alignment"
                            ? `${m.alignment.supported} document-backed; ${m.alignment.partial} to confirm; ${m.alignment.total} essential`
                            : d === "effort"
                              ? `${m.effort.missing} source skills without a claim · ${m.effort.band} gap`
                              : d === "interests"
                                ? m.interest.matched.join(", ") ||
                                  "None stated or matched"
                                : d === "confidence"
                                  ? `${m.confidence.documented} documentary, ${m.confidence.selfReported} self-reported, ${m.confidence.inferred} inferred`
                                  : d === "eligibility"
                                    ? "Not assessed; inspect official role and jurisdiction requirements."
                                    : d === "education"
                                      ? "No formal admission or qualification equivalence inferred."
                                      : "No current source data; use official programme or opportunity searches."}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {rows.map((s) => (
                  <tr key={s.id}>
                    <th scope="row">
                      <strong>{s.label}</strong>
                      <small>
                        {bundles.filter((b) =>
                          b.occupation.essential.includes(s.id),
                        ).length === bundles.length
                          ? "Shared requirement"
                          : "Distinct requirement"}
                      </small>
                    </th>
                    {bundles.map((b) => (
                      <td key={b.occupation.id}>
                        {b.occupation.essential.includes(s.id) ? (
                          <>
                            <span className="status-chip">
                              {person.assertions.some(
                                (a) =>
                                  a.consent &&
                                  a.selected !== false &&
                                  a.skillId === s.id,
                              )
                                ? "Claim linked · review scope"
                                : "Evidence needed"}
                            </span>
                            <button
                              className="text-button"
                              onClick={() => onSelect(b.occupation.id, s.id)}
                            >
                              Inspect competency
                              <ArrowRight size={12} />
                            </button>
                          </>
                        ) : (
                          "Not listed as essential in this source record"
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="catalogue-note">
            Comparison uses exact ESCO identifiers. Missing information is
            unknown, not automatically a failed requirement. Similarity is not a
            probability of employment.
          </p>
        </>
      )}
    </>
  );
}
