import { test } from "node:test";
import assert from "node:assert/strict";
import { investigateFreeModels } from "../src/odyssey/server/qwen-enhancements";
const env = {
  QWEN_API_KEY: "test-placeholder",
  QWEN_BASE_URL:
    "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1",
  QWEN_FREE_QUOTA_ONLY_VERIFIED: "true",
  QWEN_FREE_QUOTA_VERIFICATION_REFERENCE: "fixture-only",
  QWEN_FREE_QUOTA_VERIFIED_UNTIL: "2030-01-01T00:00:00Z",
};
test("enhancement investigation remains blocked without free-quota confirmation", async () => {
  let sent = false;
  const r = await investigateFreeModels(
    { ...env, QWEN_FREE_QUOTA_ONLY_VERIFIED: "false" },
    "fixture",
    async () => {
      sent = true;
      throw new Error("must not send");
    },
  );
  assert.equal(r.requestSent, false);
  assert.equal(sent, false);
});
test("synthetic enhancement probes validate vectors and OCR fixture without leaking payloads", async () => {
  const models: string[] = [];
  const r = await investigateFreeModels(
    env,
    "fictional-fixture",
    async (url, init) => {
      assert.equal(init?.redirect, "error");
      const body = JSON.parse(String(init?.body));
      models.push(body.model);
      assert.ok(String(url).startsWith(env.QWEN_BASE_URL));
      return new Response(
        JSON.stringify(
          body.model === "text-embedding-v4"
            ? { data: [{ embedding: [0.1, 0.2, 0.3] }] }
            : {
                choices: [
                  { message: { content: "Fictional CV fixture SQL Python" } },
                ],
              },
        ),
      );
    },
  );
  assert.deepEqual(models, ["text-embedding-v4", "qwen-vl-ocr"]);
  assert.equal(r.embedding?.compatible, true);
  assert.equal(r.ocr?.recognizedFixture, true);
  assert.ok(!JSON.stringify(r).includes(env.QWEN_API_KEY));
  assert.ok(!JSON.stringify(r).includes("fictional-fixture"));
});
