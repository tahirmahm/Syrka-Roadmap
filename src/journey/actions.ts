import type { WorldGraph } from "../living/schema";
import type { JourneyAction, WeekSettings } from "./schema";
export type RankedAction = {
  action: JourneyAction;
  reasons: string[];
  blockedBy: string[];
  bucket: string;
  deadlineLabel?: string;
};
export function dateInZone(at: Date | string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(at));
  const p = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${p("year")}-${p("month")}-${p("day")}`;
}
const dayNumber = (d: string) => Date.parse(d + "T12:00:00Z") / 86400000;
export function deadlineDistance(action: JourneyAction, now: Date | string) {
  const d = action.deadline;
  if (!d || d.kind === "unresolved") return null;
  return d.kind === "instant"
    ? (Date.parse(d.at) - new Date(now).getTime()) / 86400000
    : dayNumber(d.date) - dayNumber(dateInZone(now, d.timezone));
}
export function actionAvailability(
  action: JourneyAction,
  actions: JourneyAction[],
  now: Date | string,
): { actionable: boolean; blockedBy: string[]; reasons: string[] } {
  const byId = new Map(actions.map((a) => [a.id, a]));
  const blockedBy = action.dependsOn.filter(
    (id) => byId.get(id)?.progress !== "completed",
  );
  const reasons: string[] = [];
  const expired =
    action.kind === "event" &&
    !!action.event &&
    (action.event.kind === "timed"
      ? Date.parse(action.event.end) < new Date(now).getTime()
      : action.event.end <= dateInZone(now, action.event.timezone));
  if (!action.source.consent) reasons.push("Source permission was revoked.");
  if (!action.source.permissions.includes("read"))
    reasons.push("No permission to read this source.");
  if (action.progress === "cancelled")
    reasons.push("Source action was cancelled.");
  if (action.progress === "submitted")
    reasons.push("Submitted; await review rather than claiming completion.");
  if (action.feasibility === "blocked" || blockedBy.length)
    reasons.push("Blocking preparation is unresolved.");
  if (
    action.kind === "event" &&
    action.event?.kind === "timed" &&
    Date.parse(action.event.end) < new Date(now).getTime()
  )
    reasons.push("The event has passed; attendance is not inferred.");
  if (
    action.kind === "event" &&
    action.event?.kind === "all-day" &&
    action.event.end <= dateInZone(now, action.event.timezone)
  )
    reasons.push("The all-day event has passed; attendance is not inferred.");
  return {
    actionable:
      !expired &&
      !action.sourceCancelled &&
      action.source.consent &&
      action.source.permissions.includes("read") &&
      action.source.permissions.includes("open") &&
      !["completed", "cancelled", "submitted"].includes(action.progress) &&
      action.feasibility !== "blocked" &&
      !blockedBy.length,
    blockedBy,
    reasons,
  };
}
export function rankActions(
  actions: JourneyAction[],
  now: Date | string,
  timezone: string,
  goalIds: string[] = [],
  policy: { imminentCommitmentMinutes?: number } = {},
): RankedAction[] {
  const date = new Date(now),
    today = dateInZone(date, timezone),
    seen = new Set<string>();
  return actions
    .filter(
      (a) =>
        !seen.has(a.id) &&
        !!seen.add(a.id) &&
        a.source.consent &&
        a.source.permissions.includes("read") &&
        !a.hypothetical &&
        !a.sourceCancelled &&
        !["completed", "cancelled"].includes(a.progress),
    )
    .map((action) => {
      const availability = actionAvailability(action, actions, date),
        days = deadlineDistance(action, date),
        deadline = action.deadline;
      const hard =
        deadline &&
        deadline.kind !== "unresolved" &&
        deadline.confirmed &&
        deadline.authority === "source";
      let bucket = 7,
        sortDistance = days ?? 99999;
      const reasons = [...availability.reasons];
      const imminentMinutes = Math.max(
        0,
        Math.min(240, policy.imminentCommitmentMinutes ?? 30),
      );
      if (action.kind === "event") {
        const e = action.event;
        const upcoming =
          e?.kind === "timed"
            ? Date.parse(e.end) >= date.getTime()
            : !!e && e.end > dateInZone(date, e.timezone);
        const eventDay =
          e?.kind === "timed" ? dateInZone(e.start, timezone) : e?.start;
        const untilStart =
          e?.kind === "timed"
            ? (Date.parse(e.start) - date.getTime()) / 60000
            : null;
        const imminent =
          upcoming && untilStart !== null && untilStart <= imminentMinutes;
        sortDistance =
          untilStart !== null
            ? untilStart / 1440
            : e?.kind === "all-day"
              ? dayNumber(e.start) - dayNumber(today)
              : 99999;
        bucket = imminent ? 0 : upcoming ? 3 : 9;
        reasons.unshift(
          imminent
            ? `Fixed commitment is ongoing or starts within ${imminentMinutes} minutes; its time is not rescheduled.`
            : upcoming
              ? `Fixed commitment${eventDay === today ? " later today" : ""}; preparation can continue until it is imminent.`
              : "Past event retained; no automatic attendance or completion.",
        );
      } else if (hard && days !== null && days < 0 && action.mandatory) {
        bucket = 0;
        reasons.unshift(
          "Overdue mandatory work with a reviewed source-reported deadline.",
        );
      } else if (hard && days !== null && days <= 1) {
        bucket = 1;
        reasons.unshift(
          days < 0
            ? "Source-reported deadline has passed."
            : "Source-reported deadline is imminent.",
        );
      } else if (action.mandatory && availability.blockedBy.length) {
        bucket = 2;
        reasons.unshift("Mandatory work has a blocking dependency to resolve.");
      } else if (hard && days !== null && days <= 7) {
        bucket = 3;
        reasons.unshift("Source-reported deadline falls within the next week.");
      } else if (action.mandatory) {
        bucket = 4;
        reasons.unshift("Required commitment precedes optional development.");
      } else if (action.category === "administration") {
        bucket = 5;
        reasons.unshift(
          "Necessary administration remains visible without an invented career relationship.",
        );
      } else if (action.nodeIds.some((id) => goalIds.includes(id))) {
        bucket = 6;
        reasons.unshift("Preparation supports an active goal.");
      } else
        reasons.unshift(
          action.category === "suggestion"
            ? "Optional exploration; no artificial requirement."
            : "Personal preparation or user priority.",
        );
      if (action.progress === "submitted") bucket = 9;
      if (deadline?.kind === "unresolved")
        reasons.push(
          "Relative or ambiguous deadline needs review; no date was invented.",
        );
      if (action.estimatedMinutes)
        reasons.push(
          `${action.estimatedMinutes} minutes ${action.effortBasis === "estimate" ? "estimated" : "supplied"} remaining effort.`,
        );
      if (date.getTime() - Date.parse(action.source.observedAt) > 14 * 86400000)
        reasons.push(
          "Source observation is older than 14 days; verify that it is current.",
        );
      const deadlineLabel =
        deadline?.kind === "instant"
          ? `${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: deadline.timezone }).format(new Date(deadline.at))} (${deadline.timezone})`
          : deadline?.kind === "date"
            ? `${deadline.date} · all-day date (${deadline.timezone}; no midnight deadline assumed)`
            : deadline?.text;
      return {
        action,
        reasons,
        blockedBy: availability.blockedBy,
        bucket: String(bucket),
        deadlineLabel,
        days: sortDistance,
      };
    })
    .sort(
      (a, b) =>
        Number(a.bucket) - Number(b.bucket) ||
        a.days - b.days ||
        b.action.priority - a.action.priority ||
        Number(actionAvailability(b.action, actions, date).actionable) -
          Number(actionAvailability(a.action, actions, date).actionable) ||
        a.action.id.localeCompare(b.action.id),
    )
    .map(({ days, ...ranked }) => {
      void days;
      return ranked;
    });
}
export function planWeek(
  actions: JourneyAction[],
  settings: WeekSettings,
  now: Date | string,
  timezone: string,
) {
  const start = new Date(now).getTime(),
    end = start + 7 * 86400000,
    today = dateInZone(now, timezone),
    last = dateInZone(new Date(end), timezone);
  const fixed = actions.filter(
    (a) =>
      a.source.consent &&
      a.source.permissions.includes("read") &&
      !a.hypothetical &&
      a.kind === "event" &&
      a.progress !== "cancelled" &&
      !a.sourceCancelled &&
      a.event &&
      (a.event.kind === "timed"
        ? Date.parse(a.event.start) < end && Date.parse(a.event.end) > start
        : a.event.start < last && a.event.end > today),
  );
  const timed = fixed
    .filter((a) => a.event?.kind === "timed")
    .map((a) => ({
      id: a.id,
      start: Math.max(start, Date.parse((a.event as { start: string }).start)),
      end: Math.min(end, Date.parse((a.event as { end: string }).end)),
    }))
    .sort((a, b) => a.start - b.start);
  const conflicts: string[] = [];
  for (let i = 0; i < timed.length; i++)
    for (let j = i + 1; j < timed.length && timed[j].start < timed[i].end; j++)
      conflicts.push(`${timed[i].id} overlaps ${timed[j].id}`);
  // Union overlapping commitments rather than double-counting their occupied time.
  let fixedMinutes = 0,
    until = start;
  for (const t of timed) {
    fixedMinutes += Math.max(0, t.end - Math.max(t.start, until)) / 60000;
    until = Math.max(until, t.end);
  }
  let availableMinutes = settings.availableMinutes;
  if (settings.workingHours) {
    const w = settings.workingHours,
      toMinutes = (x: string) =>
        Number(x.slice(0, 2)) * 60 + Number(x.slice(3));
    const span = Math.max(0, toMinutes(w.end) - toMinutes(w.start));
    availableMinutes = Math.min(availableMinutes, span * new Set(w.days).size);
  }
  const capacity = Math.max(
      0,
      availableMinutes - fixedMinutes - settings.bufferMinutes,
    ),
    selected: JourneyAction[] = [],
    unknownEffort: string[] = [];
  let taskMinutes = 0;
  const ranked = rankActions(actions, now, timezone);
  const blockedActions = ranked
    .filter(
      (r) =>
        r.action.kind === "task" &&
        !actionAvailability(r.action, actions, now).actionable &&
        r.action.progress !== "submitted",
    )
    .map((r) => r.action.id);
  for (const { action } of ranked) {
    if (
      action.kind !== "task" ||
      !actionAvailability(action, actions, now).actionable
    )
      continue;
    const days = deadlineDistance(action, now);
    if (days !== null && days > 7 && !action.mandatory) continue;
    if (!action.estimatedMinutes) {
      unknownEffort.push(action.id);
      continue;
    }
    selected.push(action);
    taskMinutes += action.estimatedMinutes;
  }
  const overflowMinutes = Math.max(0, taskMinutes - capacity),
    remainingMinutes = Math.max(0, capacity - taskMinutes);
  return {
    fixed,
    selected,
    availableMinutes,
    fixedMinutes: Math.ceil(fixedMinutes),
    bufferMinutes: settings.bufferMinutes,
    taskMinutes,
    remainingMinutes,
    overflowMinutes,
    unknownEffort,
    blockedActions,
    conflicts,
    notice: [
      overflowMinutes
        ? `Workload exceeds the supplied capacity by ${Math.ceil(overflowMinutes)} minutes. Choose what to defer; no obligation was moved.`
        : "Known estimated work fits within the supplied gross time budget.",
      blockedActions.length
        ? "Some tasks are blocked or lack action permission; resolve these constraints before treating the week as feasible."
        : "",
      unknownEffort.length
        ? "Some tasks have unknown effort; overall feasibility remains uncertain."
        : "",
      fixed.some((a) => a.event?.kind === "all-day")
        ? "All-day dates have unknown occupied hours; no midnight block or full-day workload was invented."
        : "",
      settings.workingHours
        ? "Working-hour capacity is a weekly bound, not a booked timetable."
        : "No working-hour schedule was supplied; this is a workload proposal, not calendar bookings.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}
/** Existing original graph projects become optional local work, never imported commitments. */
export function projectGraphActions(
  graph: WorldGraph,
  ownerId: string,
  goals: string[],
  now = new Date().toISOString(),
): JourneyAction[] {
  return graph.nodes
    .filter(
      (n) =>
        n.kind === "Project" &&
        n.actions.length &&
        !["historical", "reported", "verified"].includes(n.status),
    )
    .slice(0, 8)
    .map((n) => ({
      id: "graph-action:" + n.id,
      title: n.actions[0].title,
      verb: "Start analysis",
      kind: "task",
      category: "suggestion",
      source: {
        app: "roadmaps",
        recordId: n.id,
        ownerId,
        tenantId: null,
        version: 1,
        observedAt: now,
        permissions: ["read", "open", "draft"],
        consent: true,
        authority: "self-reported",
      },
      progress: "planned",
      evidenceStatus: "self-reported",
      feasibility: n.prerequisites.length ? "unknown" : "actionable",
      hypothetical: false,
      mandatory: false,
      priority: 1,
      nodeIds: [
        n.id,
        ...graph.edges
          .filter((e) => e.from === n.id && goals.includes(e.to))
          .map((e) => e.to),
      ],
      dependsOn: [],
      reason: n.actions[0].deliverable,
      notes: "",
      evidence: "",
      work: { kind: "local-note", label: "Start analysis" },
      updatedAt: now,
    }));
}
