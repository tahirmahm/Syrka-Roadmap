import { test } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
  aiConfig,
  aiJSON,
  type AIConfig,
  type Budget,
} from "../src/odyssey/server/ai-gateway";
const config: AIConfig = {
  provider: "deepseek",
  model: "test-only",
  baseURL: "https://api.deepseek.com",
  apiKey: "unit-test-placeholder",
  maxOutputTokens: 300,
  timeoutMs: 1000,
  dailyBudget: 1,
  inputRate: 1,
  outputRate: 2,
};
test("AI is disabled without explicit pricing, credentials, model and positive budget", () => {
  assert.equal(aiConfig({}), null);
  assert.equal(
    aiConfig({
      AI_PROVIDER: "deepseek",
      AI_MODEL: "x",
      AI_API_KEY: "placeholder",
      AI_PRICING_VERIFIED: "false",
    }),
    null,
  );
  assert.throws(
    () =>
      aiConfig({
        AI_PROVIDER: "qwen",
        AI_API_BASE_URL: "http://127.0.0.1",
        AI_MODEL: "x",
        AI_API_KEY: "placeholder",
        AI_PRICING_VERIFIED: "true",
      }),
    /HTTPS/,
  );
});
test("provider-independent structured responses reserve worst-case budget before sending", async () => {
  let reserved = 0,
    recorded = false;
  const budget: Budget = {
    reserve: async (_a, _m, cost) => {
      reserved = cost;
      return "receipt";
    },
    record: async () => {
      recorded = true;
    },
  };
  const transport: typeof fetch = async (url, init) => {
    assert.ok(reserved > 0);
    assert.equal(url, "https://api.deepseek.com/chat/completions");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.max_tokens, 300);
    assert.match(body.messages[0].content, /untrusted/);
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: '{"answer":"candidate"}' } }],
        usage: { prompt_tokens: 5, completion_tokens: 4 },
      }),
    );
  };
  const response = await aiJSON(
    config,
    budget,
    "explain",
    { topic: "Statistics" },
    z.object({ answer: z.string() }),
    transport,
  );
  assert.equal(response.answer, "candidate");
  assert.ok(recorded);
});
test("budget denial prevents any provider call; invalid schemas fail closed", async () => {
  let called = false;
  await assert.rejects(
    aiJSON(
      config,
      {
        reserve: async () => {
          throw new Error("Daily budget");
        },
        record: async () => {},
      },
      "quiz",
      {},
      z.object({ answer: z.string() }),
      async () => {
        called = true;
        return new Response();
      },
    ),
    /Daily budget/,
  );
  assert.equal(called, false);
  let status = "";
  await assert.rejects(
    aiJSON(
      config,
      {
        reserve: async () => "r",
        record: async (_a, _b, _c, s) => {
          status = s;
        },
      },
      "quiz",
      {},
      z.object({ answer: z.string() }),
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"invented":true}' } }],
          }),
        ),
    ),
  );
  assert.equal(status, "invalid-output");
});
