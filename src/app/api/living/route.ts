import { NextRequest, NextResponse } from "next/server";
import { parseWorkspace } from "@/odyssey/profile";
import { boundedJSON } from "@/odyssey/server/http";
import { catalogue } from "@/odyssey/server/data";
import { buildWorld } from "@/living/engine";
export async function POST(req: NextRequest) {
  try {
    const raw = await boundedJSON(req, 1_500_000),
      w = parseWorkspace(JSON.stringify(raw));
    if (!w)
      return NextResponse.json(
        { error: "Invalid workspace projection" },
        { status: 400 },
      );
    return NextResponse.json(buildWorld(w, catalogue), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch {
    return NextResponse.json(
      {
        error:
          "The progression graph could not be loaded. Your saved records are unchanged.",
      },
      { status: 400 },
    );
  }
}
