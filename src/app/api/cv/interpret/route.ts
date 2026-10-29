import { boundedJSON, PayloadTooLarge } from "@/odyssey/server/http";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { aiConfig, aiJSON } from "@/odyssey/server/ai-gateway";
import { authenticatedBudget } from "@/odyssey/server/ai-session";
import { catalogue, ontologySkillById } from "@/odyssey/server/data";
import { mapText } from "@/odyssey/catalogue";
import { claimSchema } from "@/odyssey/profile";
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
const outputSchema = z.object({ claims: z.array(claimSchema).max(100) });
export async function POST(req: NextRequest) {
  try {
    const input = inputSchema.parse(await boundedJSON(req, 65000)),
      config = aiConfig();
    if (!config)
      return NextResponse.json({
        notice:
          "External AI is not configured. The local extraction and review workflow remains available.",
      });
    const candidates = mapText(
      input.pages.map((p) => p.text).join("\n"),
      catalogue.skills,
      30,
    );
    const allowed = new Set(candidates.map((c) => c.skillId));
    const budget = await authenticatedBudget();
    const output = await aiJSON(
      config,
      budget,
      "cv-interpret",
      {
        task: "Extract candidate CV claims. Do not infer unmentioned facts. Use only verbatim quotes from the supplied page. For ontology mappings, select only supplied candidate identifiers if the source quote supports them. All mappings remain unconfirmed.",
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
        (c.dates && !c.quote.includes(c.dates))
      )
        throw new Error("AI returned an unsupported source reference.");
    }
    return NextResponse.json({
      claims: output.claims.map((c) => ({
        ...c,
        approved: false,
        mappings: c.mappings.map((m) => ({
          ...m,
          label: ontologySkillById.get(m.skillId)!.label,
          method: "ai-candidate",
          confidence: "low",
          confirmed: false,
        })),
      })),
      notice:
        "AI candidate claims are unchecked. Review source quotations and approve each claim before adding it.",
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
