import { sourceFingerprint } from "./imports";
import {
  emptyJourney,
  journeyActionSchema,
  type JourneyAction,
  type JourneyState,
} from "./schema";
/** Explicit fictional source exports, anchored to a supplied test/demo clock. */
export function ppeJourney(
  ownerId: string,
  now = new Date().toISOString(),
): JourneyState {
  const state = emptyJourney(ownerId, "Europe/Prague"),
    at = new Date(now).getTime(),
    instant = (minutes: number) => new Date(at + minutes * 60000).toISOString();
  const make = (
    app: JourneyAction["source"]["app"],
    recordId: string,
    extra: Partial<JourneyAction>,
  ) =>
    journeyActionSchema.parse({
      id: "fixture-action:" + recordId,
      title: "Fictional task",
      verb: "Continue task",
      kind: "task",
      category: "commitment",
      source: {
        app,
        recordId,
        ownerId,
        tenantId: "fictional-ppe",
        version: 1,
        observedAt: now,
        permissions: ["read", "open", "draft"],
        consent: true,
        authority: "demo",
      },
      progress: "planned",
      evidenceStatus: "self-reported",
      feasibility: "actionable",
      hypothetical: false,
      mandatory: false,
      priority: 1,
      nodeIds: [],
      dependsOn: [],
      reason:
        "Explicitly fictional demonstration; no live institutional record.",
      notes: "",
      evidence: "",
      work: { kind: "local-note", label: "Continue task" },
      updatedAt: now,
      ...extra,
    });
  state.actions = [
    make("demo", "ppe-essay", {
      title: "Complete the public-policy essay",
      verb: "Continue essay",
      deadline: {
        kind: "instant",
        at: instant(20 * 60),
        timezone: state.timezone,
        confirmed: true,
        authority: "source",
      },
      estimatedMinutes: 90,
      effortBasis: "supplied",
      mandatory: true,
      priority: 2,
      nodeIds: ["course:politics", "goal:policy", "goal:consulting"],
      reason:
        "An assessed fictional assignment is due before optional preparation; its sourced argument can support political analysis and writing.",
      work: { kind: "local-note", label: "Continue essay" },
      notes:
        "Outline a policy question, compare two arguments, cite evidence and state limitations. Save a draft here; submission remains a separate source action.",
    }),
    make("demo", "professor-feedback", {
      title: "Review professor feedback on the essay",
      verb: "Review feedback",
      estimatedMinutes: 15,
      effortBasis: "estimate",
      mandatory: true,
      nodeIds: ["course:politics", "goal:policy"],
      reason:
        "Fictional correspondence about the same assignment; review feedback before revising the essay.",
      work: { kind: "local-note", label: "Review feedback" },
      notes:
        "Fictional feedback: clarify the argument, distinguish empirical evidence from inference, and cite the source of each claim.",
    }),
    make("demo", "ppe-class", {
      title: "Political analysis class",
      verb: "Join class",
      kind: "event",
      event: {
        kind: "timed",
        start: instant(3 * 60),
        end: instant(4 * 60),
        timezone: state.timezone,
      },
      mandatory: true,
      nodeIds: ["course:politics"],
      reason:
        "Fixed fictional class commitment. A passed event is never automatically marked attended.",
      work: { kind: "local-note", label: "Open class notes" },
    }),
    make("demo", "internship-interview", {
      title: "Prepare for the internship interview",
      verb: "Prepare interview",
      deadline: {
        kind: "instant",
        at: instant(3 * 24 * 60),
        timezone: state.timezone,
        confirmed: true,
        authority: "source",
      },
      estimatedMinutes: 60,
      effortBasis: "estimate",
      nodeIds: ["goal:mckinsey", "project:finance"],
      reason:
        "A fictional interview preparation task, not evidence of employment or a live vacancy.",
      work: { kind: "local-note", label: "Prepare interview" },
      notes:
        "Prepare two evidence-backed examples and three questions. Do not invent an employer requirement.",
    }),
  ];
  state.actions = state.actions.map((action) => ({
    ...action,
    sourceFingerprint: sourceFingerprint(action),
  }));
  state.connectorStates = [
    { app: "demo", status: "demo", lastObservedAt: now },
  ];
  return state;
}
export function assignmentExtension(
  state: JourneyState,
  now = new Date().toISOString(),
) {
  const action = state.actions.find((a) => a.source.recordId === "ppe-essay");
  if (!action) throw new Error("Fictional essay not found.");
  return {
    version: "syrka.actions/1" as const,
    ownerId: state.ownerId,
    tenantId: action.source.tenantId,
    actions: [
      {
        ...action,
        source: {
          ...action.source,
          version: action.source.version + 1,
          observedAt: now,
        },
        deadline: {
          kind: "instant" as const,
          at: new Date(new Date(now).getTime() + 10 * 86400000).toISOString(),
          timezone: state.timezone,
          confirmed: true,
          authority: "source" as const,
        },
        updatedAt: now,
      },
    ],
  };
}
