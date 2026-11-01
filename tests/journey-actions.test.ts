import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QuestDock } from "../src/journey/quest-dock";
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyJourney,
  journeyActionSchema,
  journeyStateSchema,
} from "../src/journey/schema";
import { ppeJourney, assignmentExtension } from "../src/journey/fixtures";
import {
  rankActions,
  planWeek,
  actionAvailability,
  deadlineDistance,
} from "../src/journey/actions";
import {
  reviewJSON,
  reviewICS,
  acceptImport,
  revokeSourceConsent,
  safeActionHref,
  validateSourceLink,
  localToInstant,
} from "../src/journey/imports";
const now = "2026-11-01T09:00:00Z",
  owner = "fictional:ppe-consulting";
const demo = () => ppeJourney(owner, now);
const proposal = (
  action: ReturnType<typeof demo>["actions"][number],
  extra: Record<string, unknown> = {},
) =>
  reviewJSON(
    JSON.stringify({
      version: "syrka.actions/1",
      ownerId: owner,
      tenantId: action.source.tenantId,
      actions: [action],
      ...extra,
    }),
    owner,
  );
test("reviewed source import deduplicates by owner/tenant/app/record, preserves local work, applies extensions and blocks stale/conflicting updates", () => {
  const state = emptyJourney(owner),
    p = proposal(demo().actions[0]),
    first = acceptImport(state, p, now);
  assert.equal(first.added, 1);
  assert.equal(acceptImport(first.state, p).duplicates, 1);
  first.state.actions[0].notes = "User edited draft";
  first.state.actions[0].progress = "working";
  const ext = reviewJSON(
      JSON.stringify(assignmentExtension(demo(), "2026-11-01T10:00:00Z")),
      owner,
    ),
    next = acceptImport(first.state, ext, "2026-11-01T10:00:00Z");
  assert.equal(next.updated, 1);
  assert.equal(next.state.actions.length, 1);
  assert.equal(next.state.actions[0].notes, "User edited draft");
  assert.equal(next.state.actions[0].progress, "working");
  assert.equal(next.state.actions[0].deadline?.kind, "instant");
  const conflicting = proposal({
    ...demo().actions[0],
    source: {
      ...demo().actions[0].source,
      version: 2,
      observedAt: "2026-11-01T11:00:00Z",
    },
    title: "Conflicting same version",
  });
  assert.equal(acceptImport(next.state, conflicting).conflicts.length, 1);
  const stale = proposal({
    ...demo().actions[0],
    source: { ...demo().actions[0].source, observedAt: "2026-11-02T10:00:00Z" },
  });
  // A previously accepted exact proposal is idempotent; a newly observed old version conflicts.
  assert.equal(acceptImport(next.state, stale).conflicts.length, 1);
});
test("source owner, tenant, capability verification and navigation are independently protected", () => {
  const a = demo().actions[0];
  assert.throws(
    () =>
      reviewJSON(
        JSON.stringify({
          version: "syrka.actions/1",
          ownerId: "another",
          tenantId: null,
          actions: [a],
        }),
        owner,
      ),
    /owner/,
  );
  assert.throws(
    () => proposal({ ...a, source: { ...a.source, ownerId: "another" } }),
    /owner/,
  );
  assert.throws(
    () =>
      reviewJSON(
        JSON.stringify({
          version: "syrka.actions/1",
          ownerId: owner,
          tenantId: "tenant-a",
          actions: [a],
        }),
        owner,
        "tenant-b",
      ),
    /tenant/,
  );
  const p = proposal({ ...a, evidenceStatus: "issuer-verified" });
  assert.equal(p.actions[0].evidenceStatus, "document-supported");
  assert.throws(
    () =>
      proposal({
        ...a,
        source: { ...a.source, href: "https://attacker.example/steal" },
      }),
    /deep link/,
  );
  assert.equal(
    validateSourceLink("https://syrka.co@attacker.example/mail"),
    false,
  );
  assert.equal(
    validateSourceLink(
      "https://www.syrka.co/mail?next=https://attacker.example",
    ),
    false,
  );
  const linked = journeyActionSchema.parse({
    ...a,
    source: { ...a.source, href: "https://www.syrka.co/cam" },
    work: { kind: "source-link", label: "Open course" },
  });
  assert.equal(safeActionHref(linked), "https://www.syrka.co/cam");
  linked.source.consent = false;
  assert.equal(safeActionHref(linked), null);
  assert.throws(
    () => acceptImport(emptyJourney("another"), p),
    /another profile/,
  );
});
test("Today explains deadlines and fixed commitments without letting prestigious optional development hide mandatory work", () => {
  const s = demo(),
    optional = journeyActionSchema.parse({
      ...s.actions[0],
      id: "prestige",
      title: "Optional prestigious opportunity",
      mandatory: false,
      priority: 3,
      deadline: undefined,
      category: "suggestion",
      nodeIds: ["goal:mckinsey"],
    });
  const ranked = rankActions([...s.actions, optional], now, s.timezone, [
    "goal:mckinsey",
  ]);
  assert.equal(ranked[0].action.source.recordId, "ppe-essay");
  assert.equal(ranked[1].action.source.recordId, "ppe-class");
  assert.equal(
    rankActions(s.actions, "2026-11-01T11:45:00Z", s.timezone)[0].action.source
      .recordId,
    "ppe-class",
  );
  assert.ok(
    ranked.findIndex((r) => r.action.id === "prestige") >
      ranked.findIndex(
        (r) => r.action.source.recordId === "professor-feedback",
      ),
  );
  assert.match(ranked[0].reasons.join(" "), /imminent/);
  const after = acceptImport(
    s,
    reviewJSON(
      JSON.stringify(assignmentExtension(s, "2026-11-01T10:00:00Z")),
      owner,
    ),
  ).state;
  assert.notEqual(
    rankActions(after.actions, now, s.timezone)[0].action.source.recordId,
    "ppe-essay",
  );
});
test("date-only deadlines remain calendar dates and ambiguous relative dates are never manufactured", () => {
  const a = journeyActionSchema.parse({
    ...demo().actions[0],
    deadline: {
      kind: "date",
      date: "2026-11-01",
      timezone: "America/Los_Angeles",
      confirmed: true,
      authority: "source",
    },
  });
  assert.equal(deadlineDistance(a, "2026-11-02T06:00:00Z"), 0); // still Nov 1 in Los Angeles
  assert.match(
    rankActions([a], now, "Europe/Prague")[0].deadlineLabel!,
    /no midnight deadline/,
  );
  a.deadline = { kind: "unresolved", text: "next Friday" };
  assert.equal(deadlineDistance(a, now), null);
  assert.match(
    rankActions([a], now, "Europe/Prague")[0].reasons.join(" "),
    /no date was invented/,
  );
});
test("weekly workload detects impossible plans, overlaps and unknown effort without scheduling or assuming all-day occupied hours", () => {
  const s = demo(),
    event = s.actions.find((a) => a.kind === "event")!,
    same = { ...event, id: "second-class" };
  const summary = planWeek(
    [...s.actions, same],
    { availableMinutes: 100, bufferMinutes: 15 },
    now,
    s.timezone,
  );
  assert.equal(summary.fixedMinutes, 60);
  assert.equal(summary.conflicts.length, 1);
  assert.ok(summary.overflowMinutes > 0);
  assert.match(summary.notice, /no obligation was moved/);
  const unknown = journeyActionSchema.parse({
    ...s.actions[0],
    id: "unknown",
    estimatedMinutes: undefined,
  });
  assert.equal(
    planWeek([unknown], s.week, now, s.timezone).unknownEffort.length,
    1,
  );
  const allDay = journeyActionSchema.parse({
    ...event,
    event: {
      kind: "all-day",
      start: "2026-11-01",
      end: "2026-11-02",
      timezone: s.timezone,
    },
  });
  const daily = planWeek([allDay], s.week, now, s.timezone);
  assert.equal(daily.fixedMinutes, 0);
  assert.match(daily.notice, /unknown occupied hours/);
});
test("passed events, cancellations, pending review and revoked sources never become actionable completed evidence", () => {
  const s = demo(),
    event = s.actions.find((a) => a.kind === "event")!;
  assert.equal(
    actionAvailability(event, s.actions, "2026-11-02T09:00:00Z").actionable,
    false,
  );
  assert.equal(event.progress, "planned");
  const revoked = revokeSourceConsent(s, "demo", now);
  assert.equal(rankActions(revoked.actions, now, s.timezone).length, 0);
  assert.equal(revoked.actions[0].evidenceStatus, "self-reported");
  const blocked = journeyActionSchema.parse({
    ...s.actions[0],
    dependsOn: ["missing-source-action"],
  });
  assert.deepEqual(actionAvailability(blocked, s.actions, now).blockedBy, [
    "missing-source-action",
  ]);
  const submitted = { ...s.actions[0], progress: "submitted" as const };
  assert.equal(actionAvailability(submitted, s.actions, now).actionable, false);
  const parsed = journeyStateSchema.parse(s);
  assert.equal(parsed.version, 1);
  assert.equal(parsed.actions[0].hypothetical, false);
});
test("ICS imports preserve UID/sequence/date-only semantics and propagate a minimal cancellation without inventing event time", () => {
  const ics =
    "BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nUID:class-1\nSEQUENCE:1\nSUMMARY:Fictional class\nDTSTART;TZID=Europe/Prague:20261102T100000\nDTEND;TZID=Europe/Prague:20261102T110000\nEND:VEVENT\nBEGIN:VEVENT\nUID:all-day\nSUMMARY:Fictional all-day deadline\nDTSTART;VALUE=DATE:20261103\nDTEND;VALUE=DATE:20261104\nEND:VEVENT\nEND:VCALENDAR";
  const p = reviewICS(ics, owner, "Europe/Prague");
  assert.equal(p.actions.length, 2);
  assert.equal(p.actions[0].event?.kind, "timed");
  assert.equal(p.actions[1].event?.kind, "all-day");
  const first = acceptImport(emptyJourney(owner), p).state;
  assert.equal(
    acceptImport(first, reviewICS(ics, owner, "Europe/Prague")).duplicates,
    2,
  );
  const cancel = reviewICS(
    "BEGIN:VCALENDAR\nBEGIN:VEVENT\nUID:class-1\nSEQUENCE:2\nSTATUS:CANCELLED\nSUMMARY:Fictional class cancellation\nEND:VEVENT\nEND:VCALENDAR",
    owner,
    "Europe/Prague",
  );
  assert.equal(cancel.actions.length, 1);
  const next = acceptImport(first, cancel).state;
  assert.equal(next.actions[0].progress, "cancelled");
  assert.equal(next.actions[0].event?.kind, "timed");
  assert.equal(next.actions.length, 2);
  assert.equal(
    localToInstant("2026-11-02", "10:00:00", "Europe/Prague"),
    "2026-11-02T09:00:00.000Z",
  );
  assert.throws(
    () => localToInstant("2026-10-25", "02:30:00", "Europe/Prague"),
    /ambiguous/,
  );
  assert.throws(
    () => localToInstant("2026-03-29", "02:30:00", "Europe/Prague"),
    /does not exist/,
  );
});

