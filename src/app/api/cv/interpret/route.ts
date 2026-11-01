import { boundedJSON, PayloadTooLarge } from "@/odyssey/server/http";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aiConfig, aiJSON } from "@/odyssey/server/ai-gateway";
import { authenticatedBudget } from "@/odyssey/server/ai-session";
import { catalogue, ontologySkillById } from "@/odyssey/server/data";
import { mapText } from "@/odyssey/catalogue";
import { claimSchema } from "@/odyssey/profile";
import { supportedEducationState } from "@/living/inference";
const inputSchema = z
  .object({
    consent: z.literal(true),
    pages: z
      .array(
        z.object({
          number: z.number().int().min(1).max(20),
          text: z.string().max(15000),
        }),
      )
      .min(1)
      .max(20),
  })
  .strict();
const outputSchema = z.object({ claims: z.array(claimSchema).max(12) });
export async function POST(req: NextRequest) {
  try {
    const input = inputSchema.parse(await boundedJSON(req, 65000)),
      config = aiConfig();
    if (!config)
      return NextResponse.json({
        notice:
          "External AI is disabled or its configuration/free-quota verification is incomplete. Local extraction and review remain available.",
      });
    const candidates = mapText(
      input.pages.map((p) => p.text).join("\n"),
      catalogue.skills,
      30,
    );
    const allowed = new Set(candidates.map((c) => c.skillId));
    const budget = await authenticatedBudget(config);
    const output = await aiJSON(
      {
        ...config,
        model: "qwen3.8-flash",
        maxOutputTokens: Math.min(2500, Math.max(config.maxOutputTokens, 1800)),
      },
      budget,
      "cv-interpret",
      {
        task: "Extract at most 12 high-signal candidate CV claims, distinguishing education attendance from completed qualifications, current enrolment, incomplete study, withdrawal and transfer. Include educationState (attended|current|completed|withdrawn|transferred|incomplete|unknown), institution, dates and grade only when explicitly supported by the quote. Dates alone never prove graduation. Infer transferable methods/capabilities only from described actions, not a project or job title. The local parser retains the complete document; do not attempt to replace every local claim. Do not infer unmentioned facts. Use only verbatim quotes from the supplied page. For ontology mappings, select only supplied candidate identifiers if the source quote supports them. All mappings remain unconfirmed.",
        pages: input.pages,
        candidates: candidates.map((c) => ({
          skillId: c.skillId,
          label: c.label,
        })),
        shape: {
          claims: [
            {
              id: "short unique string",
              kind: "education|qualification|course|employment|internship|volunteering|project|publication|language|skill|award|interest|other",
              text: "candidate claim",
              quote: "verbatim source text",
              page: "source page number",
              section: "section label",
              mappings: [
                {
                  skillId: "one supplied candidate ID",
                  label: "candidate label",
                  method: "ai-candidate",
                  confidence: "low",
                  confirmed: false,
                },
              ],
              approved: false,
              educationState: "unknown",
              interpretation: "ai-candidate",
            },
          ],
        },
      },
      outputSchema,
    );
    for (const c of output.claims) {
      const page = input.pages.find((p) => p.number === c.page);
      if (
        !page ||
        !c.quote.trim() ||
        !page.text.includes(c.quote) ||
        c.mappings.some((m) => !allowed.has(m.skillId)) ||
        (c.institution && !c.quote.includes(c.institution)) ||
        (c.dates && !c.quote.includes(c.dates)) ||
        (c.grade && !c.quote.includes(c.grade)) ||
        !supportedEducationState(c.educationState, c.quote)
      )
        throw new Error("AI returned an unsupported source reference.");
    }
    return NextResponse.json({
      claims: output.claims.map((c) => ({
        ...c,
        approved: false,
        interpretation: "ai-candidate",
        mappings: c.mappings.map((m) => ({
          ...m,
          label: ontologySkillById.get(m.skillId)!.label,
          method: "ai-candidate",
          confidence: "low",
          confirmed: false,
        })),
      })),
      notice:
        "AI candidate interpretations were added. Existing edits and selections are retained. Review quotations; uncertain mappings remain inferred.",
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof z.ZodError
            ? "Invalid CV interpretation request"
            : (e as Error).message,
      },
      { status: e instanceof PayloadTooLarge ? 413 : 400 },
    );
  }
}

export const maxDuration = 60;
