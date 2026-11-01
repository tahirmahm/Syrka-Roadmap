import { z } from "zod";
const text = z.string().max(3000),
  ids = z.array(z.string().max(250)).max(500);
export const provenanceSchema = z.object({
  kind: z.enum([
    "fixture",
    "editorial",
    "official-import",
    "esco",
    "user-document",
    "self-reported",
  ]),
  reference: text,
  url: z
    .string()
    .url()
    .refine(
      (v) => new URL(v).protocol === "https:",
      "Only HTTPS source links are allowed",
    )
    .optional(),
  version: z.string().max(200),
  checkedAt: z.string().datetime().nullable(),
  quality: z.enum([
    "source-backed",
    "document-supported",
    "advisory",
    "fictional",
  ]),
});
export const catalogueCourseSchema = z.object({
  id: z.string().min(1).max(200),
  institution: text,
  programme: text,
  code: z.string().max(100).nullable(),
  title: text,
  credits: z.number().positive().max(60).nullable(),
  language: z.string().max(100),
  term: z.string().max(100),
  outcomes: z.array(text).max(50),
  skillIds: ids,
  prerequisites: ids,
  restrictions: z.array(text).max(30),
  availability: z.enum(["published", "unknown", "fixture"]),
  schedule: z.array(z.string().max(100)).max(20),
  source: provenanceSchema,
});
export const courseCatalogueSchema = z.object({
  version: z.literal("syrka.courses/1"),
  courses: z.array(catalogueCourseSchema).max(300),
});
export const livingStateSchema = z.object({
  version: z.literal(1),
  theme: z.enum(["light", "dark"]).optional(),
  mode: z.enum(["explore", "history", "goal"]).default("explore"),
  goals: ids.default([]),
  expanded: ids.default([]),
  selected: z.string().max(250).nullable().optional(),
  view: z
    .object({ x: z.number(), y: z.number(), zoom: z.number().min(0.1).max(3) })
    .optional(),
  academic: z
    .object({
      institution: text,
      faculty: text,
      programme: text,
      level: text,
      specialisation: text,
      year: z.string().max(100),
      term: z.string().max(100),
      creditLimit: z.number().min(1).max(90),
      remainingRequirements: z.array(text).max(30),
      requiredCourseIds: ids.optional(),
    })
    .optional(),
  catalogue: courseCatalogueSchema.optional(),
  plannedCourses: ids.default([]),
  courseLinks: z.record(z.string(), z.string().max(250)).optional(),
  progress: z
    .array(
      z.object({
        nodeId: z.string().max(250),
        status: z.enum(["planned", "working", "completed"]),
        at: z.string().datetime(),
        evidence: text,
      }),
    )
    .max(1000)
    .default([]),
  applications: z
    .record(
      z.string(),
      z.object({
        sourceUrl: z.union([
          z.literal(""),
          z
            .string()
            .url()
            .refine((v) => new URL(v).protocol === "https:"),
        ]),
        sourceReviewedAt: z.string().datetime().nullable(),
        evidenceIds: ids,
        completedChecks: ids,
        notes: text,
        status: z.enum(["draft", "review-ready"]),
      }),
    )
    .optional(),
  applicationNotes: z.record(z.string(), text).optional(),
});
export type LivingState = z.infer<typeof livingStateSchema>;
export type CourseRecord = z.infer<typeof catalogueCourseSchema>;
export type Provenance = z.infer<typeof provenanceSchema>;
export const nodeKinds = [
  "PersonProfile",
  "AcademicProgramme",
  "UniversityCourse",
  "KnowledgeDomain",
  "Capability",
  "Project",
  "Credential",
  "ProfessionalExperience",
  "Internship",
  "Occupation",
  "EmployerRole",
  "GraduateProgramme",
  "ResearchPathway",
  "Opportunity",
  "ProgressMilestone",
] as const;
export type NodeKind = (typeof nodeKinds)[number];
export type NodeStatus =
  | "verified"
  | "reported"
  | "inferred"
  | "working"
  | "available"
  | "prerequisites"
  | "planned"
  | "hypothetical"
  | "explored"
  | "historical";
export type WorldNode = {
  id: string;
  label: string;
  kind: NodeKind;
  summary: string;
  domain: string;
  institution?: string;
  skillIds: string[];
  source: Provenance;
  requirement: "formal" | "advisory" | "unknown";
  status: NodeStatus;
  evidence: {
    id: string;
    text: string;
    quote: string;
    status: string;
    date?: string;
  }[];
  actions: {
    title: string;
    deliverable: string;
    criteria: string;
    resource?: string;
  }[];
  date?: string;
  credits?: number | null;
  prerequisites: string[];
  occupationId?: string;
};
export type Relation =
  | "REQUIRES"
  | "RECOMMENDED_PREPARATION"
  | "DEVELOPS"
  | "DEMONSTRATES"
  | "BUILDS_ON"
  | "COMPLEMENTS"
  | "CONTRIBUTES_TO"
  | "SUPPORTS_APPLICATION_TO"
  | "RELATED_TO"
  | "TRANSFERABLE_TO"
  | "ALTERNATIVE_PATH_TO"
  | "COMPLETED_BEFORE";
export type WorldEdge = {
  id: string;
  from: string;
  to: string;
  relation: Relation;
  rationale: string;
  source: Provenance;
  requirement: "formal" | "advisory";
};
export type WorldGraph = {
  version: "syrka.living/1";
  nodes: WorldNode[];
  edges: WorldEdge[];
  notice: string;
  catalogueVersion: string;
};
export const emptyLiving = (): LivingState => ({
  version: 1,
  mode: "explore",
  goals: [],
  expanded: ["person"],
  plannedCourses: [],
  progress: [],
});
