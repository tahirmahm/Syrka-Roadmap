import { boundedJSON, PayloadTooLarge } from "@/odyssey/server/http";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { catalogue, ontologySkillById } from "@/odyssey/server/data";
import { discover } from "@/odyssey/catalogue";
import { emptyPerson } from "@/odyssey/profile";
const schema = z
  .object({
    interests: z.array(z.string().max(100)).max(30),
    assertions: z
      .array(
        z.object({
          skillId: z.string().max(200),
          verification: z.enum([
            "document-supported",
            "self-reported",
            "inferred",
          ]),
          consent: z.boolean(),
        }),
      )
      .max(500),
  })
  .strict();
export async function POST(req: NextRequest) {
  try {
    const x = schema.parse(await boundedJSON(req, 100000));
    const person = {
      ...emptyPerson(),
      interests: x.interests,
      assertions: x.assertions.map((a, i) => ({
        ...a,
        id: String(i),
        label: "",
        claimId: "",
        sourceSystem: "client-claim",
        sourceRecordId: "",
        quote: "",
      })),
    };
    return NextResponse.json(
      {
        matches: discover(catalogue, person).map((m) => ({
          ...m,
          explanation: {
            shared: m.shared.map(
              (id) => ontologySkillById.get(id)?.label || id,
            ),
            missing: m.occupation.essential
              .filter((id) => !m.shared.includes(id))
              .slice(0, 5)
              .map((id) => ontologySkillById.get(id)?.label || id),
          },
        })),
        version: catalogue.version,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof PayloadTooLarge
            ? e.message
            : "Invalid profile projection",
      },
      { status: e instanceof PayloadTooLarge ? 413 : 400 },
    );
  }
}
