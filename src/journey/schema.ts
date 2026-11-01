import { z } from "zod";
const text = z.string().max(3000),
  id = z.string().min(1).max(250);
export const sourceApps = [
  "campus",
  "mail",
  "calendar",
  "sessions",
  "workspace",
  "roadmaps",
  "manual",
  "demo",
] as const;
export const sourceRecordSchema = z.object({
  app: z.enum(sourceApps),
  recordId: id,
  ownerId: id,
  tenantId: z.string().max(250).nullable(),
  version: z.number().int().min(0).max(1_000_000),
  observedAt: z.string().datetime({ offset: true }),
  permissions: z.array(z.enum(["read", "open", "draft"])).max(3),
  consent: z.boolean(),
  href: z.string().url().max(2000).optional(),
  authority: z.enum(["reviewed-import", "self-reported", "demo"]),
});
const tz = z
  .string()
  .min(1)
  .max(100)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Unknown timezone");
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v + "T12:00:00Z").toISOString().slice(0, 10) === v,
    "Invalid calendar date",
  );
export const deadlineSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("instant"),
    at: z.string().datetime({ offset: true }),
    timezone: tz,
    confirmed: z.boolean(),
    authority: z.enum(["source", "user", "estimated"]),
  }),
  z.object({
    kind: z.literal("date"),
    date,
    timezone: tz,
    confirmed: z.boolean(),
    authority: z.enum(["source", "user", "estimated"]),
  }),
  z.object({ kind: z.literal("unresolved"), text: z.string().min(1).max(500) }),
]);
export const eventTimeSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("timed"),
      start: z.string().datetime({ offset: true }),
      end: z.string().datetime({ offset: true }),
      timezone: tz,
    })
    .refine(
      (v) => Date.parse(v.end) > Date.parse(v.start),
      "Event end must follow start",
    ),
  z
    .object({
      kind: z.literal("all-day"),
      start: date,
      end: date,
      timezone: tz,
    })
    .refine(
      (v) => v.end > v.start,
      "All-day end must be exclusive and follow start",
    ),
]);
export const journeyActionSchema = z
  .object({
    id,
    sourceFingerprint: z.string().max(100).optional(),
    sourceCancelled: z.boolean().optional(),
    title: z.string().min(1).max(200),
    verb: z.string().min(1).max(80),
    kind: z.enum(["task", "event"]),
    category: z.enum([
      "commitment",
      "preparation",
      "suggestion",
      "administration",
    ]),
    source: sourceRecordSchema,
    deadline: deadlineSchema.optional(),
    event: eventTimeSchema.optional(),
    progress: z
      .enum(["planned", "working", "submitted", "completed", "cancelled"])
      .default("planned"),
    evidenceStatus: z
      .enum([
        "self-reported",
        "document-supported",
        "reviewed",
        "issuer-verified",
        "disputed",
      ])
      .default("self-reported"),
    feasibility: z
      .enum(["actionable", "blocked", "unknown"])
      .default("actionable"),
    hypothetical: z.boolean().default(false),
    estimatedMinutes: z.number().int().min(1).max(10080).optional(),
    effortBasis: z.enum(["supplied", "estimate"]).optional(),
    mandatory: z.boolean().default(false),
    priority: z.number().int().min(0).max(3).default(1),
    nodeIds: z.array(id).max(50).default([]),
    dependsOn: z.array(id).max(30).default([]),
    reason: text.default(""),
    notes: text.default(""),
    evidence: text.default(""),
    work: z.object({
      kind: z.enum([
        "local-note",
        "source-link",
        "resource",
        "application-draft",
      ]),
      label: z.string().max(120),
      href: z.string().url().max(2000).optional(),
    }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .refine(
    (v) => v.kind !== "event" || !!v.event,
    "A fixed event needs a time or date range",
  );
export const importProposalSchema = z.object({
  id,
  ownerId: id,
  receivedAt: z.string().datetime({ offset: true }),
  format: z.enum(["json", "ics", "manual"]),
  status: z.enum(["review-required", "accepted", "rejected", "conflict"]),
  actions: z.array(journeyActionSchema).max(150),
  warnings: z.array(z.string().max(700)).max(100),
});
export const weekSettingsSchema = z.object({
  availableMinutes: z.number().int().min(0).max(10080).default(600),
  bufferMinutes: z.number().int().min(0).max(1440).default(60),
  workingHours: z
    .object({
      start: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
      end: z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/),
      days: z.array(z.number().int().min(0).max(6)).max(7),
    })
    .refine(
      (v) => v.end > v.start,
      "Working hours must finish after their start; overnight windows require explicit separate days.",
    )
    .optional(),
});
export const journeyStateSchema = z
  .object({
    version: z.literal(1),
    ownerId: id,
    timezone: tz,
    actions: z.array(journeyActionSchema).max(500).default([]),
    inbox: z.array(importProposalSchema).max(50).default([]),
    week: weekSettingsSchema.default({
      availableMinutes: 600,
      bufferMinutes: 60,
    }),
    connectorStates: z
      .array(
        z.object({
          app: z.enum(sourceApps),
          status: z.enum([
            "disconnected",
            "reviewed-import",
            "demo",
            "stale",
            "revoked",
          ]),
          lastObservedAt: z.string().datetime({ offset: true }).nullable(),
        }),
      )
      .max(8)
      .default([]),
  })
  .superRefine((state, ctx) => {
    if (
      state.actions.some((action) => action.source.ownerId !== state.ownerId) ||
      state.inbox.some(
        (proposal) =>
          proposal.ownerId !== state.ownerId ||
          proposal.actions.some(
            (action) => action.source.ownerId !== state.ownerId,
          ),
      )
    )
      ctx.addIssue({
        code: "custom",
        message: "Journey source ownership must match its profile context.",
      });
  });

export type JourneyAction = z.infer<typeof journeyActionSchema>;
export type SourceRecord = z.infer<typeof sourceRecordSchema>;
export type ImportProposal = z.infer<typeof importProposalSchema>;
export type JourneyState = z.infer<typeof journeyStateSchema>;
export type WeekSettings = z.infer<typeof weekSettingsSchema>;
export const emptyJourney = (
  ownerId: string,
  timezone = "Etc/UTC",
): JourneyState => ({
  version: 1,
  ownerId,
  timezone,
  actions: [],
  inbox: [],
  week: { availableMinutes: 600, bufferMinutes: 60 },
  connectorStates: [],
});
