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
        AI_PROVIDER: "deepseek",
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

const planEnv = {
  AI_PROVIDER: "qwen-token-plan",
  QWEN_BASE_URL: "https://token-plan.maas.qwencloudapi.com/compatible-mode/v1",
  QWEN_API_KEY: "unit-test-placeholder",
  QWEN_MODEL: "test-only-not-a-real-model",
  QWEN_DAILY_TOKEN_LIMIT: "100000",
};
test("Qwen Token Plan configuration never falls back to metered endpoints or generic keys", () => {
  const plan = aiConfig(planEnv)!;
  assert.equal(plan.billingMode, "token-plan");
  assert.equal(plan.dailyBudget, 0);
  assert.equal(
    aiConfig({ ...planEnv, QWEN_API_KEY: "", AI_API_KEY: "ignored" }),
    null,
  );
  assert.equal(aiConfig({ ...planEnv, QWEN_MODEL: "" }), null);
  assert.equal(aiConfig({ ...planEnv, QWEN_DAILY_TOKEN_LIMIT: "0" }), null);
  assert.equal(aiConfig({ ...planEnv, QWEN_BASE_URL: "" }), null);
  for (const url of [
    "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
    "https://token-plan.maas.qwencloudapi.com.evil.example/compatible-mode/v1",
    "https://token-plan.maas.qwencloudapi.com/other",
    "http://token-plan.maas.qwencloudapi.com/compatible-mode/v1",
  ])
    assert.throws(
      () => aiConfig({ ...planEnv, QWEN_BASE_URL: url }),
      /Token Plan/,
    );
});
test("prepaid requests reserve token units and send structured output only to the approved endpoint", async () => {
  const plan = aiConfig(planEnv)!;
  let tokens = 0;
  const response = await aiJSON(
    plan,
    {
      reserve: async (_action, _model, units) => {
        tokens = units;
        return "prepaid-reservation";
      },
      record: async () => {},
    },
    "explain",
    { topic: "Statistics" },
    z.object({ ok: z.literal(true) }),
    async (url, init) => {
      assert.equal(url, planEnv.QWEN_BASE_URL + "/chat/completions");
      assert.equal(init?.redirect, "error");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, planEnv.QWEN_MODEL);
      assert.deepEqual(body.response_format, { type: "json_object" });
      assert.ok(tokens > 2 * plan.maxOutputTokens);
      return new Response(
        JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }),
      );
    },
  );
  assert.equal(response.ok, true);
  await assert.rejects(
    aiJSON(
      { ...plan, dailyTokenLimit: 1 },
      {
        reserve: async () => {
          throw new Error("Must not reach reservation");
        },
        record: async () => {},
      },
      "explain",
      {},
      z.object({}),
      async () => {
        throw new Error("Must not call provider");
      },
    ),
    /daily budget/,
  );
});
