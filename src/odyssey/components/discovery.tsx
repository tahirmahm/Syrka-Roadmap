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
      body: JSON.stringify({
        interests: person.interests,
        assertions: person.assertions
          .filter((a) => a.selected !== false)
          .slice(0, 500)
          .map((a) => ({
            skillId: a.skillId,
            verification: [
              "institution-verified",
              "employer-verified",
            ].includes(a.verification)
              ? "document-supported"
              : a.verification,
            consent: a.consent,
          })),
      }),
      signal: controller.signal,
    })
      .then((x) => setMatches(x.matches))
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, [personalized, person]);
  const visible = personalized
    ? matches
        .filter(
          (m) =>
            (!category || m.category === category) &&
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
        <h1>Career discovery</h1>
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
          <div className="filter-chips">
            <button
              className={!category ? "selected" : ""}
              onClick={() => setCategory("")}
            >
              All possibilities
            </button>
            {[
              "Strong existing alignment",
              "Adjacent possibilities",
              "Interdisciplinary opportunities",
              "Emerging interests",
              "Longer-term ambitions",
            ].map((c) => (
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
                    <p>{match.requirements.reason}</p>
                    <p>
                      Next action: explore the roadmap to inspect evidence and
                      learning routes for each requirement.
                    </p>
                  </details>
                )}
                {match && (
                  <div className="match-dimensions">
                    <span>{match.category}</span>
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
