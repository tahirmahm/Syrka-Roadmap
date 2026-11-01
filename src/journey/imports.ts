import { z } from "zod";
import {
  emptyJourney,
  importProposalSchema,
  journeyActionSchema,
  type JourneyAction,
  type JourneyState,
  type ImportProposal,
  type SourceRecord,
} from "./schema";
const sourceHosts = new Set(["syrka.co", "www.syrka.co"]);
const resourceHosts = new Set([
  "ocw.mit.edu",
  "www.open.edu",
  "openstax.org",
  "docs.python.org",
  "www.khanacademy.org",
  "www.coursera.org",
  "www.edx.org",
  "www.cipd.org",
  "www.esco.ec.europa.eu",
  "esco.ec.europa.eu",
  "www.hbs.edu",
  "www.mckinsey.com",
]);
export function validateSourceLink(value: string) {
  try {
    const u = new URL(value);
    return (
      u.protocol === "https:" &&
      !u.username &&
      !u.password &&
      !u.port &&
      sourceHosts.has(u.hostname) &&
      !u.pathname.includes("\\") &&
      !u.pathname.split("/").includes("api") &&
      ![...u.searchParams.keys()].some((key) =>
        /redirect|return|next|callback|continue/i.test(key),
      )
    );
  } catch {
    return false;
  }
}
export function validateResourceLink(value: string) {
  try {
    const u = new URL(value);
    return (
      validateSourceLink(value) ||
      (u.protocol === "https:" &&
        !u.username &&
        !u.password &&
        !u.port &&
        resourceHosts.has(u.hostname))
    );
  } catch {
    return false;
  }
}
export function safeActionHref(action: JourneyAction) {
  if (
    !action.source.consent ||
    !action.source.permissions.includes("open") ||
    action.progress === "cancelled" ||
    action.sourceCancelled
  )
    return null;
  const href = action.work.href || action.source.href;
  return href &&
    (action.work.kind === "resource"
      ? validateResourceLink(href)
      : validateSourceLink(href))
    ? href
    : null;
}
export function sourceKey(source: SourceRecord) {
  return JSON.stringify([
    source.ownerId,
    source.tenantId,
    source.app,
    source.recordId,
  ]);
}
const digest = (text: string) => {
  let a = 2166136261,
    b = 2246822507;
  for (const c of text) {
    a = Math.imul(a ^ c.charCodeAt(0), 16777619);
    b = Math.imul(b ^ c.charCodeAt(0), 3266489909);
  }
  return (
    (a >>> 0).toString(16).padStart(8, "0") +
    (b >>> 0).toString(16).padStart(8, "0")
  );
};
export const sourceFingerprint = (a: JourneyAction) =>
  digest(
    JSON.stringify({
      ...a,
      id: undefined,
      sourceFingerprint: undefined,
      notes: undefined,
      evidence: undefined,
      updatedAt: undefined,
      source: { ...a.source, observedAt: undefined },
    }),
  );
const fingerprint = sourceFingerprint;
function reviewedAction(
  action: JourneyAction,
  ownerId: string,
  tenantId?: string | null,
): JourneyAction {
  if (
    action.source.ownerId !== ownerId ||
    (tenantId !== undefined && action.source.tenantId !== tenantId)
  )
    throw new Error(
      "Source owner or tenant does not match this import context.",
    );
  if (action.source.href && !validateSourceLink(action.source.href))
    throw new Error(
      "Source deep link is outside the supported Syrka origins or contains an unsafe redirect.",
    );
  if (
    action.work.href &&
    !(action.work.kind === "resource"
      ? validateResourceLink(action.work.href)
      : validateSourceLink(action.work.href))
  )
    throw new Error(
      "Work link is outside the supported destination allowlist.",
    );
  const a: JourneyAction = {
    ...action,
    ...(action.progress === "cancelled" ? { sourceCancelled: true } : {}),
    id: "import:" + digest(sourceKey(action.source)),
    evidenceStatus:
      action.evidenceStatus === "issuer-verified"
        ? "document-supported"
        : action.evidenceStatus,
    source: {
      ...action.source,
      authority: action.source.app === "demo" ? "demo" : "reviewed-import",
    },
  };
  a.sourceFingerprint = fingerprint(a);
  return a;
}
const envelope = z
  .object({
    version: z.literal("syrka.actions/1"),
    ownerId: z.string().min(1).max(250),
    tenantId: z.string().max(250).nullable().default(null),
    actions: z.array(journeyActionSchema).max(150),
  })
  .strict();
