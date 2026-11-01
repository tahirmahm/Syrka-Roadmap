import { test } from "node:test";
import assert from "node:assert/strict";
import {
  semanticCandidates,
  cosine,
  rerankReadiness,
} from "../src/living/semantic";
import type { Budget } from "../src/odyssey/server/ai-gateway";
const env = {
  AI_PROVIDER: "qwen-free-quota",
  QWEN_API_KEY: "synthetic-test-secret",
  QWEN_BASE_URL:
    "https://ap-southeast-1.maas.qwencloudapi.com/compatible-mode/v1",
  QWEN_MODEL: "qwen3.8-flash",
  QWEN_DAILY_TOKEN_LIMIT: "100000",
  QWEN_FREE_QUOTA_ONLY_VERIFIED: "true",
  QWEN_FREE_QUOTA_VERIFICATION_REFERENCE: "fixture-contract-only",
  QWEN_FREE_QUOTA_VERIFIED_UNTIL: "2027-01-01T00:00:00Z",
  QWEN_EMBEDDING_FREE_VERIFIED: "true",
  QWEN_EMBEDDING_MODEL: "text-embedding-v4",
};
const budget: Budget = {
  reserve: async () => "fixture",
  record: async () => {},
};
test("optional embedding retrieval fails closed before network without model-specific free-only protection", async () => {
  let calls = 0;
  const fetcher = (async () => {
    calls++;
    throw Error();
  }) as typeof fetch;
  assert.equal(
    (await semanticCandidates("statistics", [], budget, {}, fetcher)).status,
    "disabled",
  );
  assert.equal(calls, 0);
  assert.equal(rerankReadiness.enabled, false);
});
test("bounded embedding contract returns known public identifiers and reserves quota; no qualification assertions", async () => {
  let reserved = false;
  const r = await semanticCandidates(
    "statistics",
    [
      { id: "a", label: "Statistics" },
      { id: "b", label: "Writing" },
    ],
    {
      reserve: async () => {
        reserved = true;
        return "fixture";
      },
      record: async () => {},
    },
    env,
    (async (url, init) => {
      assert.match(String(url), /compatible-mode\/v1\/embeddings$/);
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "text-embedding-v4");
      assert.equal(body.input.length, 3);
      return Response.json({
        data: [
          { index: 0, embedding: [1, 0] },
          { index: 1, embedding: [1, 0] },
          { index: 2, embedding: [0, 1] },
        ],
        usage: { total_tokens: 12 },
      });
    }) as typeof fetch,
  );
  assert.ok(reserved);
  assert.equal(r.results[0].id, "a");
  assert.equal(r.results[0].similarity, 1);
  assert.equal(cosine([1, 0], [0, 1]), 0);
});
test("embedding quota denial prevents transport and malformed dimensions fail closed", async () => {
  let calls = 0;
  await assert.rejects(
    semanticCandidates(
      "statistics",
      [],
      {
        reserve: async () => {
          throw Error("quota denied");
        },
        record: async () => {},
      },
      env,
      (async () => {
        calls++;
        return Response.json({});
      }) as typeof fetch,
    ),
    /quota denied/,
  );
  assert.equal(calls, 0);
  await assert.rejects(
    semanticCandidates(
      "statistics",
      [{ id: "a", label: "Stats" }],
      budget,
      env,
      (async () =>
        Response.json({
          data: [
            { index: 0, embedding: [1, 0] },
            { index: 1, embedding: [1] },
          ],
        })) as typeof fetch,
    ),
    /dimensions/,
  );
});
