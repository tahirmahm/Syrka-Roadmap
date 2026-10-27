import { z } from "zod";
import type { SavedState } from "./types";
export const storageKey = "syrka-roadmaps:v1";
const stateSchema = z.object({
  version: z.literal(1),
  profile: z.object({
    id: z.string(),
    name: z.string(),
    headline: z.string(),
    fictional: z.boolean(),
    hoursPerWeek: z.number().min(1).max(80),
    evidence: z.array(
      z.object({
        id: z.string(),
        skillId: z.string(),
        title: z.string(),
        verification: z.enum([
          "institution-verified",
          "employer-verified",
          "document-supported",
          "self-reported",
          "inferred",
          "unverified",
        ]),
        sourceSystem: z.string(),
        sourceRecordId: z.string(),
        timestamp: z.string(),
        consent: z.boolean(),
        issuer: z.string().optional(),
        reference: z.string().optional(),
      }),
    ),
  }),
  destinationId: z.enum([
    "product-designer",
    "frontend-developer",
    "data-analyst",
  ]),
  completed: z.array(z.string()),
  inProgress: z.array(z.string()),
  expanded: z.array(z.string()),
  updatedAt: z.string(),
});
export function readState(raw: string | null): SavedState | null {
  if (!raw) return null;
  try {
    return stateSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