export function reviewJSON(
  text: string,
  ownerId: string,
  tenantId?: string | null,
): ImportProposal {
  if (new TextEncoder().encode(text).length > 600_000)
    throw new Error("Action import exceeds 600 KB.");
  const x = envelope.parse(JSON.parse(text));
  if (
    x.ownerId !== ownerId ||
    (tenantId !== undefined && x.tenantId !== tenantId)
  )
    throw new Error("Import owner or tenant does not match this workspace.");
  const actions = x.actions.map((a) => reviewedAction(a, ownerId, x.tenantId));
  return {
    id: "proposal:" + digest(ownerId + text),
    ownerId,
    receivedAt: new Date().toISOString(),
    format: "json",
    status: "review-required",
    actions,
    warnings: [
      "Uploaded source labels and dates are user-reviewed imports, not independently authenticated institutional records.",
      "Nothing is written to another application. Approve these records before they affect Today or This week.",
    ],
  };
}
/** Returns one unambiguous local time, rejecting DST gaps and duplicated local instants. */
export function localToInstant(day: string, time: string, timezone: string) {
  const [y, m, d] = day.split("-").map(Number),
    [h, min, s] = time.split(":").map(Number),
    wall = Date.UTC(y, m - 1, d, h, min, s || 0);
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = (at: number) => {
    const p = fmt.formatToParts(new Date(at)),
      v = (k: string) => Number(p.find((x) => x.type === k)!.value);
    return {
      y: v("year"),
      m: v("month"),
      d: v("day"),
      h: v("hour"),
      min: v("minute"),
      s: v("second"),
    };
  };
  const offsets = new Set<number>();
  for (const delta of [-86400000, 0, 86400000]) {
    const p = parts(wall + delta);
    offsets.add(Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - (wall + delta));
  }
  const matches = [...offsets]
    .map((offset) => wall - offset)
    .filter((at) => {
      const p = parts(at);
      return (
        p.y === y &&
        p.m === m &&
        p.d === d &&
        p.h === h &&
        p.min === min &&
        p.s === (s || 0)
      );
    });
  if (matches.length !== 1)
    throw new Error(
      "Local calendar time is ambiguous or does not exist in its timezone.",
    );
  return new Date(matches[0]).toISOString();
}
const unescapeICS = (s: string) =>
  s.replace(/\\[nN]/g, "\n").replace(/\\([,;\\])/g, "$1");
