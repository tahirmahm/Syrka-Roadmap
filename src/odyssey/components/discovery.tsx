"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bookmark,
  Check,
  GitCompareArrows,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import type { Occupation, Person, Match, Workspace } from "../types";
import { discoveryBands, discoveryBand } from "../catalogue";
import { discoveryProjection } from "../capability-model";
import { jsonRequest } from "../client";
type SearchResult = {
  occupations: Occupation[];
  total: number;
  skillCount: number;
  matchedCount: number;
  domains: string[];
  coverage: string;
  version: string;
};
export function Discovery({
  person,
  saved,
  compare,
  onSave,
  onCompare,
  onSelect,
  initialQuery = "",
}: {
  person: Person;
  saved: string[];
  compare: string[];
  onSave: (id: string) => void;
  onCompare: (id: string) => void;
  onSelect: (o: Occupation) => void;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(
      initialQuery.startsWith("skill:") ? "" : initialQuery,
    ),
    [skillFilter, setSkillFilter] = useState(
      initialQuery.startsWith("skill:") ? initialQuery.slice(6) : "",
    ),
    [domain, setDomain] = useState(""),
    [data, setData] = useState<SearchResult | null>(null),
    [matches, setMatches] = useState<Match[]>([]),
    [personalized, setPersonalized] = useState(
      !initialQuery &&
        person.assertions.some((a) => a.consent && a.selected !== false),
    ),
    [category, setCategory] = useState(""),
    [error, setError] = useState(""),
    [aiConsent, setAIConsent] = useState(false),
    [aiBusy, setAIBusy] = useState<string | null>(null),
    [guidance, setGuidance] = useState<
      Record<
        string,
        {
          summary: string;
          actions: string[];
          uncertainties: string[];
          provider: string;
          model?: string | null;
          notice?: string;
          profileKey?: string;
        }
      >
    >({}),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setError("");
      jsonRequest<SearchResult>(
        "/api/catalogue?limit=40&q=" +
          encodeURIComponent(query) +
          "&domain=" +
          encodeURIComponent(domain) +
          "&skill=" +
          encodeURIComponent(skillFilter),
        { signal: controller.signal },
      )
        .then(setData)
        .catch((e) => {
          if (e.name !== "AbortError") setError(e.message);
        })
        .finally(() => setLoading(false));
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, domain, skillFilter]);
  useEffect(() => {
    if (!personalized) return;
    const controller = new AbortController();
    jsonRequest<{ matches: Match[] }>("/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discoveryProjection(person)),
      signal: controller.signal,
    })
      .then((x) => setMatches(x.matches))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [personalized, person]);
  const profileKey = JSON.stringify({
    skills: person.assertions
      .filter((a) => a.consent && a.selected !== false)
      .map((a) => a.skillId),
    interests: person.interests,
  });
  const explain = async (id: string, depth: "quick" | "deep") => {
    if (
      guidance[id]?.profileKey === profileKey &&
      guidance[id]?.provider === "ai" &&
      guidance[id]?.model ===
        (depth === "deep" ? "qwen3.8-max" : "qwen3.8-flash")
    )
      return;
    setAIBusy(id);
    try {
      const r = await jsonRequest<{
        summary: string;
        actions: string[];
        uncertainties: string[];
        provider: string;
        model?: string | null;
        notice?: string;
      }>("/api/career-guidance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          occupationId: id,
          skillIds: [
            ...new Set(
              person.assertions
                .filter((a) => a.consent && a.selected !== false)
                .map((a) => a.skillId),
            ),
          ].slice(0, 100),
          interests: person.interests,
          depth,
          consent: true,
        }),
      });
      setGuidance((g) => ({ ...g, [id]: { ...r, profileKey } }));
    } catch {
      setError(
        "Career guidance is unavailable. Your saved profile and source-backed results are intact.",
      );
    } finally {
      setAIBusy(null);
    }
  };
  const visible = personalized
    ? matches
        .filter(
          (m) =>
            (!category || discoveryBand(m) === category) &&
            (!domain || m.occupation.domain === domain) &&
            (!query ||
              (m.occupation.label + " " + m.occupation.aliases.join(" "))
                .toLowerCase()
                .includes(query.toLowerCase())),
        )
        .map((m) => m.occupation)
    : data?.occupations || [];
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">AN OPEN WORLD OF POSSIBILITIES</span>
        <h1>Explore careers</h1>
        <p>
          Explore {data?.total.toLocaleString() || "the"} source-defined
          occupations across disciplines.
        </p>
      </div>
      <div className="discovery-toolbar">
        <label className="search-control">
          <Search size={18} />
          <input
            aria-label="Search occupations"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSkillFilter("");
            }}
            placeholder="Economist, diplomat, AI engineer, teacher…"
          />
        </label>
        <label className="select-control">
          <span>Domain</span>
          <select
            aria-label="Filter occupations by domain"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
          >
            <option value="">All domains</option>
            {data?.domains.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
      </div>
      <div className="view-tabs" role="tablist" aria-label="Discovery mode">
        <button
          role="tab"
          aria-selected={!personalized}
          onClick={() => setPersonalized(false)}
        >
          Full catalogue
        </button>
        <button
          role="tab"
          aria-selected={personalized}
          onClick={() => setPersonalized(true)}
        >
          My possibilities
        </button>
      </div>
      {personalized && (
        <>
          <p className="small">
            Computed from consented skill identifiers and stated interests. No
            document text is sent to this matching endpoint. Location and formal
            eligibility are not inferred.
          </p>
          <label className="consent-check">
            <input
              type="checkbox"
              checked={aiConsent}
              onChange={(e) => setAIConsent(e.target.checked)}
            />
            Allow Qwen career guidance using selected capability identifiers and
            interests. No CV document text is sent.
          </label>
          <div className="filter-chips">
            <button
              className={!category ? "selected" : ""}
              onClick={() => setCategory("")}
            >
              All possibilities
            </button>
            {discoveryBands.map((c) => (
              <button
                key={c}
                className={category === c ? "selected" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </>
      )}
      {skillFilter && (
        <p className="small">
          Showing occupations linked to the selected ESCO capability.{" "}
          <button className="text-button" onClick={() => setSkillFilter("")}>
            Clear capability filter
          </button>
        </p>
      )}
      <div className="results-heading">
        <span>
          {loading
            ? "Searching…"
            : personalized
              ? `${visible.length} computed possibilities`
              : `${data?.matchedCount.toLocaleString() || 0} matching occupations`}
        </span>
        <span>
          {data?.skillCount.toLocaleString()} skill concepts · ESCO English
          snapshot
        </span>
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <div className="career-results">
        {visible.map((o) => {
          const match = matches.find((m) => m.occupation.id === o.id);
          return (
            <article className="career-row" key={o.id}>
              <div className="career-main">
                <span className="eyebrow">{o.domain}</span>
                <button className="career-title" onClick={() => onSelect(o)}>
                  {o.label.trim()}
                  <ArrowRight size={16} />
                </button>
                <p>
                  {o.description.slice(0, 220)}
                  {o.description.length > 220 ? "…" : ""}
                </p>
                <div className="career-facts">
                  <span>{o.essential.length} essential skills</span>
                  <span>{o.optional.length} optional skills</span>
                  {match && (
                    <>
                      <span>
                        {match.alignment.supported} document-backed claims
                      </span>
                      <span>{match.alignment.partial} claims to confirm</span>
                    </>
                  )}
                </div>
                {match && (
                  <details className="match-explanation">
                    <summary>Why this career?</summary>
                    <p>
                      Capabilities from your profile:{" "}
                      {match.explanation?.shared.join(", ") ||
                        "No essential capability overlap yet; explore this as a longer-term possibility."}
                    </p>
                    <p>
                      Requirements to develop or demonstrate:{" "}
                      {match.explanation?.missing.join(", ") ||
                        "No additional essential skill gaps identified; formal requirements remain unknown."}
                    </p>
                    <div className="supporting-evidence">
                      <strong>Evidence behind this recommendation</strong>
                      {person.assertions
                        .filter(
                          (a) =>
                            a.consent &&
                            a.selected !== false &&
                            match.shared.includes(a.skillId),
                        )
                        .slice(0, 3)
                        .map((a) => (
                          <blockquote key={a.id}>
                            <span>
                              {a.label} · {a.verification}
                            </span>
                            <p>
                              {a.quote ||
                                "Self-declared capability; supporting evidence needed."}
                            </p>
                          </blockquote>
                        ))}
                    </div>
                    <p>
                      Typical occupational expectations: {o.essential.length}{" "}
                      essential skills in ESCO. Qualifications, licensing and
                      local entry routes must be checked with the relevant
                      employer or regulator.
                    </p>
                    <p>{match.requirements.reason}</p>
                    <p>
                      Next action: explore the roadmap to inspect evidence and
                      learning routes for each requirement.
                    </p>
                  </details>
                )}
                {match && (
                  <div className="review-actions">
                    <button
                      className="secondary"
                      disabled={!aiConsent || aiBusy === o.id}
                      onClick={() => void explain(o.id, "quick")}
                    >
                      Explain with Flash
                    </button>
                    {match.shared.length >= 3 &&
                      (match.category === "Interdisciplinary opportunities" ||
                        match.effort.band === "substantial") && (
                        <button
                          className="secondary"
                          disabled={!aiConsent || aiBusy === o.id}
                          onClick={() => void explain(o.id, "deep")}
                        >
                          Complex transition · Max
                        </button>
                      )}
                  </div>
                )}
                {guidance[o.id] && guidance[o.id].profileKey === profileKey && (
                  <section className="career-guidance" role="status">
                    <span className="subtle-tag">
                      {guidance[o.id].provider === "ai"
                        ? `AI candidate guidance · requested ${guidance[o.id].model}`
                        : "Deterministic career guidance"}
                    </span>
                    <p>{guidance[o.id].summary}</p>
                    <ul>
                      {guidance[o.id].actions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                    {guidance[o.id].uncertainties.map((a, i) => (
                      <p className="small" key={i}>
                        {a}
                      </p>
                    ))}
                    <p className="small">{guidance[o.id].notice}</p>
                  </section>
                )}
                {match && (
                  <div className="match-dimensions">
                    <span>{discoveryBand(match)}</span>
                    <span>Transition: {match.effort.band}</span>
                    <span>Interest links: {match.interest.matched.length}</span>
                    <span>Formal eligibility: not assessed</span>
                  </div>
                )}
              </div>
              <div className="career-actions">
                <button
                  className="icon-button"
                  aria-label={`${saved.includes(o.id) ? "Unsave" : "Save"} ${o.label.trim()}`}
                  aria-pressed={saved.includes(o.id)}
                  onClick={() => onSave(o.id)}
                >
                  {saved.includes(o.id) ? (
                    <Check size={17} />
                  ) : (
                    <Bookmark size={17} />
                  )}
                </button>
                <button
                  className="icon-button"
                  aria-label={`Compare ${o.label.trim()}`}
                  aria-pressed={compare.includes(o.id)}
                  onClick={() => onCompare(o.id)}
                >
                  <GitCompareArrows size={17} />
                </button>
                <button className="primary" onClick={() => onSelect(o)}>
                  Explore roadmap
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!loading && !visible.length && !error && (
        <div className="empty-state">
          <Search />
          <h2>No results for these filters.</h2>
          <p>
            Try a broader phrase, another domain, or browse the full catalogue.
          </p>
          <button
            className="secondary"
            onClick={() => {
              setQuery("");
              setDomain("");
              setCategory("");
            }}
          >
            Clear filters
          </button>
        </div>
      )}
      {!personalized && data && data.occupations.length < data.matchedCount && (
        <button
          className="secondary load-more"
          onClick={async () => {
            setLoading(true);
            try {
              const x = await jsonRequest<SearchResult>(
                "/api/catalogue?limit=40&offset=" +
                  data.occupations.length +
                  "&q=" +
                  encodeURIComponent(query) +
                  "&domain=" +
                  encodeURIComponent(domain) +
                  "&skill=" +
                  encodeURIComponent(skillFilter),
              );
              setData({
                ...data,
                occupations: [...data.occupations, ...x.occupations],
              });
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setLoading(false);
            }
          }}
        >
          Load more occupations
        </button>
      )}
      <p className="catalogue-note">
        {data?.coverage} Relationships indicate occupational capabilities, not
        guaranteed access to a job or profession. ESCO data: European
        Commission. Sources and version appear in each roadmap.
      </p>
    </>
  );
}
export function SavedRoadmaps({
  workspace,
  onSelect,
  onDiscover,
}: {
  workspace: Workspace;
  onSelect: (id: string) => void;
  onDiscover: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">YOUR DIRECTIONS</span>
        <h1>My roadmaps</h1>
        <p>Independent destinations, progress and alternative-route choices.</p>
      </div>
      {workspace.paths.length ? (
        <div className="career-results">
          {workspace.paths.map((p) => (
            <article className="career-row" key={p.id}>
              <div>
                <span className="eyebrow">SAVED PATHWAY</span>
                <h2>{p.title}</h2>
                <p>
                  {p.completed.length} self-reported steps completed · updated{" "}
                  {new Date(p.updatedAt).toLocaleDateString("en-GB")}
                </p>
              </div>
              <button className="primary" onClick={() => onSelect(p.id)}>
                Continue
                <ArrowRight size={15} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <SlidersHorizontal />
          <h2>Your first roadmap is waiting.</h2>
          <p>Choose any occupation from the catalogue to begin.</p>
          <button className="primary" onClick={onDiscover}>
            Explore occupations
          </button>
        </div>
      )}
    </>
  );
}
