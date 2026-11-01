"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  FileText,
  Save,
  ShieldCheck,
  Target,
} from "lucide-react";
import type { WorldGraph } from "../living/schema";
import type { JourneyAction, JourneyState } from "./schema";

import { safeActionHref as actionHref } from "./imports";
export { safeActionHref as actionHref } from "./imports";
export function ActionSurface({
  actionId,
  state,
  ownerId,
  onChange,
  graph,
  onSelectNode,
  onReviewEvidence,
  now,
}: {
  actionId: string;
  state: JourneyState;
  ownerId: string;
  onChange: (state: JourneyState) => void;
  graph?: WorldGraph | null;
  onSelectNode?: (id: string) => void;
  onReviewEvidence?: (text: string) => void;
  now?: string;
}) {
  const [confirmSubmit, setConfirmSubmit] = useState(false),
    [confirmComplete, setConfirmComplete] = useState(false),
    [notice, setNotice] = useState("");
  const action =
    state.ownerId === ownerId
      ? state.actions.find(
          (a) => a.id === actionId && a.source.ownerId === ownerId,
        )
      : null;
  if (!action)
    return (
      <section className="journey-action-surface">
        <h2>Action unavailable</h2>
        <p>This action is not part of your current workspace.</p>
      </section>
    );
  const href = actionHref(action),
    revoked = !action.source.consent,
    cancelled = action.progress === "cancelled",
    workText = action.evidence.trim() || action.notes.trim(),
    reviewable =
      !!onReviewEvidence && !!workText && !revoked && !action.hypothetical;
  const update = (patch: Partial<JourneyAction>) =>
    onChange({
      ...state,
      actions: state.actions.map((a) =>
        a.id === action.id
          ? { ...a, ...patch, updatedAt: now || new Date().toISOString() }
          : a,
      ),
    });
  const due =
    action.deadline?.kind === "instant"
      ? `${new Date(action.deadline.at).toLocaleString(undefined, { timeZone: action.deadline.timezone })} (${action.deadline.timezone})`
      : action.deadline?.kind === "date"
        ? `${action.deadline.date} · all day in ${action.deadline.timezone}`
        : action.deadline?.kind === "unresolved"
          ? `${action.deadline.text} · date unresolved`
          : null;
  return (
    <section
      className="journey-action-surface"
      aria-label="Action work surface"
    >
      <span className="journey-kicker">
        <FileText size={15} /> Your action
      </span>
      <h2>{action.title}</h2>
      <div className="journey-state-line">
        <span>{action.progress.replaceAll("-", " ")}</span>
        <span>{action.category}</span>
        <span>{action.evidenceStatus}</span>
      </div>
      {due && <p className="journey-due">{due}</p>}
      {action.event && (
        <p className="journey-due">
          {action.event.kind === "timed"
            ? `${new Date(action.event.start).toLocaleString(undefined, { timeZone: action.event.timezone })} – ${new Date(action.event.end).toLocaleTimeString(undefined, { timeZone: action.event.timezone })}`
            : `${action.event.start} – ${action.event.end} (exclusive end)`}{" "}
          · {action.event.timezone}
        </p>
      )}
      {revoked && (
        <p role="status" className="journey-warning">
          Source consent is revoked. External navigation and progress changes
          are paused; your existing notes remain available.
        </p>
      )}
      {cancelled && (
        <p role="status" className="journey-warning">
          This source action was cancelled. It is kept in history.
        </p>
      )}
      {action.feasibility !== "actionable" && (
        <p className="journey-warning">
          Feasibility: {action.feasibility}. Review any dependencies before
          committing time.
        </p>
      )}
      {href && !cancelled && (
        <a
          className="primary journey-source-action"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {action.work.label || action.verb}
          <ArrowUpRight size={15} />
        </a>
      )}
      <p>
        {action.reason ||
          "This is a personal commitment. No career-skill relationship has been assumed."}
      </p>
      <label>
        Work notes / draft
        <textarea
          aria-label="Action work notes"
          rows={6}
          maxLength={3000}
          value={action.notes}
          onChange={(e) => update({ notes: e.target.value })}
          placeholder="Work here, keep an outline, or record what you have done."
        />
      </label>
      <p className="journey-fine">
        <Save size={13} /> Draft changes save with this workspace. A saved draft
        has not been submitted to another app.
      </p>
      <label>
        Evidence or artifact reference
        <textarea
          aria-label="Action evidence note"
          rows={3}
          maxLength={3000}
          value={action.evidence}
          onChange={(e) => update({ evidence: e.target.value })}
          placeholder="Describe or link the artifact and what it demonstrates. No uploaded attachment is published."
        />
      </label>
      <div className="journey-action-controls">
        <button
          className="secondary"
          disabled={revoked || cancelled || action.progress === "completed"}
          onClick={() => {
            update({ progress: "working" });
            setNotice(
              "Action is in progress. Your draft is private and no external write occurred.",
            );
          }}
        >
          Continue working
        </button>
        <button
          className="secondary"
          onClick={() =>
            setNotice(
              "Draft and artifact note are saved in this workspace. No submission or qualification was verified.",
            )
          }
        >
          <Save size={14} /> Save action draft
        </button>
      </div>
      {onReviewEvidence && (
        <section className="journey-work-evidence">
          <button
            className="secondary"
            disabled={!reviewable}
            onClick={() => {
              if (!reviewable) return;
              onReviewEvidence(`PROJECTS\n${action.title}\n${workText}`);
            }}
          >
            <ShieldCheck size={14} /> Review work as evidence
          </button>
          <p className="journey-fine">
            Offer your actual draft or artifact description to the existing
            claim-review workflow. A task title or completion checkbox alone is
            not supporting work; review does not verify a credential.
          </p>
        </section>
      )}
      <details className="journey-evidence-review">
        <summary>Record what happened</summary>
        <p>
          These are your reports. Roadmaps does not send the work or verify a
          credential.
        </p>
        {action.kind === "task" && (
          <>
            <label className="check-label">
              <input
                type="checkbox"
                checked={confirmSubmit}
                onChange={(e) => setConfirmSubmit(e.target.checked)}
              />
              I submitted this through the appropriate source or process.
            </label>
            <button
              className="secondary"
              disabled={revoked || cancelled || !confirmSubmit}
              onClick={() => {
                update({ progress: "submitted" });
                setNotice(
                  "Submission recorded as your report. No external delivery or assessment was confirmed.",
                );
              }}
            >
              Record submitted
            </button>
          </>
        )}
        <label className="check-label">
          <input
            type="checkbox"
            checked={confirmComplete}
            onChange={(e) => setConfirmComplete(e.target.checked)}
          />
          {action.kind === "event"
            ? "I attended or completed this commitment; elapsed time alone is not proof."
            : "I completed the action and have reviewed its completion criteria."}
        </label>
        <button
          className="secondary"
          disabled={revoked || cancelled || !confirmComplete}
          onClick={() => {
            update({ progress: "completed" });
            setNotice(
              "Completion recorded as self-reported activity. No capability mastery or credential was verified.",
            );
          }}
        >
          <Check size={14} />
          Record action complete
        </button>
      </details>
      {notice && (
        <p role="status" className="journey-inline-status">
          {notice}
        </p>
      )}
      <details className="journey-contribution">
        <summary>
          <Target size={14} /> What this contributes to
        </summary>
        {action.nodeIds.length ? (
          action.nodeIds.map((id) => (
            <button
              key={id}
              className="text-button"
              onClick={() => onSelectNode?.(id)}
            >
              {graph?.nodes.find((n) => n.id === id)?.label || id}
              <ArrowUpRight size={13} />
            </button>
          ))
        ) : (
          <p>
            This task is useful administration or a personal commitment. No
            capability relationship is asserted.
          </p>
        )}
      </details>
      <details className="journey-source-detail">
        <summary>
          <ShieldCheck size={14} /> Source and permissions
        </summary>
        <p>
          {action.source.app} · record {action.source.recordId} · version{" "}
          {action.source.version}
        </p>
        <p>
          {action.source.authority}. An imported label is not proof of
          institutional origin.
        </p>
        <p>
          Observed {new Date(action.source.observedAt).toLocaleString()}.
          Permissions: {action.source.permissions.join(", ") || "none"}.
        </p>
      </details>
    </section>
  );
}