test("unchanged fixture source remains a duplicate after local work; stale connection metadata never claims a fresh live sync", () => {
  const initial = demo(),
    original = JSON.parse(JSON.stringify(initial.actions[0]));
  initial.actions[0].progress = "working";
  initial.actions[0].notes = "My private work";
  const duplicate = acceptImport(initial, proposal(original));
  assert.equal(duplicate.duplicates, 1);
  assert.equal(duplicate.state.actions[0].notes, "My private work");
  const stale = journeyActionSchema.parse({
    ...original,
    source: {
      ...original.source,
      app: "campus",
      observedAt: "2026-09-01T09:00:00Z",
    },
  });
  const imported = acceptImport(
    emptyJourney(owner),
    proposal(stale),
    "2026-11-01T09:00:00Z",
  ).state;
  assert.equal(imported.connectorStates[0].status, "stale");
  assert.equal(
    imported.connectorStates[0].lastObservedAt,
    "2026-09-01T09:00:00.000Z",
  );
  assert.throws(
    () => journeyStateSchema.parse({ ...initial, ownerId: "another" }),
    /ownership/,
  );
});
test("source cancellation does not erase previously completed personal history but removes future scheduling and launch", () => {
  const initial = demo(),
    original = initial.actions[0];
  original.progress = "completed";
  original.evidence = "A retained submitted artifact";
  const incoming = {
    ...original,
    progress: "cancelled" as const,
    source: {
      ...original.source,
      version: 2,
      observedAt: "2026-11-01T10:00:00Z",
    },
  };
  const next = acceptImport(initial, proposal(incoming), "2026-11-01T10:00:00Z")
    .state.actions[0];
  assert.equal(next.progress, "completed");
  assert.equal(next.sourceCancelled, true);
  assert.equal(next.evidence, "A retained submitted artifact");
  assert.equal(actionAvailability(next, [next], now).actionable, false);
  assert.equal(safeActionHref(next), null);
});

