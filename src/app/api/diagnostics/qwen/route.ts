import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { diagnoseQwen } from "@/odyssey/server/qwen-diagnostics";
export const runtime = "nodejs";
export const maxDuration = 30;
export async function POST(req: NextRequest) {
  const expected = process.env.QWEN_DIAGNOSTICS_TOKEN;
  const supplied = req.headers.get("x-roadmaps-diagnostics") || "";
  if (
    !expected ||
    expected.length < 32 ||
    Buffer.byteLength(expected) !== Buffer.byteLength(supplied) ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  )
    return new NextResponse(null, { status: 404 });
  const mode = req.nextUrl.searchParams.get("mode");
  if (mode !== "models" && mode !== "json")
    return NextResponse.json(
      { error: "Unknown diagnostic mode" },
      { status: 400 },
    );
  const result = await diagnoseQwen(process.env, mode);
  return NextResponse.json(
    {
      executionEnvironment: process.env.VERCEL === "1" ? "vercel" : "local",
      ...result,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