function icsDate(
  value: string,
  params: string,
  defaultZone: string,
): { date?: string; instant?: string; timezone: string } {
  const timezone =
    params.match(/TZID=([^;]+)/i)?.[1].replace(/^"|"$/g, "") || defaultZone;
  new Intl.DateTimeFormat("en", { timeZone: timezone });
  if (/^\d{8}$/.test(value))
    return {
      date: `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`,
      timezone,
    };
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/);
  if (!m) throw new Error("Unsupported or unresolved calendar date.");
  const day = `${m[1]}-${m[2]}-${m[3]}`,
    time = `${m[4]}:${m[5]}:${m[6] || "00"}`;
  if (m[7]) {
    const instant = day + "T" + time + "Z";
    if (!Number.isFinite(Date.parse(instant)))
      throw new Error("Invalid calendar instant.");
    return { instant, timezone: "Etc/UTC" };
  }
  return { instant: localToInstant(day, time, timezone), timezone };
}
export function reviewICS(
  text: string,
  ownerId: string,
  timezone: string,
): ImportProposal {
  if (new TextEncoder().encode(text).length > 600_000)
    throw new Error("Calendar import exceeds 600 KB.");
  new Intl.DateTimeFormat("en", { timeZone: timezone });
  if (!/^BEGIN:VCALENDAR\r?$/m.test(text) || !/END:VCALENDAR/.test(text))
    throw new Error("Expected an iCalendar VCALENDAR file.");
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/),
    records: {
      type: string;
      fields: Map<string, { value: string; params: string }>;
    }[] = [],
    warnings: string[] = [
      "Calendar imports are reviewed files; they do not establish live Calendar connection, attendance or source authenticity.",
    ];
  let current: (typeof records)[number] | null = null,
    depth = 0;
  for (const line of lines) {
    if (/^BEGIN:(VEVENT|VTODO)$/.test(line)) {
      current = { type: line.slice(6), fields: new Map() };
      depth = 0;
      continue;
    }
    if (!current) continue;
    if (line.startsWith("BEGIN:")) {
      depth++;
      continue;
    }
    if (line === "END:" + current.type) {
      records.push(current);
      current = null;
      continue;
    }
    if (line.startsWith("END:")) {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth) continue;
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const [key, ...params] = line.slice(0, colon).split(";");
    current.fields.set(key.toUpperCase(), {
      params: params.join(";"),
      value: line.slice(colon + 1),
    });
  }
  if (records.length > 150)
    throw new Error("At most 150 calendar records may be imported at once.");
  const now = new Date().toISOString(),
    actions: JourneyAction[] = [];
  for (const record of records) {
    const f = (key: string) => record.fields.get(key);
    const uid = f("UID")?.value,
      title = unescapeICS(f("SUMMARY")?.value || "Untitled calendar record");
    if (!uid) {
      warnings.push(
        "Skipped a record without a stable UID; no fuzzy duplicate was assumed.",
      );
      continue;
    }
    try {
      if (f("RRULE"))
        warnings.push(
          `${title}: recurring series is not expanded; review its explicitly dated instance and future occurrences in Calendar.`,
        );
      const start = f("DTSTART"),
        end = f("DTEND"),
        due = f("DUE"),
        cancelled = f("STATUS")?.value === "CANCELLED";
      const a: JourneyAction = {
        id: "placeholder",
        title: title.slice(0, 200),
        verb: record.type === "VEVENT" ? "Open commitment" : "Continue task",
        kind: record.type === "VEVENT" ? "event" : "task",
        category: "commitment",
        source: {
          app: "calendar",
          recordId: uid,
          ownerId,
          tenantId: null,
          version: Number(f("SEQUENCE")?.value || 0),
          observedAt: now,
          permissions: ["read", "open"],
          consent: true,
          authority: "reviewed-import",
        },
        progress: cancelled
          ? "cancelled"
          : f("STATUS")?.value === "COMPLETED"
            ? "completed"
            : "planned",
        evidenceStatus: "self-reported",
        feasibility: "unknown",
        hypothetical: false,
        mandatory: false,
        priority: 1,
        nodeIds: [],
        dependsOn: [],
        reason:
          "Calendar commitment imported for review; no career relationship is assumed.",
        notes: unescapeICS(f("DESCRIPTION")?.value || "").slice(0, 3000),
        evidence: "",
        work: { kind: "local-note", label: "Open commitment" },
        updatedAt: now,
      };
      const url = f("URL")?.value;
      if (url) {
        if (validateSourceLink(url)) {
          a.source.href = url;
          a.work = { kind: "source-link", href: url, label: "Open source" };
        } else
          warnings.push(
            `${title}: unsupported URL omitted; use its local work surface.`,
          );
      }
      if (record.type === "VEVENT" && cancelled && !start) {
        a.kind = "task";
        a.reason =
          "Source cancellation notice; no new event time or task was invented.";
      } else if (record.type === "VEVENT") {
        if (!start) throw new Error("Event start is missing.");
        const s = icsDate(start.value, start.params, timezone),
          e = end ? icsDate(end.value, end.params, timezone) : undefined;
        if (s.date) {
          if (end && !e?.date)
            throw new Error(
              "All-day start and end use incompatible value types.",
            );
          const until =
            e?.date ||
            new Date(Date.parse(s.date + "T12:00:00Z") + 86400000)
              .toISOString()
              .slice(0, 10);
          a.event = {
            kind: "all-day",
            start: s.date,
            end: until,
            timezone: s.timezone,
          };
        } else if (s.instant && e?.instant)
          a.event = {
            kind: "timed",
            start: s.instant,
            end: e.instant,
            timezone: s.timezone,
          };
        else
          throw new Error(
            "Event duration/end is missing or incompatible; no occupied hours were invented.",
          );
      }
      if (due) {
        try {
          const d = icsDate(due.value, due.params, timezone);
          a.deadline = d.date
            ? {
                kind: "date",
                date: d.date,
                timezone: d.timezone,
                confirmed: true,
                authority: "source",
              }
            : {
                kind: "instant",
                at: d.instant!,
                timezone: d.timezone,
                confirmed: true,
                authority: "source",
              };
        } catch {
          a.deadline = { kind: "unresolved", text: due.value.slice(0, 500) };
          warnings.push(`${title}: deadline needs explicit review.`);
        }
      }
      actions.push(reviewedAction(journeyActionSchema.parse(a), ownerId, null));
    } catch (e) {
      warnings.push(`${title.slice(0, 100)}: ${(e as Error).message}`);
    }
  }
  if (warnings.length > 100)
    warnings.splice(
      99,
      Infinity,
      "Additional import warnings were omitted; split the file to review all source records.",
    );
  return importProposalSchema.parse({
    id: "proposal:" + digest(ownerId + timezone + text),
    ownerId,
    receivedAt: now,
    format: "ics",
    status: "review-required",
    actions,
    warnings,
  });
}
export function acceptImport(
  state: JourneyState,
  proposal: ImportProposal,
  now = new Date().toISOString(),
) {
  if (
    proposal.ownerId !== state.ownerId ||
    proposal.actions.some((a) => a.source.ownerId !== state.ownerId)
  )
    throw new Error("Cannot accept records owned by another profile.");
  if (state.inbox.some((p) => p.id === proposal.id && p.status === "accepted"))
    return {
      state,
      added: 0,
      updated: 0,
      duplicates: proposal.actions.length,
      conflicts: [] as string[],
    };
  const actions = state.actions.map((a) => ({ ...a, source: { ...a.source } })),
    conflicts: string[] = [];
  let added = 0,
    updated = 0,
    duplicates = 0;
  for (const candidate of proposal.actions) {
    const incoming = reviewedAction(
        journeyActionSchema.parse(candidate),
        state.ownerId,
      ),
      key = sourceKey(incoming.source),
      index = actions.findIndex((a) => sourceKey(a.source) === key);
    if (index < 0) {
      if (actions.length >= 500) {
        conflicts.push(
          "Action capacity reached; split or remove records before accepting more.",
        );
        continue;
      }
      actions.push(incoming);
      added++;
      continue;
    }
    const old = actions[index];
    if (incoming.source.version < old.source.version) {
      conflicts.push(
        `${incoming.title}: older source version cannot replace a newer record.`,
      );
      continue;
    }
    if (incoming.source.version === old.source.version) {
      if (
        (old.sourceFingerprint || fingerprint(old)) ===
        incoming.sourceFingerprint
      )
        duplicates++;
      else
        conflicts.push(
          `${incoming.title}: same-version source content conflicts; review with the source.`,
        );
      continue;
    }
    if (
      Date.parse(incoming.source.observedAt) < Date.parse(old.source.observedAt)
    ) {
      conflicts.push(
        `${incoming.title}: stale source observation cannot overwrite this record.`,
      );
      continue;
    }
    actions[index] = {
      ...(incoming.progress === "cancelled" ? old : incoming),
      sourceCancelled: incoming.sourceCancelled,
      source: incoming.source,
      sourceFingerprint: incoming.sourceFingerprint,
      id: old.id,
      notes: old.notes,
      evidence: old.evidence,
      progress:
        incoming.progress === "cancelled"
          ? old.progress === "completed"
            ? "completed"
            : "cancelled"
          : ["completed", "submitted", "working"].includes(old.progress)
            ? old.progress
            : incoming.progress,
      updatedAt: now,
    };
    updated++;
  }
  const apps = [...new Set(proposal.actions.map((a) => a.source.app))];
  const next: JourneyState = {
    ...state,
    actions,
    inbox: [
      ...state.inbox.filter((p) => p.id !== proposal.id),
      {
        ...proposal,
        status: conflicts.length
          ? ("conflict" as const)
          : ("accepted" as const),
      },
    ].slice(-50),
    connectorStates: [
      ...state.connectorStates.filter((c) => !apps.includes(c.app)),
      ...apps.map((app) => ({
        app,
        status:
          app === "demo"
            ? ("demo" as const)
            : new Date(now).getTime() -
                  Math.max(
                    ...proposal.actions
                      .filter((a) => a.source.app === app)
                      .map((a) => Date.parse(a.source.observedAt)),
                  ) >
                14 * 86400000
              ? ("stale" as const)
              : ("reviewed-import" as const),
        lastObservedAt: new Date(
          Math.max(
            ...proposal.actions
              .filter((a) => a.source.app === app)
              .map((a) => Date.parse(a.source.observedAt)),
          ),
        ).toISOString(),
      })),
    ],
  };
  return { state: next, added, updated, duplicates, conflicts };
}
export function revokeSourceConsent(
  state: JourneyState,
  app: SourceRecord["app"],
  now = new Date().toISOString(),
): JourneyState {
  return {
    ...state,
    actions: state.actions.map((a) =>
      a.source.app === app
        ? { ...a, source: { ...a.source, consent: false }, updatedAt: now }
        : a,
    ),
    connectorStates: [
      ...state.connectorStates.filter((c) => c.app !== app),
      { app, status: "revoked", lastObservedAt: now },
    ],
  };
}
export function manualAction(
  ownerId: string,
  title: string,
  now = new Date().toISOString(),
): JourneyAction {
  return journeyActionSchema.parse({
    id: crypto.randomUUID(),
    title,
    verb: "Continue task",
    kind: "task",
    category: "preparation",
    source: {
      app: "manual",
      recordId: crypto.randomUUID(),
      ownerId,
      tenantId: null,
      version: 1,
      observedAt: now,
      permissions: ["read", "open", "draft"],
      consent: true,
      authority: "self-reported",
    },
    work: { kind: "local-note", label: "Continue task" },
    updatedAt: now,
  });
}
export { emptyJourney };
