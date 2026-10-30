import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { boundedJSON } from "@/odyssey/server/http";
import {
  catalogue,
  occupationById,
  ontologySkillById,
} from "@/odyssey/server/data";
import { emptyPerson } from "@/odyssey/profile";
import { matchOccupation } from "@/odyssey/catalogue";
import { aiConfig, aiJSON } from "@/odyssey/server/ai-gateway";
import { authenticatedBudget } from "@/odyssey/server/ai-session";
const input = z
  .object({
    occupationId: z.string().max(200),
    skillIds: z.array(z.string().max(200)).max(100),
    interests: z.array(z.string().max(100)).max(30),
    depth: z.enum(["quick", "deep"]),
    consent: z.literal(true),
  })
  .strict();
const output = z.object({
  summary: z.string().max(3000),
  actions: z.array(z.string().max(700)).max(6),
  uncertainties: z.array(z.string().max(700)).max(6),
});
export async function POST(req: NextRequest) {
  try {
    const x = input.parse(await boundedJSON(req, 25000));
    const occupation = occupationById.get(x.occupationId);
    if (!occupation)
      return NextResponse.json(
        { error: "Unknown source occupation" },
        { status: 404 },
      );
    const known = x.skillIds.filter((id) => ontologySkillById.has(id));
    const person = {
      ...emptyPerson(),
      interests: x.interests,
      assertions: known.map((skillId, i) => ({
        id: String(i),
        skillId,
        label: "",
        claimId: "",
        sourceSystem: "client-selection",
        sourceRecordId: "",
        quote: "",
        consent: true,
        verification: "self-reported" as const,
      })),
    };
    const match = matchOccupation(person, occupation);
    const shared = match.shared.map((id) => ontologySkillById.get(id)!.label);
    const missing = occupation.essential
      .filter((id) => !known.includes(id))
      .map((id) => ontologySkillById.get(id)!.label);
    const fallback = {
      summary: shared.length
        ? `Your selected capabilities overlap with ${shared.slice(0, 8).join(", ")}. ${missing.length} essential source skills still need learning or evidence.`
        : "There is no recorded essential-skill overlap yet. Explore the destination's source requirements before deciding on a transition.",
      actions: [
        "Inspect the roadmap's missing requirements and their prerequisites.",
        "Choose a practical project or resource, then attach relevant evidence.",
      ],
      uncertainties: [
        "Selection does not establish proficiency. Formal qualifications, licensing and employment eligibility are not assessed.",
      ],
      provider: "deterministic",
      model: null,
      version: catalogue.version,
    };
    if (
      x.depth === "deep" &&
      !(
        shared.length >= 3 &&
        (match.category === "Interdisciplinary opportunities" ||
          match.effort.band === "substantial")
      )
    )
      return NextResponse.json({
        ...fallback,
        notice:
          "Max is reserved for explicitly requested complex transitions with at least three shared capabilities. Use the quick explanation for this destination.",
      });
    const config = aiConfig();
    if (!config || config.provider !== "qwen-free-quota")
      return NextResponse.json({
        ...fallback,
        notice: "Qwen is not configured or its free-quota guard is incomplete.",
      });
    try {
      const selected = {
        ...config,
        model: x.depth === "deep" ? "qwen3.8-max" : "qwen3.8-flash",
      };
      const budget = await authenticatedBudget(selected);
      const result = await aiJSON(
        selected,
        budget,
        "possibilities",
        {
          task: "Explain this career transition using only the supplied source requirements, selected capabilities and interests. Do not invent qualifications, admissions rules, fees or job guarantees. Mention uncertainty and alternative learning/evidence routes, without asserting formal equivalence.",
          occupation: {
            label: occupation.label,
            description: occupation.description,
            sourceId: occupation.id,
          },
          selectedCapabilities: shared,
          missingRequirements: missing.slice(0, 45),
          interests: x.interests,
          shape: {
            summary: "string",
            actions: ["string"],
            uncertainties: ["string"],
          },
        },
        output,
      );
      return NextResponse.json({
        ...result,
        provider: "ai",
        model: selected.model,
        notice:
          "AI candidate guidance. Source requirements and evidence remain authoritative.",
      });
    } catch {
      return NextResponse.json({
        ...fallback,
        notice:
          "Qwen is unavailable or its free quota/rate limit was reached. Your profile and deterministic guidance are preserved.",
      });
    }
  } catch {
    return NextResponse.json(
      { error: "Invalid career-guidance request" },
      { status: 400 },
    );
  }
}
export const maxDuration = 60;
