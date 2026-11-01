"use client";
import dynamic from "next/dynamic";
import { useMobile, trapFocus } from "../hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Compass,
  GitBranch,
  Home,
  Layers3,
  Menu,
  Search,
  Upload,
  X,
  Check,
  Download,
  Trash2,
  Milestone,
  GraduationCap,
  GitCompareArrows,
  Bookmark,
  ShieldCheck,
  Plus,
} from "lucide-react";
import { Brand } from "@/components/brand";
import type { Workspace, Occupation, Person, PathRecord } from "../types";
import {
  emptyWorkspace,
  parseWorkspace,
  STORAGE_KEY,
  createDemo,
  emptyPerson,
  importWorkspace,
  personSchema,
  academicImport,
  courseworkAssertions,
} from "../profile";
import {
  getVocabulary,
  getOccupation,
  type OccupationBundle,
  jsonRequest,
  downloadJSON,
} from "../client";
import { buildRoadmap } from "../graph";
import { curriculumFor } from "../curricula";
import { Discovery, SavedRoadmaps } from "./discovery";
import { Explorer } from "./explorer";
const DocumentReview = dynamic(() =>
  import("./document-review").then((m) => m.DocumentReview),
);
import { AccountWorkspace } from "./account-workspace";
import { LivingRecords } from "@/living/records";
import { LivingTree } from "@/living/tree";
import { ThemeToggle } from "@/living/theme";
import { livingDemo, type DemoScenario } from "@/living/demos";
import { reconcileEvidence, reconcileAdvisoryLinks } from "@/living/node-state";
import { emptyNavigation } from "@/living/navigation";
import { ppeJourney } from "@/journey/fixtures";
import { emptyLiving } from "@/living/schema";
import { Overview } from "./overview";
import { ProfilePanel } from "./profile-panel";
import { Compare } from "./compare";
export type OdysseyView =
  | "tree"
  | "overview"
  | "home"
  | "discover"
  | "profile"
  | "roadmaps"
  | "roadmap"
  | "compare"
  | "progress"
  | "opportunities";
const nav = [
  { id: "home", label: "Living Tree", Icon: Home },
  { id: "profile", label: "My Capabilities", Icon: Layers3 },
  { id: "discover", label: "Explore Careers", Icon: Compass },
  { id: "roadmaps", label: "My Roadmaps", Icon: GitBranch },
  { id: "progress", label: "Progress", Icon: Milestone },
] as const;
const routeView = (view: string): OdysseyView =>
  view === "capabilities"
    ? "profile"
    : nav.some((n) => n.id === view) ||
        ["tree", "overview", "roadmap", "compare", "opportunities"].includes(
          view,
        )
      ? (view as OdysseyView)
      : "home";
