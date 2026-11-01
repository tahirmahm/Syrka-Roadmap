"use client";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  Clock,
  Inbox,
  ListChecks,
  Target,
} from "lucide-react";
import type { JourneyAction, JourneyState } from "./schema";
import type { WorldGraph } from "../living/schema";
import { actionAvailability, rankActions, planWeek } from "./actions";
import { safeActionHref } from "./imports";
export function QuestDock({
  state,
  ownerId,
  graph,
  goals,
  onChange,
  onOpenAction,
  onSelectNode,
  onOpenInbox,
  now,
}: {
  state: JourneyState;
  ownerId: string;
  graph: WorldGraph | null;
  goals: string[];
  onChange: (state: JourneyState) => void;
  onOpenAction: (id: string) => void;
  onSelectNode: (id: string) => void;
  onOpenInbox: () => void;
  now?: string;
}) {
  const [tab, setTab] = useState<"today" | "week">("today"),
    [expanded, setExpanded] = useState(false);
  const clock = now || new Date().toISOString();
  const ranked = useMemo(
    () => rankActions(state.actions, clock, state.timezone, goals),
    [state.actions, clock, state.timezone, goals],
  );
  const week = useMemo(
    () => planWeek(state.actions, state.week, clock, state.timezone),
    [state.actions, state.week, clock, state.timezone],
  );
  if (state.ownerId !== ownerId) return null;
  const markStarted = (a: JourneyAction) => {
    if (a.kind === "task" && a.progress === "planned")
      onChange({
        ...state,
        actions: state.actions.map((x) =>
          x.id === a.id ? { ...x, progress: "working", updatedAt: clock } : x,
        ),
      });
  };
  const actionButton = (a: JourneyAction, primary = false) => {
    const href = safeActionHref(a),
      availability = actionAvailability(a, state.actions, clock);
    if (!availability.actionable)
      return (
        <button
          className={primary ? "primary" : "secondary"}
          disabled
          title={availability.reasons.join(" ")}
        >
          {a.progress === "submitted"
            ? "Awaiting review"
            : "Action currently unavailable"}
        </button>
      );
    return href ? (
      <a
        className={primary ? "primary" : "secondary"}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => markStarted(a)}
      >
        {a.work.label || a.verb}
        <ArrowUpRight size={14} />
      </a>
    ) : (
      <button
        className={primary ? "primary" : "secondary"}
        onClick={() => onOpenAction(a.id)}
      >
        {a.verb}
        <ArrowRight size={14} />
      </button>
    );
  };
  const main = ranked[0],
    alternatives = ranked.slice(1, expanded ? 8 : 3);
  return (
    <aside
      className={`journey-dock ${expanded ? "is-expanded" : ""}`}
      aria-label="Today and this week quest dock"
    >
      <header>
        <div
          className="journey-dock-tabs"
          role="tablist"
          aria-label="Action horizon"
        >
          <button
            role="tab"
            aria-selected={tab === "today"}
            onClick={() => setTab("today")}
          >
            <Target size={14} />
            Today
          </button>
          <button
            role="tab"
            aria-selected={tab === "week"}
            onClick={() => setTab("week")}
          >
            <CalendarDays size={14} />
            This week
          </button>
        </div>
        <button
          className="icon-button"
          aria-label="Open integration inbox"
          onClick={onOpenInbox}
        >
          <Inbox size={17} />
        </button>
        <button
          className="icon-button"
          aria-label={expanded ? "Collapse quest dock" : "Expand quest dock"}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <ChevronDown size={16} />
        </button>
      </header>
      {tab === "today" ? (
        <div className="journey-dock-content">
          {main ? (
            <>
              <div className="journey-next-action">
                <span className="journey-kicker">Your next action</span>
                <button
                  className="journey-action-title"
                  onClick={() => onOpenAction(main.action.id)}
                >
                  {main.action.title}
                </button>
                <p className="journey-action-reason">
                  {main.reasons[0] || main.action.reason}
                </p>
                <div className="journey-dock-meta">
                  <span>
                    {main.action.source.app}
                    {main.action.source.authority === "demo"
                      ? " · fictional"
                      : ""}
                  </span>
                  <span>{main.action.progress}</span>
                  {main.action.estimatedMinutes && (
                    <span>
                      <Clock size={11} />
                      {main.action.estimatedMinutes} min{" "}
                      {main.action.effortBasis === "estimate"
                        ? "estimated"
                        : "supplied"}
                    </span>
                  )}
                </div>
                {main.deadlineLabel && (
                  <p className="journey-deadline-label">{main.deadlineLabel}</p>
                )}
                <div className="journey-primary-row">
                  {actionButton(main.action, true)}
                  <button
                    className="text-button"
                    onClick={() =>
                      main.action.nodeIds[0]
                        ? onSelectNode(main.action.nodeIds[0])
                        : onOpenAction(main.action.id)
                    }
                  >
                    Why this matters
                  </button>
                </div>
              </div>
              {alternatives.length > 0 && (
                <div
                  className="journey-alternatives"
                  aria-label="Other available actions"
                >
                  {alternatives.map(({ action, reasons }) => (
                    <div key={action.id}>
                      <button
                        className="text-button journey-alternative-title"
                        onClick={() => onOpenAction(action.id)}
                      >
                        {action.title}
                      </button>
                      <span>{reasons[0] || action.category}</span>
                      {expanded && actionButton(action)}
                    </div>
                  ))}
                </div>
              )}
              {expanded && (
                <details className="journey-priority-rules">
                  <summary>Why this order?</summary>
                  <p>
                    Fixed commitments and known mandatory deadlines come before
                    optional development. Dependencies, supplied effort and your
                    priorities follow. Prestige never determines priority. No
                    missing date is invented.
                  </p>
                  {main.reasons.map((r, i) => (
                    <p key={i}>{r}</p>
                  ))}
                </details>
              )}
            </>
          ) : (
            <div className="journey-empty">
              <ListChecks size={21} />
              <strong>A small action is enough to begin.</strong>
              <p>
                Add an actual commitment or choose a project. You do not need a
                fixed career goal.
              </p>
              <button className="secondary" onClick={onOpenInbox}>
                Add my next action
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className="journey-dock-content journey-week"
          aria-label="Weekly workload plan"
        >
          <div className="journey-week-summary">
            <strong>{week.taskMinutes} min of proposed work</strong>
            <span>
              {week.fixedMinutes} min fixed commitments · {week.bufferMinutes}{" "}
              min buffer
            </span>
          </div>
          {week.overflowMinutes > 0 ? (
            <p className="journey-warning" role="status">
              This plan does not fit: {week.overflowMinutes} minutes exceed your
              budget. Reduce scope, change optional work or revise your
              available time; obligations have not been moved.
            </p>
          ) : (
            <p>
              {week.remainingMinutes} minutes remain in your stated planning
              budget.
            </p>
          )}
          {week.unknownEffort.length > 0 && (
            <p className="journey-warning">
              Some work has unknown effort. The plan cannot establish that all
              of it fits.
            </p>
          )}
          {week.conflicts.length > 0 && (
            <p className="journey-warning">
              Fixed commitments conflict. Review the source times before
              planning.
            </p>
          )}
          <label>
            Weekly available minutes
            <input
              aria-label="Weekly available minutes"
              type="number"
              min={0}
              max={10080}
              value={state.week.availableMinutes}
              onChange={(e) =>
                onChange({
                  ...state,
                  week: {
                    ...state.week,
                    availableMinutes: Math.max(
                      0,
                      Math.min(10080, Number(e.target.value) || 0),
                    ),
                  },
                })
              }
            />
          </label>
          <label>
            Weekly buffer minutes
            <input
              aria-label="Weekly buffer minutes"
              type="number"
              min={0}
              max={1440}
              value={state.week.bufferMinutes}
              onChange={(e) =>
                onChange({
                  ...state,
                  week: {
                    ...state.week,
                    bufferMinutes: Math.max(
                      0,
                      Math.min(1440, Number(e.target.value) || 0),
                    ),
                  },
                })
              }
            />
          </label>
          <p className="journey-fine">
            This is your planning budget, not a claim that your calendar is
            free. Existing obligations stay fixed.
          </p>
          {expanded && (
            <>
              <h3>Fixed commitments</h3>
              {week.fixed.map((a) => (
                <button
                  className="journey-week-row"
                  key={a.id}
                  onClick={() => onOpenAction(a.id)}
                >
                  {a.title}
                  <ArrowRight size={13} />
                </button>
              ))}
              <h3>Proposed work</h3>
              {week.selected.map((a) => (
                <button
                  className="journey-week-row"
                  key={a.id}
                  onClick={() => onOpenAction(a.id)}
                >
                  {a.title}
                  <ArrowRight size={13} />
                </button>
              ))}
              <p className="journey-fine">{week.notice}</p>
              <button className="secondary" onClick={onOpenInbox}>
                Review sources / Calendar export
              </button>
            </>
          )}
        </div>
      )}
      <footer>
        {goals.length ? (
          <span>
            <Target size={12} />
            {goals
              .map((id) => graph?.nodes.find((n) => n.id === id)?.label)
              .filter(Boolean)
              .slice(0, 2)
              .join(" · ") || `${goals.length} active goal(s)`}
          </span>
        ) : (
          <span>Explore freely. Your history stays with you.</span>
        )}
      </footer>
    </aside>
  );
}
