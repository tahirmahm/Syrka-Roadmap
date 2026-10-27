import { NextResponse } from "next/server";
import { z } from "zod";
import { generateRoadmap, summarize } from "@/lib/engine";
import { demoProfile, destinations } from "@/data/ontology";
// This endpoint accepts destination IDs only. No student records are transmitted.
const schema = z
  .object({
    destinationId: z
      .string()
      .refine((id) => destinations.some((d) => d.id === id)),
    consentToExternalAI: z.boolean().default(false),
  })
  .strict();
export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 1024)
    return NextResponse.json({ error: "Request too large" }, { status: 413 });
  try {
    const input = schema.parse(await request.json());
    const fallback = summarize(
      generateRoadmap(demoProfile, input.destinationId),
    );
    // Provider remains disabled until a free plan, privacy terms and current model are verified.
    // A deployment must deliberately opt in; the graph never depends on this call.
    if (
      !input.consentToExternalAI ||
      process.env.ENABLE_GROQ !== "true" ||
      !process.env.GROQ_API_KEY ||
      !process.env.GROQ_MODEL
    )
      return NextResponse.json({
        text: fallback,
        provider: "deterministic",
        externalProcessing: false,
      });
    // External AI is deliberately not activated by this scaffold. Enabling a public,
    // paid-capable endpoint requires authenticated quotas and provider validation.
    return NextResponse.json({
      text: fallback,
      provider: "deterministic",
      externalProcessing: false,
      notice:
        "External AI validation and authenticated quotas are not configured.",
    });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
