"use client";
import { useEffect, useState } from "react";
import { ArrowRight, Compass, GitBranch, Upload, Search } from "lucide-react";
import type { Match, Occupation, Workspace } from "../types";
import { jsonRequest } from "../client";
import { capabilityBrain, discoveryProjection } from "../capability-model";
import { discoveryBand } from "../catalogue";
export function Overview({
  workspace,
  onExplore,
  onProfile,
  onSelect,
  onResume,
  onUpload,
}: {
  workspace: Workspace;
  onExplore: (query?: string) => void;
  onProfile: () => void;
  onSelect: (o: Occupation) => void;
  onResume: () => void;
  onUpload: () => void;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [status, setStatus] = useState(
    "Finding evidence-linked possibilities…",
  );
  const { person } = workspace;
  const brain = capabilityBrain(person);
  const selected = [
    ...new Map(brain.capabilities.map((a) => [a.capabilityId, a])).values(),
  ];
  const active = workspace.paths.find((p) => p.id === workspace.activePathId);
  useEffect(() => {
    const controller = new AbortController();
    jsonRequest<{ matches: Match[] }>("/api/discovery", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(discoveryProjection(person)),
      signal: controller.signal,
    })
      .then((r) => {
        setMatches(r.matches.slice(0, 3));
        setStatus(
          r.matches.length
            ? ""
            : "Add specific capabilities or interests to find evidence-linked possibilities.",
        );
      })
      .catch((e) => {
        if (e.name !== "AbortError")
          setStatus(
            "Recommendations are temporarily unavailable. Your profile and saved roadmaps are intact.",
          );
      });
    return () => controller.abort();
  }, [person]);
  return (
    <section
      className="recovery-overview"
      aria-label="Your professional overview"
    >
      <div className="page-heading">
        <span className="eyebrow">YOUR POSITION, YOUR POSSIBILITIES</span>
        <h1>
          {person.name === "Your profile"
            ? "Your next direction starts here."
            : `Your next direction, ${person.name}.`}
        </h1>
        <p>
          {person.headline} Build from what you can demonstrate, then explore
          what comes next.
        </p>
      </div>
      <form
        className="destination-search"
        onSubmit={(e) => {
          e.preventDefault();
          onExplore(query);
        }}
      >
        <Search size={20} />
        <input
          aria-label="Search career destinations"
          placeholder="Explore another career direction…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="primary" aria-label="Explore destinations">
          <ArrowRight size={18} />
        </button>
      </form>
      <div className="position-grid">
        <section className="position-card">
          <span className="eyebrow">YOUR CAPABILITY FOUNDATION</span>
          <h2>What you bring</h2>
          <p>
            {selected.length} selected capabilities linked to{" "}
            {person.claims.filter((c) => c.approved).length} reviewed records.
          </p>
          <div className="capability-pills">
            {selected.slice(0, 6).map((a) => (
              <span key={a.id}>{a.label}</span>
            ))}
          </div>
          <p className="small">
            Document-supported and self-declared claims remain distinct from
            independent verification.
          </p>
          <button className="text-button" onClick={onProfile}>
            Review my capabilities <ArrowRight size={16} />
          </button>
          <button className="text-button" onClick={onUpload}>
            <Upload size={16} />
            Add your CV
          </button>
        </section>
        <section className="position-card next-action">
          <span className="eyebrow">YOUR NEXT ACTION</span>
          <h2>
            {active
              ? `Continue ${active.title}`
              : selected.length
                ? "Turn a possibility into a plan"
                : "Give your profile a starting point"}
          </h2>
          <p>
            {active
              ? `${active.completed.length} self-reported milestones completed. Open your next learning or evidence task.`
              : selected.length
                ? "Inspect a career’s supporting evidence and gaps before choosing a roadmap."
                : "Add your CV or enter a capability manually. Employment history is optional."}
          </p>
          <button
            className="primary"
            onClick={
              active ? onResume : selected.length ? () => onExplore() : onUpload
            }
          >
            {active ? (
              <GitBranch size={17} />
            ) : selected.length ? (
              <Compass size={17} />
            ) : (
              <Upload size={17} />
            )}
            {active
              ? "Resume my roadmap"
              : selected.length
                ? "Explore my possibilities"
                : "Add your CV"}
          </button>
        </section>
      </div>
      <div className="section-title">
        <h2>Possibilities grounded in your profile</h2>
        <button className="text-button" onClick={() => onExplore()}>
          Explore all careers <ArrowRight size={15} />
        </button>
      </div>
      {status && (
        <p role="status" className="overview-status">
          {status}
        </p>
      )}
      <div className="possibility-grid">
        {matches.map((m) => (
          <article className="position-card" key={m.occupation.id}>
            <span className="eyebrow">{discoveryBand(m)}</span>
            <h3>{m.occupation.label}</h3>
            <p>
              {m.explanation?.shared.slice(0, 3).join(" · ") ||
                "Linked to a stated interest; no capability overlap established."}
            </p>
            <p className="small">
              {m.effort.missing} essential capabilities need development or
              evidence. Formal entry requirements remain unassessed.
            </p>
            <button
              className="text-button"
              onClick={() => onSelect(m.occupation)}
            >
              Inspect roadmap <ArrowRight size={15} />
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}
