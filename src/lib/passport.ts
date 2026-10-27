import { z } from "zod";
import type { Profile } from "./types";
import esco from "@/data/esco.json";
import { skillById } from "@/data/ontology";
const evidenceSchema = z.object({
  id: z.string().min(1).max(120),
  skillId: z
    .string()
    .refine(
      (id) => !!skillById[id] || esco.skills.some((s) => s.uri === id),
      "Unknown skill ID",
    ),
  title: z.string().min(1).max(300),
  verification: z.enum([
    "institution-verified",
    "employer-verified",
    "document-supported",
    "self-reported",
    "inferred",
    "unverified",
  ]),
  sourceSystem: z.string().min(1).max(120),
  sourceRecordId: z.string().min(1).max(120),
  issuer: z.string().max(200).optional(),
  reference: z.string().max(1000).optional(),
  timestamp: z.iso.datetime(),
  consent: z.boolean(),
});
export const passportSchema = z.object({
  version: z.literal(1),
  name: z.string().min(1).max(120),
  headline: z.string().max(300),
  hoursPerWeek: z.number().int().min(1).max(80),
  consent: z.literal(true),
  evidence: z.array(evidenceSchema).max(200),
});
export function importPassport(input: unknown): Profile {
  const data = passportSchema.parse(input);
  // A client-supplied document cannot authenticate an issuer. Preserve the claimed
  // provenance in the title, but never elevate an uploaded claim to verified.
  return {
    id: "local-import",
    name: data.name,
    headline: data.headline,
    hoursPerWeek: data.hoursPerWeek,
    fictional: false,
    evidence: data.evidence.map((e) => ({
      ...e,
      verification:
        e.verification === "institution-verified" ||
        e.verification === "employer-verified"
          ? "document-supported"
          : e.verification,
      title:
        (e.verification.includes("verified")
          ? `Imported claim (issuer not authenticated): `
          : "") + e.title,
    })),
  };
}
