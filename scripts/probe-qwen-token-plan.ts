/** Operator-only bounded probe. No CV/person data and no metered endpoint fallback. */
import { z } from "zod";
import { QWEN_TOKEN_PLAN_URL } from "../src/odyssey/server/ai-gateway";
class ProbeError extends Error {}
async function main() {
  const base = process.env.QWEN_BASE_URL?.replace(/\/$/, "");
  if (base !== QWEN_TOKEN_PLAN_URL)
    throw new ProbeError("Set QWEN_BASE_URL to the approved Token Plan URL.");
  if (!process.env.QWEN_API_KEY)
    throw new ProbeError(
      "QWEN_API_KEY is not securely configured. Do not pass it as a command argument.",
    );
  const models = process.argv.includes("--models");
  if (!models && !process.env.QWEN_MODEL)
    throw new ProbeError(
      "Set an included QWEN_MODEL from the account console or model discovery first.",
    );
  const response = await fetch(
    base + (models ? "/models" : "/chat/completions"),
    {
      method: models ? "GET" : "POST",
      headers: {
        Authorization: "Bearer " + process.env.QWEN_API_KEY,
        "Content-Type": "application/json",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      ...(models
        ? {}
        : {
            body: JSON.stringify({
              model: process.env.QWEN_MODEL,
              max_tokens: 128,
              temperature: 0,
              response_format: { type: "json_object" },
              messages: [
                {
                  role: "user",
                  content: 'Return only this JSON object: {"ok":true}',
                },
              ],
            }),
          }),
    },
  );
  if (!response.ok)
    throw new ProbeError(
      `Token Plan returned HTTP ${response.status}. No fallback endpoint was attempted.`,
    );
  const data = await response.json();
  if (models) {
    const modelList = z
      .object({ data: z.array(z.object({ id: z.string().max(200) })).max(500) })
      .parse(data);
    console.log(
      JSON.stringify({
        endpoint: base,
        models: modelList.data.map((m) => m.id),
        notice:
          "Returned IDs do not independently establish purchased-plan inclusion or terms.",
      }),
    );
  } else {
    const result = z
      .object({
        choices: z
          .array(
            z.object({ message: z.object({ content: z.string().max(10000) }) }),
          )
          .min(1),
      })
      .parse(data);
    z.object({ ok: z.literal(true) })
      .strict()
      .parse(JSON.parse(result.choices[0].message.content));
    console.log(
      JSON.stringify({
        endpoint: base,
        model: process.env.QWEN_MODEL,
        structuredResponse: "passed",
        maxOutputTokens: 128,
      }),
    );
  }
}
main().catch((error) => {
  // Never print raw provider responses, request headers, config objects or transport errors.
  const safe =
    error instanceof z.ZodError
      ? "Token Plan response did not match the expected schema."
      : error instanceof TypeError
        ? "Token Plan connection failed. Check runtime destination policy and TLS trust."
        : error instanceof Error && error.name === "TimeoutError"
          ? "Token Plan connection timed out."
          : error instanceof ProbeError
            ? error.message
            : "Token Plan probe failed. Raw provider output was suppressed.";
  console.error(safe);
  process.exitCode = 1;
});
