"use client";
import { useState } from "react";
import Link from "next/link";
import {
  Plus,
  Upload,
  Download,
  Trash2,
  BookOpen,
  ShieldCheck,
  Search,
  Cloud,
} from "lucide-react";
import type { Person, Workspace, Assertion } from "../types";
import { jsonRequest, downloadJSON } from "../client";
import { getSupabase } from "@/lib/supabase";
import { importWorkspace } from "../profile";
export function ProfilePanel({
  person,
  workspace,
  onChange,
  onDocument,
  onJSONImport,
  onReset,
  onRestore,
}: {
  person: Person;
  workspace: Workspace;
  onChange: (p: Person) => void;
  onDocument: (academic: boolean) => void;
  onJSONImport: () => void;
  onReset: () => void;
  onRestore: (w: Workspace) => void;
}) {
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<{ id: string; label: string }[]>([]),
    [claimText, setClaimText] = useState(""),
    [claimKind, setClaimKind] = useState<
      "employment" | "internship" | "project" | "qualification" | "education"
    >("project"),
    [notice, setNotice] = useState(""),
    [cloudConsent, setCloudConsent] = useState(false),
    [cloudBusy, setCloudBusy] = useState(false);
  const addSkill = (s: { id: string; label: string }) => {
    const assertion: Assertion = {
      id: crypto.randomUUID(),
      skillId: s.id,
      label: s.label,
      claimId: "user-entry",
      sourceSystem: "self-reported",
      sourceRecordId: crypto.randomUUID(),
      quote:
        "User-reported capability; supporting evidence has not been independently verified.",
      verification: "self-reported",
      consent: true,
    };
    onChange({ ...person, assertions: [...person.assertions, assertion] });
    setQuery("");
    setResults([]);
  };
  const cloudAction = async (action: "save" | "load" | "delete") => {
    const db = getSupabase();
    if (!db) return;
    setCloudBusy(true);
    try {
      const {
        data: { user },
        error,
      } = await db.auth.getUser();
      if (error || !user)
        throw new Error("Sign in to your Roadmaps account first.");
      if (action === "save") {
        const profile = await db
          .from("profiles")
          .upsert({ id: user.id, display_name: person.name });
        if (profile.error)
          throw new Error(
            "Profile backup failed. Check the dedicated Roadmaps database configuration.",
          );
        const r = await db.from("workspace_snapshots").upsert({
          owner_id: user.id,
          schema_version: 2,
          state: workspace,
          updated_at: new Date().toISOString(),
        });
        if (r.error)
          throw new Error(
            "Cloud backup is unavailable. Apply the Roadmaps 2.0 migration to the dedicated database.",
          );
        setNotice(
          "Saved a private account backup. The original CV file was not uploaded.",
        );
      } else if (action === "load") {
        const r = await db
          .from("workspace_snapshots")
          .select("state")
          .eq("owner_id", user.id)
          .maybeSingle();
        if (r.error || !r.data)
          throw new Error("No accessible cloud backup was found.");
        onRestore(importWorkspace(JSON.stringify(r.data.state)));
        setNotice(
          "Private backup restored. Issuer claims still require trusted verification.",
        );
      } else {
        const r = await db
          .from("workspace_snapshots")
          .delete()
          .eq("owner_id", user.id);
        if (r.error) throw new Error("Could not delete the cloud backup.");
        setNotice(
          "Private cloud backup deleted. This does not delete your account.",
        );
      }
    } catch (e) {
      setNotice((e as Error).message);
    } finally {
      setCloudBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">YOUR CAPABILITY IDENTITY</span>
        <h1>My profile</h1>
        <p>
          Your learning, experience and evidence — with their limits made
          visible.
        </p>
      </div>
      <div className="profile-banner">
        <span className="avatar large">{person.name[0]}</span>
        <div>
          <h2>{person.name}</h2>
          <p>{person.headline}</p>
          <span className="subtle-tag">
            {person.fictional
              ? "Fictional demonstration profile"
              : "User-controlled local profile"}
          </span>
        </div>
        <button className="primary" onClick={() => onDocument(false)}>
          <Upload size={16} />
          Add your CV
        </button>
      </div>
      <section className="profile-settings">
        <h2>Your direction & constraints</h2>
        <div className="form-grid">
          <label>
            Display name
            <input
              value={person.name}
              maxLength={150}
              onChange={(e) =>
                onChange({ ...person, name: e.target.value || "Your profile" })
              }
            />
          </label>
          <label>
            Professional / academic introduction
            <input
              value={person.headline}
              maxLength={500}
              onChange={(e) =>
                onChange({ ...person, headline: e.target.value })
              }
            />
          </label>
          <label>
            Interests (comma separated)
            <input
              value={person.interests.join(", ")}
              onChange={(e) =>
                onChange({
                  ...person,
                  interests: e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .slice(0, 30),
                })
              }
            />
          </label>
          <label>
            Location preferences (comma separated)
            <input
              value={person.locations.join(", ")}
              onChange={(e) =>
                onChange({
                  ...person,
                  locations: e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .slice(0, 20),
                })
              }
            />
          </label>
          <label>
            Languages (self-reported)
            <input
              value={person.languages.join(", ")}
              onChange={(e) =>
                onChange({
                  ...person,
                  languages: e.target.value
                    .split(",")
                    .map((x) => x.trim())
                    .filter(Boolean)
                    .slice(0, 30),
                })
              }
            />
          </label>
          <label>
            Hours available per week
            <input
              type="number"
              min="1"
              max="80"
              value={person.hoursPerWeek}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (n >= 1 && n <= 80) onChange({ ...person, hoursPerWeek: n });
              }}
            />
          </label>
          <label>
            Resource preference
            <select
              value={person.budget}
              onChange={(e) =>
                onChange({
                  ...person,
                  budget: e.target.value as Person["budget"],
                })
              }
            >
              <option value="free-resources">
                Prefer free learning materials
              </option>
              <option value="unspecified">No preference stated</option>
            </select>
          </label>
        </div>
        <p className="small">
          Occupation records do not include current vacancy locations, course
          fees or visa rules. Preferences are retained without inventing those
          facts.
        </p>
      </section>
      <div className="section-title">
        <h2>Academic learning & assessments</h2>
        <button className="secondary" onClick={() => onDocument(true)}>
          <BookOpen size={15} />
          Import coursework
        </button>
      </div>
      <p className="small">
        University → programme → course → documented outcome →
        assessment/evidence → capability. No course-title-only mastery
        inference.
      </p>
      <div className="course-grid">
        {person.courses.map((c) => (
          <article className="course-link" key={c.id}>
            <span className="eyebrow">{c.institution}</span>
            <h3>
              {c.code} · {c.title}
            </h3>
            <p>{c.programme}</p>
            <span className="status-chip">
              {c.status} · {c.verification}
            </span>
            {c.outcomes.map((o) => (
              <p key={o.id}>
                {o.text}
                <small>
                  {o.skillIds.length} explicit source-skill links · {o.quote}
                </small>
              </p>
            ))}
            <small>
              {c.sourceSystem} / {c.sourceRecordId}
            </small>
            <button
              className="text-button"
              onClick={() => {
                const record = c.sourceRecordId;
                onChange({
                  ...person,
                  courses: person.courses.filter((x) => x.id !== c.id),
                  assertions: person.assertions.filter(
                    (a) => a.sourceRecordId !== record,
                  ),
                });
              }}
            >
              Remove coursework & its capability assertions
            </button>
          </article>
        ))}
      </div>
      {!person.courses.length && (
        <div className="info-strip">
          <BookOpen />
          <p>
            No coursework imported yet. Import a syllabus or assessment summary,
            review the outcomes and confirm exact skill mappings.
          </p>
        </div>
      )}
      <div className="section-title">
        <h2>Capability assertions</h2>
        <span className="muted">
          {person.assertions.length} records · no automatic verification
        </span>
      </div>
      <div
        className="review-actions"
        aria-label="Capability selection controls"
      >
        <button
          className="secondary"
          onClick={() =>
            onChange({
              ...person,
              assertions: person.assertions.map((a) => ({
                ...a,
                selected: true,
              })),
            })
          }
        >
          Select All capabilities
        </button>
        <button
          className="secondary"
          onClick={() =>
            onChange({
              ...person,
              assertions: person.assertions.map((a) => ({
                ...a,
                selected: false,
              })),
            })
          }
        >
          Deselect All capabilities
        </button>
        <span>
          {person.assertions.filter((a) => a.selected !== false).length}{" "}
          selected for discovery
        </span>
      </div>
      <div className="manual-skill">
        <label className="search-control">
          <Search size={16} />
          <input
            aria-label="Find a skill to add manually"
            placeholder="Add a self-reported skill from the ontology"
            value={query}
            onChange={async (e) => {
              setQuery(e.target.value);
              if (e.target.value.length > 1) {
                const r = await jsonRequest<{
                  skills: { id: string; label: string }[];
                }>(
                  "/api/catalogue?mode=skills&q=" +
                    encodeURIComponent(e.target.value),
                );
                setResults(r.skills);
              } else setResults([]);
            }}
          />
        </label>
        {results.slice(0, 8).map((s) => (
          <button key={s.id} onClick={() => addSkill(s)}>
            {s.label}
            <Plus size={15} />
          </button>
        ))}
      </div>
      <div className="assertion-table">
        {person.assertions.map((a) => (
          <article key={a.id}>
            <div>
              <label className="inline-check">
                <input
                  type="checkbox"
                  aria-label={`Use ${a.label} for career discovery`}
                  checked={a.selected !== false}
                  onChange={(e) =>
                    onChange({
                      ...person,
                      assertions: person.assertions.map((x) =>
                        x.id === a.id
                          ? { ...x, selected: e.target.checked }
                          : x,
                      ),
                    })
                  }
                />
                <strong>{a.label}</strong>
              </label>
              <span className="status-chip">{a.verification}</span>
              <p>{a.quote}</p>
              <small>
                {a.sourceSystem} / {a.sourceRecordId}
                {a.page ? ` · page ${a.page}` : ""}
              </small>
            </div>
            <button
              className="icon-button"
              aria-label={`Remove ${a.label} assertion`}
              onClick={() =>
                onChange({
                  ...person,
                  assertions: person.assertions.filter((x) => x.id !== a.id),
                })
              }
            >
              <Trash2 size={15} />
            </button>
          </article>
        ))}
      </div>
      {!!person.imports?.length && (
        <section>
          <h2>Imported documents</h2>
          <p>
            Original files are not retained. New imports append reviewed
            records; existing records and edits are preserved.
          </p>
          {person.imports.map((d) => (
            <p key={d.id}>
              {d.name} · {d.claimCount} new claims · {d.methods.join(", ")}
            </p>
          ))}
        </section>
      )}
      <div className="section-title">
        <h2>Education, experience & projects</h2>
      </div>
      <div className="manual-claim">
        <label>
          Record category
          <select
            value={claimKind}
            onChange={(e) => setClaimKind(e.target.value as typeof claimKind)}
          >
            <option value="education">Education</option>
            <option value="qualification">Qualification</option>
            <option value="employment">Paid employment</option>
            <option value="internship">Internship</option>
            <option value="project">Project</option>
          </select>
        </label>
        <label>
          Record description
          <textarea
            value={claimText}
            onChange={(e) => setClaimText(e.target.value)}
            maxLength={2000}
          />
        </label>
        <button
          className="secondary"
          disabled={!claimText.trim()}
          onClick={() => {
            onChange({
              ...person,
              claims: [
                ...person.claims,
                {
                  id: crypto.randomUUID(),
                  kind: claimKind,
                  text: claimText,
                  quote: "Self-reported user entry.",
                  page: 1,
                  section: "User entry",
                  mappings: [],
                  approved: true,
                },
              ],
            });
            setClaimText("");
          }}
        >
          <Plus size={15} />
          Add self-reported record
        </button>
      </div>
      <div className="record-list">
        {person.claims
          .filter((c) => c.approved)
          .map((c) => (
            <article key={c.id}>
              <span className="subtle-tag">{c.kind}</span>
              <p>{c.text}</p>
              <details>
                <summary>Source reference</summary>
                <p>{c.quote}</p>
                <small>
                  Page {c.page} · {c.section}
                </small>
              </details>
              <button
                className="text-button"
                onClick={() =>
                  onChange({
                    ...person,
                    claims: person.claims.filter((x) => x.id !== c.id),
                    assertions: person.assertions.filter(
                      (a) => a.claimId !== c.id,
                    ),
                  })
                }
              >
                Remove record & linked assertions
              </button>
            </article>
          ))}
      </div>
      <section className="profile-settings">
        <h2>Career Passport & private backup</h2>
        <p>
          No live Passport API is assumed. Import an authorized versioned
          export; issuer verification is never established by a file upload.
        </p>
        <div className="data-actions">
          <button className="secondary" onClick={onJSONImport}>
            <Upload size={16} />
            Import Passport / backup
          </button>
          <button
            className="secondary"
            onClick={() =>
              downloadJSON(
                { schemaVersion: "syrka-capability/2", person, consent: true },
                "syrka-capability-passport.json",
              )
            }
          >
            <Download size={16} />
            Export capability profile
          </button>
          <button
            className="secondary"
            onClick={() =>
              downloadJSON(workspace, "syrka-roadmaps-workspace.json")
            }
          >
            <Download size={16} />
            Export all roadmaps
          </button>
        </div>
        <div className="privacy-note">
          <ShieldCheck size={18} />
          <p>
            Original documents are not retained. Accepted source quotes and
            claims remain in this browser until you delete them. Export files
            may contain personal information. A shared browser is not isolated
            multi-user storage.
          </p>
        </div>
        {getSupabase() ? (
          <div className="cloud-backup">
            <h3>
              <Cloud size={16} />
              Optional private account backup
            </h3>
            <label className="consent-check">
              <input
                type="checkbox"
                checked={cloudConsent}
                onChange={(e) => setCloudConsent(e.target.checked)}
              />
              I authorize saving or restoring my reviewed profile and roadmap
              state in my Roadmaps account. Source files are not uploaded.
            </label>
            <div className="data-actions">
              <button
                className="secondary"
                disabled={!cloudConsent || cloudBusy}
                onClick={() => void cloudAction("save")}
              >
                Save private backup
              </button>
              <button
                className="secondary"
                disabled={!cloudConsent || cloudBusy}
                onClick={() => void cloudAction("load")}
              >
                Restore private backup
              </button>
              <button
                className="text-button"
                disabled={!cloudConsent || cloudBusy}
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete only your private cloud backup? This cannot be undone.",
                    )
                  )
                    void cloudAction("delete");
                }}
              >
                Delete cloud backup
              </button>
              <Link href="/sign-in">Sign in</Link>
            </div>
            <p role="status">{notice}</p>
          </div>
        ) : (
          <p className="small">
            Cloud account backup is not configured. The local workspace,
            imports, export and deletion still work.
          </p>
        )}
        <button className="text-button danger" onClick={onReset}>
          <Trash2 size={15} />
          Delete local profile, imports & progress
        </button>
      </section>
    </>
  );
}