export function OdysseyApp({ initialView = "home" }: { initialView?: string }) {
  const mobile = useMobile();

  const [storageKey, setStorageKey] = useState(STORAGE_KEY);
  const backupKey =
    storageKey === STORAGE_KEY
      ? "syrka-roadmaps:personal-backup"
      : storageKey + ":personal-backup";
  const [workspace, setWorkspace] = useState<Workspace>(() => emptyWorkspace()),
    [ready, setReady] = useState(false),
    [blocked, setBlocked] = useState(false),
    [view, setView] = useState<OdysseyView>(routeView(initialView)),
    [drawer, setDrawer] = useState(false),
    [notice, setNotice] = useState(""),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [bundle, setBundle] = useState<OccupationBundle | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [documentMode, setDocumentMode] = useState<"cv" | "academic" | null>(null),
    [evidenceDraft, setEvidenceDraft] = useState(""),
    [jsonOpen, setJsonOpen] = useState(false),
    [resetOpen, setResetOpen] = useState(false),
    [focusTopic, setFocusTopic] = useState<string | null>(null),
    [hasBackup, setHasBackup] = useState(false),
    [stats, setStats] = useState<{
      total: number;
      skillCount: number;
      coverage: string;
    } | null>(null);
  useEffect(() => {
    if (!drawer || !mobile) return;
    const before = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.querySelector<HTMLElement>(".sidebar .mobile-close")?.focus();
    return () => {
      document.body.style.overflow = old;
      before?.focus();
    };
  }, [drawer, mobile]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        setHasBackup(!!localStorage.getItem("syrka-roadmaps:personal-backup"));
        const raw = localStorage.getItem(STORAGE_KEY),
          legacy = localStorage.getItem("syrka-roadmaps:v1");
        if (raw || legacy) {
          const parsed = parseWorkspace(raw || legacy!);
          if (parsed) setWorkspace(parsed);
          else {
            setBlocked(true);
            setNotice(
              "Saved data could not be parsed. It has not been overwritten. Export a recovery copy or explicitly reset it.",
            );
          }
        }
      } catch {
        setBlocked(true);
        setNotice(
          "Browser storage is unavailable. Export your work before leaving.",
        );
      }
      setReady(true);
    }, 0);
    const pop = () =>
      setView(
        routeView(
          location.pathname.split("/").filter(Boolean).at(-1) || "home",
        ),
      );
    window.addEventListener("popstate", pop);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", pop);
    };
  }, []);
  useEffect(() => {
    queueMicrotask(() => {
      try {
        setHasBackup(!!localStorage.getItem(backupKey));
      } catch {
        setHasBackup(false);
      }
    });
  }, [backupKey]);
  useEffect(() => {
    if (!ready || blocked) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(workspace));
    } catch {
      queueMicrotask(() => {
        setBlocked(true);
        setNotice(
          "Storage is full or unavailable. Export your workspace to retain this session.",
        );
      });
    }
  }, [workspace, ready, blocked, storageKey]);
  useEffect(() => {
    void jsonRequest<{ total: number; skillCount: number; coverage: string }>(
      "/api/catalogue?limit=1",
    )
      .then(setStats)
      .catch(() => {});
  }, []);
  const path =
    workspace.paths.find((p) => p.id === workspace.activePathId) || null;
  useEffect(() => {
    if (!path || bundle?.occupation.id === path.occupationId) return;
    let live = true;
    getOccupation(path.occupationId)
      .then((b) => {
        if (live) setBundle(b);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [path, bundle]);
  const graph = useMemo(
    () =>
      bundle
        ? buildRoadmap(bundle.occupation, bundle.skills, bundle.related)
        : null,
    [bundle],
  );
  const commit = useCallback(
    (fn: (w: Workspace) => Workspace, event: string, recordId?: string) =>
      setWorkspace((w) => {
        const next = fn(w);
        return {
          ...next,
          audit: [
            ...next.audit,
            {
              event,
              at: new Date().toISOString(),
              ...(recordId ? { recordId } : {}),
            },
          ].slice(-500),
        };
      }),
    [],
  );
  const navigate = (v: OdysseyView) => {
    setView(v);
    setDrawer(false);
    setError("");
    const url =
      (process.env.NEXT_PUBLIC_BASE_PATH || "") + "/" + (v === "home" ? "" : v);
    if (location.pathname !== url) history.pushState(null, "", url);
    window.scrollTo({ top: 0 });
  };
  const discover = (q = "") => {
    setQuery(q);
    navigate("discover");
  };
  const selectOccupation = async (
    value: Occupation | string,
    topic?: string,
  ) => {
    setLoading(true);
    setError("");
    try {
      const b = await getOccupation(
        typeof value === "string" ? value : value.id,
      );
      setBundle(b);
      setFocusTopic(topic || null);
      commit(
        (w) => {
          const existing = w.paths.find(
            (p) => p.occupationId === b.occupation.id,
          );
          if (existing) return { ...w, activePathId: existing.id };
          const c = curriculumFor(b.occupation.label, b.occupation.aliases);
          const p: PathRecord = {
            id: crypto.randomUUID(),
            occupationId: b.occupation.id,
            title: b.occupation.label.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completed: [],
            working: [],
            expanded: [c?.families[0]?.id || "requirements"],
            routeChoices: {},
          };
          return { ...w, paths: [...w.paths, p], activePathId: p.id };
        },
        "roadmap.opened",
        b.occupation.id,
      );
      navigate("roadmap");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const updatePath = (patch: Partial<PathRecord>) =>
    commit(
      (w) => ({
        ...w,
        paths: w.paths.map((p) =>
          p.id === w.activePathId
            ? { ...p, ...patch, updatedAt: new Date().toISOString() }
            : p,
        ),
      }),
      "roadmap.updated",
      workspace.activePathId || undefined,
    );
  const progress = (id: string, status: "completed" | "working" | "reset") => {
    if (!path) return;
    updatePath({
      completed:
        status === "completed"
          ? [...new Set([...path.completed, id])]
          : path.completed.filter((x) => x !== id),
      working:
        status === "working"
          ? [...new Set([...path.working, id])]
          : path.working.filter((x) => x !== id),
    });
    setNotice(
      status === "completed"
        ? "Self-reported milestone saved. No capability or credential was verified."
        : status === "working"
          ? "Topic marked in progress."
          : "Topic progress reset.",
    );
  };
  const toggleSave = (id: string) =>
    commit(
      (w) => ({
        ...w,
        savedOccupations: w.savedOccupations.includes(id)
          ? w.savedOccupations.filter((x) => x !== id)
          : [...w.savedOccupations, id],
      }),
      "occupation.bookmarked",
      id,
    );
  const toggleCompare = (id: string) => {
    if (!workspace.compare.includes(id) && workspace.compare.length >= 4) {
      setNotice(
        "Compare up to four occupations. Remove one before adding another.",
      );
      return;
    }
    commit(
      (w) => ({
        ...w,
        compare: w.compare.includes(id)
          ? w.compare.filter((x) => x !== id)
          : [...w.compare, id],
      }),
      "comparison.updated",
    );
  };
  const loadDemo = async () => {
    setLoading(true);
    try {
      const vocab = await getVocabulary();
      if (
        !workspace.person.fictional &&
        (workspace.person.claims.length ||
          workspace.person.assertions.length ||
          workspace.person.courses.length)
      ) {
        localStorage.setItem(backupKey, JSON.stringify(workspace));
        setHasBackup(true);
      }
      commit(
        (w) => ({ ...emptyWorkspace(createDemo(vocab)), audit: w.audit }),
        "demo.loaded",
      );
      setNotice(
        "Fictional PPE student loaded. No real institutional verification is implied.",
      );
      discover("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const setPerson = (person: Person) =>
    commit(
      (w) => ({
        ...w,
        person: reconcileEvidence(person, w.person).person,
        ...(w.living?.advisoryRelationships
          ? {
              living: {
                ...w.living,
                advisoryRelationships: reconcileAdvisoryLinks(
                  w.living.advisoryRelationships,
                  person,
                  w.person,
                ),
              },
            }
          : {}),
      }),
      "profile.updated",
    );
  const onRestore = (w: Workspace) => {
    setWorkspace(w);
    setBlocked(false);
    setNotice("Workspace restored. Uploaded issuer claims remain unverified.");
  };
  const livingState = workspace.living || emptyLiving();
  const updateLiving = (patch: Partial<typeof livingState>) =>
    commit((w) => {
      const current = w.living || emptyLiving();
      const navigation =
        patch.navigation ||
        (patch.selected !== undefined ||
        patch.expanded !== undefined ||
        patch.view !== undefined
          ? {
              ...(current.navigation || emptyNavigation(current)),
              ...(patch.selected !== undefined
                ? { selected: patch.selected }
                : {}),
              ...(patch.expanded ? { expanded: patch.expanded } : {}),
              ...(patch.view ? { camera: patch.view } : {}),
            }
          : current.navigation);
      return {
        ...w,
        living: { ...current, ...patch, ...(navigation ? { navigation } : {}) },
      };
    }, "living.updated");
  const loadLivingDemo = async (scenario: DemoScenario) => {
    setLoading(true);
    try {
      if (
        !workspace.person.fictional &&
        (workspace.person.claims.length ||
          workspace.person.assertions.length ||
          workspace.paths.length)
      ) {
        localStorage.setItem(backupKey, JSON.stringify(workspace));
        setHasBackup(true);
      }
      const demo = livingDemo(await getVocabulary(), scenario);
      setWorkspace({
        ...demo,
        living: {
          ...demo.living!,
          theme: livingState.theme,
          ...(scenario.startsWith("ppe-")
            ? { journey: ppeJourney(demo.person.id) }
            : {}),
        },
      });
      setBundle(null);
      navigate("tree");
      setNotice(
        "Fictional demonstration loaded. Actual personal records are preserved in the backup.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  const saveNow = () => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(workspace));
      setNotice("Saved in this browser. Export a backup for portable storage.");
    } catch {
      setNotice("Cannot save in this browser. Use Export to retain your work.");
    }
  };
  return (
    <div
      data-workspace-ready={ready}
      className={`app-shell odyssey-shell ${["tree", "home"].includes(view) ? "immersive-shell" : ""}`}
    >
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {drawer && (
        <button
          className="drawer-backdrop"
          aria-label="Close navigation"
          onClick={() => setDrawer(false)}
        />
      )}
      <aside
        className={`sidebar ${drawer ? "is-open" : ""}`}
        aria-label="Syrka navigation"
        role={mobile && drawer ? "dialog" : undefined}
        aria-modal={mobile && drawer ? true : undefined}
        inert={(mobile || ["tree", "home"].includes(view)) && !drawer}
        onKeyDown={(e) => {
          if (mobile && drawer) {
            trapFocus(e);
            if (e.key === "Escape") setDrawer(false);
          }
        }}
      >
        <a
          className="brand"
          href={(process.env.NEXT_PUBLIC_BASE_PATH || "") + "/"}
        >
          <Brand />
          <span>
            SYRKA<span className="brand-suite">roadmaps</span>
          </span>
        </a>
        <button
          className="mobile-close icon-button"
          aria-label="Close navigation"
          onClick={() => setDrawer(false)}
        >
          <X size={18} />
        </button>
        <button className="new-roadmap primary" onClick={() => discover("")}>
          <Plus size={17} />
          New direction
        </button>
        <div className="nav-heading">YOUR POSSIBILITY SPACE</div>
        <nav aria-label="Main navigation">
          {nav.map(({ id, label, Icon }) => (
            <button
              key={id}
              className={`nav-item ${view === id || (id === "roadmaps" && view === "roadmap") || (id === "home" && view === "tree") ? "active" : ""}`}
              aria-current={view === id ? "page" : undefined}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-lower">
          <button className="nav-item" onClick={() => navigate("compare")}>
            <GitCompareArrows size={18} />
            Compare paths
          </button>
          <button
            className="nav-item"
            onClick={() => navigate("opportunities")}
          >
            <GraduationCap size={18} />
            Opportunities
          </button>
          <button className="nav-item" onClick={() => navigate("overview")}>
            <Home size={18} />
            Profile overview
          </button>
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
            <strong>A direction is a beginning.</strong>
            <p>Your evidence. Your choices. More than one way forward.</p>
          </div>
          <div className="profile">
            <span className="avatar">
              {workspace.person.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </span>
            <div>
              <strong>{workspace.person.name}</strong>
              <small>
                {workspace.person.fictional
                  ? "Fictional demo"
                  : "Local capability profile"}
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
            onClick={() => setDrawer(true)}
          >
            <Menu size={20} />
          </button>
          <div className="breadcrumb">
            Roadmaps <span>/</span>
            <strong>
              {view === "tree"
                ? "Living Career Tree"
                : view === "overview"
                  ? "Profile overview"
                  : view === "roadmap"
                    ? "Roadmap explorer"
                    : nav.find((n) => n.id === view)?.label ||
                      (view === "compare" ? "Compare paths" : "Opportunities")}
            </strong>
          </div>
          <div className="topbar-right">
            <ThemeToggle
              value={workspace.living?.theme}
              onChange={(theme) => updateLiving({ theme })}
            />
            <span className="demo-pill">
              <span />
              {workspace.person.fictional
                ? "Fictional demonstration"
                : "Private local workspace"}
            </span>
            <button
              className="icon-button"
              aria-label="Export workspace"
              onClick={() =>
                downloadJSON(workspace, "syrka-roadmaps-workspace.json")
              }
            >
              <Download size={17} />
            </button>
            <Link className="sign-in-link" href="/sign-in">
              Sign in
              <ArrowUpRight size={13} />
            </Link>
          </div>
        </header>
        <main
          id="main"
          inert={!ready}
          className={
            view === "roadmap" || view === "tree" || view === "home"
              ? "roadmap-main"
              : "page-content"
          }
        >
          <div className="workspace-notice">
            <ShieldCheck size={14} />
            {workspace.person.fictional
              ? "Fictional demonstration records. No real institution has verified this profile."
              : "Documents stay on your device. Only reviewed claims become part of your profile."}
            <button onClick={() => setJsonOpen(true)}>
              Career Passport
              <Upload size={13} />
            </button>
          </div>
          <AccountWorkspace
            workspace={workspace}
            onOpen={(ownerId, remote) => {
              const key = "syrka-roadmaps:account:" + ownerId;
              const cached = localStorage.getItem(key);
              setStorageKey(key);
              setWorkspace(
                remote ||
                  (cached && parseWorkspace(cached)) ||
                  emptyWorkspace(),
              );
              setBlocked(false);
            }}
            onLeave={() => {
              if (storageKey !== STORAGE_KEY)
                localStorage.removeItem(backupKey);
              setStorageKey(STORAGE_KEY);
              const guest = localStorage.getItem(STORAGE_KEY);
              setWorkspace(
                (guest && parseWorkspace(guest)) || emptyWorkspace(),
              );
              setBundle(null);
              navigate("home");
            }}
          />
          {loading && (
            <p className="inline-loading" role="status">
              Preparing your occupational context…
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {blocked && (
            <div className="error">
              Local persistence is paused to protect existing data.{" "}
              <button
                className="text-button"
                onClick={() =>
                  downloadJSON(
                    {
                      v2: localStorage.getItem(STORAGE_KEY),
                      v1: localStorage.getItem("syrka-roadmaps:v1"),
                    },
                    "syrka-storage-recovery.json",
                  )
                }
              >
                Export recovery copy
              </button>
            </div>
          )}
          {hasBackup && (
            <div className="personal-backup-banner">
              <span>Your personal workspace is preserved while exploring.</span>
              <button
                className="text-button"
                onClick={() => {
                  const raw = localStorage.getItem(backupKey);
                  const previous = raw && parseWorkspace(raw);
                  if (previous) {
                    onRestore(previous);
                    localStorage.removeItem(backupKey);
                    setHasBackup(false);
                    navigate("profile");
                  }
                }}
              >
                Restore personal workspace
              </button>
            </div>
          )}
          {(view === "home" || view === "tree") && (
            <LivingTree
              key={storageKey + ":" + workspace.person.id}
              workspace={workspace}
              onState={updateLiving}
              onUpload={() => {
                setEvidenceDraft("");
                setDocumentMode("cv");
              }}
              onReviewEvidence={(text) => {
                setEvidenceDraft(text);
                setDocumentMode("cv");
              }}
              onDiscover={discover}
              onDemo={(scenario) => void loadLivingDemo(scenario)}
              onLegacyDemo={() => void loadDemo()}
              onProfile={() => navigate("profile")}
              onOccupation={(id) => void selectOccupation(id)}
              onResume={() => navigate("roadmap")}
            />
          )}
          {view === "overview" &&
            (workspace.person.claims.length > 0 ||
              workspace.person.assertions.length > 0 ||
              workspace.person.interests.length > 0 ||
              workspace.paths.length > 0) && (
              <Overview
                workspace={workspace}
                onExplore={(query = "") => discover(query)}
                onProfile={() => navigate("profile")}
                onSelect={(o) => void selectOccupation(o)}
                onResume={() => navigate("roadmap")}
                onUpload={() => setDocumentMode("cv")}
              />
            )}
          {view === "overview" &&
            !workspace.person.claims.length &&
            !workspace.person.assertions.length &&
            !workspace.person.interests.length &&
            !workspace.paths.length && (
              <>
                {!!workspace.person.assertions.length && (
                  <section
                    className="cv-invitation"
                    aria-label="Saved capability profile"
                  >
                    <div>
                      <span className="eyebrow">WELCOME BACK</span>
                      <h2>{workspace.person.name}</h2>
                      <p>
                        {
                          workspace.person.assertions.filter(
                            (a) => a.selected !== false,
                          ).length
                        }{" "}
                        selected capabilities · {workspace.paths.length} saved
                        roadmaps. Your profile and progress are saved in this
                        browser.
                      </p>
                    </div>
                    <button className="primary" onClick={() => discover("")}>
                      Discover careers from my profile
                    </button>
                    <button
                      className="secondary"
                      onClick={() => navigate("profile")}
                    >
                      Refine my profile
                    </button>
                  </section>
                )}
                <div className="welcome od-welcome">
                  <span className="eyebrow">
                    FROM WHAT YOU KNOW TO WHAT COULD BE
                  </span>
                  <h1>Where would you like to go?</h1>
                  <p>
                    Explore your educational and professional possibilities —
                    grounded in evidence.
                  </p>
                  <form
                    className="destination-search"
                    onSubmit={(e) => {
                      e.preventDefault();
                      discover(search);
                    }}
                  >
                    <Search size={21} />
                    <input
                      aria-label="Search career destinations"
                      placeholder="Economist, AI engineer, teacher, policy analyst…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                    <button
                      className="primary"
                      aria-label="Explore destinations"
                    >
                      <ArrowRight size={18} />
                    </button>
                  </form>
                  <div className="search-suggestions">
                    <span>Start anywhere</span>
                    {[
                      "Economist",
                      "AI engineer",
                      "Product manager",
                      "Teacher",
                      "Diplomat",
                    ].map((q) => (
                      <button key={q} onClick={() => discover(q)}>
                        {q}
                        <ArrowUpRight size={12} />
                      </button>
                    ))}
                  </div>
                </div>
                <section className="cv-invitation">
                  <div className="cv-invitation-icon">
                    <Upload size={29} />
                  </div>
                  <div>
                    <span className="eyebrow">
                      YOUR EXPERIENCE IS A STARTING POINT
                    </span>
                    <h2>
                      {workspace.person.imports?.length
                        ? "Update your CV as your experience grows."
                        : "Add your CV to discover your possibilities."}
                    </h2>
                    <p>
                      Extract your education, experience and skills. Review the
                      claims, then explore the occupational landscape.
                    </p>
                    <div className="cv-meta">
                      <span>PDF & DOCX text extraction</span>
                      <span>Scans & images with local OCR</span>
                      <span>Capabilities selected automatically</span>
                    </div>
                  </div>
                  <button
                    className="primary"
                    aria-label="Add your CV"
                    onClick={() => setDocumentMode("cv")}
                  >
                    <Upload size={17} />
                    {workspace.person.imports?.length
                      ? "Update CV"
                      : "Add your CV"}
                  </button>
                </section>
                <div className="home-entry-grid">
                  <button
                    className="feature-card"
                    onClick={() => setJsonOpen(true)}
                  >
                    <ShieldCheck size={22} />
                    <h3>Bring your Career Passport</h3>
                    <p>
                      Import an authorized versioned capability export. No
                      private portfolio scraping.
                    </p>
                    <span>
                      Connect your records
                      <ArrowRight size={14} />
                    </span>
                  </button>
                  <button
                    className="feature-card"
                    onClick={() => navigate("profile")}
                  >
                    <Compass size={22} />
                    <h3>Explore manually</h3>
                    <p>
                      Add interests, education and self-reported skills. No CV
                      required.
                    </p>
                    <span>
                      Start with your profile
                      <ArrowRight size={14} />
                    </span>
                  </button>
                  <button
                    className="feature-card"
                    aria-label="Load fictional demonstration"
                    disabled={loading}
                    onClick={() => void loadDemo()}
                  >
                    <BookOpen size={22} />
                    <h3>Explore a meaningful demo</h3>
                    <p>
                      A fictional PPE student, eight courses, assessments,
                      research and internship evidence.
                    </p>
                    <span>
                      Load fictional demonstration
                      <ArrowRight size={14} />
                    </span>
                  </button>
                </div>
                <div className="section-title">
                  <h2>Your next chapter</h2>
                  <button
                    className="text-button"
                    onClick={() => navigate("roadmaps")}
                  >
                    All saved roadmaps
                    <ArrowRight size={14} />
                  </button>
                </div>
                {workspace.paths.length ? (
                  <div className="recent-paths">
                    {workspace.paths
                      .slice(-3)
                      .reverse()
                      .map((p) => (
                        <button
                          key={p.id}
                          onClick={() => {
                            commit(
                              (w) => ({ ...w, activePathId: p.id }),
                              "roadmap.resumed",
                              p.id,
                            );
                            navigate("roadmap");
                          }}
                        >
                          <span className="eyebrow">
                            CONTINUE YOUR DIRECTION
                          </span>
                          <strong>{p.title}</strong>
                          <span>
                            {p.completed.length} self-reported milestones
                            <ArrowRight size={16} />
                          </span>
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="empty-path">
                    <GitBranch size={22} />
                    <div>
                      <h3>Your roadmap starts with a destination.</h3>
                      <p>
                        Browse the complete catalogue, or use your profile to
                        discover dozens of related directions.
                      </p>
                    </div>
                    <button className="secondary" onClick={() => discover("")}>
                      Explore occupations
                    </button>
                  </div>
                )}
                <div className="catalogue-summary">
                  <span>
                    <strong>{stats?.total.toLocaleString() || "3,039"}</strong>
                    source-defined occupations
                  </span>
                  <span>
                    <strong>
                      {stats?.skillCount.toLocaleString() || "13,939"}
                    </strong>
                    skill concepts
                  </span>
                  <span>
                    <strong>Evidence first</strong>no hiring-probability scores
                  </span>
                </div>
                <p className="catalogue-note">
                  European Commission ESCO · English mirrored snapshot with
                  preserved source identifiers. Not asserted to be the latest
                  official release. Academic, credential and legal eligibility
                  remain separate from capability similarity.
                </p>
              </>
            )}
          {view === "discover" && (
            <Discovery
              key={
                query +
                ":" +
                (workspace.person.imports?.at(-1)?.id || workspace.person.id)
              }
              initialQuery={query}
              person={workspace.person}
              saved={workspace.savedOccupations}
              compare={workspace.compare}
              onSave={toggleSave}
              onCompare={toggleCompare}
              onSelect={(o) => void selectOccupation(o)}
            />
          )}
          {view === "profile" && (
            <ProfilePanel
              person={workspace.person}
              workspace={workspace}
              onChange={setPerson}
              onDocument={(academic) =>
                setDocumentMode(academic ? "academic" : "cv")
              }
              onJSONImport={() => setJsonOpen(true)}
              onReset={() => setResetOpen(true)}
              onRestore={onRestore}
            />
          )}
          {view === "roadmaps" && (
            <>
              <SavedRoadmaps
                workspace={workspace}
                onSelect={(id) => {
                  commit(
                    (w) => ({ ...w, activePathId: id }),
                    "roadmap.resumed",
                    id,
                  );
                  navigate("roadmap");
                }}
                onDiscover={() => discover("")}
              />
              <LivingRecords
                key={storageKey}
                workspace={workspace}
                mode="goals"
                onOpen={(id) => {
                  updateLiving({
                    selected: id,
                    expanded: [...new Set([...livingState.expanded, id])],
                  });
                  navigate("tree");
                }}
              />
              {workspace.savedOccupations.length > 0 && (
                <section className="profile-settings">
                  <h2>Saved for later</h2>
                  <SavedOccupations
                    ids={workspace.savedOccupations}
                    onSelect={(id) => void selectOccupation(id)}
                    onRemove={toggleSave}
                  />
                </section>
              )}
            </>
          )}
          {view === "roadmap" &&
            (path && graph && path.occupationId === graph.occupation.id ? (
              <>
                <div className="roadmap-save">
                  <button
                    className="secondary"
                    onClick={() => navigate("compare")}
                  >
                    <GitCompareArrows size={15} />
                    Compare paths
                  </button>
                  <button className="primary" onClick={saveNow}>
                    <Check size={15} />
                    Save roadmap
                  </button>
                </div>
                <Explorer
                  key={path.id + ":" + focusTopic}
                  graph={graph}
                  person={workspace.person}
                  path={path}
                  onPath={updatePath}
                  onProgress={progress}
                  onSelectOccupation={(id) => void selectOccupation(id)}
                  onDiscover={discover}
                  initialTopic={focusTopic}
                />
              </>
            ) : (
              <div className="empty-state">
                <GitBranch />
                <h1>Choose a direction to explore.</h1>
                <p>
                  Every occupation has its own source requirements. Rich curated
                  pathways are available for AI, policy/economics and product
                  strategy.
                </p>
                <button className="primary" onClick={() => discover("")}>
                  Find a destination
                </button>
              </div>
            ))}
          {view === "compare" && (
            <Compare
              ids={workspace.compare}
              person={workspace.person}
              onRemove={toggleCompare}
              onSelect={(id, topic) => void selectOccupation(id, topic)}
              onDiscover={() => discover("")}
            />
          )}
          {view === "progress" && (
            <>
              <div className="page-heading">
                <span className="eyebrow">PROGRESS WITH PROVENANCE</span>
                <h1>My progress</h1>
                <p>
                  Learning milestones, coursework and capability evidence are
                  separate records.
                </p>
              </div>
              <div className="stats-row">
                <div className="stat">
                  <strong>
                    {workspace.paths.reduce(
                      (n, p) => n + p.completed.length,
                      0,
                    ) +
                      (workspace.living?.progress.filter(
                        (p) => p.status === "completed",
                      ).length || 0)}
                  </strong>
                  <span>self-reported completions</span>
                </div>
                <div className="stat">
                  <strong>{workspace.person.courses.length}</strong>
                  <span>coursework records</span>
                </div>
                <div className="stat">
                  <strong>{workspace.person.assertions.length}</strong>
                  <span>capability assertions</span>
                </div>
              </div>
              <LivingRecords
                key={storageKey}
                workspace={workspace}
                mode="progress"
                onOpen={(id) => {
                  updateLiving({
                    selected: id,
                    expanded: [...new Set([...livingState.expanded, id])],
                  });
                  navigate("tree");
                }}
              />
              {workspace.paths.map((p) => (
                <section className="progress-path" key={p.id}>
                  <div className="section-title">
                    <h2>{p.title}</h2>
                    <button
                      className="text-button"
                      onClick={() => {
                        commit(
                          (w) => ({ ...w, activePathId: p.id }),
                          "roadmap.resumed",
                          p.id,
                        );
                        navigate("roadmap");
                      }}
                    >
                      Open roadmap
                      <ArrowRight size={14} />
                    </button>
                  </div>
                  <p>
                    {p.completed.length} completed · {p.working.length} in
                    progress. Formal readiness is not inferred.
                  </p>
                  {p.completed.map((id) => (
                    <div className="progress-milestone" key={id}>
                      <Check size={16} />
                      <span>
                        {graph?.topics.find((t) => t.id === id)?.label ||
                          id.replace("topic:", "").replaceAll("-", " ")}
                      </span>
                      <span className="status-chip">Self-reported</span>
                      <button
                        className="text-button"
                        onClick={() =>
                          commit(
                            (w) => ({
                              ...w,
                              paths: w.paths.map((x) =>
                                x.id === p.id
                                  ? {
                                      ...x,
                                      completed: x.completed.filter(
                                        (t) => t !== id,
                                      ),
                                    }
                                  : x,
                              ),
                            }),
                            "milestone.reset",
                            id,
                          )
                        }
                      >
                        Undo completion
                      </button>
                    </div>
                  ))}
                </section>
              ))}
              <section className="info-strip">
                <ShieldCheck />
                <div>
                  <h3>Completing a topic does not verify a qualification.</h3>
                  <p>
                    Gaps only gain evidence when a relevant claim, project or
                    assessment is linked. Source records and Passport
                    projections are never silently modified.
                  </p>
                </div>
              </section>
              <details className="audit-log">
                <summary>
                  Local activity log ({workspace.audit.length} events)
                </summary>
                {workspace.audit
                  .slice(-25)
                  .reverse()
                  .map((a, i) => (
                    <p key={i}>
                      {a.event} · {new Date(a.at).toLocaleString("en-GB")}
                    </p>
                  ))}
              </details>
            </>
          )}
          {view === "opportunities" && (
            <>
              <div className="page-heading">
                <span className="eyebrow">CONNECT LEARNING TO THE WORLD</span>
                <h1>Opportunities & further education</h1>
                <p>
                  Official discovery routes, with no invented vacancies or
                  eligibility claims.
                </p>
              </div>
              <div className="info-strip">
                <Compass />
                <div>
                  <h3>No live vacancy or admissions feed is connected.</h3>
                  <p>
                    Your location preferences:{" "}
                    {workspace.person.locations.join(", ") || "not stated"}.
                    Source availability, fees, deadlines, visa rules and
                    requirements must be checked with the issuing organization.
                  </p>
                </div>
              </div>
              <div className="opportunity-routes">
                {[
                  {
                    title: "Jobs & mobility in Europe",
                    org: "EURES · European Commission",
                    url: "https://eures.europa.eu/jobseekers_en",
                    text: "Search official employment and mobility information. Occupational similarity does not establish work authorization.",
                  },
                  {
                    title: "Research careers & opportunities",
                    org: "EURAXESS",
                    url: "https://euraxess.ec.europa.eu/jobs",
                    text: "Explore research roles and funding. Check each source listing and its formal requirements.",
                  },
                  {
                    title: "University study in Europe",
                    org: "European Commission",
                    url: "https://education.ec.europa.eu/study-in-europe",
                    text: "Research country and programme information. Admissions, fees and scholarships require official confirmation.",
                  },
                  {
                    title: "Open learning & further study",
                    org: "The Open University",
                    url: "https://www.open.edu/openlearn/",
                    text: "Explore public learning materials. An open resource is not the same as a formal qualification.",
                  },
                ].map((o) => (
                  <article key={o.url}>
                    <span className="eyebrow">{o.org}</span>
                    <h2>{o.title}</h2>
                    <p>{o.text}</p>
                    <span className="status-chip">
                      Discovery route · eligibility unknown
                    </span>
                    <p className="small">
                      Live source availability not verified in this release. No
                      vacancy, deadline or fee is asserted.
                    </p>
                    <a
                      className="secondary"
                      href={o.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Explore official source
                      <ArrowUpRight size={14} />
                    </a>
                  </article>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{notice}</span>
          <button aria-label="Dismiss message" onClick={() => setNotice("")}>
            <X size={15} />
          </button>
        </div>
      )}
      {documentMode && (
        <DocumentReview
          person={
            workspace.person.fictional && !evidenceDraft
              ? emptyPerson()
              : workspace.person
          }
          initialText={evidenceDraft}
          sourceLabel={
            evidenceDraft ? "User-authored work note.txt" : undefined
          }
          academic={documentMode === "academic"}
          onClose={() => {
            setDocumentMode(null);
            setEvidenceDraft("");
          }}
          onApprove={(person, id, next = "profile") => {
            commit(
              (w) =>
                w.person.fictional && !evidenceDraft
                  ? { ...emptyWorkspace(person), audit: w.audit }
                  : {
                      ...w,
                      person: reconcileEvidence(
                        evidenceDraft
                          ? {
                              ...person,
                              assertions: person.assertions.map((a) =>
                                w.person.assertions.some(
                                  (old) => old.id === a.id,
                                )
                                  ? a
                                  : {
                                      ...a,
                                      verification: "self-reported" as const,
                                    },
                              ),
                            }
                          : person,
                        w.person,
                      ).person,
                    },
              "document.review.confirmed",
              id,
            );
            setDocumentMode(null);
            setNotice(
              "Reviewed claims saved locally. No institutional verification was created.",
            );
            setQuery("");
            navigate(evidenceDraft ? "tree" : next);
            setEvidenceDraft("");
          }}
        />
      )}
      {jsonOpen && (
        <JSONImport
          onClose={() => setJsonOpen(false)}
          onWorkspace={(w) => {
            onRestore(w);
            setJsonOpen(false);
            navigate("profile");
          }}
          onPerson={(p) => {
            setPerson(p);
            setJsonOpen(false);
            navigate("profile");
          }}
          person={workspace.person}
        />
      )}
      {resetOpen && (
        <div className="modal-backdrop">
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-title"
          >
            <h2 id="reset-title">Delete this browser’s records?</h2>
            <p>
              This removes local profiles, reviewed document claims, roadmaps
              and progress, including the preserved v1 backup. It does not
              delete a separately saved cloud backup or account. Export first if
              you need a copy.
            </p>
            <div className="heading-actions">
              <button
                autoFocus
                className="secondary"
                onClick={() => setResetOpen(false)}
              >
                Keep my records
              </button>
              <button
                className="primary"
                onClick={() => {
                  localStorage.removeItem(STORAGE_KEY);
                  localStorage.removeItem("syrka-roadmaps:v1");
                  localStorage.removeItem(backupKey);
                  setHasBackup(false);
                  setWorkspace(emptyWorkspace());
                  setBlocked(false);
                  setResetOpen(false);
                  navigate("home");
                  setNotice(
                    "Local records deleted. Original document files were never retained.",
                  );
                }}
              >
                <Trash2 size={15} />
                Delete local records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
function SavedOccupations({
  ids,
  onSelect,
  onRemove,
}: {
  ids: string[];
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const [occupations, setOccupations] = useState<Occupation[]>([]);
  useEffect(() => {
    let live = true;
    Promise.all(ids.map(getOccupation))
      .then((x) => {
        if (live) setOccupations(x.map((b) => b.occupation));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [ids]);
  return (
    <div className="saved-occupation-list">
      {occupations.map((o) => (
        <div key={o.id}>
          <button className="text-button" onClick={() => onSelect(o.id)}>
            {o.label}
            <ArrowRight size={13} />
          </button>
          <button
            className="icon-button"
            aria-label={`Unsave ${o.label}`}
            onClick={() => onRemove(o.id)}
          >
            <Bookmark size={15} />
          </button>
        </div>
      ))}
    </div>
  );
}
function JSONImport({
  person,
  onClose,
  onWorkspace,
  onPerson,
}: {
  person: Person;
  onClose: () => void;
  onWorkspace: (w: Workspace) => void;
  onPerson: (p: Person) => void;
}) {
  const [consent, setConsent] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="modal-backdrop">
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="passport-title"
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
        }}
      >
        <div className="detail-top">
          <span className="eyebrow">AUTHORIZED CAPABILITY RECORDS</span>
          <button
            autoFocus
            className="icon-button"
            aria-label="Close Passport import"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
        <h2 id="passport-title">Connect Career Passport</h2>
        <p>
          No live cross-application API is configured. Import a versioned
          capability export, reviewed academic JSON or a Roadmaps workspace
          backup. Nothing is scraped from a public portfolio.
        </p>
        <label className="consent-check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          I am authorized to use these records and consent to local processing.
        </label>
        <label className="file-input">
          Choose authorized JSON
          <input
            type="file"
            accept=".json,application/json"
            disabled={!consent}
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 2 * 1024 * 1024) {
                setError("Maximum JSON import is 2 MB.");
                return;
              }
              try {
                const raw = await file.text(),
                  data = JSON.parse(raw);
                if (data.version === 2 || (data.version === 1 && data.profile))
                  onWorkspace(importWorkspace(raw));
                else if (
                  data.schemaVersion === "syrka-capability/2" &&
                  data.consent === true
                ) {
                  const p = personSchema.parse(data.person);
                  onPerson({
                    ...p,
                    fictional: false,
                    assertions: p.assertions.map((a) => ({
                      ...a,
                      verification: [
                        "institution-verified",
                        "employer-verified",
                      ].includes(a.verification)
                        ? "document-supported"
                        : a.verification,
                    })),
                  });
                } else if (data.version === 1 && data.courses) {
                  const courses = academicImport(data),
                    base = person.fictional ? emptyPerson() : person;
                  onPerson({
                    ...base,
                    courses: [...base.courses, ...courses],
                    assertions: [
                      ...base.assertions,
                      ...courseworkAssertions(courses),
                    ],
                  });
                } else throw new Error("Unsupported version");
              } catch {
                setError(
                  "Invalid or unsupported record format. Use the versioned capability or academic contract; issuer claims cannot establish verification.",
                );
              }
            }}
          />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button
          className="text-button"
          onClick={() =>
            downloadJSON(
              {
                schemaVersion: "syrka-capability/2",
                person: emptyPerson(),
                consent: true,
              },
              "capability-profile-template.json",
            )
          }
        >
          Download empty capability template
        </button>
        <button
          className="text-button"
          onClick={() =>
            downloadJSON(
              { version: 1, consent: true, courses: [] },
              "academic-import-template.json",
            )
          }
        >
          Download academic JSON template
        </button>
        <p className="small">
          Uploaded issuer claims are treated as unverified document support.
          Campus and Workspace retain their independent authorization
          boundaries.
        </p>
      </div>
    </div>
  );
}
