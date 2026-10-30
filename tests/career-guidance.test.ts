import { test } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST } from "../src/app/api/career-guidance/route";
import { catalogue } from "../src/odyssey/server/data";
test("career guidance remains source-grounded without AI and avoids unjustified Max escalation", async () => {
  const prior = process.env.AI_PROVIDER;
  process.env.AI_PROVIDER = "disabled";
  try {
    const o = catalogue.occupations.find((o) => o.essential.length >= 5)!;
    const request = (depth: string, skillIds: string[]) =>
      POST(
        new NextRequest("https://example.org/api/career-guidance", {
          method: "POST",
          body: JSON.stringify({
            occupationId: o.id,
            skillIds,
            interests: [],
            depth,
            consent: true,
          }),
        }),
      );
    const r = await request("quick", o.essential.slice(0, 3));
    assert.equal(r.status, 200);
    const result = await r.json();
    assert.equal(result.provider, "deterministic");
    assert.match(result.summary, /selected capabilities/);
    assert.match(result.uncertainties[0], /not assessed/);
    const deep = await (await request("deep", [])).json();
    assert.equal(deep.provider, "deterministic");
    assert.match(deep.notice, /Max is reserved/);
  } finally {
    if (prior === undefined) delete process.env.AI_PROVIDER;
    else process.env.AI_PROVIDER = prior;
  }
});
