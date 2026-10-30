import { test } from "node:test";
import assert from "node:assert/strict";
import { deploymentPolicy } from "../src/odyssey/server/deployment-policy";
import { createFreeQuotaLimiter } from "../src/odyssey/server/free-quota-budget";
import { aiConfig } from "../src/odyssey/server/ai-gateway";
test("owner attestation applies only to the existing production deployment and preserves kill switches", () => {
  assert.equal(deploymentPolicy({}).QWEN_FREE_QUOTA_ONLY_VERIFIED, undefined);
  const env = {
    VERCEL: "1",
    VERCEL_ENV: "production",
    VERCEL_PROJECT_PRODUCTION_URL: "syrkaroadmap.vercel.app",
    QWEN_API_KEY: "test-placeholder",
    QWEN_BASE_URL:
      "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1",
  };
  assert.equal(aiConfig(env)?.model, "qwen3.8-flash");
  assert.equal(
    aiConfig({ ...env, QWEN_FREE_QUOTA_ONLY_VERIFIED: "false" }),
    null,
  );
  assert.equal(aiConfig({ ...env, VERCEL_ENV: "preview" }), null);
  assert.equal(
    aiConfig({
      ...env,
      VERCEL_PROJECT_PRODUCTION_URL: "other-project.vercel.app",
    }),
    null,
  );
  assert.equal(
    aiConfig({
      ...env,
      QWEN_FREE_QUOTA_VERIFIED_UNTIL: "2020-01-01T00:00:00Z",
    }),
    null,
  );
  assert.throws(
    () => aiConfig({ ...env, QWEN_MODEL: "unconfirmed-model" }),
    /no recorded/,
  );
});
test("free-only guest limiter bounds rate and reservations without refunding failed requests", async () => {
  let time = 100000;
  const limiter = createFreeQuotaLimiter(() => time),
    a = limiter("fictional-test-client", 100);
  await a.reserve("explain", "fixture", 20);
  await a.reserve("explain", "fixture", 20);
  await a.reserve("explain", "fixture", 20);
  await assert.rejects(a.reserve("explain", "fixture", 1), /rate limit/);
  time += 61000;
  await assert.rejects(a.reserve("explain", "fixture", 41), /quota/);
  await a.reserve("explain", "fixture", 40);
  await assert.rejects(a.reserve("explain", "fixture", 1), /quota/);
});
