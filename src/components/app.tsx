"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Flag,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  GitBranch,
  Home,
  Layers3,
  Map,
  Menu,
  Search,
  Upload,
  X,
  Check,
  Clock3,
  Download,
  RotateCcw,
  Milestone,
  BriefcaseBusiness,
  GraduationCap,
  ShieldCheck,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Info,
  Target,
  Plus,
} from "lucide-react";
import { Brand } from "./brand";
import { RoadmapCanvas, statusLabels } from "./roadmap-canvas";
import { NodeDetails } from "./node-details";
import esco from "@/data/esco.json";
import { demoProfile, destinations, skillById } from "@/data/ontology";
import { addAlternatives, generateRoadmap, summarize } from "@/lib/engine";
import { importPassport } from "@/lib/passport";
import { readState, storageKey } from "@/lib/storage";
import type { SavedState } from "@/lib/types";
export const views = [
  "home",
  "roadmap",
  "discover",
  "capabilities",
  "opportunities",
  "progress",
  "compare",
] as const;
export type View = (typeof views)[number];
const navigation = [
  { id: "home", label: "Overview", Icon: Home },
  { id: "roadmap", label: "My roadmap", Icon: GitBranch },
  { id: "discover", label: "Career discovery", Icon: Compass },
  { id: "capabilities", label: "My capabilities", Icon: Layers3 },
  { id: "opportunities", label: "Opportunities", Icon: BriefcaseBusiness },
  { id: "progress", label: "My progress", Icon: Milestone },
  { id: "compare", label: "Compare paths", Icon: Map },
] as const;
const initial: SavedState = {
  version: 1,
  profile: demoProfile,
  destinationId: "product-designer",
  completed: [],
  inProgress: [],
  expanded: [],
  updatedAt: "",
};
function exportFile(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
export function App({ initialView = "home" }: { initialView?: View }) {
  const [state, setState] = useState<SavedState>(initial),
    [ready, setReady] = useState(false),
    [view, setView] = useState<View>(initialView),
    [mobile, setMobile] = useState(false),
    [query, setQuery] = useState(""),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [notice, setNotice] = useState(""),
    [importOpen, setImportOpen] = useState(false),
    [confirmReset, setConfirmReset] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const s = readState(localStorage.getItem(storageKey));
        if (s) setState(s);
      } catch {
        setNotice(
          "Browser storage is unavailable. Export your work before leaving.",
        );
      }
      setReady(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      /* Explicit save reports a storage error. */
    }
  }, [state, ready]);
  const update = useCallback(
    (patch: Partial<SavedState>) =>
      setState((s) => ({
        ...s,
        ...patch,
        updatedAt: new Date().toISOString(),
      })),
    [],
  );
  const navigate = (id: View) => {
    setView(id);
    setMobile(false);
    setSelectedId(null);
    history.replaceState(
      null,
      "",
      `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/${id === "home" ? "" : id}`,
    );
  };
  const roadmap = generateRoadmap(
    state.profile,
    state.destinationId,
    state.completed,
    state.inProgress,
  );
  const expandedRoadmap = addAlternatives(roadmap, state.expanded);
  const onExpand = useCallback(
    (id: string) =>
      setState((s) => ({
        ...s,
        expanded: s.expanded.includes(id)
          ? s.expanded.filter((x) => x !== id)
          : [...s.expanded, id],
        updatedAt: new Date().toISOString(),
      })),
    [],
  );
  const onSelect = useCallback((id: string) => setSelectedId(id), []);
  const selectDestination = (id: string) => {
    update({ destinationId: id, expanded: [] });
    setSelectedId(null);
    navigate("roadmap");
    setNotice("Your pathway is ready. Select any stop to explore.");
  };
  const onStatus = (
    id: string,
    status: "completed" | "in-progress" | "reset",
  ) => {
    update({
      completed:
        status === "completed"
          ? [...new Set([...state.completed, id])]
          : state.completed.filter((x) => x !== id),
      inProgress:
        status === "in-progress"
          ? [...new Set([...state.inProgress, id])]
          : state.inProgress.filter((x) => x !== id),
    });
    setNotice(
      status === "completed"
        ? "Milestone saved as self-reported completion."
        : status === "in-progress"
          ? "Step marked in progress."
          : "Progress reset for this step.",
    );
  };
  const filtered = destinations.filter((d) =>
    `${d.name} ${d.field} ${d.skills.map((s) => skillById[s].name).join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const completed = roadmap.nodes.filter(
    (n) => n.status === "completed",
  ).length;
  const selected = expandedRoadmap.nodes.find((n) => n.id === selectedId);
  const save = () => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ ...state, updatedAt: new Date().toISOString() }),
      );
      setNotice(
        "Saved in this browser. Export a copy to keep a portable backup.",
      );
    } catch {
      setNotice("Cannot access browser storage. Use Export to keep your work.");
    }
  };
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {mobile && (
        <button
          className="drawer-backdrop"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "is-open" : ""}`}>
        <a
          className="brand"
          href={`${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`}
        >
          <Brand />
          <span>
            SYRKA<span className="brand-suite">roadmaps</span>
          </span>
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setMobile(false)}
        >
          <X size={18} />
        </button>
        <button
          className="new-roadmap primary"
          onClick={() => {
            navigate("discover");
            setQuery("");
          }}
        >
          <Plus size={17} /> New roadmap
        </button>
        <div className="nav-heading">YOUR DIRECTION</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ id, label, Icon }) => (
            <button
              key={id}
              aria-current={view === id ? "page" : undefined}
              className={`nav-item ${view === id ? "active" : ""}`}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              {label}
              {id === "roadmap" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-lower">
          <div className="nav-heading">SYRKA APPS</div>
          <a
            className="nav-item"
            href="https://www.syrka.co/cam"
            target="_blank"
            rel="noreferrer"
          >
            <GraduationCap size={18} />
            Campus
            <ArrowUpRight size={14} />
          </a>
          <a
            className="nav-item"
            href="https://www.syrka.co/workspace"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpen size={18} />
            Workspace
            <ArrowUpRight size={14} />
          </a>
          <div className="sidebar-note">
            <Compass size={21} />
            <strong>Your future, one step at a time.</strong>
            <p>Explore the possibilities. Find your direction.</p>
          </div>
          <div className="profile">
            <span className="avatar">
              {state.profile.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{state.profile.name}</strong>
              <small>
                {state.profile.fictional
                  ? "Fictional demo profile"
                  : "Local imported profile"}
              </small>
            </div>
            <ShieldCheck size={17} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <button
            className="mobile-menu icon-button"
            aria-label="Open navigation"
            onClick={() => setMobile(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            Roadmaps <ChevronRight size={13} />
            <strong>{navigation.find((n) => n.id === view)?.label}</strong>
          </div>
          <div className="topbar-right">
            <span className="demo-pill">
              <span />
              {state.profile.fictional ? "Demo workspace" : "Local workspace"}
            </span>
            <button
              className="icon-button"
              aria-label="Export workspace"
              title="Export workspace"
              onClick={() => exportFile(state, "syrka-roadmap.json")}
            >
              <Download size={17} />
            </button>
            <Link href="/sign-in" className="sign-in-link">
              Sign in
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </header>
        <main
          id="main"
          className={view === "roadmap" ? "roadmap-main" : "page-content"}
        >
          <div className="workspace-notice">
            <Info size={14} />
            {state.profile.fictional
              ? "A place to explore. This demo uses a fictional profile and ESCO occupational references and locally authored learning pathways."
              : "Your imported data stays in this browser. Issuer claims have not been authenticated."}
            <button onClick={() => setImportOpen(true)}>
              Import Passport
              <Upload size={13} />
            </button>
          </div>
          {view === "home" && (
            <>
              <div className="welcome">
                <span className="eyebrow">
                  A LITTLE CLARITY. A WORLD OF POSSIBILITY.
                </span>
                <h1>Where would you like to go?</h1>
                <p>
                  Your experience is a starting point. Let’s find what comes
                  next.
                </p>
                <form
                  className="destination-search"
                  onSubmit={(e) => {
                    e.preventDefault();
                    navigate("discover");
                  }}
                >
                  <Search size={21} />
                  <input
                    aria-label="Search career destinations"
                    placeholder="Try ‘product designer’ or explore a field…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <button
                    className="primary"
                    aria-label="Explore destinations"
                    type="submit"
                  >
                    <ArrowRight size={19} />
                  </button>
                </form>
                <div className="search-suggestions">
                  <span>A few directions to explore</span>
                  {destinations.map((d) => (
                    <button key={d.id} onClick={() => selectDestination(d.id)}>
                      {d.name}
                      <ArrowUpRight size={12} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="section-title">
                <h2>Your next chapter</h2>
                <button
                  className="text-button"
                  onClick={() => navigate("discover")}
                >
                  Explore all directions
                  <ArrowRight size={15} />
                </button>
              </div>
              <div className="home-grid">
                <button
                  className="continue-card"
                  onClick={() => navigate("roadmap")}
                >
                  <div className="card-top">
                    <span className="eyebrow">CONTINUE YOUR JOURNEY</span>
                    <span className="subtle-tag">Active roadmap</span>
                  </div>
                  <div className="mini-route" aria-hidden="true">
                    <span className="route-stop done">
                      <Check size={12} />
                    </span>
                    <i />
                    <span className="route-stop current" />
                    <i />
                    <span className="route-stop" />
                    <i />
                    <span className="route-stop destination">
                      <Flag size={12} />
                    </span>
                  </div>
                  <h3>{roadmap.destination.name}</h3>
                  <p>
                    {roadmap.destination.field} <span>·</span> A pathway built
                    around you
                  </p>
                  <div className="progress-line">
                    <span
                      style={{
                        width: `${(completed / (roadmap.matches.length + 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <div className="continue-bottom">
                    <span>
                      {completed} of {roadmap.matches.length + 1} milestones
                      completed
                    </span>
                    <span>
                      Open roadmap <ArrowRight size={16} />
                    </span>
                  </div>
                </button>
                <div className="capability-summary">
                  <div className="summary-icon">
                    <Layers3 size={23} />
                  </div>
                  <h3>
                    You’re bringing more
                    <br />
                    than you think.
                  </h3>
                  <p>
                    Every project, experience and new skill is part of your
                    story.
                  </p>
                  <div className="summary-numbers">
                    <div>
                      <strong>
                        {state.profile.evidence.filter((e) => e.consent).length}
                      </strong>
                      <span>evidence records</span>
                    </div>
                    <div>
                      <strong>
                        {
                          state.profile.evidence.filter(
                            (e) => e.verification === "document-supported",
                          ).length
                        }
                      </strong>
                      <span>document supported</span>
                    </div>
                  </div>
                  <button
                    className="text-button"
                    onClick={() => navigate("capabilities")}
                  >
                    Explore your capabilities
                    <ArrowRight size={15} />
                  </button>
                </div>
              </div>
              <div className="section-title">
                <h2>Find your own way</h2>
                <span className="muted">
                  There’s more than one route forward.
                </span>
              </div>
              <div className="feature-grid">
                {[
                  {
                    Icon: Compass,
                    title: "Discover a direction",
                    text: "Find careers connected to what you already know.",
                    action: "Explore careers",
                    view: "discover",
                  },
                  {
                    Icon: Map,
                    title: "See the possibilities",
                    text: "Compare what different destinations ask of you.",
                    action: "Compare paths",
                    view: "compare",
                  },
                  {
                    Icon: Upload,
                    title: "Bring your story",
                    text: "Start with an authorized Career Passport export.",
                    action: "Import your records",
                    view: "import",
                  },
                ].map(({ Icon, title, text, action, view: v }) => (
                  <button
                    className="feature-card"
                    key={v}
                    onClick={() =>
                      v === "import" ? setImportOpen(true) : navigate(v as View)
                    }
                  >
                    <Icon size={21} />
                    <h3>{title}</h3>
                    <p>{text}</p>
                    <span>
                      {action}
                      <ArrowRight size={14} />
                    </span>
                  </button>
                ))}
              </div>
              <footer className="page-footer">
                <Compass size={14} />
                <span>Built around evidence. Open to possibility.</span>
                <span>
                  Learning guidance, never a guarantee of admission or
                  employment.
                </span>
              </footer>
            </>
          )}
          {view === "roadmap" && (
            <>
              <div className="roadmap-heading">
                <div>
                  <span className="eyebrow">YOUR PATHWAY</span>
                  <h1>{roadmap.destination.name}</h1>
                  <p>From where you are to what comes next.</p>
                </div>
                <div className="heading-actions">
                  <button
                    className="secondary"
                    onClick={() => navigate("compare")}
                  >
                    <Map size={16} />
                    Compare
                  </button>
                  <button className="primary" onClick={save}>
                    <Check size={16} />
                    Save roadmap
                  </button>
                </div>
              </div>
              <div className="roadmap-meta">
                <span>
                  <Target size={14} />
                  {roadmap.matches.length} capabilities
                </span>
                <span>
                  <Clock3 size={14} />
                  {state.profile.hoursPerWeek} hours / week
                </span>
                <span>
                  <Check size={14} />
                  {completed} steps completed
                </span>
                <button onClick={() => navigate("capabilities")}>
                  <SlidersHorizontal size={14} />
                  Preferences
                </button>
              </div>
              <div
                className={`graph-workspace ${selected ? "has-details" : ""}`}
              >
                <RoadmapCanvas
                  roadmap={expandedRoadmap}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onExpand={onExpand}
                  expanded={state.expanded}
                />
                {selected && (
                  <NodeDetails
                    node={selected}
                    profile={state.profile}
                    onClose={() => setSelectedId(null)}
                    onStatus={onStatus}
                  />
                )}
              </div>
              <div className="graph-legend">
                <span>
                  <i className="legend-supported" />
                  Document supported
                </span>
                <span>
                  <i className="legend-progress" />
                  In progress
                </span>
                <span>
                  <i className="legend-gap" />
                  To explore
                </span>
                <span>
                  Completion is self-reported. Use details to inspect evidence.
                </span>
              </div>
              <details className="accessible-map">
                <summary>Accessible roadmap list & pathway explanation</summary>
                <p>{summarize(roadmap)}</p>
                {roadmap.nodes.map((n) => (
                  <div key={n.id}>
                    <button onClick={() => onSelect(n.id)}>
                      {n.title} — {statusLabels[n.status]}
                    </button>
                    {(n.skillId || n.requirementIds) && (
                      <button onClick={() => onExpand(n.id)}>
                        Toggle learning routes for {n.title}
                      </button>
                    )}
                  </div>
                ))}
              </details>
            </>
          )}
          {view === "discover" && (
            <>
              <PageHeading
                eyebrow="EXPLORE YOUR POSSIBILITIES"
                title="Find a direction that feels like you."
                text="Start with a field, a skill or a spark of curiosity."
              />
              <form
                className="destination-search compact-search"
                onSubmit={(e) => e.preventDefault()}
              >
                <Search size={20} />
                <input
                  aria-label="Filter destinations"
                  placeholder="Search careers, fields or skills"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    className="icon-button"
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                    type="button"
                  >
                    <X size={16} />
                  </button>
                )}
              </form>
              <p className="catalogue-note">
                Three demonstration destinations · Locally authored learning
                requirements, not formal occupational standards.
              </p>
              <div className="destination-grid">
                {filtered.map((d, i) => {
                  const r = generateRoadmap(state.profile, d.id);
                  const count = r.matches.filter(
                    (m) => m.status === "supported",
                  ).length;
                  return (
                    <article
                      className={`destination-card tone-${i}`}
                      key={d.id}
                    >
                      <span className="destination-icon">
                        {i === 0 ? (
                          <Compass />
                        ) : i === 1 ? (
                          <GitBranch />
                        ) : (
                          <Layers3 />
                        )}
                      </span>
                      <span className="eyebrow">{d.field}</span>
                      <h2>{d.name}</h2>
                      <p>{d.description}</p>
                      <div className="skill-chips">
                        {d.skills.slice(0, 3).map((id) => (
                          <span key={id}>{skillById[id].name}</span>
                        ))}
                      </div>
                      <p className="small">
                        ESCO reference:{" "}
                        {
                          esco.occupations.find((o) => o.destinationId === d.id)
                            ?.label
                        }
                        . Occupational requirements are reviewed separately.
                      </p>
                      <div className="match-explanation">
                        <Info size={15} />
                        {count} of {r.matches.length} capabilities have document
                        support.{" "}
                        {count
                          ? "A useful starting point."
                          : "A fresh direction to explore."}
                      </div>
                      <button
                        className="primary"
                        onClick={() => selectDestination(d.id)}
                      >
                        Build this roadmap
                        <ArrowRight size={16} />
                      </button>
                    </article>
                  );
                })}
              </div>
              {!filtered.length && (
                <div className="empty-state">
                  <Search />
                  <h2>No destinations in this demo match yet.</h2>
                  <p>Try design, technology, data or a related skill.</p>
                  <button className="secondary" onClick={() => setQuery("")}>
                    Browse all destinations
                  </button>
                </div>
              )}
              <section className="info-strip">
                <ShieldCheck size={24} />
                <div>
                  <h3>Possibilities, grounded in evidence.</h3>
                  <p>
                    Suggestions use explicit capability relationships.
                    Similarity is never a probability of employment or
                    admission.
                  </p>
                </div>
              </section>
            </>
          )}
          {view === "capabilities" && (
            <>
              <PageHeading
                eyebrow="YOUR STARTING POINT"
                title="Your experience has a story."
                text="Keep what you know connected to the evidence behind it."
              />
              <div className="profile-banner">
                <span className="avatar large">{state.profile.name[0]}</span>
                <div>
                  <h2>{state.profile.name}</h2>
                  <p>{state.profile.headline}</p>
                  <span className="subtle-tag">
                    {state.profile.fictional
                      ? "Fictional demonstration records"
                      : "Local imported records · not issuer authenticated"}
                  </span>
                </div>
                <button
                  className="secondary"
                  onClick={() => setImportOpen(true)}
                >
                  <Upload size={16} />
                  Import records
                </button>
              </div>
              <section className="preferences-panel">
                <h3>
                  <SlidersHorizontal size={17} />
                  Your pace
                </h3>
                <label htmlFor="hours">Hours available each week</label>
                <input
                  id="hours"
                  type="number"
                  min="1"
                  max="80"
                  value={state.profile.hoursPerWeek}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (n >= 1 && n <= 80)
                      update({
                        profile: { ...state.profile, hoursPerWeek: n },
                      });
                  }}
                />
                <p>
                  Used for learning estimates. No cost, location or eligibility
                  assumptions are made.
                </p>
              </section>
              <div className="section-title">
                <h2>Capabilities & evidence</h2>
                <span className="muted">Verification is always explicit.</span>
              </div>
              <div className="evidence-grid">
                {state.profile.evidence.map((e) => (
                  <article className="evidence-card" key={e.id}>
                    <Layers3 size={21} />
                    <span className="status-chip">{e.verification}</span>
                    <h3>{skillById[e.skillId]?.name || e.skillId}</h3>
                    <p>{e.title}</p>
                    <dl>
                      <dt>Source</dt>
                      <dd>
                        {e.sourceSystem} / {e.sourceRecordId}
                      </dd>
                      <dt>Issuer</dt>
                      <dd>{e.issuer || "Not established"}</dd>
                      <dt>Evidence reference</dt>
                      <dd>{e.reference || "No reference supplied"}</dd>
                      <dt>Consent</dt>
                      <dd>
                        {e.consent
                          ? "Granted for local pathway use"
                          : "Not granted · excluded from matching"}
                      </dd>
                    </dl>
                  </article>
                ))}
              </div>
              <section className="info-strip">
                <ShieldCheck />
                <div>
                  <h3>Different evidence tells different stories.</h3>
                  <p>
                    Document support, personal claims and algorithmic inferences
                    are shown separately. No fictional record is verified by a
                    real institution.
                  </p>
                </div>
              </section>
              <div className="data-actions">
                <button
                  className="secondary"
                  onClick={() => exportFile(state, "syrka-roadmap.json")}
                >
                  <Download size={16} />
                  Export my workspace
                </button>
                <button
                  className="text-button"
                  onClick={() => setConfirmReset(true)}
                >
                  <RotateCcw size={15} />
                  Delete local data & reset demo
                </button>
              </div>
            </>
          )}
          {view === "compare" && (
            <>
              <PageHeading
                eyebrow="MORE THAN ONE WAY FORWARD"
                title="Compare your possibilities."
                text="Understand what each direction would ask of you."
              />
              <div className="compare-grid">
                {destinations.map((d) => {
                  const r = generateRoadmap(state.profile, d.id),
                    gaps = r.matches.filter((m) => m.status !== "supported");
                  return (
                    <article className="comparison-card" key={d.id}>
                      <span className="eyebrow">{d.field}</span>
                      <h2>{d.name}</h2>
                      <p>{d.description}</p>
                      <dl>
                        <dt>Supporting evidence</dt>
                        <dd>
                          {r.matches.length - gaps.length} of {r.matches.length}{" "}
                          capabilities
                        </dd>
                        <dt>Learning estimate for gaps</dt>
                        <dd>
                          {gaps.reduce((a, m) => a + m.skill.hours[0], 0)}–
                          {gaps.reduce((a, m) => a + m.skill.hours[1], 0)} hours
                        </dd>
                        <dt>Estimated pace</dt>
                        <dd>{state.profile.hoursPerWeek} hours/week</dd>
                        <dt>Costs</dt>
                        <dd>Not established. Check each resource.</dd>
                        <dt>Formal qualification</dt>
                        <dd>Not evaluated in this demo.</dd>
                      </dl>
                      <h3>Capabilities to develop or confirm</h3>
                      <ul className="compare-skills">
                        {gaps.map((m) => (
                          <li key={m.skill.id}>
                            <span>{m.skill.name}</span>
                            <small>{m.status}</small>
                          </li>
                        ))}
                      </ul>
                      <button
                        className="primary"
                        onClick={() => selectDestination(d.id)}
                      >
                        Choose this direction
                        <ArrowRight size={15} />
                      </button>
                    </article>
                  );
                })}
              </div>
              <p className="catalogue-note">
                Estimates are locally authored planning ranges. Alternative
                routes do not establish formal equivalence. No salaries, fees or
                outcome probabilities are inferred.
              </p>
            </>
          )}
          {view === "progress" && (
            <>
              <PageHeading
                eyebrow="EVERY STEP COUNTS"
                title="See how far you’ve come."
                text="Keep a record of the work that moves you forward."
              />
              <div className="stats-row">
                <Stat value={completed} label="completed on this path" />
                <Stat
                  value={
                    roadmap.nodes.filter((n) => n.status === "in-progress")
                      .length
                  }
                  label="steps in progress"
                />
                <Stat
                  value={roadmap.matches.length}
                  label="capabilities on this path"
                />
              </div>
              <div className="section-title">
                <h2>{roadmap.destination.name}</h2>
                <button
                  className="text-button"
                  onClick={() => navigate("roadmap")}
                >
                  View roadmap
                  <ArrowRight size={15} />
                </button>
              </div>
              <div className="progress-list">
                {roadmap.nodes
                  .filter((n) => ["capability", "milestone"].includes(n.kind))
                  .map((n) => (
                    <article key={n.id}>
                      <span
                        className={`progress-state ${n.status === "completed" ? "done" : ""}`}
                      >
                        {n.status === "completed" ? (
                          <Check size={19} />
                        ) : (
                          <Clock3 size={19} />
                        )}
                      </span>
                      <div>
                        <h3>{n.title}</h3>
                        <p>{statusLabels[n.status]}</p>
                      </div>
                      <button
                        className="secondary"
                        onClick={() =>
                          onStatus(
                            n.id,
                            n.status === "completed" ? "reset" : "completed",
                          )
                        }
                      >
                        {n.status === "completed"
                          ? "Undo completion"
                          : "Mark completed"}
                      </button>
                    </article>
                  ))}
              </div>
              <p className="catalogue-note">
                These milestones are self-reported. They do not change your
                evidence records or issue credentials.
              </p>
            </>
          )}
          {view === "opportunities" && (
            <>
              <PageHeading
                eyebrow="OPEN THE NEXT DOOR"
                title="Explore what could come next."
                text="Useful learning destinations, with their limits made clear."
              />
              <div className="info-strip">
                <Info />
                <div>
                  <h3>No live vacancy feed is connected.</h3>
                  <p>
                    These are public learning resources, not job listings,
                    scholarships or personalized eligibility decisions.
                    Availability and requirements must be checked at the source.
                  </p>
                </div>
              </div>
              <div className="destination-grid">
                {[
                  {
                    title: "Learn web development",
                    org: "MDN Web Docs",
                    url: "https://developer.mozilla.org/en-US/docs/Learn_web_development",
                    text: "A structured route through the foundations of the web.",
                  },
                  {
                    title: "Explore accessible design",
                    org: "W3C Web Accessibility Initiative",
                    url: "https://www.w3.org/WAI/fundamentals/",
                    text: "Understand the principles behind inclusive digital experiences.",
                  },
                  {
                    title: "Explore higher education",
                    org: "Study in Europe · European Commission",
                    url: "https://education.ec.europa.eu/study-in-europe",
                    text: "Research official country information and programme requirements.",
                  },
                ].map((o) => (
                  <article className="destination-card" key={o.url}>
                    <GraduationCap size={25} />
                    <span className="eyebrow">{o.org}</span>
                    <h2>{o.title}</h2>
                    <p>{o.text}</p>
                    <span className="status-chip">
                      Insufficient information for eligibility
                    </span>
                    <p className="small">
                      Live availability and requirements have not been verified.
                      No deadline, fee or qualification equivalence is asserted.
                    </p>
                    <a
                      className="secondary"
                      href={o.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Check official source
                      <ExternalLink size={14} />
                    </a>
                  </article>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
      {notice && (
        <div role="status" className="toast">
          <Check size={17} />
          <span>{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onImport={(profile) => {
            update({ profile, completed: [], inProgress: [], expanded: [] });
            setImportOpen(false);
            setNotice(
              "Passport imported locally. Verification claims require issuer authentication.",
            );
            navigate("capabilities");
          }}
          onRestore={(s) => {
            setState(s);
            setImportOpen(false);
            setNotice("Workspace restored locally.");
          }}
        />
      )}
      {confirmReset && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">Delete this browser’s workspace?</h2>
            <p>
              This removes imported data and all local progress, then restores
              the fictional demo. Export a backup first if you need it.
            </p>
            <div className="heading-actions">
              <button
                className="secondary"
                autoFocus
                onClick={() => setConfirmReset(false)}
              >
                Keep my workspace
              </button>
              <button
                className="primary"
                onClick={() => {
                  localStorage.removeItem(storageKey);
                  setState(initial);
                  setConfirmReset(false);
                  setNotice("Local data deleted. Fictional demo restored.");
                }}
              >
                Delete & reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function PageHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-heading">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
function ImportDialog({
  onClose,
  onImport,
  onRestore,
}: {
  onClose: () => void;
  onImport: (p: SavedState["profile"]) => void;
  onRestore: (s: SavedState) => void;
}) {
  const [error, setError] = useState(""),
    [consent, setConsent] = useState(false);
  useEffect(() => {
    const old = document.activeElement as HTMLElement;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      old?.focus();
    };
  }, [onClose]);
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-title"
        onKeyDown={(e) => {
          if (e.key === "Tab") {
            const list = Array.from(
              e.currentTarget.querySelectorAll<HTMLElement>(
                "button:not([disabled]), input:not([disabled]), a[href]",
              ),
            );
            const first = list[0],
              last = list[list.length - 1];
            if (e.shiftKey && document.activeElement === first) {
              e.preventDefault();
              last?.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
              e.preventDefault();
              first?.focus();
            }
          }
        }}
      >
        <div className="detail-top">
          <span className="eyebrow">BRING YOUR STORY</span>
          <button
            autoFocus
            className="icon-button"
            aria-label="Close import"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="import-title">Import your Career Passport</h2>
        <p>
          No live Passport connection is configured. Import an authorized JSON
          export using the documented v1 contract, or restore a workspace
          export. Files stay in your browser.
        </p>
        <label className="consent-check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          I’m authorized to use these records and consent to local processing.
        </label>
        <label className="file-input">
          Choose JSON file
          <input
            type="file"
            accept=".json,application/json"
            disabled={!consent}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 1024 * 1024) {
                setError("File is too large. Maximum size is 1 MB.");
                return;
              }
              try {
                const raw = await file.text();
                const restored = readState(raw);
                if (restored) {
                  const claims = restored.profile.evidence.some(
                    (x) =>
                      x.verification === "institution-verified" ||
                      x.verification === "employer-verified",
                  );
                  onRestore({
                    ...restored,
                    profile: {
                      ...restored.profile,
                      fictional: false,
                      evidence: restored.profile.evidence.map((x) => ({
                        ...x,
                        verification:
                          claims &&
                          (x.verification === "institution-verified" ||
                            x.verification === "employer-verified")
                            ? "document-supported"
                            : x.verification,
                      })),
                    },
                  });
                } else onImport(importPassport(JSON.parse(raw)));
              } catch {
                setError(
                  "The file does not match the v1 contract. Check skill IDs, consent, timestamps and required provenance fields.",
                );
              }
            }}
          />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button
          className="text-button"
          onClick={() =>
            exportFile(
              {
                version: 1,
                name: "Your name",
                headline: "Your starting point",
                hoursPerWeek: 6,
                consent: true,
                evidence: [],
              },
              "passport-v1-template.json",
            )
          }
        >
          <Download size={15} />
          Download empty import template
        </button>
        <p className="small">
          Uploaded verification claims are downgraded to document support until
          a trusted issuer connection exists. Use My capabilities to export or
          delete local data.
        </p>
      </div>
    </div>
  );
}
