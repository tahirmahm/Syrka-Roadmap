"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Download,
  FileInput,
  Inbox,
  CalendarDays,
  Plus,
  RefreshCw,
  ShieldCheck,
  Unplug,
  X,
} from "lucide-react";
import type { JourneyState, JourneyAction } from "./schema";
import { journeyActionSchema, sourceApps } from "./schema";
import type { WorldGraph } from "../living/schema";
import {
  reviewJSON,
  reviewICS,
  acceptImport,
  revokeSourceConsent,
} from "./imports";
import { downloadJSON } from "../odyssey/client";
const apps = ["campus", "mail", "calendar", "sessions", "workspace"] as const;
export function IntegrationInbox({
  state,
  ownerId,
  onChange,
  graph,
  now,
}: {
  state: JourneyState;
  ownerId: string;
  onChange: (state: JourneyState) => void;
  graph?: WorldGraph | null;
  now?: string;
}) {
  const [text, setText] = useState(""),
    [format, setFormat] = useState<"json" | "ics">("json"),
    [consent, setConsent] = useState(false),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [title, setTitle] = useState(""),
    [verb, setVerb] = useState("Continue task"),
    [minutes, setMinutes] = useState(""),
    [date, setDate] = useState(""),
    [mandatory, setMandatory] = useState(false),
    [nodeId, setNodeId] = useState(""),
    [category, setCategory] =
      useState<JourneyAction["category"]>("preparation"),
    [proposalAction, setProposalAction] = useState(""),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [reviewCalendar, setReviewCalendar] = useState(false),
    [timezone, setTimezone] = useState(state.timezone);
  if (state.ownerId !== ownerId)
    return <p>Integration records are unavailable for this workspace.</p>;
  const clock = now || new Date().toISOString();
  const parse = () => {
    if (!consent) return;
    try {
      if (new TextEncoder().encode(text).byteLength > 1_000_000)
        throw new Error("Import exceeds the 1 MB limit.");
      const proposal =
        format === "ics"
          ? reviewICS(text, ownerId, state.timezone)
          : reviewJSON(text, ownerId);
      onChange({ ...state, inbox: [proposal, ...state.inbox].slice(0, 50) });
      setNotice(
        "Import is ready for review. No source connection or external write has been created.",
      );
    } catch (e) {
      setNotice((e as Error).message);
    }
  };
  const addManual = () => {
    try {
      const id = crypto.randomUUID();
      const action = journeyActionSchema.parse({
        id: "manual:" + id,
        title: title.trim(),
        verb: verb.trim(),
        kind: "task",
        category,
        source: {
          app: "manual",
          recordId: id,
          ownerId,
          tenantId: null,
          version: 1,
          observedAt: clock,
          permissions: ["read", "open", "draft"],
          consent: true,
          authority: "self-reported",
        },
        ...(date
          ? {
              deadline: {
                kind: "date",
                date,
                timezone: state.timezone,
                confirmed: true,
                authority: "user",
              },
            }
          : {}),
        ...(minutes
          ? { estimatedMinutes: Number(minutes), effortBasis: "supplied" }
          : {}),
        mandatory,
        nodeIds: nodeId ? [nodeId] : [],
        reason: nodeId
          ? "You associated this action with a graph node. The link remains self-reported."
          : "Personal action; no career-skill relationship has been assumed.",
        work: { kind: "local-note", label: verb.trim() },
        updatedAt: clock,
      });
      onChange({ ...state, actions: [...state.actions, action] });
      setTitle("");
      setMinutes("");
      setDate("");
      setNotice(
        "Personal action added. It is self-reported and ready to work on.",
      );
    } catch {
      setNotice(
        "Provide a task title, action label and valid optional effort/date.",
      );
    }
  };
  const pending = state.inbox.filter(
    (p) => p.status === "review-required" || p.status === "conflict",
  );
  const selected = state.actions.find(
    (a) =>
      a.id === proposalAction &&
      a.source.consent &&
      a.source.permissions.includes("read") &&
      a.source.permissions.includes("open") &&
      !a.sourceCancelled &&
      a.progress !== "cancelled",
  );
  return (
    <section className="journey-inbox" aria-label="Integration inbox">
      <span className="journey-kicker">
        <Inbox size={15} /> Your sources and actions
      </span>
      <h2>Integration inbox</h2>
      <p>
        Review authorised exports, add personal actions and inspect source
        updates. Imports do not establish an institutional connection.
      </p>
      <label>
        Your planning timezone
        <input
          aria-label="Journey planning timezone"
          value={timezone}
          maxLength={100}
          onChange={(e) => setTimezone(e.target.value)}
          onBlur={() => {
            try {
              new Intl.DateTimeFormat("en", { timeZone: timezone });
              onChange({ ...state, timezone });
              setReviewCalendar(false);
            } catch {
              setTimezone(state.timezone);
              setNotice("Use a valid IANA timezone, such as Europe/Prague.");
            }
          }}
        />
      </label>
      <div className="journey-connectors" aria-label="Source connection status">
        {sourceApps
          .filter(
            (app) =>
              apps.some((x) => x === app) ||
              state.connectorStates.some((c) => c.app === app),
          )
          .map((app) => {
            const c = state.connectorStates.find((c) => c.app === app);
            return (
              <div key={app}>
                <span>
                  <Unplug size={13} />
                  {app}
                </span>
                <strong>{c?.status || "disconnected"}</strong>
                {c?.lastObservedAt && (
                  <small>
                    Last observed {new Date(c.lastObservedAt).toLocaleString()}
                  </small>
                )}
                {c && c.status !== "revoked" && (
                  <button
                    className="text-button"
                    onClick={() => {
                      onChange(revokeSourceConsent(state, app, clock));
                      setNotice(
                        `${app} consent revoked. Source records remain in history; external actions are paused.`,
                      );
                    }}
                  >
                    Revoke {app} consent
                  </button>
                )}
              </div>
            );
          })}
      </div>
      <details open className="journey-import-review">
        <summary>
          <FileInput size={16} /> Import JSON or Calendar ICS
        </summary>
        <p className="journey-fine">
          JSON: syrka.actions/1, with this workspace owner, source
          record/version, permissions and consent. ICS dates remain fixed
          events; importing them does not prove attendance. Maximum 1 MB.
        </p>
        <label>
          Import format
          <select
            aria-label="Action import format"
            value={format}
            onChange={(e) => setFormat(e.target.value as "json" | "ics")}
          >
            <option value="json">Reviewed action JSON</option>
            <option value="ics">Calendar ICS</option>
          </select>
        </label>
        <label className="journey-file-input">
          Select action JSON or ICS
          <input
            aria-label="Select action JSON or ICS"
            type="file"
            accept=".json,.ics,application/json,text/calendar"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setBusy(true);
              try {
                if (file.size > 1_000_000)
                  throw new Error("Import exceeds the 1 MB limit.");
                setText(await file.text());
                setFormat(
                  file.name.toLowerCase().endsWith(".ics") ? "ics" : "json",
                );
                setNotice(
                  "File read locally. Review and consent before extracting candidate actions.",
                );
              } catch (e) {
                setNotice((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        <label>
          Source text
          <textarea
            aria-label="Action import text"
            rows={6}
            value={text}
            maxLength={1_000_000}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              '{"version":"syrka.actions/1","ownerId":"…","tenantId":null,"actions":[]}'
            }
          />
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
          />
          I am authorised to use this source export and consent to reviewing it
          in this workspace.
        </label>
        <button
          className="text-button"
          onClick={() =>
            downloadJSON(
              {
                version: "syrka.actions/1",
                ownerId,
                tenantId: null,
                actions: [],
              },
              "syrka-actions-template.json",
            )
          }
        >
          <Download size={13} />
          Download action JSON template
        </button>
        <button
          className="secondary"
          disabled={!consent || !text.trim() || busy}
          onClick={parse}
        >
          <FileInput size={14} />
          Review imported actions
        </button>
      </details>
      {notice && (
        <p role="status" className="journey-inline-status">
          {notice}
        </p>
      )}
      {pending.length > 0 && (
        <section
          className="journey-import-candidates"
          aria-label="Pending action imports"
        >
          <h3>Review before accepting</h3>
          {pending.map((p) => (
            <article key={p.id} className="journey-proposal">
              <div className="journey-proposal-heading">
                <strong>{p.actions.length} candidate action(s)</strong>
                <span>
                  {p.format} · {p.status}
                </span>
              </div>
              {p.warnings.map((w, i) => (
                <p className="journey-warning" key={i}>
                  {w}
                </p>
              ))}
              {p.actions.slice(0, 12).map((a) => (
                <div className="journey-candidate" key={a.id}>
                  <strong>{a.title}</strong>
                  <span>
                    {a.source.app} · record {a.source.recordId} · version{" "}
                    {a.source.version}
                  </span>
                  <span>
                    {a.progress} · {a.category} · {a.source.authority}
                  </span>
                  {a.deadline && (
                    <span>
                      Deadline{" "}
                      {a.deadline.kind === "instant"
                        ? a.deadline.at
                        : a.deadline.kind === "date"
                          ? `${a.deadline.date} (${a.deadline.timezone}, date only)`
                          : a.deadline.text + " (unresolved)"}
                    </span>
                  )}
                </div>
              ))}
              {p.actions.length > 12 && (
                <p>
                  {p.actions.length - 12} additional candidates are included in
                  this bounded import.
                </p>
              )}
              <div className="journey-action-controls">
                <button
                  className="secondary"
                  onClick={() => {
                    try {
                      const result = acceptImport(state, p, clock);
                      onChange(result.state);
                      setNotice(
                        `Reviewed import: ${result.added} added, ${result.updated} updated, ${result.duplicates} duplicates ignored.${result.conflicts.length ? " Conflicts retained for review: " + result.conflicts.join("; ") : ""}`,
                      );
                    } catch (e) {
                      setNotice((e as Error).message);
                    }
                  }}
                >
                  <Check size={14} />
                  Accept reviewed import
                </button>
                <button
                  className="text-button"
                  onClick={() =>
                    onChange({
                      ...state,
                      inbox: state.inbox.map((x) =>
                        x.id === p.id ? { ...x, status: "rejected" } : x,
                      ),
                    })
                  }
                >
                  <X size={14} />
                  Reject import
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      <details className="journey-manual-task">
        <summary>
          <Plus size={16} /> Add a personal action
        </summary>
        <label>
          Task title
          <input
            aria-label="Personal action title"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label>
          Primary action label
          <input
            aria-label="Personal action verb"
            value={verb}
            maxLength={80}
            onChange={(e) => setVerb(e.target.value)}
          />
        </label>
        <div className="journey-form-two">
          <label>
            Remaining effort (minutes)
            <input
              aria-label="Personal action effort minutes"
              type="number"
              min={1}
              max={10080}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
            />
          </label>
          <label>
            Due date (optional)
            <input
              aria-label="Personal action due date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <p className="journey-fine">
          A date-only deadline remains a local calendar date in {state.timezone}
          .
        </p>
        <label>
          Category
          <select
            aria-label="Personal action category"
            value={category}
            onChange={(e) =>
              setCategory(e.target.value as JourneyAction["category"])
            }
          >
            <option value="preparation">Personal preparation</option>
            <option value="administration">Necessary administration</option>
            <option value="commitment">Commitment</option>
            <option value="suggestion">Optional exploration</option>
          </select>
        </label>
        <label>
          Related graph node (optional)
          <select
            aria-label="Associate personal action with node"
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
          >
            <option value="">No asserted relationship</option>
            {graph?.nodes.slice(0, 300).map((n) => (
              <option key={n.id} value={n.id}>
                {n.label}
              </option>
            ))}
          </select>
        </label>
        <label className="check-label">
          <input
            type="checkbox"
            checked={mandatory}
            onChange={(e) => setMandatory(e.target.checked)}
          />
          This is mandatory work for me.
        </label>
        <button
          className="secondary"
          disabled={!title.trim() || !verb.trim()}
          onClick={addManual}
        >
          <Plus size={14} />
          Add personal action
        </button>
      </details>
      <details className="journey-calendar-export">
        <summary>
          <CalendarIcon /> Review a Calendar proposal
        </summary>
        <p>
          Prepare an import for Workspace Calendar. Export creates a proposal
          file only; Workspace requires its own review and approval before an
          event exists. No account token is forwarded.
        </p>
        <label>
          Action
          <select
            aria-label="Calendar proposal action"
            value={proposalAction}
            onChange={(e) => {
              setProposalAction(e.target.value);
              setReviewCalendar(false);
            }}
          >
            <option value="">Choose an action</option>
            {state.actions
              .filter((a) => a.source.consent && a.progress !== "cancelled")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
          </select>
        </label>
        <div className="journey-form-two">
          <label>
            Start (local)
            <input
              aria-label="Calendar proposal local start"
              type="datetime-local"
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                setReviewCalendar(false);
              }}
            />
          </label>
          <label>
            End (local)
            <input
              aria-label="Calendar proposal local end"
              type="datetime-local"
              value={end}
              onChange={(e) => {
                setEnd(e.target.value);
                setReviewCalendar(false);
              }}
            />
          </label>
        </div>
        <p>
          {state.timezone} · {selected?.title || "No action selected"}
        </p>
        <label className="check-label">
          <input
            type="checkbox"
            checked={reviewCalendar}
            onChange={(e) => setReviewCalendar(e.target.checked)}
          />
          I reviewed the action, local times and timezone. Export a pending
          proposal only.
        </label>
        <button
          className="secondary"
          disabled={
            !selected || !start || !end || end <= start || !reviewCalendar
          }
          onClick={async () => {
            if (!selected) return;
            const encoded = new TextEncoder().encode(
              JSON.stringify([
                ownerId,
                selected.id,
                start,
                end,
                state.timezone,
              ]),
            );
            const digest = await crypto.subtle.digest("SHA-256", encoded);
            const key =
              "roadmaps:calendar:" +
              Array.from(new Uint8Array(digest), (b) =>
                b.toString(16).padStart(2, "0"),
              ).join("");
            downloadJSON(
              {
                contract: "syrka.calendar-action.v1",
                source: "roadmaps",
                idempotency_key: key,
                issued_at: clock,
                requires_review: true,
                event: {
                  title: selected.title.slice(0, 180),
                  description:
                    `User-reviewed planning proposal from Roadmaps. ${selected.reason}`.slice(
                      0,
                      10000,
                    ),
                  start_local: start,
                  end_local: end,
                  time_zone: state.timezone,
                  category: selected.kind === "event" ? "meeting" : "training",
                  references:
                    selected.id.length <= 200
                      ? [
                          {
                            app: "roadmaps",
                            record_id: selected.id,
                            label: selected.title.slice(0, 200),
                          },
                        ]
                      : [],
                },
              },
              "syrka-calendar-proposal.json",
            );
            setNotice(
              "Calendar proposal exported. No event or live integration was created.",
            );
          }}
        >
          <Download size={14} />
          Export reviewed Calendar proposal
        </button>
        <a
          className="text-button"
          href="https://syrka.co/workspace/calendar"
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Workspace Calendar
          <ArrowUpRight size={13} />
        </a>
      </details>
      <details className="journey-import-history">
        <summary>
          <RefreshCw size={14} /> Import and correction history
        </summary>
        {state.inbox.length ? (
          state.inbox.map((p) => (
            <p key={p.id}>
              {p.format} · {p.status} ·{" "}
              {new Date(p.receivedAt).toLocaleString()} · {p.actions.length}{" "}
              source records
            </p>
          ))
        ) : (
          <p>No imports yet.</p>
        )}
      </details>
      <p className="journey-fine">
        <ShieldCheck size={13} /> Source apps remain authoritative. No live
        Campus, Mail, Sessions or Calendar connection is implied by a reviewed
        import.
      </p>
    </section>
  );
}
function CalendarIcon() {
  return <CalendarDays size={15} />;
}
