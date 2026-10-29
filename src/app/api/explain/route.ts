import { NextResponse } from "next/server";
import { z } from "zod";
import { catalogue, occupationById } from "@/odyssey/server/data";
import { searchOccupations } from "@/odyssey/catalogue";
import { boundedJSON, PayloadTooLarge } from "@/odyssey/server/http";
const schema = z
  .object({
    destinationId: z.string().max(250),
    consentToExternalAI: z.boolean().optional(),
  })
  .strict();
export async function POST(request: Request) {
  try {
    const input = schema.parse(await boundedJSON(request, 1500));
    const legacy: Record<string, string> = {
      "product-designer": "user interface designer",
      "frontend-developer": "web developer",
      "data-analyst": "data analyst",
    };
    const occupation =
      occupationById.get(input.destinationId) ||
      (legacy[input.destinationId]
        ? searchOccupations(catalogue, legacy[input.destinationId])[0]
        : undefined);
    if (!occupation)
      return NextResponse.json(
        { error: "Unknown destination" },
        { status: 400 },
      );
    return NextResponse.json({
      provider: "deterministic",
      externalProcessing: false,
      text: `${occupation.label.trim()} has ${occupation.essential.length} essential and ${occupation.optional.length} optional skill relationships in this ESCO snapshot. Explore source requirements, compare your evidence and inspect related occupations. Skill overlap is not a probability of employment or proof of formal eligibility.`,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof PayloadTooLarge ? e.message : "Invalid request" },
      { status: e instanceof PayloadTooLarge ? 413 : 400 },
    );
  }
}
