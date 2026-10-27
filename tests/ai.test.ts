import { test } from "node:test";
import assert from "node:assert/strict";
import { explainWithGroq } from "../src/lib/ai";
test("AI adapter minimizes transmitted data and validates structured responses", async () => {
  let sent = "";
  const transport: typeof fetch = async (_url, init) => {
    sent = String(init?.body);
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                explanation:
                  "Learning guidance: practice the supplied capabilities.",
              }),
            },
          },
        ],
      }),
      { status: 200 },
    );
  };
  const result = await explainWithGroq(
    { destination: "Data analyst", capabilityNames: ["SQL"], consent: true },
    { apiKey: "test-only", model: "test-model" },
    transport,
  );
  assert.match(result, /Learning guidance/);
  assert.ok(!sent.includes("Alex"));
  assert.ok(sent.includes("SQL"));
  await assert.rejects(
    explainWithGroq(
      { destination: "Data analyst", capabilityNames: [], consent: false },
      { apiKey: "test-only", model: "test" },
      transport,
    ),
  );
  await assert.rejects(
    explainWithGroq(
      {
        destination: "Data analyst",
        capabilityNames: [],
        consent: true,
        studentRecord: {},
      },
      { apiKey: "test-only", model: "test" },
      transport,
    ),
  );
});
test("AI failures and invalid provider outputs are explicit for deterministic fallback", async () => {
  const input = { destination: "Design", capabilityNames: [], consent: true };
  await assert.rejects(
    explainWithGroq(
      input,
      { apiKey: "test-only", model: "test" },
      async () => new Response("rate limited", { status: 429 }),
    ),
    /unavailable/,
  );
  await assert.rejects(
    explainWithGroq(
      input,
      { apiKey: "test-only", model: "test" },
      async () =>
        new Response(
          JSON.stringify({ choices: [{ message: { content: "not json" } }] }),
          { status: 200 },
        ),
    ),
  );
});