test("blocked overdue commitments stay visible while a feasible explicit prerequisite becomes the dock's primary action", () => {
  const state = demo(),
    essay = journeyActionSchema.parse({
      ...state.actions[0],
      deadline: {
        kind: "instant",
        at: "2026-11-01T07:00:00Z",
        timezone: state.timezone,
        confirmed: true,
        authority: "source",
      },
      dependsOn: ["rubric"],
    }),
    prep = journeyActionSchema.parse({
      ...state.actions[1],
      id: "rubric",
      title: "Read the assessment rubric",
      mandatory: false,
      priority: 0,
      category: "preparation",
      deadline: undefined,
      nodeIds: [],
      dependsOn: [],
    }),
    prestige = journeyActionSchema.parse({
      ...state.actions[3],
      id: "prestige",
      title: "Explore a prestigious optional role",
      category: "suggestion",
      priority: 3,
      deadline: undefined,
      nodeIds: ["goal:mckinsey"],
    });
  state.actions = [essay, prep, prestige];
  const ranked = rankActions(state.actions, now, state.timezone, [
    "goal:mckinsey",
  ]);
  assert.equal(ranked[0].action.id, essay.id);
  assert.deepEqual(ranked[0].blockedBy, ["rubric"]);
  const main = ranked.find(
    (r) => actionAvailability(r.action, state.actions, now).actionable,
  )!;
  assert.equal(main.action.id, prep.id);
  assert.match(main.reasons[0], /Unblocks Complete the public-policy essay/);
  assert.ok(
    ranked.findIndex((r) => r.action.id === prep.id) <
      ranked.findIndex((r) => r.action.id === prestige.id),
  );
  const markup = renderToStaticMarkup(
    createElement(QuestDock, {
      state,
      ownerId: owner,
      graph: null,
      goals: ["goal:mckinsey"],
      onChange: () => {},
      onOpenAction: () => {},
      onSelectNode: () => {},
      onOpenInbox: () => {},
      now,
    }),
  );
  assert.match(
    markup,
    /class="journey-action-title"[^>]*>Read the assessment rubric/,
  );
  assert.match(markup, /mandatory commitment is blocked/);
  assert.ok(markup.includes(essay.title));
  assert.ok(markup.includes(ranked[0].deadlineLabel!));
  assert.match(markup, /journey-alternative-title/);
  // A circular dependency cannot create a feasible step or falsely unlock the work.
  const cyclic = [essay, { ...prep, dependsOn: [essay.id] }],
    cycleRanks = rankActions(cyclic, now, state.timezone);
  assert.ok(
    cycleRanks.every(
      (r) => !actionAvailability(r.action, cyclic, now).actionable,
    ),
  );
  assert.ok(
    cycleRanks.every(
      (r) => !r.reasons.some((reason) => reason.startsWith("Unblocks ")),
    ),
  );
  assert.equal(essay.progress, "planned");
  assert.equal(prep.progress, "planned");
  const fixed = rankActions(demo().actions, now, state.timezone).find(
    (r) => r.action.kind === "event",
  )!;
  assert.match(fixed.deadlineLabel!, /^Scheduled:/);
  assert.doesNotMatch(fixed.deadlineLabel!, /deadline/i);
});
