import { test } from "node:test";
import assert from "node:assert/strict";
import { diagnoseQwen } from "../src/odyssey/server/qwen-diagnostics";
const env = {
  QWEN_BASE_URL:
    "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1",
  QWEN_API_KEY: "test-placeholder-never-log",
  QWEN_MODEL: "qwen3.8-flash",
  QWEN_FREE_QUOTA_ONLY_VERIFIED: "true",
  QWEN_FREE_QUOTA_VERIFIED_UNTIL: "2030-01-01T00:00:00Z",
  QWEN_FREE_QUOTA_VERIFICATION_REFERENCE: "fixture-only-confirmation",
};
test("diagnostics separate missing configuration, transport and upstream rejection without secrets", async () => {
  assert.equal((await diagnoseQwen({}, "models")).stage, "configuration");
  assert.equal(
    (
      await diagnoseQwen(env, "models", async () => {
        throw new TypeError("untrusted transport dump");
      })
    ).stage,
    "transport",
  );
  const r = await diagnoseQwen(
    env,
    "models",
    async () =>
      new Response(
        JSON.stringify({
          error: { code: "AccessDenied", message: env.QWEN_API_KEY },
        }),
        { status: 403 },
      ),
  );
  assert.equal(r.stage, "provider-http");
  assert.equal(r.status, 403);
  assert.equal(r.code, "AccessDenied");
  assert.ok(!JSON.stringify(r).includes(env.QWEN_API_KEY));
});
test("Vercel-compatible probe uses only the verified-free-quota endpoint and verifies synthetic structured output", async () => {
  const r = await diagnoseQwen(env, "json", async (url, init) => {
    assert.equal(url, env.QWEN_BASE_URL + "/chat/completions");
    assert.equal(init?.redirect, "error");
    assert.equal(JSON.parse(String(init?.body)).max_tokens, 128);
    return new Response(
      JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }] }),
    );
  });
  assert.equal(r.structuredOutputValid, true);
});

test("diagnostic route stays closed without the operator secret", async () => {
  const { POST } = await import("../src/app/api/diagnostics/qwen/route");
  const { NextRequest } = await import("next/server");
  const prior = process.env.QWEN_DIAGNOSTICS_TOKEN;
  try {
    delete process.env.QWEN_DIAGNOSTICS_TOKEN;
    assert.equal(
      (
        await POST(
          new NextRequest(
            "https://example.org/api/diagnostics/qwen?mode=json",
            { method: "POST" },
          ),
        )
      ).status,
      404,
    );
    process.env.QWEN_DIAGNOSTICS_TOKEN =
      "test-only-token-012345678901234567890123456789";
    assert.equal(
      (
        await POST(
          new NextRequest(
            "https://example.org/api/diagnostics/qwen?mode=json",
            { method: "POST", headers: { "x-roadmaps-diagnostics": "wrong" } },
          ),
        )
      ).status,
      404,
    );
  } finally {
    if (prior === undefined) delete process.env.QWEN_DIAGNOSTICS_TOKEN;
    else process.env.QWEN_DIAGNOSTICS_TOKEN = prior;
  }
});

test("diagnostic makes no provider request before free-only verification", async () => {
  let called = false;
  const result = await diagnoseQwen(
    { ...env, QWEN_FREE_QUOTA_ONLY_VERIFIED: "false" },
    "json",
    async () => {
      called = true;
      throw new Error("must not call");
    },
  );
  assert.equal(result.stage, "configuration");
  assert.equal(result.requestSent, false);
  assert.equal(called, false);
});

test("structured probe distinguishes valid JSON from actual returned-model verification", async () => {
  const valid = await diagnoseQwen(
    env,
    "json",
    async () =>
      new Response(
        JSON.stringify({
          model: "qwen3.8-flash",
          choices: [{ message: { content: '{"ok":true}' } }],
        }),
      ),
  );
  assert.equal(valid.structuredOutputValid, true);
  assert.equal(valid.modelMatchesRequest, true);
  const wrong = await diagnoseQwen(
    env,
    "json",
    async () =>
      new Response(
        JSON.stringify({
          model: "qwen3.8-max",
          choices: [{ message: { content: '{"ok":true}' } }],
        }),
      ),
  );
  assert.equal(wrong.structuredOutputValid, true);
  assert.equal(wrong.modelMatchesRequest, false);
});
